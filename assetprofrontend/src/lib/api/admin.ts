import { api } from '../api';
import type {
  PaginatedResponse,
  DashboardStats,
  RecentActivity,
  FinancialOverview,
  AdminTenant,
  AdminTenantDetail,
  TenantModuleStatus,
  AdminPlan,
  AdminModule,
  SubscriptionStats,
  TenantGrowthPoint,
  RevenuePoint,
  ModuleUsagePoint,
  PlanDistributionPoint,
  PartnerPerformancePoint,
  Partner,
  PartnerDetail,
  SupportTicket,
  SupportTicketDetail,
  Announcement,
  ErrorLog,
  ErrorLogStats,
  CustomDomain,
  ContactMessage,
  EnterpriseQuote,
  InfrastructureCost,
  ExchangeRate,
  FinancialSummary,
  AuditLogEntry,
  WebsiteSetting,
  WebsitePage,
  WebsiteFaq,
  AdminInstance,
  AdminInstanceDetail,
  InstanceStats,
  InstanceHealthSummary,
  InstanceSyncLog,
  InstanceProvisionCommand,
  TenantBackup,
} from '@/types/admin';

// ============================================================================
// Dashboard
// ============================================================================

export const adminDashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get('/admin/dashboard/stats');
    return data;
  },

  getActivity: async (limit = 10): Promise<RecentActivity> => {
    const { data } = await api.get('/admin/dashboard/activity', { params: { limit } });
    return data;
  },

  getFinancial: async (): Promise<FinancialOverview> => {
    const { data } = await api.get('/admin/dashboard/financial');
    return data;
  },
};

// ============================================================================
// Tenants
// ============================================================================

export const adminTenantsApi = {
  list: async (params?: {
    skip?: number;
    take?: number;
    search?: string;
    status?: string;
    planId?: number;
    partnerId?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<AdminTenant>> => {
    const { data } = await api.get('/admin/tenants', { params });
    return data;
  },

  getOne: async (id: string): Promise<AdminTenantDetail> => {
    const { data } = await api.get(`/admin/tenants/${id}`);
    return data;
  },

  suspend: async (id: string, reason?: string): Promise<AdminTenant> => {
    const { data } = await api.post(`/admin/tenants/${id}/suspend`, { reason });
    return data;
  },

  activate: async (id: string): Promise<AdminTenant> => {
    const { data } = await api.post(`/admin/tenants/${id}/activate`);
    return data;
  },

  extendTrial: async (id: string, days: number): Promise<AdminTenant> => {
    const { data } = await api.post(`/admin/tenants/${id}/extend-trial`, { days });
    return data;
  },

  updatePlan: async (id: string, planId: number): Promise<AdminTenant> => {
    const { data } = await api.post(`/admin/tenants/${id}/plan`, { planId });
    return data;
  },

  grantModule: async (id: string, moduleId: number): Promise<unknown> => {
    const { data } = await api.post(`/admin/tenants/${id}/grant-modules`, { moduleId });
    return data;
  },

  removeModule: async (id: string, moduleId: number): Promise<unknown> => {
    const { data } = await api.delete(`/admin/tenants/${id}/remove-module/${moduleId}`);
    return data;
  },

  getModules: async (id: string): Promise<TenantModuleStatus[]> => {
    const { data } = await api.get(`/admin/tenants/${id}/modules`);
    return data;
  },

  toggleFeature: async (
    id: string,
    params: { moduleSlug: string; featureSlug: string; enabled: boolean },
  ): Promise<{ success: boolean }> => {
    const { data } = await api.post(`/admin/tenants/${id}/features/toggle`, params);
    return data;
  },
};

// ============================================================================
// Plans
// ============================================================================

export const adminPlansApi = {
  list: async (params?: { includeInactive?: boolean }): Promise<AdminPlan[]> => {
    const { data } = await api.get('/admin/plans', { params });
    return data;
  },

  getOne: async (id: number): Promise<AdminPlan> => {
    const { data } = await api.get(`/admin/plans/${id}`);
    return data;
  },

  create: async (planData: Partial<AdminPlan>): Promise<AdminPlan> => {
    const { data } = await api.post('/admin/plans', planData);
    return data;
  },

  update: async (id: number, planData: Partial<AdminPlan>): Promise<AdminPlan> => {
    const { data } = await api.put(`/admin/plans/${id}`, planData);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/plans/${id}`);
  },

  setModules: async (id: number, modules: unknown[]): Promise<void> => {
    await api.post(`/admin/plans/${id}/modules`, { modules });
  },
};

// ============================================================================
// Modules
// ============================================================================

export const adminModulesApi = {
  list: async (params?: {
    category?: string;
    includeInactive?: boolean;
  }): Promise<AdminModule[]> => {
    const { data } = await api.get('/admin/modules', { params });
    return data;
  },

  getCategories: async (): Promise<string[]> => {
    const { data } = await api.get('/admin/modules/categories');
    return data;
  },

  getOne: async (id: number): Promise<AdminModule> => {
    const { data } = await api.get(`/admin/modules/${id}`);
    return data;
  },

  create: async (moduleData: Partial<AdminModule>): Promise<AdminModule> => {
    const { data } = await api.post('/admin/modules', moduleData);
    return data;
  },

  update: async (id: number, moduleData: Partial<AdminModule>): Promise<AdminModule> => {
    const { data } = await api.put(`/admin/modules/${id}`, moduleData);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/modules/${id}`);
  },
};

// ============================================================================
// Analytics
// ============================================================================

export const adminAnalyticsApi = {
  getSubscriptionStats: async (): Promise<SubscriptionStats> => {
    const { data } = await api.get('/admin/analytics/subscriptions');
    return data;
  },

  getTenantGrowth: async (months = 12): Promise<TenantGrowthPoint[]> => {
    const { data } = await api.get('/admin/analytics/tenant-growth', { params: { months } });
    return data;
  },

  getRevenue: async (): Promise<RevenuePoint[]> => {
    const { data } = await api.get('/admin/analytics/revenue');
    return data;
  },

  getModuleUsage: async (): Promise<ModuleUsagePoint[]> => {
    const { data } = await api.get('/admin/analytics/module-usage');
    return data;
  },

  getPlanDistribution: async (): Promise<PlanDistributionPoint[]> => {
    const { data } = await api.get('/admin/analytics/plan-distribution');
    return data;
  },

  getPartnerPerformance: async (): Promise<PartnerPerformancePoint[]> => {
    const { data } = await api.get('/admin/analytics/partner-performance');
    return data;
  },
};

// ============================================================================
// Infrastructure
// ============================================================================

export const adminInfrastructureApi = {
  getCosts: async (params?: {
    billingPeriod?: string;
    provider?: string;
  }): Promise<InfrastructureCost[]> => {
    const { data } = await api.get('/admin/infrastructure/costs', { params });
    return data;
  },

  getCostsSummary: async (): Promise<unknown[]> => {
    const { data } = await api.get('/admin/infrastructure/costs/summary');
    return data;
  },

  addCost: async (costData: {
    provider: string;
    resourceId: string;
    resourceType: string;
    name: string;
    amountUsd: number;
    amountNgn?: number;
    billingPeriod: string;
    metadata?: Record<string, unknown>;
  }): Promise<InfrastructureCost> => {
    const { data } = await api.post('/admin/infrastructure/costs', costData);
    return data;
  },

  getExchangeRates: async (): Promise<ExchangeRate[]> => {
    const { data } = await api.get('/admin/infrastructure/exchange-rates');
    return data;
  },

  getCurrentRate: async (from = 'USD', to = 'NGN'): Promise<ExchangeRate> => {
    const { data } = await api.get('/admin/infrastructure/exchange-rates/current', {
      params: { from, to },
    });
    return data;
  },

  setExchangeRate: async (rateData: {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
  }): Promise<ExchangeRate> => {
    const { data } = await api.post('/admin/infrastructure/exchange-rates', rateData);
    return data;
  },

  getFinancialSummaries: async (months = 12): Promise<FinancialSummary[]> => {
    const { data } = await api.get('/admin/infrastructure/financial-summaries', {
      params: { months },
    });
    return data;
  },

  updateFinancialSummary: async (
    summaryData: { month: string } & Partial<FinancialSummary>,
  ): Promise<FinancialSummary> => {
    const { data } = await api.post('/admin/infrastructure/financial-summaries', summaryData);
    return data;
  },
};

// ============================================================================
// Audit Logs
// ============================================================================

export const adminAuditLogApi = {
  list: async (params?: {
    skip?: number;
    take?: number;
    adminId?: number;
    action?: string;
    tenantId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<AuditLogEntry>> => {
    const { data } = await api.get('/admin/audit-logs', { params });
    return data;
  },

  getActions: async (): Promise<string[]> => {
    const { data } = await api.get('/admin/audit-logs/actions');
    return data;
  },
};

// ============================================================================
// Partners
// ============================================================================

export const adminPartnersApi = {
  list: async (params?: {
    skip?: number;
    take?: number;
    status?: string;
    search?: string;
  }): Promise<PaginatedResponse<Partner>> => {
    const { data } = await api.get('/admin/partners', { params });
    return data;
  },

  getOne: async (id: number): Promise<PartnerDetail> => {
    const { data } = await api.get(`/admin/partners/${id}`);
    return data;
  },

  create: async (partnerData: Partial<Partner>): Promise<Partner> => {
    const { data } = await api.post('/admin/partners', partnerData);
    return data;
  },

  update: async (id: number, partnerData: Partial<Partner>): Promise<Partner> => {
    const { data } = await api.put(`/admin/partners/${id}`, partnerData);
    return data;
  },

  approve: async (id: number): Promise<Partner> => {
    const { data } = await api.post(`/admin/partners/${id}/approve`);
    return data;
  },

  suspend: async (id: number, reason: string): Promise<Partner> => {
    const { data } = await api.post(`/admin/partners/${id}/suspend`, { reason });
    return data;
  },

  createUser: async (
    partnerId: number,
    userData: { name: string; email: string; password: string; role?: string },
  ): Promise<unknown> => {
    const { data } = await api.post(`/admin/partners/${partnerId}/users`, userData);
    return data;
  },
};

// ============================================================================
// Support
// ============================================================================

export const adminSupportApi = {
  list: async (params?: {
    skip?: number;
    take?: number;
    status?: string;
    priority?: string;
    tenantId?: string;
  }): Promise<PaginatedResponse<SupportTicket>> => {
    const { data } = await api.get('/admin/support', { params });
    return data;
  },

  getOne: async (id: number): Promise<SupportTicketDetail> => {
    const { data } = await api.get(`/admin/support/${id}`);
    return data;
  },

  create: async (ticketData: {
    subject: string;
    description?: string;
    priority?: string;
    tenantId?: string;
  }): Promise<SupportTicket> => {
    const { data } = await api.post('/admin/support', ticketData);
    return data;
  },

  update: async (id: number, ticketData: Partial<SupportTicket>): Promise<SupportTicket> => {
    const { data } = await api.put(`/admin/support/${id}`, ticketData);
    return data;
  },

  assign: async (id: number): Promise<SupportTicket> => {
    const { data } = await api.post(`/admin/support/${id}/assign`);
    return data;
  },

  reply: async (
    id: number,
    message: string,
    isInternalNote = false,
  ): Promise<unknown> => {
    const { data } = await api.post(`/admin/support/${id}/reply`, { message, isInternalNote });
    return data;
  },

  resolve: async (id: number): Promise<SupportTicket> => {
    const { data } = await api.post(`/admin/support/${id}/resolve`);
    return data;
  },

  close: async (id: number): Promise<SupportTicket> => {
    const { data } = await api.post(`/admin/support/${id}/close`);
    return data;
  },
};

// ============================================================================
// Announcements
// ============================================================================

export const adminAnnouncementsApi = {
  list: async (params?: {
    skip?: number;
    take?: number;
    isActive?: boolean;
  }): Promise<PaginatedResponse<Announcement>> => {
    const { data } = await api.get('/admin/announcements', { params });
    return data;
  },

  getOne: async (id: number): Promise<Announcement> => {
    const { data } = await api.get(`/admin/announcements/${id}`);
    return data;
  },

  create: async (announcementData: Partial<Announcement>): Promise<Announcement> => {
    const { data } = await api.post('/admin/announcements', announcementData);
    return data;
  },

  update: async (id: number, announcementData: Partial<Announcement>): Promise<Announcement> => {
    const { data } = await api.put(`/admin/announcements/${id}`, announcementData);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/announcements/${id}`);
  },

  toggleActive: async (id: number): Promise<Announcement> => {
    const { data } = await api.post(`/admin/announcements/${id}/toggle-active`);
    return data;
  },
};

// ============================================================================
// Error Logs
// ============================================================================

export const adminErrorLogsApi = {
  list: async (params?: {
    skip?: number;
    take?: number;
    resolved?: boolean;
    tenantId?: string;
  }): Promise<PaginatedResponse<ErrorLog>> => {
    const { data } = await api.get('/admin/error-logs', { params });
    return data;
  },

  getStats: async (): Promise<ErrorLogStats> => {
    const { data } = await api.get('/admin/error-logs/stats');
    return data;
  },

  getOne: async (id: number): Promise<ErrorLog> => {
    const { data } = await api.get(`/admin/error-logs/${id}`);
    return data;
  },

  resolve: async (id: number): Promise<ErrorLog> => {
    const { data } = await api.post(`/admin/error-logs/${id}/resolve`);
    return data;
  },

  bulkResolve: async (ids: number[]): Promise<{ count: number }> => {
    const { data } = await api.post('/admin/error-logs/bulk-resolve', { ids });
    return data;
  },
};

// ============================================================================
// Domains
// ============================================================================

export const adminDomainsApi = {
  list: async (params?: {
    skip?: number;
    take?: number;
    tenantId?: string;
    verificationStatus?: string;
  }): Promise<PaginatedResponse<CustomDomain>> => {
    const { data } = await api.get('/admin/domains', { params });
    return data;
  },

  getOne: async (id: number): Promise<CustomDomain> => {
    const { data } = await api.get(`/admin/domains/${id}`);
    return data;
  },

  verifyDns: async (id: number): Promise<CustomDomain> => {
    const { data } = await api.post(`/admin/domains/${id}/verify-dns`);
    return data;
  },

  issueSsl: async (id: number): Promise<CustomDomain> => {
    const { data } = await api.post(`/admin/domains/${id}/issue-ssl`);
    return data;
  },

  toggleActive: async (id: number): Promise<CustomDomain> => {
    const { data } = await api.post(`/admin/domains/${id}/toggle-active`);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/domains/${id}`);
  },
};

// ============================================================================
// Contact Messages
// ============================================================================

export const adminContactMessagesApi = {
  list: async (params?: {
    skip?: number;
    take?: number;
    status?: string;
  }): Promise<PaginatedResponse<ContactMessage>> => {
    const { data } = await api.get('/admin/contact-messages', { params });
    return data;
  },

  getOne: async (id: number): Promise<ContactMessage> => {
    const { data } = await api.get(`/admin/contact-messages/${id}`);
    return data;
  },

  markAsRead: async (id: number): Promise<ContactMessage> => {
    const { data } = await api.post(`/admin/contact-messages/${id}/mark-read`);
    return data;
  },

  markAsReplied: async (id: number): Promise<ContactMessage> => {
    const { data } = await api.post(`/admin/contact-messages/${id}/mark-replied`);
    return data;
  },

  archive: async (id: number): Promise<ContactMessage> => {
    const { data } = await api.post(`/admin/contact-messages/${id}/archive`);
    return data;
  },

  addNotes: async (id: number, notes: string): Promise<ContactMessage> => {
    const { data } = await api.post(`/admin/contact-messages/${id}/notes`, { notes });
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/contact-messages/${id}`);
  },
};

// ============================================================================
// Enterprise Quotes
// ============================================================================

export const adminEnterpriseQuotesApi = {
  list: async (params?: {
    skip?: number;
    take?: number;
    status?: string;
  }): Promise<PaginatedResponse<EnterpriseQuote>> => {
    const { data } = await api.get('/admin/enterprise-quotes', { params });
    return data;
  },

  getOne: async (id: number): Promise<EnterpriseQuote> => {
    const { data } = await api.get(`/admin/enterprise-quotes/${id}`);
    return data;
  },

  assign: async (id: number): Promise<EnterpriseQuote> => {
    const { data } = await api.post(`/admin/enterprise-quotes/${id}/assign`);
    return data;
  },

  updateStatus: async (id: number, status: string): Promise<EnterpriseQuote> => {
    const { data } = await api.post(`/admin/enterprise-quotes/${id}/status`, { status });
    return data;
  },

  addQuote: async (
    id: number,
    quoteData: { modules?: string[]; amount?: number; message?: string },
  ): Promise<EnterpriseQuote> => {
    const { data } = await api.post(`/admin/enterprise-quotes/${id}/quote`, quoteData);
    return data;
  },

  addNotes: async (id: number, notes: string): Promise<EnterpriseQuote> => {
    const { data } = await api.post(`/admin/enterprise-quotes/${id}/notes`, { notes });
    return data;
  },
};

// ============================================================================
// Website
// ============================================================================

export const adminWebsiteApi = {
  getSettings: async (group?: string): Promise<WebsiteSetting[]> => {
    const { data } = await api.get('/admin/website/settings', { params: { group } });
    return data;
  },

  updateSetting: async (key: string, value: string): Promise<WebsiteSetting> => {
    const { data } = await api.post('/admin/website/settings', { key, value });
    return data;
  },

  getPages: async (): Promise<WebsitePage[]> => {
    const { data } = await api.get('/admin/website/pages');
    return data;
  },

  createPage: async (pageData: Partial<WebsitePage>): Promise<WebsitePage> => {
    const { data } = await api.post('/admin/website/pages', pageData);
    return data;
  },

  updatePage: async (id: number, pageData: Partial<WebsitePage>): Promise<WebsitePage> => {
    const { data } = await api.put(`/admin/website/pages/${id}`, pageData);
    return data;
  },

  deletePage: async (id: number): Promise<void> => {
    await api.delete(`/admin/website/pages/${id}`);
  },

  getFaqs: async (category?: string): Promise<WebsiteFaq[]> => {
    const { data } = await api.get('/admin/website/faqs', { params: { category } });
    return data;
  },

  createFaq: async (faqData: Partial<WebsiteFaq>): Promise<WebsiteFaq> => {
    const { data } = await api.post('/admin/website/faqs', faqData);
    return data;
  },

  updateFaq: async (id: number, faqData: Partial<WebsiteFaq>): Promise<WebsiteFaq> => {
    const { data } = await api.put(`/admin/website/faqs/${id}`, faqData);
    return data;
  },

  deleteFaq: async (id: number): Promise<void> => {
    await api.delete(`/admin/website/faqs/${id}`);
  },
};

// ============================================================================
// Tenant Backups
// ============================================================================

export const adminBackupsApi = {
  list: async (params?: {
    tenantId?: string;
    skip?: number;
    take?: number;
    status?: string;
  }): Promise<{ data: TenantBackup[]; total: number }> => {
    const { data } = await api.get('/admin/backups', { params });
    return data;
  },

  create: async (tenantId: string, notes?: string): Promise<TenantBackup> => {
    const { data } = await api.post(`/admin/backups/${tenantId}`, { notes });
    return data;
  },

  getOne: async (id: number): Promise<TenantBackup> => {
    const { data } = await api.get(`/admin/backups/${id}`);
    return data;
  },

  download: async (id: number): Promise<void> => {
    const response = await api.get(`/admin/backups/${id}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const filename = response.headers['content-disposition']
      ?.split('filename="')[1]
      ?.replace('"', '') || `backup_${id}.dump`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  restore: async (id: number, targetTenantId: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post(`/admin/backups/${id}/restore`, { targetTenantId });
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/backups/${id}`);
  },

  triggerScheduled: async (): Promise<{ message: string; count: number }> => {
    const { data } = await api.post('/admin/backups/scheduled/run');
    return data;
  },

  cleanup: async (): Promise<{ cleaned: number }> => {
    const { data } = await api.post('/admin/backups/cleanup');
    return data;
  },
};

// ============================================================================
// On-Premise Instances
// ============================================================================

export const adminInstancesApi = {
  list: async (params?: {
    skip?: number;
    take?: number;
    search?: string;
    status?: string;
    tenantId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: AdminInstance[]; meta: { total: number; skip: number; take: number; totalPages: number } }> => {
    const { data } = await api.get('/admin/instances', { params });
    return data;
  },

  getOne: async (id: number): Promise<AdminInstanceDetail> => {
    const { data } = await api.get(`/admin/instances/${id}`);
    return data;
  },

  getStats: async (): Promise<InstanceStats> => {
    const { data } = await api.get('/admin/instances/stats');
    return data;
  },

  getHealth: async (id: number): Promise<InstanceHealthSummary> => {
    const { data } = await api.get(`/admin/instances/${id}/health`);
    return data;
  },

  getSyncLogs: async (
    id: number,
    params?: { skip?: number; take?: number },
  ): Promise<{ data: InstanceSyncLog[]; meta: { total: number; skip: number; take: number; totalPages: number } }> => {
    const { data } = await api.get(`/admin/instances/${id}/sync-logs`, { params });
    return data;
  },

  getProvisionCommand: async (id: number): Promise<InstanceProvisionCommand> => {
    const { data } = await api.get(`/admin/instances/${id}/provision-command`);
    return data;
  },

  updateConfig: async (
    id: number,
    config: {
      updatePolicy?: string;
      updateWindowStart?: string;
      updateWindowEnd?: string;
      pinnedVersion?: string;
      gitBranch?: string;
    },
  ): Promise<AdminInstance> => {
    const { data } = await api.post(`/admin/instances/${id}/config`, config);
    return data;
  },

  deactivate: async (id: number): Promise<AdminInstance> => {
    const { data } = await api.post(`/admin/instances/${id}/deactivate`);
    return data;
  },

  reactivate: async (id: number): Promise<AdminInstance> => {
    const { data } = await api.post(`/admin/instances/${id}/reactivate`);
    return data;
  },

  renewLicense: async (id: number, days: number): Promise<AdminInstance> => {
    const { data } = await api.post(`/admin/instances/${id}/renew-license`, { days });
    return data;
  },
};
