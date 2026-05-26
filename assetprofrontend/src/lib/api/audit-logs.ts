import { api } from '../api';
import type {
  AuditLog,
  AuditLogStats,
  AuditLogQuery,
  AuditLogEntityType,
  AuditLogListResponse,
} from '@/types/audit-logs';
import type { User } from '@/types/core';

// ============================================================================
// AUDIT LOGS API
// ============================================================================

export const auditLogsApi = {
  /**
   * List audit logs with filters and pagination
   */
  list: async (query?: AuditLogQuery): Promise<AuditLogListResponse> => {
    const response = await api.get('/core/audit-logs', { params: query });
    return response.data;
  },

  /**
   * Get a single audit log by ID
   */
  get: async (id: number): Promise<AuditLog> => {
    const response = await api.get(`/core/audit-logs/${id}`);
    return response.data;
  },

  /**
   * Get audit log statistics
   */
  getStats: async (): Promise<AuditLogStats> => {
    const response = await api.get('/core/audit-logs/stats');
    return response.data;
  },

  /**
   * Get unique entity types for filter dropdown
   */
  getEntityTypes: async (): Promise<AuditLogEntityType[]> => {
    const response = await api.get('/core/audit-logs/entity-types');
    return response.data;
  },

  /**
   * Get users who have audit entries (for filter dropdown)
   */
  getUsers: async (): Promise<Pick<User, 'id' | 'name'>[]> => {
    const response = await api.get('/core/audit-logs/users');
    return response.data;
  },

  /**
   * Get audit history for a specific entity
   */
  getEntityHistory: async (
    entityType: string,
    entityId: number,
    query?: { page?: number; limit?: number }
  ): Promise<AuditLogListResponse> => {
    const response = await api.get(`/core/audit-logs/entity/${entityType}/${entityId}`, {
      params: query,
    });
    return response.data;
  },

  /**
   * Export audit logs to CSV
   */
  exportCsv: async (query?: Omit<AuditLogQuery, 'page' | 'limit'>): Promise<void> => {
    const response = await api.get('/core/audit-logs/export', {
      params: {
        search: query?.search,
        event: query?.event,
        entityType: query?.entityType,
        userId: query?.userId,
        dateFrom: query?.dateFrom,
        dateTo: query?.dateTo,
      },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
