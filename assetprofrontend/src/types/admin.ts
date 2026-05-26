// ============================================================================
// Central Admin Types
// ============================================================================

// --- Pagination ---

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    skip: number;
    take: number;
    totalPages: number;
  };
  total?: number; // legacy — some endpoints return total at root
  skip?: number;
  take?: number;
}

// --- Dashboard ---

export interface DashboardStats {
  tenants: { total: number; active: number; trial: number; suspended: number };
  plans: { total: number; active: number };
  modules: { total: number; active: number };
  partners: { total: number; active: number };
  support: { openTickets: number; unresolvedErrors: number };
  announcements: { total: number; active: number };
  inquiries: { contactMessages: number; enterpriseQuotes: number };
}

export interface RecentActivity {
  recentTenants: AdminTenant[];
  recentTickets: SupportTicket[];
  recentErrors: ErrorLog[];
}

export interface FinancialOverview {
  latestSummary: FinancialSummary | null;
  subscriptionStats: {
    active: number;
    trial: number;
    pastDue: number;
    cancelled: number;
  };
}

// --- Tenants ---

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  subscription?: {
    id: number;
    status: string;
    billingCycle: string;
    amount: number | string;
    currency: string;
    trialEndsAt?: string;
    currentPeriodEnd?: string;
    plan: { id: number; name: string; slug: string };
  };
  partner?: { id: number; name: string };
  domains?: { id: number; domain: string; isActive: boolean }[];
  _count?: { users: number; companies: number };
}

export interface AdminTenantDetail extends AdminTenant {
  subscription?: AdminTenant['subscription'] & {
    modules: {
      id: number;
      moduleId: number;
      status: string;
      enabledAt?: string;
      amount: number | string;
      isIncluded: boolean;
      enabledFeatures: string[];
      module: { id: number; name: string; slug: string; category: string };
    }[];
    invoices: {
      id: number;
      invoiceNumber: string;
      type: string;
      status: string;
      total: number | string;
      createdAt: string;
    }[];
    changeHistory: {
      id: number;
      changeType: string;
      reason?: string;
      initiatedSource: string;
      effectiveAt: string;
      metadata?: Record<string, unknown>;
      createdAt: string;
    }[];
  };
}

export interface TenantModuleStatus {
  slug: string;
  name: string;
  isCore: boolean;
  isEnabled: boolean;
  status: 'enabled' | 'disabled' | 'trial' | 'read_only';
  features: {
    code: string;
    name: string;
    module: string;
    isCore: boolean;
    includedInPlan: boolean;
    isEnabled: boolean;
    canToggle: boolean;
    limits?: Record<string, unknown>;
  }[];
  limits?: Record<string, unknown>;
}

// --- Plans ---

export interface AdminPlan {
  id: number;
  name: string;
  slug: string;
  description?: string;
  priceMonthly: number | string;
  priceYearly: number | string;
  currency: string;
  maxUsers: number;
  maxCompanies: number;
  maxBranches: number;
  maxStorageGb: number;
  trialDays: number;
  isActive: boolean;
  isEnterprise: boolean;
  isPopular: boolean;
  badgeText?: string;
  sortOrder: number;
  _count?: { subscriptions: number };
  modules?: AdminPlanModule[];
}

export interface AdminPlanModule {
  id: number;
  moduleId: number;
  isIncluded: boolean;
  isAvailableAddon: boolean;
  addonPriceMonthly?: number | string;
  addonPriceYearly?: number | string;
  module: { id: number; name: string; slug: string; category: string };
  planModuleFeatures?: {
    id: number;
    featureId: number;
    isEnabled: boolean;
    feature: { id: number; slug: string; name: string };
  }[];
}

// --- Modules ---

export interface AdminModule {
  id: number;
  name: string;
  slug: string;
  description?: string;
  category: string;
  isCore: boolean;
  isActive: boolean;
  icon?: string;
  priceMonthly?: number | string;
  priceYearly?: number | string;
  sortOrder: number;
  _count?: { subscriptionModules: number };
}

// --- Analytics ---

export interface SubscriptionStats {
  [status: string]: number;
}

export interface TenantGrowthPoint {
  month: string;
  count: number;
}

export interface RevenuePoint {
  month: string;
  mrr: number | string;
  arr: number | string;
  totalRevenue: number | string;
  netRevenue: number | string;
}

export interface ModuleUsagePoint {
  moduleId: number;
  name: string;
  slug: string;
  count: number;
}

export interface PlanDistributionPoint {
  planId: number;
  name: string;
  count: number;
}

export interface PartnerPerformancePoint {
  partnerId: number;
  name: string;
  tenantCount: number;
}

// --- Partners ---

export interface Partner {
  id: number;
  name: string;
  email: string;
  phone?: string;
  referralCode: string;
  commissionRate?: number | string;
  status: string;
  createdAt: string;
  _count?: { tenants: number };
}

export interface PartnerDetail extends Partner {
  users: { id: number; name: string; email: string; role: string }[];
  tenants: AdminTenant[];
}

// --- Support ---

export interface SupportTicket {
  id: number;
  ticketNumber: string;
  subject: string;
  description?: string;
  status: string;
  priority: string;
  tenantId?: string;
  assigneeId?: number;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  tenant?: { id: string; name: string };
  assignee?: { id: number; name: string; email: string };
}

export interface SupportTicketDetail extends SupportTicket {
  replies: TicketReply[];
}

export interface TicketReply {
  id: number;
  ticketId: number;
  message: string;
  isInternalNote: boolean;
  adminId?: number;
  admin?: { id: number; name: string };
  createdAt: string;
}

// --- Announcements ---

export interface Announcement {
  id: number;
  title: string;
  content: string;
  type: string;
  isActive: boolean;
  targetTenantIds?: string[];
  targetPlanIds?: number[];
  isGlobal: boolean;
  publishedAt?: string;
  expiresAt?: string;
  createdAt: string;
  creator?: { id: number; name: string };
}

// --- Error Logs ---

export interface ErrorLog {
  id: number;
  exceptionClass?: string;
  message: string;
  stackTrace?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  tenantId?: string;
  userId?: string;
  occurrences: number;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedById?: number;
  createdAt: string;
  tenant?: { id: string; name: string };
  resolvedBy?: { id: number; name: string };
}

export interface ErrorLogStats {
  total: number;
  unresolved: number;
  today: number;
  byTenant: { tenantId: string; tenantName: string; count: number }[];
}

// --- Domains ---

export interface CustomDomain {
  id: number;
  domain: string;
  tenantId: string;
  verificationStatus: string;
  isActive: boolean;
  sslStatus?: string;
  sslExpiresAt?: string;
  verifiedAt?: string;
  createdAt: string;
  tenant?: { id: string; name: string };
  verificationLogs?: { id: number; action: string; result: string; createdAt: string }[];
}

// --- Contact Messages ---

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  adminNotes?: string;
  readAt?: string;
  repliedAt?: string;
  archivedAt?: string;
  createdAt: string;
}

// --- Enterprise Quotes ---

export interface EnterpriseQuote {
  id: number;
  referenceNumber: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  companySize?: string;
  requirements?: string;
  status: string;
  assigneeId?: number;
  assignee?: { id: number; name: string };
  quotedAmount?: number | string;
  quotedModules?: string[];
  quoteMessage?: string;
  adminNotes?: string;
  readAt?: string;
  respondedAt?: string;
  convertedAt?: string;
  createdAt: string;
}

// --- Infrastructure ---

export interface InfrastructureCost {
  id: number;
  provider: string;
  resourceId: string;
  resourceType: string;
  name: string;
  amountUsd: number | string;
  amountNgn?: number | string;
  billingPeriod: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ExchangeRate {
  id: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number | string;
  source?: string;
  validFrom: string;
  validTo?: string;
  createdAt: string;
}

export interface FinancialSummary {
  id: number;
  month: string;
  mrr: number | string;
  arr: number | string;
  activeSubscriptions: number;
  newSubscriptions: number;
  churned: number;
  upgrades: number;
  downgrades: number;
  totalRevenue: number | string;
  infrastructureCost: number | string;
  netRevenue: number | string;
  currency: string;
}

// --- Audit Logs ---

export interface AuditLogEntry {
  id: number;
  adminId: number;
  action: string;
  entityType?: string;
  entityId?: string;
  tenantId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  admin?: { id: number; name: string; email: string };
}

// --- Website ---

export interface WebsiteSetting {
  id: number;
  key: string;
  value: string;
  group?: string;
}

export interface WebsitePage {
  id: number;
  title: string;
  slug: string;
  content: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface WebsiteFaq {
  id: number;
  question: string;
  answer: string;
  category?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

// --- On-Premise Instances ---

export type InstanceStatus = 'online' | 'offline' | 'updating' | 'error' | 'provisioning';

export interface AdminInstance {
  id: number;
  tenantId: string;
  instanceId: string;
  name: string;
  version: string;
  status: InstanceStatus;
  licenseKey: string;
  licenseExpiresAt: string;
  lastHeartbeatAt?: string;
  lastSyncAt?: string;
  syncQueueDepth: number;
  diskUsagePercent: number;
  updatePolicy: string;
  updateWindowStart?: string;
  updateWindowEnd?: string;
  pinnedVersion?: string;
  gitBranch: string;
  containerHealth?: Record<string, string>;
  sitePrefixCode: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  tenant?: { id: string; name: string; slug: string };
  _count?: {
    heartbeats: number;
    syncLogs: number;
    updateLogs: number;
    backupRecords: number;
  };
}

export interface AdminInstanceDetail extends AdminInstance {
  tenant?: { id: string; name: string; slug: string; email: string };
  heartbeats: InstanceHeartbeat[];
  syncLogs: InstanceSyncLog[];
  updateLogs: InstanceUpdateLog[];
  backupRecords: InstanceBackupRecord[];
  moduleOwnerships: InstanceModuleOwnership[];
}

export interface InstanceHeartbeat {
  id: number;
  instanceId: number;
  version: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  diskUsagePercent: number;
  syncQueueDepth: number;
  containerHealth: Record<string, string>;
  uptimeSeconds: number;
  createdAt: string;
}

export interface InstanceSyncLog {
  id: number;
  tenantId: string;
  instanceId?: number;
  syncId: string;
  direction: 'push' | 'pull' | 'both';
  startedAt: string;
  completedAt?: string;
  status: 'success' | 'partial' | 'failed';
  recordsPushed: number;
  recordsPulled: number;
  conflictsDetected: number;
  conflictsResolved: number;
  errors?: unknown[];
  durationMs?: number;
  bytesTransferred?: number;
  createdAt: string;
}

export interface InstanceUpdateLog {
  id: number;
  instanceId?: number;
  fromVersion: string;
  toVersion: string;
  status: string;
  migrationsRun?: string[];
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  rollbackReason?: string;
  error?: string;
}

export interface InstanceBackupRecord {
  id: number;
  instanceId?: number;
  fileName: string;
  fileSizeBytes?: number;
  destination: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

export interface TenantBackup {
  id: number;
  tenantId: string;
  schemaName: string;
  filename: string;
  sizeBytes: number;
  checksum: string | null;
  status: 'in_progress' | 'completed' | 'failed' | 'expired' | 'deleted';
  notes: string | null;
  createdBy: string | null;
  isScheduled: boolean;
  restoredAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  tenant?: { id: string; name: string; slug: string };
}

export interface InstanceModuleOwnership {
  id: number;
  tenantId: string;
  instanceId?: number;
  moduleSlug: string;
  ownership: 'on_premise_primary' | 'cloud_primary' | 'bidirectional';
  conflictStrategy: 'last_write_wins' | 'on_premise_wins' | 'cloud_wins' | 'flag_for_review';
  syncEnabled: boolean;
  lastSyncAt?: string;
}

export interface InstanceStats {
  total: number;
  online: number;
  offline: number;
  updating: number;
  error: number;
  provisioning: number;
}

export interface InstanceHealthSummary {
  heartbeats: InstanceHeartbeat[];
  averages: { cpu: number; memory: number; disk: number; syncQueue: number };
  uptimePercent: number;
}

export interface InstanceProvisionCommand {
  instanceId: string;
  tenantSlug: string;
  sitePrefixCode: string;
  command: string;
  envSnippet: string;
}
