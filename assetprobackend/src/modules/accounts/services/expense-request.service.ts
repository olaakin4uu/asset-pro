import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { ProcessApprovalService } from '../../core/services/process-approval.service';
import { isSuperAdmin } from '../../../common/utils/super-admin';
import { toMoney, mulMoney, subMoney } from '../../../common/utils/decimal';
import {
  CreateExpenseRequestDto,
  UpdateExpenseRequestDto,
  ApproveExpenseRequestDto,
  RejectExpenseRequestDto,
  PayExpenseRequestDto,
  ExpenseRequestQueryDto,
} from '../dto/expense-request.dto';

export interface ExpenseRequest {
  id: number;
  companyId: number;
  requestNumber: string;
  requesterId: number;
  requesterName?: string;
  requestDate: Date;
  description: string;
  totalAmount: number;
  status: string;
  approvedAmount: number | null;
  approvedAt: Date | null;
  approvedBy: number | null;
  approverName?: string;
  paidAt: Date | null;
  paidBy: number | null;
  payerName?: string;
  notes: string | null;
  branchId: number | null;
  departmentId: number | null;
  beneficiaryName: string | null;
  beneficiaryAccountNumber: string | null;
  beneficiaryBankName: string | null;
  beneficiaryBankId: number | null;
  memoFrom: string | null;
  memoTo: string | null;
  subject: string | null;
  background: string | null;
  justification: string | null;
  prayer: string | null;
  whtAmount: number;
  netAmount: number;
  currency: string;
  expenseAccountId: number | null;
  expenseAccountName?: string;
  expenseAccountCode?: string;
  bankAccountId: number | null;
  bankName?: string;
  bankAccountNumber?: string;
  whtApplicable: boolean;
  whtRate: number | null;
  budgetNotes: string | null;
  budgetExceeded: boolean;
  paymentVoucherNumber: string | null;
  transferMemoNumber: string | null;
  paymentDate: Date | null;
  paymentReference: string | null;
  journalEntryId: number | null;
  rejectionReason: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  tripId?: number | null;
  vehicleId?: number | null;
  fleetCostType?: string | null;
  // Computed on findById: true if any approver has already acted on this
  // request's approval flow. Gates the requester's edit window on pending.
  approvalsStarted?: boolean;
  lines?: ExpenseRequestLine[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseRequestLine {
  id: number;
  expenseRequestId: number;
  description: string;
  accountId: number | null;
  accountCode?: string;
  accountName?: string;
  amount: number;
  quantity: number;
  unitPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ExpenseRequestService {
  private readonly logger = new Logger(ExpenseRequestService.name);

  constructor(
    private tenantPrisma: TenantPrismaService,
    private approvalService: ProcessApprovalService,
  ) {}

  // ============================================================================
  // CRUD
  // ============================================================================

  async create(
    companyId: number,
    dto: CreateExpenseRequestDto,
  ): Promise<ExpenseRequest> {
    let requestId: number;

    await this.tenantPrisma.transaction(async (client) => {
      // E-2: Generate request number INSIDE transaction with row lock to prevent duplicates
      const year = new Date().getFullYear();
      const prefix = `ER-${year}-`;
      const lastRequest = await client.query(
        `SELECT "requestNumber" FROM expense_requests
         WHERE "companyId" = $1 AND "requestNumber" LIKE $2
         ORDER BY "requestNumber" DESC LIMIT 1 FOR UPDATE`,
        [companyId, `${prefix}%`],
      );
      let nextNum = 1;
      if (lastRequest.rows[0]?.requestNumber) {
        const parts = (lastRequest.rows[0].requestNumber as string).split('-');
        const n = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(n)) nextNum = n + 1;
      }
      const requestNumber = `${prefix}${String(nextNum).padStart(5, '0')}`;
      // Create the request
      const result = await client.query(
        `INSERT INTO expense_requests
         ("companyId", "requestNumber", "requesterId", "requesterName", "requestDate", description, status,
          "branchId", "departmentId", notes, "beneficiaryName", "beneficiaryAccountNumber",
          "beneficiaryBankName", "beneficiaryBankId",
          "memoFrom", "memoTo", subject, background, justification, prayer,
          currency, "expenseAccountId", "bankAccountId", "whtApplicable", "whtRate",
          "tripId", "vehicleId", "fleetCostType",
          "totalAmount", "whtAmount", "netAmount", "createdBy", "updatedBy", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,'draft',$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,0,0,0,0,0,NOW(),NOW())
         RETURNING id`,
        [
          companyId,          // $1
          requestNumber,      // $2
          dto.requesterId || null,   // $3
          dto.requesterName || null, // $4 — NEW
          dto.requestDate,    // $5
          dto.description,    // $6
          dto.branchId || null,      // $7
          dto.departmentId || null,  // $8
          dto.notes || null,         // $9
          dto.beneficiaryName || null,          // $10
          dto.beneficiaryAccountNumber || null, // $11
          dto.beneficiaryBankName || null,      // $12
          dto.beneficiaryBankId || null,        // $13
          dto.memoFrom || null,      // $14
          dto.memoTo || null,        // $15
          dto.subject || null,       // $16
          dto.background || null,    // $17
          dto.justification || null, // $18
          dto.prayer || null,        // $19
          dto.currency || 'NGN',     // $20
          dto.expenseAccountId || null, // $21
          dto.bankAccountId || null,    // $22
          dto.whtApplicable || false,   // $23
          dto.whtRate || null,          // $24
          dto.tripId || null,           // $25
          dto.vehicleId || null,        // $26
          dto.fleetCostType || null,    // $27
        ],
      );
      requestId = result.rows[0].id;

      // Insert lines
      if (dto.lines && dto.lines.length > 0) {
        for (const line of dto.lines) {
          const amount = toMoney(line.quantity * line.unitPrice);
          await client.query(
            `INSERT INTO expense_request_lines
             ("expenseRequestId", description, "accountId", "expenseAccountId", "whtId",
              amount, quantity, "unitPrice", "whtApplicable", "whtRate", remarks,
              "whtAmount", "netAmount", "createdAt", "updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,0,NOW(),NOW())`,
            [
              requestId,
              line.description,
              line.accountId || null,
              line.expenseAccountId || null,
              line.whtId || null,
              amount,
              line.quantity,
              line.unitPrice,
              line.whtApplicable || false,
              line.whtRate || null,
              line.remarks || null,
            ],
          );
        }

        await this.recalculateTotals(client, requestId);
      }

      // Insert attachments (uploaded before form submission)
      if (dto.attachments && dto.attachments.length > 0) {
        for (const att of dto.attachments) {
          await client.query(
            `INSERT INTO expense_request_attachments ("expenseRequestId", filename, "originalName", path, url, "mimeType", size, "createdAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
            [requestId, att.filename, att.originalName, att.path, att.url, att.mimeType || null, att.size || null],
          );
        }
      }
    }, { isolationLevel: 'SERIALIZABLE' });

    return this.findById(companyId, requestId!);
  }

  async update(
    companyId: number,
    requestId: number,
    dto: UpdateExpenseRequestDto,
    userId?: number,
  ): Promise<ExpenseRequest> {
    const request = await this.findById(companyId, requestId);

    // Super Admin can edit any status except paid/cancelled (money disbursed or void).
    // This is a direct override — no approval flow is re-triggered.
    const superAdminOverride = userId
      ? !!(await isSuperAdmin(this.tenantPrisma, userId))
      : false;

    const LOCKED_STATUSES = ['paid', 'cancelled'];
    if (superAdminOverride && LOCKED_STATUSES.includes(request.status)) {
      throw new ForbiddenException(
        `Cannot edit a ${request.status} expense request — the transaction is finalised.`,
      );
    }

    // Editability rules for non-Super-Admin users:
    //   - draft     → always editable
    //   - rejected  → requester (or Super Admin) can fix and resubmit
    //   - pending   → requester (or Super Admin) can edit IF no approval action yet
    //   - approved / paid / cancelled → blocked
    if (!superAdminOverride) {
      const editable =
        request.status === 'draft' ||
        request.status === 'rejected' ||
        (request.status === 'pending' && !request.approvalsStarted);

      if (!editable) {
        if (request.status === 'pending') {
          throw new BadRequestException(
            'This request can no longer be edited — an approver has already acted on it.',
          );
        }
        throw new BadRequestException('Can only edit draft, rejected, or not-yet-approved expense requests');
      }
    }

    // For rejected or pending edits, only the original requester (or Super
    // Admin) may change the content.
    // In AssetPro, requesterId stores the userId directly (no employees table).
    if (!superAdminOverride && (request.status === 'rejected' || request.status === 'pending') && userId) {
      if (request.requesterId && request.requesterId !== userId) {
        const isSuperAdmin = await this.tenantPrisma.queryOne<{ id: number }>(
          `SELECT ur."roleId" AS id FROM user_roles ur JOIN roles r ON r.id = ur."roleId" WHERE ur."userId" = $1 AND r.name = 'Super Admin' LIMIT 1`,
          [userId],
        );
        if (!isSuperAdmin) {
          throw new ForbiddenException('Only the original requester can edit this expense request');
        }
      }
    }

    await this.tenantPrisma.transaction(async (client) => {
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      const addField = (col: string, val: unknown) => {
        fields.push(`"${col}" = $${idx++}`);
        values.push(val);
      };

      if (dto.requestDate !== undefined) addField('requestDate', dto.requestDate);
      if (dto.description !== undefined) addField('description', dto.description);
      if (dto.notes !== undefined) addField('notes', dto.notes);
      if (dto.departmentId !== undefined) addField('departmentId', dto.departmentId);
      if (dto.memoFrom !== undefined) addField('memoFrom', dto.memoFrom);
      if (dto.memoTo !== undefined) addField('memoTo', dto.memoTo);
      if (dto.subject !== undefined) addField('subject', dto.subject);
      if (dto.background !== undefined) addField('background', dto.background);
      if (dto.justification !== undefined) addField('justification', dto.justification);
      if (dto.prayer !== undefined) addField('prayer', dto.prayer);
      if (dto.beneficiaryName !== undefined) addField('beneficiaryName', dto.beneficiaryName);
      if (dto.beneficiaryAccountNumber !== undefined) addField('beneficiaryAccountNumber', dto.beneficiaryAccountNumber);
      if (dto.beneficiaryBankName !== undefined) addField('beneficiaryBankName', dto.beneficiaryBankName);
      if (dto.beneficiaryBankId !== undefined) addField('beneficiaryBankId', dto.beneficiaryBankId);
      if (dto.expenseAccountId !== undefined) addField('expenseAccountId', dto.expenseAccountId);
      if (dto.bankAccountId !== undefined) addField('bankAccountId', dto.bankAccountId);
      if (dto.whtApplicable !== undefined) addField('whtApplicable', dto.whtApplicable);
      if (dto.whtRate !== undefined) addField('whtRate', dto.whtRate);
      if (dto.currency !== undefined) addField('currency', dto.currency);
      if (dto.tripId !== undefined) addField('tripId', dto.tripId);
      if (dto.vehicleId !== undefined) addField('vehicleId', dto.vehicleId);
      if (dto.fleetCostType !== undefined) addField('fleetCostType', dto.fleetCostType);

      if (fields.length > 0) {
        fields.push(`"updatedAt" = NOW()`);
        values.push(requestId);
        await client.query(
          `UPDATE expense_requests SET ${fields.join(', ')} WHERE id = $${idx}`,
          values,
        );
      }

      if (dto.lines !== undefined) {
        await client.query(
          `DELETE FROM expense_request_lines WHERE "expenseRequestId" = $1`,
          [requestId],
        );

        for (const line of dto.lines) {
          const amount = toMoney(line.quantity * line.unitPrice);
          await client.query(
            `INSERT INTO expense_request_lines
             ("expenseRequestId", description, "accountId", "expenseAccountId", "whtId",
              amount, quantity, "unitPrice", "whtApplicable", "whtRate", remarks,
              "whtAmount", "netAmount", "createdAt", "updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,0,NOW(),NOW())`,
            [
              requestId,
              line.description,
              line.accountId || null,
              line.expenseAccountId || null,
              line.whtId || null,
              amount,
              line.quantity,
              line.unitPrice,
              line.whtApplicable || false,
              line.whtRate || null,
              line.remarks || null,
            ],
          );
        }

        await this.recalculateTotals(client, requestId);

        // Sync approvedAmount when SA force-edits an already-approved request
        // so payment processing uses the updated amount, not the stale approval snapshot.
        if (request.status === 'approved') {
          await client.query(
            `UPDATE expense_requests SET "approvedAmount" = "totalAmount", "updatedAt" = NOW() WHERE id = $1`,
            [requestId],
          );
        }
      }
    }, { isolationLevel: 'SERIALIZABLE' });

    return this.findById(companyId, requestId);
  }

  async submit(
    companyId: number,
    requestId: number,
    userId: number,
  ): Promise<ExpenseRequest> {
    const request = await this.findById(companyId, requestId);

    if (request.status !== 'draft') {
      throw new BadRequestException('Can only submit draft expense requests');
    }

    // Check company setting: is approval required?
    const settings = await this.tenantPrisma.queryOne<{ useExpenseApproval: boolean }>(
      `SELECT "useExpenseApproval" FROM company_settings WHERE "companyId" = $1`,
      [companyId],
    );
    const useApproval = settings?.useExpenseApproval !== false; // defaults to true

    if (!useApproval) {
      // No approval required: immediately approve
      await this.tenantPrisma.query(
        `UPDATE expense_requests
         SET status = 'approved', "approvedAmount" = "totalAmount",
             "approvedAt" = NOW(), "approvedBy" = $1, "updatedAt" = NOW()
         WHERE id = $2`,
        [userId, requestId],
      );

      if (request.requesterId) {
        await this.createNotification(companyId, request.requesterId, 'financial', {
          title: 'Expense Request Approved',
          message: `Your expense request ${request.requestNumber} (₦${Number(request.totalAmount).toLocaleString()}) has been approved (no approval required).`,
          url: `/accounts/expense-requests/${requestId}`,
        });
      }
    } else {
      // Initiate configurable approval flow — throws BadRequestException if no flow configured
      try {
        await this.approvalService.initiateApproval(
          { processType: 'expense_requests', recordId: requestId, companyId },
          userId,
        );
      } catch (err) {
        const msg = (err as Error).message || '';
        if (msg.includes('No active approval flow') || msg.includes('not found')) {
          throw new BadRequestException(
            'No approval flow is configured for expense requests. ' +
            'Please ask your administrator to set up an approval flow before submitting.',
          );
        }
        throw err;
      }

      await this.tenantPrisma.query(
        `UPDATE expense_requests
         SET status = 'pending', "submittedAt" = NOW(), "updatedAt" = NOW()
         WHERE id = $1`,
        [requestId],
      );

      if (request.requesterId) {
        await this.createNotification(companyId, request.requesterId, 'financial', {
          title: 'Expense Request Submitted',
          message: `Your expense request ${request.requestNumber} (₦${Number(request.totalAmount).toLocaleString()}) has been submitted for approval.`,
          url: `/accounts/expense-requests/${requestId}`,
        });
      }
    }

    return this.findById(companyId, requestId);
  }

  async approve(
    companyId: number,
    requestId: number,
    dto: ApproveExpenseRequestDto,
    userId: number,
  ): Promise<ExpenseRequest> {
    const request = await this.findById(companyId, requestId);

    if (request.status !== 'pending') {
      throw new BadRequestException('Can only approve pending expense requests');
    }

    // Get current pending approval step
    const pendingApproval = await this.tenantPrisma.queryOne<{
      id: number;
      processApprovalFlowStepId: number;
    }>(
      `SELECT id, "processApprovalFlowStepId" FROM process_approvals
       WHERE "approvableType" = 'expense_requests' AND "approvableId" = $1
         AND "approvedAt" IS NULL
       ORDER BY "createdAt" DESC LIMIT 1`,
      [requestId],
    );

    if (!pendingApproval) {
      throw new BadRequestException('No pending approval step found for this request');
    }

    // Get step definition (authority check + stepType)
    const step = await this.tenantPrisma.queryOne<{
      id: number;
      name: string | null;
      roleId: number | null;
      approverType: string;
      employees: string | null;
      stepType: string;
    }>(
      `SELECT id, name, "roleId", "approverType", employees, "stepType"
       FROM process_approval_flow_steps WHERE id = $1`,
      [pendingApproval.processApprovalFlowStepId],
    );

    if (!step) {
      throw new BadRequestException('Approval step configuration not found');
    }

    // Authority check
    await this.checkApproverAuthority(companyId, userId, step);

    // Accountant step: update GL accounts on lines if provided
    if (step.stepType === 'accountant') {
      if (dto.lines && dto.lines.length > 0) {
        await this.tenantPrisma.transaction(async (client) => {
          for (const line of dto.lines!) {
            await client.query(
              `UPDATE expense_request_lines
               SET "accountId" = $1, "updatedAt" = NOW()
               WHERE id = $2 AND "expenseRequestId" = $3`,
              [line.accountId, line.lineId, requestId],
            );
          }
          if (dto.expenseAccountId) {
            await client.query(
              `UPDATE expense_requests SET "expenseAccountId" = $1, "updatedAt" = NOW() WHERE id = $2`,
              [dto.expenseAccountId, requestId],
            );
          }
          await this.recalculateTotals(client, requestId);

          // Budget check
          const freshRequest = await this.tenantPrisma.queryOne<{
            expenseAccountId: number | null;
            departmentId: number | null;
            totalAmount: string;
          }>(
            `SELECT "expenseAccountId", "departmentId", "totalAmount" FROM expense_requests WHERE id = $1`,
            [requestId],
          );
          const accountId = freshRequest?.expenseAccountId;
          if (accountId) {
            const budgetLine = await this.tenantPrisma.queryOne<{
              id: number;
              annualBudgetAmount: string;
              committedAmount: string;
              actualAmount: string;
            }>(
              `SELECT bl.id, bl."annualBudgetAmount", bl."committedAmount", bl."actualAmount"
               FROM budget_lines bl
               JOIN budgets b ON b.id = bl."budgetId"
               WHERE bl."companyId" = $1
                 AND bl."accountId" = $2
                 AND (bl."departmentId" = $3 OR bl."departmentId" IS NULL)
                 AND b.status = 'ACTIVE'
                 AND bl."deletedAt" IS NULL
               ORDER BY bl."departmentId" DESC NULLS LAST
               LIMIT 1`,
              [companyId, accountId, freshRequest?.departmentId || null],
            );

            const totalAmount = Number(freshRequest?.totalAmount || 0);
            let budgetExceeded = false;
            let budgetNotes: string | null = null;

            if (budgetLine) {
              const available =
                Number(budgetLine.annualBudgetAmount) -
                Number(budgetLine.committedAmount) -
                Number(budgetLine.actualAmount);
              budgetExceeded = totalAmount > available;
              budgetNotes = budgetExceeded
                ? `Budget exceeded. Available: ${available.toFixed(2)}, Requested: ${totalAmount.toFixed(2)}`
                : `Budget OK. Available: ${available.toFixed(2)}, Requested: ${totalAmount.toFixed(2)}`;
            } else {
              budgetNotes = 'No active budget found for this account/department';
            }

            await client.query(
              `UPDATE expense_requests SET "budgetExceeded" = $1, "budgetNotes" = $2, "updatedAt" = NOW() WHERE id = $3`,
              [budgetExceeded, budgetNotes, requestId],
            );
          }
        }, { isolationLevel: 'SERIALIZABLE' });
      } else if (dto.expenseAccountId) {
        await this.tenantPrisma.query(
          `UPDATE expense_requests SET "expenseAccountId" = $1, "updatedAt" = NOW() WHERE id = $2`,
          [dto.expenseAccountId, requestId],
        );
      }
    }

    // Advance the flow step; returns true when all steps are done
    const allDone = await this.advanceApprovalStep(
      requestId,
      userId,
      pendingApproval.id,
      pendingApproval.processApprovalFlowStepId,
      dto.comments,
    );

    if (allDone) {
      const approvedAmount = dto.approvedAmount ?? request.totalAmount;
      await this.tenantPrisma.query(
        `UPDATE expense_requests
         SET status = 'approved', "approvedAmount" = $1,
             "approvedAt" = NOW(), "approvedBy" = $2, "updatedAt" = NOW()
         WHERE id = $3`,
        [approvedAmount, userId, requestId],
      );

      if (request.requesterId && request.requesterId !== userId) {
        await this.createNotification(companyId, request.requesterId, 'financial', {
          title: 'Expense Request Approved',
          message: `Your expense request ${request.requestNumber} (₦${Number(request.totalAmount).toLocaleString()}) has been fully approved.`,
          url: `/accounts/expense-requests/${requestId}`,
        });
      }
    }

    return this.findById(companyId, requestId);
  }

  async reject(
    companyId: number,
    requestId: number,
    dto: RejectExpenseRequestDto,
    userId: number,
  ): Promise<ExpenseRequest> {
    const request = await this.findById(companyId, requestId);

    if (request.status !== 'pending') {
      throw new BadRequestException('Can only reject pending expense requests');
    }

    // Get current pending approval step and check authority
    const pendingApproval = await this.tenantPrisma.queryOne<{
      id: number;
      processApprovalFlowStepId: number;
    }>(
      `SELECT id, "processApprovalFlowStepId" FROM process_approvals
       WHERE "approvableType" = 'expense_requests' AND "approvableId" = $1
         AND "approvedAt" IS NULL
       ORDER BY "createdAt" DESC LIMIT 1`,
      [requestId],
    );

    if (pendingApproval) {
      const step = await this.tenantPrisma.queryOne<{
        roleId: number | null;
        approverType: string;
        employees: string | null;
        stepType: string;
      }>(
        `SELECT "roleId", "approverType", employees, "stepType"
         FROM process_approval_flow_steps WHERE id = $1`,
        [pendingApproval.processApprovalFlowStepId],
      );

      if (step) {
        await this.checkApproverAuthority(companyId, userId, step);
      }

      // Record rejection in process_approvals
      const user = await this.tenantPrisma.queryOne<{ name: string }>(
        `SELECT name FROM users WHERE id = $1`,
        [userId],
      );

      await this.tenantPrisma.update('process_approvals', pendingApproval.id, {
        approvalAction: 'Rejected',
        approverName: user?.name || `User #${userId}`,
        comment: dto.reason,
        approvedAt: new Date(),
        userId,
        updatedAt: new Date(),
      });

      // Update status record
      const statusRow = await this.tenantPrisma.queryOne<{ id: number; steps: string }>(
        `SELECT id, steps FROM process_approval_statuses
         WHERE "approvableType" = 'expense_requests' AND "approvableId" = $1`,
        [requestId],
      );

      if (statusRow) {
        const stepsData: Array<Record<string, unknown>> = typeof statusRow.steps === 'string' ? JSON.parse(statusRow.steps) : statusRow.steps;
        const idx = stepsData.findIndex(
          (s) => s['stepId'] === pendingApproval.processApprovalFlowStepId,
        );
        if (idx !== -1) {
          stepsData[idx]['status'] = 'REJECTED';
          stepsData[idx]['rejectedBy'] = user?.name;
          stepsData[idx]['rejectedAt'] = new Date().toISOString();
        }

        await this.tenantPrisma.update('process_approval_statuses', statusRow.id, {
          steps: JSON.stringify(stepsData),
          status: 'REJECTED',
          updatedAt: new Date(),
        });
      }
    }

    await this.tenantPrisma.query(
      `UPDATE expense_requests
       SET status = 'rejected', "rejectionReason" = $1, "updatedBy" = $2, "updatedAt" = NOW()
       WHERE id = $3`,
      [dto.reason, userId, requestId],
    );

    if (request.requesterId && request.requesterId !== userId) {
      await this.createNotification(companyId, request.requesterId, 'financial', {
        title: 'Expense Request Rejected',
        message: `Your expense request ${request.requestNumber} (₦${Number(request.totalAmount).toLocaleString()}) has been rejected. Reason: ${dto.reason}`,
        url: `/accounts/expense-requests/${requestId}`,
      });
    }

    return this.findById(companyId, requestId);
  }

  async markAsPaid(
    companyId: number,
    requestId: number,
    dto: PayExpenseRequestDto,
    userId: number,
  ): Promise<ExpenseRequest> {
    const request = await this.findById(companyId, requestId);

    if (request.status === 'paid') {
      throw new BadRequestException('This expense request has already been paid');
    }
    // Allow payment from any active status when using configurable approval flow
    const blockedStatuses = ['paid', 'cancelled', 'rejected'];
    if (blockedStatuses.includes(request.status)) {
      throw new BadRequestException(`Cannot pay expense request with status "${request.status}"`);
    }
    // E-11: Double-payment check — verify PV not already assigned
    if (request.paymentVoucherNumber) {
      throw new BadRequestException(`This expense request already has payment voucher ${request.paymentVoucherNumber}. Cannot process payment again.`);
    }

    const bankId = dto.bankAccountId || request.bankAccountId;
    const expenseAccId = request.expenseAccountId;
    let generatedPvNumber = '';

    // Resolve bank GL account via centralized validator (throws BadRequestException if not configured)
    const { validateGLAccounts } = require('../../../common/utils/gl-account-validator');
    const glValidation = await validateGLAccounts(
      this.tenantPrisma, companyId, 'expense_request',
      { bankId: bankId ?? undefined },
    );
    const bankGlAccountId: number = glValidation.accounts.bank;

    // Fetch line items with their GL accounts for per-line posting
    const expenseLines = await this.tenantPrisma.query<Record<string, unknown>>(
      `SELECT id, description, "accountId", amount, "whtApplicable", "whtAmount", "netAmount"
       FROM expense_request_lines WHERE "expenseRequestId" = $1`,
      [requestId],
    );

    // Determine if we can post: need at least one line with an accountId OR a header expenseAccountId
    const hasLineAccounts = expenseLines.some(l => l.accountId != null);
    if (!hasLineAccounts && !expenseAccId) {
      throw new BadRequestException(
        'Cannot process payment: no GL accounts assigned to line items (Account/Finance coding incomplete). Please ensure GL coding is completed before payment.',
      );
    }
    await this.tenantPrisma.transaction(async (client) => {
      // E-2: Generate PV/TL/JE numbers INSIDE transaction with row locks
      const year = new Date().getFullYear();

      const lastPvResult = await client.query(
        `SELECT "paymentVoucherNumber" FROM expense_requests
         WHERE "companyId" = $1 AND "paymentVoucherNumber" IS NOT NULL
         ORDER BY id DESC LIMIT 1 FOR UPDATE`,
        [companyId],
      );
      const lastPvNum = lastPvResult.rows[0]
        ? parseInt((lastPvResult.rows[0].paymentVoucherNumber as string).replace('PV-', ''), 10) : 0;
      const pvNumber = `PV-${String(lastPvNum + 1).padStart(6, '0')}`;
      generatedPvNumber = pvNumber;

      const tlPrefix = `TL-${year}-`;
      const lastTlResult = await client.query(
        `SELECT "transferMemoNumber" FROM expense_requests
         WHERE "companyId" = $1 AND "transferMemoNumber" IS NOT NULL
         ORDER BY id DESC LIMIT 1 FOR UPDATE`,
        [companyId],
      );
      const lastTlNum = lastTlResult.rows[0]
        ? parseInt((lastTlResult.rows[0].transferMemoNumber as string).replace(tlPrefix, ''), 10) || 0 : 0;
      const tlNumber = `${tlPrefix}${String(lastTlNum + 1).padStart(5, '0')}`;

      const jePrefix = `JE-${year}-`;
      const lastJeResult = await client.query(
        `SELECT "entryNumber" FROM journal_entries
         WHERE "companyId" = $1 AND "entryNumber" LIKE $2
         ORDER BY "entryNumber" DESC LIMIT 1 FOR UPDATE`,
        [companyId, `${jePrefix}%`],
      );
      let nextJeNum = 1;
      if (lastJeResult.rows[0]?.entryNumber) {
        const parts = (lastJeResult.rows[0].entryNumber as string).split('-');
        const n = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(n)) nextJeNum = n + 1;
      }
      const jeNumber = `${jePrefix}${String(nextJeNum).padStart(5, '0')}`;

      const fiscalYearResult = await client.query(
        `SELECT id FROM fiscal_years
         WHERE "companyId" = $1 AND status = 'open'
           AND "startDate" <= NOW() AND "endDate" >= NOW()
         LIMIT 1`,
        [companyId],
      );
      const fiscalYearId = fiscalYearResult.rows[0]?.id || null;

      // E-11: Lock the expense request row to prevent concurrent payment
      const lockedRow = await client.query(
        `SELECT status FROM expense_requests WHERE id = $1 FOR UPDATE`,
        [requestId],
      );
      if (lockedRow.rows[0]?.status === 'paid') {
        throw new BadRequestException('This expense request was already paid by another user.');
      }

      let journalEntryId: number | null = null;

      {
        const totalAmount = toMoney(request.totalAmount);
        const whtAmount = toMoney(request.whtAmount || 0);
        const netAmount = subMoney(totalAmount, whtAmount);

        const jeResult = await client.query(
          `INSERT INTO journal_entries
           ("companyId", "entryNumber", "entryDate", reference, narration,
            "totalDebit", "totalCredit", status, "journalType", "sourceType",
            "sourceId", "fiscalYearId", "createdBy", "createdAt", "updatedAt")
           VALUES ($1,$2,NOW(),$3,$4,$5,$6,'posted','payment','expense_request',$7,$8,$9,NOW(),NOW())
           RETURNING id`,
          [
            companyId, jeNumber, pvNumber,
            `Payment of expense request ${request.requestNumber} - ${request.description}`,
            totalAmount, totalAmount,
            requestId, fiscalYearId, userId,
          ],
        );
        journalEntryId = jeResult.rows[0].id;

        // DR Expense Account(s) — per line if coded, else use header account
        if (hasLineAccounts) {
          for (const line of expenseLines) {
            const lineAccId = (line.accountId as number) || expenseAccId;
            if (!lineAccId) continue;
            const lineAmount = toMoney(parseFloat(String(line.amount ?? 0)));
            await client.query(
              `INSERT INTO journal_entry_line_items
               ("journalEntryId", "accountId", debit, credit, narration, "createdAt", "updatedAt")
               VALUES ($1,$2,$3,NULL,$4,NOW(),NOW())`,
              [journalEntryId, lineAccId, lineAmount, `Expense: ${line.description}`],
            );
          }
        } else {
          // Fallback: single debit to header expense account
          await client.query(
            `INSERT INTO journal_entry_line_items
             ("journalEntryId", "accountId", debit, credit, narration, "createdAt", "updatedAt")
             VALUES ($1,$2,$3,NULL,$4,NOW(),NOW())`,
            [journalEntryId, expenseAccId, totalAmount, `Expense: ${request.description}`],
          );
        }

        // CR Bank GL Account (net amount after WHT)
        await client.query(
          `INSERT INTO journal_entry_line_items
           ("journalEntryId", "accountId", debit, credit, narration, "createdAt", "updatedAt")
           VALUES ($1,$2,NULL,$3,$4,NOW(),NOW())`,
          [journalEntryId, bankGlAccountId, netAmount, `Payment via bank: ${pvNumber}`],
        );

        // CR WHT Payable (if any)
        if (whtAmount > 0) {
          const whtPayableAccount = await this.tenantPrisma.queryOne<{ id: number }>(
            `SELECT id FROM ifrs_accounts
             WHERE "companyId" = $1
               AND (name ILIKE '%withholding tax payable%' OR name ILIKE '%wht payable%')
               AND "deletedAt" IS NULL
             LIMIT 1`,
            [companyId],
          );
          if (whtPayableAccount) {
            await client.query(
              `INSERT INTO journal_entry_line_items
               ("journalEntryId", "accountId", debit, credit, narration, "createdAt", "updatedAt")
               VALUES ($1,$2,NULL,$3,$4,NOW(),NOW())`,
              [journalEntryId, whtPayableAccount.id, whtAmount, `WHT payable: ${request.requestNumber}`],
            );
          }
        }
        // E-4: Validate debit/credit balance before committing
        const balanceCheck = await client.query(
          `SELECT COALESCE(SUM(debit), 0) as "totalDebit", COALESCE(SUM(credit), 0) as "totalCredit"
           FROM journal_entry_line_items WHERE "journalEntryId" = $1`,
          [journalEntryId],
        );
        const totalDebit = parseFloat(balanceCheck.rows[0]?.totalDebit ?? '0');
        const totalCredit = parseFloat(balanceCheck.rows[0]?.totalCredit ?? '0');
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
          throw new BadRequestException(
            `Journal entry is unbalanced: Debit ${totalDebit.toFixed(2)} ≠ Credit ${totalCredit.toFixed(2)}. Cannot process payment.`,
          );
        }
      }

      const paidDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();
      // Prevent future dates
      if (paidDate > new Date()) {
        throw new BadRequestException('Payment date cannot be in the future');
      }

      await client.query(
        `UPDATE expense_requests
         SET status = 'paid', "paidAt" = $9::timestamp, "paidBy" = $1,
             "bankAccountId" = $2, "paymentVoucherNumber" = $3,
             "transferMemoNumber" = $4, "paymentReference" = $5,
             "paymentDate" = $10::date, "journalEntryId" = $6,
             notes = COALESCE($7, notes),
             "updatedBy" = $1, "updatedAt" = NOW()
         WHERE id = $8`,
        [
          userId, bankId || null, pvNumber, tlNumber,
          dto.paymentReference || null, journalEntryId,
          dto.notes, requestId, paidDate, paidDate,
        ],
      );
    }, { isolationLevel: 'SERIALIZABLE' });

    if (request.requesterId && request.requesterId !== userId) {
      await this.createNotification(companyId, request.requesterId, 'financial', {
        title: 'Expense Request Paid',
        message: `Your expense request ${request.requestNumber} (₦${Number(request.totalAmount).toLocaleString()}) has been paid. Voucher: ${generatedPvNumber}`,
        url: `/accounts/expense-requests/${requestId}`,
      });
    }

    // Fleet cost sync — fire-and-forget (never blocks payment)
    this.applyFleetCostFromExpense(companyId, requestId).catch((err) => {
      this.logger.warn(`Fleet cost sync failed for ER ${request.requestNumber}: ${err}`);
    });

    return this.findById(companyId, requestId);
  }

  /**
   * Sync trip/vehicle cost fields when an expense request linked to fleet is paid.
   * - tripId set    → updates the matching cost field on the trip row
   * - vehicleId only → inserts a vehicle_cost_entry row
   * Never throws — called fire-and-forget from markAsPaid.
   */
  private async applyFleetCostFromExpense(companyId: number, expenseRequestId: number): Promise<void> {
    const er = await this.tenantPrisma.queryOne<{
      tripId: number | null;
      vehicleId: number | null;
      fleetCostType: string | null;
      totalAmount: string;
      requestNumber: string;
      description: string;
    }>(
      `SELECT "tripId", "vehicleId", "fleetCostType", "totalAmount", "requestNumber", description
       FROM expense_requests WHERE id = $1`,
      [expenseRequestId],
    );

    if (!er || (!er.tripId && !er.vehicleId)) return;

    const amount = toMoney(parseFloat(String(er.totalAmount ?? 0)));
    const fleetType = (er.fleetCostType || 'OTHER').toUpperCase();

    if (er.tripId) {
      // Map fleetCostType → trip cost column
      const colMap: Record<string, string> = {
        FUEL: 'fuelCost',
        TOLL: 'tollCost',
        PARKING: 'parkingCost',
        DRIVER_ALLOWANCE: 'driverAllowance',
        MAINTENANCE: 'otherCosts',
        INSURANCE: 'otherCosts',
        LICENSING: 'otherCosts',
        TYRE: 'otherCosts',
        OTHER: 'miscExpenses',
      };
      const col = colMap[fleetType] ?? 'miscExpenses';

      // Increment the matching cost column; totalCost is re-summed from all columns
      await this.tenantPrisma.query(
        `UPDATE trips
         SET "${col}" = COALESCE("${col}", 0) + $1,
             "totalCost" = COALESCE("fuelCost",0) + COALESCE("tollCost",0) + COALESCE("parkingCost",0)
                         + COALESCE("otherCosts",0) + COALESCE("driverAllowance",0) + COALESCE("miscExpenses",0) + $1,
             "updatedAt" = NOW()
         WHERE id = $2 AND "deletedAt" IS NULL`,
        [amount, er.tripId],
      );
      this.logger.log(`Fleet sync: added ₦${amount} (${fleetType}) to trip #${er.tripId} from ER ${er.requestNumber}`);
    } else if (er.vehicleId) {
      // Map fleet cost type → VehicleCostType enum values (vehicle_cost_entries only supports vehicle-level types)
      const vehicleCostTypeMap: Record<string, string> = {
        MAINTENANCE: 'MAINTENANCE',
        INSURANCE: 'INSURANCE',
        LICENSING: 'LICENSING',
        TYRE: 'TYRE',
        FUEL: 'OTHER',
        TOLL: 'OTHER',
        PARKING: 'OTHER',
        DRIVER_ALLOWANCE: 'OTHER',
        OTHER: 'OTHER',
      };
      const vehicleCostType = vehicleCostTypeMap[fleetType] ?? 'OTHER';

      await this.tenantPrisma.insert('vehicle_cost_entries', {
        companyId,
        vehicleId: er.vehicleId,
        costType: vehicleCostType,
        amount,
        costDate: new Date().toISOString().split('T')[0],
        source: 'MANUAL',
        sourceId: expenseRequestId,
        notes: er.description || er.requestNumber,
      });
      this.logger.log(`Fleet sync: created vehicle_cost_entry for vehicle #${er.vehicleId} from ER ${er.requestNumber}`);
    }
  }

  /**
   * Process payment: approve the final configurable flow step + create GL journal entry + mark as paid.
   * Single click for the cashier at the Payment Process step.
   * Super Admin bypass: if the user is a Super Admin, the duplicate-approver guard is skipped so they
   * can process payment even if they already approved an earlier step in the same flow.
   */
  async processPaymentAndApprove(
    companyId: number,
    requestId: number,
    dto: PayExpenseRequestDto,
    userId: number,
  ): Promise<ExpenseRequest> {
    // E-7: Approve the final configurable approval step — REQUIRED, not optional
    const statusRow = await this.tenantPrisma.queryOne<{ id: number; status: string }>(
      `SELECT id, status FROM process_approval_statuses
       WHERE "approvableType" = 'expense_requests' AND "approvableId" = $1`,
      [requestId],
    );
    if (statusRow && statusRow.status === 'PENDING') {
      // Super Admin bypass: if user already approved an earlier step, normal performAction would throw
      // ForbiddenException. Detect super admin and call approveStep with bypassPermission = true.
      const superAdminCheck = await this.tenantPrisma.queryOne<{ id: number }>(
        `SELECT ur."roleId" as id FROM user_roles ur JOIN roles r ON r.id = ur."roleId"
         WHERE ur."userId" = $1 AND r.name = 'Super Admin' LIMIT 1`,
        [userId],
      );

      if (superAdminCheck) {
        // Find the pending approval record directly and bypass the duplicate-approver guard
        const pendingApproval = await this.tenantPrisma.queryOne<{ id: number }>(
          `SELECT pa.id FROM process_approvals pa
           WHERE pa."approvableType" = 'expense_requests' AND pa."approvableId" = $1
             AND pa."approvedAt" IS NULL
           ORDER BY pa."createdAt" DESC LIMIT 1`,
          [requestId],
        );
        if (pendingApproval) {
          await this.approvalService.approveStep(pendingApproval.id, userId, { comment: 'Payment processed by Super Admin' }, true);
        }
      } else {
        // Normal path — must succeed, if user lacks permission payment is blocked
        await this.approvalService.performAction(statusRow.id, userId, 'approve', 'Payment processed');
      }
    }

    // 2. Create GL entries and mark as paid
    return this.markAsPaid(companyId, requestId, dto, userId);
  }

  async delete(companyId: number, requestId: number): Promise<void> {
    const request = await this.findById(companyId, requestId);

    const deletableStatuses = ['draft', 'pending', 'rejected'];
    if (!deletableStatuses.includes(request.status)) {
      throw new BadRequestException('Can only delete draft, pending, or rejected expense requests');
    }

    await this.tenantPrisma.transaction(async (client) => {
      await client.query(
        `DELETE FROM expense_request_lines WHERE "expenseRequestId" = $1`,
        [requestId],
      );
      await client.query(
        `DELETE FROM expense_requests WHERE id = $1 AND "companyId" = $2`,
        [requestId, companyId],
      );
    }, { isolationLevel: 'SERIALIZABLE' });
  }

  async cancelRequest(
    companyId: number,
    requestId: number,
    userId: number,
  ): Promise<ExpenseRequest> {
    const request = await this.findById(companyId, requestId);

    if (['paid', 'cancelled'].includes(request.status)) {
      throw new BadRequestException('Cannot cancel paid or already cancelled requests');
    }

    await this.tenantPrisma.query(
      `UPDATE expense_requests
       SET status = 'cancelled', "updatedBy" = $1, "updatedAt" = NOW()
       WHERE id = $2`,
      [userId, requestId],
    );

    return this.findById(companyId, requestId);
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  async findById(companyId: number, requestId: number): Promise<ExpenseRequest> {
    const request = await this.tenantPrisma.queryOne<ExpenseRequest>(
      `SELECT er.*,
         er."requesterName" as "requesterName",
         ea.name as "expenseAccountName", ea.code as "expenseAccountCode",
         b."bankName", b."accountNumber" as "bankAccountNumber"
       FROM expense_requests er
       LEFT JOIN ifrs_accounts ea ON ea.id = er."expenseAccountId"
       LEFT JOIN banks b ON b.id = er."bankAccountId"
       WHERE er.id = $1 AND er."companyId" = $2 AND er."deletedAt" IS NULL`,
      [requestId, companyId],
    );

    if (!request) {
      throw new NotFoundException('Expense request not found');
    }

    // Get lines
    const lines = await this.tenantPrisma.query<ExpenseRequestLine>(
      `SELECT l.*,
         a.code as "accountCode", a.name as "accountName"
       FROM expense_request_lines l
       LEFT JOIN ifrs_accounts a ON a.id = l."accountId"
       WHERE l."expenseRequestId" = $1
       ORDER BY l.id ASC`,
      [requestId],
    );

    request.lines = lines;

    // Get attachments — wrapped defensively so a missing table (pre-migration)
    // never breaks expense request views or the approval flow
    try {
      const attachments = await this.tenantPrisma.query(
        `SELECT * FROM expense_request_attachments WHERE "expenseRequestId" = $1 ORDER BY "createdAt" ASC`,
        [requestId],
      );
      (request as any).attachments = attachments;
    } catch {
      (request as any).attachments = [];
    }

    // Expose whether any approver has acted yet. The frontend uses this to
    // decide if the requester still has an edit window on a pending request.
    request.approvalsStarted = await this.hasAnyApprovalAction(requestId);
    return request;
  }

  async addAttachment(
    companyId: number,
    requestId: number,
    dto: { filename: string; originalName: string; path: string; url: string; mimeType?: string; size?: number },
    userId?: number,
  ) {
    await this.findById(companyId, requestId); // verifies ownership
    const result = await this.tenantPrisma.queryOne<{ id: number }>(
      `INSERT INTO expense_request_attachments ("expenseRequestId", filename, "originalName", path, url, "mimeType", size, "uploadedBy", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING id`,
      [requestId, dto.filename, dto.originalName, dto.path, dto.url, dto.mimeType || null, dto.size || null, userId || null],
    );
    return result;
  }

  async removeAttachment(companyId: number, requestId: number, attachmentId: number) {
    await this.findById(companyId, requestId); // verifies ownership
    await this.tenantPrisma.query(
      `DELETE FROM expense_request_attachments WHERE id = $1 AND "expenseRequestId" = $2`,
      [attachmentId, requestId],
    );
  }

  /**
   * Returns true if any approver has already acted (approved or rejected) on
   * this expense request's approval flow. Used to gate whether the requester
   * can still edit a pending request.
   */
  private async hasAnyApprovalAction(requestId: number): Promise<boolean> {
    // process_approvals rows are created as pending placeholders when the
    // flow initiates (approvedAt = NULL). We only care about rows where an
    // approver has actually acted — approvedAt IS NOT NULL means they
    // clicked approve or reject.
    const row = await this.tenantPrisma.queryOne<{ count: number }>(
      `SELECT COUNT(*)::int AS count
         FROM process_approvals
        WHERE "approvableType" = 'expense_requests'
          AND "approvableId" = $1
          AND "approvedAt" IS NOT NULL`,
      [requestId],
    );
    return (row?.count ?? 0) > 0;
  }

  async findAll(
    companyId: number,
    query: ExpenseRequestQueryDto,
  ): Promise<{ data: ExpenseRequest[]; total: number; totalPages: number; currentPage: number }> {
    const { status, requesterId, startDate, endDate, search, minAmount, maxAmount, page = 1, limit = 25 } = query;
    const offset = (page - 1) * limit;

    const conditions: string[] = [`er."companyId" = $1`, `er."deletedAt" IS NULL`];
    const params: unknown[] = [companyId];
    let idx = 2;

    if (status) {
      conditions.push(`er.status = $${idx++}`);
      params.push(status);
    }
    if (requesterId) {
      conditions.push(`er."requesterId" = $${idx++}`);
      params.push(requesterId);
    }
    if (startDate) {
      conditions.push(`er."requestDate" >= $${idx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`er."requestDate" <= $${idx++}`);
      params.push(endDate);
    }
    if (search) {
      conditions.push(
        `(er."requestNumber" ILIKE $${idx} OR er.description ILIKE $${idx} OR er."requesterName" ILIKE $${idx})`,
      );
      params.push(`%${search}%`);
      idx++;
    }
    if (minAmount !== undefined) {
      conditions.push(`er."totalAmount" >= $${idx++}`);
      params.push(minAmount);
    }
    if (maxAmount !== undefined) {
      conditions.push(`er."totalAmount" <= $${idx++}`);
      params.push(maxAmount);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM expense_requests er
       WHERE ${whereClause}`,
      params,
    );

    const total = parseInt(countResult?.count || '0', 10);

    const data = await this.tenantPrisma.query<ExpenseRequest>(
      `SELECT er.*,
         er."requesterName" as "requesterName",
         pending_step."stepName" as "pendingStepName",
         pending_step."roleName" as "pendingRoleName"
       FROM expense_requests er
       LEFT JOIN LATERAL (
         SELECT pafs.name as "stepName",
           COALESCE(
             r.name,
             CASE WHEN pafs."approverType" = 'employee' THEN pafs.name ELSE NULL END
           ) as "roleName"
         FROM process_approval_statuses pas
         JOIN process_approvals pa ON pa."approvableType" = pas."approvableType" AND pa."approvableId" = pas."approvableId" AND pa."approvalAction" = 'Pending'
         JOIN process_approval_flow_steps pafs ON pafs.id = pa."processApprovalFlowStepId"
         LEFT JOIN roles r ON r.id = pafs."roleId"
         WHERE pas."approvableType" = 'expense_requests' AND pas."approvableId" = er.id AND pas.status = 'PENDING' AND pas."companyId" = $1
         ORDER BY pafs."stepOrder" ASC LIMIT 1
       ) pending_step ON true
       WHERE ${whereClause}
       ORDER BY er."createdAt" DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    );

    return {
      data,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async getStats(companyId: number): Promise<Record<string, number>> {
    const rows = await this.tenantPrisma.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) as count FROM expense_requests
       WHERE "companyId" = $1 AND "deletedAt" IS NULL
       GROUP BY status`,
      [companyId],
    );

    const stats: Record<string, number> = {
      total: 0,
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      paid: 0,
      cancelled: 0,
      totalAmount: 0,
    };

    for (const row of rows) {
      const count = parseInt(row.count, 10);
      stats.total += count;
      if (row.status in stats) {
        stats[row.status] += count;
      } else if (row.status.startsWith('pending')) {
        stats.pending += count;
      } else if (row.status.includes('approved')) {
        stats.approved += count;
      }
    }

    // Get total amount
    const amountResult = await this.tenantPrisma.queryOne<{ sum: string }>(
      `SELECT COALESCE(SUM("totalAmount"), 0) as sum FROM expense_requests WHERE "companyId" = $1 AND "deletedAt" IS NULL`,
      [companyId],
    );
    stats.totalAmount = parseFloat(amountResult?.sum || '0');

    return stats;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Check if the user is the designated approver for a flow step.
   * Throws ForbiddenException if not authorized.
   */
  private async checkApproverAuthority(
    companyId: number,
    userId: number,
    step: { roleId: number | null; approverType: string; employees: string | null; stepType: string },
  ): Promise<void> {
    if (step.approverType === 'role' && step.roleId) {
      const hasRole = await this.tenantPrisma.queryOne<{ id: number }>(
        `SELECT ur.id FROM user_roles ur
         WHERE ur."roleId" = $1 AND ur."userId" = $2`,
        [step.roleId, userId],
      );
      if (!hasRole) {
        throw new ForbiddenException('You are not authorized to approve this step (role mismatch)');
      }
    } else if (step.approverType === 'employee' && step.employees) {
      let employeesData: { ids: number[] };
      try {
        // employees column is jsonb — pg driver may return object or string
        employeesData = typeof step.employees === 'string'
          ? JSON.parse(step.employees) as { ids: number[] }
          : step.employees as unknown as { ids: number[] };
      } catch {
        throw new ForbiddenException('Invalid approver configuration for this step');
      }

      // In AssetPro (no employees table), match by userId directly
      if (!employeesData.ids.includes(userId)) {
        throw new ForbiddenException('You are not authorized to approve this step (employee mismatch)');
      }
    }
    // If no specific role/employee constraint, any user with the approve permission can proceed
  }

  /**
   * Advance a process approval step.
   * Returns true when all steps are approved (flow complete).
   */
  private async advanceApprovalStep(
    requestId: number,
    userId: number,
    approvalId: number,
    stepId: number,
    comment?: string,
  ): Promise<boolean> {
    const statusRow = await this.tenantPrisma.queryOne<{
      id: number;
      companyId: number;
      steps: string;
    }>(
      `SELECT id, "companyId", steps FROM process_approval_statuses
       WHERE "approvableType" = 'expense_requests' AND "approvableId" = $1`,
      [requestId],
    );

    if (!statusRow) return false;

    const user = await this.tenantPrisma.queryOne<{ name: string }>(
      `SELECT name FROM users WHERE id = $1`,
      [userId],
    );

    // Mark current approval as done
    await this.tenantPrisma.update('process_approvals', approvalId, {
      approvalAction: 'Approved',
      approverName: user?.name || `User #${userId}`,
      comment: comment || null,
      approvedAt: new Date(),
      userId,
      updatedAt: new Date(),
    });

    const stepsData: Array<Record<string, unknown>> = typeof statusRow.steps === 'string' ? JSON.parse(statusRow.steps) : statusRow.steps;
    const currentIdx = stepsData.findIndex((s) => s['stepId'] === stepId);
    if (currentIdx !== -1) {
      stepsData[currentIdx]['status'] = 'APPROVED';
      stepsData[currentIdx]['approvedBy'] = user?.name;
      stepsData[currentIdx]['approvedAt'] = new Date().toISOString();
    }

    const allApproved = stepsData.every((s) => s['status'] === 'APPROVED');

    if (allApproved) {
      await this.tenantPrisma.update('process_approval_statuses', statusRow.id, {
        steps: JSON.stringify(stepsData),
        status: 'APPROVED',
        updatedAt: new Date(),
      });
      return true;
    }

    // Move to next sequential step
    const nextIdx = currentIdx + 1;
    if (nextIdx < stepsData.length) {
      stepsData[nextIdx]['status'] = 'PENDING';
      const nextStep = await this.tenantPrisma.queryOne<{ id: number }>(
        `SELECT id FROM process_approval_flow_steps WHERE id = $1`,
        [stepsData[nextIdx]['stepId'] as number],
      );
      if (nextStep) {
        await this.tenantPrisma.insert('process_approvals', {
          approvableType: 'expense_requests',
          approvableId: requestId,
          processApprovalFlowStepId: nextStep.id,
          approvalAction: 'Pending',
          userId,
          companyId: statusRow.companyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Notify the next step's approvers
        const nextStepDetail = await this.tenantPrisma.queryOne(
          `SELECT * FROM process_approval_flow_steps WHERE id = $1`,
          [nextStep.id],
        );
        if (nextStepDetail) {
          await this.approvalService.notifyApproversForStep(
            nextStepDetail as unknown as Record<string, unknown>,
            'expense_requests',
            requestId,
            statusRow.companyId,
            (stepsData[nextIdx]['name'] as string) || `Step ${nextIdx + 1}`,
          );
        }
      }
    }

    await this.tenantPrisma.update('process_approval_statuses', statusRow.id, {
      steps: JSON.stringify(stepsData),
      updatedAt: new Date(),
    });

    return false;
  }

  private async recalculateTotals(client: { query: (sql: string, params: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }, requestId: number): Promise<void> {
    const lines = await client.query(
      `SELECT l.*, w.rate as "whtTaxRate"
       FROM expense_request_lines l
       LEFT JOIN withholding_taxes w ON w.id = l."whtId"
       WHERE l."expenseRequestId" = $1`,
      [requestId],
    );

    let totalAmount = 0;
    let totalWht = 0;

    for (const line of lines.rows) {
      const lineAmount = toMoney(line['amount'] as number);
      let lineWht = 0;

      if (line['whtApplicable'] && line['whtTaxRate']) {
        lineWht = mulMoney(lineAmount, toMoney(line['whtTaxRate'] as number, 6) / 100);
      } else if (line['whtApplicable'] && line['whtRate']) {
        lineWht = mulMoney(lineAmount, toMoney(line['whtRate'] as number, 6) / 100);
      }

      const lineNet = subMoney(lineAmount, lineWht);

      await client.query(
        `UPDATE expense_request_lines
         SET "whtAmount" = $1, "netAmount" = $2, "updatedAt" = NOW()
         WHERE id = $3`,
        [lineWht, lineNet, line['id'] as number],
      );

      totalAmount += lineAmount;
      totalWht += lineWht;
    }

    await client.query(
      `UPDATE expense_requests
       SET "totalAmount" = $1, "whtAmount" = $2, "netAmount" = $3, "updatedAt" = NOW()
       WHERE id = $4`,
      [totalAmount, totalWht, totalAmount - totalWht, requestId],
    );
  }

  /**
   * Save GL account and WHT coding on expense request lines (Account/Finance step).
   * Also recalculates whtAmount, netAmount on each line and totals on the request.
   */
  async saveLineCoding(
    companyId: number,
    requestId: number,
    lines: Array<{ lineId: number; accountId?: number; whtId?: number | null; whtApplicable?: boolean }>,
  ): Promise<ExpenseRequest> {
    const request = await this.findById(companyId, requestId);

    // E-5: State validation — only allow coding on pending requests
    if (request.status !== 'pending') {
      throw new BadRequestException(
        `Cannot modify GL coding: request is in "${request.status}" status. Coding is only allowed while the request is pending approval.`,
      );
    }

    // Validate WHT rates are within bounds
    for (const line of lines) {
      // Look up WHT rate if applicable — validate bounds
      let whtRate = 0;
      if (line.whtApplicable && line.whtId) {
        const wht = await this.tenantPrisma.queryOne<{ rate: string }>(
          `SELECT rate FROM withholding_taxes WHERE id = $1`,
          [line.whtId],
        );
        whtRate = parseFloat(wht?.rate || '0');
        if (whtRate < 0 || whtRate > 100) {
          throw new BadRequestException(`Invalid WHT rate: ${whtRate}%. WHT rate must be between 0% and 100%.`);
        }
      }

      // Get current line amount
      const currentLine = await this.tenantPrisma.queryOne<{ amount: string }>(
        `SELECT amount FROM expense_request_lines WHERE id = $1 AND "expenseRequestId" = $2`,
        [line.lineId, requestId],
      );
      const amount = toMoney(parseFloat(currentLine?.amount || '0'));
      const whtAmount = line.whtApplicable ? toMoney((amount * whtRate) / 100) : 0;
      const netAmount = subMoney(amount, whtAmount);

      await this.tenantPrisma.query(
        `UPDATE expense_request_lines
         SET "accountId" = COALESCE($1, "accountId"),
             "whtId" = $2,
             "whtApplicable" = $3,
             "whtRate" = $4,
             "whtAmount" = $5,
             "netAmount" = $6,
             "updatedAt" = NOW()
         WHERE id = $7 AND "expenseRequestId" = $8`,
        [
          line.accountId || null,
          line.whtApplicable ? (line.whtId || null) : null,
          line.whtApplicable ?? false,
          line.whtApplicable ? whtRate : 0,
          whtAmount,
          netAmount,
          line.lineId,
          requestId,
        ],
      );
    }

    // Recalculate request totals using raw query (non-transaction version)
    const updatedLines = await this.tenantPrisma.query<Record<string, unknown>>(
      `SELECT COALESCE(SUM(amount), 0) as "totalAmount",
              COALESCE(SUM("whtAmount"), 0) as "totalWht",
              COALESCE(SUM("netAmount"), 0) as "totalNet"
       FROM expense_request_lines WHERE "expenseRequestId" = $1`,
      [requestId],
    );
    const totals = updatedLines[0] || {};
    const totalAmount = toMoney(parseFloat(String(totals.totalAmount ?? 0)));
    const totalWht = toMoney(parseFloat(String(totals.totalWht ?? 0)));
    const totalNet = toMoney(parseFloat(String(totals.totalNet ?? 0)));

    await this.tenantPrisma.query(
      `UPDATE expense_requests
       SET "totalAmount" = $1, "whtAmount" = $2, "netAmount" = $3, "updatedAt" = NOW()
       WHERE id = $4`,
      [totalAmount, totalWht, totalNet, requestId],
    );

    return this.findById(companyId, requestId);
  }

  async resetApproval(companyId: number, requestId: number, userId: number): Promise<void> {
    // Verify request exists and belongs to this company
    const request = await this.tenantPrisma.queryOne<{ id: number; status: string }>(
      `SELECT id, status FROM expense_requests WHERE id = $1 AND "companyId" = $2`,
      [requestId, companyId],
    );
    if (!request) {
      throw new NotFoundException(`Expense request #${requestId} not found`);
    }

    // Find the approval status record
    const statusRow = await this.tenantPrisma.queryOne<{ id: number }>(
      `SELECT id FROM process_approval_statuses
       WHERE "approvableType" = 'expense_requests' AND "approvableId" = $1`,
      [requestId],
    );
    if (!statusRow) {
      throw new NotFoundException(`No approval record found for expense request #${requestId}`);
    }

    // Delegate to the generic reset
    await this.approvalService.resetToStep1(statusRow.id, userId);

    // Reset the expense request's own status fields
    await this.tenantPrisma.query(
      `UPDATE expense_requests
       SET status = 'pending', "approvedAt" = NULL, "approvedBy" = NULL, "approvedAmount" = NULL, "updatedAt" = NOW()
       WHERE id = $1`,
      [requestId],
    );
  }

  /**
   * Resubmit a rejected expense request — resets approval flow to step 1
   */
  async resubmit(companyId: number, requestId: number, userId: number): Promise<void> {
    const request = await this.tenantPrisma.queryOne<{ id: number; status: string; requesterId: number }>(
      `SELECT id, status, "requesterId" FROM expense_requests WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
      [requestId, companyId],
    );
    if (!request) throw new NotFoundException(`Expense request #${requestId} not found`);
    if (request.status !== 'rejected') {
      throw new BadRequestException('Only rejected requests can be resubmitted');
    }

    // Only the original requester can resubmit (or Super Admin).
    // In AssetPro, requesterId stores the userId directly (no employees table).
    if (request.requesterId && request.requesterId !== userId) {
      const isSuperAdmin = await this.tenantPrisma.queryOne<{ id: number }>(
        `SELECT ur."roleId" AS id FROM user_roles ur JOIN roles r ON r.id = ur."roleId" WHERE ur."userId" = $1 AND r.name = 'Super Admin' LIMIT 1`,
        [userId],
      );
      if (!isSuperAdmin) {
        throw new ForbiddenException('Only the original requester can resubmit a rejected expense request');
      }
    }

    // Reset approval flow inline. We can't delegate to
    // ProcessApprovalService.resetToStep1 here because that helper enforces
    // Super-Admin-only — it's the generic "nuclear reset" admin tool. This
    // resubmit path is a first-class requester action (owner or Super Admin
    // already verified above), so we do the equivalent wipe-and-rebuild
    // directly.
    const statusRow = await this.tenantPrisma.queryOne<{ id: number }>(
      `SELECT id FROM process_approval_statuses WHERE "approvableType" = 'expense_requests' AND "approvableId" = $1`,
      [requestId],
    );
    if (statusRow) {
      // 1. Delete all prior approval records (the old rejection and any pending placeholders)
      await this.tenantPrisma.query(
        `DELETE FROM process_approvals WHERE "approvableType" = 'expense_requests' AND "approvableId" = $1`,
        [requestId],
      );
      // 2. Delete the old status row — initiateApproval will create a fresh one
      await this.tenantPrisma.query(
        `DELETE FROM process_approval_statuses WHERE id = $1`,
        [statusRow.id],
      );
    }

    // 3. Re-initiate the approval flow from step 1 off the current live
    //    flow configuration (picks up any steps added since the first submit).
    await this.approvalService.initiateApproval({
      processType: 'expense_requests',
      recordId: requestId,
      companyId,
    }, userId);

    // 4. Reset expense request status
    await this.tenantPrisma.query(
      `UPDATE expense_requests
       SET status = 'pending', "rejectionReason" = NULL, "approvedAt" = NULL, "approvedBy" = NULL, "updatedAt" = NOW()
       WHERE id = $1`,
      [requestId],
    );

    this.logger.log(`Expense request #${requestId} resubmitted by user ${userId}`);
  }

  private async createNotification(
    companyId: number,
    userId: number,
    type: string,
    data: { title: string; message: string; url?: string },
  ): Promise<void> {
    try {
      await this.tenantPrisma.query(
        `INSERT INTO notifications (id, type, "notifiableType", "notifiableId", data, "companyId", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'User', $2, $3, $4, NOW(), NOW())`,
        [type, userId, JSON.stringify(data), companyId],
      );
    } catch (err) {
      this.logger.warn(`Failed to create notification: ${err}`);
    }
  }
}
