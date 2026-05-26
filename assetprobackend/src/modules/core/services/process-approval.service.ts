import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { isSuperAdmin } from '../../../common/utils/super-admin';
import { ProcessApprovalFlowService } from './process-approval-flow.service';
import {
  InitiateApprovalDto,
  ApprovalActionDto,
  RejectApprovalDto,
  OverrideApprovalDto,
  ProcessApprovalResponseDto,
  ProcessApprovalStatusResponseDto,
  PendingApprovalsResponseDto,
  PendingApprovalItemDto,
  ApprovalStatus,
  ProcessApprovalQueryDto,
  ProcessApprovalListResponseDto,
} from '../dto/process-approval.dto';

@Injectable()
export class ProcessApprovalService {
  private readonly logger = new Logger(ProcessApprovalService.name);

  constructor(
    private tenantPrisma: TenantPrismaService,
    private flowService: ProcessApprovalFlowService,
  ) {}

  // ============================================================================
  // INITIATE APPROVAL
  // ============================================================================

  /**
   * Initiate approval process for a record
   */
  async initiateApproval(
    dto: InitiateApprovalDto,
    userId: number,
  ): Promise<ProcessApprovalStatusResponseDto> {
    const { processType, recordId, companyId, comment } = dto;

    // Check if approval already exists
    const existingStatus = await this.tenantPrisma.queryOne(
      `
      SELECT * FROM process_approval_statuses
      WHERE "approvableType" = $1 AND "approvableId" = $2
      `,
      [processType, recordId],
    );

    if (existingStatus) {
      throw new BadRequestException('Approval process already initiated for this record');
    }

    // Get approval flow for this process type
    const flow = await this.flowService.getFlowForProcess(processType, companyId);
    if (!flow) {
      throw new NotFoundException(
        `No active approval flow found for process type: ${processType}`,
      );
    }

    if (!flow.steps || flow.steps.length === 0) {
      throw new BadRequestException('Approval flow has no steps configured');
    }

    // Sort steps by order and deduplicate by stepId (guards against corrupted flow configs)
    const sortedSteps = flow.steps.sort((a, b) => a.stepOrder - b.stepOrder);
    const seenStepIds = new Set<number>();
    const deduplicatedSteps = sortedSteps.filter((step) => {
      if (seenStepIds.has(step.id)) return false;
      seenStepIds.add(step.id);
      return true;
    });

    // Create approval status
    const approvalStatus = await this.tenantPrisma.insert('process_approval_statuses', {
      approvableType: processType,
      approvableId: recordId,
      steps: JSON.stringify(
        deduplicatedSteps.map((step) => ({
          stepId: step.id,
          stepOrder: step.stepOrder,
          name: step.name,
          status: 'WAITING',
        })),
      ),
      status: 'PENDING',
      creatorId: userId,
      companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create process approvals for each step
    if (flow.parallelApproval) {
      // Parallel approval: All steps are PENDING immediately
      for (const step of deduplicatedSteps) {
        await this.tenantPrisma.insert('process_approvals', {
          approvableType: processType,
          approvableId: recordId,
          processApprovalFlowStepId: step.id,
          approvalAction: 'Pending',
          userId,
          companyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        // Notify all approvers for each parallel step
        await this.notifyApproversForStep(step as unknown as Record<string, unknown>, processType, recordId, companyId, step.name || `Step ${step.stepOrder}`);
      }
    } else {
      // Sequential approval: Only first step is active
      const firstStep = deduplicatedSteps[0];
      await this.tenantPrisma.insert('process_approvals', {
        approvableType: processType,
        approvableId: recordId,
        processApprovalFlowStepId: firstStep.id,
        approvalAction: 'Pending',
        userId,
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Notify approvers for first step
      await this.notifyApproversForStep(firstStep as unknown as Record<string, unknown>, processType, recordId, companyId, firstStep.name || `Step ${firstStep.stepOrder}`);

      // Update status to mark first step as PENDING
      const stepsData = typeof approvalStatus.steps === 'string' ? JSON.parse(approvalStatus.steps) : approvalStatus.steps;
      stepsData[0].status = 'PENDING';
      await this.tenantPrisma.update('process_approval_statuses', approvalStatus.id, {
        steps: JSON.stringify(stepsData),
      });
    }

    this.logger.log(
      `Approval initiated for ${processType}:${recordId} by user ${userId}`,
    );

    return this.checkApprovalStatus(processType, recordId);
  }

  // ============================================================================
  // APPROVE STEP
  // ============================================================================

  /**
   * Approve a specific approval step
   */
  async approveStep(
    approvalId: number,
    userId: number,
    dto: ApprovalActionDto,
    bypassPermission = false,
  ): Promise<ProcessApprovalStatusResponseDto> {
    // Get the approval record
    const approval = await this.tenantPrisma.queryOne(`SELECT * FROM process_approvals WHERE id = $1 LIMIT 1`, [approvalId]);
    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    // Check if already approved
    if (approval.approvedAt) {
      throw new BadRequestException('This approval step has already been processed');
    }

    // Get flow step to check permissions — self-heal if the step was deleted
    let flowStep: Awaited<ReturnType<typeof this.flowService.findOneStep>>;
    try {
      flowStep = await this.flowService.findOneStep(approval.processApprovalFlowStepId);
    } catch {
      // Step was deleted (e.g. duplicate cleanup) — resolve from live flow
      this.logger.warn(`approveStep: flowStepId ${approval.processApprovalFlowStepId} not found, resolving from live flow`);
      const status = await this.tenantPrisma.queryOne<{ id: number; steps: unknown; companyId: number }>(
        `SELECT id, steps, "companyId" FROM process_approval_statuses
         WHERE "approvableType" = $1 AND "approvableId" = $2`,
        [approval.approvableType, approval.approvableId],
      );
      if (!status) throw new NotFoundException('Approval status not found');

      const stepsJson: Record<string, unknown>[] = typeof status.steps === 'string'
        ? JSON.parse(status.steps) : (status.steps as Record<string, unknown>[]) || [];
      const pendingStep = stepsJson.find((s) => s['status'] === 'PENDING');

      const flow = await this.flowService.getFlowForProcess(approval.approvableType, status.companyId);
      if (!flow?.steps) throw new NotFoundException('Approval flow not found');

      const sorted = flow.steps.sort((a, b) => a.stepOrder - b.stepOrder);
      const stepName = pendingStep?.['name'] as string | undefined;
      const match = (stepName ? sorted.find((s) => s.name === stepName) : undefined)
        || sorted.find((s) => s.stepOrder === (pendingStep?.['stepOrder'] as number));

      if (!match) throw new NotFoundException('Could not resolve approval flow step from live flow');

      // Fix the stale references
      await this.tenantPrisma.query(
        `UPDATE process_approvals SET "processApprovalFlowStepId" = $1 WHERE id = $2`,
        [match.id, approvalId],
      );
      if (pendingStep) {
        pendingStep['stepId'] = match.id;
        await this.tenantPrisma.update('process_approval_statuses', status.id, {
          steps: JSON.stringify(stepsJson),
          updatedAt: new Date(),
        });
      }
      this.logger.log(`approveStep: self-healed stepId ${approval.processApprovalFlowStepId} → ${match.id} (${match.name})`);
      flowStep = await this.flowService.findOneStep(match.id);
    }

    // E-1: Same-step re-approval guard — prevent the same user from approving
    // this specific step twice (e.g. stale duplicate process_approvals records).
    // Does NOT block a user from approving different steps in a multi-step flow.
    if (!bypassPermission) {
      const alreadyApprovedThisStep = await this.tenantPrisma.queryOne<{ id: number }>(
        `SELECT pa.id FROM process_approvals pa
         WHERE pa."approvableType" = $1 AND pa."approvableId" = $2
           AND pa."processApprovalFlowStepId" = $3
           AND pa."userId" = $4 AND pa."approvalAction" = 'Approved'
         LIMIT 1`,
        [approval.approvableType, approval.approvableId, flowStep.id, userId],
      );
      if (alreadyApprovedThisStep) {
        throw new ForbiddenException(
          `You have already approved the "${flowStep.name}" step for this record.`,
        );
      }
    }

    // Check if user has permission to approve (skip when Super Admin bypasses)
    if (!bypassPermission) {
      const canApprove = await this.checkApprovalPermission(userId, flowStep as unknown as Record<string, unknown>);
      if (!canApprove) {
        throw new ForbiddenException(`You do not have permission to approve this step. "${flowStep.name}" requires a designated approver.`);
      }
    }

    // Get user details
    const user = await this.tenantPrisma.findById('users', userId);

    // Update approval record — use user's profile signature if not provided in request
    const signaturePath = dto.signaturePath || (user as Record<string, unknown>)?.signaturePath || null;
    const approvalAction = bypassPermission ? 'Approved by Super Admin (override)' : 'Approved';
    const approverName = bypassPermission
      ? `${user?.name || 'Unknown'} (Super Admin)`
      : (user?.name || 'Unknown');

    await this.tenantPrisma.update('process_approvals', approvalId, {
      approvalAction,
      approverName,
      comment: dto.comment,
      signaturePath,
      approvedAt: new Date(),
      userId,
      updatedAt: new Date(),
    });

    // Update approval status
    const status = await this.tenantPrisma.queryOne(
      `
      SELECT * FROM process_approval_statuses
      WHERE "approvableType" = $1 AND "approvableId" = $2
      `,
      [approval.approvableType, approval.approvableId],
    );

    if (!status) {
      throw new NotFoundException('Approval status not found');
    }

    const stepsData = typeof status.steps === 'string' ? JSON.parse(status.steps) : status.steps;
    let currentStepIndex = stepsData.findIndex(
      (s: any) => s.stepId === flowStep.id,
    );

    // Fallback: stepId mismatch (e.g. repairStaleStepIds remapped JSON but process_approvals still
    // holds old flowStepId). Find the first PENDING step and reconcile.
    if (currentStepIndex === -1) {
      currentStepIndex = stepsData.findIndex((s: any) => s.status === 'PENDING');
      if (currentStepIndex !== -1) {
        stepsData[currentStepIndex].stepId = flowStep.id;
        stepsData[currentStepIndex].name = flowStep.name;
        this.logger.warn(
          `approveStep: stepId mismatch for ${approval.approvableType}#${approval.approvableId} — healed stepsData[${currentStepIndex}].stepId to ${flowStep.id}`,
        );
      }
    }

    if (currentStepIndex !== -1) {
      stepsData[currentStepIndex].status = 'APPROVED';
      stepsData[currentStepIndex].approvedBy = user?.name;
      stepsData[currentStepIndex].approvedAt = new Date();
    }

    // Check if this was the last step
    const allApproved = stepsData.every((s: any) => s.status === 'APPROVED' || s.status === 'OVERRIDDEN');

    if (allApproved) {
      // All steps approved
      await this.tenantPrisma.update('process_approval_statuses', status.id, {
        steps: JSON.stringify(stepsData),
        status: 'APPROVED',
        updatedAt: new Date(),
      });
      // Sync entity status + domain actions (GL posting for bank transfers, etc.)
      await this.syncApprovalToEntity(approval.approvableType, approval.approvableId, userId);
    } else {
      // Get flow to check if parallel or sequential
      const flow = await this.flowService.findOneFlow(flowStep.processApprovalFlowId, true);

      if (!flow.parallelApproval) {
        // Sequential: Move to next step
        const nextStepIndex = currentStepIndex + 1;
        if (nextStepIndex < stepsData.length) {
          stepsData[nextStepIndex].status = 'PENDING';

          // Create approval record for next step
          const nextStep = flow.steps![nextStepIndex];
          await this.tenantPrisma.insert('process_approvals', {
            approvableType: approval.approvableType,
            approvableId: approval.approvableId,
            processApprovalFlowStepId: nextStep.id,
            approvalAction: 'Pending',
            userId,
            companyId: approval.companyId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Notify approvers for next step
          await this.notifyApproversForStep(
            nextStep as unknown as Record<string, unknown>,
            approval.approvableType,
            approval.approvableId,
            approval.companyId,
            nextStep.name || `Step ${nextStep.stepOrder}`,
          );
        }
      }

      await this.tenantPrisma.update('process_approval_statuses', status.id, {
        steps: JSON.stringify(stepsData),
        updatedAt: new Date(),
      });
    }

    this.logger.log(
      `Approval step ${approvalId} approved by user ${userId}`,
    );

    return this.checkApprovalStatus(approval.approvableType, approval.approvableId);
  }

  // ============================================================================
  // REJECT STEP
  // ============================================================================

  /**
   * Reject a specific approval step
   */
  async rejectStep(
    approvalId: number,
    userId: number,
    dto: RejectApprovalDto,
  ): Promise<ProcessApprovalStatusResponseDto> {
    // Get the approval record
    const approval = await this.tenantPrisma.queryOne(`SELECT * FROM process_approvals WHERE id = $1 LIMIT 1`, [approvalId]);
    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    // Check if already processed
    if (approval.approvedAt) {
      throw new BadRequestException('This approval step has already been processed');
    }

    // Get flow step to check permissions
    const flowStep = await this.flowService.findOneStep(approval.processApprovalFlowStepId);

    // E-1: Self-rejection guard — creator cannot reject their own submission
    const statusRecordForReject = await this.tenantPrisma.queryOne<{ creatorId: number }>(
      `SELECT "creatorId" FROM process_approval_statuses
       WHERE "approvableType" = $1 AND "approvableId" = $2 LIMIT 1`,
      [approval.approvableType, approval.approvableId],
    );
    if (statusRecordForReject && statusRecordForReject.creatorId === userId) {
      throw new ForbiddenException('You cannot reject a request that you submitted.');
    }

    // Check if user has permission to reject
    const canReject = await this.checkApprovalPermission(userId, flowStep as unknown as Record<string, unknown>);
    if (!canReject) {
      throw new ForbiddenException(`You do not have permission to reject this step. "${flowStep.name}" requires a designated approver.`);
    }

    // Get user details
    const user = await this.tenantPrisma.findById('users', userId);

    // Update approval record — use user's profile signature if not provided
    const signaturePath = dto.signaturePath || (user as Record<string, unknown>)?.signaturePath || null;

    await this.tenantPrisma.update('process_approvals', approvalId, {
      approvalAction: 'Rejected',
      approverName: user?.name || 'Unknown',
      comment: dto.comment || dto.reason,
      signaturePath,
      approvedAt: new Date(),
      userId,
      updatedAt: new Date(),
    });

    // Update approval status - rejection stops the entire process
    const status = await this.tenantPrisma.queryOne(
      `
      SELECT * FROM process_approval_statuses
      WHERE "approvableType" = $1 AND "approvableId" = $2
      `,
      [approval.approvableType, approval.approvableId],
    );

    if (!status) {
      throw new NotFoundException('Approval status not found');
    }

    const stepsData = typeof status.steps === 'string' ? JSON.parse(status.steps) : status.steps;
    const currentStepIndex = stepsData.findIndex(
      (s: any) => s.stepId === flowStep.id,
    );

    if (currentStepIndex !== -1) {
      stepsData[currentStepIndex].status = 'REJECTED';
      stepsData[currentStepIndex].rejectedBy = user?.name;
      stepsData[currentStepIndex].rejectedAt = new Date();
      stepsData[currentStepIndex].reason = dto.reason;
    }

    await this.tenantPrisma.update('process_approval_statuses', status.id, {
      steps: JSON.stringify(stepsData),
      status: 'REJECTED',
      updatedAt: new Date(),
    });

    // Sync rejection status to the source entity
    await this.syncRejectionToEntity(
      approval.approvableType, approval.approvableId,
      dto.reason || dto.comment || 'Rejected', user?.name || 'Unknown',
    );

    this.logger.log(
      `Approval step ${approvalId} rejected by user ${userId}: ${dto.reason}`,
    );

    return this.checkApprovalStatus(approval.approvableType, approval.approvableId);
  }

  // ============================================================================
  // CHECK APPROVAL STATUS
  // ============================================================================

  /**
   * Check the approval status of a record
   */
  async findByApprovableId(approvableId: number, companyId: number): Promise<{ approvableType: string } | null> {
    return this.tenantPrisma.queryOne<{ approvableType: string }>(
      `SELECT "approvableType" FROM process_approval_statuses
       WHERE "approvableId" = $1 AND "companyId" = $2
       ORDER BY id DESC LIMIT 1`,
      [approvableId, companyId],
    );
  }

  async checkApprovalStatus(
    processType: string,
    recordId: number,
    userId?: number,
  ): Promise<ProcessApprovalStatusResponseDto> {
    const status = await this.tenantPrisma.queryOne(
      `
      SELECT * FROM process_approval_statuses
      WHERE "approvableType" = $1 AND "approvableId" = $2
      `,
      [processType, recordId],
    );

    if (!status) {
      throw new NotFoundException('Approval status not found');
    }

    // Get all approvals for this record
    const approvals = await this.tenantPrisma.query(
      `
      SELECT pa.*,
             u.name as "userName", u.email as "userEmail",
             pafs.name as "stepName", pafs."stepOrder", pafs.action as "stepAction"
      FROM process_approvals pa
      LEFT JOIN users u ON pa."userId" = u.id
      LEFT JOIN process_approval_flow_steps pafs ON pa."processApprovalFlowStepId" = pafs.id
      WHERE pa."approvableType" = $1 AND pa."approvableId" = $2
      ORDER BY pafs."stepOrder" ASC
      `,
      [processType, recordId],
    );

    const stepsData = typeof status.steps === 'string' ? JSON.parse(status.steps) : status.steps;

    // Self-heal: repair any stale stepIds that reference deleted flow steps
    await this.repairStaleStepIds(stepsData, processType, status.companyId, status.id);

    // Enrich each step with role name so the UI shows who needs to approve
    for (const step of stepsData) {
      if (!step.roleName && step.stepId) {
        const stepDetail = await this.tenantPrisma.queryOne<{ roleName: string }>(
          `SELECT r.name AS "roleName"
           FROM process_approval_flow_steps pafs
           LEFT JOIN roles r ON r.id = pafs."roleId"
           WHERE pafs.id = $1`,
          [step.stepId],
        );
        if (stepDetail?.roleName) step.roleName = stepDetail.roleName;
      }
    }

    // Find current pending step
    const currentStepData = stepsData.find((s: any) => s.status === 'PENDING');
    let currentStep:
      | {
          stepOrder: number;
          stepNumber?: number;
          name?: string;
          action: string;
          approvers: string[];
          approverType?: string;
          approverEmployeeIds?: number[];
          stepType?: string;
        }
      | undefined = undefined;

    if (currentStepData) {
      const stepDetails = await this.flowService.findOneStep(currentStepData.stepId);

      // Resolve approver names for display
      const approverNames: string[] = [];
      const approverEmployeeIds: number[] = [];

      if (stepDetails.role) {
        approverNames.push(stepDetails.role.name);
      }

      // For employee-based steps, resolve employee names
      const empIds: number[] = stepDetails.approverIds ?? stepDetails.employees?.ids ?? [];
      if (stepDetails.approverType === 'employee' && empIds.length > 0) {
        approverEmployeeIds.push(...empIds);
        const empRows = await this.tenantPrisma.query<{ firstName: string; lastName: string }>(
          `SELECT "firstName", "lastName" FROM employees WHERE id = ANY($1::int[])`,
          [empIds],
        );
        for (const e of empRows) {
          approverNames.push(`${e.firstName} ${e.lastName}`.trim());
        }
      }

      currentStep = {
        stepOrder: stepDetails.stepOrder,
        stepNumber: stepDetails.stepOrder,
        name: stepDetails.name,
        action: stepDetails.action,
        approvers: approverNames,
        approverType: stepDetails.approverType || 'role',
        approverEmployeeIds,
        stepType: stepDetails.stepType || 'approve',
      };
    }

    // Calculate progress
    const completed = stepsData.filter((s: any) => s.status === 'APPROVED').length;
    const total = stepsData.length;

    // Check if current user can approve the pending step
    let canCurrentUserApprove = false;
    if (userId && currentStepData) {
      const flowStep = await this.tenantPrisma.queryOne(
        `SELECT * FROM process_approval_flow_steps WHERE id = $1`,
        [currentStepData.stepId],
      );
      if (flowStep) {
        canCurrentUserApprove = await this.checkApprovalPermission(
          Number(userId),
          flowStep as unknown as Record<string, unknown>,
        );
      }
    }

    return {
      id: status.id,
      approvableType: status.approvableType,
      approvableId: status.approvableId,
      steps: stepsData,
      status: status.status as ApprovalStatus,
      creatorId: status.creatorId,
      companyId: status.companyId,
      tenantId: status.tenantId,
      createdAt: status.createdAt,
      updatedAt: status.updatedAt,
      approvals: approvals.map((a) => this.mapApprovalToResponse(a)),
      currentStep,
      canCurrentUserApprove,
      progress: {
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    };
  }

  // ============================================================================
  // GET PENDING APPROVALS
  // ============================================================================

  /**
   * Get pending approvals for a user
   */
  async getPendingApprovals(
    userId: number,
    companyId: number,
    page = 1,
    limit = 20,
    entityType?: string,
    scope: 'mine' | 'all' = 'mine',
  ): Promise<PendingApprovalsResponseDto> {
    // Get user's roles
    const userRoles = await this.tenantPrisma.query(
      `SELECT r.id FROM roles r
       JOIN user_roles ur ON r.id = ur."roleId"
       WHERE ur."userId" = $1`,
      [userId],
    );
    const roleIds = userRoles.map((r: Record<string, unknown>) => r.id as number);

    // Get user's employee ID (for employee-based approval steps)
    const empRow = await this.tenantPrisma.queryOne<{ id: number }>(
      `SELECT e.id FROM employees e JOIN users u ON u."employeeId" = e.id WHERE u.id = $1`,
      [userId],
    );
    const employeeId = empRow?.id ?? 0;

    // 'mine' (default): only items the current user can approve.
    // 'all': every pending approval in the company — used by admins/managers viewing
    // the queue to oversee load. The backend still relies on the auth guard above to
    // gate access to the page itself.
    if (scope === 'mine' && roleIds.length === 0 && !employeeId) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const offset = (page - 1) * limit;

    // Build a flexible WHERE clause. Always filter by company + status; conditionally
    // add the user-authority EXISTS (mine) and entityType. We use named placeholders
    // collected in `params` to avoid the positional-index drift that comes with
    // optional clauses.
    const params: (number | string | number[])[] = [companyId];
    let p = 2;
    const where: string[] = [`pas.status = 'PENDING'`, `pas."companyId" = $1`];

    if (scope === 'mine') {
      params.push(roleIds.length > 0 ? roleIds : [0]);
      const roleIdx = p++;
      params.push(employeeId);
      const empIdx = p++;
      where.push(`
        EXISTS (
          SELECT 1 FROM process_approvals pa
          JOIN process_approval_flow_steps pafs ON pa."processApprovalFlowStepId" = pafs.id
          WHERE pa."approvableType" = pas."approvableType"
            AND pa."approvableId" = pas."approvableId"
            AND pa."approvedAt" IS NULL
            AND (
              (pafs."roleId" = ANY($${roleIdx}::int[]))
              OR (pafs."approverType" = 'employee' AND pafs.employees @> jsonb_build_object('ids', jsonb_build_array($${empIdx}::int)))
            )
        )
      `);
    }

    if (entityType) {
      params.push(entityType);
      where.push(`pas."approvableType" = $${p++}`);
    }

    const whereClause = where.join(' AND ');

    // List query — pagination params are appended at the end
    const listParams = [...params, limit, offset];
    const limitIdx = p;
    const offsetIdx = p + 1;
    const sql = `
      SELECT pas.*
      FROM process_approval_statuses pas
      WHERE ${whereClause}
      ORDER BY pas."createdAt" ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;
    const statuses = await this.tenantPrisma.query(sql, listParams);

    // Count query — same WHERE, no limit/offset
    const countSql = `
      SELECT COUNT(*) as count
      FROM process_approval_statuses pas
      WHERE ${whereClause}
    `;
    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(countSql, params);
    const total = parseInt(countResult?.count || '0', 10);

    const data: PendingApprovalItemDto[] = [];

    for (const status of statuses) {
      const stepsData = typeof status.steps === 'string' ? JSON.parse(status.steps) : status.steps;
      const currentStepData = stepsData.find((s: any) => s.status === 'PENDING');

      if (currentStepData) {
        const stepDetails = await this.flowService.findOneStep(currentStepData.stepId);

        const daysPending = Math.floor(
          (Date.now() - new Date(status.createdAt).getTime()) / (1000 * 60 * 60 * 24),
        );

        const isOverdue = stepDetails.timeoutHours
          ? daysPending * 24 > stepDetails.timeoutHours
          : false;

        data.push({
          id: status.id,
          approvableType: status.approvableType,
          approvableId: status.approvableId,
          status: status.status as ApprovalStatus,
          currentStep: {
            id: stepDetails.id,
            stepOrder: stepDetails.stepOrder,
            name: stepDetails.name,
            action: stepDetails.action,
            stepType: stepDetails.stepType || 'approve',
          },
          createdAt: status.createdAt,
          updatedAt: status.updatedAt,
          daysPending,
          isOverdue,
        });
      }
    }

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================================================
  // MY-PENDING INBOX (enriched, grouped by flow)
  // ============================================================================

  /**
   * Unified approval inbox: pending approvals for the current user, enriched
   * with entity-specific reference data and grouped by flow type.
   */
  async getMyPendingInbox(userId: number, companyId: number): Promise<{
    totalPending: number;
    groups: Array<{
      approvableType: string;
      flowName: string;
      entitySlug: string;
      count: number;
      items: Array<{
        approvalStatusId: number;
        approvableId: number;
        reference: string;
        description: string;
        amount: number | null;
        currency: string | null;
        requester: string | null;
        submittedAt: string;
        currentStep: { id: number; name: string; stepOrder: number; stepType: string };
        daysPending: number;
        isOverdue: boolean;
        entityUrl: string;
      }>;
    }>;
  }> {
    // Get all pending items for this user (no pagination — inbox should be bounded naturally)
    const pending = await this.getPendingApprovals(userId, companyId, 1, 200, undefined, 'mine');

    if (pending.data.length === 0) return { totalPending: 0, groups: [] };

    // Entity URL and flow name maps
    const entityConfig: Record<string, { flowName: string; entitySlug: string; entityUrl: string }> = {
      expense_requests:       { flowName: 'Expense Request', entitySlug: 'accounts.expense-requests', entityUrl: '/accounts/expense-requests' },
      sales_orders:           { flowName: 'Sales Order', entitySlug: 'sales.orders', entityUrl: '/sales/orders' },
      sales_invoices:         { flowName: 'Sales Invoice', entitySlug: 'sales.invoices', entityUrl: '/sales/invoices' },
      purchase_requisitions:  { flowName: 'Purchase Requisition', entitySlug: 'purchase.requisitions', entityUrl: '/purchase/requisitions' },
      purchase_orders:        { flowName: 'Purchase Order', entitySlug: 'purchase.orders', entityUrl: '/purchase/orders' },
      supplier_payments:      { flowName: 'Supplier Payment', entitySlug: 'payables.payments', entityUrl: '/payables/payments' },
      journal_entries:        { flowName: 'Journal Entry', entitySlug: 'accounts.journal-entries', entityUrl: '/accounts/journal-entries' },
      bank_transfers:         { flowName: 'Bank Transfer', entitySlug: 'accounts.bank-transfers', entityUrl: '/accounts/bank-transfers' },
      customer_receipts:      { flowName: 'Customer Receipt', entitySlug: 'receivables.receipts', entityUrl: '/receivables/receipts' },
      credit_notes:           { flowName: 'Credit Note', entitySlug: 'receivables.credit-notes', entityUrl: '/receivables/credit-notes' },
      inventory_transfers:    { flowName: 'Inventory Transfer', entitySlug: 'inventory.transfers', entityUrl: '/inventory/transfers' },
      inventory_adjustments:  { flowName: 'Inventory Adjustment', entitySlug: 'inventory.adjustments', entityUrl: '/inventory/adjustments' },
      internal_stock_requests:{ flowName: 'Stock Request', entitySlug: 'inventory.stock-requests', entityUrl: '/inventory/stock-requests' },
      leave_requests:         { flowName: 'Leave Request', entitySlug: 'hrpayroll.leave-requests', entityUrl: '/hr-payroll/leave-requests' },
      payroll_runs:           { flowName: 'Payroll Run', entitySlug: 'hrpayroll.payroll-runs', entityUrl: '/hr-payroll/payroll' },
      employee_loans:         { flowName: 'Employee Loan', entitySlug: 'hrpayroll.loans', entityUrl: '/hr-payroll/loans' },
      investor_onboarding:    { flowName: 'Investor KYC', entitySlug: 'fund-management.customer-onboarding', entityUrl: '/fund-management/investors' },
      vehicle_bookings:       { flowName: 'Vehicle Booking', entitySlug: 'fleet-management.bookings', entityUrl: '/fleet/bookings' },
      loading_orders:         { flowName: 'Loading Order', entitySlug: 'sales.loading-orders', entityUrl: '/sales/loading-orders' },
    };

    // Fetch entity reference data for each approvable type in bulk
    const byType: Record<string, typeof pending.data> = {};
    for (const item of pending.data) {
      if (!byType[item.approvableType]) byType[item.approvableType] = [];
      byType[item.approvableType].push(item);
    }

    // Entity-specific SQL to enrich with reference, description, amount, requester
    const entityEnrichmentSql: Record<string, (ids: number[]) => string> = {
      expense_requests: (ids) => `
        SELECT er.id, er."requestNumber" as reference,
               CONCAT(er.description, ' – ', COALESCE(u.name, u.email)) as description,
               er."totalAmount" as amount, c.currency as currency,
               COALESCE(u.name, u.email) as requester, er."createdAt"
        FROM expense_requests er
        LEFT JOIN users u ON u.id = er."requestedBy"
        LEFT JOIN companies c ON c.id = er."companyId"
        WHERE er.id = ANY(ARRAY[${ids.join(',')}])`,
      sales_orders: (ids) => `
        SELECT so.id, so."orderNumber" as reference,
               CONCAT(cust.name, ' – ', so."orderNumber") as description,
               so."totalAmount" as amount, cur.code as currency,
               COALESCE(u.name, u.email) as requester, so."createdAt"
        FROM sales_orders so
        LEFT JOIN customers cust ON cust.id = so."customerId"
        LEFT JOIN ifrs_currencies cur ON cur.id = so."currencyId"
        LEFT JOIN users u ON u.id = so."createdBy"
        WHERE so.id = ANY(ARRAY[${ids.join(',')}])`,
      purchase_requisitions: (ids) => `
        SELECT pr.id, pr."requisitionNumber" as reference,
               CONCAT(pr.description, ' – PR') as description,
               pr."estimatedAmount" as amount, NULL::text as currency,
               COALESCE(u.name, u.email) as requester, pr."createdAt"
        FROM purchase_requisitions pr
        LEFT JOIN users u ON u.id = pr."requestedBy"
        WHERE pr.id = ANY(ARRAY[${ids.join(',')}])`,
      purchase_orders: (ids) => `
        SELECT po.id, po."orderNumber" as reference,
               CONCAT(s.name, ' – ', po."orderNumber") as description,
               po."totalAmount" as amount, NULL::text as currency,
               COALESCE(u.name, u.email) as requester, po."createdAt"
        FROM purchase_orders po
        LEFT JOIN suppliers s ON s.id = po."supplierId"
        LEFT JOIN users u ON u.id = po."createdBy"
        WHERE po.id = ANY(ARRAY[${ids.join(',')}])`,
      bank_transfers: (ids) => `
        SELECT bt.id, bt."referenceNumber" as reference,
               CONCAT(b1.name, ' → ', b2.name) as description,
               bt.amount as amount, NULL::text as currency,
               COALESCE(u.name, u.email) as requester, bt."createdAt"
        FROM bank_transfers bt
        LEFT JOIN banks b1 ON b1.id = bt."fromBankId"
        LEFT JOIN banks b2 ON b2.id = bt."toBankId"
        LEFT JOIN users u ON u.id = bt."createdBy"
        WHERE bt.id = ANY(ARRAY[${ids.join(',')}])`,
      journal_entries: (ids) => `
        SELECT je.id, je."entryNumber" as reference,
               je.description as description,
               je."totalDebit" as amount, NULL::text as currency,
               COALESCE(u.name, u.email) as requester, je."createdAt"
        FROM journal_entries je
        LEFT JOIN users u ON u.id = je."createdBy"
        WHERE je.id = ANY(ARRAY[${ids.join(',')}])`,
      customer_receipts: (ids) => `
        SELECT cr.id, cr."receiptNumber" as reference,
               CONCAT(cust.name, ' – Receipt') as description,
               cr.amount as amount, NULL::text as currency,
               COALESCE(u.name, u.email) as requester, cr."createdAt"
        FROM customer_receipts cr
        LEFT JOIN customers cust ON cust.id = cr."customerId"
        LEFT JOIN users u ON u.id = cr."createdBy"
        WHERE cr.id = ANY(ARRAY[${ids.join(',')}])`,
      loading_orders: (ids) => `
        SELECT lo.id, lo."loadingNumber" as reference,
               CONCAT(cust.name, ' – ', lo."loadingNumber") as description,
               NULL::numeric as amount, NULL::text as currency,
               COALESCE(u.name, u.email) as requester, lo."createdAt"
        FROM loading_orders lo
        LEFT JOIN sales_orders so ON so.id = lo."salesOrderId"
        LEFT JOIN customers cust ON cust.id = so."customerId"
        LEFT JOIN users u ON u.id = lo."createdBy"
        WHERE lo.id = ANY(ARRAY[${ids.join(',')}])`,
      investor_onboarding: (ids) => `
        SELECT fi.id, fi."investorCode" as reference,
               CONCAT(fi."firstName", ' ', fi."lastName", ' – KYC') as description,
               NULL::numeric as amount, NULL::text as currency,
               NULL::text as requester, fi."createdAt"
        FROM fm_investors fi
        WHERE fi.id = ANY(ARRAY[${ids.join(',')}])`,
      leave_requests: (ids) => `
        SELECT lr.id, CONCAT('LV-', lr.id) as reference,
               CONCAT(e."firstName", ' ', e."lastName", ' – ', lr."leaveType") as description,
               NULL::numeric as amount, NULL::text as currency,
               COALESCE(u.name, u.email) as requester, lr."createdAt"
        FROM leaves lr
        LEFT JOIN employees e ON e.id = lr."employeeId"
        LEFT JOIN users u ON u.id = lr."requestedBy"
        WHERE lr.id = ANY(ARRAY[${ids.join(',')}])`,
    };

    // Build enrichment data map
    const enrichmentMap: Record<string, Record<number, Record<string, unknown>>> = {};
    for (const [type, items] of Object.entries(byType)) {
      const ids = items.map(i => i.approvableId);
      const sqlFn = entityEnrichmentSql[type];
      if (sqlFn && ids.length > 0) {
        try {
          const rows = await this.tenantPrisma.query(sqlFn(ids), []);
          enrichmentMap[type] = {};
          for (const row of rows) enrichmentMap[type][row.id as number] = row;
        } catch {
          enrichmentMap[type] = {};
        }
      }
    }

    // Group by type
    const groupMap: Record<string, typeof pending.data> = {};
    for (const item of pending.data) {
      if (!groupMap[item.approvableType]) groupMap[item.approvableType] = [];
      groupMap[item.approvableType].push(item);
    }

    const groups = Object.entries(groupMap).map(([type, items]) => {
      const config = entityConfig[type] || { flowName: type, entitySlug: type, entityUrl: '/core/approvals' };
      return {
        approvableType: type,
        flowName: config.flowName,
        entitySlug: config.entitySlug,
        count: items.length,
        items: items.map(item => {
          const enrich = enrichmentMap[type]?.[item.approvableId] || {};
          return {
            approvalStatusId: item.id,
            approvableId: item.approvableId,
            reference: (enrich['reference'] as string) || `#${item.approvableId}`,
            description: (enrich['description'] as string) || type.replace(/_/g, ' '),
            amount: (enrich['amount'] as number) ?? null,
            currency: (enrich['currency'] as string) ?? null,
            requester: (enrich['requester'] as string) ?? null,
            submittedAt: String(enrich['createdAt'] || item.createdAt),
            currentStep: {
              id: item.currentStep.id,
              name: item.currentStep.name ?? '',
              stepOrder: item.currentStep.stepOrder,
              stepType: item.currentStep.stepType ?? 'approve',
            },
            daysPending: item.daysPending ?? 0,
            isOverdue: item.isOverdue ?? false,
            entityUrl: `${config.entityUrl}/${item.approvableId}`,
          };
        }),
      };
    });

    return { totalPending: pending.total, groups };
  }

  // ============================================================================
  // LIST APPROVALS
  // ============================================================================

  /**
   * Get list of approvals with filters
   */
  async findAll(query: ProcessApprovalQueryDto): Promise<ProcessApprovalListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT pa.*,
             u.name as "userName", u.email as "userEmail",
             pafs.name as "stepName", pafs."stepOrder", pafs.action as "stepAction"
      FROM process_approvals pa
      LEFT JOIN users u ON pa."userId" = u.id
      LEFT JOIN process_approval_flow_steps pafs ON pa."processApprovalFlowStepId" = pafs.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (query.approvableType) {
      sql += ` AND pa."approvableType" = $${paramIndex++}`;
      params.push(query.approvableType);
    }

    if (query.approvableId) {
      sql += ` AND pa."approvableId" = $${paramIndex++}`;
      params.push(query.approvableId);
    }

    if (query.userId) {
      sql += ` AND pa."userId" = $${paramIndex++}`;
      params.push(query.userId);
    }

    if (query.companyId) {
      sql += ` AND pa."companyId" = $${paramIndex++}`;
      params.push(query.companyId);
    }

    sql += ` ORDER BY pa."createdAt" DESC`;
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const approvals = await this.tenantPrisma.query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as count FROM process_approvals pa WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (query.approvableType) {
      countSql += ` AND pa."approvableType" = $${countParamIndex++}`;
      countParams.push(query.approvableType);
    }

    if (query.approvableId) {
      countSql += ` AND pa."approvableId" = $${countParamIndex++}`;
      countParams.push(query.approvableId);
    }

    if (query.userId) {
      countSql += ` AND pa."userId" = $${countParamIndex++}`;
      countParams.push(query.userId);
    }

    if (query.companyId) {
      countSql += ` AND pa."companyId" = $${countParamIndex++}`;
      countParams.push(query.companyId);
    }

    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(
      countSql,
      countParams,
    );
    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: approvals.map((a) => this.mapApprovalToResponse(a)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================================================
  // UNIFIED ACTION (for frontend compatibility)
  // ============================================================================

  /**
   * Perform a unified approval action (approve/reject/return)
   * Maps the frontend's single-endpoint pattern to backend's separate methods
   */
  async performAction(
    statusId: number,
    userId: number,
    action: 'approve' | 'reject' | 'return',
    comment?: string,
    signaturePath?: string,
  ): Promise<ProcessApprovalStatusResponseDto> {
    // Get the approval status record
    const status = await this.tenantPrisma.queryOne(
      `SELECT * FROM process_approval_statuses WHERE id = $1 LIMIT 1`,
      [statusId],
    );
    if (!status) {
      throw new NotFoundException('Approval status not found');
    }

    // Find the current pending approval record
    const pendingApproval = await this.tenantPrisma.queryOne(
      `
      SELECT pa.id FROM process_approvals pa
      WHERE pa."approvableType" = $1
        AND pa."approvableId" = $2
        AND pa."approvedAt" IS NULL
      ORDER BY pa."createdAt" DESC
      LIMIT 1
      `,
      [status.approvableType, status.approvableId],
    );

    if (!pendingApproval) {
      throw new BadRequestException('No pending approval step found');
    }

    if (action === 'approve') {
      return this.approveStep(pendingApproval.id, userId, { comment, signaturePath });
    } else if (action === 'reject') {
      return this.rejectStep(pendingApproval.id, userId, {
        reason: comment || 'Rejected',
        comment,
      });
    } else if (action === 'return') {
      // Return is treated as rejection with different messaging
      return this.rejectStep(pendingApproval.id, userId, {
        reason: comment || 'Returned for revision',
        comment,
      });
    }

    throw new BadRequestException(`Invalid action: ${action}`);
  }

  // ============================================================================
  // CANCEL APPROVAL
  // ============================================================================

  /**
   * Cancel a pending approval process
   */
  async cancelApproval(
    statusId: number,
    userId: number,
    reason?: string,
  ): Promise<void> {
    const status = await this.tenantPrisma.queryOne(`SELECT * FROM process_approval_statuses WHERE id = $1 LIMIT 1`, [statusId]);
    if (!status) {
      throw new NotFoundException('Approval status not found');
    }

    if (status.status !== 'PENDING' && status.status !== 'WAITING') {
      throw new BadRequestException('Can only cancel pending or waiting approvals');
    }

    await this.tenantPrisma.update('process_approval_statuses', statusId, {
      status: 'CANCELLED',
      updatedAt: new Date(),
    });

    this.logger.log(
      `Approval ${statusId} cancelled by user ${userId}: ${reason || 'No reason provided'}`,
    );
  }

  // ============================================================================
  // OVERRIDE APPROVAL (Full flow bypass from current step)
  // ============================================================================

  /**
   * Override the entire remaining approval flow.
   * Only users in the current step's overrideApproverIds (matched by role or user ID) may call this.
   * The requester of the document can never override their own submission.
   */
  async overrideApproval(
    statusId: number,
    userId: number,
    dto: OverrideApprovalDto,
  ): Promise<ProcessApprovalStatusResponseDto> {
    // 1. Load status
    const status = await this.tenantPrisma.queryOne(`SELECT * FROM process_approval_statuses WHERE id = $1 LIMIT 1`, [statusId]);
    if (!status) throw new NotFoundException('Approval status not found');

    if (status.status !== 'PENDING' && status.status !== 'WAITING') {
      throw new BadRequestException('Can only override pending or waiting approvals');
    }

    // 2. Self-override guard — requester cannot override their own document
    if (status.creatorId === userId) {
      throw new ForbiddenException('You cannot override your own approval request');
    }

    // 3. Find the current active step by parsing steps JSON
    const stepsJson: Record<string, unknown>[] = typeof status.steps === 'string'
      ? JSON.parse(status.steps)
      : (status.steps || []);

    const currentStepEntry = stepsJson.find(
      (s: Record<string, unknown>) => s['status'] === 'PENDING' || s['status'] === 'WAITING',
    );
    if (!currentStepEntry) {
      throw new BadRequestException('No active step found in this approval');
    }

    const flowStepId = currentStepEntry['stepId'] as number;
    const flowStep = await this.tenantPrisma.queryOne<Record<string, unknown>>(
      `SELECT s.*, r.name as "overrideRoleName"
       FROM process_approval_flow_steps s
       LEFT JOIN roles r ON r.id = (
         SELECT id FROM roles WHERE id = ANY(ARRAY(
           SELECT jsonb_array_elements_text(s."overrideApproverIds")::int
         ))
         AND s."overrideApproverType" = 'role'
         LIMIT 1
       )
       WHERE s.id = $1`,
      [flowStepId],
    );

    if (!flowStep) throw new NotFoundException('Approval flow step not found');

    // 4. Super Admin check — must happen before overrideAllowed check so SA can bypass config
    const isAdmin = await isSuperAdmin(this.tenantPrisma, userId);

    // 5. Check override is allowed on this step (Super Admin bypasses this gate)
    if (!isAdmin && !flowStep['overrideAllowed']) {
      throw new ForbiddenException('Override is not permitted for this approval step');
    }

    // 6. Validate reason (note or reason field, minimum 1 char)
    const reason = (dto.reason || dto.note || '').trim();
    if (!reason) {
      throw new BadRequestException('Override reason is required');
    }

    // 7. If not Super Admin, check per-step override permission
    if (!isAdmin) {
      const authorised = await this.checkOverridePermission(userId, flowStep);
      if (!authorised) {
        throw new ForbiddenException('You are not authorised to override this approval step');
      }
    }

    // 8. Get the user's name for the log
    const user = await this.tenantPrisma.queryOne<{ name: string }>(
      `SELECT name FROM users WHERE id = $1`, [userId],
    );
    const overriderName = isAdmin
      ? `${user?.name || `User #${userId}`} (Super Admin)`
      : (user?.name || `User #${userId}`);

    // 9. Repair stale stepIds before checking for final step
    await this.repairStaleStepIds(stepsJson, status.approvableType, status.companyId, statusId);

    // Check if there is a locked final step (e.g. "Transfer Processing", "Payment Processing")
    // If so, skip all steps UP TO (but not including) the final step, and land on it as PENDING.
    // If no final step, skip everything and mark as APPROVED (original behavior).

    // Look up which steps are isFinalStep in the flow
    const stepIds = stepsJson.map((s: Record<string, unknown>) => s['stepId'] as number).filter(Boolean);
    const finalStepRows = stepIds.length > 0
      ? await this.tenantPrisma.query<{ id: number; isFinalStep: boolean }>(
          `SELECT id, "isFinalStep" FROM process_approval_flow_steps WHERE id = ANY($1::int[]) AND "isFinalStep" = true`,
          [stepIds],
        )
      : [];
    const finalStepIds = new Set(finalStepRows.map(r => r.id));

    // Find the first pending/waiting final step
    const finalStepJsonIndex = stepsJson.findIndex((s: Record<string, unknown>) =>
      (s['status'] === 'PENDING' || s['status'] === 'WAITING') && finalStepIds.has(s['stepId'] as number),
    );
    const hasFinalStep = finalStepJsonIndex >= 0;

    const skippedStepNames: string[] = [];
    const updatedSteps = stepsJson.map((s: Record<string, unknown>, idx: number) => {
      if (s['status'] !== 'PENDING' && s['status'] !== 'WAITING') return s;

      // If this is the final step, make it PENDING (don't skip it)
      if (hasFinalStep && idx === finalStepJsonIndex) {
        return { ...s, status: 'PENDING' };
      }

      // If there's a final step and this step is AFTER it, leave as WAITING
      if (hasFinalStep && idx > finalStepJsonIndex) return s;

      // Skip this step
      skippedStepNames.push(s['name'] as string);
      return { ...s, status: 'OVERRIDDEN', overriddenBy: overriderName, overriddenAt: new Date().toISOString() };
    });

    if (hasFinalStep) {
      // 10a. Land on the final step — status stays PENDING
      await this.tenantPrisma.update('process_approval_statuses', statusId, {
        steps: JSON.stringify(updatedSteps),
        updatedAt: new Date(),
      });

      // Create a pending approval record for the final step so the officer can act on it
      const finalStepData = stepsJson[finalStepJsonIndex];
      const finalStepId = finalStepData['stepId'] as number;

      // Delete any existing pending record for the final step (from initial creation)
      await this.tenantPrisma.query(
        `DELETE FROM process_approvals
         WHERE "approvableType" = $1 AND "approvableId" = $2
           AND "processApprovalFlowStepId" = $3 AND "approvedAt" IS NULL`,
        [status.approvableType, status.approvableId, finalStepId],
      );

      // Insert fresh pending record
      await this.tenantPrisma.insert('process_approvals', {
        approvableType: status.approvableType,
        approvableId: status.approvableId,
        processApprovalFlowStepId: finalStepId,
        approvalAction: 'Pending',
        userId,
        companyId: status.companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Notify the processing officer
      const finalFlowStep = await this.tenantPrisma.queryOne<Record<string, unknown>>(
        `SELECT * FROM process_approval_flow_steps WHERE id = $1`,
        [finalStepId],
      );
      if (finalFlowStep) {
        await this.notifyApproversForStep(
          finalFlowStep,
          status.approvableType,
          status.approvableId,
          status.companyId,
          finalStepData['name'] as string || 'Transfer Processing',
        );
      }
    } else {
      // 10b. No final step — skip everything, mark as APPROVED (original behavior)
      await this.tenantPrisma.update('process_approval_statuses', statusId, {
        status: 'APPROVED',
        steps: JSON.stringify(updatedSteps),
        updatedAt: new Date(),
      });
      // Sync entity status + domain actions (GL posting for bank transfers, etc.)
      await this.syncApprovalToEntity(status.approvableType, status.approvableId, userId);
    }

    // 11. Insert immutable override action record
    const categoryLabel = dto.category ? `[${dto.category.toUpperCase()}] ` : '';
    await this.tenantPrisma.insert('process_approvals', {
      approvableType: status.approvableType,
      approvableId: status.approvableId,
      processApprovalFlowStepId: flowStepId,
      approvalAction: 'Overridden',
      approverName: overriderName,
      comment: `${categoryLabel}Override skipped [${skippedStepNames.join(', ')}]. ${hasFinalStep ? 'Landed on final processing step.' : 'All steps completed.'} Reason: ${reason}`,
      approvedAt: new Date(),
      userId,
      companyId: status.companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.logger.log(`Approval ${statusId} overridden by user ${userId}. Skipped: [${skippedStepNames.join(', ')}]${hasFinalStep ? ' → landed on final step' : ' → fully approved'}. Reason: ${reason}`);

    return this.checkApprovalStatus(status.approvableType as string, status.approvableId as number);
  }

  // ============================================================================
  // SUPER ADMIN APPROVE STEP
  // ============================================================================

  /**
   * Super Admin approves only the current step and advances to the next one.
   * Bypasses the normal approver-role permission check.
   * Logged as "Approved by Super Admin (override)".
   */
  async superAdminApproveStep(
    statusId: number,
    userId: number,
  ): Promise<ProcessApprovalStatusResponseDto> {
    // 1. Verify Super Admin
    const isAdmin = await isSuperAdmin(this.tenantPrisma, userId);
    if (!isAdmin) throw new ForbiddenException('Only Super Admin can use this action');

    // 2. Load status
    const status = await this.tenantPrisma.queryOne(
      `SELECT * FROM process_approval_statuses WHERE id = $1 LIMIT 1`,
      [statusId],
    );
    if (!status) throw new NotFoundException('Approval status not found');

    if (status.status !== 'PENDING' && status.status !== 'WAITING') {
      throw new BadRequestException('Can only act on pending or waiting approvals');
    }

    // 3. Find the pending process_approvals record for the current step
    const pendingApproval = await this.tenantPrisma.queryOne<{ id: number }>(
      `SELECT pa.id FROM process_approvals pa
       WHERE pa."approvableType" = $1 AND pa."approvableId" = $2 AND pa."approvedAt" IS NULL
       ORDER BY pa."createdAt" DESC LIMIT 1`,
      [status.approvableType, status.approvableId],
    );
    if (!pendingApproval) throw new BadRequestException('No pending approval step found');

    // 4. Approve with bypass flag — step-advance logic is handled inside approveStep
    return this.approveStep(pendingApproval.id, userId, { comment: 'Approved by Super Admin (override)' }, true);
  }

  // ============================================================================
  // RESET TO STEP 1 (Super Admin only)
  // ============================================================================

  /**
   * Resets the approval flow back to step 1.
   * Deletes all existing process_approvals and creates a fresh pending record for step 1.
   * Only Super Admin can call this.
   */
  async resetToStep1(statusId: number, userId: number): Promise<ProcessApprovalStatusResponseDto> {
    const isAdmin = await isSuperAdmin(this.tenantPrisma, userId);
    if (!isAdmin) throw new ForbiddenException('Only Super Admin can reset an approval flow');

    const status = await this.tenantPrisma.queryOne(
      `SELECT * FROM process_approval_statuses WHERE id = $1 LIMIT 1`,
      [statusId],
    );
    if (!status) throw new NotFoundException('Approval status not found');

    // ── NUCLEAR RESET: delete everything and rebuild from the live flow ──

    // 1. Delete ALL approval records for this entity
    await this.tenantPrisma.query(
      `DELETE FROM process_approvals WHERE "approvableType" = $1 AND "approvableId" = $2`,
      [status.approvableType, status.approvableId],
    );

    // 2. Delete the status record
    await this.tenantPrisma.query(
      `DELETE FROM process_approval_statuses WHERE id = $1`,
      [statusId],
    );

    // 3. Reset the entity status back to pending
    const entityMap: Record<string, string> = {
      bank_transfers: 'bank_transfers',
      supplier_payments: 'pay_payments',
      expense_requests: 'expense_requests',
      sales_orders: 'sales_orders',
      sales_invoices: 'sales_invoices',
      purchase_requisitions: 'purchase_requisitions',
      purchase_orders: 'purchase_orders',
      customer_receipts: 'customer_receipts',
      journal_entries: 'journal_entries',
      credit_notes: 'credit_notes',
    };
    const table = entityMap[status.approvableType];
    if (table) {
      await this.tenantPrisma.query(
        `UPDATE ${table} SET status = 'pending', "approvedBy" = NULL, "approvedAt" = NULL, "updatedAt" = NOW()
         WHERE id = $1 AND status NOT IN ('posted', 'completed', 'paid')`,
        [status.approvableId],
      );
    }

    // 4. Re-initiate from the CURRENT live flow (fresh steps, fresh IDs)
    this.logger.log(`Approval ${statusId} nuked and re-initiating for ${status.approvableType}#${status.approvableId} by Super Admin user ${userId}`);
    return this.initiateApproval(
      {
        processType: status.approvableType,
        recordId: status.approvableId,
        companyId: status.companyId,
      },
      userId,
    );
  }

  /**
   * Check if a user is authorised to override a given step.
   * Matches by role (user must have a role in overrideApproverIds) or by direct user ID.
   */
  private async checkOverridePermission(userId: number, flowStep: Record<string, unknown>): Promise<boolean> {
    // Super Admin can always override any step
    if (await isSuperAdmin(this.tenantPrisma, userId)) return true;

    const overrideApproverType = flowStep['overrideApproverType'] as string | null;
    const rawIds = flowStep['overrideApproverIds'];
    const overrideApproverIds: number[] = rawIds
      ? (typeof rawIds === 'string' ? JSON.parse(rawIds) : rawIds as number[])
      : [];

    if (!overrideApproverIds.length) return false;

    if (overrideApproverType === 'role' || overrideApproverType === 'any_of_role') {
      const result = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM user_roles ur
         WHERE ur."userId" = $1
           AND ur."roleId" = ANY($2::int[])`,
        [userId, overrideApproverIds],
      );
      return parseInt(result?.count || '0', 10) > 0;
    }

    if (overrideApproverType === 'employee') {
      return overrideApproverIds.includes(userId);
    }

    return false;
  }

  // ============================================================================
  // PENDING COUNT
  // ============================================================================

  /**
   * Get count of pending approvals for a user
   */
  async getPendingCount(userId: number, companyId: number): Promise<number> {
    const userRoles = await this.tenantPrisma.query(
      `SELECT r.id FROM roles r JOIN user_roles ur ON r.id = ur."roleId"
       WHERE ur."userId" = $1`,
      [userId],
    );
    const roleIds = userRoles.map((r: Record<string, unknown>) => r.id as number);

    const empRow = await this.tenantPrisma.queryOne<{ id: number }>(
      `SELECT e.id FROM employees e JOIN users u ON u."employeeId" = e.id WHERE u.id = $1`,
      [userId],
    );
    const employeeId = empRow?.id ?? 0;

    if (roleIds.length === 0 && !employeeId) return 0;

    const result = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM process_approval_statuses pas
       WHERE pas.status = 'PENDING' AND pas."companyId" = $1
       AND EXISTS (
         SELECT 1 FROM process_approvals pa
         JOIN process_approval_flow_steps pafs ON pa."processApprovalFlowStepId" = pafs.id
         WHERE pa."approvableType" = pas."approvableType"
           AND pa."approvableId" = pas."approvableId"
           AND pa."approvedAt" IS NULL
           AND (
             (pafs."roleId" = ANY($2::int[]))
             OR (pafs."approverType" = 'employee' AND pafs.employees @> jsonb_build_object('ids', jsonb_build_array($3::int)))
           )
       )`,
      [companyId, roleIds.length > 0 ? roleIds : [0], employeeId],
    );

    return parseInt(result?.count || '0', 10);
  }

  // ============================================================================
  // APPROVAL STATS
  // ============================================================================

  /**
   * Get approval statistics
   */
  async getStats(companyId: number): Promise<Record<string, unknown>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pending = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM process_approval_statuses WHERE status = 'PENDING' AND "companyId" = $1`,
      [companyId],
    );

    const approvedToday = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM process_approval_statuses
       WHERE status = 'APPROVED' AND "companyId" = $1 AND "updatedAt" >= $2`,
      [companyId, today],
    );

    const rejectedToday = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM process_approval_statuses
       WHERE status = 'REJECTED' AND "companyId" = $1 AND "updatedAt" >= $2`,
      [companyId, today],
    );

    // Also count loading inspection approvals (separate system)
    const pendingInspections = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM loading_inspections
       WHERE status != 'completed' AND "companyId" = $1 AND "deletedAt" IS NULL`,
      [companyId],
    );

    const completedInspectionsToday = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM loading_inspections
       WHERE status = 'completed' AND "companyId" = $1 AND "completedAt" >= $2 AND "deletedAt" IS NULL`,
      [companyId, today],
    );

    const totalPending = parseInt(pending?.count || '0', 10) + parseInt(pendingInspections?.count || '0', 10);
    const totalApprovedToday = parseInt(approvedToday?.count || '0', 10) + parseInt(completedInspectionsToday?.count || '0', 10);

    // Breakdown of pending approvals by approvableType (joined to flow for display name + slug)
    const byFlowRows = await this.tenantPrisma.query<{
      approvableType: string;
      count: string;
      flowName: string | null;
      entitySlug: string | null;
    }>(
      `SELECT s."approvableType",
              COUNT(*)::text as count,
              MAX(f.name) as "flowName",
              MAX(f."entitySlug") as "entitySlug"
       FROM process_approval_statuses s
       LEFT JOIN process_approval_flows f
         ON f."approvableType" = s."approvableType"
        AND f."isActive" = true
        AND f."deletedAt" IS NULL
        AND (f."companyId" = $1 OR f."companyId" IS NULL)
       WHERE s.status = 'PENDING' AND s."companyId" = $1
       GROUP BY s."approvableType"
       ORDER BY COUNT(*) DESC`,
      [companyId],
    );

    const byFlow = byFlowRows.map((row) => ({
      approvableType: row.approvableType,
      flowName: row.flowName || this.humanizeApprovableType(row.approvableType),
      entitySlug: row.entitySlug,
      count: parseInt(row.count || '0', 10),
    }));

    // Append loading inspections as a synthetic row when present (separate system, no flow record)
    const inspectionCount = parseInt(pendingInspections?.count || '0', 10);
    if (inspectionCount > 0) {
      byFlow.push({
        approvableType: 'loading_inspections',
        flowName: 'Loading Inspections',
        entitySlug: 'sales.loading-orders',
        count: inspectionCount,
      });
      byFlow.sort((a, b) => b.count - a.count);
    }

    return {
      pending: totalPending,
      approvedToday: totalApprovedToday,
      rejectedToday: parseInt(rejectedToday?.count || '0', 10),
      avgApprovalTimeHours: 0,
      urgentCount: 0,
      overdueCount: 0,
      pendingInspections: inspectionCount,
      byFlow,
    };
  }

  /**
   * Convert snake_case approvable type to a human-readable label as a fallback
   * when no active ProcessApprovalFlow exists for it.
   */
  private humanizeApprovableType(type: string): string {
    if (!type) return 'Unknown';
    return type
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // ============================================================================
  // APPROVAL HISTORY
  // ============================================================================

  /**
   * Get approval history for a specific entity
   */
  async getHistoryForEntity(
    entityType: string,
    entityId: number,
  ): Promise<ProcessApprovalStatusResponseDto[]> {
    const statuses = await this.tenantPrisma.query(
      `SELECT * FROM process_approval_statuses
       WHERE "approvableType" = $1 AND "approvableId" = $2
       ORDER BY "createdAt" DESC`,
      [entityType, entityId],
    );

    const results: ProcessApprovalStatusResponseDto[] = [];
    for (const status of statuses) {
      try {
        const full = await this.checkApprovalStatus(status.approvableType, status.approvableId);
        results.push(full);
      } catch {
        // Skip if status check fails
      }
    }
    return results;
  }

  /**
   * Get all approval history with pagination and filters
   */
  async getAllHistory(query: {
    page?: number;
    limit?: number;
    entityType?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ data: ProcessApprovalStatusResponseDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM process_approval_statuses WHERE status != 'PENDING'`;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.entityType) {
      sql += ` AND "approvableType" = $${paramIndex++}`;
      params.push(query.entityType);
    }
    if (query.status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(query.status.toUpperCase());
    }
    if (query.dateFrom) {
      sql += ` AND "createdAt" >= $${paramIndex++}`;
      params.push(query.dateFrom);
    }
    if (query.dateTo) {
      sql += ` AND "createdAt" <= $${paramIndex++}`;
      params.push(query.dateTo);
    }

    // Count
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(countSql, params);
    const total = parseInt(countResult?.count || '0', 10);

    sql += ` ORDER BY "updatedAt" DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const statuses = await this.tenantPrisma.query(sql, params);

    const data: ProcessApprovalStatusResponseDto[] = [];
    for (const status of statuses) {
      try {
        const full = await this.checkApprovalStatus(status.approvableType, status.approvableId);
        data.push(full);
      } catch {
        // Include basic info if full status check fails
        data.push({
          id: status.id,
          approvableType: status.approvableType,
          approvableId: status.approvableId,
          status: status.status as ApprovalStatus,
          creatorId: status.creatorId,
          companyId: status.companyId,
          createdAt: status.createdAt,
          updatedAt: status.updatedAt,
        });
      }
    }

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ============================================================================
  // DOMAIN-LEVEL SHARED HELPERS
  // (used by domain services: purchase, sales, HR, accounts, etc.)
  // ============================================================================

  /**
   * Initiate approval only if an active flow is configured for the processType.
   * Returns true if a flow was found and approval was initiated.
   * Returns false if no flow is configured (caller decides fallback behaviour).
   */
  async initiateIfFlowExists(
    processType: string,
    recordId: number,
    companyId: number,
    userId: number,
    comment?: string,
  ): Promise<boolean> {
    const flow = await this.flowService.getFlowForProcess(processType, companyId);
    if (!flow) return false;
    await this.initiateApproval({ processType, recordId, companyId, comment }, userId);
    return true;
  }

  /**
   * Advance the current pending approval step for a record identified by
   * (processType, recordId).  Delegates to approveStep() which performs the
   * role/employee authority check.
   *
   * @returns true when ALL steps are now APPROVED (entity can be finalised)
   *          false when more steps remain
   * @throws NotFoundException if no process_approval_statuses record exists
   * @throws BadRequestException if no pending step found
   * @throws ForbiddenException if userId is not authorised for this step
   */
  async advanceByProcessType(
    processType: string,
    recordId: number,
    userId: number,
    comment?: string,
  ): Promise<boolean> {
    let pendingApproval = await this.tenantPrisma.queryOne<{ id: number }>(
      `SELECT id FROM process_approvals
       WHERE "approvableType" = $1 AND "approvableId" = $2 AND "approvedAt" IS NULL
       ORDER BY "createdAt" DESC LIMIT 1`,
      [processType, recordId],
    );

    if (!pendingApproval) {
      // Check if approval is already fully done — if so, return true
      const status = await this.tenantPrisma.queryOne<{ id: number; status: string; steps: unknown; companyId: number }>(
        `SELECT id, status, steps, "companyId" FROM process_approval_statuses
         WHERE "approvableType" = $1 AND "approvableId" = $2`,
        [processType, recordId],
      );
      if (status?.status === 'APPROVED') {
        this.logger.warn(
          `advanceByProcessType: no pending step for ${processType}#${recordId} but status is APPROVED — returning true`,
        );
        return true;
      }

      // Self-heal: if status has a PENDING step but no process_approvals record, create one
      if (status) {
        const stepsJson: Record<string, unknown>[] = typeof status.steps === 'string'
          ? JSON.parse(status.steps) : (status.steps as Record<string, unknown>[]) || [];
        const pendingStep = stepsJson.find((s) => s['status'] === 'PENDING');
        if (pendingStep && pendingStep['stepId']) {
          // Validate the stepId still exists in process_approval_flow_steps
          let validStepId = pendingStep['stepId'] as number;
          const stepExists = await this.tenantPrisma.queryOne<{ id: number }>(
            `SELECT id FROM process_approval_flow_steps WHERE id = $1 AND "deletedAt" IS NULL`,
            [validStepId],
          );

          if (!stepExists) {
            // Step was deleted (e.g. duplicate cleanup) — find the correct step from the live flow
            this.logger.warn(
              `advanceByProcessType: stepId ${validStepId} no longer exists, looking up from live flow`,
            );
            const flow = await this.flowService.getFlowForProcess(processType, status.companyId);
            if (flow?.steps) {
              const sorted = flow.steps.sort((a, b) => a.stepOrder - b.stepOrder);
              // Find the step matching by name or position
              const stepName = pendingStep['name'] as string;
              const match = sorted.find((s) => s.name === stepName)
                || sorted.find((s) => s.stepOrder === (pendingStep['stepOrder'] as number));
              if (match) {
                validStepId = match.id;
                // Update the stale stepId in the stored JSON
                pendingStep['stepId'] = validStepId;
                await this.tenantPrisma.update('process_approval_statuses', status.id, {
                  steps: JSON.stringify(stepsJson),
                  updatedAt: new Date(),
                });
              } else {
                this.logger.warn(`advanceByProcessType: could not find matching flow step for "${stepName}"`);
              }
            }
          }

          if (validStepId) {
            this.logger.warn(
              `advanceByProcessType: self-healing — creating process_approvals record for ${processType}#${recordId} step ${pendingStep['name']}`,
            );
            const created = await this.tenantPrisma.insert('process_approvals', {
              approvableType: processType,
              approvableId: recordId,
              processApprovalFlowStepId: validStepId,
              approvalAction: 'Pending',
              userId,
              companyId: status.companyId,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            pendingApproval = { id: created.id };
          }
        }
      }

      if (!pendingApproval) {
        throw new BadRequestException('No pending approval step found for this record');
      }
    }

    // Check if user is Super Admin — bypass duplicate-approver guard so SA can approve all steps
    const saRole = await this.tenantPrisma.queryOne<{ id: number }>(
      `SELECT r.id FROM user_roles ur JOIN roles r ON r.id = ur."roleId"
       WHERE ur."userId" = $1 AND LOWER(r.name) IN ('super admin', 'super_admin', 'system admin')
       LIMIT 1`,
      [userId],
    );
    const isSuperAdmin = !!saRole;

    const result = await this.approveStep(pendingApproval.id, userId, { comment }, isSuperAdmin);
    return result.status === 'APPROVED';
  }

  /**
   * Reject the current pending approval step for a record identified by
   * (processType, recordId).  Delegates to rejectStep() which performs the
   * role/employee authority check.
   *
   * @throws NotFoundException if no process_approval_statuses record exists
   * @throws BadRequestException if no pending step found
   * @throws ForbiddenException if userId is not authorised for this step
   */
  async rejectByProcessType(
    processType: string,
    recordId: number,
    userId: number,
    reason: string,
    comment?: string,
  ): Promise<void> {
    const pendingApproval = await this.tenantPrisma.queryOne<{ id: number }>(
      `SELECT id FROM process_approvals
       WHERE "approvableType" = $1 AND "approvableId" = $2 AND "approvedAt" IS NULL
       ORDER BY "createdAt" DESC LIMIT 1`,
      [processType, recordId],
    );

    if (!pendingApproval) {
      // If already fully approved or rejected, don't throw — just return
      const status = await this.tenantPrisma.queryOne<{ status: string }>(
        `SELECT status FROM process_approval_statuses
         WHERE "approvableType" = $1 AND "approvableId" = $2`,
        [processType, recordId],
      );
      if (status?.status === 'APPROVED' || status?.status === 'REJECTED') {
        this.logger.warn(
          `rejectByProcessType: no pending step for ${processType}#${recordId} — status is ${status.status}`,
        );
        return;
      }
      throw new BadRequestException('No pending approval step found for this record');
    }

    await this.rejectStep(pendingApproval.id, userId, { reason, comment: comment ?? reason });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Check if user has permission to approve a step
   */
  private async checkApprovalPermission(
    userId: number,
    flowStep: Record<string, unknown>,
  ): Promise<boolean> {
    // Super Admin bypass — can approve any step
    const isSuperAdmin = await this.tenantPrisma.queryOne<{ id: number }>(
      `SELECT ur."roleId" as id FROM user_roles ur JOIN roles r ON r.id = ur."roleId" WHERE ur."userId" = $1 AND r.name = 'Super Admin' LIMIT 1`,
      [userId],
    );
    if (isSuperAdmin) return true;

    // Branch scope check — if step is scoped to a specific branch, user must belong to that branch
    const branchScope = flowStep.branchScope as string | null;
    const stepBranchId = flowStep.branchId as number | null;
    if (branchScope === 'specific' && stepBranchId) {
      const userInBranch = await this.tenantPrisma.queryOne<{ id: number }>(
        `SELECT u.id FROM users u
         LEFT JOIN employees e ON e."userId" = u.id
         WHERE u.id = $1 AND (u."branchId" = $2 OR e."branchId" = $2) LIMIT 1`,
        [userId, stepBranchId],
      );
      if (!userInBranch) return false;
    }

    // Check if user has the required role (using user_roles table)
    if (flowStep.roleId) {
      const userHasRole = await this.tenantPrisma.queryOne<{ roleId: number }>(
        `SELECT ur."roleId" FROM user_roles ur
         WHERE ur."userId" = $1 AND ur."roleId" = $2
         LIMIT 1`,
        [userId, flowStep.roleId],
      );
      if (userHasRole) return true;
    }

    // Check approverIds list (role-based or direct employee IDs)
    const approverType = flowStep.approverType as string | null;
    const rawApproverIds = flowStep.approverIds;
    const approverIds: number[] = rawApproverIds
      ? (typeof rawApproverIds === 'string' ? JSON.parse(rawApproverIds) : (rawApproverIds as number[]))
      : [];

    if (approverIds.length > 0) {
      if (approverType === 'role' || approverType === 'any_of_role') {
        const result = await this.tenantPrisma.queryOne<{ count: string }>(
          `SELECT COUNT(*) as count FROM user_roles ur
           WHERE ur."userId" = $1
             AND ur."roleId" = ANY($2::int[])`,
          [userId, approverIds],
        );
        if (parseInt(result?.count || '0', 10) > 0) return true;
      }

      if (approverType === 'employee') {
        const emp = await this.tenantPrisma.queryOne<{ id: number }>(
          `SELECT id FROM employees WHERE "userId" = $1 LIMIT 1`,
          [userId],
        );
        if (emp && approverIds.includes(emp.id)) return true;
      }
    }

    // Legacy: check employees JSON field
    if (flowStep.employees) {
      const employees = typeof flowStep.employees === 'string'
        ? JSON.parse(flowStep.employees as string)
        : (flowStep.employees as { ids?: number[] });
      const empIds: number[] = Array.isArray(employees) ? employees : (employees?.ids ?? []);
      const userEmployee = await this.tenantPrisma.queryOne<{ id: number }>(
        `SELECT id FROM employees WHERE "userId" = $1 LIMIT 1`,
        [userId],
      );
      if (userEmployee && empIds.includes(userEmployee.id)) return true;
    }

    return false;
  }

  /**
   * Map database row to approval response DTO
   */
  private mapApprovalToResponse(approval: any): ProcessApprovalResponseDto {
    const response: ProcessApprovalResponseDto = {
      id: approval.id,
      approvableType: approval.approvableType,
      approvableId: approval.approvableId,
      processApprovalFlowStepId: approval.processApprovalFlowStepId,
      approvalAction: approval.approvalAction,
      approverName: approval.approverName,
      comment: approval.comment,
      signaturePath: approval.signaturePath,
      approvedAt: approval.approvedAt,
      userId: approval.userId,
      employeeId: approval.employeeId,
      companyId: approval.companyId,
      tenantId: approval.tenantId,
      createdAt: approval.createdAt,
      updatedAt: approval.updatedAt,
    };

    // Include user details if available
    if (approval.userName) {
      response.user = {
        id: approval.userId,
        name: approval.userName,
        email: approval.userEmail,
      };
    }

    // Include step details if available
    if (approval.stepName !== undefined) {
      response.processApprovalFlowStep = {
        id: approval.processApprovalFlowStepId,
        name: approval.stepName,
        stepOrder: approval.stepOrder,
        action: approval.stepAction,
      };
    }

    return response;
  }

  // ============================================================================
  // APPROVAL NOTIFICATIONS
  // ============================================================================

  /**
   * Repair stale stepIds in a process_approval_statuses steps JSON.
   * When flow steps are deleted (e.g. duplicate cleanup), the stored stepIds
   * become orphaned. This method detects orphans and remaps them to the
   * current live flow steps by matching on step name or order.
   * Also fixes any process_approvals records that reference the old stepIds.
   */
  private async repairStaleStepIds(
    stepsData: Record<string, unknown>[],
    processType: string,
    companyId: number,
    statusId: number,
  ): Promise<void> {
    if (!stepsData?.length) return;

    // Collect all stepIds referenced in the JSON
    const stepIds = stepsData.map((s) => s['stepId'] as number).filter(Boolean);
    if (stepIds.length === 0) return;

    // Check which ones still exist
    const existing = await this.tenantPrisma.query<{ id: number }>(
      `SELECT id FROM process_approval_flow_steps WHERE id = ANY($1::int[])`,
      [stepIds],
    );
    const existingIds = new Set(existing.map((r) => r.id));

    const staleSteps = stepsData.filter((s) => s['stepId'] && !existingIds.has(s['stepId'] as number));

    // Also detect duplicate stepIds: same stepId appearing more than once (with different positions)
    const seenIds = new Map<number, number>(); // stepId → first index
    const duplicateIndices = new Set<number>();
    stepsData.forEach((s, i) => {
      const sid = s['stepId'] as number;
      if (!sid) return;
      if (seenIds.has(sid)) {
        duplicateIndices.add(i); // mark later occurrences as duplicates to fix
      } else {
        seenIds.set(sid, i);
      }
    });

    if (staleSteps.length === 0 && duplicateIndices.size === 0) return; // All good

    // Load the live flow to remap
    let flow: Record<string, unknown> | null = null;
    try {
      flow = await this.flowService.getFlowForProcess(processType, companyId) as unknown as Record<string, unknown>;
    } catch { /* no flow found */ }

    const flowSteps = (flow?.steps || flow?.['steps']) as Array<{ id: number; name: string; stepOrder: number }> | undefined;
    if (!flowSteps?.length) {
      this.logger.warn(`repairStaleStepIds: no live flow for ${processType}, cannot repair ${staleSteps.length} stale + ${duplicateIndices.size} duplicate steps`);
      return;
    }

    const sorted = flowSteps.sort((a, b) => a.stepOrder - b.stepOrder);
    let repaired = 0;

    // Repair stale (deleted) stepIds
    for (const staleStep of staleSteps) {
      const oldId = staleStep['stepId'] as number;
      const stepName = staleStep['name'] as string;
      const stepOrder = staleStep['stepOrder'] as number;

      // Match by name first, then by order
      const match = (stepName ? sorted.find((s) => s.name === stepName) : undefined)
        || (stepOrder ? sorted.find((s) => s.stepOrder === stepOrder) : undefined);

      if (match) {
        staleStep['stepId'] = match.id;
        repaired++;

        // Also fix any process_approvals records referencing the old stepId
        await this.tenantPrisma.query(
          `UPDATE process_approvals SET "processApprovalFlowStepId" = $1
           WHERE "processApprovalFlowStepId" = $2 AND "approvableType" = $3`,
          [match.id, oldId, processType],
        );
      }
    }

    // Repair duplicate stepIds: remap each duplicate to the live flow step at that position
    if (duplicateIndices.size > 0) {
      const usedFlowIds = new Set(stepsData
        .filter((_, i) => !duplicateIndices.has(i))
        .map((s) => s['stepId'] as number)
        .filter(Boolean));

      for (const dupIdx of duplicateIndices) {
        const dupStep = stepsData[dupIdx];
        const stepOrder = dupStep['stepOrder'] as number;
        // Find the live flow step at this position that hasn't been assigned yet
        const match = sorted.find((s) => s.stepOrder === stepOrder && !usedFlowIds.has(s.id))
          || sorted.find((s) => !usedFlowIds.has(s.id));
        if (match) {
          dupStep['stepId'] = match.id;
          dupStep['name'] = match.name;
          usedFlowIds.add(match.id);
          repaired++;
          this.logger.warn(`repairStaleStepIds: fixed duplicate stepId at index ${dupIdx} → stepId ${match.id} (${match.name})`);
        }
      }
    }

    if (repaired > 0) {
      await this.tenantPrisma.update('process_approval_statuses', statusId, {
        steps: JSON.stringify(stepsData),
        updatedAt: new Date(),
      });
      this.logger.log(`repairStaleStepIds: fixed ${repaired} steps (stale/duplicate) for ${processType} status #${statusId}`);
    }
  }

  /**
   * Sync rejection status to the source entity.
   * Updates entity status, stores rejection reason, and notifies the requester.
   */
  /**
   * Sync approval completion to the domain entity.
   * Called when ALL approval steps are complete (including final processing steps).
   * Updates entity status and triggers domain actions like GL posting.
   */
  private async syncApprovalToEntity(
    approvableType: string,
    approvableId: number,
    userId: number,
  ): Promise<void> {
    try {
      const entityMap: Record<string, { table: string; approvedStatus: string }> = {
        expense_requests: { table: 'expense_requests', approvedStatus: 'pending_payment' },
        sales_orders: { table: 'sales_orders', approvedStatus: 'confirmed' },
        sales_invoices: { table: 'sales_invoices', approvedStatus: 'approved' },
        purchase_requisitions: { table: 'purchase_requisitions', approvedStatus: 'approved' },
        purchase_orders: { table: 'purchase_orders', approvedStatus: 'approved' },
        supplier_payments: { table: 'pay_payments', approvedStatus: 'approved' },
        journal_entries: { table: 'journal_entries', approvedStatus: 'posted' },
        bank_transfers: { table: 'bank_transfers', approvedStatus: 'approved' },
        customer_receipts: { table: 'customer_receipts', approvedStatus: 'APPROVED' },
        credit_notes: { table: 'credit_notes', approvedStatus: 'APPROVED' },
        loading_orders: { table: 'loading_orders', approvedStatus: 'approved' },
      };

      // Special case: investor onboarding uses kycStatus, not status
      if (approvableType === 'investor_onboarding') {
        await this.tenantPrisma.query(
          `UPDATE fm_investors
           SET "kycStatus" = 'APPROVED', "kycApprovedBy" = $1, "kycApprovedAt" = NOW(),
               "kycExpiryDate" = (NOW() + INTERVAL '1 year')::date, "updatedAt" = NOW()
           WHERE id = $2 AND "kycStatus" NOT IN ('APPROVED')`,
          [userId, approvableId],
        );
        this.logger.log(`syncApprovalToEntity: investor_onboarding #${approvableId} → KYC APPROVED`);
        return;
      }

      const entity = entityMap[approvableType];
      if (!entity) return;

      // Update entity status to approved (skip if already posted/completed/paid)
      await this.tenantPrisma.query(
        `UPDATE ${entity.table}
         SET status = $1, "approvedBy" = $2, "approvedAt" = NOW(), "updatedAt" = NOW()
         WHERE id = $3 AND status NOT IN ($1, 'posted', 'completed', 'paid')`,
        [entity.approvedStatus, userId, approvableId],
      );
      this.logger.log(`syncApprovalToEntity: ${approvableType} #${approvableId} → ${entity.approvedStatus}`);

      // Bank transfers: auto-post GL after approval
      if (approvableType === 'bank_transfers') {
        await this.postBankTransferGL(approvableId, userId);
      }
    } catch (err: unknown) {
      this.logger.error(`syncApprovalToEntity: ${approvableType} #${approvableId} failed: ${(err as Error).message}`, (err as Error).stack);
      // Re-throw so the error is visible to the user
      throw err;
    }
  }

  /**
   * Post a bank transfer to GL. Called after all approval steps complete.
   */
  private async postBankTransferGL(transferId: number, userId: number): Promise<void> {
    const { postToGL } = require('../../../common/utils/gl-posting');
    const { toMoney } = require('../../../common/utils/decimal');
    const { resolveGlAccount } = require('../../../common/utils/gl-account-resolver');

    const transfer = await this.tenantPrisma.queryOne<Record<string, unknown>>(
      `SELECT bt.*, b1."glAccountId" as "fromGlId", b2."glAccountId" as "toGlId",
              b1.name as "fromName", b2.name as "toName",
              b1."companyId" as "bankCompanyId"
       FROM bank_transfers bt
       JOIN banks b1 ON b1.id = bt."fromBankId"
       JOIN banks b2 ON b2.id = bt."toBankId"
       WHERE bt.id = $1`,
      [transferId],
    );

    if (!transfer) {
      this.logger.error(`postBankTransferGL: transfer #${transferId} not found`);
      throw new Error(`Bank transfer #${transferId} not found — cannot post GL`);
    }
    if (!transfer.fromGlId || !transfer.toGlId) {
      this.logger.error(`postBankTransferGL: transfer #${transferId} missing GL accounts (from=${transfer.fromGlId}, to=${transfer.toGlId})`);
      throw new Error(`Bank transfer #${transferId} missing GL accounts — configure bank GL accounts before approving`);
    }
    if (transfer.journalEntryId) {
      this.logger.log(`postBankTransferGL: transfer #${transferId} already posted — skipping`);
      return;
    }

    const companyId = (transfer.bankCompanyId || transfer.companyId) as number;
    const amount = toMoney(transfer.amount);
    const bankCharges = toMoney(Number(transfer.bankCharges) || 0);
    const isForeign = transfer.transferType === 'foreign';
    const lines: Array<{ accountId: number; debit: number; credit: number; narration: string }> = [];

    if (!isForeign) {
      lines.push(
        { accountId: transfer.toGlId as number, debit: amount, credit: 0, narration: `Transfer to ${transfer.toName}` },
        { accountId: transfer.fromGlId as number, debit: 0, credit: amount, narration: `Transfer from ${transfer.fromName}` },
      );
    } else {
      // Foreign transfer: all GL entries in base currency (NGN)
      lines.push(
        { accountId: transfer.toGlId as number, debit: amount, credit: 0, narration: `Foreign transfer to ${transfer.toName}` },
        { accountId: transfer.fromGlId as number, debit: 0, credit: amount + bankCharges, narration: `Foreign transfer from ${transfer.fromName}` },
      );

      if (bankCharges > 0) {
        const chargesAccountId = transfer.chargesAccountId as number | null;
        if (chargesAccountId) {
          lines.push({ accountId: chargesAccountId, debit: bankCharges, credit: 0, narration: 'Bank transfer charges' });
        } else {
          const chargesAccount = await resolveGlAccount(this.tenantPrisma, companyId, 'bank_charges');
          lines.push({ accountId: chargesAccount.id, debit: bankCharges, credit: 0, narration: 'Bank transfer charges' });
        }
      }
    }

    const result = await postToGL(this.tenantPrisma, {
      companyId,
      entryDate: transfer.transferDate ? new Date(transfer.transferDate as string) : new Date(),
      reference: (transfer.transferNumber as string) || `BT-${transferId}`,
      narration: `Bank Transfer: ${transfer.fromName} → ${transfer.toName}`,
      sourceType: 'bank_transfer',
      sourceId: transferId,
      lines,
    });

    if (result) {
      await this.tenantPrisma.query(
        `UPDATE bank_transfers SET status = 'posted', "journalEntryId" = $1, "updatedAt" = NOW() WHERE id = $2`,
        [result.journalEntryId, transferId],
      );
      this.logger.log(`postBankTransferGL: transfer #${transferId} posted (journal ${result.journalEntryId})`);
    }
  }

  private async syncRejectionToEntity(
    approvableType: string,
    approvableId: number,
    reason: string,
    rejectedBy: string,
  ): Promise<void> {
    try {
      const entityMap: Record<string, { table: string; statusField: string; rejectedStatus: string; reasonField?: string }> = {
        expense_requests: { table: 'expense_requests', statusField: 'status', rejectedStatus: 'rejected', reasonField: 'rejectionReason' },
        sales_orders: { table: 'sales_orders', statusField: 'status', rejectedStatus: 'rejected', reasonField: 'cancellationReason' },
        sales_invoices: { table: 'sales_invoices', statusField: 'status', rejectedStatus: 'rejected' },
        purchase_requisitions: { table: 'purchase_requisitions', statusField: 'status', rejectedStatus: 'rejected', reasonField: 'rejectionReason' },
        purchase_orders: { table: 'purchase_orders', statusField: 'status', rejectedStatus: 'rejected', reasonField: 'rejectionReason' },
        supplier_payments: { table: 'supplier_payments', statusField: 'status', rejectedStatus: 'rejected' },
        journal_entries: { table: 'journal_entries', statusField: 'status', rejectedStatus: 'rejected' },
        bank_transfers: { table: 'bank_transfers', statusField: 'status', rejectedStatus: 'rejected' },
        customer_receipts: { table: 'customer_receipts', statusField: 'status', rejectedStatus: 'REJECTED' },
        loading_orders: { table: 'loading_orders', statusField: 'status', rejectedStatus: 'rejected', reasonField: 'notes' },
      };

      const entity = entityMap[approvableType];
      if (!entity) {
        this.logger.debug(`No entity mapping for approvableType: ${approvableType}`);
        return;
      }

      const updateFields = [`"${entity.statusField}" = $1`, `"updatedAt" = NOW()`];
      const params: (string | number)[] = [entity.rejectedStatus];
      let idx = 2;

      if (entity.reasonField) {
        updateFields.push(`"${entity.reasonField}" = $${idx}`);
        params.push(`${reason} (Rejected by ${rejectedBy})`);
        idx++;
      }

      params.push(approvableId);

      await this.tenantPrisma.query(
        `UPDATE ${entity.table} SET ${updateFields.join(', ')} WHERE id = $${idx}`,
        params,
      );

      // Notify the original requester with rejection reason
      const approvalStatus = await this.tenantPrisma.queryOne<{ creatorId: number; companyId: number }>(
        `SELECT "creatorId", "companyId" FROM process_approval_statuses
         WHERE "approvableType" = $1 AND "approvableId" = $2 LIMIT 1`,
        [approvableType, approvableId],
      );

      if (approvalStatus?.creatorId) {
        const label = approvableType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/s$/, '');
        const urlMap: Record<string, string> = {
          expense_requests: '/accounts/expense-requests',
          sales_orders: '/sales/orders',
          sales_invoices: '/sales/invoices',
          credit_notes: '/receivables/credit-notes',
          purchase_requisitions: '/purchase/requisitions',
          purchase_orders: '/purchase/orders',
          purchase_invoices: '/purchase/invoices',
          customer_receipts: '/receivables/receipts',
          StockMovement: '/inventory/stock-movements',
          supplier_payments: '/payables/payments',
          bank_transfers: '/accounts/bank-transfers',
          loading_orders: '/sales/loading-orders',
        };
        const baseUrl = urlMap[approvableType] || '/core/approvals';

        // Clear previous approval notifications for this entity
        await this.tenantPrisma.query(
          `DELETE FROM notifications WHERE type = 'approval' AND "companyId" = $1 AND (data->>'url' LIKE $2 OR data->>'url' LIKE $3)`,
          [approvalStatus.companyId, `%view=${approvableId}`, `%/${approvableId}`],
        );

        // Create rejection notification for the requester
        // Use ?view= format so the entity list page opens with detail viewer
        await this.tenantPrisma.query(
          `INSERT INTO notifications (id, type, "notifiableType", "notifiableId", data, "companyId", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), 'rejection', 'User', $1, $2::jsonb, $3, NOW(), NOW())`,
          [
            approvalStatus.creatorId,
            JSON.stringify({
              title: `${label} Rejected`,
              message: `Your ${label.toLowerCase()} #${approvableId} was rejected by ${rejectedBy}. Reason: ${reason}`,
              url: `${baseUrl}?view=${approvableId}`,
            }),
            approvalStatus.companyId,
          ],
        );
      }

      this.logger.log(`Rejection synced: ${approvableType} #${approvableId} → ${entity.rejectedStatus} (by ${rejectedBy})`);
    } catch (err: unknown) {
      this.logger.warn(`Failed to sync rejection to entity: ${(err as Error).message}`);
    }
  }

  /**
   * Create notifications for all users who can approve a given flow step.
   * Finds users by roleId or approverIds and creates one notification per user.
   */
  async notifyApproversForStep(
    flowStep: Record<string, unknown>,
    approvableType: string,
    approvableId: number,
    companyId: number,
    stepName: string,
  ): Promise<void> {
    try {
      // Clear previous approval notifications for this same entity
      // so users don't see stale "awaiting step X" after it already advanced
      await this.tenantPrisma.query(
        `DELETE FROM notifications
         WHERE type = 'approval' AND "companyId" = $1
           AND (data->>'url' LIKE $2 OR data->>'url' LIKE $3)`,
        [companyId, `%view=${approvableId}`, `%/${approvableId}`],
      );

      const userIds = new Set<number>();

      // 1. Find users by roleId (user_roles table)
      if (flowStep.roleId) {
        const roleUsers = await this.tenantPrisma.query<{ userId: number }>(
          `SELECT ur."userId" FROM user_roles ur
           WHERE ur."roleId" = $1`,
          [flowStep.roleId],
        );
        for (const u of roleUsers) userIds.add(u.userId);
      }

      // 2. Find users by approverIds (role-based)
      const approverType = flowStep.approverType as string | null;
      const rawApproverIds = flowStep.approverIds;
      const approverIds: number[] = rawApproverIds
        ? (typeof rawApproverIds === 'string' ? JSON.parse(rawApproverIds) : (rawApproverIds as number[]))
        : [];

      if (approverIds.length > 0) {
        if (approverType === 'role' || approverType === 'any_of_role') {
          const roleUsers = await this.tenantPrisma.query<{ userId: number }>(
            `SELECT ur."userId" FROM user_roles ur
             WHERE ur."roleId" = ANY($1::int[])`,
            [approverIds],
          );
          for (const u of roleUsers) userIds.add(u.userId);
        } else if (approverType === 'employee') {
          const empUsers = await this.tenantPrisma.query<{ userId: number }>(
            `SELECT "userId" FROM employees WHERE id = ANY($1::int[]) AND "userId" IS NOT NULL`,
            [approverIds],
          );
          for (const u of empUsers) userIds.add(u.userId);
        }
      }

      if (userIds.size === 0) return;

      // Build a friendly label from the approvableType (e.g. expense_requests → Expense Request)
      const label = approvableType
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .replace(/s$/, '');

      // Determine URL based on approvable type — link to entity detail page
      const urlMap: Record<string, string> = {
        expense_requests: '/accounts/expense-requests',
        sales_orders: '/sales/orders',
        sales_invoices: '/sales/invoices',
        credit_notes: '/receivables/credit-notes',
        purchase_requisitions: '/purchase/requisitions',
        purchase_orders: '/purchase/orders',
        purchase_invoices: '/purchase/invoices',
        customer_receipts: '/receivables/receipts',
        StockMovement: '/inventory/stock-movements',
        supplier_payments: '/payables/payments',
        bank_transfers: '/accounts/bank-transfers',
        internal_stock_requests: '/inventory/stock-requests',
        inventory_adjustments: '/inventory/stock-movements',
        inventory_transfers: '/inventory/stock-movements',
        journal_entries: '/accounts/journal-entries',
        leave_requests: '/hrpayroll/leave-requests',
        employee_loans: '/hrpayroll/loans',
        payroll_runs: '/hrpayroll/payroll-runs',
      };
      const baseUrl = urlMap[approvableType] || '/core/approvals';

      // Look up record details for a rich notification message
      const details = await this.getRecordDetails(approvableType, approvableId);
      const detailStr = details ? ` — ${details}` : '';

      const notificationData = JSON.stringify({
        title: `${label} Pending Approval`,
        message: `${label} #${approvableId}${detailStr} requires your approval at step "${stepName}".`,
        url: `${baseUrl}?view=${approvableId}`,
      });

      // Batch insert notifications for all eligible users
      const values: string[] = [];
      const params: (string | number)[] = ['approval', notificationData, companyId];
      let idx = 4;
      for (const uid of userIds) {
        values.push(`(gen_random_uuid(), $1, 'User', $${idx}, $2::jsonb, $3, NOW(), NOW())`);
        params.push(uid);
        idx++;
      }

      await this.tenantPrisma.query(
        `INSERT INTO notifications (id, type, "notifiableType", "notifiableId", data, "companyId", "createdAt", "updatedAt")
         VALUES ${values.join(', ')}`,
        params,
      );

      this.logger.log(
        `Created ${userIds.size} approval notifications for ${approvableType}:${approvableId} step "${stepName}"`,
      );
    } catch (err: unknown) {
      // Non-blocking — notification failure should not break the approval flow
      this.logger.warn(
        `Failed to create approval notifications: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Look up record details for rich notification messages.
   * Returns a formatted string like "₦15,000,000 — A.A. STANDARD VENTURES"
   */
  private async getRecordDetails(approvableType: string, approvableId: number): Promise<string | null> {
    try {
      const fmt = (n: unknown) => `₦${Number(n || 0).toLocaleString()}`;

      switch (approvableType) {
        case 'supplier_payments': {
          const r = await this.tenantPrisma.queryOne<Record<string, unknown>>(
            `SELECT p."paymentNumber", p."totalAmount", s.name as "supplierName"
             FROM pay_payments p LEFT JOIN suppliers s ON s.id = p."supplierId"
             WHERE p.id = $1`, [approvableId],
          );
          return r ? `${r.paymentNumber} (${fmt(r.totalAmount)}) — ${r.supplierName || 'Unknown Supplier'}` : null;
        }
        case 'bank_transfers': {
          const r = await this.tenantPrisma.queryOne<Record<string, unknown>>(
            `SELECT bt."transferNumber", bt.amount, bt."bankCharges", bt."transferType",
                    b1.name as "fromBank", b2.name as "toBank"
             FROM bank_transfers bt
             LEFT JOIN banks b1 ON b1.id = bt."fromBankId"
             LEFT JOIN banks b2 ON b2.id = bt."toBankId"
             WHERE bt.id = $1`, [approvableId],
          );
          if (!r) return null;
          const total = Number(r.amount || 0) + Number(r.bankCharges || 0);
          return `${r.transferNumber} (${fmt(total)}) — ${r.fromBank} → ${r.toBank}${r.transferType === 'foreign' ? ' (Foreign)' : ''}`;
        }
        case 'purchase_requisitions': {
          const r = await this.tenantPrisma.queryOne<Record<string, unknown>>(
            `SELECT pr."requisitionNumber", pr."estimatedTotal",
                    CONCAT(e."firstName", ' ', e."lastName") as "requesterName"
             FROM purchase_requisitions pr
             LEFT JOIN employees e ON e.id = pr."requesterId"
             WHERE pr.id = $1`, [approvableId],
          );
          return r ? `${r.requisitionNumber} (${fmt(r.estimatedTotal)}) — ${r.requesterName || 'Unknown'}` : null;
        }
        case 'purchase_orders': {
          const r = await this.tenantPrisma.queryOne<Record<string, unknown>>(
            `SELECT po."orderNumber", po."totalAmount", s.name as "supplierName"
             FROM purchase_orders po LEFT JOIN suppliers s ON s.id = po."supplierId"
             WHERE po.id = $1`, [approvableId],
          );
          return r ? `${r.orderNumber} (${fmt(r.totalAmount)}) — ${r.supplierName || 'Unknown Supplier'}` : null;
        }
        case 'purchase_invoices': {
          const r = await this.tenantPrisma.queryOne<Record<string, unknown>>(
            `SELECT pi."invoiceNumber", pi."totalAmount", s.name as "supplierName"
             FROM purchase_invoices pi LEFT JOIN suppliers s ON s.id = pi."supplierId"
             WHERE pi.id = $1`, [approvableId],
          );
          return r ? `${r.invoiceNumber} (${fmt(r.totalAmount)}) — ${r.supplierName || 'Unknown Supplier'}` : null;
        }
        case 'sales_orders': {
          const r = await this.tenantPrisma.queryOne<Record<string, unknown>>(
            `SELECT so."orderNumber", so."totalAmount", c.name as "customerName"
             FROM sales_orders so LEFT JOIN customers c ON c.id = so."customerId"
             WHERE so.id = $1`, [approvableId],
          );
          return r ? `${r.orderNumber} (${fmt(r.totalAmount)}) — ${r.customerName || 'Unknown Customer'}` : null;
        }
        case 'sales_invoices': {
          const r = await this.tenantPrisma.queryOne<Record<string, unknown>>(
            `SELECT si."invoiceNumber", si."totalAmount", c.name as "customerName"
             FROM sales_invoices si LEFT JOIN customers c ON c.id = si."customerId"
             WHERE si.id = $1`, [approvableId],
          );
          return r ? `${r.invoiceNumber} (${fmt(r.totalAmount)}) — ${r.customerName || 'Unknown Customer'}` : null;
        }
        case 'expense_requests': {
          const r = await this.tenantPrisma.queryOne<Record<string, unknown>>(
            `SELECT er."requestNumber", er."totalAmount",
                    CONCAT(e."firstName", ' ', e."lastName") as "requesterName"
             FROM expense_requests er
             LEFT JOIN employees e ON e.id = er."requesterId"
             WHERE er.id = $1`, [approvableId],
          );
          return r ? `${r.requestNumber} (${fmt(r.totalAmount)}) — ${r.requesterName || 'Unknown'}` : null;
        }
        case 'customer_receipts': {
          const r = await this.tenantPrisma.queryOne<Record<string, unknown>>(
            `SELECT cr."receiptNumber", cr."totalAmount", c.name as "customerName"
             FROM customer_receipts cr LEFT JOIN customers c ON c.id = cr."customerId"
             WHERE cr.id = $1`, [approvableId],
          );
          return r ? `${r.receiptNumber} (${fmt(r.totalAmount)}) — ${r.customerName || 'Unknown Customer'}` : null;
        }
        case 'internal_stock_requests': {
          const r = await this.tenantPrisma.queryOne<Record<string, unknown>>(
            `SELECT isr."requestNumber", isr.priority, isr.purpose,
                    COALESCE(u.name, u.email) AS "requesterName",
                    (SELECT COUNT(*) FROM inv_isr_lines WHERE "internalStockRequestId" = isr.id)::int AS "linesCount"
               FROM inv_isr_requests isr
               LEFT JOIN users u ON u.id = isr."requesterId"
              WHERE isr.id = $1`, [approvableId],
          );
          return r ? `${r.requestNumber} (${r.linesCount} item${r.linesCount === 1 ? '' : 's'}) — ${r.requesterName || 'Unknown'}` : null;
        }
        default:
          return null;
      }
    } catch (err) {
      this.logger.warn(`Failed to get record details for ${approvableType}:${approvableId}: ${(err as Error).message}`);
      return null;
    }
  }
}
