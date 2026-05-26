// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export type AuditEvent = 'created' | 'updated' | 'deleted' | 'restored';

export interface AuditUser {
  id: number;
  name: string;
  email: string;
  initials?: string;
}

export interface AuditChange {
  field: string;
  fieldLabel: string;
  oldValue: unknown;
  newValue: unknown;
  type: 'added' | 'removed' | 'modified';
}

export interface AuditLog {
  id: number;
  event: AuditEvent;
  eventLabel: string;
  eventColor: string;
  auditableType: string;
  auditableTypeLabel: string;
  auditableId: number;
  userId: number | null;
  user: AuditUser | null;
  userName: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changes: AuditChange[];
  ipAddress: string | null;
  userAgent: string | null;
  userAgentShort: string | null;
  url: string | null;
  tags: string | null;
  companyId: number | null;
  branchId: number | null;
  createdAt: string;
  createdAtFormatted: string;
  createdAtRelative: string;
  createdAtDate: string;
  createdAtTime: string;
  previousAuditId?: number | null;
  nextAuditId?: number | null;
}

export interface AuditLogStats {
  total: number;
  today: number;
  thisWeek: number;
  created: number;
  updated: number;
  deleted: number;
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  search?: string;
  event?: AuditEvent;
  entityType?: string;
  userId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface AuditLogEntityType {
  value: string;
  label: string;
  full: string;
}

export interface AuditLogListResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
