import { ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../services/tenant-prisma.service';

const logger = new Logger('SuperAdminOverride');

/**
 * Check if a user has the Super Admin role.
 * Reusable across all modules for approval override checks.
 */
export async function isSuperAdmin(tenantPrisma: TenantPrismaService, userId: number): Promise<boolean> {
  const result = await tenantPrisma.queryOne<{ id: number }>(
    `SELECT ur."roleId" as id FROM user_roles ur JOIN roles r ON r.id = ur."roleId"
     WHERE ur."userId" = $1 AND r.name = 'Super Admin' LIMIT 1`,
    [userId],
  );
  return !!result;
}

/**
 * Standard override approval record structure.
 */
export interface SuperAdminOverrideRecord {
  overriddenBy: number;
  overriddenAt: Date;
  overrideReason: string;
  overrideType: 'approve_step' | 'override_all';
}

/**
 * Config for a single approvable entity type.
 */
export interface OverrideConfig {
  table: string;
  approvedStatus: string;
  statusField: string;
  approvedByField: string | null;
  approvedAtField: string | null;
  notesField: string;
  companyIdField: string;
}

/**
 * Registry of ALL approvable entity types and their table/field mappings.
 * This is the single source of truth for override behavior.
 */
export const OVERRIDE_REGISTRY: Record<string, OverrideConfig> = {
  // ─── Sales ───
  sales_orders:          { table: 'sales_orders', approvedStatus: 'confirmed', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  sales_invoices:        { table: 'sales_invoices', approvedStatus: 'approved', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  sales_deliveries:      { table: 'sales_deliveries', approvedStatus: 'dispatched', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  invoice_payments:      { table: 'invoice_payments', approvedStatus: 'completed', statusField: 'status', approvedByField: 'approvedById', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  credit_notes:          { table: 'credit_notes', approvedStatus: 'APPROVED', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },

  // ─── Purchase ───
  purchase_orders:       { table: 'purchase_orders', approvedStatus: 'approved', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  purchase_requisitions: { table: 'purchase_requisitions', approvedStatus: 'approved', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  goods_received_notes:  { table: 'goods_received_notes', approvedStatus: 'received', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  purchase_invoices:     { table: 'purchase_invoices', approvedStatus: 'approved', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  purchase_returns:      { table: 'purchase_returns', approvedStatus: 'APPROVED', statusField: 'status', approvedByField: 'approvedById', approvedAtField: 'approvedDate', notesField: 'approvalNotes', companyIdField: 'companyId' },
  service_orders:        { table: 'service_orders', approvedStatus: 'approved', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  certificates_of_completion: { table: 'certificates_of_completion', approvedStatus: 'approved', statusField: 'status', approvedByField: 'approvedById', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },

  // ─── HR / Payroll ───
  leaves:                { table: 'leaves', approvedStatus: 'approved', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  expense_claims:        { table: 'expense_claims', approvedStatus: 'approved', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  payrolls:              { table: 'payrolls', approvedStatus: 'APPROVED', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  employee_loans:        { table: 'employee_loans', approvedStatus: 'APPROVED', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  overtime_requests:     { table: 'overtime_requests', approvedStatus: 'approved', statusField: 'status', approvedByField: null, approvedAtField: null, notesField: 'notes', companyIdField: 'companyId' },

  // ─── Accounts / Payables ───
  expense_requests:      { table: 'expense_requests', approvedStatus: 'approved', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  pay_payments:          { table: 'pay_payments', approvedStatus: 'APPROVED', statusField: 'approvalStatus', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },

  // ─── Petty Cash ───
  petty_cash_disbursements:  { table: 'petty_cash_disbursements', approvedStatus: 'approved', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  petty_cash_replenishments: { table: 'petty_cash_replenishments', approvedStatus: 'approved', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },

  // ─── Inventory ───
  inv_item_beginning_balances: { table: 'inv_item_beginning_balances', approvedStatus: 'approved', statusField: 'status', approvedByField: 'approvedById', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  inv_stock_movements:   { table: 'inv_stock_movements', approvedStatus: 'APPROVED', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  inv_isr_requests:      { table: 'inv_isr_requests', approvedStatus: 'pending_issue', statusField: 'status', approvedByField: null, approvedAtField: null, notesField: 'notes', companyIdField: 'companyId' },

  // ─── Budget ───
  budgets:               { table: 'budgets', approvedStatus: 'APPROVED', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  budget_transfers:      { table: 'budget_transfers', approvedStatus: 'approved', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  budget_overrides:      { table: 'budget_overrides', approvedStatus: 'approved', statusField: 'status', approvedByField: 'approvedBy', approvedAtField: 'approvedAt', notesField: 'approverComments', companyIdField: 'companyId' },

  // ─── Assets ───
  ast_disposals:         { table: 'ast_disposals', approvedStatus: 'approved', statusField: 'status', approvedByField: 'approvedByUserId', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },
  ast_transfers:         { table: 'ast_transfers', approvedStatus: 'approved', statusField: 'status', approvedByField: 'approvedByUserId', approvedAtField: 'approvedAt', notesField: 'notes', companyIdField: 'companyId' },

  // ─── Fund Management ───
  investor_onboarding:   { table: 'fm_investors', approvedStatus: 'APPROVED', statusField: 'kycStatus', approvedByField: 'kycApprovedBy', approvedAtField: 'kycApprovedAt', notesField: 'notes', companyIdField: 'companyId' },
};

/**
 * Generic Super Admin override for any approvable entity.
 *
 * 1. Verifies the user is Super Admin
 * 2. Validates reason (min 5 chars)
 * 3. Updates entity status to approved
 * 4. Appends override reason to notes
 * 5. If configurable approval tracking exists, marks all pending steps OVERRIDDEN
 */
export async function superAdminOverrideApproval(
  tenantPrisma: TenantPrismaService,
  userId: number,
  params: {
    entityType: string;
    entityId: number;
    companyId: number;
    reason: string;
  },
): Promise<{ success: true; entityType: string; entityId: number; newStatus: string }> {
  const { entityType, entityId, companyId, reason } = params;

  // 1. Validate entity type
  const config = OVERRIDE_REGISTRY[entityType];
  if (!config) {
    throw new BadRequestException(`Unknown entity type: ${entityType}`);
  }

  // 2. Verify Super Admin
  const isAdmin = await isSuperAdmin(tenantPrisma, userId);
  if (!isAdmin) {
    throw new ForbiddenException('Only Super Admin can override approvals');
  }

  // 3. Validate reason
  if (!reason || reason.trim().length < 5) {
    throw new BadRequestException('Override reason is required (minimum 5 characters)');
  }

  // 4. Verify entity exists and belongs to company
  const entity = await tenantPrisma.queryOne<Record<string, unknown>>(
    `SELECT * FROM ${config.table} WHERE id = $1 AND "${config.companyIdField}" = $2`,
    [entityId, companyId],
  );
  if (!entity) {
    throw new BadRequestException(`Record not found in ${config.table}`);
  }

  const now = new Date();
  const overrideNote = `[SUPER ADMIN OVERRIDE] ${reason.trim()}`;

  // 5. Build update object
  const updateData: Record<string, unknown> = {
    [config.statusField]: config.approvedStatus,
    updatedAt: now,
  };
  if (config.approvedByField) updateData[config.approvedByField] = userId;
  if (config.approvedAtField) updateData[config.approvedAtField] = now;

  // Append override reason to notes field
  const existingNotes = entity[config.notesField] as string | null;
  updateData[config.notesField] = existingNotes
    ? `${existingNotes}\n\n${overrideNote}`
    : overrideNote;

  await tenantPrisma.update(config.table, entityId, updateData);

  // 6. If configurable approval tracking exists, override all pending steps
  const tracking = await tenantPrisma.queryOne<{ id: number; steps: string | Record<string, unknown>[] }>(
    `SELECT id, steps FROM process_approval_statuses
     WHERE "approvableType" = $1 AND "approvableId" = $2 AND status != 'APPROVED'
     LIMIT 1`,
    [entityType, entityId],
  );

  if (tracking) {
    const stepsJson: Record<string, unknown>[] = typeof tracking.steps === 'string'
      ? JSON.parse(tracking.steps)
      : (tracking.steps || []);

    // Get overrider name
    const user = await tenantPrisma.queryOne<{ name: string }>(`SELECT name FROM users WHERE id = $1`, [userId]);
    const overriderName = user?.name || `User #${userId}`;

    const updatedSteps = stepsJson.map((s) => {
      if (s['status'] === 'PENDING' || s['status'] === 'WAITING') {
        return { ...s, status: 'OVERRIDDEN', overriddenBy: overriderName, overriddenAt: now.toISOString() };
      }
      return s;
    });

    await tenantPrisma.update('process_approval_statuses', tracking.id, {
      status: 'APPROVED',
      steps: JSON.stringify(updatedSteps),
      updatedAt: now,
    });

    // Insert audit record
    await tenantPrisma.insert('process_approvals', {
      approvableType: entityType,
      approvableId: entityId,
      processApprovalFlowStepId: null,
      approvalAction: 'Overridden',
      approverName: overriderName,
      comment: overrideNote,
      approvedAt: now,
      userId,
      companyId,
      createdAt: now,
      updatedAt: now,
    });
  }

  logger.warn(`Super Admin override: user ${userId} overrode ${entityType}#${entityId} — ${reason}`);

  return { success: true, entityType, entityId, newStatus: config.approvedStatus };
}
