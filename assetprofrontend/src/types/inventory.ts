// ============================================================================
// INVENTORY TYPES
// ============================================================================

// --------------------------------------------------------------------------
// ENUMS
// --------------------------------------------------------------------------

export enum ItemStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  INACTIVE = 'inactive',
}

export enum ItemLifecycleStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  DISCONTINUED = 'discontinued',
  OBSOLETE = 'obsolete',
}

export enum AssemblyType {
  NONE = 'none',
  PRODUCT = 'product',
  SERVICE = 'service',
  KIT = 'kit',
  PURCHASED = 'purchased',
  MANUFACTURED = 'manufactured',
  ASSEMBLY = 'assembly',
}

export enum WeightUnit {
  KG = 'kg',
  LB = 'lb',
  G = 'g',
  OZ = 'oz',
}

export enum VolumeUnit {
  CUBIC_FEET = 'cubic_feet',
  CUBIC_METER = 'cubic_meter',
  LITER = 'liter',
  GALLON = 'gallon',
}

export enum CostingMethod {
  AVERAGE = 'average',
  FIFO = 'fifo',
  LIFO = 'lifo',
  STANDARD = 'standard',
  SPECIFIC = 'specific',
}

export enum BarcodeType {
  EAN13 = 'ean13',
  EAN8 = 'ean8',
  UPC = 'upc',
  CODE128 = 'code128',
  CODE39 = 'code39',
  QR = 'qr',
}

export enum WarehouseType {
  MAIN = 'main',
  BRANCH = 'branch',
  TRANSIT = 'transit',
  CONSIGNMENT = 'consignment',
  VIRTUAL = 'virtual',
  BONDED = 'bonded',
  COLD_STORAGE = 'cold_storage',
}

export enum WarehouseStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  INACTIVE = 'inactive',
}

export enum MovementType {
  RECEIPT = 'Receipt',
  ISSUE = 'Issue',
  TRANSFER = 'Transfer',
  ADJUSTMENT = 'Adjustment',
  WRITE_OFF = 'Write-off',
  RETURN = 'Return',
  PRODUCTION_ISSUE = 'Production Issue',
  PRODUCTION_RECEIPT = 'Production Receipt',
}

export enum MovementStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  POSTED = 'posted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum SourceDocumentType {
  PURCHASE_ORDER = 'purchase_order',
  SALES_ORDER = 'sales_order',
  GRN = 'grn',
  DELIVERY_NOTE = 'delivery_note',
  PRODUCTION_ORDER = 'production_order',
  STOCK_COUNT = 'stock_count',
  ISR = 'isr',
  MANUAL = 'manual',
}

export enum IsrStatus {
  DRAFT = 'draft',
  PENDING_HOD_APPROVAL = 'pending_hod_approval',
  HOD_APPROVED = 'hod_approved',
  PENDING_AUDIT_APPROVAL = 'pending_audit_approval',
  AUDIT_APPROVED = 'audit_approved',
  PENDING_ISSUE = 'pending_issue',
  PARTIALLY_ISSUED = 'partially_issued',
  ISSUED = 'issued',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum IsrPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// --------------------------------------------------------------------------
// ITEM TYPES
// --------------------------------------------------------------------------

export interface ItemBarcode {
  id?: number;
  barcode: string;
  barcodeType?: BarcodeType;
  isDefault?: boolean;
  description?: string;
}

export interface Item {
  id: number;
  companyId: number;
  branchId?: number;
  branchName?: string;
  itemCode: string;
  itemName: string;
  itemDescription?: string;
  itemType?: string;
  categoryId?: number;
  categoryName?: string;
  brandId?: number;
  brandName?: string;
  itemPriceGroupId?: number;
  imagePath?: string;
  assemblyType: AssemblyType;
  itemStatus?: ItemLifecycleStatus;
  defaultVatId?: number;
  vatName?: string;
  vatRate?: number;
  discountCategoryId?: number;
  trackBatches?: boolean;
  trackSerials?: boolean;
  batchControl: boolean;
  isSerialized: boolean;
  isPerishable: boolean;
  isManufacturable?: boolean;
  trackInventory: boolean;
  uomId?: number;
  uomName?: string;
  decimalPlacesQty: number;
  purchaseUnit?: number;
  salesUnit?: number;
  reorderLevel?: number;
  reorderQuantity?: number;
  minimumStockLevel?: number;
  maximumStockLevel?: number;
  economicOrderQuantity?: number;
  standardCost?: number;
  averageCost?: number;
  lastPurchaseCost?: number;
  lastLandedCost?: number;
  lastPurchaseDate?: string;
  sellingPrice?: number;
  minimumSellingPrice?: number;
  suggestedRetailPrice?: number;
  currentMarginPercentage?: number;
  currentMarkupPercentage?: number;
  costingMethod: CostingMethod;
  netWeightKg?: number;
  packagedGrossWeightKg?: number;
  packagedVolumeCubicFeet?: number;
  weightUnit?: WeightUnit;
  volumeUnit?: VolumeUnit;
  panSize?: number;
  shrinkageFactor?: number;
  categoryRisk?: string;
  lotNumberFormat?: string;
  serialNumberSource?: string;
  batchNumberFormat?: string;
  requireBatchOnReceipt?: boolean;
  requireBatchOnIssue?: boolean;
  serialNumberFormat?: string;
  requireSerialOnReceipt?: boolean;
  requireSerialOnIssue?: boolean;
  requireManufactureDate?: boolean;
  shelfLifeDays?: number;
  expiryAlertDays?: number;
  allowExpiredIssue: boolean;
  isHazardous: boolean;
  hazardClass?: string;
  salesAccountId?: number;
  cogsAccountId?: number;
  inventoryAccountId?: number;
  dimensions?: Record<string, unknown>;
  isActive: boolean;
  isSellable: boolean;
  isPurchasable: boolean;
  isVisibleOnPortal: boolean;
  status: ItemStatus;
  approvalNotes?: string;
  submittedById?: number;
  submittedAt?: string;
  approvedById?: number;
  approvedAt?: string;
  barcodes?: ItemBarcode[];
  totalStock?: number;
  availableStock?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemDto {
  branchId?: number;
  itemCode: string;
  itemName: string;
  itemDescription?: string;
  categoryId: number;
  brandId?: number;
  itemPriceGroupId?: number;
  imagePath?: string;
  assemblyType?: AssemblyType;
  itemStatus?: ItemLifecycleStatus;
  defaultVatId?: number;
  discountCategoryId?: number;
  batchControl?: boolean;
  isSerialized?: boolean;
  isPerishable?: boolean;
  trackInventory?: boolean;
  uomId?: number;
  decimalPlacesQty?: number;
  purchaseUnit?: number;
  salesUnit?: number;
  reorderLevel?: number;
  reorderQuantity?: number;
  minimumStockLevel?: number;
  maximumStockLevel?: number;
  economicOrderQuantity?: number;
  standardCost?: number;
  sellingPrice?: number;
  minimumSellingPrice?: number;
  suggestedRetailPrice?: number;
  averageCost?: number;
  lastLandedCost?: number;
  lastPurchaseDate?: string;
  currentMarginPercentage?: number;
  currentMarkupPercentage?: number;
  primaryBarcode?: string;
  barcodeType?: string;
  costingMethod?: CostingMethod;
  netWeightKg?: number;
  packagedGrossWeightKg?: number;
  packagedVolumeCubicFeet?: number;
  weightUnit?: WeightUnit;
  volumeUnit?: VolumeUnit;
  panSize?: number;
  shrinkageFactor?: number;
  categoryRisk?: string;
  batchNumberFormat?: string;
  lotNumberFormat?: string;
  requireBatchOnReceipt?: boolean;
  requireBatchOnIssue?: boolean;
  serialNumberFormat?: string;
  serialNumberSource?: string;
  requireSerialOnReceipt?: boolean;
  requireSerialOnIssue?: boolean;
  shelfLifeDays?: number;
  expiryAlertDays?: number;
  allowExpiredIssue?: boolean;
  requireManufactureDate?: boolean;
  isHazardous?: boolean;
  hazardClass?: string;
  isActive?: boolean;
  isSellable?: boolean;
  isPurchasable?: boolean;
  isVisibleOnPortal?: boolean;
  barcodes?: ItemBarcode[];
}

export interface UpdateItemDto extends Partial<Omit<CreateItemDto, 'itemCode'>> {}

export interface ItemQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  brandId?: number;
  status?: ItemStatus;
  assemblyType?: AssemblyType;
  isActive?: boolean;
  isSellable?: boolean;
  isPurchasable?: boolean;
  batchControl?: boolean;
  isSerialized?: boolean;
  trackInventory?: boolean;
  warehouseId?: number;
}

export interface ItemStats {
  total: number;
  active: number;
  inactive: number;
  draft: number;
  pendingApproval: number;
  lowStock: number;
  outOfStock: number;
  byAssemblyType?: Record<string, number>;
}

// --------------------------------------------------------------------------
// CATEGORY ENUMS
// --------------------------------------------------------------------------

export enum CategoryStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  ACTIVE = 'active',
  REJECTED = 'rejected',
  RETURNED = 'returned',
  DISCARDED = 'discarded',
  INACTIVE = 'inactive',
}

export enum InventoryType {
  FINISHED_GOODS = 'Finished Goods',
  RAW_MATERIAL = 'Raw Material',
  WORK_IN_PROGRESS = 'Work in Progress',
  SERVICE = 'Service',
}

// --------------------------------------------------------------------------
// GL ACCOUNT MAPPINGS
// --------------------------------------------------------------------------

export interface GlAccountMappings {
  inventory_gl_account_id?: number;
  cogs_gl_account_id?: number;
  revenue_gl_account_id?: number;
  expense_gl_account_id?: number;
  wip_gl_account_id?: number;
  inventory_adjustments_gl_account_id?: number;
  internal_stock_issues_gl_account_id?: number;
  grn_clearing_gl_account_id?: number;
  price_variance_gl_account_id?: number;
  sales_returns_gl_account_id?: number;
  manufacturing_overhead_gl_account_id?: number;
  service_cost_gl_account_id?: number;
}

export interface GlAccountDetail {
  id: number;
  code: string;
  name: string;
}

// --------------------------------------------------------------------------
// CATEGORY TYPES
// --------------------------------------------------------------------------

export interface ItemCategory {
  id: number;
  companyId: number;
  categoryCode: string;
  categoryDescription: string;
  categoryName?: string; // alias for categoryDescription
  inventoryType: string;
  vatId: number | null;
  vatName?: string;
  vatRate?: number;
  glAccountMappings: GlAccountMappings | null;
  glAccountDetails?: Record<string, GlAccountDetail>;
  isActive: boolean;
  status: string;
  notes: string | null;
  itemCount?: number;
  // Approval workflow
  submittedById: number | null;
  submittedAt: string | null;
  approvedById: number | null;
  approvedAt: string | null;
  approvalNotes: string | null;
  // Commission settings
  commissionEnabled: boolean;
  commissionRate: number | null;
  commissionPaidOn: string | null;
  commissionApplicableTo: string | null;
  commissionExpenseAccountId: number | null;
  commissionLiabilityAccountId: number | null;
  commissionExpenseAccountName?: string;
  commissionExpenseAccountCode?: string;
  commissionLiabilityAccountName?: string;
  commissionLiabilityAccountCode?: string;
  // Metadata
  createdById: number | null;
  updatedById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDto {
  categoryCode: string;
  categoryDescription: string;
  inventoryType: string;
  vatId?: number;
  glAccountMappings: GlAccountMappings;
  isActive?: boolean;
  notes?: string;
  // Commission
  commissionEnabled?: boolean;
  commissionRate?: number;
  commissionPaidOn?: string;
  commissionApplicableTo?: string;
  commissionExpenseAccountId?: number;
  commissionLiabilityAccountId?: number;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {
  status?: string;
}

export interface CategoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  inventoryType?: string;
  isActive?: boolean;
  status?: string;
}

export interface CategoryStats {
  total: number;
  active: number;
  approved: number;
  draft: number;
  inactive: number;
  withVat: number;
  withGlAccounts: number;
  byInventoryType: Record<string, number>;
}

// --------------------------------------------------------------------------
// BRAND TYPES
// --------------------------------------------------------------------------

export interface Brand {
  id: number;
  companyId: number;
  brandCode: string;
  brandName: string;
  brandUrl?: string;
  description?: string;
  logoPath?: string;
  isActive: boolean;
  createdByName?: string;
  updatedByName?: string;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandDto {
  brandCode?: string;
  brandName: string;
  brandUrl?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateBrandDto extends Partial<CreateBrandDto> {}

export interface BrandQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

// --------------------------------------------------------------------------
// UOM TYPES
// --------------------------------------------------------------------------

export interface UnitOfMeasure {
  id: number;
  companyId: number;
  uomCode: string;
  uomName: string;
  uomType: string;
  baseUomId?: number;
  baseUomName?: string;
  conversionFactor: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUomDto {
  uomCode: string;
  uomName: string;
  uomSymbol?: string;
  uomType?: string;
  baseUomId?: number;
  conversionFactor?: number;
}

export interface UpdateUomDto extends Partial<CreateUomDto> {}

export interface UomQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  uomType?: string;
  isActive?: boolean;
}

export interface UnitConversion {
  id: number;
  companyId: number;
  itemId: number | null;
  fromUnitId: number;
  toUnitId: number;
  conversionFactor: number;
  isBidirectional: boolean;
  fromUnitName: string;
  fromUnitSymbol: string;
  toUnitName: string;
  toUnitSymbol: string;
  itemName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversionDto {
  fromUomId: number;
  toUomId: number;
  conversionFactor: number;
  isDefault?: boolean;
  itemId?: number;
}

// --------------------------------------------------------------------------
// WAREHOUSE TYPES
// --------------------------------------------------------------------------

export interface Warehouse {
  id: number;
  companyId: number;
  branchId?: number;
  branchName?: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: WarehouseType;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  allowsNegativeStock: boolean;
  status: WarehouseStatus;
  totalItems?: number;
  totalValue?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseDto {
  branchId?: number;
  warehouseCode: string;
  warehouseName: string;
  warehouseType?: WarehouseType;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  allowsNegativeStock?: boolean;
}

export interface UpdateWarehouseDto extends Partial<Omit<CreateWarehouseDto, 'warehouseCode'>> {
  status?: WarehouseStatus;
}

export interface WarehouseQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: number;
  warehouseType?: WarehouseType;
  status?: WarehouseStatus;
  allowsNegativeStock?: boolean;
}

export interface WarehouseStats {
  total: number;
  active: number;
  inactive: number;
  byType: Record<string, number>;
  totalItems: number;
  totalValue: number;
}

export interface WarehouseAuthorization {
  id: number;
  warehouseId: number;
  employeeId: number;
  employeeName?: string;
  employeeNumber?: string;
  canView: boolean;
  canReceive: boolean;
  canIssue: boolean;
  canTransfer: boolean;
  canAdjust: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseAuthorizationDto {
  employeeId: number;
  canSell?: boolean;
  canReceive?: boolean;
  canTransfer?: boolean;
  canAdjust?: boolean;
  isActive?: boolean;
}

// Full authorization detail (with employee + warehouse names)
export interface WarehouseAuthorizationDetail {
  id: number;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  branchId: number | null;
  branchName: string | null;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  canView: boolean;
  canSell: boolean;
  canReceive: boolean;
  canIssue: boolean;
  canTransfer: boolean;
  canAdjust: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseAuthorizationData {
  warehouseId: number;
  employeeId: number;
  canView?: boolean;
  canSell?: boolean;
  canReceive?: boolean;
  canIssue?: boolean;
  canTransfer?: boolean;
  canAdjust?: boolean;
  isActive?: boolean;
}

export interface UpdateWarehouseAuthorizationData {
  canView?: boolean;
  canSell?: boolean;
  canReceive?: boolean;
  canIssue?: boolean;
  canTransfer?: boolean;
  canAdjust?: boolean;
  isActive?: boolean;
}

export interface AuthorizedWarehouse {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  branchId: number | null;
  branchName: string | null;
  canView: boolean;
  canSell: boolean;
  canReceive: boolean;
  canIssue: boolean;
  canTransfer: boolean;
  canAdjust: boolean;
}

export interface WarehouseAuthorizationStats {
  total: number;
  activeEmployees: number;
  totalWarehouses: number;
}

export type WarehouseOperation = 'sell' | 'receive' | 'issue' | 'transfer' | 'adjust';

// --------------------------------------------------------------------------
// BIN LOCATION TYPES
// --------------------------------------------------------------------------

export interface BinLocation {
  id: number;
  companyId: number;
  warehouseId: number;
  warehouseName?: string;
  binCode: string;
  binName: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  level?: string;
  position?: string;
  locationPath?: string;
  binType?: string;
  maxCapacity?: number;
  currentCapacity?: number;
  maxWeightKg?: number;
  maxVolumeM3?: number;
  maxItems?: number;
  maxQuantity?: number;
  currentWeightKg?: number;
  currentVolumeM3?: number;
  currentItemsCount?: number;
  currentTotalQuantity?: number;
  isTemperatureControlled?: boolean;
  minTemperatureC?: number;
  maxTemperatureC?: number;
  isHumidityControlled?: boolean;
  targetHumidityPercent?: number;
  isDefault?: boolean;
  isAvailable?: boolean;
  isPickable?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBinLocationDto {
  warehouseId: number;
  binCode: string;
  binName: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  binType?: string;
  maxCapacity?: number;
  isActive?: boolean;
}

export interface UpdateBinLocationDto extends Partial<Omit<CreateBinLocationDto, 'warehouseId' | 'binCode'>> {}

export interface BinLocationQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  warehouseId?: number;
  binType?: string;
  isActive?: boolean;
}

// --------------------------------------------------------------------------
// STOCK LEVEL TYPES
// --------------------------------------------------------------------------

export interface StockLevel {
  id: number;
  companyId: number;
  itemId: number;
  itemCode?: string;
  itemName?: string;
  warehouseId: number;
  warehouseName?: string;
  binLocationId?: number;
  binCode?: string;
  batchId?: number;
  batchNumber?: string;
  serialNumber?: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  quantityOnOrder: number;
  unitCost: number;
  totalValue: number;
  expiryDate?: string;
  lastMovementDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockLevelQueryParams {
  page?: number;
  limit?: number;
  itemId?: number;
  warehouseId?: number;
  binLocationId?: number;
  batchId?: number;
  belowReorderLevel?: boolean;
  hasExpiry?: boolean;
  expiringWithinDays?: number;
}

// --------------------------------------------------------------------------
// STOCK MOVEMENT TYPES
// --------------------------------------------------------------------------

export interface StockMovement {
  id: number;
  companyId: number;
  branchId?: number;
  branchName?: string;
  movementNumber: string;
  movementType: MovementType;
  itemId: number;
  itemCode?: string;
  itemName?: string;
  fromWarehouseId?: number;
  fromWarehouseName?: string;
  toWarehouseId?: number;
  toWarehouseName?: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  batchId?: number;
  batchNumber?: string;
  serialNumber?: string;
  expiryDate?: string;
  sourceDocumentType?: SourceDocumentType;
  sourceDocumentId?: number;
  sourceDocumentNumber?: string;
  reference?: string;
  referenceType?: string;
  referenceId?: number;
  journalEntryId?: number;
  reason?: string;
  movementDate: string;
  status: MovementStatus;
  approvalThreshold?: number;
  approvalNotes?: string;
  rejectionReason?: string;
  approvedByUserId?: number;
  approvedByUserName?: string;
  approvedAt?: string;
  createdByUserId: number;
  createdByUserName?: string;
  pendingStepName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStockMovementDto {
  branchId?: number;
  movementType: MovementType;
  itemId: number;
  fromWarehouseId?: number;
  toWarehouseId?: number;
  quantity: number;
  unitCost?: number;
  batchId?: number;
  serialNumber?: string;
  expiryDate?: string;
  sourceDocumentType?: SourceDocumentType;
  sourceDocumentId?: number;
  reason?: string;
  movementDate?: string;
}

export interface UpdateStockMovementDto {
  quantity?: number;
  unitCost?: number;
  reason?: string;
  movementDate?: string;
}

export interface StockMovementQueryParams {
  page?: number;
  limit?: number;
  itemId?: number;
  warehouseId?: number;
  branchId?: number;
  movementType?: MovementType;
  status?: MovementStatus;
  sourceDocumentType?: SourceDocumentType;
  sourceDocumentId?: number;
  movementNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface StockMovementStats {
  total: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  posted: number;
  rejected: number;
  todayMovements: number;
  totalReceipts: number;
  totalIssues: number;
}

// --------------------------------------------------------------------------
// STOCK REQUEST (ISR) TYPES
// --------------------------------------------------------------------------

export interface IsrLine {
  id?: number;
  itemId: number;
  itemCode?: string;
  itemName?: string;
  quantityRequested: number;
  quantityApproved?: number;
  quantityIssued?: number;
  quantityPending?: number;
  uomId?: number;
  uomName?: string;
  warehouseId?: number;
  warehouseName?: string;
  purpose?: string;
  notes?: string;
}

export interface IsrCurrentStepApprover {
  userId: number;
  name: string;
  email: string;
}

/**
 * Active universal approval-flow step for an ISR.
 * Returned by the backend when the ISR has a pending step in the
 * `process_approvals` system. Null when the ISR is settled or pre-refactor.
 */
export interface IsrCurrentStep {
  stepId: number;
  stepName: string;
  stepOrder: number;
  totalSteps: number;
  approverType: string;
  approvers: IsrCurrentStepApprover[];
  approvalStatusId: number;
  approvalRowId: number;
  flowId: number;
  flowName: string | null;
}

export interface StockRequest {
  id: number;
  companyId: number;
  branchId?: number;
  branchName?: string;
  requestNumber: string;
  mivNumber?: string;
  requestDate: string;
  requiredDate?: string;
  departmentId?: number;
  departmentName?: string;
  costCenter?: string;
  purpose: string;
  notes?: string;
  priority: IsrPriority;
  status: IsrStatus;
  journalEntryId?: number;
  requesterId: number;
  requesterName?: string;
  requestedBy?: number;
  hodApprovedByUserId?: number;
  hodApprovedByUserName?: string;
  hodApprovedAt?: string;
  hodApprovalNotes?: string;
  auditApprovedByUserId?: number;
  auditApprovedByUserName?: string;
  auditApprovedAt?: string;
  auditApprovalNotes?: string;
  issuedByUserId?: number;
  issuedByUserName?: string;
  issuedAt?: string;
  issuedDate?: string;
  issuedBy?: number;
  rejectedByUserId?: number;
  rejectedByUserName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  lines: IsrLine[];
  totalItems: number;
  totalQuantityRequested: number;
  totalQuantityIssued: number;
  /** Universal-flow active step (when registered in process_approvals). */
  currentStep?: IsrCurrentStep | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIsrDto {
  branchId?: number;
  requestDate?: string;
  departmentId?: number;
  costCenter?: string;
  purpose: string;
  notes?: string;
  priority?: IsrPriority;
  lines?: IsrLine[];
}

export interface UpdateIsrDto {
  requestDate?: string;
  departmentId?: number;
  costCenter?: string;
  purpose?: string;
  notes?: string;
  priority?: IsrPriority;
  lines?: IsrLine[];
}

export interface IsrQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: number;
  departmentId?: number;
  requesterId?: number;
  status?: IsrStatus;
  priority?: IsrPriority;
  dateFrom?: string;
  dateTo?: string;
}

export interface IsrStats {
  total: number;
  draft: number;
  pendingHodApproval: number;
  hodApproved: number;
  pendingAuditApproval: number;
  auditApproved: number;
  pendingIssue: number;
  partiallyIssued: number;
  issued: number;
  rejected: number;
}

// --------------------------------------------------------------------------
// INVENTORY SETTINGS TYPES
// --------------------------------------------------------------------------

export type DefaultCostingMethod = 'fifo' | 'lifo' | 'average' | 'standard';
export type NegativeStockPolicy = 'allow' | 'warn' | 'prevent';
export type BatchNumberGeneration = 'manual' | 'auto_sequential' | 'auto_date_based';

export interface InventorySettings {
  // General Settings
  defaultCostingMethod?: DefaultCostingMethod;
  allowNegativeStock?: boolean;
  negativeStockPolicy?: NegativeStockPolicy;
  allowBackdatedMovements?: boolean;
  maxBackdateDays?: number;

  // Feature Toggles
  enableBatchTracking?: boolean;
  enableSerialTracking?: boolean;
  enableExpiryTracking?: boolean;
  enableBinLocations?: boolean;
  enableQualityInspection?: boolean;
  autoPostMovements?: boolean;

  // Item Defaults
  defaultTrackInventory?: boolean;
  defaultBatchControl?: boolean;
  defaultSerialControl?: boolean;

  // Stock Alerts
  enableLowStockAlerts?: boolean;
  lowStockAlertThreshold?: number;
  enableExpiryAlerts?: boolean;
  defaultExpiryAlertDays?: number;
  lowStockAlertDays?: number;
  expiryAlertDays?: number;
  enableReorderAlerts?: boolean;

  // Batch Settings
  batchNumberGeneration?: BatchNumberGeneration;
  batchNumberPrefix?: string;
  batchNumberLength?: number;
  batchNumberFormat?: string;

  // Serial Settings
  serialNumberPrefix?: string;
  serialNumberFormat?: string;

  // Approval Settings
  requireApprovalForAdjustments?: boolean;
  adjustmentApprovalThreshold?: number;
  requireApprovalForTransfers?: boolean;
  transferApprovalThreshold?: number;

  // Default Warehouse
  defaultWarehouseId?: number;

  // GL Integration
  autoPostToGl?: boolean;

  // ISR Settings
  enableIsrWorkflow?: boolean;
  requireIsrHodApproval?: boolean;
  requireIsrAuditApproval?: boolean;
  isrNumberPrefix?: string;

  // Custom Settings
  customSettings?: Record<string, unknown>;
}

export type UpdateInventorySettingsDto = InventorySettings;

// --------------------------------------------------------------------------
// CYCLE COUNT TYPES
// --------------------------------------------------------------------------

export type ABCClassification = 'A' | 'B' | 'C';
export type CycleCountFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
export type CycleCountAssignmentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export interface CycleCountSchedule {
  id: number;
  companyId: number;
  warehouseId: number;
  name: string;
  description?: string;
  abcClassification: ABCClassification;
  frequency: CycleCountFrequency;
  startDate: string;
  endDate: string;
  assignedUserId?: number;
  isActive: boolean;
  lastRunDate?: string;
  nextRunDate?: string;
  totalAssignments?: number;
  completedAssignments?: number;
  pendingAssignments?: number;
  createdAt: string;
  updatedAt: string;
  warehouse?: { id: number; name: string };
  assignedUser?: { id: number; name: string };
}

export interface CreateCycleCountScheduleDto {
  companyId: number;
  warehouseId: number;
  name: string;
  description?: string;
  abcClassification: ABCClassification;
  frequency: CycleCountFrequency;
  startDate: string;
  endDate: string;
  assignedUserId?: number;
  isActive?: boolean;
}

export interface UpdateCycleCountScheduleDto {
  name?: string;
  description?: string;
  abcClassification?: ABCClassification;
  frequency?: CycleCountFrequency;
  startDate?: string;
  endDate?: string;
  assignedUserId?: number;
  isActive?: boolean;
}

export interface CycleCountAssignment {
  id: number;
  scheduleId: number;
  itemId: number;
  warehouseId: number;
  scheduledDate: string;
  status: CycleCountAssignmentStatus;
  assignedUserId?: number;
  stockCountId?: number;
  completedDate?: string;
  skipReason?: string;
  createdAt: string;
  item?: { id: number; itemCode: string; itemName: string };
  warehouse?: { id: number; name: string };
  assignedUser?: { id: number; name: string };
  stockCount?: { id: number; countNumber?: string; status: string };
}

// --------------------------------------------------------------------------
// STOCK COUNT TYPES
// --------------------------------------------------------------------------

export interface StockCount {
  id: number;
  companyId?: number;
  branchId?: number;
  warehouseId: number;
  countNumber?: string;
  countDate: string;
  countType: string;
  countMethod: string;
  categoryId?: number;
  binLocation?: string;
  status: string;
  totalItems: number;
  countedItems: number;
  varianceItems: number;
  totalVarianceValue: number;
  totalPositiveVariance: number;
  totalNegativeVariance: number;
  notes?: string;
  reviewNotes?: string;
  countedBy?: number;
  countingStartedAt?: string;
  countingCompletedAt?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  approvedBy?: number;
  approvedAt?: string;
  postedBy?: number;
  postedAt?: string;
  completedAt?: string;
  completedBy?: number;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

// --------------------------------------------------------------------------
// STOCK BATCH TYPES
// --------------------------------------------------------------------------

export interface StockBatch {
  id: number;
  companyId?: number;
  itemId: number;
  warehouseId: number;
  batchNumber: string;
  lotNumber?: string;
  batchBarcode?: string;
  manufactureDate?: string;
  expiryDate?: string;
  receivedDate?: string;
  originalQuantity?: number;
  quantity: number;
  allocatedQuantity?: number;
  cost?: number;
  batchValue?: number;
  batchStatus: string;
  supplierId?: number;
  supplierBatchRef?: string;
  qualityCheckDate?: string;
  qualityStatus?: string;
  qualityNotes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// --------------------------------------------------------------------------
// BRANCH ITEM TYPES
// --------------------------------------------------------------------------

export interface BranchItem {
  id: number;
  branchId: number;
  itemId: number;
  companyId?: number;
  isActive: boolean;
  isSellable: boolean;
  isPurchasable: boolean;
  reorderLevel?: number;
  reorderQuantity?: number;
  minimumStockLevel?: number;
  maximumStockLevel?: number;
  binLocation?: string;
  shelfLocation?: string;
}

// --------------------------------------------------------------------------
// ITEM BEGINNING BALANCE TYPES
// --------------------------------------------------------------------------

export interface ItemBeginningBalance {
  id: number;
  companyId?: number;
  itemId: number;
  warehouseId?: number;
  financialYearId?: number;
  balanceDate: string;
  openingQuantity: number;
  uomId?: number;
  unitCost: number;
  totalValue?: number;
  valuationMethod?: string;
  batchNumber?: string;
  expiryDate?: string;
  manufactureDate?: string;
  journalEntryId?: number;
  status: string;
  approvedAt?: string;
  approvedById?: number;
  postedAt?: string;
  notes?: string;
  // Joined fields
  itemCode?: string;
  itemName?: string;
  warehouseName?: string;
  uomName?: string;
  fiscalYearName?: string;
}

export interface BeginningBalanceStats {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  posted: number;
  totalValue: number;
}

export interface BeginningBalanceQueryParams {
  search?: string;
  branchId?: number;
  warehouseId?: number;
  financialYearId?: number;
  status?: string;
  page?: number;
  limit?: number;
}

export interface BeginningBalanceGridItem {
  id: number;
  itemCode: string;
  itemName: string;
  itemDescription?: string;
  uomId?: number;
  uomName?: string;
  standardCost?: number;
  averageCost?: number;
  batchControl?: boolean;
  trackSerials?: boolean;
  // Balance data (null if no balance exists)
  balanceId?: number;
  openingQuantity?: number;
  unitCost?: number;
  totalValue?: number;
  balanceStatus?: string;
  valuationMethod?: string;
  batchNumber?: string;
  expiryDate?: string;
  manufactureDate?: string;
  balanceNotes?: string;
}

export interface BulkSaveBeginningBalancesDto {
  branchId?: number;
  warehouseId?: number;
  financialYearId?: number;
  balanceDate: string;
  balances: {
    itemId: number;
    openingQuantity: number;
    unitCost: number;
    uomId?: number;
    valuationMethod?: string;
    batchNumber?: string;
    expiryDate?: string;
    manufactureDate?: string;
    notes?: string;
  }[];
}

// --------------------------------------------------------------------------
// ISR APPROVAL TYPES
// --------------------------------------------------------------------------

export interface IsrApproval {
  id: number;
  isrRequestId: number;
  approvalType: string;
  approverId?: number;
  approverName?: string;
  approverTitle?: string;
  status: string;
  comments?: string;
  approvedAt?: string;
  signaturePath?: string;
  hasStamp: boolean;
  stampType?: string;
}

// --------------------------------------------------------------------------
// BIN ITEM ASSIGNMENT TYPES
// --------------------------------------------------------------------------

export interface BinItemAssignment {
  id: number;
  binLocationId: number;
  itemId: number;
  stockBatchId?: number;
  quantity: number;
  allocatedQuantity: number;
  assignmentType: string;
  isPrimary: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  replenishmentQuantity?: number;
  lastMovementAt?: string;
  lastMovementType?: string;
}

// --------------------------------------------------------------------------
// ITEM PRICE TYPES
// --------------------------------------------------------------------------

export enum PriceType {
  STANDARD = 'standard',
  PROMOTIONAL = 'promotional',
  CONTRACT = 'contract',
  VOLUME = 'volume',
  SPECIAL = 'special',
}

export interface ItemPrice {
  id: number;
  companyId: number;
  itemId: number;
  itemCode?: string;
  itemName?: string;
  itemPriceGroupId: number;
  priceGroupName?: string;
  priceGroupCode?: string;
  branchId?: number;
  branchName?: string;
  currencyId?: number;
  currencyCode?: string;
  currencyName?: string;
  unitPrice: number;
  minimumPrice?: number;
  maximumPrice?: number;
  costPrice?: number;
  minQuantity?: number;
  maxQuantity?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  priceType?: PriceType;
  promotionCode?: string;
  isActive: boolean;
  notes?: string;
  createdById?: number;
  updatedById?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemPriceDto {
  itemId: number;
  itemPriceGroupId: number;
  branchId?: number;
  currencyId?: number;
  unitPrice: number;
  minimumPrice?: number;
  maximumPrice?: number;
  costPrice?: number;
  minQuantity?: number;
  maxQuantity?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  priceType?: PriceType;
  promotionCode?: string;
  isActive?: boolean;
  notes?: string;
}

export interface UpdateItemPriceDto {
  branchId?: number;
  currencyId?: number;
  unitPrice?: number;
  minimumPrice?: number;
  maximumPrice?: number;
  costPrice?: number;
  minQuantity?: number;
  maxQuantity?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  priceType?: PriceType;
  promotionCode?: string;
  isActive?: boolean;
  notes?: string;
}

export interface ItemPriceQueryParams {
  page?: number;
  limit?: number;
  itemId?: number;
  itemPriceGroupId?: number;
  branchId?: number;
  currencyId?: number;
  priceType?: PriceType;
  isActive?: boolean;
  effectiveDate?: string;
  search?: string;
}

export interface ItemPriceStats {
  total: number;
  active: number;
  inactive: number;
  standard: number;
  promotional: number;
  contract: number;
  volume: number;
  special: number;
}

export interface ItemPriceGroup {
  id: number;
  companyId: number;
  groupCode: string;
  groupName: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// --------------------------------------------------------------------------
// REPORT TYPES
// --------------------------------------------------------------------------

export interface StockValuationReport {
  warehouseId?: number;
  warehouseName?: string;
  items: {
    itemId: number;
    itemCode: string;
    itemName: string;
    categoryName?: string;
    quantityOnHand: number;
    unitCost: number;
    totalValue: number;
  }[];
  totalQuantity: number;
  totalValue: number;
}

export interface MovementSummaryReport {
  period: string;
  receipts: number;
  issues: number;
  transfers: number;
  adjustments: number;
  netMovement: number;
}

export interface SlowMovingItemsReport {
  items: {
    itemId: number;
    itemCode: string;
    itemName: string;
    quantityOnHand: number;
    totalValue: number;
    lastMovementDate?: string;
    daysWithoutMovement: number;
  }[];
}

export interface ExpiringStockReport {
  items: {
    itemId: number;
    itemCode: string;
    itemName: string;
    batchNumber?: string;
    warehouseName: string;
    quantityOnHand: number;
    expiryDate: string;
    daysUntilExpiry: number;
  }[];
}

// ============================================================================
// IMPORT TYPES
// ============================================================================

export interface ImportCategoryItem {
  categoryCode: string;
  categoryDescription: string;
  inventoryType: string;
  isActive?: string;
  notes?: string;
  // GL Account Mappings (by account code, resolved to IDs on import)
  inventoryAccount?: string;
  cogsAccount?: string;
  revenueAccount?: string;
  adjustmentsAccount?: string;
  salesReturnsAccount?: string;
  internalIssuesAccount?: string;
  grnClearingAccount?: string;
  wipAccount?: string;
  mfgOverheadAccount?: string;
  serviceCostAccount?: string;
  // Commission fields
  commissionEnabled?: string;
  commissionRate?: string;
  commissionPaidOn?: string;
  commissionApplicableTo?: string;
  commissionExpenseAccount?: string;
  commissionLiabilityAccount?: string;
}

export interface ImportCategoriesResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; code: string; message: string }[];
}

export interface ImportItemRow {
  itemCode: string;
  itemName: string;
  itemDescription?: string;
  categoryCode?: string;
  brandName?: string;
  uomCode?: string;
  assemblyType?: string;
  sellingPrice?: string;
  standardCost?: string;
  costingMethod?: string;
  reorderLevel?: string;
  minimumStockLevel?: string;
  maximumStockLevel?: string;
  trackInventory?: string;
  isSellable?: string;
  isPurchasable?: string;
  isActive?: string;
  barcode?: string;
}

export interface ImportItemsResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; code: string; message: string }[];
}
