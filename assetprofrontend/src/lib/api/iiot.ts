import { api } from '../api';
import type { PaginatedResponse } from '@/types/core';
import type {
  IiotDevice,
  CreateDeviceDto,
  UpdateDeviceDto,
  DeviceStats,
  DeviceQueryParams,
  TestConnectionResult,
  IiotDeviceTag,
  CreateDeviceTagDto,
  UpdateDeviceTagDto,
  DeviceTagQueryParams,
  IiotTagGroup,
  CreateTagGroupDto,
  UpdateTagGroupDto,
  TagGroupQueryParams,
  AddTagGroupMembersDto,
  RemoveTagGroupMembersDto,
  IiotWorkCenterBinding,
  CreateWorkCenterBindingDto,
  UpdateWorkCenterBindingDto,
  WorkCenterBindingQueryParams,
  IiotAlarm,
  CreateAlarmDto,
  UpdateAlarmDto,
  AlarmQueryParams,
  IiotAlarmEvent,
  AcknowledgeAlarmEventDto,
  ResolveAlarmEventDto,
  AlarmEventQueryParams,
  AlarmEventStats,
  IiotScaleProfile,
  CreateScaleProfileDto,
  UpdateScaleProfileDto,
  ScaleProfileQueryParams,
  IiotWeightRecord,
  CreateWeightRecordDto,
  WeightRecordQueryParams,
  IiotDeviceEvent,
  DeviceEventQueryParams,
  IiotDashboardConfig,
  CreateDashboardConfigDto,
  UpdateDashboardConfigDto,
  DashboardConfigQueryParams,
  IiotSettings,
  UpdateIiotSettingsDto,
  WriteTagValueRequest,
  TagWriteResult,
  DispatchWorkOrderRequest,
  DispatchWorkOrderResponse,
  IiotWriteLog,
  WriteLogQueryParams,
} from '@/types/iiot';

// ============================================================================
// DEVICES API
// ============================================================================

export const devicesApi = {
  list: async (query?: DeviceQueryParams): Promise<PaginatedResponse<IiotDevice>> => {
    const response = await api.get('/iiot/devices', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<IiotDevice> => {
    const response = await api.get(`/iiot/devices/${id}`);
    return response.data;
  },

  create: async (data: CreateDeviceDto): Promise<IiotDevice> => {
    const response = await api.post('/iiot/devices', data);
    return response.data;
  },

  update: async (id: number, data: UpdateDeviceDto): Promise<IiotDevice> => {
    const response = await api.put(`/iiot/devices/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/iiot/devices/${id}`);
  },

  getStats: async (): Promise<DeviceStats> => {
    const response = await api.get('/iiot/devices/stats');
    return response.data;
  },

  testConnection: async (id: number): Promise<TestConnectionResult> => {
    const response = await api.post(`/iiot/devices/${id}/test-connection`);
    return response.data;
  },

  enable: async (id: number): Promise<IiotDevice> => {
    const response = await api.post(`/iiot/devices/${id}/enable`);
    return response.data;
  },

  disable: async (id: number): Promise<IiotDevice> => {
    const response = await api.post(`/iiot/devices/${id}/disable`);
    return response.data;
  },

  getActive: async (): Promise<IiotDevice[]> => {
    const response = await api.get('/iiot/devices', { params: { isEnabled: true, limit: 500 } });
    return response.data.data || response.data;
  },

  writeTags: async (deviceId: number, writes: WriteTagValueRequest[]): Promise<TagWriteResult[]> => {
    const response = await api.post(`/iiot/devices/${deviceId}/write-tags`, { writes });
    return response.data;
  },

  dispatchWorkOrder: async (deviceId: number, data: DispatchWorkOrderRequest): Promise<DispatchWorkOrderResponse> => {
    const response = await api.post(`/iiot/devices/${deviceId}/dispatch-work-order`, data);
    return response.data;
  },
};

// ============================================================================
// DEVICE TAGS API
// ============================================================================

export const deviceTagsApi = {
  list: async (query?: DeviceTagQueryParams): Promise<PaginatedResponse<IiotDeviceTag>> => {
    const response = await api.get('/iiot/device-tags', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<IiotDeviceTag> => {
    const response = await api.get(`/iiot/device-tags/${id}`);
    return response.data;
  },

  create: async (data: CreateDeviceTagDto): Promise<IiotDeviceTag> => {
    const response = await api.post('/iiot/device-tags', data);
    return response.data;
  },

  update: async (id: number, data: UpdateDeviceTagDto): Promise<IiotDeviceTag> => {
    const response = await api.put(`/iiot/device-tags/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/iiot/device-tags/${id}`);
  },

  getByDevice: async (deviceId: number): Promise<IiotDeviceTag[]> => {
    const response = await api.get('/iiot/device-tags', { params: { deviceId, limit: 500 } });
    return response.data.data || response.data;
  },

  getEnabled: async (deviceId?: number): Promise<IiotDeviceTag[]> => {
    const response = await api.get('/iiot/device-tags', {
      params: { deviceId, isEnabled: true, limit: 500 },
    });
    return response.data.data || response.data;
  },
};

// ============================================================================
// TAG GROUPS API
// ============================================================================

export const tagGroupsApi = {
  list: async (query?: TagGroupQueryParams): Promise<PaginatedResponse<IiotTagGroup>> => {
    const response = await api.get('/iiot/tag-groups', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<IiotTagGroup> => {
    const response = await api.get(`/iiot/tag-groups/${id}`);
    return response.data;
  },

  create: async (data: CreateTagGroupDto): Promise<IiotTagGroup> => {
    const response = await api.post('/iiot/tag-groups', data);
    return response.data;
  },

  update: async (id: number, data: UpdateTagGroupDto): Promise<IiotTagGroup> => {
    const response = await api.put(`/iiot/tag-groups/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/iiot/tag-groups/${id}`);
  },

  addMembers: async (id: number, data: AddTagGroupMembersDto): Promise<IiotTagGroup> => {
    const response = await api.post(`/iiot/tag-groups/${id}/members`, data);
    return response.data;
  },

  removeMembers: async (id: number, data: RemoveTagGroupMembersDto): Promise<IiotTagGroup> => {
    const response = await api.delete(`/iiot/tag-groups/${id}/members`, { data });
    return response.data;
  },

  getActive: async (): Promise<IiotTagGroup[]> => {
    const response = await api.get('/iiot/tag-groups', { params: { isActive: true, limit: 500 } });
    return response.data.data || response.data;
  },
};

// ============================================================================
// WORK CENTER BINDINGS API
// ============================================================================

export const workCenterBindingsApi = {
  list: async (query?: WorkCenterBindingQueryParams): Promise<PaginatedResponse<IiotWorkCenterBinding>> => {
    const response = await api.get('/iiot/work-center-bindings', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<IiotWorkCenterBinding> => {
    const response = await api.get(`/iiot/work-center-bindings/${id}`);
    return response.data;
  },

  create: async (data: CreateWorkCenterBindingDto): Promise<IiotWorkCenterBinding> => {
    const response = await api.post('/iiot/work-center-bindings', data);
    return response.data;
  },

  update: async (id: number, data: UpdateWorkCenterBindingDto): Promise<IiotWorkCenterBinding> => {
    const response = await api.put(`/iiot/work-center-bindings/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/iiot/work-center-bindings/${id}`);
  },

  getByWorkCenter: async (workCenterId: number): Promise<IiotWorkCenterBinding[]> => {
    const response = await api.get('/iiot/work-center-bindings', {
      params: { workCenterId, limit: 500 },
    });
    return response.data.data || response.data;
  },

  getByDeviceTag: async (deviceTagId: number): Promise<IiotWorkCenterBinding[]> => {
    const response = await api.get('/iiot/work-center-bindings', {
      params: { deviceTagId, limit: 500 },
    });
    return response.data.data || response.data;
  },
};

// ============================================================================
// ALARMS API
// ============================================================================

export const alarmsApi = {
  list: async (query?: AlarmQueryParams): Promise<PaginatedResponse<IiotAlarm>> => {
    const response = await api.get('/iiot/alarms', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<IiotAlarm> => {
    const response = await api.get(`/iiot/alarms/${id}`);
    return response.data;
  },

  create: async (data: CreateAlarmDto): Promise<IiotAlarm> => {
    const response = await api.post('/iiot/alarms', data);
    return response.data;
  },

  update: async (id: number, data: UpdateAlarmDto): Promise<IiotAlarm> => {
    const response = await api.put(`/iiot/alarms/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/iiot/alarms/${id}`);
  },

  getByDeviceTag: async (deviceTagId: number): Promise<IiotAlarm[]> => {
    const response = await api.get('/iiot/alarms', { params: { deviceTagId, limit: 500 } });
    return response.data.data || response.data;
  },

  getActive: async (): Promise<IiotAlarm[]> => {
    const response = await api.get('/iiot/alarms', { params: { isActive: true, limit: 500 } });
    return response.data.data || response.data;
  },
};

// ============================================================================
// ALARM EVENTS API
// ============================================================================

export const alarmEventsApi = {
  list: async (query?: AlarmEventQueryParams): Promise<PaginatedResponse<IiotAlarmEvent>> => {
    const response = await api.get('/iiot/alarm-events', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<IiotAlarmEvent> => {
    const response = await api.get(`/iiot/alarm-events/${id}`);
    return response.data;
  },

  acknowledge: async (id: number, data: AcknowledgeAlarmEventDto): Promise<IiotAlarmEvent> => {
    const response = await api.post(`/iiot/alarm-events/${id}/acknowledge`, data);
    return response.data;
  },

  resolve: async (id: number, data: ResolveAlarmEventDto): Promise<IiotAlarmEvent> => {
    const response = await api.post(`/iiot/alarm-events/${id}/resolve`, data);
    return response.data;
  },

  getStats: async (): Promise<AlarmEventStats> => {
    const response = await api.get('/iiot/alarm-events/stats');
    return response.data;
  },

  getActive: async (): Promise<IiotAlarmEvent[]> => {
    const response = await api.get('/iiot/alarm-events', {
      params: { status: 'active', limit: 500 },
    });
    return response.data.data || response.data;
  },

  getByAlarm: async (alarmId: number, query?: AlarmEventQueryParams): Promise<PaginatedResponse<IiotAlarmEvent>> => {
    const response = await api.get('/iiot/alarm-events', {
      params: { ...query, alarmId },
    });
    return response.data;
  },

  getByDevice: async (deviceId: number, query?: AlarmEventQueryParams): Promise<PaginatedResponse<IiotAlarmEvent>> => {
    const response = await api.get('/iiot/alarm-events', {
      params: { ...query, deviceId },
    });
    return response.data;
  },
};

// ============================================================================
// SCALE PROFILES API
// ============================================================================

export const scaleProfilesApi = {
  list: async (query?: ScaleProfileQueryParams): Promise<PaginatedResponse<IiotScaleProfile>> => {
    const response = await api.get('/iiot/scale-profiles', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<IiotScaleProfile> => {
    const response = await api.get(`/iiot/scale-profiles/${id}`);
    return response.data;
  },

  create: async (data: CreateScaleProfileDto): Promise<IiotScaleProfile> => {
    const response = await api.post('/iiot/scale-profiles', data);
    return response.data;
  },

  update: async (id: number, data: UpdateScaleProfileDto): Promise<IiotScaleProfile> => {
    const response = await api.put(`/iiot/scale-profiles/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/iiot/scale-profiles/${id}`);
  },

  getActive: async (): Promise<IiotScaleProfile[]> => {
    const response = await api.get('/iiot/scale-profiles', {
      params: { isActive: true, limit: 500 },
    });
    return response.data.data || response.data;
  },

  getByDevice: async (deviceId: number): Promise<IiotScaleProfile[]> => {
    const response = await api.get('/iiot/scale-profiles', {
      params: { deviceId, limit: 500 },
    });
    return response.data.data || response.data;
  },
};

// ============================================================================
// WEIGHT RECORDS API
// ============================================================================

export const weightRecordsApi = {
  list: async (query?: WeightRecordQueryParams): Promise<PaginatedResponse<IiotWeightRecord>> => {
    const response = await api.get('/iiot/weight-records', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<IiotWeightRecord> => {
    const response = await api.get(`/iiot/weight-records/${id}`);
    return response.data;
  },

  create: async (data: CreateWeightRecordDto): Promise<IiotWeightRecord> => {
    const response = await api.post('/iiot/weight-records', data);
    return response.data;
  },

  getByScaleProfile: async (scaleProfileId: number, query?: WeightRecordQueryParams): Promise<PaginatedResponse<IiotWeightRecord>> => {
    const response = await api.get('/iiot/weight-records', {
      params: { ...query, scaleProfileId },
    });
    return response.data;
  },

  getByProductionOrder: async (productionOrderId: number): Promise<IiotWeightRecord[]> => {
    const response = await api.get('/iiot/weight-records', {
      params: { productionOrderId, limit: 500 },
    });
    return response.data.data || response.data;
  },

  getByStockMovement: async (stockMovementId: number): Promise<IiotWeightRecord[]> => {
    const response = await api.get('/iiot/weight-records', {
      params: { stockMovementId, limit: 500 },
    });
    return response.data.data || response.data;
  },

  getByItem: async (itemId: number, query?: WeightRecordQueryParams): Promise<PaginatedResponse<IiotWeightRecord>> => {
    const response = await api.get('/iiot/weight-records', {
      params: { ...query, itemId },
    });
    return response.data;
  },
};

// ============================================================================
// DEVICE EVENTS API
// ============================================================================

export const deviceEventsApi = {
  list: async (query?: DeviceEventQueryParams): Promise<PaginatedResponse<IiotDeviceEvent>> => {
    const response = await api.get('/iiot/device-events', { params: query });
    return response.data;
  },

  getByDevice: async (deviceId: number, query?: DeviceEventQueryParams): Promise<PaginatedResponse<IiotDeviceEvent>> => {
    const response = await api.get('/iiot/device-events', {
      params: { ...query, deviceId },
    });
    return response.data;
  },
};

// ============================================================================
// DASHBOARD CONFIGS API
// ============================================================================

export const dashboardConfigsApi = {
  list: async (query?: DashboardConfigQueryParams): Promise<PaginatedResponse<IiotDashboardConfig>> => {
    const response = await api.get('/iiot/dashboard-configs', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<IiotDashboardConfig> => {
    const response = await api.get(`/iiot/dashboard-configs/${id}`);
    return response.data;
  },

  create: async (data: CreateDashboardConfigDto): Promise<IiotDashboardConfig> => {
    const response = await api.post('/iiot/dashboard-configs', data);
    return response.data;
  },

  update: async (id: number, data: UpdateDashboardConfigDto): Promise<IiotDashboardConfig> => {
    const response = await api.put(`/iiot/dashboard-configs/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/iiot/dashboard-configs/${id}`);
  },

  getDefault: async (): Promise<IiotDashboardConfig | null> => {
    const response = await api.get('/iiot/dashboard-configs', {
      params: { isDefault: true, limit: 1 },
    });
    const data = response.data.data || response.data;
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  },

  getShared: async (): Promise<IiotDashboardConfig[]> => {
    const response = await api.get('/iiot/dashboard-configs', {
      params: { isShared: true, limit: 500 },
    });
    return response.data.data || response.data;
  },

  setDefault: async (id: number): Promise<IiotDashboardConfig> => {
    const response = await api.post(`/iiot/dashboard-configs/${id}/set-default`);
    return response.data;
  },
};

// ============================================================================
// IIOT SETTINGS API
// ============================================================================

export const iiotSettingsApi = {
  get: async (): Promise<IiotSettings> => {
    const response = await api.get('/iiot/settings');
    return response.data;
  },

  update: async (data: UpdateIiotSettingsDto): Promise<IiotSettings> => {
    const response = await api.put('/iiot/settings', data);
    return response.data;
  },
};

// ============================================================================
// WRITE LOGS API
// ============================================================================

export const writeLogsApi = {
  list: async (query?: WriteLogQueryParams): Promise<PaginatedResponse<IiotWriteLog>> => {
    const response = await api.get('/iiot/write-logs', { params: query });
    return response.data;
  },
};

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const iiotApi = {
  devices: devicesApi,
  deviceTags: deviceTagsApi,
  tagGroups: tagGroupsApi,
  workCenterBindings: workCenterBindingsApi,
  alarms: alarmsApi,
  alarmEvents: alarmEventsApi,
  scaleProfiles: scaleProfilesApi,
  weightRecords: weightRecordsApi,
  deviceEvents: deviceEventsApi,
  dashboardConfigs: dashboardConfigsApi,
  settings: iiotSettingsApi,
  writeLogs: writeLogsApi,
};
