import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { toMoney } from '../../../common/utils/decimal';
import {
  CreateProcessApprovalFlowDto,
  UpdateProcessApprovalFlowDto,
  ProcessApprovalFlowQueryDto,
  ProcessApprovalFlowResponseDto,
  ProcessApprovalFlowListResponseDto,
  CreateProcessApprovalFlowStepDto,
  UpdateProcessApprovalFlowStepDto,
  ProcessApprovalFlowStepResponseDto,
  ApprovalFlowStatsResponseDto,
} from '../dto/process-approval-flow.dto';

@Injectable()
export class ProcessApprovalFlowService {
  private readonly logger = new Logger(ProcessApprovalFlowService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  // ============================================================================
  // APPROVAL FLOW CRUD
  // ============================================================================

  /**
   * Create a new approval flow
   */
  async createFlow(
    dto: CreateProcessApprovalFlowDto,
    createdById?: number,
    userCompanyId?: number,
  ): Promise<ProcessApprovalFlowResponseDto> {
    // Map frontend alias: entityType → approvableType
    const approvableType = dto.approvableType || dto.entityType || '';

    const flow = await this.tenantPrisma.insert('process_approval_flows', {
      name: dto.name,
      approvableType,
      entitySlug: dto.entitySlug || null,
      description: dto.description,
      conditions: dto.conditions ? JSON.stringify(dto.conditions) : null,
      notificationSettings: dto.notificationSettings
        ? JSON.stringify(dto.notificationSettings)
        : null,
      isActive: dto.isActive ?? true,
      isDefault: dto.isDefault ?? false,
      priority: dto.priority ?? 10,
      autoSubmit: dto.autoSubmit ?? false,
      parallelApproval: dto.parallelApproval ?? false,
      companyId: dto.companyId || userCompanyId,
      createdById,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.mapFlowToResponse(flow);
  }

  /**
   * Get all approval flows with pagination and filters
   */
  async findAllFlows(
    query: ProcessApprovalFlowQueryDto,
  ): Promise<ProcessApprovalFlowListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT f.*,
             (SELECT COUNT(*) FROM process_approval_flow_steps s
              WHERE s."processApprovalFlowId" = f.id AND s."isActive" = true) as "stepCount"
      FROM process_approval_flows f
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters (entityType is frontend alias for approvableType)
    const filterType = query.approvableType || query.entityType;
    if (filterType) {
      sql += ` AND f."approvableType" = $${paramIndex++}`;
      params.push(filterType);
    }

    if (query.isActive !== undefined) {
      sql += ` AND f."isActive" = $${paramIndex++}`;
      params.push(query.isActive);
    }

    if (query.companyId) {
      sql += ` AND f."companyId" = $${paramIndex++}`;
      params.push(query.companyId);
    }

    if (query.search) {
      sql += ` AND (f.name ILIKE $${paramIndex} OR f."approvableType" ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY f."createdAt" DESC`;
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const flows = await this.tenantPrisma.query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as count FROM process_approval_flows f WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (filterType) {
      countSql += ` AND f."approvableType" = $${countParamIndex++}`;
      countParams.push(filterType);
    }

    if (query.isActive !== undefined) {
      countSql += ` AND f."isActive" = $${countParamIndex++}`;
      countParams.push(query.isActive);
    }

    if (query.companyId) {
      countSql += ` AND f."companyId" = $${countParamIndex++}`;
      countParams.push(query.companyId);
    }

    if (query.search) {
      countSql += ` AND (f.name ILIKE $${countParamIndex} OR f."approvableType" ILIKE $${countParamIndex})`;
      countParams.push(`%${query.search}%`);
    }

    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(
      countSql,
      countParams,
    );
    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: flows.map((f) => this.mapFlowToResponse(f)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single approval flow by ID
   */
  async findOneFlow(id: number, includeSteps = true): Promise<ProcessApprovalFlowResponseDto> {
    const flow = await this.tenantPrisma.queryOne(
      `
      SELECT f.*
      FROM process_approval_flows f
      WHERE f.id = $1
      `,
      [id],
    );

    if (!flow) {
      throw new NotFoundException('Approval flow not found');
    }

    const response = this.mapFlowToResponse(flow);

    // Include steps if requested
    if (includeSteps) {
      const steps = await this.findStepsByFlowId(id);
      response.steps = steps;
    }

    return response;
  }

  /**
   * Update an approval flow
   */
  async updateFlow(
    id: number,
    dto: UpdateProcessApprovalFlowDto,
  ): Promise<ProcessApprovalFlowResponseDto> {
    const existing = await this.tenantPrisma.findById('process_approval_flows', id);
    if (!existing) {
      throw new NotFoundException('Approval flow not found');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    // Map frontend alias: entityType → approvableType
    if (dto.approvableType !== undefined) updateData.approvableType = dto.approvableType;
    else if (dto.entityType !== undefined) updateData.approvableType = dto.entityType;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.conditions !== undefined)
      updateData.conditions = dto.conditions ? JSON.stringify(dto.conditions) : null;
    if (dto.notificationSettings !== undefined)
      updateData.notificationSettings = dto.notificationSettings
        ? JSON.stringify(dto.notificationSettings)
        : null;
    if (dto.entitySlug !== undefined) updateData.entitySlug = dto.entitySlug;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.isDefault !== undefined) updateData.isDefault = dto.isDefault;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.autoSubmit !== undefined) updateData.autoSubmit = dto.autoSubmit;
    if (dto.parallelApproval !== undefined) updateData.parallelApproval = dto.parallelApproval;
    if (dto.companyId !== undefined) updateData.companyId = dto.companyId;

    if (Object.keys(updateData).length > 0) {
      await this.tenantPrisma.update('process_approval_flows', id, updateData);
    }

    return this.findOneFlow(id);
  }

  /**
   * Delete an approval flow
   */
  async removeFlow(id: number): Promise<void> {
    // Check if flow has active approvals
    const hasActiveApprovals = await this.tenantPrisma.queryOne<{ count: string }>(
      `
      SELECT COUNT(*) as count
      FROM process_approval_statuses
      WHERE id IN (
        SELECT DISTINCT pas.id
        FROM process_approval_statuses pas
        JOIN process_approvals pa ON pa."approvableType" = pas."approvableType"
          AND pa."approvableId" = pas."approvableId"
        JOIN process_approval_flow_steps pafs ON pa."processApprovalFlowStepId" = pafs.id
        WHERE pafs."processApprovalFlowId" = $1
          AND pas.status IN ('PENDING', 'WAITING')
      )
      `,
      [id],
    );

    if (parseInt(hasActiveApprovals?.count || '0', 10) > 0) {
      throw new BadRequestException(
        'Cannot delete approval flow with active approvals in progress',
      );
    }

    const result = await this.tenantPrisma.delete('process_approval_flows', id);
    if (!result) {
      throw new NotFoundException('Approval flow not found');
    }
  }

  /**
   * Get approval flow for a specific process type and company
   */
  async getFlowForProcess(
    processType: string,
    companyId: number,
  ): Promise<ProcessApprovalFlowResponseDto | null> {
    const flow = await this.tenantPrisma.queryOne(
      `
      SELECT f.*
      FROM process_approval_flows f
      WHERE f."approvableType" = $1
        AND f."companyId" = $2
        AND f."isActive" = true
      ORDER BY f."createdAt" DESC
      LIMIT 1
      `,
      [processType, companyId],
    );

    if (!flow) {
      return null;
    }

    const response = this.mapFlowToResponse(flow);

    // Include steps
    const steps = await this.findStepsByFlowId(flow.id);
    response.steps = steps;

    return response;
  }

  // ============================================================================
  // APPROVAL FLOW STEP CRUD
  // ============================================================================

  /**
   * Create a new approval flow step
   */
  async createStep(dto: CreateProcessApprovalFlowStepDto, userCompanyId?: number): Promise<ProcessApprovalFlowStepResponseDto> {
    // Verify flow exists
    const flowId = dto.processApprovalFlowId!;
    const flow = await this.tenantPrisma.findById('process_approval_flows', flowId);
    if (!flow) {
      throw new NotFoundException('Approval flow not found');
    }

    // Map frontend aliases: approverIds → roleId + employees, stepNumber → stepOrder
    const approverIds = dto.approverIds || [];
    const approverType = dto.approverType || 'role';
    // Only treat approverIds[0] as a roleId when the approver type is role-based.
    // For employee/user types, approverIds contains user IDs — never store as roleId.
    const roleId = dto.roleId || (approverType === 'role' && approverIds.length ? approverIds[0] : null);
    const employees = dto.employees || (approverType !== 'role' && approverIds.length ? { ids: approverIds } : (approverIds.length > 1 ? { ids: approverIds } : null));
    const stepOrder = dto.stepOrder ?? dto.stepNumber ?? dto.order ?? 0;
    const escalationRoleId = dto.escalationRoleId || dto.escalationUserId;

    const step = await this.tenantPrisma.insert('process_approval_flow_steps', {
      processApprovalFlowId: flowId,
      name: dto.name,
      description: dto.description || null,
      roleId: roleId || null,
      approverType: dto.approverType || 'role',
      approverIds: approverIds.length ? JSON.stringify(approverIds) : null,
      approvalMode: dto.approvalMode || 'any',
      permissions: dto.permissions ? JSON.stringify(dto.permissions) : null,
      employees: employees ? JSON.stringify(employees) : null,
      escalationEmployees: dto.escalationEmployees
        ? JSON.stringify(dto.escalationEmployees)
        : null,
      order: dto.order ?? dto.stepNumber,
      stepOrder,
      action: dto.action || 'APPROVE',
      conditions: dto.conditions ? JSON.stringify(dto.conditions) : null,
      isRequired: dto.isRequired ?? true,
      timeoutHours: dto.timeoutHours,
      escalationRoleId,
      escalationUserId: dto.escalationUserId || null,
      isActive: dto.isActive ?? true,
      overrideAllowed: dto.overrideAllowed ?? false,
      overrideApproverType: dto.overrideApproverType || null,
      overrideApproverIds: dto.overrideApproverIds?.length ? JSON.stringify(dto.overrideApproverIds) : null,
      overrideNoteMinLength: dto.overrideNoteMinLength ?? 30,
      overrideNotifySkipped: dto.overrideNotifySkipped ?? true,
      branchScope: dto.branchScope || 'all',
      branchId: dto.branchScope === 'specific' ? (dto.branchId || null) : null,
      isLocked: dto.isLocked ?? false,
      isFinalStep: dto.isFinalStep ?? false,
      companyId: dto.companyId || userCompanyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.mapStepToResponse(step);
  }

  /**
   * Get all steps for an approval flow
   */
  async findStepsByFlowId(flowId: number): Promise<ProcessApprovalFlowStepResponseDto[]> {
    const steps = await this.tenantPrisma.query(
      `
      SELECT s.*, r.name as "roleName", r.description as "roleDescription",
             b.name as "branchName"
      FROM process_approval_flow_steps s
      LEFT JOIN roles r ON s."roleId" = r.id
      LEFT JOIN branches b ON b.id = s."branchId"
      WHERE s."processApprovalFlowId" = $1
      ORDER BY s."stepOrder" ASC, s."order" ASC
      `,
      [flowId],
    );

    return steps.map((s) => this.mapStepToResponse(s));
  }

  /**
   * Get a single approval flow step by ID
   */
  async findOneStep(id: number): Promise<ProcessApprovalFlowStepResponseDto> {
    const step = await this.tenantPrisma.queryOne(
      `
      SELECT s.*, r.name as "roleName", r.description as "roleDescription",
             b.name as "branchName"
      FROM process_approval_flow_steps s
      LEFT JOIN roles r ON s."roleId" = r.id
      LEFT JOIN branches b ON b.id = s."branchId"
      WHERE s.id = $1
      `,
      [id],
    );

    if (!step) {
      throw new NotFoundException('Approval flow step not found');
    }

    return this.mapStepToResponse(step);
  }

  /**
   * Update an approval flow step
   */
  async updateStep(
    flowId: number,
    stepId: number,
    dto: UpdateProcessApprovalFlowStepDto,
  ): Promise<ProcessApprovalFlowStepResponseDto> {
    const existing = await this.tenantPrisma.queryOne(
      `SELECT * FROM process_approval_flow_steps WHERE id = $1 AND "processApprovalFlowId" = $2`,
      [stepId, flowId],
    );

    if (!existing) {
      throw new NotFoundException('Approval flow step not found');
    }

    // Locked steps: only approverType, approvalMode, approverIds, branchScope, branchId are editable
    if (existing.isLocked) {
      const allowedKeys: Array<keyof typeof dto> = ['approverType', 'approvalMode', 'approverIds', 'branchScope', 'branchId'];
      const attemptedForbidden = Object.keys(dto).filter(
        (k) => !allowedKeys.includes(k as keyof typeof dto) && (dto as Record<string, unknown>)[k] !== undefined,
      );
      if (attemptedForbidden.some((k) => ['name', 'action', 'description', 'isRequired', 'isActive', 'timeoutHours', 'overrideAllowed', 'isLocked', 'isFinalStep'].includes(k))) {
        throw new ForbiddenException('This step is locked. Only approver type, approval mode, and branch scope can be modified.');
      }

      // Account/Finance Coding and Payment Process steps: only 'role' or 'employee' approverType allowed
      if ((existing.stepType === 'accountant' || existing.stepType === 'payment') && dto.approverType) {
        if (!['role', 'employee'].includes(dto.approverType)) {
          throw new ForbiddenException(
            `The "${existing.name}" step only supports "role" or "employee" approver types.`,
          );
        }
      }
    }

    const updateData: Record<string, any> = {};
    if (!existing.isLocked && dto.name !== undefined) updateData.name = dto.name;
    const locked = !!existing.isLocked;
    if (!locked && dto.description !== undefined) updateData.description = dto.description;
    // Map frontend aliases
    if (dto.approverType !== undefined) updateData.approverType = dto.approverType;
    if (dto.approvalMode !== undefined) updateData.approvalMode = dto.approvalMode;
    if (dto.approverIds !== undefined) {
      const updatedType = dto.approverType ?? existing.approverType ?? 'role';
      updateData.approverIds = dto.approverIds.length ? JSON.stringify(dto.approverIds) : null;
      if (updatedType === 'role') {
        updateData.roleId = dto.approverIds.length ? dto.approverIds[0] : existing.roleId;
      } else {
        updateData.roleId = null;
        updateData.employees = dto.approverIds.length ? JSON.stringify({ ids: dto.approverIds }) : null;
      }
    } else {
      if (!locked && dto.roleId !== undefined) updateData.roleId = dto.roleId;
      if (!locked && dto.employees !== undefined) {
        updateData.employees = dto.employees ? JSON.stringify(dto.employees) : null;
      }
    }
    if (!locked && dto.permissions !== undefined)
      updateData.permissions = dto.permissions ? JSON.stringify(dto.permissions) : null;
    if (!locked && dto.escalationEmployees !== undefined)
      updateData.escalationEmployees = dto.escalationEmployees
        ? JSON.stringify(dto.escalationEmployees)
        : null;
    // stepOrder can change even on locked steps (when other steps are added/removed/reordered)
    if (dto.order !== undefined) updateData.order = dto.order;
    if (dto.stepOrder !== undefined) updateData.stepOrder = dto.stepOrder;
    else if (dto.stepNumber !== undefined) updateData.stepOrder = dto.stepNumber;
    if (!locked && dto.action !== undefined) updateData.action = dto.action;
    if (!locked && dto.conditions !== undefined)
      updateData.conditions = dto.conditions ? JSON.stringify(dto.conditions) : null;
    if (!locked && dto.isRequired !== undefined) updateData.isRequired = dto.isRequired;
    if (!locked && dto.timeoutHours !== undefined) updateData.timeoutHours = dto.timeoutHours;
    if (!locked && dto.escalationRoleId !== undefined) updateData.escalationRoleId = dto.escalationRoleId;
    if (!locked && dto.escalationUserId !== undefined) updateData.escalationUserId = dto.escalationUserId;
    if (!locked && dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (!locked && dto.overrideAllowed !== undefined) updateData.overrideAllowed = dto.overrideAllowed;
    if (!locked && dto.overrideApproverType !== undefined) updateData.overrideApproverType = dto.overrideApproverType || null;
    if (!locked && dto.overrideApproverIds !== undefined)
      updateData.overrideApproverIds = dto.overrideApproverIds?.length ? JSON.stringify(dto.overrideApproverIds) : null;
    if (!locked && dto.overrideNoteMinLength !== undefined) updateData.overrideNoteMinLength = dto.overrideNoteMinLength;
    if (!locked && dto.overrideNotifySkipped !== undefined) updateData.overrideNotifySkipped = dto.overrideNotifySkipped;
    if (dto.branchScope !== undefined) {
      updateData.branchScope = dto.branchScope || 'all';
      updateData.branchId = dto.branchScope === 'specific' ? (dto.branchId || null) : null;
    } else if (dto.branchId !== undefined) {
      updateData.branchId = dto.branchId || null;
    }
    if (dto.companyId !== undefined) updateData.companyId = dto.companyId;

    if (Object.keys(updateData).length > 0) {
      await this.tenantPrisma.update('process_approval_flow_steps', stepId, updateData);
    }

    return this.findOneStep(stepId);
  }

  /**
   * Delete an approval flow step
   */
  async removeStep(flowId: number, stepId: number): Promise<void> {
    const existing = await this.tenantPrisma.queryOne(
      `SELECT * FROM process_approval_flow_steps WHERE id = $1 AND "processApprovalFlowId" = $2`,
      [stepId, flowId],
    );

    if (!existing) {
      throw new NotFoundException('Approval flow step not found');
    }

    if (existing.isLocked || existing.isFinalStep) {
      // Allow deleting a duplicate final step (if another isFinalStep exists for this flow)
      if (existing.isFinalStep) {
        const otherFinal = await this.tenantPrisma.queryOne<{ id: number }>(
          `SELECT id FROM process_approval_flow_steps
           WHERE "processApprovalFlowId" = $1 AND "isFinalStep" = true AND id != $2 AND "deletedAt" IS NULL
           LIMIT 1`,
          [flowId, stepId],
        );
        if (!otherFinal) {
          throw new ForbiddenException('This step is protected and cannot be deleted.');
        }
        // Duplicate exists — allow deletion of this one
      } else {
        throw new ForbiddenException('This step is protected and cannot be deleted.');
      }
    }

    await this.tenantPrisma.delete('process_approval_flow_steps', stepId);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Map database row to approval flow response DTO
   */
  private mapFlowToResponse(flow: any): ProcessApprovalFlowResponseDto {
    return {
      id: flow.id,
      name: flow.name,
      approvableType: flow.approvableType,
      entityType: flow.approvableType, // Frontend alias
      entitySlug: flow.entitySlug || undefined,
      description: flow.description,
      conditions: flow.conditions
        ? (typeof flow.conditions === 'string' ? JSON.parse(flow.conditions) : flow.conditions)
        : undefined,
      notificationSettings: flow.notificationSettings
        ? (typeof flow.notificationSettings === 'string' ? JSON.parse(flow.notificationSettings) : flow.notificationSettings)
        : undefined,
      isActive: flow.isActive,
      isDefault: flow.isDefault ?? false,
      priority: flow.priority ?? 0,
      autoSubmit: flow.autoSubmit,
      parallelApproval: flow.parallelApproval,
      companyId: flow.companyId,
      createdById: flow.createdById,
      stepCount: flow.stepCount ? parseInt(flow.stepCount, 10) : undefined,
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
    };
  }

  /**
   * Map database row to approval flow step response DTO
   */
  private mapStepToResponse(step: any): ProcessApprovalFlowStepResponseDto {
    const parsedEmployees = step.employees
      ? (typeof step.employees === 'string' ? JSON.parse(step.employees) : step.employees)
      : undefined;

    // Derive frontend-friendly approverIds: prefer new DB column, fall back to roleId + employees
    const parsedApproverIds = step.approverIds
      ? (typeof step.approverIds === 'string' ? JSON.parse(step.approverIds) : step.approverIds)
      : null;
    let approverIds: number[] = [];
    if (parsedApproverIds && Array.isArray(parsedApproverIds)) {
      approverIds = parsedApproverIds;
    } else {
      if (step.roleId) approverIds.push(step.roleId);
      if (parsedEmployees?.ids) approverIds.push(...parsedEmployees.ids.filter((id: number) => id !== step.roleId));
    }

    const response: ProcessApprovalFlowStepResponseDto = {
      id: step.id,
      processApprovalFlowId: step.processApprovalFlowId,
      flowId: step.processApprovalFlowId, // Frontend alias
      name: step.name,
      description: step.description || undefined,
      roleId: step.roleId,
      approverType: step.approverType || (step.roleId ? 'role' : 'employee'), // Frontend alias
      approverIds: approverIds.length ? approverIds : undefined,
      approvalMode: step.approvalMode || 'any', // Frontend alias
      permissions: step.permissions
        ? (typeof step.permissions === 'string' ? JSON.parse(step.permissions) : step.permissions)
        : undefined,
      employees: parsedEmployees,
      escalationEmployees: step.escalationEmployees
        ? (typeof step.escalationEmployees === 'string' ? JSON.parse(step.escalationEmployees) : step.escalationEmployees)
        : undefined,
      order: step.order,
      stepOrder: step.stepOrder,
      stepNumber: step.stepOrder, // Frontend alias
      action: step.action,
      conditions: step.conditions
        ? (typeof step.conditions === 'string' ? JSON.parse(step.conditions) : step.conditions)
        : undefined,
      isRequired: step.isRequired,
      timeoutHours: step.timeoutHours,
      escalationRoleId: step.escalationRoleId,
      escalationUserId: step.escalationUserId || step.escalationRoleId,
      isActive: step.isActive,
      companyId: step.companyId,
      tenantId: step.tenantId,
      // Override authority
      overrideAllowed: step.overrideAllowed ?? false,
      overrideApproverType: step.overrideApproverType || undefined,
      overrideApproverIds: step.overrideApproverIds
        ? (typeof step.overrideApproverIds === 'string' ? JSON.parse(step.overrideApproverIds) : step.overrideApproverIds)
        : undefined,
      overrideNoteMinLength: step.overrideNoteMinLength ?? 30,
      overrideNotifySkipped: step.overrideNotifySkipped ?? true,
      // Branch scope
      branchScope: step.branchScope || 'all',
      branchId: step.branchId || undefined,
      branchName: step.branchName || undefined,
      // Protected flags
      isLocked: step.isLocked ?? false,
      isFinalStep: step.isFinalStep ?? false,
      stepType: step.stepType || 'approve',
      createdAt: step.createdAt,
      updatedAt: step.updatedAt,
    };

    // Include role details if available
    if (step.roleName) {
      response.role = {
        id: step.roleId,
        name: step.roleName,
        description: step.roleDescription,
      };
    }

    // Include override role details if available
    if (step.overrideRoleName) {
      response.overrideRole = {
        id: step.overrideRoleId,
        name: step.overrideRoleName,
      };
    }

    return response;
  }

  // ============================================================================
  // ADDITIONAL METHODS (Stats, Duplicate, Set Default, Reorder)
  // ============================================================================

  async getStats(): Promise<ApprovalFlowStatsResponseDto> {
    const stats = await this.tenantPrisma.queryOne<{
      totalFlows: string;
      activeFlows: string;
      entityTypes: string;
      avgSteps: string;
    }>(`
      SELECT
        COUNT(*) as "totalFlows",
        COUNT(*) FILTER (WHERE "isActive" = true) as "activeFlows",
        COUNT(DISTINCT "approvableType") as "entityTypes",
        COALESCE(AVG(step_counts.cnt), 0) as "avgSteps"
      FROM process_approval_flows f
      LEFT JOIN (
        SELECT "processApprovalFlowId", COUNT(*) as cnt
        FROM process_approval_flow_steps
        WHERE "isActive" = true
        GROUP BY "processApprovalFlowId"
      ) step_counts ON step_counts."processApprovalFlowId" = f.id
    `);

    return {
      totalFlows: parseInt(stats?.totalFlows || '0', 10),
      activeFlows: parseInt(stats?.activeFlows || '0', 10),
      entityTypes: parseInt(stats?.entityTypes || '0', 10),
      avgStepsPerFlow: toMoney(stats?.avgSteps),
    };
  }

  async duplicateFlow(id: number, createdById?: number): Promise<ProcessApprovalFlowResponseDto> {
    const original = await this.findOneFlow(id, true);

    // Create a copy of the flow
    const newFlow = await this.tenantPrisma.insert('process_approval_flows', {
      name: `${original.name} (Copy)`,
      approvableType: original.approvableType,
      entitySlug: original.entitySlug || null,
      description: original.description,
      conditions: original.conditions ? JSON.stringify(original.conditions) : null,
      notificationSettings: original.notificationSettings
        ? JSON.stringify(original.notificationSettings)
        : null,
      isActive: false, // Start as inactive
      isDefault: false, // Copy should not be default
      priority: original.priority ?? 10,
      autoSubmit: original.autoSubmit,
      parallelApproval: original.parallelApproval,
      companyId: original.companyId,
      createdById,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Duplicate steps
    if (original.steps?.length) {
      for (const step of original.steps) {
        await this.tenantPrisma.insert('process_approval_flow_steps', {
          processApprovalFlowId: newFlow.id,
          name: step.name,
          roleId: step.roleId,
          permissions: step.permissions ? JSON.stringify(step.permissions) : null,
          employees: step.employees ? JSON.stringify(step.employees) : null,
          escalationEmployees: step.escalationEmployees
            ? JSON.stringify(step.escalationEmployees)
            : null,
          order: step.order,
          stepOrder: step.stepOrder,
          action: step.action,
          conditions: step.conditions ? JSON.stringify(step.conditions) : null,
          isRequired: step.isRequired,
          timeoutHours: step.timeoutHours,
          escalationRoleId: step.escalationRoleId,
          isActive: step.isActive,
          companyId: step.companyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return this.findOneFlow(newFlow.id, true);
  }

  async setDefaultFlow(id: number): Promise<ProcessApprovalFlowResponseDto> {
    const flow = await this.tenantPrisma.findById('process_approval_flows', id);
    if (!flow) {
      throw new NotFoundException('Approval flow not found');
    }

    // Unset other defaults for same approvableType and company
    await this.tenantPrisma.query(
      `UPDATE process_approval_flows SET "isDefault" = false
       WHERE "approvableType" = $1 AND "companyId" = $2 AND id != $3`,
      [flow.approvableType, flow.companyId, id],
    );

    // Set this flow as default
    await this.tenantPrisma.update('process_approval_flows', id, {
      isDefault: true,
    });

    return this.findOneFlow(id, true);
  }

  async reorderSteps(flowId: number, steps: { id: number; stepOrder: number }[]): Promise<ProcessApprovalFlowStepResponseDto[]> {
    // Verify flow exists
    const flow = await this.tenantPrisma.findById('process_approval_flows', flowId);
    if (!flow) {
      throw new NotFoundException('Approval flow not found');
    }

    // Validate protected step positions before persisting
    const existingSteps = await this.tenantPrisma.query<{ id: number; isLocked: boolean; isFinalStep: boolean }>(
      `SELECT id, "isLocked", "isFinalStep" FROM process_approval_flow_steps WHERE "processApprovalFlowId" = $1 AND "deletedAt" IS NULL`,
      [flowId],
    );
    const stepMeta: Record<number, { isLocked: boolean; isFinalStep: boolean }> = {};
    for (const s of existingSteps) stepMeta[s.id] = { isLocked: s.isLocked, isFinalStep: s.isFinalStep };

    const sorted = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
    const lastStepId = sorted[sorted.length - 1]?.id;

    for (const step of sorted) {
      const meta = stepMeta[step.id];
      if (!meta) continue;
      const isLast = step.id === lastStepId;
      if (meta.isFinalStep && !isLast) {
        throw new BadRequestException('The final step must always remain in the last position.');
      }
      if (meta.isLocked && !meta.isFinalStep && isLast) {
        throw new BadRequestException('A locked step (Account/Finance Coding) cannot be placed in the last position.');
      }
    }

    // Update each step's order
    for (const step of steps) {
      await this.tenantPrisma.update('process_approval_flow_steps', step.id, {
        stepOrder: step.stepOrder,
        order: step.stepOrder,
      });
    }

    return this.findStepsByFlowId(flowId);
  }
}
