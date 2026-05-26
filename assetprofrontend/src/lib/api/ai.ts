import { api } from '../api';

// ============================================================================
// TYPES - ENUMS
// ============================================================================

export type ConversationStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';
export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM' | 'FUNCTION';
export type AgentType = 'accountant' | 'inventory' | 'hr' | 'general';

// ============================================================================
// TYPES - ENTITIES
// ============================================================================

export interface AiConversation {
  id: number;
  companyId: number;
  userId: number;
  conversationId: string;
  title: string | null;
  context: string | null;
  contextEntityType: string | null;
  contextEntityId: number | null;
  model: string;
  agentType: AgentType;
  totalTokens: number;
  totalCost: number;
  status: ConversationStatus;
  metadata: Record<string, unknown> | null;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  messages?: AiMessage[];
}

export interface AiTokenBalance {
  id: number;
  tenantId: string;
  totalPurchased: number;
  totalUsed: number;
  balance: number;
  lastPurchaseAt: string | null;
  lastUsedAt: string | null;
}

export interface AiTokenPackage {
  id: number;
  name: string;
  description: string | null;
  tokenAmount: number;
  price: number;
  currency: string;
  isPopular: boolean;
}

export interface AiTokenPurchaseRecord {
  id: number;
  packageId: number | null;
  tokenAmount: number;
  amountPaid: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  paystackRef: string | null;
  createdAt: string;
}

export interface AiMessage {
  id: number;
  conversationId: number;
  role: MessageRole;
  content: string;
  tokensUsed: number;
  cost: number;
  functionCall: Record<string, unknown> | null;
  functionResult: Record<string, unknown> | null;
  attachments: Record<string, unknown>[] | null;
  metadata: Record<string, unknown> | null;
  feedbackRating: number | null;
  feedbackComment: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface AiStats {
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  conversationsThisMonth: number;
  tokensThisMonth: number;
  costThisMonth: number;
}

// ============================================================================
// TYPES - DTOs
// ============================================================================

export interface CreateConversationDto {
  title?: string;
  context?: string;
  contextEntityType?: string;
  contextEntityId?: number;
  model?: string;
  agentType?: AgentType;
}

export interface UpdateConversationDto {
  title?: string;
}

export interface SendMessageDto {
  content: string;
  role?: MessageRole;
  attachments?: Record<string, unknown>[];
}

export interface RateMessageDto {
  rating: number;
  comment?: string;
}

// ============================================================================
// TYPES - RESPONSES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================================
// API - CONVERSATIONS
// ============================================================================

export const aiConversationsApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<AiConversation>> => {
    const response = await api.get('/ai/conversations', { params });
    return response.data;
  },
  get: async (id: number): Promise<AiConversation & { messages: AiMessage[] }> => {
    const response = await api.get(`/ai/conversations/${id}`);
    return response.data;
  },
  create: async (data: CreateConversationDto): Promise<AiConversation> => {
    const response = await api.post('/ai/conversations', data);
    return response.data;
  },
  update: async (id: number, data: UpdateConversationDto): Promise<AiConversation> => {
    const response = await api.patch(`/ai/conversations/${id}`, data);
    return response.data;
  },
  archive: async (id: number): Promise<AiConversation> => {
    const response = await api.patch(`/ai/conversations/${id}/archive`);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/ai/conversations/${id}`);
  },
};

// ============================================================================
// API - MESSAGES
// ============================================================================

export const aiMessagesApi = {
  list: async (conversationId: number): Promise<AiMessage[]> => {
    const response = await api.get(`/ai/conversations/${conversationId}/messages`);
    return response.data;
  },
  send: async (conversationId: number, data: SendMessageDto): Promise<AiMessage> => {
    const response = await api.post(`/ai/conversations/${conversationId}/messages`, data);
    return response.data;
  },
  rate: async (messageId: number, data: RateMessageDto): Promise<AiMessage> => {
    const response = await api.patch(`/ai/messages/${messageId}/rate`, data);
    return response.data;
  },
};

// ============================================================================
// API - STATS
// ============================================================================

export const aiStatsApi = {
  getStats: async (): Promise<AiStats> => {
    const response = await api.get('/ai/stats');
    return response.data;
  },
};

// ============================================================================
// API - TOKEN BALANCE
// ============================================================================

export const aiTokensApi = {
  getBalance: async (): Promise<AiTokenBalance> => {
    const response = await api.get('/ai/tokens/balance');
    return response.data;
  },
  getPackages: async (): Promise<AiTokenPackage[]> => {
    const response = await api.get('/ai/tokens/packages');
    return response.data;
  },
  purchase: async (packageId: number): Promise<{ authorizationUrl: string; reference: string; purchaseId: number }> => {
    const response = await api.post('/ai/tokens/purchase', { packageId });
    return response.data;
  },
  getPurchaseHistory: async (params?: Record<string, unknown>): Promise<PaginatedResponse<AiTokenPurchaseRecord>> => {
    const response = await api.get('/ai/tokens/purchases', { params });
    return response.data;
  },
};
