import { api } from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DmsDocumentStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'SUPERSEDED';

export interface DmsApprovalStatus {
  id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'WAITING';
  progress: { completed: number; total: number; percentage: number };
  currentStep: { name: string; stepOrder: number } | null;
  canCurrentUserApprove: boolean;
  actions: Array<{ id: number; action: string; comment: string | null; createdAt: string; approverName: string | null }>;
}

export interface DmsDocument {
  id: number;
  companyId: number;
  documentCode: string;
  title: string;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  tags: string[] | null;
  fileName: string;
  storedFileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  fileHash: string;
  sourceModule: string | null;
  sourceEntity: string | null;
  sourceEntityId: number | null;
  versionNumber: number;
  parentDocumentId: number | null;
  isLatestVersion: boolean;
  retentionPolicy: string | null;
  retainUntil: string | null;
  expiresAt: string | null;
  extractedText: string | null;
  approvalStatusId: number | null;
  status: DmsDocumentStatus;
  isConfidential: boolean;
  isArchived: boolean;
  archivedAt: string | null;
  createdBy: number;
  createdByName: string | null;
  updatedBy: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  fileUrl?: string;
}

export interface DmsDocumentCategory {
  id: number;
  companyId: number;
  name: string;
  slug: string;
  parentId: number | null;
  color: string | null;
  icon: string | null;
  retentionDays: number | null;
  requiresApproval: boolean;
  isActive: boolean;
  sortOrder: number;
  documentCount?: number;
  children?: DmsDocumentCategory[];
}

export interface DocumentQueryParams {
  search?: string;
  categoryId?: number;
  status?: string;
  sourceModule?: string;
  sourceEntity?: string;
  sourceEntityId?: number;
  isArchived?: boolean;
  isConfidential?: boolean;
  page?: number;
  limit?: number;
}

export interface DocumentListResult {
  data: DmsDocument[];
  total: number;
  page: number;
  limit: number;
}

export interface DocumentStats {
  total: number;
  byStatus: Record<string, number>;
  totalSizeMB: number;
  recentUploads: number;
  pendingApproval: number;
}

export interface StorageReport {
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  byCategory: Array<{ categoryId: number | null; categoryName: string | null; fileCount: number; totalSizeBytes: number }>;
  byModule: Array<{ sourceModule: string | null; fileCount: number; totalSizeBytes: number }>;
  byMimeType: Array<{ mimeType: string; fileCount: number; totalSizeBytes: number }>;
  byMonth: Array<{ month: string; fileCount: number; totalSizeBytes: number }>;
}

export interface ActivityReportRow {
  id: number;
  documentId: number;
  documentTitle: string | null;
  action: string;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
  userName: string | null;
}

export interface ActivityReport {
  data: ActivityReportRow[];
  total: number;
  page: number;
  limit: number;
  actionSummary: Array<{ action: string; count: number }>;
}

export interface RetentionReportItem {
  id: number;
  documentCode: string;
  title: string;
  expiresAt: string;
  categoryName: string | null;
  status: string;
}

export interface RetentionReport {
  expiredCount: number;
  expiringIn7Days: number;
  expiringIn30Days: number;
  noPolicyCount: number;
  expired: RetentionReportItem[];
  expiringSoon: RetentionReportItem[];
  noPolicy: Array<{ id: number; documentCode: string; title: string; createdAt: string; categoryName: string | null }>;
}

export interface CreateDocumentPayload {
  title?: string;
  description?: string;
  categoryId?: number;
  tags?: string[];
  sourceModule?: string;
  sourceEntity?: string;
  sourceEntityId?: number;
  retentionPolicy?: string;
  isConfidential?: boolean;
}

export interface CreateCategoryPayload {
  name: string;
  slug: string;
  parentId?: number;
  color?: string;
  icon?: string;
  retentionDays?: number;
  requiresApproval?: boolean;
  sortOrder?: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const documentsApi = {
  // Documents
  getStats: async (): Promise<DocumentStats> => {
    const res = await api.get('/documents/stats');
    return res.data;
  },

  list: async (params: DocumentQueryParams = {}): Promise<DocumentListResult> => {
    const res = await api.get('/documents', { params });
    return res.data;
  },

  get: async (id: number): Promise<DmsDocument> => {
    const res = await api.get(`/documents/${id}`);
    return res.data;
  },

  upload: async (file: File, payload: CreateDocumentPayload): Promise<DmsDocument> => {
    const form = new FormData();
    form.append('file', file);
    if (payload.title) form.append('title', payload.title);
    if (payload.description) form.append('description', payload.description);
    if (payload.categoryId != null) form.append('categoryId', String(payload.categoryId));
    if (payload.tags?.length) payload.tags.forEach((t) => form.append('tags[]', t));
    if (payload.sourceModule) form.append('sourceModule', payload.sourceModule);
    if (payload.sourceEntity) form.append('sourceEntity', payload.sourceEntity);
    if (payload.sourceEntityId != null) form.append('sourceEntityId', String(payload.sourceEntityId));
    if (payload.retentionPolicy) form.append('retentionPolicy', payload.retentionPolicy);
    if (payload.isConfidential != null) form.append('isConfidential', String(payload.isConfidential));

    const res = await api.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  createVersion: async (id: number, file: File): Promise<DmsDocument> => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post(`/documents/${id}/versions`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getVersions: async (id: number): Promise<DmsDocument[]> => {
    const res = await api.get(`/documents/${id}/versions`);
    return res.data;
  },

  update: async (
    id: number,
    payload: Partial<Pick<DmsDocument, 'title' | 'description' | 'categoryId' | 'tags' | 'retentionPolicy' | 'isConfidential' | 'status'>>,
  ): Promise<DmsDocument> => {
    const res = await api.patch(`/documents/${id}`, payload);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },

  archive: async (id: number): Promise<DmsDocument> => {
    const res = await api.post(`/documents/${id}/archive`);
    return res.data;
  },

  getDownloadUrl: (id: number): string => {
    const baseUrl = (api.defaults.baseURL ?? '').replace(/\/api$/, '');
    return `${baseUrl}/api/documents/${id}/download`;
  },

  createShare: async (
    id: number,
    payload: { expiresAt: string; maxDownloads?: number; requiresPin?: boolean; pin?: string },
  ): Promise<{ shareToken: string; expiresAt: string }> => {
    const res = await api.post(`/documents/${id}/share`, payload);
    return res.data;
  },

  getActivity: async (id: number): Promise<Array<{ id: number; action: string; details: unknown; ipAddress: string | null; createdAt: string; userName: string | null }>> => {
    const res = await api.get(`/documents/${id}/activity`);
    return res.data;
  },

  getEntityDocuments: async (
    sourceModule: string,
    sourceEntity: string,
    sourceEntityId: number,
  ): Promise<DmsDocument[]> => {
    const res = await api.get(`/documents/entity/${sourceModule}/${sourceEntity}/${sourceEntityId}`);
    return res.data;
  },

  attachToEntity: async (payload: {
    sourceModule: string;
    sourceEntity: string;
    sourceEntityId: number;
    documentIds: number[];
  }): Promise<void> => {
    await api.post('/documents/attach', payload);
  },

  // Approval workflow
  submitForApproval: async (id: number, comment?: string): Promise<DmsDocument> => {
    const res = await api.post(`/documents/${id}/submit`, { comment });
    return res.data;
  },

  getApprovalStatus: async (id: number): Promise<DmsApprovalStatus | null> => {
    const res = await api.get(`/documents/${id}/approval`);
    return res.data;
  },

  approveDocument: async (id: number, comment?: string): Promise<DmsDocument> => {
    const res = await api.post(`/documents/${id}/approve`, { comment });
    return res.data;
  },

  rejectDocument: async (id: number, comment: string): Promise<DmsDocument> => {
    const res = await api.post(`/documents/${id}/reject`, { comment });
    return res.data;
  },

  // Public share (no auth)
  resolveShare: async (
    tenantSlug: string,
    token: string,
  ): Promise<{
    document: Pick<DmsDocument, 'id' | 'documentCode' | 'title' | 'description' | 'fileName' | 'mimeType' | 'fileSize' | 'status' | 'createdAt'>;
    downloadUrl: string;
    expiresAt: string;
    requiresPin: boolean;
  }> => {
    const res = await api.get(`/documents/share/${tenantSlug}/${token}`);
    return res.data;
  },

  getShareDownloadUrl: (tenantSlug: string, token: string, pin?: string): string => {
    const baseUrl = (api.defaults.baseURL ?? '').replace(/\/api$/, '');
    const url = `${baseUrl}/api/documents/share/${tenantSlug}/${token}/download`;
    return pin ? `${url}?pin=${encodeURIComponent(pin)}` : url;
  },

  // Reports
  reports: {
    storage: async (): Promise<StorageReport> => {
      const res = await api.get('/documents/reports/storage');
      return res.data;
    },

    activity: async (params: { startDate?: string; endDate?: string; action?: string; page?: number; limit?: number } = {}): Promise<ActivityReport> => {
      const res = await api.get('/documents/reports/activity', { params });
      return res.data;
    },

    retention: async (): Promise<RetentionReport> => {
      const res = await api.get('/documents/reports/retention');
      return res.data;
    },
  },

  // Categories
  categories: {
    list: async (flat = false): Promise<DmsDocumentCategory[]> => {
      const res = await api.get('/documents/categories', { params: flat ? { flat: 'true' } : {} });
      return res.data;
    },

    get: async (id: number): Promise<DmsDocumentCategory> => {
      const res = await api.get(`/documents/categories/${id}`);
      return res.data;
    },

    create: async (payload: CreateCategoryPayload): Promise<DmsDocumentCategory> => {
      const res = await api.post('/documents/categories', payload);
      return res.data;
    },

    update: async (id: number, payload: Partial<CreateCategoryPayload & { isActive: boolean }>): Promise<DmsDocumentCategory> => {
      const res = await api.patch(`/documents/categories/${id}`, payload);
      return res.data;
    },

    delete: async (id: number): Promise<void> => {
      await api.delete(`/documents/categories/${id}`);
    },
  },
};
