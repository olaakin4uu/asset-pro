// ============================================================================
// IIoT (INDUSTRIAL INTERNET OF THINGS) MODULE TYPES
// ============================================================================

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type DeviceType = 'plc' | 'scale' | 'sensor' | 'gateway';

export type DeviceProtocol = 'pcom_tcp' | 'modbus_tcp';

export type DeviceStatus = 'online' | 'offline' | 'error' | 'disabled';

export type TagDataType =
  | 'bool'
  | 'int16'
  | 'uint16'
  | 'int32'
  | 'uint32'
  | 'float32'
  | 'float64'
  | 'string';

export type TagByteOrder =
  | 'big_endian'
  | 'little_endian'
  | 'big_endian_byte_swap'
  | 'little_endian_byte_swap';

export type TagLoggingMode = 'on_change' | 'periodic' | 'on_change_periodic' | 'disabled';

export type TagQuality = 'good' | 'bad' | 'uncertain' | 'error';

export type DeviceEventType =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'reconnecting'
  | 'reconnected'
  | 'disabled'
  | 'enabled';

export type WorkCenterMetricType =
  | 'machine_status'
  | 'cycle_count'
  | 'reject_count'
  | 'cycle_time'
  | 'speed'
  | 'temperature'
  | 'pressure'
  | 'weight'
  | 'energy'
  | 'custom';

export type AlarmCondition = 'gt' | 'lt' | 'eq' | 'neq' | 'between' | 'outside';

export type AlarmSeverity = 'info' | 'warning' | 'critical' | 'emergency';

export type AlarmEventStatus = 'active' | 'acknowledged' | 'resolved';

export type ScaleType = 'network_modbus' | 'web_serial' | 'plc_analog';

export type WeightUnit = 'kg' | 'g' | 'lb' | 'oz' | 't';

export type WeightCaptureMethod = 'automatic' | 'web_serial' | 'manual';

export type WeightDocumentType =
  | 'production_order'
  | 'stock_movement'
  | 'quality_inspection'
  | 'purchase_receipt'
  | 'standalone';

// ============================================================================
// DEVICE
// ============================================================================

export interface IiotDevice {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description?: string;
  deviceType: DeviceType;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  protocol: DeviceProtocol;
  ipAddress: string;
  port: number;
  unitId?: number;
  connectionTimeout: number;
  pollInterval: number;
  reconnectEnabled: boolean;
  reconnectIntervalMs: number;
  reconnectMaxIntervalMs: number;
  location?: string;
  status: DeviceStatus;
  lastSeenAt?: string;
  lastErrorMessage?: string;
  lastErrorAt?: string;
  metadata?: Record<string, unknown>;
  isEnabled: boolean;
  tagCount?: number;
  tags?: IiotDeviceTag[];
  scaleProfiles?: IiotScaleProfile[];
  createdById?: number;
  updatedById?: number;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeviceDto {
  code: string;
  name: string;
  description?: string;
  deviceType: DeviceType;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  protocol: DeviceProtocol;
  ipAddress: string;
  port: number;
  unitId?: number;
  connectionTimeout?: number;
  pollInterval?: number;
  reconnectEnabled?: boolean;
  reconnectIntervalMs?: number;
  reconnectMaxIntervalMs?: number;
  location?: string;
  metadata?: Record<string, unknown>;
  isEnabled?: boolean;
}

export interface UpdateDeviceDto {
  name?: string;
  description?: string;
  deviceType?: DeviceType;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  protocol?: DeviceProtocol;
  ipAddress?: string;
  port?: number;
  unitId?: number;
  connectionTimeout?: number;
  pollInterval?: number;
  reconnectEnabled?: boolean;
  reconnectIntervalMs?: number;
  reconnectMaxIntervalMs?: number;
  location?: string;
  metadata?: Record<string, unknown>;
  isEnabled?: boolean;
}

export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  error: number;
  disabled: number;
  byType: Record<DeviceType, number>;
  byProtocol: Record<DeviceProtocol, number>;
}

export interface DeviceQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  deviceType?: DeviceType;
  protocol?: DeviceProtocol;
  status?: DeviceStatus;
  isEnabled?: boolean;
  location?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TestConnectionResult {
  success: boolean;
  responseTimeMs?: number;
  message: string;
  firmwareVersion?: string;
}

// ============================================================================
// DEVICE TAG
// ============================================================================

export interface IiotDeviceTag {
  id: number;
  companyId: number;
  deviceId: number;
  name: string;
  description?: string;
  address: string;
  dataType: TagDataType;
  functionCode?: number;
  registerCount?: number;
  byteOrder?: TagByteOrder;
  pollIntervalMs: number;
  scalingEnabled: boolean;
  scalingMultiplier?: number;
  scalingOffset?: number;
  scalingUnit?: string;
  loggingMode: TagLoggingMode;
  loggingDeadband?: number;
  currentValue?: string;
  currentValueAt?: string;
  quality: TagQuality;
  isEnabled: boolean;
  device?: IiotDevice;
  groupMembers?: IiotTagGroupMember[];
  createdById?: number;
  updatedById?: number;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeviceTagDto {
  deviceId: number;
  name: string;
  description?: string;
  address: string;
  dataType: TagDataType;
  functionCode?: number;
  registerCount?: number;
  byteOrder?: TagByteOrder;
  pollIntervalMs?: number;
  scalingEnabled?: boolean;
  scalingMultiplier?: number;
  scalingOffset?: number;
  scalingUnit?: string;
  loggingMode?: TagLoggingMode;
  loggingDeadband?: number;
  isEnabled?: boolean;
}

export interface UpdateDeviceTagDto {
  name?: string;
  description?: string;
  address?: string;
  dataType?: TagDataType;
  functionCode?: number;
  registerCount?: number;
  byteOrder?: TagByteOrder;
  pollIntervalMs?: number;
  scalingEnabled?: boolean;
  scalingMultiplier?: number;
  scalingOffset?: number;
  scalingUnit?: string;
  loggingMode?: TagLoggingMode;
  loggingDeadband?: number;
  isEnabled?: boolean;
}

export interface DeviceTagQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  deviceId?: number;
  dataType?: TagDataType;
  quality?: TagQuality;
  isEnabled?: boolean;
  loggingMode?: TagLoggingMode;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// TAG GROUP
// ============================================================================

export interface IiotTagGroup {
  id: number;
  companyId: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  members?: IiotTagGroupMember[];
  memberCount?: number;
  createdById?: number;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IiotTagGroupMember {
  id: number;
  tagGroupId: number;
  deviceTagId: number;
  sortOrder: number;
  deviceTag?: IiotDeviceTag;
  createdAt: string;
}

export interface CreateTagGroupDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
  memberTagIds?: number[];
}

export interface UpdateTagGroupDto {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface TagGroupQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AddTagGroupMembersDto {
  deviceTagIds: number[];
}

export interface RemoveTagGroupMembersDto {
  deviceTagIds: number[];
}

// ============================================================================
// WORK CENTER BINDING
// ============================================================================

export interface IiotWorkCenterBinding {
  id: number;
  companyId: number;
  workCenterId: number;
  deviceTagId: number;
  metricType: WorkCenterMetricType;
  unitsPerCycle?: number;
  idealCycleTimeSeconds?: number;
  isActive: boolean;
  notes?: string;
  deviceTag?: IiotDeviceTag;
  createdById?: number;
  updatedById?: number;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkCenterBindingDto {
  workCenterId: number;
  deviceTagId: number;
  metricType: WorkCenterMetricType;
  unitsPerCycle?: number;
  idealCycleTimeSeconds?: number;
  isActive?: boolean;
  notes?: string;
}

export interface UpdateWorkCenterBindingDto {
  deviceTagId?: number;
  metricType?: WorkCenterMetricType;
  unitsPerCycle?: number;
  idealCycleTimeSeconds?: number;
  isActive?: boolean;
  notes?: string;
}

export interface WorkCenterBindingQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  workCenterId?: number;
  deviceTagId?: number;
  metricType?: WorkCenterMetricType;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// ALARM
// ============================================================================

export interface IiotAlarm {
  id: number;
  companyId: number;
  deviceTagId: number;
  name: string;
  description?: string;
  condition: AlarmCondition;
  thresholdValue: number;
  thresholdValue2?: number;
  severity: AlarmSeverity;
  hysteresis?: number;
  delaySeconds: number;
  autoResolve: boolean;
  autoResolveDelaySeconds: number;
  escalationMinutes?: number;
  suppressDuringMaintenance: boolean;
  notifyWebSocket: boolean;
  isActive: boolean;
  deviceTag?: IiotDeviceTag;
  activeEventCount?: number;
  createdById?: number;
  updatedById?: number;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlarmDto {
  deviceTagId: number;
  name: string;
  description?: string;
  condition: AlarmCondition;
  thresholdValue: number;
  thresholdValue2?: number;
  severity: AlarmSeverity;
  hysteresis?: number;
  delaySeconds?: number;
  autoResolve?: boolean;
  autoResolveDelaySeconds?: number;
  escalationMinutes?: number;
  suppressDuringMaintenance?: boolean;
  notifyWebSocket?: boolean;
  isActive?: boolean;
}

export interface UpdateAlarmDto {
  name?: string;
  description?: string;
  condition?: AlarmCondition;
  thresholdValue?: number;
  thresholdValue2?: number;
  severity?: AlarmSeverity;
  hysteresis?: number;
  delaySeconds?: number;
  autoResolve?: boolean;
  autoResolveDelaySeconds?: number;
  escalationMinutes?: number;
  suppressDuringMaintenance?: boolean;
  notifyWebSocket?: boolean;
  isActive?: boolean;
}

export interface AlarmQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  deviceTagId?: number;
  severity?: AlarmSeverity;
  condition?: AlarmCondition;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// ALARM EVENT
// ============================================================================

export interface IiotAlarmEvent {
  id: number;
  companyId: number;
  alarmId: number;
  deviceTagId: number;
  deviceId: number;
  triggeredAt: string;
  triggerValue: number;
  thresholdValue: number;
  severity: AlarmSeverity;
  status: AlarmEventStatus;
  acknowledgedAt?: string;
  acknowledgedById?: number;
  acknowledgeNotes?: string;
  resolvedAt?: string;
  resolvedById?: number;
  resolveValue?: number;
  resolveNotes?: string;
  isAutoResolved: boolean;
  durationSeconds?: number;
  escalated: boolean;
  escalatedAt?: string;
  metadata?: Record<string, unknown>;
  alarm?: IiotAlarm;
  createdAt: string;
}

export interface AcknowledgeAlarmEventDto {
  acknowledgeNotes?: string;
}

export interface ResolveAlarmEventDto {
  resolveNotes?: string;
}

export interface AlarmEventQueryParams {
  page?: number;
  limit?: number;
  alarmId?: number;
  deviceId?: number;
  deviceTagId?: number;
  severity?: AlarmSeverity;
  status?: AlarmEventStatus;
  escalated?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AlarmEventStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  bySeverity: Record<AlarmSeverity, number>;
  averageDurationSeconds?: number;
}

// ============================================================================
// SCALE PROFILE
// ============================================================================

export interface IiotScaleProfile {
  id: number;
  companyId: number;
  deviceId?: number;
  name: string;
  code: string;
  scaleType: ScaleType;
  unit: WeightUnit;
  decimalPrecision: number;
  minWeight?: number;
  maxWeight?: number;
  defaultTareWeight: number;
  stabilityThreshold: number;
  stabilityDurationMs: number;
  weightRegisterAddress?: string;
  weightDataType?: string;
  tareRegisterAddress?: string;
  zeroRegisterAddress?: string;
  serialConfig?: Record<string, unknown>;
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
  calibrationCertificate?: string;
  location?: string;
  isActive: boolean;
  device?: IiotDevice;
  weightRecordCount?: number;
  createdById?: number;
  updatedById?: number;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScaleProfileDto {
  deviceId?: number;
  name: string;
  code: string;
  scaleType: ScaleType;
  unit: WeightUnit;
  decimalPrecision?: number;
  minWeight?: number;
  maxWeight?: number;
  defaultTareWeight?: number;
  stabilityThreshold?: number;
  stabilityDurationMs?: number;
  weightRegisterAddress?: string;
  weightDataType?: string;
  tareRegisterAddress?: string;
  zeroRegisterAddress?: string;
  serialConfig?: Record<string, unknown>;
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
  calibrationCertificate?: string;
  location?: string;
  isActive?: boolean;
}

export interface UpdateScaleProfileDto {
  deviceId?: number;
  name?: string;
  scaleType?: ScaleType;
  unit?: WeightUnit;
  decimalPrecision?: number;
  minWeight?: number;
  maxWeight?: number;
  defaultTareWeight?: number;
  stabilityThreshold?: number;
  stabilityDurationMs?: number;
  weightRegisterAddress?: string;
  weightDataType?: string;
  tareRegisterAddress?: string;
  zeroRegisterAddress?: string;
  serialConfig?: Record<string, unknown>;
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
  calibrationCertificate?: string;
  location?: string;
  isActive?: boolean;
}

export interface ScaleProfileQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  deviceId?: number;
  scaleType?: ScaleType;
  unit?: WeightUnit;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// WEIGHT RECORD
// ============================================================================

export interface IiotWeightRecord {
  id: number;
  companyId: number;
  scaleProfileId: number;
  recordNumber: string;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  unit: WeightUnit;
  isStable: boolean;
  captureMethod: WeightCaptureMethod;
  productionOrderId?: number;
  stockMovementId?: number;
  qualityInspectionId?: number;
  purchaseReceiptId?: number;
  documentType?: WeightDocumentType;
  documentReference?: string;
  itemId?: number;
  itemUnitWeight?: number;
  calculatedQuantity?: number;
  expectedWeight?: number;
  weightVariance?: number;
  variancePercent?: number;
  toleranceExceeded: boolean;
  notes?: string;
  operatorId: number;
  capturedAt: string;
  scaleProfile?: IiotScaleProfile;
  createdAt: string;
}

export interface CreateWeightRecordDto {
  scaleProfileId: number;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  unit: WeightUnit;
  isStable?: boolean;
  captureMethod: WeightCaptureMethod;
  productionOrderId?: number;
  stockMovementId?: number;
  qualityInspectionId?: number;
  purchaseReceiptId?: number;
  documentType?: WeightDocumentType;
  documentReference?: string;
  itemId?: number;
  itemUnitWeight?: number;
  calculatedQuantity?: number;
  expectedWeight?: number;
  weightVariance?: number;
  variancePercent?: number;
  toleranceExceeded?: boolean;
  notes?: string;
  capturedAt: string;
}

export interface WeightRecordQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  scaleProfileId?: number;
  captureMethod?: WeightCaptureMethod;
  documentType?: WeightDocumentType;
  productionOrderId?: number;
  stockMovementId?: number;
  qualityInspectionId?: number;
  purchaseReceiptId?: number;
  itemId?: number;
  toleranceExceeded?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// DEVICE EVENT
// ============================================================================

export interface IiotDeviceEvent {
  id: number;
  companyId: number;
  deviceId: number;
  eventType: DeviceEventType;
  message?: string;
  ipAddress?: string;
  port?: number;
  responseTimeMs?: number;
  metadata?: Record<string, unknown>;
  device?: IiotDevice;
  createdAt: string;
}

export interface DeviceEventQueryParams {
  page?: number;
  limit?: number;
  deviceId?: number;
  eventType?: DeviceEventType;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// DASHBOARD CONFIG
// ============================================================================

export interface DashboardWidget {
  id: string;
  type: 'tag_value' | 'tag_chart' | 'alarm_list' | 'device_status' | 'gauge' | 'scale_live' | 'weight_history' | 'oee_gauge' | 'custom';
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config: Record<string, unknown>;
}

export interface DashboardLayout {
  columns: number;
  rowHeight: number;
  widgets: DashboardWidget[];
}

export interface IiotDashboardConfig {
  id: number;
  companyId: number;
  userId: number;
  name: string;
  description?: string;
  isDefault: boolean;
  layout: DashboardLayout;
  refreshIntervalMs: number;
  autoRefresh: boolean;
  isShared: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDashboardConfigDto {
  name: string;
  description?: string;
  isDefault?: boolean;
  layout: DashboardLayout;
  refreshIntervalMs?: number;
  autoRefresh?: boolean;
  isShared?: boolean;
}

export interface UpdateDashboardConfigDto {
  name?: string;
  description?: string;
  isDefault?: boolean;
  layout?: DashboardLayout;
  refreshIntervalMs?: number;
  autoRefresh?: boolean;
  isShared?: boolean;
}

export interface DashboardConfigQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isDefault?: boolean;
  isShared?: boolean;
  userId?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// IIOT SETTINGS
// ============================================================================

export interface IiotSettings {
  id?: number;
  companyId?: number;
  defaultPollIntervalMs: number;
  defaultConnectionTimeoutMs: number;
  defaultReconnectEnabled: boolean;
  defaultReconnectIntervalMs: number;
  defaultReconnectMaxIntervalMs: number;
  dataRetentionDays: number;
  eventRetentionDays: number;
  alarmRetentionDays: number;
  weightRecordPrefix: string;
  weightRecordAutoNumber: boolean;
  enableWebSocketBroadcast: boolean;
  enableAlarmNotifications: boolean;
  enableDeviceEventLogging: boolean;
  maxDevicesPerCompany: number;
  maxTagsPerDevice: number;
  maxAlarmsPerTag: number;
  maxDashboardsPerUser: number;
}

export interface UpdateIiotSettingsDto {
  defaultPollIntervalMs?: number;
  defaultConnectionTimeoutMs?: number;
  defaultReconnectEnabled?: boolean;
  defaultReconnectIntervalMs?: number;
  defaultReconnectMaxIntervalMs?: number;
  dataRetentionDays?: number;
  eventRetentionDays?: number;
  alarmRetentionDays?: number;
  weightRecordPrefix?: string;
  weightRecordAutoNumber?: boolean;
  enableWebSocketBroadcast?: boolean;
  enableAlarmNotifications?: boolean;
  enableDeviceEventLogging?: boolean;
  maxDevicesPerCompany?: number;
  maxTagsPerDevice?: number;
  maxAlarmsPerTag?: number;
  maxDashboardsPerUser?: number;
}

// ============================================================================
// DEVICE WRITE / DISPATCH
// ============================================================================

export type TagAccessMode = 'read' | 'write' | 'read_write';

export interface WriteTagValueRequest {
  address: string;
  dataType: string;
  value: number | boolean | string;
}

export interface TagWriteResult {
  address: string;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface DispatchWorkOrderRequest {
  productName: string;
  quantity: number;
  barcode: string;
  batchNumber?: string;
  productionOrderId?: number;
}

export interface DispatchWorkOrderResponse {
  success: boolean;
  results: TagWriteResult[];
  message: string;
}

export interface IiotWriteLog {
  id: number;
  companyId: number;
  deviceId: number;
  userId: number;
  writeType: string;
  address: string;
  dataType: string;
  valueSent: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  durationMs?: number;
  createdAt: string;
}

export interface WriteLogQueryParams {
  page?: number;
  limit?: number;
  deviceId?: number;
  writeType?: string;
  dateFrom?: string;
  dateTo?: string;
}
