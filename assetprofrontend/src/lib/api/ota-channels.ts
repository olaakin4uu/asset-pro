import { api } from '../api';

// ============================================================================
// ENUMS
// ============================================================================

export type OtaChannelCode =
  | 'booking_com'
  | 'expedia'
  | 'agoda'
  | 'airbnb'
  | 'hotels_com'
  | 'custom';

export const OTA_CHANNEL_CODES: OtaChannelCode[] = [
  'booking_com',
  'expedia',
  'agoda',
  'airbnb',
  'hotels_com',
  'custom',
];

export const OTA_CHANNEL_CODE_LABELS: Record<OtaChannelCode, string> = {
  booking_com: 'Booking.com',
  expedia: 'Expedia',
  agoda: 'Agoda',
  airbnb: 'Airbnb',
  hotels_com: 'Hotels.com',
  custom: 'Custom Channel',
};

export type OtaChannelStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'suspended';

export const OTA_CHANNEL_STATUSES: OtaChannelStatus[] = [
  'disconnected',
  'connecting',
  'connected',
  'error',
  'suspended',
];

export const OTA_CHANNEL_STATUS_LABELS: Record<OtaChannelStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting',
  connected: 'Connected',
  error: 'Error',
  suspended: 'Suspended',
};

export const OTA_CHANNEL_STATUS_BADGE_CLASS: Record<OtaChannelStatus, string> = {
  disconnected: 'bg-red-100 text-red-700',
  connecting: 'bg-blue-100 text-blue-700',
  connected: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
  suspended: 'bg-gray-200 text-gray-700',
};

export type OtaSyncJobType =
  | 'rate_push'
  | 'availability_push'
  | 'reservation_pull'
  | 'reservation_ack'
  | 'full_resync';

export const OTA_SYNC_JOB_TYPES: OtaSyncJobType[] = [
  'rate_push',
  'availability_push',
  'reservation_pull',
  'reservation_ack',
  'full_resync',
];

export const OTA_SYNC_JOB_TYPE_LABELS: Record<OtaSyncJobType, string> = {
  rate_push: 'Rate Push',
  availability_push: 'Availability Push',
  reservation_pull: 'Reservation Pull',
  reservation_ack: 'Reservation Ack',
  full_resync: 'Full Resync',
};

export type OtaSyncJobStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'retrying';

export const OTA_SYNC_JOB_STATUSES: OtaSyncJobStatus[] = [
  'pending',
  'running',
  'succeeded',
  'failed',
  'retrying',
];

export const OTA_SYNC_JOB_STATUS_LABELS: Record<OtaSyncJobStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  succeeded: 'Succeeded',
  failed: 'Failed',
  retrying: 'Retrying',
};

export const OTA_SYNC_JOB_STATUS_BADGE_CLASS: Record<OtaSyncJobStatus, string> = {
  pending: 'bg-blue-100 text-blue-700',
  running: 'bg-amber-100 text-amber-700',
  succeeded: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  retrying: 'bg-purple-100 text-purple-700',
};

export type OtaInboundStatus =
  | 'received'
  | 'mapped'
  | 'reserved'
  | 'failed'
  | 'cancelled';

export const OTA_INBOUND_STATUSES: OtaInboundStatus[] = [
  'received',
  'mapped',
  'reserved',
  'failed',
  'cancelled',
];

export const OTA_INBOUND_STATUS_LABELS: Record<OtaInboundStatus, string> = {
  received: 'Received',
  mapped: 'Mapped',
  reserved: 'Reserved',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const OTA_INBOUND_STATUS_BADGE_CLASS: Record<OtaInboundStatus, string> = {
  received: 'bg-blue-100 text-blue-700',
  mapped: 'bg-purple-100 text-purple-700',
  reserved: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

// ============================================================================
// ENTITIES
// ============================================================================

export interface OtaAdapterMetadata {
  channelCode: OtaChannelCode;
  displayName: string;
  documentationUrl: string;
  certificationRequired: boolean;
}

export interface OtaChannel {
  id: number;
  companyId: number;
  branchId: number | null;
  channelCode: OtaChannelCode;
  displayName: string;
  status: OtaChannelStatus;
  apiCredentialsRef: string | null;
  hotelIdOnChannel: string | null;
  syncRatesEnabled: boolean;
  syncInventoryEnabled: boolean;
  syncReservationsEnabled: boolean;
  lastSyncAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  config: Record<string, unknown> | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OtaRoomMapping {
  id: number;
  companyId: number;
  channelId: number;
  hotelRoomTypeId: number;
  channelRoomTypeId: string;
  channelRoomTypeName: string | null;
  channelRatePlanIds: string[];
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OtaRoomMappingWithDetails extends OtaRoomMapping {
  channelDisplayName: string;
  channelCode: OtaChannelCode;
  hotelRoomTypeCode: string;
  hotelRoomTypeName: string;
}

export interface OtaSyncJob {
  id: number;
  companyId: number;
  channelId: number;
  jobType: OtaSyncJobType;
  status: OtaSyncJobStatus;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  attemptCount: number;
  maxAttempts: number;
  scheduledFor: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OtaSyncJobWithChannel extends OtaSyncJob {
  channelDisplayName: string;
  channelCode: OtaChannelCode;
}

export interface OtaInboundReservation {
  id: number;
  companyId: number;
  channelId: number;
  channelReservationId: string;
  rawPayload: Record<string, unknown>;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  checkInDate: string;
  checkOutDate: string;
  channelRoomTypeId: string;
  totalAmount: number;
  currency: string;
  status: OtaInboundStatus;
  hotelReservationId: number | null;
  errorMessage: string | null;
  receivedAt: string;
  mappedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OtaInboundReservationWithChannel extends OtaInboundReservation {
  channelDisplayName: string;
  channelCode: OtaChannelCode;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================================
// DTOs
// ============================================================================

export interface CreateOtaChannelDto {
  channelCode: OtaChannelCode;
  displayName: string;
  branchId?: number;
  hotelIdOnChannel?: string;
  syncRatesEnabled?: boolean;
  syncInventoryEnabled?: boolean;
  syncReservationsEnabled?: boolean;
  notes?: string;
}

export interface UpdateOtaChannelDto {
  displayName?: string;
  hotelIdOnChannel?: string;
  syncRatesEnabled?: boolean;
  syncInventoryEnabled?: boolean;
  syncReservationsEnabled?: boolean;
  notes?: string;
}

export interface ConnectOtaChannelDto {
  apiCredentialsRef: string;
  config?: Record<string, unknown>;
}

export interface CreateOtaRoomMappingDto {
  channelId: number;
  hotelRoomTypeId: number;
  channelRoomTypeId: string;
  channelRoomTypeName?: string;
  channelRatePlanIds?: string[];
  isActive?: boolean;
  notes?: string;
}

export interface UpdateOtaRoomMappingDto {
  channelRoomTypeId?: string;
  channelRoomTypeName?: string;
  channelRatePlanIds?: string[];
  isActive?: boolean;
  notes?: string;
}

export interface EnqueueSyncJobDto {
  channelId: number;
  jobType: OtaSyncJobType;
  payload?: Record<string, unknown>;
}

export interface TriggerFullResyncDto {
  channelId: number;
}

export interface MapInboundReservationDto {
  customerId?: number;
}

// ============================================================================
// QUERY PARAM TYPES
// ============================================================================

export interface OtaChannelListQuery {
  status?: OtaChannelStatus;
  channelCode?: OtaChannelCode;
  search?: string;
  page?: number;
  limit?: number;
}

export interface OtaRoomMappingListQuery {
  channelId?: number;
  hotelRoomTypeId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface OtaSyncJobListQuery {
  channelId?: number;
  jobType?: OtaSyncJobType;
  status?: OtaSyncJobStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface OtaInboundReservationListQuery {
  channelId?: number;
  status?: OtaInboundStatus;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// API CLIENTS
// ============================================================================

export const otaAdaptersApi = {
  list: async (): Promise<OtaAdapterMetadata[]> => {
    const response = await api.get('/ota/adapters');
    return response.data;
  },
};

export const otaChannelsApi = {
  list: async (
    query?: OtaChannelListQuery,
  ): Promise<PaginatedResponse<OtaChannel>> => {
    const response = await api.get('/ota/channels', { params: query });
    return response.data;
  },
  get: async (id: number): Promise<OtaChannel> => {
    const response = await api.get(`/ota/channels/${id}`);
    return response.data;
  },
  create: async (data: CreateOtaChannelDto): Promise<OtaChannel> => {
    const response = await api.post('/ota/channels', data);
    return response.data;
  },
  update: async (id: number, data: UpdateOtaChannelDto): Promise<OtaChannel> => {
    const response = await api.patch(`/ota/channels/${id}`, data);
    return response.data;
  },
  testConnection: async (
    id: number,
    data: ConnectOtaChannelDto,
  ): Promise<{ ok: boolean; message?: string }> => {
    const response = await api.post(`/ota/channels/${id}/test-connection`, data);
    return response.data;
  },
  connect: async (id: number, data: ConnectOtaChannelDto): Promise<OtaChannel> => {
    const response = await api.post(`/ota/channels/${id}/connect`, data);
    return response.data;
  },
  suspend: async (id: number): Promise<OtaChannel> => {
    const response = await api.post(`/ota/channels/${id}/suspend`);
    return response.data;
  },
  resume: async (id: number): Promise<OtaChannel> => {
    const response = await api.post(`/ota/channels/${id}/resume`);
    return response.data;
  },
  remove: async (id: number): Promise<{ ok: boolean }> => {
    const response = await api.delete(`/ota/channels/${id}`);
    return response.data;
  },
};

export const otaMappingsApi = {
  list: async (
    query?: OtaRoomMappingListQuery,
  ): Promise<PaginatedResponse<OtaRoomMappingWithDetails>> => {
    const response = await api.get('/ota/mappings', { params: query });
    return response.data;
  },
  get: async (id: number): Promise<OtaRoomMappingWithDetails> => {
    const response = await api.get(`/ota/mappings/${id}`);
    return response.data;
  },
  create: async (data: CreateOtaRoomMappingDto): Promise<OtaRoomMapping> => {
    const response = await api.post('/ota/mappings', data);
    return response.data;
  },
  update: async (
    id: number,
    data: UpdateOtaRoomMappingDto,
  ): Promise<OtaRoomMappingWithDetails> => {
    const response = await api.patch(`/ota/mappings/${id}`, data);
    return response.data;
  },
  remove: async (id: number): Promise<{ ok: boolean }> => {
    const response = await api.delete(`/ota/mappings/${id}`);
    return response.data;
  },
};

export const otaSyncJobsApi = {
  list: async (
    query?: OtaSyncJobListQuery,
  ): Promise<PaginatedResponse<OtaSyncJobWithChannel>> => {
    const response = await api.get('/ota/sync-jobs', { params: query });
    return response.data;
  },
  get: async (id: number): Promise<OtaSyncJobWithChannel> => {
    const response = await api.get(`/ota/sync-jobs/${id}`);
    return response.data;
  },
  enqueue: async (data: EnqueueSyncJobDto): Promise<OtaSyncJob> => {
    const response = await api.post('/ota/sync-jobs', data);
    return response.data;
  },
  triggerFullResync: async (data: TriggerFullResyncDto): Promise<OtaSyncJob> => {
    const response = await api.post('/ota/sync-jobs/trigger-sync', data);
    return response.data;
  },
  retry: async (id: number): Promise<OtaSyncJob> => {
    const response = await api.post(`/ota/sync-jobs/${id}/retry`);
    return response.data;
  },
  cancel: async (id: number): Promise<OtaSyncJob> => {
    const response = await api.post(`/ota/sync-jobs/${id}/cancel`);
    return response.data;
  },
};

export const otaInboundReservationsApi = {
  list: async (
    query?: OtaInboundReservationListQuery,
  ): Promise<PaginatedResponse<OtaInboundReservationWithChannel>> => {
    const response = await api.get('/ota/inbound-reservations', { params: query });
    return response.data;
  },
  get: async (id: number): Promise<OtaInboundReservationWithChannel> => {
    const response = await api.get(`/ota/inbound-reservations/${id}`);
    return response.data;
  },
  mapToHotel: async (
    id: number,
    data: MapInboundReservationDto,
  ): Promise<OtaInboundReservationWithChannel> => {
    const response = await api.post(
      `/ota/inbound-reservations/${id}/map-to-hotel`,
      data,
    );
    return response.data;
  },
};
