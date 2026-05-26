// ============================================================================
// ASSET MODULE TYPES
// ============================================================================

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

// MUST match the Postgres "DepreciationMethod" enum (uppercase). Lowercase
// values were the cause of the 2026-04-23 "invalid input value for enum"
// error on asset creation — fixed.
export type DepreciationMethod = 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'UNITS_OF_PRODUCTION' | 'SUM_OF_YEARS_DIGITS';

export type AssetStatus = 'active' | 'inactive' | 'under_maintenance' | 'disposed' | 'lost' | 'stolen' | 'written_off';

export type AssetCondition = 'new' | 'good' | 'fair' | 'poor' | 'damaged';

export type AcquisitionMethod = 'purchase' | 'donation' | 'lease' | 'construction' | 'trade_in' | 'other';

export type DisposalType = 'sale' | 'scrap' | 'donation' | 'trade_in' | 'theft' | 'loss' | 'write_off' | 'insurance_claim' | 'other';

export type DisposalStatus = 'draft' | 'pending_approval' | 'approved' | 'completed' | 'cancelled';

export type TransferType = 'location' | 'department' | 'custodian' | 'branch' | 'company';

export type TransferStatus = 'draft' | 'pending_approval' | 'approved' | 'in_transit' | 'completed' | 'cancelled';

export type MaintenanceType = 'preventive' | 'corrective' | 'predictive' | 'condition_based' | 'emergency' | 'routine';

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical';

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

export type DepreciationStatus = 'draft' | 'pending' | 'approved' | 'posted' | 'reversed';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'semi_annually' | 'annually';

// ============================================================================
// ASSET CLASS
// ============================================================================

export interface AssetClass {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description?: string;
  depreciationMethod: DepreciationMethod;
  usefulLifeYears: number;
  residualValuePercent: number;
  assetAccountId?: number;
  assetAccountCode?: string;
  assetAccountName?: string;
  accumulatedDepreciationAccountId?: number;
  accumulatedDepreciationAccountCode?: string;
  accumulatedDepreciationAccountName?: string;
  depreciationExpenseAccountId?: number;
  depreciationExpenseAccountCode?: string;
  depreciationExpenseAccountName?: string;
  isActive: boolean;
  assetCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetClassDto {
  code: string;
  name: string;
  description?: string;
  depreciationMethod?: DepreciationMethod;
  usefulLifeYears?: number;
  residualValuePercent?: number;
  assetAccountId?: number;
  accumulatedDepreciationAccountId?: number;
  depreciationExpenseAccountId?: number;
  isActive?: boolean;
}

export interface UpdateAssetClassDto {
  name?: string;
  description?: string;
  depreciationMethod?: DepreciationMethod;
  usefulLifeYears?: number;
  residualValuePercent?: number;
  assetAccountId?: number;
  accumulatedDepreciationAccountId?: number;
  depreciationExpenseAccountId?: number;
  isActive?: boolean;
}

export interface AssetClassQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface AssetClassStats {
  total: number;
  active: number;
  inactive: number;
  totalAssets: number;
}

// ============================================================================
// ASSET (MAIN ENTITY)
// ============================================================================

export interface Asset {
  id: number;
  companyId: number;
  assetClassId: number;
  assetClassName?: string;
  assetClassCode?: string;

  // Identification
  assetCode: string;
  name: string;
  description?: string;
  serialNumber?: string;
  barcode?: string;

  // Location & Custody
  location?: string;
  department?: string;
  custodianUserId?: number;
  custodianName?: string;

  // Acquisition
  acquisitionDate?: string;
  acquisitionCost: number;
  acquisitionMethod?: AcquisitionMethod;
  supplierId?: number;
  supplierName?: string;
  purchaseOrderNumber?: string;
  invoiceNumber?: string;
  grnId?: number;
  grnLineId?: number;

  // Depreciation
  depreciationMethod: DepreciationMethod;
  usefulLifeYears: number;
  residualValue: number;
  residualValuePercent: number;
  depreciationStartDate?: string;

  // Financial Tracking
  bookValue: number;
  accumulatedDepreciation: number;
  impairmentLoss: number;
  lastDepreciationDate?: string;

  // Net Book Value (calculated)
  netBookValue?: number;
  depreciationPercent?: number;

  // Status
  status: AssetStatus;
  condition: AssetCondition;

  // Warranty
  warrantyStartDate?: string;
  warrantyExpiryDate?: string;
  isUnderWarranty?: boolean;

  // Maintenance
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;

  // Disposal
  disposalDate?: string;
  disposalValue?: number;
  disposalMethod?: string;
  disposalNotes?: string;

  // Metadata
  notes?: string;
  customFields?: Record<string, unknown>;
  imagePath?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetDto {
  assetClassId: number;
  assetCode?: string;
  name: string;
  description?: string;
  serialNumber?: string;
  barcode?: string;
  location?: string;
  department?: string;
  custodianUserId?: number;
  acquisitionDate?: string;
  acquisitionCost: number;
  acquisitionMethod?: AcquisitionMethod;
  supplierId?: number;
  purchaseOrderNumber?: string;
  invoiceNumber?: string;
  depreciationMethod?: DepreciationMethod;
  usefulLifeYears?: number;
  residualValue?: number;
  residualValuePercent?: number;
  depreciationStartDate?: string;
  status?: AssetStatus;
  condition?: AssetCondition;
  warrantyStartDate?: string;
  warrantyExpiryDate?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
}

export interface UpdateAssetDto {
  assetClassId?: number;
  name?: string;
  description?: string;
  serialNumber?: string;
  barcode?: string;
  location?: string;
  department?: string;
  custodianUserId?: number;
  acquisitionDate?: string;
  acquisitionCost?: number;
  acquisitionMethod?: AcquisitionMethod;
  supplierId?: number;
  purchaseOrderNumber?: string;
  invoiceNumber?: string;
  depreciationMethod?: DepreciationMethod;
  usefulLifeYears?: number;
  residualValue?: number;
  residualValuePercent?: number;
  depreciationStartDate?: string;
  status?: AssetStatus;
  condition?: AssetCondition;
  warrantyStartDate?: string;
  warrantyExpiryDate?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
}

export interface AssetQuery {
  page?: number;
  limit?: number;
  search?: string;
  assetClassId?: number;
  status?: AssetStatus;
  condition?: AssetCondition;
  location?: string;
  department?: string;
  custodianUserId?: number;
  isActive?: boolean;
}

export interface AssetStats {
  total: number;
  active: number;
  inactive: number;
  underMaintenance: number;
  disposed: number;
  totalValue: number;
  totalAccumulatedDepreciation: number;
  totalNetBookValue: number;
}

// ============================================================================
// ASSET DEPRECIATION
// ============================================================================

export interface AssetDepreciation {
  id: number;
  companyId: number;
  assetId: number;
  assetCode?: string;
  assetName?: string;

  // Period
  depreciationDate: string;
  fiscalYear: number;
  fiscalPeriod: number;
  periodName?: string;

  // Method
  depreciationMethod: DepreciationMethod;

  // Calculations
  openingBookValue: number;
  depreciationAmount: number;
  closingBookValue: number;
  accumulatedDepreciation: number;

  // Details
  annualDepreciationRate?: number;
  usefulLifeYears: number;
  residualValue: number;
  monthsDepreciated: number;

  // GL Posting
  isPosted: boolean;
  transactionId?: number;
  postedAt?: string;
  postedByUserId?: number;
  postedByUserName?: string;

  // Batch
  batchNumber?: string;
  isAdjustment: boolean;
  adjustmentReason?: string;

  // Status
  status: DepreciationStatus;

  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetDepreciationDto {
  assetId: number;
  depreciationDate: string;
  fiscalYear: number;
  fiscalPeriod: number;
  periodName?: string;
  depreciationMethod?: DepreciationMethod;
  depreciationAmount?: number;
  batchNumber?: string;
  isAdjustment?: boolean;
  adjustmentReason?: string;
}

export interface UpdateAssetDepreciationDto {
  depreciationDate?: string;
  fiscalYear?: number;
  fiscalPeriod?: number;
  periodName?: string;
  depreciationAmount?: number;
  isAdjustment?: boolean;
  adjustmentReason?: string;
}

export interface AssetDepreciationQuery {
  page?: number;
  limit?: number;
  assetId?: number;
  fiscalYear?: number;
  fiscalPeriod?: number;
  status?: DepreciationStatus;
  isPosted?: boolean;
  batchNumber?: string;
}

export interface AssetDepreciationStats {
  total: number;
  draft: number;
  pending: number;
  posted: number;
  totalAmount: number;
}

// ============================================================================
// ASSET DISPOSAL
// ============================================================================

export interface AssetDisposal {
  id: number;
  companyId: number;
  assetId: number;
  assetCode?: string;
  assetName?: string;

  // Identification
  disposalNumber: string;
  disposalDate: string;
  disposalType: DisposalType;

  // Financial Impact
  bookValueAtDisposal: number;
  accumulatedDepreciation: number;
  disposalProceeds: number;
  disposalCosts: number;
  gainLoss: number;

  // Buyer Details
  buyerEntityId?: number;
  buyerName?: string;
  buyerContact?: string;
  buyerAddress?: string;

  // Documentation
  saleAgreementNumber?: string;
  invoiceNumber?: string;
  paymentReceivedDate?: string;
  paymentMethod?: string;

  // Approval Workflow
  status: DisposalStatus;
  requestedByUserId?: number;
  requestedByUserName?: string;
  approvedByUserId?: number;
  approvedByUserName?: string;
  approvedAt?: string;
  completedAt?: string;

  // GL Integration
  isPosted: boolean;
  transactionId?: number;
  postedAt?: string;

  // Notes
  reason?: string;
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetDisposalDto {
  assetId: number;
  disposalDate: string;
  disposalType: DisposalType;
  disposalProceeds?: number;
  disposalCosts?: number;
  buyerName?: string;
  buyerContact?: string;
  buyerAddress?: string;
  saleAgreementNumber?: string;
  invoiceNumber?: string;
  paymentReceivedDate?: string;
  paymentMethod?: string;
  reason?: string;
  notes?: string;
}

export interface UpdateAssetDisposalDto {
  disposalDate?: string;
  disposalType?: DisposalType;
  disposalProceeds?: number;
  disposalCosts?: number;
  buyerName?: string;
  buyerContact?: string;
  buyerAddress?: string;
  saleAgreementNumber?: string;
  invoiceNumber?: string;
  paymentReceivedDate?: string;
  paymentMethod?: string;
  reason?: string;
  notes?: string;
}

export interface AssetDisposalQuery {
  page?: number;
  limit?: number;
  assetId?: number;
  disposalType?: DisposalType;
  status?: DisposalStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface AssetDisposalStats {
  total: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  completed: number;
  totalProceeds: number;
  totalGainLoss: number;
}

// ============================================================================
// ASSET TRANSFER
// ============================================================================

export interface AssetTransfer {
  id: number;
  companyId: number;
  assetId: number;
  assetCode?: string;
  assetName?: string;

  // Identification
  transferNumber: string;
  transferDate: string;
  effectiveDate?: string;
  transferType: TransferType;

  // From
  fromLocation?: string;
  fromDepartment?: string;
  fromCustodianUserId?: number;
  fromCustodianName?: string;
  fromBranchId?: number;
  fromBranchName?: string;

  // To
  toLocation?: string;
  toDepartment?: string;
  toCustodianUserId?: number;
  toCustodianName?: string;
  toBranchId?: number;
  toBranchName?: string;

  // Condition
  conditionAtTransfer?: AssetCondition;
  conditionNotes?: string;

  // Approval Workflow
  status: TransferStatus;
  requestedByUserId?: number;
  requestedByUserName?: string;
  approvedByUserId?: number;
  approvedByUserName?: string;
  approvedAt?: string;
  dispatchedAt?: string;
  receivedByUserId?: number;
  receivedByUserName?: string;
  receivedAt?: string;

  // Notes
  reason?: string;
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetTransferDto {
  assetId: number;
  transferDate: string;
  effectiveDate?: string;
  transferType: TransferType;
  toLocation?: string;
  toDepartment?: string;
  toCustodianUserId?: number;
  toBranchId?: number;
  conditionAtTransfer?: AssetCondition;
  conditionNotes?: string;
  reason?: string;
  notes?: string;
}

export interface UpdateAssetTransferDto {
  transferDate?: string;
  effectiveDate?: string;
  transferType?: TransferType;
  toLocation?: string;
  toDepartment?: string;
  toCustodianUserId?: number;
  toBranchId?: number;
  conditionAtTransfer?: AssetCondition;
  conditionNotes?: string;
  reason?: string;
  notes?: string;
}

export interface AssetTransferQuery {
  page?: number;
  limit?: number;
  assetId?: number;
  transferType?: TransferType;
  status?: TransferStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface AssetTransferStats {
  total: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  inTransit: number;
  completed: number;
}

// ============================================================================
// ASSET MAINTENANCE
// ============================================================================

export interface AssetMaintenance {
  id: number;
  companyId: number;
  assetId: number;
  assetCode?: string;
  assetName?: string;

  // Identification
  maintenanceNumber: string;
  title: string;
  description?: string;

  // Type & Priority
  maintenanceType: MaintenanceType;
  priority: MaintenancePriority;

  // Scheduling
  scheduledDate?: string;
  dueDate?: string;
  startedDate?: string;
  completedDate?: string;

  // Duration
  estimatedDurationHours?: number;
  actualDurationHours?: number;

  // Recurrence
  isRecurring: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceInterval?: number;
  nextScheduledDate?: string;

  // Vendor
  vendorName?: string;
  vendorContact?: string;
  technicianName?: string;
  assignedToUserId?: number;
  assignedToUserName?: string;

  // Costs
  estimatedCost?: number;
  actualCost?: number;
  laborCost?: number;
  partsCost?: number;
  costBreakdown?: string;

  // Parts & Materials
  partsUsed?: string;
  materialsUsed?: string;

  // Condition Assessment
  conditionBefore?: AssetCondition;
  conditionAfter?: AssetCondition;

  // Meter Readings
  meterReadingBefore?: number;
  meterReadingAfter?: number;
  meterUnit?: string;

  // Documentation
  workPerformed?: string;
  findings?: string;
  recommendations?: string;
  notes?: string;

  // Workflow
  status: MaintenanceStatus;
  requiresFollowUp: boolean;
  followUpNotes?: string;

  // Approval
  requestedByUserId?: number;
  requestedByUserName?: string;
  approvedByUserId?: number;
  approvedByUserName?: string;
  approvedAt?: string;
  completedByUserId?: number;
  completedByUserName?: string;

  // GL Integration
  isPosted: boolean;
  transactionId?: number;
  postedAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetMaintenanceDto {
  assetId: number;
  title: string;
  description?: string;
  maintenanceType: MaintenanceType;
  priority?: MaintenancePriority;
  scheduledDate?: string;
  dueDate?: string;
  estimatedDurationHours?: number;
  isRecurring?: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceInterval?: number;
  vendorName?: string;
  vendorContact?: string;
  technicianName?: string;
  assignedToUserId?: number;
  estimatedCost?: number;
  notes?: string;
}

export interface UpdateAssetMaintenanceDto {
  title?: string;
  description?: string;
  maintenanceType?: MaintenanceType;
  priority?: MaintenancePriority;
  scheduledDate?: string;
  dueDate?: string;
  estimatedDurationHours?: number;
  actualDurationHours?: number;
  isRecurring?: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceInterval?: number;
  vendorName?: string;
  vendorContact?: string;
  technicianName?: string;
  assignedToUserId?: number;
  estimatedCost?: number;
  actualCost?: number;
  laborCost?: number;
  partsCost?: number;
  costBreakdown?: string;
  partsUsed?: string;
  materialsUsed?: string;
  conditionBefore?: AssetCondition;
  conditionAfter?: AssetCondition;
  meterReadingBefore?: number;
  meterReadingAfter?: number;
  meterUnit?: string;
  workPerformed?: string;
  findings?: string;
  recommendations?: string;
  notes?: string;
  requiresFollowUp?: boolean;
  followUpNotes?: string;
}

export interface AssetMaintenanceQuery {
  page?: number;
  limit?: number;
  assetId?: number;
  maintenanceType?: MaintenanceType;
  priority?: MaintenancePriority;
  status?: MaintenanceStatus;
  isRecurring?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface AssetMaintenanceStats {
  total: number;
  scheduled: number;
  inProgress: number;
  onHold: number;
  completed: number;
  overdue: number;
  totalCost: number;
}

// ============================================================================
// ASSET SETTINGS
// ============================================================================

export interface AssetSettings {
  id: number;
  companyId: number;

  // Depreciation Settings
  defaultDepreciationMethod: DepreciationMethod;
  autoCalculateDepreciation: boolean;
  depreciationFrequency: 'monthly' | 'quarterly' | 'annually';
  prorationFirstYear: boolean;
  prorationDisposalYear: boolean;
  midMonthConvention: boolean;

  // Lifecycle Settings
  requireAssetApproval: boolean;
  requireDisposalApproval: boolean;
  requireTransferApproval: boolean;
  requireMaintenanceApproval: boolean;
  autoGenerateCode: boolean;
  codePrefix: string;
  codePadding: number;

  // Valuation Settings
  allowRevaluation: boolean;
  requireRevaluationApproval: boolean;
  trackImpairment: boolean;
  calculateFairValue: boolean;

  // Maintenance Settings
  trackMaintenanceCosts: boolean;
  maintenanceReminderDays: number;
  allowMaintenanceScheduling: boolean;
  capitalizationThreshold: number;

  // Transfer Settings
  allowInterCompanyTransfer: boolean;
  allowInterBranchTransfer: boolean;
  requirePhysicalVerification: boolean;

  // Notification Settings
  notifyOnDepreciation: boolean;
  notifyOnMaintenanceDue: boolean;
  notifyOnWarrantyExpiry: boolean;
  notifyOnDisposal: boolean;
  warrantyExpiryReminderDays: number;

  // Barcode & Tracking
  enableBarcode: boolean;
  enableQrCode: boolean;
  barcodeFormat?: string;

  createdAt: string;
  updatedAt: string;
}

export interface UpdateAssetSettingsDto {
  defaultDepreciationMethod?: DepreciationMethod;
  autoCalculateDepreciation?: boolean;
  depreciationFrequency?: 'monthly' | 'quarterly' | 'annually';
  prorationFirstYear?: boolean;
  prorationDisposalYear?: boolean;
  midMonthConvention?: boolean;
  requireAssetApproval?: boolean;
  requireDisposalApproval?: boolean;
  requireTransferApproval?: boolean;
  requireMaintenanceApproval?: boolean;
  autoGenerateCode?: boolean;
  codePrefix?: string;
  codePadding?: number;
  allowRevaluation?: boolean;
  requireRevaluationApproval?: boolean;
  trackImpairment?: boolean;
  calculateFairValue?: boolean;
  trackMaintenanceCosts?: boolean;
  maintenanceReminderDays?: number;
  allowMaintenanceScheduling?: boolean;
  capitalizationThreshold?: number;
  allowInterCompanyTransfer?: boolean;
  allowInterBranchTransfer?: boolean;
  requirePhysicalVerification?: boolean;
  notifyOnDepreciation?: boolean;
  notifyOnMaintenanceDue?: boolean;
  notifyOnWarrantyExpiry?: boolean;
  notifyOnDisposal?: boolean;
  warrantyExpiryReminderDays?: number;
  enableBarcode?: boolean;
  enableQrCode?: boolean;
  barcodeFormat?: string;
}
