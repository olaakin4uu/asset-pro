import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type DeploymentMode = 'cloud' | 'on_premise' | 'hybrid';

export type TableSyncCategory = 'master' | 'transactional' | 'excluded';

@Injectable()
export class SyncConfigService {
  private readonly deploymentMode: DeploymentMode;
  private readonly syncEnabled: boolean;
  private readonly sitePrefixCode: string;

  // Tables classified by sync behaviour
  private readonly masterTables: ReadonlySet<string>;
  private readonly transactionalTables: ReadonlySet<string>;
  private readonly excludedTables: ReadonlySet<string>;

  constructor(private readonly config: ConfigService) {
    const mode = this.config.get<string>('DEPLOYMENT_MODE', 'cloud');
    if (mode !== 'cloud' && mode !== 'on_premise' && mode !== 'hybrid') {
      throw new Error(
        `Invalid DEPLOYMENT_MODE: "${mode}". Must be cloud, on_premise, or hybrid.`,
      );
    }
    this.deploymentMode = mode;

    // Sync is only possible in on_premise or hybrid mode
    this.syncEnabled =
      this.deploymentMode !== 'cloud' &&
      this.config.get<string>('SYNC_ENABLED', 'false') === 'true';

    this.sitePrefixCode = this.config.get<string>('SITE_PREFIX_CODE', 'CL');

    // ── Table classification ────────────────────────────────────────────
    // Master data: always synced regardless of module ownership
    this.masterTables = new Set(
      this.parseEnvList('SYNC_TABLES_MASTER', [
        'users',
        'roles',
        'user_roles',
        'companies',
        'branches',
        'chart_of_accounts',
        'account_categories',
        'customers',
        'suppliers',
        'inventory_items',
        'inventory_categories',
        'employees',
        'departments',
        'designations',
        'currencies',
        'payment_methods',
        'banks',
        'vat_rates',
        'wht_rates',
        'modules',
        'features',
        'subscriptions',
        'subscription_modules',
      ]),
    );

    // Transactional data: synced per module ownership config
    this.transactionalTables = new Set(
      this.parseEnvList('SYNC_TABLES_TRANSACTIONAL', [
        'journal_entries',
        'journal_entry_line_items',
        'invoices',
        'invoice_items',
        'payments',
        'purchase_orders',
        'purchase_order_items',
        'stock_movements',
        'stock_adjustments',
        'payroll_runs',
        'payslips',
        'pos_transactions',
        'pos_transaction_items',
        'sales_orders',
        'sales_order_items',
        'expense_requests',
        'approval_flows',
        'approval_flow_steps',
        'bank_transfers',
      ]),
    );

    // Excluded: never synced (local-only)
    this.excludedTables = new Set(
      this.parseEnvList('SYNC_TABLES_EXCLUDED', [
        'sessions',
        'refresh_tokens',
        'audit_logs',
        'sync_outbox',
        'sync_inbox',
        'sync_cursors',
        'instance_config',
        'notification_queue',
      ]),
    );
  }

  // ── Public API ──────────────────────────────────────────────────────

  getDeploymentMode(): DeploymentMode {
    return this.deploymentMode;
  }

  isCloud(): boolean {
    return this.deploymentMode === 'cloud';
  }

  isOnPremise(): boolean {
    return this.deploymentMode === 'on_premise';
  }

  isHybrid(): boolean {
    return this.deploymentMode === 'hybrid';
  }

  isSyncEnabled(): boolean {
    return this.syncEnabled;
  }

  getSitePrefixCode(): string {
    return this.sitePrefixCode;
  }

  getInstanceId(): string | undefined {
    return this.config.get<string>('INSTANCE_ID') || undefined;
  }

  getTenantSlug(): string | undefined {
    return this.config.get<string>('TENANT_SLUG') || undefined;
  }

  getSyncInterval(): number {
    return parseInt(
      this.config.get<string>('SYNC_INTERVAL_MINUTES', '5'),
      10,
    );
  }

  getSyncBatchSize(): number {
    return parseInt(this.config.get<string>('SYNC_BATCH_SIZE', '500'), 10);
  }

  getSyncCloudApiUrl(): string | undefined {
    return this.config.get<string>('SYNC_CLOUD_API_URL') || undefined;
  }

  getSyncApiKey(): string | undefined {
    return this.config.get<string>('SYNC_API_KEY') || undefined;
  }

  getSyncRequestTimeout(): number {
    return parseInt(
      this.config.get<string>('SYNC_REQUEST_TIMEOUT_MS', '30000'),
      10,
    );
  }

  /**
   * Classify a table name into its sync category.
   * Returns 'excluded' for unknown tables (safe default).
   */
  getTableCategory(tableName: string): TableSyncCategory {
    if (this.excludedTables.has(tableName)) return 'excluded';
    if (this.masterTables.has(tableName)) return 'master';
    if (this.transactionalTables.has(tableName)) return 'transactional';
    return 'excluded';
  }

  /**
   * Whether this table should be tracked by the sync outbox middleware.
   */
  shouldTrackTable(tableName: string): boolean {
    if (!this.syncEnabled) return false;
    return this.getTableCategory(tableName) !== 'excluded';
  }

  getMasterTables(): ReadonlySet<string> {
    return this.masterTables;
  }

  getTransactionalTables(): ReadonlySet<string> {
    return this.transactionalTables;
  }

  getExcludedTables(): ReadonlySet<string> {
    return this.excludedTables;
  }

  // ── Private ─────────────────────────────────────────────────────────

  /**
   * Parse a comma-separated env var into an array, falling back to defaults.
   */
  private parseEnvList(envKey: string, defaults: string[]): string[] {
    const raw = this.config.get<string>(envKey);
    if (!raw) return defaults;
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
