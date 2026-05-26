import { api } from '../api';

// ============================================================================
// TYPES
// ============================================================================

export enum ArticleStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum ArticleVisibility {
  PUBLIC = 'PUBLIC',
  AUTHENTICATED = 'AUTHENTICATED',
  ADMIN_ONLY = 'ADMIN_ONLY',
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export interface HelpCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  parentId?: number;
  isActive: boolean;
  articleCount: number;
  children?: HelpCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface HelpArticle {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  categoryId: number;
  category?: HelpCategory;
  tags?: string[];
  relatedArticles?: HelpArticle[];
  status: string;
  visibility: string;
  moduleSlug?: string;
  difficulty?: string;
  sortOrder: number;
  author?: string;
  publishedAt?: string;
  isFeatured: boolean;
  enableComments: boolean;
  viewCount: number;
  helpfulCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  article: HelpArticle;
  score: number;
  highlights: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  suggestions?: string[];
}

export interface ArticleStats {
  articleId: number;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  helpfulRatio: number;
  avgReadingTime: number;
}

export interface HelpDashboardStats {
  totalArticles: number;
  totalCategories: number;
  publishedArticles: number;
  draftArticles: number;
  archivedArticles: number;
  totalViews: number;
  avgHelpfulRate: number;
  topSearchTerms: string[];
  topArticles: HelpArticle[];
}

// ============================================================================
// SUPPORT TICKET TYPES
// ============================================================================

export interface SupportTicket {
  id: number;
  ticketNumber: string;
  tenantId: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  tenantContactEmail?: string;
  tenantContactName?: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { replies: number };
  replies?: SupportTicketReply[];
}

export interface SupportTicketReply {
  id: number;
  message: string;
  authorType: string;
  tenantUserEmail?: string;
  tenantUserName?: string;
  isInternalNote: boolean;
  createdAt: string;
  admin?: { id: number; name: string };
}

export interface TicketStats {
  open: number;
  inProgress: number;
  waitingOnCustomer: number;
  resolved: number;
  closed: number;
  total: number;
}

export interface CreateSupportTicketDto {
  subject: string;
  description: string;
  priority?: string;
  category?: string;
}

export interface CreateTicketReplyDto {
  message: string;
}

// ============================================================================
// REQUEST DTOs
// ============================================================================

export interface CreateHelpCategoryDto {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  parentId?: number;
  isActive?: boolean;
}

export interface UpdateHelpCategoryDto {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  parentId?: number;
  isActive?: boolean;
}

export interface CreateHelpArticleDto {
  title: string;
  slug: string;
  summary: string;
  content: string;
  categoryId: number;
  tags?: string[];
  relatedArticleIds?: number[];
  status?: ArticleStatus;
  visibility?: ArticleVisibility;
  moduleSlug?: string;
  difficulty?: DifficultyLevel;
  sortOrder?: number;
  author?: string;
  publishedAt?: string;
  isFeatured?: boolean;
  enableComments?: boolean;
}

export interface UpdateHelpArticleDto {
  title?: string;
  slug?: string;
  summary?: string;
  content?: string;
  categoryId?: number;
  tags?: string[];
  relatedArticleIds?: number[];
  status?: ArticleStatus;
  visibility?: ArticleVisibility;
  moduleSlug?: string;
  difficulty?: DifficultyLevel;
  sortOrder?: number;
  author?: string;
  publishedAt?: string;
  isFeatured?: boolean;
  enableComments?: boolean;
}

// ============================================================================
// CATEGORY API
// ============================================================================

export const helpCategoriesApi = {
  getAll: async (params?: {
    parentId?: number;
    isActive?: boolean;
    includeChildren?: boolean;
  }): Promise<HelpCategory[]> => {
    const { data } = await api.get('/help/categories', { params });
    return data;
  },

  get: async (id: number): Promise<HelpCategory> => {
    const { data } = await api.get(`/help/categories/${id}`);
    return data;
  },

  getBySlug: async (slug: string): Promise<HelpCategory> => {
    const { data } = await api.get(`/help/categories/slug/${slug}`);
    return data;
  },

  create: async (dto: CreateHelpCategoryDto): Promise<HelpCategory> => {
    const { data } = await api.post('/help/categories', dto);
    return data;
  },

  update: async (id: number, dto: UpdateHelpCategoryDto): Promise<HelpCategory> => {
    const { data } = await api.patch(`/help/categories/${id}`, dto);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/help/categories/${id}`);
  },

  reorder: async (categoryId: number, newSortOrder: number): Promise<HelpCategory> => {
    const { data } = await api.post('/help/categories/reorder', {
      categoryId,
      newSortOrder,
    });
    return data;
  },
};

// ============================================================================
// ARTICLE API
// ============================================================================

export const helpArticlesApi = {
  getAll: async (params?: {
    categoryId?: number;
    status?: ArticleStatus;
    visibility?: ArticleVisibility;
    tag?: string;
    isFeatured?: boolean;
    search?: string;
    moduleSlug?: string;
    difficulty?: DifficultyLevel;
  }): Promise<HelpArticle[]> => {
    const { data } = await api.get('/help/articles', { params });
    return data;
  },

  get: async (id: number, incrementView?: boolean): Promise<HelpArticle> => {
    const { data } = await api.get(`/help/articles/${id}`, {
      params: { view: incrementView },
    });
    return data;
  },

  getBySlug: async (slug: string, incrementView?: boolean): Promise<HelpArticle> => {
    const { data } = await api.get(`/help/articles/slug/${slug}`, {
      params: { view: incrementView },
    });
    return data;
  },

  create: async (dto: CreateHelpArticleDto): Promise<HelpArticle> => {
    const { data } = await api.post('/help/articles', dto);
    return data;
  },

  update: async (id: number, dto: UpdateHelpArticleDto): Promise<HelpArticle> => {
    const { data } = await api.patch(`/help/articles/${id}`, dto);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/help/articles/${id}`);
  },

  search: async (params: {
    query: string;
    categoryId?: number;
    tags?: string[];
    limit?: number;
  }): Promise<SearchResponse> => {
    const { data } = await api.get('/help/articles/search', { params });
    return data;
  },

  getSuggestions: async (moduleSlug: string): Promise<HelpArticle[]> => {
    const { data } = await api.get('/help/articles/suggestions', {
      params: { module: moduleSlug },
    });
    return data;
  },

  getStats: async (id: number): Promise<ArticleStats> => {
    const { data } = await api.get(`/help/articles/${id}/stats`);
    return data;
  },

  markHelpful: async (articleId: number, isHelpful: boolean, feedback?: string): Promise<void> => {
    await api.post('/help/articles/mark-helpful', {
      articleId,
      isHelpful,
      feedback,
    });
  },

  bulkPublish: async (articleIds: number[], publishedAt?: string): Promise<void> => {
    await api.post('/help/articles/bulk-publish', {
      articleIds,
      publishedAt,
    });
  },

  getDashboardStats: async (): Promise<HelpDashboardStats> => {
    const { data } = await api.get('/help/articles/dashboard-stats');
    return data;
  },
};

// ============================================================================
// SUPPORT TICKET API
// ============================================================================

export const supportApi = {
  getAll: async (params?: {
    status?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: SupportTicket[]; total: number; totalPages: number; currentPage: number }> => {
    const { data } = await api.get('/help/support', { params });
    return data;
  },

  get: async (id: number): Promise<SupportTicket> => {
    const { data } = await api.get(`/help/support/${id}`);
    return data;
  },

  create: async (dto: CreateSupportTicketDto): Promise<SupportTicket> => {
    const { data } = await api.post('/help/support', dto);
    return data;
  },

  addReply: async (id: number, message: string): Promise<SupportTicketReply> => {
    const { data } = await api.post(`/help/support/${id}/reply`, { message });
    return data;
  },

  getStats: async (): Promise<TicketStats> => {
    const { data } = await api.get('/help/support/stats');
    return data;
  },
};

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const helpApi = {
  categories: helpCategoriesApi,
  articles: helpArticlesApi,
  support: supportApi,
};

export default helpApi;
