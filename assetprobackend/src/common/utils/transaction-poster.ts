import { BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../services/tenant-prisma.service';

const logger = new Logger('TransactionPoster');

// ============================================================================
// TYPES
// ============================================================================

export interface TransactionPostOptions {
  /** The tenant prisma service for DB operations */
  prisma: TenantPrismaService;
  /** Company context */
  companyId: number;
  /** Table name of the record being posted */
  table: string;
  /** ID of the record being posted */
  recordId: number;
  /** New status to set on success (e.g. 'received', 'posted', 'approved', 'completed') */
  newStatus: string;
  /** Additional fields to set on the record when status changes */
  statusFields?: Record<string, unknown>;
  /**
   * Critical operations that MUST succeed before status changes.
   * If ANY of these throw, status is NOT updated and the error propagates.
   *
   * Examples: GL posting, stock movement posting, balance updates
   */
  criticalOps: Array<{
    name: string;
    execute: () => Promise<void>;
  }>;
  /**
   * Non-critical operations that should succeed but won't block the transaction.
   * Failures are logged and collected in the result but do NOT prevent the status change.
   *
   * Examples: notifications, commission calculations, alert checks
   */
  nonCriticalOps?: Array<{
    name: string;
    execute: () => Promise<void>;
  }>;
}

export interface TransactionPostResult {
  success: boolean;
  /** Warnings from non-critical operations that failed */
  warnings: string[];
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Post a financial transaction with guaranteed integrity.
 *
 * RULES:
 * 1. All critical operations execute FIRST
 * 2. If ANY critical operation fails, the error is thrown — status NEVER changes
 * 3. Status is updated ONLY after all critical operations succeed
 * 4. Non-critical operations run AFTER status update; failures are logged, not thrown
 *
 * This function is the ONLY correct way to change a financial record's status
 * when dependent operations (GL posting, stock updates, balance syncing) are involved.
 *
 * @throws BadRequestException if any critical operation fails
 */
export async function postTransaction(options: TransactionPostOptions): Promise<TransactionPostResult> {
  const { prisma, table, recordId, newStatus, statusFields, criticalOps, nonCriticalOps } = options;
  const warnings: string[] = [];

  // ── Step 1: Execute ALL critical operations ──
  // If any one fails, we throw immediately. Status is never touched.
  for (const op of criticalOps) {
    try {
      await op.execute();
      logger.log(`[${table}#${recordId}] ✓ ${op.name}`);
    } catch (error) {
      const msg = (error as Error).message || String(error);
      logger.error(`[${table}#${recordId}] ✗ ${op.name} FAILED: ${msg}`);
      throw new BadRequestException(
        `Cannot complete ${table}#${recordId}: ${op.name} failed — ${msg}`,
      );
    }
  }

  // ── Step 2: Update status — only reached if ALL critical ops succeeded ──
  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    ...(statusFields || {}),
  };
  await prisma.update(table, recordId, updatePayload);
  logger.log(`[${table}#${recordId}] Status → ${newStatus}`);

  // ── Step 3: Run non-critical operations (notifications, alerts, etc.) ──
  if (nonCriticalOps) {
    for (const op of nonCriticalOps) {
      try {
        await op.execute();
      } catch (error) {
        const msg = (error as Error).message || String(error);
        logger.warn(`[${table}#${recordId}] Non-critical: ${op.name} failed: ${msg}`);
        warnings.push(`${op.name}: ${msg}`);
      }
    }
  }

  return { success: true, warnings };
}

// ============================================================================
// BATCH VARIANT — for bulk operations (e.g. bulk depreciation posting)
// ============================================================================

export interface BatchPostOptions {
  prisma: TenantPrismaService;
  companyId: number;
  table: string;
  /** Each item has its own record ID and critical operations */
  items: Array<{
    recordId: number;
    newStatus: string;
    statusFields?: Record<string, unknown>;
    criticalOps: Array<{ name: string; execute: () => Promise<void> }>;
  }>;
}

export interface BatchPostResult {
  posted: number;
  failed: number;
  /** Details of each failure — surfaced to the user */
  failures: Array<{ recordId: number; error: string }>;
}

/**
 * Post multiple financial records. Unlike the old pattern that swallowed errors,
 * this collects ALL failures and returns them so the user can see exactly what failed.
 *
 * Each item is independent — one failure doesn't block others.
 * But failures ARE reported, not swallowed.
 */
export async function postTransactionBatch(options: BatchPostOptions): Promise<BatchPostResult> {
  const { prisma, table, items } = options;
  let posted = 0;
  const failures: Array<{ recordId: number; error: string }> = [];

  for (const item of items) {
    try {
      await postTransaction({
        prisma,
        companyId: options.companyId,
        table,
        recordId: item.recordId,
        newStatus: item.newStatus,
        statusFields: item.statusFields,
        criticalOps: item.criticalOps,
      });
      posted++;
    } catch (error) {
      const msg = (error as Error).message || String(error);
      failures.push({ recordId: item.recordId, error: msg });
    }
  }

  // If ALL failed, throw so the caller knows nothing worked
  if (posted === 0 && failures.length > 0) {
    throw new BadRequestException(
      `All ${failures.length} items failed to post. First error: ${failures[0].error}`,
    );
  }

  // If some failed, return details so user sees them
  return {
    posted,
    failed: failures.length,
    failures,
  };
}
