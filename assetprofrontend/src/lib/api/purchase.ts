import { api } from '../api';

// ============================================================================
// TYPES
// ============================================================================

// Inspection Checklist Types
export interface ChecklistItem {
  id: string;
  label: string;
  type: 'checkbox' | 'text' | 'number';
  value: boolean | string | number | null;
}

export interface ChecklistSection {
  title: string;
  instruction?: string;
  items: ChecklistItem[];
}

// Supplier Types
export interface Supplier {
  id: number;
  companyId: number;
  code: string | null;
  name: string;
  email: string;
  phone: string | null;
  contactPerson: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  taxId: string | null;
  bankName: string | null;
  bankAccount: string | null;
  paymentTerms: string | null;
  supplierType: 'goods' | 'services' | 'both';
  category: string | null;
  website: string | null;
  currencyId: number | null;
  currencyCode?: string | null;
  currencyName?: string | null;
  accountsPayableId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierStats {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  byType: {
    goods: number;
    services: number;
    both: number;
  };
}

// Purchase Settings Types
export interface PurchaseSettings {
  id: number;
  companyId: number;
  // Document Numbering (prefixes only — sequence numbering managed by backend)
  requisitionPrefix: string | null;
  rfqPrefix: string | null;
  quotationPrefix: string | null;
  poPrefix: string | null;
  grnPrefix: string | null;
  inspectionPrefix: string | null;
  invoicePrefix: string | null;
  serviceOrderPrefix: string | null;
  serviceInspectionPrefix: string | null;
  certificatePrefix: string | null;
  returnPrefix: string | null;
  // Approval Workflows
  requireRequisitionApproval: boolean;
  requisitionApprovalThreshold: number | null;
  requirePoApproval: boolean;
  poApprovalThreshold: number | null;
  requireRfqApproval: boolean;
  rfqApprovalThreshold: number | null;
  requireInvoiceApproval: boolean;
  invoiceApprovalThreshold: number | null;
  requireServiceOrderApproval: boolean;
  serviceOrderApprovalThreshold: number | null;
  // Quality Control
  requireInspection: boolean;
  inspectionOfficerCount: number | null;
  allowPartialDelivery: boolean;
  requireServiceInspection: boolean;
  serviceInspectionOfficerCount: number | null;
  allowPartialServiceCompletion: boolean;
  inspectionAutoAssignOfficers: boolean;
  inspectionRequireAllOfficers: boolean;
  inspectionRequireSignature: boolean;
  inspectionQualityRatingType: string | null;
  // Invoice Matching
  requireThreeWayMatch: boolean;
  matchTolerancePercentage: number | null;
  defaultPaymentTerms: string | null;
  // Tax Settings
  defaultVatRate: number | null;
  defaultWhtRate: number | null;
  applyVatByDefault: boolean;
  applyWhtByDefault: boolean;
  // Notifications
  emailOnRequisitionSubmit: boolean;
  emailOnPOApproval: boolean;
  emailOnGRNReceive: boolean;
  emailOnInvoiceApproval: boolean;
  emailRecipients: string | null;
  autoSendPoToSupplier: boolean;
  autoSendRfqToSuppliers: boolean;
  // RFQ Settings
  defaultRfqValidityDays: number | null;
  defaultQuotationValidityDays: number | null;
  allowMultipleQuotations: boolean;
  requireMinimumQuotations: boolean;
  minimumQuotationCount: number | null;
  // Budget Control
  enableBudgetControl: boolean;
  budgetCheckLevel: string | null;
  allowOverBudget: boolean;
  overBudgetApprovalRequired: boolean;
  // Supplier Management
  requireSupplierApproval: boolean;
  supplierEvaluationEnabled: boolean;
  evaluationFrequencyMonths: number | null;
  allowOnHoldSuppliers: boolean;
  checkSupplierBlacklist: boolean;
  // General
  defaultCurrency: string | null;
  fiscalYearStart: string | null;
  autoCloseCompletedPOs: boolean;
  poAutoCloseThresholdPercent: number | null;
  // Pricing Controls
  allowPriceOverride: boolean;
  requireApprovalForPriceOverride: boolean;
  maxDiscountPercentage: number | null;
  comparePricesToLastPurchase: boolean;
  // Payment Terms
  requirePrepayment: boolean;
  defaultPrepaymentPercentage: number | null;
  earlyPaymentDiscountDays: number | null;
  earlyPaymentDiscountPercentage: number | null;
  // Inventory / GRN Controls
  requireWarehouseSelection: boolean;
  reserveStockOnPo: boolean;
  trackBatchNumbers: boolean;
  trackExpiryDates: boolean;
  autoReceiveToInventory: boolean;
  requireGrnApproval: boolean;
  allowOverReceipt: boolean;
  overReceiptTolerance: number | null;
  // Invoice Controls
  requirePoForInvoice: boolean;
  requireGrnForInvoice: boolean;
  autoMatchInvoices: boolean;
  // Tax Defaults
  defaultVatInclusive: boolean;
  // Inspection Extended
  inspectionQualityRatingRequired: boolean;
  inspectionChecklist: ChecklistSection[] | null;
  inspectionDefaultOfficerRoles: string[] | null;
  inspectionQcOfficerIds: number[] | null;
  inspectionAuditOfficerIds: number[] | null;
  inspectionAdditionalOfficerIds: number[] | null;
  // Granular Notifications
  notifyInspectionOfficers: boolean;
  notifyOnInspectionCompletion: boolean;
  notifyOnInvoiceDue: boolean;
  notifyOnPrApproval: boolean;
  notifyOnPrRejection: boolean;
  notifyOnPoRejection: boolean;
  createdAt: string;
  updatedAt: string;
}

// Purchase Requisition Types
export interface PurchaseRequisitionLine {
  id: number;
  purchaseRequisitionId: number;
  lineNumber: number;
  lineType: string | null;
  itemId: number | null;
  assetClassId: number | null;
  serviceCategoryId: number | null;
  itemName?: string;
  itemCode?: string;
  description: string | null;
  uomId: number | null;
  quantity: number;
  estimatedUnitPrice: number | null;
  notes: string | null;
}

export interface PurchaseRequisition {
  id: number;
  companyId: number;
  branchId: number | null;
  entityId: number | null;
  requisitionNumber: string;
  requesterId: number;
  requesterName?: string;
  department: string | null;
  departmentName?: string;
  requisitionDate: string;
  requiredDate: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  currencyId: number | null;
  purpose: string | null;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'converted';
  justification: string | null;
  notes: string | null;
  totalEstimatedAmount: number;
  approvedAt: string | null;
  approvedBy: number | null;
  lines?: PurchaseRequisitionLine[];
  createdAt: string;
  updatedAt: string;
}

export interface RequisitionStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  converted: number;
  totalEstimatedValue: number;
}

// RFQ Types
export interface RfqSupplier {
  id: number;
  rfqId: number;
  supplierId: number;
  supplierName?: string;
  supplierEmail?: string;
  sentAt: string | null;
  respondedAt: string | null;
  status: 'pending' | 'sent' | 'responded' | 'declined';
}

export interface RfqLine {
  id: number;
  requestForQuotationId: number;
  purchaseRequisitionLineId: number | null;
  lineNumber: number;
  itemId: number;
  itemName?: string;
  itemCode?: string;
  description: string | null;
  uomId: number | null;
  quantity: number;
  specifications: string | null;
  notes: string | null;
}

export interface RequestForQuotation {
  id: number;
  companyId: number;
  branchId: number | null;
  rfqNumber: string;
  entityId: number | null;
  purchaseRequisitionId: number | null;
  issueDate: string;
  closingDate: string;
  requiredDeliveryDate: string | null;
  status: 'draft' | 'sent' | 'closed' | 'cancelled' | 'awarded';
  currencyId: number | null;
  termsConditions: string | null;
  deliveryTerms: string | null;
  paymentTerms: string | null;
  notes: string | null;
  suppliers?: RfqSupplier[];
  lines?: RfqLine[];
  createdAt: string;
  updatedAt: string;
}

export interface RfqStats {
  total: number;
  draft: number;
  sent: number;
  closed: number;
  awarded: number;
  cancelled: number;
}

// Supplier Quotation Types
export interface QuotationLine {
  id: number;
  supplierQuotationId: number;
  rfqLineId: number | null;
  lineNumber: number;
  itemId: number;
  itemName?: string;
  itemCode?: string;
  description: string | null;
  quantity: number;
  uomId: number | null;
  unitPrice: number;
  discountPercent: number | null;
  discountAmount: number | null;
  vatId: number | null;
  taxAmount: number;
  lineTotal: number;
  deliveryDays: number | null;
  notes: string | null;
}

export interface SupplierQuotation {
  id: number;
  companyId: number;
  quotationNumber: string;
  requestForQuotationId: number;
  rfqSupplierId: number | null;
  supplierId: number;
  supplierName?: string;
  rfqNumber?: string;
  quotationDate: string;
  validityDate: string;
  currencyId: number | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  deliveryTerms: string | null;
  deliveryDays: number | null;
  paymentTerms: string | null;
  status: 'draft' | 'submitted' | 'received' | 'under_review' | 'selected' | 'rejected';
  isSelected: boolean;
  selectionReason: string | null;
  notes: string | null;
  receivedBy: number | null;
  lines?: QuotationLine[];
  createdAt: string;
  updatedAt: string;
}

export interface QuotationStats {
  total: number;
  draft: number;
  submitted: number;
  underReview: number;
  selected: number;
  rejected: number;
  totalValue: number;
}

export interface QuotationComparison {
  rfqId: number;
  rfqNumber: string;
  items: Array<{
    itemId: number;
    itemName: string;
    itemCode: string;
    requestedQty: number;
    quotations: Array<{
      supplierId: number;
      supplierName: string;
      unitPrice: number;
      totalPrice: number;
      leadTimeDays: number | null;
      isLowestPrice: boolean;
    }>;
  }>;
}

// Purchase Order Types
export interface PurchaseOrderLine {
  id: number;
  purchaseOrderId: number;
  supplierQuotationLineId: number | null;
  lineNumber: number;
  itemId: number;
  itemName?: string;
  itemCode?: string;
  description: string | null;
  quantity: number;
  quantityReceived: number;
  quantityInvoiced: number;
  uomId: number | null;
  unitPrice: number;
  discountPercent: number | null;
  discountAmount: number;
  vatId: number | null;
  taxAmount: number;
  lineTotal: number;
  notes: string | null;
}

export interface PurchaseOrder {
  id: number;
  companyId: number;
  branchId: number | null;
  orderNumber: string;
  entityId: number | null;
  purchaseRequisitionId: number | null;
  purchaseRequisitionNumber?: string;
  supplierQuotationId: number | null;
  supplierId: number;
  supplierName?: string;
  orderDate: string;
  expectedDeliveryDate: string | null;
  deliveryBranchId: number | null;
  warehouseId: number | null;
  currencyId: number | null;
  exchangeRate: number | null;
  paymentTerms: string | null;
  priority: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountReceived: number;
  amountInvoiced: number;
  deliveryAddress: string | null;
  shippingMethod: string | null;
  status: 'draft' | 'pending' | 'approved' | 'sent' | 'partial' | 'received' | 'cancelled';
  submittedAt: string | null;
  submittedBy: number | null;
  approvedAt: string | null;
  approvedBy: number | null;
  sentAt: string | null;
  notes: string | null;
  termsConditions: string | null;
  inspectionStatus: string | null;
  inspectionResult: string | null;
  lines?: PurchaseOrderLine[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  sent: number;
  partial: number;
  received: number;
  cancelled: number;
  totalValue: number;
  receivedValue: number;
  pendingValue: number;
  totalOrderValue: number; // alias for totalValue
  pendingDeliveryValue: number; // alias for pendingValue
}

// GRN Types
export interface GrnLine {
  id: number;
  grnId: number;
  purchaseOrderLineId: number | null;
  lineNumber: number;
  itemId: number;
  itemName?: string;
  itemCode?: string;
  description: string | null;
  quantityOrdered: number;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  uomId: number | null;
  unitCost: number;
  lineTotal: number;
  batchNumber: string | null;
  serialNumbers: string[] | null;
  manufactureDate: string | null;
  expiryDate: string | null;
  inspectionStatus: string | null;
  rejectionReason: string | null;
  notes: string | null;
}

export interface GoodsReceivedNote {
  id: number;
  companyId: number;
  branchId: number | null;
  grnNumber: string;
  purchaseOrderId: number;
  purchaseOrderNumber?: string;
  supplierId: number;
  supplierName?: string;
  receivedDate: string;
  deliveryNoteNumber: string | null;
  status: 'draft' | 'pending' | 'pending_inspection' | 'received' | 'partial' | 'complete' | 'approved' | 'rejected';
  warehouseId: number | null;
  warehouseName?: string;
  receivedBy: number | null;
  receivedByName?: string;
  notes: string | null;
  approvedAt: string | null;
  approvedBy: number | null;
  lines?: GrnLine[];
  createdAt: string;
  updatedAt: string;
}

export interface GrnStats {
  total: number;
  draft: number;
  pendingInspection: number;
  approved: number;
  rejected: number;
  totalReceived: number;
  totalAccepted: number;
  totalRejected: number;
}

export interface ReadyForInvoicingPO {
  poId: number;
  orderNumber: string;
  supplierName: string;
  totalAmount: number;
  grnNumber: string;
  grnDate: string;
  lineCount: number;
}

export interface ReadyForReceivingPO {
  poId: number;
  orderNumber: string;
  supplierName: string;
  totalAmount: number;
  inspectionNumber: string;
  inspectionResult: string;
  inspectionCompletedAt: string;
  lineCount: number;
}

// Inspection Types
export interface InspectionOfficer {
  id: number;
  purchaseInspectionId: number;
  employeeId: number;
  branchId?: number;
  employeeName?: string;
  role?: string;
  status: string;
  result?: string;
  signature?: string;
  comments: string | null;
  stampContent?: Record<string, unknown>;
  stampedAt?: string;
  completedAt?: string;
  assignedAt?: string;
  // Backward compat aliases
  inspectionId?: number;
  officerId?: number;
  officerName?: string;
  signedOff?: boolean;
  signedOffAt?: string | null;
}

export interface InspectionLine {
  id: number;
  purchaseInspectionId: number;
  purchaseOrderLineId: number;
  itemId: number;
  itemName?: string;
  itemCode?: string;
  uomName?: string;
  unitPrice?: number;
  lineTotal?: number;
  discountPercent?: number;
  lineDiscountAmount?: number;
  lineTaxAmount?: number;
  lineNumber: number;
  description: string | null;
  uomId: number | null;
  quantityOrdered: number;
  quantityDelivered: number;
  quantityInspected: number;
  quantityAccepted: number;
  quantityRejected: number;
  inspectionStatus: 'pending' | 'passed' | 'failed' | 'partial';
  qualityRating: number | null;
  rejectionReason: string | null;
  inspectionNotes: string | null;
  batchNumber: string | null;
  serialNumbers: string[] | null;
  manufactureDate: string | null;
  expiryDate: string | null;
}

export interface PurchaseInspection {
  id: number;
  companyId: number;
  branchId: number | null;
  inspectionNumber: string;
  purchaseOrderId: number;
  purchaseOrderNumber?: string;
  supplierId: number | null;
  supplierName?: string;
  warehouseId: number | null;
  inspectionDate: string;
  deliveryNoteNumber: string | null;
  deliveryNoteDate: string | null;
  status: 'draft' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
  overallResult: 'pending' | 'passed' | 'failed' | 'partial' | null;
  totalQuantityInspected: number;
  totalQuantityAccepted: number;
  totalQuantityRejected: number;
  notes: string | null;
  checklist?: ChecklistSection[] | null;
  countryOfOrigin?: string | null;
  vehicleNo?: string | null;
  driverNamePhone?: string | null;
  finalDecision?: string | null;
  rejectionReason?: string | null;
  completedAt: string | null;
  grnNumber?: string | null;
  completedSignoffs?: number;
  requiredSignoffs?: number;
  officers?: InspectionOfficer[];
  lines?: InspectionLine[];
  createdAt: string;
  updatedAt: string;
}

export interface InspectionStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  passed: number;
  failed: number;
  partial: number;
}

// Invoice Types
export interface InvoiceLine {
  id: number;
  purchaseInvoiceId: number;
  purchaseOrderLineId: number | null;
  grnLineId: number | null;
  lineNumber: number;
  itemId: number;
  itemName?: string;
  itemCode?: string;
  description: string | null;
  quantity: number;
  uomId: number | null;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  lineTotal: number;
  accountId: number | null;
}

export interface PurchaseInvoice {
  id: number;
  companyId: number;
  branchId: number | null;
  invoiceNumber: string;
  supplierInvoiceNumber: string;
  supplierId: number;
  supplierName?: string;
  purchaseOrderId: number | null;
  purchaseOrderNumber?: string;
  goodsReceivedNoteId: number | null;
  grnNumber?: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string | null;
  currencyId: number | null;
  exchangeRate: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'posted' | 'cancelled';
  matchStatus: 'pending' | 'matched' | 'partial' | 'unmatched' | 'variance';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: number | null;
  threeWayMatchResult: ThreeWayMatchResult | null;
  varianceAmount: number | null;
  varianceReason: string | null;
  notes: string | null;
  lines?: InvoiceLine[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  posted: number;
  unpaid: number;
  partiallyPaid: number;
  fullyPaid: number;
  withVariance: number;
  totalInvoiced: number;
  totalOutstanding: number;
}

export interface ThreeWayMatchResult {
  invoiceId: number;
  purchaseOrderId: number | null;
  grnId: number | null;
  matchStatus: string;
  lineMatches: Record<string, unknown>[];
  totalInvoiceAmount: number;
  totalPOAmount: number;
  totalGRNAmount: number;
  varianceAmount: number;
  variancePercentage: number;
}

export interface AgeingReportItem {
  supplierId: number;
  supplierName: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
}

// Query Types
export interface SupplierQuery {
  search?: string;
  supplierType?: string;
  category?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RequisitionQuery {
  status?: string;
  requesterId?: number;
  departmentId?: number;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface RfqQuery {
  status?: string;
  supplierId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface QuotationQuery {
  status?: string;
  rfqId?: number;
  supplierId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PurchaseOrderQuery {
  status?: string;
  supplierId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GrnQuery {
  status?: string;
  purchaseOrderId?: number;
  supplierId?: number;
  warehouseId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface InspectionQuery {
  status?: string;
  grnId?: number;
  overallResult?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface InvoiceQuery {
  status?: string;
  matchStatus?: string;
  paymentStatus?: string;
  supplierId?: number;
  purchaseOrderId?: number;
  grnId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AgeingReportQuery {
  supplierId?: number;
  asOfDate?: string;
}

// DTO Types
export interface CreateSupplierDto {
  code?: string;
  name: string;
  email: string;
  phone?: string;
  contactPerson?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  taxId?: string;
  bankName?: string;
  bankAccount?: string;
  paymentTerms?: string;
  supplierType: 'goods' | 'services' | 'both';
  category?: string;
  website?: string;
  currencyId?: number;
  accountsPayableId?: number;
  isActive?: boolean;
}

export interface UpdateSupplierDto extends Partial<CreateSupplierDto> {}

export interface UpdatePurchaseSettingsDto {
  // Document Numbering
  requisitionPrefix?: string;
  rfqPrefix?: string;
  quotationPrefix?: string;
  poPrefix?: string;
  grnPrefix?: string;
  inspectionPrefix?: string;
  invoicePrefix?: string;
  serviceOrderPrefix?: string;
  serviceInspectionPrefix?: string;
  certificatePrefix?: string;
  returnPrefix?: string;
  // Approval Workflows
  requireRequisitionApproval?: boolean;
  requisitionApprovalThreshold?: number;
  requirePoApproval?: boolean;
  poApprovalThreshold?: number;
  requireRfqApproval?: boolean;
  rfqApprovalThreshold?: number;
  requireInvoiceApproval?: boolean;
  invoiceApprovalThreshold?: number;
  requireServiceOrderApproval?: boolean;
  serviceOrderApprovalThreshold?: number;
  // Quality Control
  requireInspection?: boolean;
  inspectionOfficerCount?: number;
  allowPartialDelivery?: boolean;
  requireServiceInspection?: boolean;
  serviceInspectionOfficerCount?: number;
  allowPartialServiceCompletion?: boolean;
  inspectionAutoAssignOfficers?: boolean;
  inspectionRequireAllOfficers?: boolean;
  inspectionRequireSignature?: boolean;
  inspectionQualityRatingType?: string;
  // Invoice Matching
  requireThreeWayMatch?: boolean;
  matchTolerancePercentage?: number;
  defaultPaymentTerms?: string;
  // Tax Settings
  defaultVatRate?: number;
  defaultWhtRate?: number;
  applyVatByDefault?: boolean;
  applyWhtByDefault?: boolean;
  // Notifications
  emailOnRequisitionSubmit?: boolean;
  emailOnPOApproval?: boolean;
  emailOnGRNReceive?: boolean;
  emailOnInvoiceApproval?: boolean;
  emailRecipients?: string;
  autoSendPoToSupplier?: boolean;
  autoSendRfqToSuppliers?: boolean;
  // RFQ Settings
  defaultRfqValidityDays?: number;
  defaultQuotationValidityDays?: number;
  allowMultipleQuotations?: boolean;
  requireMinimumQuotations?: boolean;
  minimumQuotationCount?: number;
  // Budget Control
  enableBudgetControl?: boolean;
  budgetCheckLevel?: 'none' | 'warning' | 'block';
  allowOverBudget?: boolean;
  overBudgetApprovalRequired?: boolean;
  // Supplier Management
  requireSupplierApproval?: boolean;
  supplierEvaluationEnabled?: boolean;
  evaluationFrequencyMonths?: number;
  allowOnHoldSuppliers?: boolean;
  checkSupplierBlacklist?: boolean;
  // General
  defaultCurrency?: string;
  fiscalYearStart?: string;
  autoCloseCompletedPOs?: boolean;
  poAutoCloseThresholdPercent?: number;
  // Pricing Controls
  allowPriceOverride?: boolean;
  requireApprovalForPriceOverride?: boolean;
  maxDiscountPercentage?: number;
  comparePricesToLastPurchase?: boolean;
  // Payment Terms
  requirePrepayment?: boolean;
  defaultPrepaymentPercentage?: number;
  earlyPaymentDiscountDays?: number;
  earlyPaymentDiscountPercentage?: number;
  // Inventory / GRN Controls
  requireWarehouseSelection?: boolean;
  reserveStockOnPo?: boolean;
  trackBatchNumbers?: boolean;
  trackExpiryDates?: boolean;
  autoReceiveToInventory?: boolean;
  requireGrnApproval?: boolean;
  allowOverReceipt?: boolean;
  overReceiptTolerance?: number;
  // Invoice Controls
  requirePoForInvoice?: boolean;
  requireGrnForInvoice?: boolean;
  autoMatchInvoices?: boolean;
  // Tax Defaults
  defaultVatInclusive?: boolean;
  // Inspection Extended
  inspectionQualityRatingRequired?: boolean;
  inspectionChecklist?: ChecklistSection[];
  inspectionDefaultOfficerRoles?: string[];
  inspectionQcOfficerIds?: number[];
  inspectionAuditOfficerIds?: number[];
  inspectionAdditionalOfficerIds?: number[];
  // Granular Notifications
  notifyInspectionOfficers?: boolean;
  notifyOnInspectionCompletion?: boolean;
  notifyOnInvoiceDue?: boolean;
  notifyOnPrApproval?: boolean;
  notifyOnPrRejection?: boolean;
  notifyOnPoRejection?: boolean;
}

export interface CreateRequisitionLineDto {
  lineType?: 'INVENTORY_ITEM' | 'ASSET' | 'SERVICE';
  itemId?: number;
  assetClassId?: number;
  serviceCategoryId?: number;
  description?: string;
  uomId?: number;
  quantity: number;
  estimatedUnitPrice?: number;
  notes?: string;
}

export interface CreatePurchaseRequisitionDto {
  branchId?: number;
  entityId?: number;
  requesterId: number;
  department?: string;
  requiredDate?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  currencyId?: number;
  purpose?: string;
  justification?: string;
  notes?: string;
  lines: CreateRequisitionLineDto[];
}

export interface UpdatePurchaseRequisitionDto {
  branchId?: number;
  requesterId?: number;
  department?: string;
  requiredDate?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  currencyId?: number;
  purpose?: string;
  justification?: string;
  notes?: string;
  lines?: CreateRequisitionLineDto[];
}

export interface CreateRfqLineDto {
  purchaseRequisitionLineId?: number;
  itemId: number;
  description?: string;
  uomId?: number;
  quantity: number;
  specifications?: string;
  notes?: string;
}

export interface CreateRfqSupplierDto {
  supplierId: number;
  notes?: string;
}

export interface CreateRfqDto {
  branchId?: number;
  entityId?: number;
  purchaseRequisitionId?: number;
  issueDate: string;
  closingDate: string;
  requiredDeliveryDate?: string;
  currencyId?: number;
  termsConditions?: string;
  deliveryTerms?: string;
  paymentTerms?: string;
  notes?: string;
  suppliers: CreateRfqSupplierDto[];
  lines: CreateRfqLineDto[];
}

export interface UpdateRfqDto {
  closingDate?: string;
  requiredDeliveryDate?: string;
  termsConditions?: string;
  deliveryTerms?: string;
  paymentTerms?: string;
  notes?: string;
  suppliers?: CreateRfqSupplierDto[];
  lines?: CreateRfqLineDto[];
}

export interface CreateQuotationLineDto {
  rfqLineId?: number;
  itemId: number;
  description?: string;
  uomId?: number;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  vatId?: number;
  deliveryDays?: number;
  notes?: string;
}

export interface CreateSupplierQuotationDto {
  quotationNumber?: string;
  requestForQuotationId: number;
  rfqSupplierId?: number;
  supplierId: number;
  quotationDate: string;
  validityDate: string;
  currencyId?: number;
  deliveryTerms?: string;
  deliveryDays?: number;
  paymentTerms?: string;
  notes?: string;
  lines: CreateQuotationLineDto[];
}

export interface UpdateSupplierQuotationDto {
  validityDate?: string;
  deliveryTerms?: string;
  deliveryDays?: number;
  paymentTerms?: string;
  notes?: string;
  lines?: CreateQuotationLineDto[];
}

export interface CreatePOLineDto {
  itemId: number;
  supplierQuotationLineId?: number;
  description?: string;
  uomId?: number;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  vatId?: number;
  notes?: string;
}

export interface CreatePurchaseOrderDto {
  branchId?: number;
  entityId?: number;
  purchaseRequisitionId?: number;
  supplierQuotationId?: number;
  supplierId: number;
  orderDate: string;
  expectedDeliveryDate?: string;
  deliveryBranchId?: number;
  warehouseId?: number;
  currencyId?: number;
  exchangeRate?: number;
  paymentTerms?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  deliveryAddress?: string;
  shippingMethod?: string;
  notes?: string;
  termsConditions?: string;
  lines: CreatePOLineDto[];
}

export interface UpdatePurchaseOrderDto {
  expectedDeliveryDate?: string;
  deliveryBranchId?: number;
  warehouseId?: number;
  paymentTerms?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  deliveryAddress?: string;
  shippingMethod?: string;
  notes?: string;
  termsConditions?: string;
  lines?: CreatePOLineDto[];
}

export interface CreateGrnLineDto {
  purchaseOrderLineId?: number;
  itemId: number;
  description?: string;
  uomId?: number;
  quantityOrdered: number;
  quantityReceived: number;
  quantityAccepted?: number;
  quantityRejected?: number;
  unitCost: number;
  batchNumber?: string;
  serialNumbers?: string[];
  manufactureDate?: string;
  expiryDate?: string;
  inspectionStatus?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface CreateGoodsReceivedNoteDto {
  branchId?: number;
  entityId?: number;
  purchaseOrderId: number;
  purchaseInspectionId?: number;
  supplierId?: number;
  warehouseId?: number;
  receivedDate: string;
  receivedTime?: string;
  deliveryNoteNumber?: string;
  deliveryNoteDate?: string;
  receivedBy?: number;
  inspectedBy?: number;
  notes?: string;
  lines: CreateGrnLineDto[];
}

export interface UpdateGoodsReceivedNoteDto {
  warehouseId?: number;
  receivedDate?: string;
  receivedTime?: string;
  deliveryNoteNumber?: string;
  deliveryNoteDate?: string;
  notes?: string;
  lines?: CreateGrnLineDto[];
}

export interface CreateInspectionLineDto {
  purchaseOrderLineId: number;
  itemId: number;
  description?: string;
  uomId?: number;
  quantityOrdered?: number;
  quantityDelivered: number;
  batchNumber?: string;
  serialNumbers?: string[];
  manufactureDate?: string;
  expiryDate?: string;
}

export interface CreateInspectionOfficerDto {
  employeeId: number;
  branchId?: number;
  role?: string;
}

export interface CreatePurchaseInspectionDto {
  branchId?: number;
  purchaseOrderId: number;
  supplierId?: number;
  warehouseId?: number;
  inspectionDate: string;
  deliveryNoteNumber?: string;
  deliveryNoteDate?: string;
  notes?: string;
  lines: CreateInspectionLineDto[];
  officers?: CreateInspectionOfficerDto[];
  checklist?: ChecklistSection[];
  countryOfOrigin?: string;
  vehicleNo?: string;
  driverNamePhone?: string;
  finalDecision?: string;
  rejectionReason?: string;
}

export interface SubmitInspectionResultsDto {
  lines: Array<{
    lineId: number;
    quantityInspected: number;
    quantityAccepted: number;
    quantityRejected: number;
    inspectionStatus: 'pending' | 'passed' | 'failed' | 'partial';
    qualityRating?: number;
    rejectionReason?: string;
    inspectionNotes?: string;
  }>;
  completionNotes?: string;
  checklist?: ChecklistSection[];
}

export interface OfficerSignOffDto {
  comments?: string;
}

export interface CreateInvoiceLineDto {
  purchaseOrderLineId?: number;
  grnLineId?: number;
  itemId: number;
  description?: string;
  uomId?: number;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  vatId?: number;
  withholdingTaxId?: number;
  taxRate?: number;
  taxAmount?: number;
  discountAmount?: number;
  accountId?: number;
  notes?: string;
}

export interface CreatePurchaseInvoiceDto {
  branchId?: number;
  entityId?: number;
  supplierInvoiceNumber: string;
  supplierId: number;
  purchaseOrderId?: number;
  grnId?: number;
  invoiceDate: string;
  receivedDate?: string;
  dueDate: string;
  currencyId?: number;
  exchangeRate?: number;
  paymentTerms?: string;
  notes?: string;
  documentPath?: string;
  discountAmount?: number;
  lines: CreateInvoiceLineDto[];
}

export interface UpdatePurchaseInvoiceDto {
  supplierInvoiceNumber?: string;
  invoiceDate?: string;
  receivedDate?: string;
  dueDate?: string;
  paymentTerms?: string;
  exchangeRate?: number;
  notes?: string;
  documentPath?: string;
  discountAmount?: number;
  lines?: CreateInvoiceLineDto[];
}

export interface CreateFromGrnDto {
  grnId: number;
  supplierInvoiceNumber?: string;
  invoiceDate: string;
}

// Type aliases for convenience (shorter names)
export type CreateGrnDto = CreateGoodsReceivedNoteDto;
export type UpdateGrnDto = UpdateGoodsReceivedNoteDto;
export type CreateInspectionDto = CreatePurchaseInspectionDto;

// Paginated response type
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================================
// PURCHASE SETTINGS API
// ============================================================================

export const purchaseSettingsApi = {
  get: async (): Promise<PurchaseSettings> => {
    const response = await api.get('/purchase/settings');
    return response.data;
  },

  update: async (data: UpdatePurchaseSettingsDto): Promise<PurchaseSettings> => {
    const response = await api.put('/purchase/settings', data);
    return response.data;
  },
};

// ============================================================================
// SUPPLIERS API
// ============================================================================

export const suppliersApi = {
  list: async (query?: SupplierQuery): Promise<PaginatedResponse<Supplier>> => {
    const response = await api.get('/purchase/suppliers', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Supplier> => {
    const response = await api.get(`/purchase/suppliers/${id}`);
    return response.data;
  },

  getStats: async (): Promise<SupplierStats> => {
    const response = await api.get('/purchase/suppliers/stats');
    return response.data;
  },

  getActive: async (): Promise<Supplier[]> => {
    const response = await api.get('/purchase/suppliers/active');
    return response.data;
  },

  create: async (data: CreateSupplierDto): Promise<Supplier> => {
    const response = await api.post('/purchase/suppliers', data);
    return response.data;
  },

  update: async (id: number, data: UpdateSupplierDto): Promise<Supplier> => {
    const response = await api.put(`/purchase/suppliers/${id}`, data);
    return response.data;
  },

  toggleStatus: async (id: number): Promise<Supplier> => {
    const response = await api.put(`/purchase/suppliers/${id}/toggle-status`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/purchase/suppliers/${id}`);
  },

  // Import template
  getImportTemplate: async (): Promise<{ headers: string[]; sampleRows: string[][]; notes: Record<string, string> }> => {
    const response = await api.get('/purchase/suppliers/import/template');
    return response.data;
  },

  // Bulk import suppliers
  importSuppliers: async (
    items: ImportSupplierRow[],
    importMode?: 'skip' | 'update' | 'overwrite',
  ): Promise<ImportSupplierResult> => {
    const response = await api.post('/purchase/suppliers/import', { items, importMode });
    return response.data;
  },

  importOpeningBalances: async (data: {
    items: Array<{ supplierCodeOrEmail: string; openingBalance: number; openingBalanceDate?: string }>;
    postToGL?: boolean;
  }): Promise<{ updated: number; skipped: number; glPosted: number; errors: Array<{ row: number; identifier: string; error: string }> }> => {
    const response = await api.post('/purchase/suppliers/opening-balances/import', data);
    return response.data;
  },
};

// Import types for suppliers
export interface ImportSupplierRow {
  code?: string;
  name: string;
  email: string;
  phone?: string;
  contactPerson?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  taxId?: string;
  bankName?: string;
  bankAccount?: string;
  paymentTerms?: string;
  supplierType?: string;
  category?: string;
  website?: string;
  isActive?: string;
}

export interface ImportSupplierResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; code: string; message: string }[];
}

// ============================================================================
// PURCHASE REQUISITIONS API
// ============================================================================

export const purchaseRequisitionsApi = {
  list: async (query?: RequisitionQuery): Promise<PaginatedResponse<PurchaseRequisition>> => {
    const response = await api.get('/purchase/requisitions', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<PurchaseRequisition> => {
    const response = await api.get(`/purchase/requisitions/${id}`);
    return response.data;
  },

  getStats: async (): Promise<RequisitionStats> => {
    const response = await api.get('/purchase/requisitions/stats');
    return response.data;
  },

  getApprovedForConversion: async (): Promise<PurchaseRequisition[]> => {
    const response = await api.get('/purchase/requisitions/approved-for-conversion');
    return response.data;
  },

  create: async (data: CreatePurchaseRequisitionDto): Promise<PurchaseRequisition> => {
    const response = await api.post('/purchase/requisitions', data);
    return response.data;
  },

  update: async (id: number, data: UpdatePurchaseRequisitionDto): Promise<PurchaseRequisition> => {
    const response = await api.put(`/purchase/requisitions/${id}`, data);
    return response.data;
  },

  submit: async (id: number): Promise<PurchaseRequisition> => {
    const response = await api.post(`/purchase/requisitions/${id}/submit`);
    return response.data;
  },

  approve: async (id: number, notes?: string): Promise<PurchaseRequisition> => {
    const response = await api.post(`/purchase/requisitions/${id}/approve`, { notes });
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<PurchaseRequisition> => {
    const response = await api.post(`/purchase/requisitions/${id}/reject`, { reason });
    return response.data;
  },

  return: async (id: number, reason?: string): Promise<PurchaseRequisition> => {
    const response = await api.post(`/purchase/requisitions/${id}/return`, { reason });
    return response.data;
  },

  convertToPO: async (
    id: number,
    data: { supplierId: number; warehouseId?: number; notes?: string; linePrices?: Record<number, number> },
  ): Promise<{ purchaseOrderId: number; requisition: PurchaseRequisition }> => {
    const response = await api.post(`/purchase/requisitions/${id}/convert-to-po`, data);
    return response.data;
  },

  convertToRfq: async (id: number, supplierIds: number[]): Promise<RequestForQuotation> => {
    const response = await api.post(`/purchase/requisitions/${id}/convert-to-rfq`, { supplierIds });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/purchase/requisitions/${id}`);
  },

  getProcurementChain: async (id: number): Promise<ProcurementChain> => {
    const response = await api.get(`/purchase/requisitions/${id}/procurement-chain`);
    return response.data;
  },
};

export interface ProcurementChainStep {
  id: number;
  number: string;
  status: string;
  result?: string;
}

export interface ProcurementChain {
  requisition: ProcurementChainStep;
  purchaseOrder: ProcurementChainStep | null;
  inspection: (ProcurementChainStep & { result: string }) | null;
  grn: ProcurementChainStep | null;
  invoice: ProcurementChainStep | null;
  payment: ProcurementChainStep | null;
}

// ============================================================================
// RFQ API
// ============================================================================

export const rfqApi = {
  list: async (query?: RfqQuery): Promise<PaginatedResponse<RequestForQuotation>> => {
    const response = await api.get('/purchase/rfq', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<RequestForQuotation> => {
    const response = await api.get(`/purchase/rfq/${id}`);
    return response.data;
  },

  getStats: async (): Promise<RfqStats> => {
    const response = await api.get('/purchase/rfq/stats');
    return response.data;
  },

  create: async (data: CreateRfqDto): Promise<RequestForQuotation> => {
    const response = await api.post('/purchase/rfq', data);
    return response.data;
  },

  update: async (id: number, data: UpdateRfqDto): Promise<RequestForQuotation> => {
    const response = await api.put(`/purchase/rfq/${id}`, data);
    return response.data;
  },

  send: async (id: number): Promise<RequestForQuotation> => {
    const response = await api.post(`/purchase/rfq/${id}/issue`);
    return response.data;
  },

  close: async (id: number): Promise<RequestForQuotation> => {
    const response = await api.post(`/purchase/rfq/${id}/close`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/purchase/rfq/${id}`);
  },
};

// ============================================================================
// RFQ SUPPLIERS API
// ============================================================================

export const rfqSuppliersApi = {
  inviteSupplier: async (data: { rfqId: number; supplierId: number; responseDeadline?: string; notes?: string }): Promise<RfqSupplier> => {
    const response = await api.post("/purchase/rfq-suppliers", data);
    return response.data;
  },

  findByRfq: async (rfqId: number): Promise<RfqSupplier[]> => {
    const response = await api.get(`/purchase/rfq-suppliers/rfq/${rfqId}`);
    return response.data;
  },

  get: async (id: number): Promise<RfqSupplier> => {
    const response = await api.get(`/purchase/rfq-suppliers/${id}`);
    return response.data;
  },

  submitQuotation: async (id: number, data: { lines: Array<{ rfqLineId: number; itemId: number; quotedQuantity: number; unitPrice: number; totalPrice: number; leadTimeDays?: number; remarks?: string; }>; totalAmount?: number; validityDays?: number; paymentTerms?: string; deliveryTerms?: string; remarks?: string; }): Promise<RfqSupplier> => {
    const response = await api.post(`/purchase/rfq-suppliers/${id}/submit-quote`, data);
    return response.data;
  },

  compareQuotations: async (rfqId: number): Promise<QuotationComparison> => {
    const response = await api.get(`/purchase/rfq-suppliers/rfq/${rfqId}/compare`);
    return response.data;
  },

  awardRfq: async (data: { rfqSupplierId: number; awardReason?: string; createPurchaseOrder?: boolean }): Promise<RfqSupplier> => {
    const response = await api.post("/purchase/rfq-suppliers/award", data);
    return response.data;
  },

  rejectQuote: async (id: number, rejectionReason: string): Promise<RfqSupplier> => {
    const response = await api.post(`/purchase/rfq-suppliers/${id}/reject`, { rejectionReason });
    return response.data;
  },
};

// ============================================================================
// SUPPLIER QUOTATIONS API
// ============================================================================

export const supplierQuotationsApi = {
  list: async (query?: QuotationQuery): Promise<PaginatedResponse<SupplierQuotation>> => {
    const response = await api.get('/purchase/quotations', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<SupplierQuotation> => {
    const response = await api.get(`/purchase/quotations/${id}`);
    return response.data;
  },

  getStats: async (): Promise<QuotationStats> => {
    const response = await api.get('/purchase/quotations/stats');
    return response.data;
  },

  getSelectedForPO: async (): Promise<Array<SupplierQuotation & { approvalTrail: Array<{ stage: string; reference: string; action: string; userName: string; signaturePath: string | null; timestamp: string; comment: string | null }> }>> => {
    const response = await api.get('/purchase/quotations/selected-for-po');
    return response.data;
  },

  compare: async (rfqId: number): Promise<QuotationComparison> => {
    const response = await api.get('/purchase/quotations/compare', { params: { rfqId } });
    return response.data;
  },

  create: async (data: CreateSupplierQuotationDto): Promise<SupplierQuotation> => {
    const response = await api.post('/purchase/quotations', data);
    return response.data;
  },

  update: async (id: number, data: UpdateSupplierQuotationDto): Promise<SupplierQuotation> => {
    const response = await api.put(`/purchase/quotations/${id}`, data);
    return response.data;
  },

  select: async (id: number, reason?: string): Promise<SupplierQuotation> => {
    const response = await api.post(`/purchase/quotations/${id}/select`, { reason });
    return response.data;
  },

  review: async (id: number): Promise<SupplierQuotation> => {
    const response = await api.post(`/purchase/quotations/${id}/review`);
    return response.data;
  },

  reject: async (id: number): Promise<SupplierQuotation> => {
    const response = await api.post(`/purchase/quotations/${id}/reject`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/purchase/quotations/${id}`);
  },
};

// ============================================================================
// PURCHASE ORDERS API
// ============================================================================

export const purchaseOrdersApi = {
  list: async (query?: PurchaseOrderQuery): Promise<PaginatedResponse<PurchaseOrder>> => {
    const response = await api.get('/purchase/orders', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.get(`/purchase/orders/${id}`);
    return response.data;
  },

  getStats: async (): Promise<PurchaseOrderStats> => {
    const response = await api.get('/purchase/orders/stats');
    return response.data;
  },

  getForPrint: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/purchase/orders/${id}/print`);
    return response.data;
  },

  create: async (data: CreatePurchaseOrderDto): Promise<PurchaseOrder> => {
    const response = await api.post('/purchase/orders', data);
    return response.data;
  },

  createFromQuotation: async (quotationId: number, notes?: string): Promise<PurchaseOrder> => {
    const response = await api.post('/purchase/orders/from-quotation', { quotationId, notes });
    return response.data;
  },

  update: async (id: number, data: UpdatePurchaseOrderDto): Promise<PurchaseOrder> => {
    const response = await api.put(`/purchase/orders/${id}`, data);
    return response.data;
  },

  submit: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.post(`/purchase/orders/${id}/submit`);
    return response.data;
  },

  approve: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.post(`/purchase/orders/${id}/approve`);
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<PurchaseOrder> => {
    const response = await api.post(`/purchase/orders/${id}/reject`, { reason });
    return response.data;
  },

  return: async (id: number, reason?: string): Promise<PurchaseOrder> => {
    const response = await api.post(`/purchase/orders/${id}/return`, { reason });
    return response.data;
  },

  send: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.post(`/purchase/orders/${id}/send`);
    return response.data;
  },

  cancel: async (id: number, reason: string): Promise<PurchaseOrder> => {
    const response = await api.post(`/purchase/orders/${id}/cancel`, { reason });
    return response.data;
  },

  receiveDirectly: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.post(`/purchase/orders/${id}/receive`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/purchase/orders/${id}`);
  },
};

// ============================================================================
// GRN API
// ============================================================================

export const grnApi = {
  list: async (query?: GrnQuery): Promise<PaginatedResponse<GoodsReceivedNote>> => {
    const response = await api.get('/purchase/grn', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<GoodsReceivedNote> => {
    const response = await api.get(`/purchase/grn/${id}`);
    return response.data;
  },

  getStats: async (): Promise<GrnStats> => {
    const response = await api.get('/purchase/grn/stats');
    return response.data;
  },

  getReadyForReceiving: async (): Promise<ReadyForReceivingPO[]> => {
    const response = await api.get('/purchase/grn/ready-for-receiving');
    return response.data;
  },

  create: async (data: CreateGoodsReceivedNoteDto): Promise<GoodsReceivedNote> => {
    const response = await api.post('/purchase/grn', data);
    return response.data;
  },

  createFromPurchaseOrder: async (purchaseOrderId: number, receivedDate: string): Promise<GoodsReceivedNote> => {
    const response = await api.post('/purchase/grn/from-purchase-order', { purchaseOrderId, receivedDate });
    return response.data;
  },

  update: async (id: number, data: UpdateGoodsReceivedNoteDto): Promise<GoodsReceivedNote> => {
    const response = await api.put(`/purchase/grn/${id}`, data);
    return response.data;
  },

  approve: async (id: number): Promise<GoodsReceivedNote> => {
    const response = await api.post(`/purchase/grn/${id}/approve`);
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<GoodsReceivedNote> => {
    const response = await api.post(`/purchase/grn/${id}/reject`, { reason });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/purchase/grn/${id}`);
  },
};

// ============================================================================
// INSPECTIONS API
// ============================================================================

export const purchaseInspectionsApi = {
  list: async (query?: InspectionQuery): Promise<PaginatedResponse<PurchaseInspection>> => {
    const response = await api.get('/purchase/inspections', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<PurchaseInspection> => {
    const response = await api.get(`/purchase/inspections/${id}`);
    return response.data;
  },

  getStats: async (): Promise<InspectionStats> => {
    const response = await api.get('/purchase/inspections/stats');
    return response.data;
  },

  getDefaultChecklist: async (): Promise<{ checklist: ChecklistSection[]; defaultOfficerRoles: string[]; qcOfficerIds: number[]; auditOfficerIds: number[]; additionalOfficerIds: number[] }> => {
    const response = await api.get('/purchase/inspections/default-checklist');
    return response.data;
  },

  create: async (data: CreatePurchaseInspectionDto): Promise<PurchaseInspection> => {
    const response = await api.post('/purchase/inspections', data);
    return response.data;
  },

  submitResults: async (id: number, data: SubmitInspectionResultsDto): Promise<PurchaseInspection> => {
    const response = await api.post(`/purchase/inspections/${id}/submit-results`, data);
    return response.data;
  },

  officerSignOff: async (id: number, officerId: number, data: OfficerSignOffDto): Promise<PurchaseInspection> => {
    const response = await api.post(`/purchase/inspections/${id}/officer-signoff/${officerId}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/purchase/inspections/${id}`);
  },

  complete: async (id: number): Promise<PurchaseInspection> => {
    const response = await api.post(`/purchase/inspections/${id}/complete`);
    return response.data;
  },
};

// ============================================================================
// PURCHASE INVOICES API
// ============================================================================

export const purchaseInvoicesApi = {
  list: async (query?: InvoiceQuery): Promise<PaginatedResponse<PurchaseInvoice>> => {
    const response = await api.get('/purchase/invoices', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<PurchaseInvoice> => {
    const response = await api.get(`/purchase/invoices/${id}`);
    return response.data;
  },

  getStats: async (): Promise<InvoiceStats> => {
    const response = await api.get('/purchase/invoices/stats');
    return response.data;
  },

  getReadyForInvoicing: async (): Promise<ReadyForInvoicingPO[]> => {
    const response = await api.get('/purchase/invoices/ready-for-invoicing');
    return response.data;
  },

  getAgeingReport: async (query?: AgeingReportQuery): Promise<AgeingReportItem[]> => {
    const response = await api.get('/purchase/invoices/ageing', { params: query });
    return response.data;
  },

  create: async (data: CreatePurchaseInvoiceDto): Promise<PurchaseInvoice> => {
    const response = await api.post('/purchase/invoices', data);
    return response.data;
  },

  createFromGrn: async (data: CreateFromGrnDto): Promise<PurchaseInvoice> => {
    const response = await api.post('/purchase/invoices/from-grn', data);
    return response.data;
  },

  update: async (id: number, data: UpdatePurchaseInvoiceDto): Promise<PurchaseInvoice> => {
    const response = await api.put(`/purchase/invoices/${id}`, data);
    return response.data;
  },

  submit: async (id: number, notes?: string): Promise<PurchaseInvoice> => {
    const response = await api.post(`/purchase/invoices/${id}/submit`, { notes });
    return response.data;
  },

  approve: async (id: number, notes?: string): Promise<PurchaseInvoice> => {
    const response = await api.post(`/purchase/invoices/${id}/approve`, { notes });
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<PurchaseInvoice> => {
    const response = await api.post(`/purchase/invoices/${id}/reject`, { reason });
    return response.data;
  },

  performThreeWayMatch: async (id: number): Promise<ThreeWayMatchResult> => {
    const response = await api.post(`/purchase/invoices/${id}/three-way-match`, { invoiceId: id });
    return response.data;
  },

  approveVariance: async (id: number, reason: string): Promise<PurchaseInvoice> => {
    const response = await api.post(`/purchase/invoices/${id}/approve-variance`, { reason });
    return response.data;
  },

  post: async (id: number): Promise<PurchaseInvoice> => {
    const response = await api.post(`/purchase/invoices/${id}/post`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/purchase/invoices/${id}`);
  },
};

// ============================================================================
// SERVICE CATEGORY TYPES
// ============================================================================

export interface ServiceCategory {
  id: number;
  companyId: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    serviceOrders: number;
  };
}

export interface ServiceCategoryStats {
  total: number;
  active: number;
  inactive: number;
}

export interface CreateServiceCategoryDto {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateServiceCategoryDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// ============================================================================
// SERVICE ORDER TYPES
// ============================================================================

export interface ServiceOrder {
  id: number;
  companyId: number;
  branchId: number;
  orderNumber: string;
  orderDate: string;
  supplierId: number;
  supplierName?: string;
  serviceCategoryId: number | null;
  categoryName?: string;
  requisitionId: number | null;
  requisitionNumber?: string;
  expectedCompletionDate: string | null;
  actualCompletionDate: string | null;
  currencyId: number | null;
  exchangeRate: number;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountCompleted: number;
  amountInvoiced: number;
  notes: string | null;
  deliveryBranchId: number | null;
  deliveryAddress: string | null;
  termsConditions: string | null;
  documentPath: string | null;
  sentAt: string | null;
  submittedAt: string | null;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
  lines: ServiceOrderLine[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceOrderLine {
  id: number;
  serviceOrderId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  lineTotal: number;
  completedQuantity: number;
  invoicedQuantity: number;
  notes: string | null;
  purchaseRequisitionLineId: number | null;
  serviceCategoryId: number | null;
  uom: string | null;
  specifications: string | null;
  status: string | null;
}

export interface ServiceOrderStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  inProgress: number;
  completed: number;
  totalValue: number;
  completedValue: number;
}

export interface ServiceOrderQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  supplierId?: number;
  categoryId?: number;
  fromDate?: string;
  toDate?: string;
}

export interface CreateServiceOrderLineDto {
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxPercent?: number;
  notes?: string;
  purchaseRequisitionLineId?: number;
  serviceCategoryId?: number;
  uom?: string;
  specifications?: string;
}

export interface CreateServiceOrderDto {
  supplierId: number;
  serviceCategoryId?: number;
  requisitionId?: number;
  orderDate: string;
  expectedCompletionDate?: string;
  currencyId?: number;
  exchangeRate?: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  discountAmount?: number;
  notes?: string;
  deliveryBranchId?: number;
  deliveryAddress?: string;
  termsConditions?: string;
  documentPath?: string;
  lines: CreateServiceOrderLineDto[];
}

export interface UpdateServiceOrderDto {
  expectedCompletionDate?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  discountAmount?: number;
  notes?: string;
  deliveryBranchId?: number;
  deliveryAddress?: string;
  termsConditions?: string;
  documentPath?: string;
  lines?: CreateServiceOrderLineDto[];
}

// ============================================================================
// SERVICE INSPECTION TYPES
// ============================================================================

export interface ServiceInspection {
  id: number;
  companyId: number;
  branchId: number;
  inspectionNumber: string;
  serviceOrderId: number;
  serviceOrderNumber?: string;
  supplierId: number;
  supplierName?: string;
  inspectionDate: string;
  inspectorId: number | null;
  inspectorName?: string;
  overallResult: 'pending' | 'passed' | 'failed' | 'partial';
  status: 'draft' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  completionNotes: string | null;
  submittedAt: string | null;
  lines: ServiceInspectionLine[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceInspectionLine {
  id: number;
  serviceInspectionId: number;
  serviceOrderLineId: number;
  description: string;
  quantityOrdered: number;
  quantityCompleted: number;
  quantityAccepted: number;
  quantityRejected: number;
  inspectionResult: 'pending' | 'passed' | 'failed' | 'partial';
  qualityRating: number | null;
  remarks: string | null;
  lineNumber: number | null;
  rejectionReason: string | null;
}

export interface ServiceInspectionStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  passRate: number;
}

export interface ServiceInspectionQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  result?: string;
  serviceOrderId?: number;
  fromDate?: string;
  toDate?: string;
}

export interface CreateServiceInspectionLineDto {
  serviceOrderLineId: number;
  quantityCompleted: number;
  quantityAccepted: number;
  quantityRejected: number;
  inspectionResult: 'pending' | 'passed' | 'failed' | 'partial';
  qualityRating?: number;
  remarks?: string;
  lineNumber?: number;
  rejectionReason?: string;
}

export interface CreateServiceInspectionDto {
  serviceOrderId: number;
  inspectionDate: string;
  inspectorId?: number;
  notes?: string;
  completionNotes?: string;
  lines: CreateServiceInspectionLineDto[];
}

export interface UpdateServiceInspectionDto {
  inspectionDate?: string;
  notes?: string;
  completionNotes?: string;
  lines?: CreateServiceInspectionLineDto[];
}

// ============================================================================
// CERTIFICATE OF COMPLETION TYPES
// ============================================================================

export interface CertificateOfCompletion {
  id: number;
  companyId: number;
  branchId: number;
  certificateNumber: string;
  serviceOrderId: number;
  serviceOrderNumber?: string;
  serviceInspectionId: number | null;
  inspectionNumber?: string;
  supplierId: number;
  supplierName?: string;
  completionDate: string;
  completionTime: string | null;
  verifiedById: number | null;
  verifiedByName?: string;
  approvedById: number | null;
  approvedByName?: string;
  status: 'draft' | 'pending' | 'verified' | 'approved' | 'rejected';
  totalAmount: number;
  notes: string | null;
  entityId: number | null;
  accrualAmount: number | null;
  submittedAt: string | null;
  rejectedAt: string | null;
  lines: CertificateOfCompletionLine[];
  createdAt: string;
  updatedAt: string;
}

export interface CertificateOfCompletionLine {
  id: number;
  certificateId: number;
  serviceOrderLineId: number;
  description: string;
  quantityOrdered: number;
  quantityCompleted: number;
  unitPrice: number;
  lineTotal: number;
  remarks: string | null;
  serviceCategoryId: number | null;
  lineNumber: number | null;
  uom: string | null;
  quantityAccepted: number;
  inspectionStatus: string | null;
  notes: string | null;
}

export interface CertificateStats {
  total: number;
  pending: number;
  verified: number;
  approved: number;
  totalValue: number;
}

export interface CertificateQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  serviceOrderId?: number;
  fromDate?: string;
  toDate?: string;
}

export interface CreateCertificateLineDto {
  serviceOrderLineId: number;
  quantityCompleted: number;
  remarks?: string;
  serviceCategoryId?: number;
  lineNumber?: number;
  uom?: string;
  quantityAccepted?: number;
  notes?: string;
}

export interface CreateCertificateDto {
  serviceOrderId: number;
  serviceInspectionId?: number;
  completionDate: string;
  completionTime?: string;
  notes?: string;
  entityId?: number;
  accrualAmount?: number;
  lines: CreateCertificateLineDto[];
}

export interface UpdateCertificateDto {
  completionDate?: string;
  completionTime?: string;
  notes?: string;
  entityId?: number;
  accrualAmount?: number;
  lines?: CreateCertificateLineDto[];
}

// ============================================================================
// BRANCH INSPECTION OFFICER TYPES
// ============================================================================

export interface BranchInspectionOfficer {
  id: number;
  companyId: number;
  branchId: number;
  branchName?: string;
  employeeId: number;
  userName?: string;
  userEmail?: string;
  role: string;
  isActive: boolean;
  isRequired: boolean;
  priority: number;
  // Stamp configuration
  stampShowName: boolean;
  stampShowEmployeeNumber: boolean;
  stampShowRole: boolean;
  stampShowDepartment: boolean;
  stampShowDesignation: boolean;
  stampShowDate: boolean;
  stampShowTime: boolean;
  stampShowSignature: boolean;
  stampCustomTitle: string | null;
  stampCustomText: string | null;
  stampColor: string | null;
  stampStyle: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BranchInspectionOfficerStats {
  total: number;
  active: number;
  byBranch: Record<string, number>;
}

export interface CreateBranchInspectionOfficerDto {
  branchId: number;
  employeeId: number;
  role?: string;
  isActive?: boolean;
  isRequired?: boolean;
  priority?: number;
  // Stamp configuration
  stampShowName?: boolean;
  stampShowEmployeeNumber?: boolean;
  stampShowRole?: boolean;
  stampShowDepartment?: boolean;
  stampShowDesignation?: boolean;
  stampShowDate?: boolean;
  stampShowTime?: boolean;
  stampShowSignature?: boolean;
  stampCustomTitle?: string;
  stampCustomText?: string;
  stampColor?: string;
  stampStyle?: string;
}

export interface UpdateBranchInspectionOfficerDto {
  role?: string;
  isActive?: boolean;
  isRequired?: boolean;
  priority?: number;
  // Stamp configuration
  stampShowName?: boolean;
  stampShowEmployeeNumber?: boolean;
  stampShowRole?: boolean;
  stampShowDepartment?: boolean;
  stampShowDesignation?: boolean;
  stampShowDate?: boolean;
  stampShowTime?: boolean;
  stampShowSignature?: boolean;
  stampCustomTitle?: string;
  stampCustomText?: string;
  stampColor?: string;
  stampStyle?: string;
}

// ============================================================================
// PURCHASE REPORTS TYPES
// ============================================================================

export interface ProcurementDashboard {
  summary: {
    totalPOs: number;
    totalPOValue: number;
    pendingApprovals: number;
    overdueDeliveries: number;
  };
  spendByCategory: Array<{ category: string; amount: number }>;
  poStatusDistribution: Array<{ status: string; count: number }>;
  topSuppliers: Array<{ name: string; totalOrders: number; totalValue: number }>;
  recentPOs: PurchaseOrder[];
  pendingApprovalItems: Array<{ type: string; id: number; number: string; amount: number }>;
}

export interface SupplierPerformanceReport {
  suppliers: Array<{
    id: number;
    name: string;
    totalOrders: number;
    totalValue: number;
    onTimeDeliveryRate: number;
    qualityPassRate: number;
    avgLeadTime: number;
    activeStatus: boolean;
  }>;
  trends: Array<{
    month: string;
    totalOrders: number;
    avgDeliveryTime: number;
    avgQualityScore: number;
  }>;
}

export interface ThreeWayMatchReport {
  summary: {
    totalInvoices: number;
    matchedInvoices: number;
    varianceInvoices: number;
    unmatchedInvoices: number;
    totalVarianceAmount: number;
  };
  discrepancies: Array<{
    invoiceId: number;
    invoiceNumber: string;
    supplierName: string;
    poAmount: number;
    grnAmount: number;
    invoiceAmount: number;
    varianceAmount: number;
    varianceType: 'price' | 'quantity' | 'both';
  }>;
}

export interface ProcurementAnalysisReport {
  spendAnalysis: {
    totalSpend: number;
    avgOrderValue: number;
    orderCount: number;
    byMonth: Array<{ month: string; amount: number }>;
  };
  categoryBreakdown: Array<{
    category: string;
    orderCount: number;
    totalValue: number;
    percentOfTotal: number;
  }>;
  supplierConcentration: Array<{
    supplier: string;
    value: number;
    percent: number;
  }>;
  leadTimeAnalysis: {
    avgLeadTime: number;
    onTimeRate: number;
    byCategory: Array<{ category: string; avgDays: number }>;
  };
}

// ============================================================================
// SERVICE CATEGORIES API
// ============================================================================

export const serviceCategoriesApi = {
  list: async (): Promise<ServiceCategory[]> => {
    const response = await api.get('/purchase/service-categories');
    return response.data;
  },

  get: async (id: number): Promise<ServiceCategory> => {
    const response = await api.get(`/purchase/service-categories/${id}`);
    return response.data;
  },

  getStats: async (): Promise<ServiceCategoryStats> => {
    const response = await api.get('/purchase/service-categories/stats');
    return response.data;
  },

  create: async (data: CreateServiceCategoryDto): Promise<ServiceCategory> => {
    const response = await api.post('/purchase/service-categories', data);
    return response.data;
  },

  update: async (id: number, data: UpdateServiceCategoryDto): Promise<ServiceCategory> => {
    const response = await api.patch(`/purchase/service-categories/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/purchase/service-categories/${id}`);
  },

  toggleStatus: async (id: number): Promise<ServiceCategory> => {
    const response = await api.post(`/purchase/service-categories/${id}/toggle-status`);
    return response.data;
  },
};

// ============================================================================
// SERVICE ORDERS API
// ============================================================================

export const serviceOrdersApi = {
  list: async (query?: ServiceOrderQuery): Promise<PaginatedResponse<ServiceOrder>> => {
    const response = await api.get('/purchase/service-orders', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<ServiceOrder> => {
    const response = await api.get(`/purchase/service-orders/${id}`);
    return response.data;
  },

  getStats: async (): Promise<ServiceOrderStats> => {
    const response = await api.get('/purchase/service-orders/stats');
    return response.data;
  },

  create: async (data: CreateServiceOrderDto): Promise<ServiceOrder> => {
    const response = await api.post('/purchase/service-orders', data);
    return response.data;
  },

  update: async (id: number, data: UpdateServiceOrderDto): Promise<ServiceOrder> => {
    const response = await api.put(`/purchase/service-orders/${id}`, data);
    return response.data;
  },

  submit: async (id: number): Promise<ServiceOrder> => {
    const response = await api.post(`/purchase/service-orders/${id}/submit`);
    return response.data;
  },

  approve: async (id: number, notes?: string): Promise<ServiceOrder> => {
    const response = await api.post(`/purchase/service-orders/${id}/approve`, { notes });
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<ServiceOrder> => {
    const response = await api.post(`/purchase/service-orders/${id}/reject`, { reason });
    return response.data;
  },

  complete: async (id: number): Promise<ServiceOrder> => {
    const response = await api.post(`/purchase/service-orders/${id}/complete`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/purchase/service-orders/${id}`);
  },
};

// ============================================================================
// SERVICE INSPECTIONS API
// ============================================================================

export const serviceInspectionsApi = {
  list: async (query?: ServiceInspectionQuery): Promise<PaginatedResponse<ServiceInspection>> => {
    const response = await api.get('/purchase/service-inspections', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<ServiceInspection> => {
    const response = await api.get(`/purchase/service-inspections/${id}`);
    return response.data;
  },

  getStats: async (): Promise<ServiceInspectionStats> => {
    const response = await api.get('/purchase/service-inspections/stats');
    return response.data;
  },

  create: async (data: CreateServiceInspectionDto): Promise<ServiceInspection> => {
    const response = await api.post('/purchase/service-inspections', data);
    return response.data;
  },

  update: async (id: number, data: UpdateServiceInspectionDto): Promise<ServiceInspection> => {
    const response = await api.put(`/purchase/service-inspections/${id}`, data);
    return response.data;
  },

  complete: async (id: number): Promise<ServiceInspection> => {
    const response = await api.post(`/purchase/service-inspections/${id}/complete`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/purchase/service-inspections/${id}`);
  },
};

// ============================================================================
// CERTIFICATES OF COMPLETION API
// ============================================================================

export const certificatesApi = {
  list: async (query?: CertificateQuery): Promise<PaginatedResponse<CertificateOfCompletion>> => {
    const response = await api.get('/purchase/certificates', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<CertificateOfCompletion> => {
    const response = await api.get(`/purchase/certificates/${id}`);
    return response.data;
  },

  getStats: async (): Promise<CertificateStats> => {
    const response = await api.get('/purchase/certificates/stats');
    return response.data;
  },

  create: async (data: CreateCertificateDto): Promise<CertificateOfCompletion> => {
    const response = await api.post('/purchase/certificates', data);
    return response.data;
  },

  update: async (id: number, data: UpdateCertificateDto): Promise<CertificateOfCompletion> => {
    const response = await api.put(`/purchase/certificates/${id}`, data);
    return response.data;
  },

  verify: async (id: number): Promise<CertificateOfCompletion> => {
    const response = await api.post(`/purchase/certificates/${id}/verify`);
    return response.data;
  },

  approve: async (id: number): Promise<CertificateOfCompletion> => {
    const response = await api.post(`/purchase/certificates/${id}/approve`);
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<CertificateOfCompletion> => {
    const response = await api.post(`/purchase/certificates/${id}/reject`, { reason });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/purchase/certificates/${id}`);
  },
};

// ============================================================================
// BRANCH INSPECTION OFFICERS API
// ============================================================================

export const branchInspectionOfficersApi = {
  list: async (branchId?: number): Promise<BranchInspectionOfficer[]> => {
    const response = await api.get('/purchase/branch-inspection-officers', { params: { branchId } });
    return response.data;
  },

  get: async (id: number): Promise<BranchInspectionOfficer> => {
    const response = await api.get(`/purchase/branch-inspection-officers/${id}`);
    return response.data;
  },

  getStats: async (): Promise<BranchInspectionOfficerStats> => {
    const response = await api.get('/purchase/branch-inspection-officers/stats');
    return response.data;
  },

  create: async (data: CreateBranchInspectionOfficerDto): Promise<BranchInspectionOfficer> => {
    const response = await api.post('/purchase/branch-inspection-officers', data);
    return response.data;
  },

  update: async (id: number, data: UpdateBranchInspectionOfficerDto): Promise<BranchInspectionOfficer> => {
    const response = await api.put(`/purchase/branch-inspection-officers/${id}`, data);
    return response.data;
  },

  uploadSignature: async (id: number, file: File): Promise<BranchInspectionOfficer> => {
    const formData = new FormData();
    formData.append('signature', file);
    const response = await api.post(`/purchase/branch-inspection-officers/${id}/signature`, formData);
    return response.data;
  },

  uploadStamp: async (id: number, file: File): Promise<BranchInspectionOfficer> => {
    const formData = new FormData();
    formData.append('stamp', file);
    const response = await api.post(`/purchase/branch-inspection-officers/${id}/stamp`, formData);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/purchase/branch-inspection-officers/${id}`);
  },

  toggleStatus: async (id: number): Promise<BranchInspectionOfficer> => {
    const response = await api.post(`/purchase/branch-inspection-officers/${id}/toggle-status`);
    return response.data;
  },
};

// ============================================================================
// PURCHASE REPORTS API
// ============================================================================

export const purchaseReportsApi = {
  getProcurementDashboard: async (fromDate?: string, toDate?: string): Promise<ProcurementDashboard> => {
    const response = await api.get('/purchase/reports/dashboard', { params: { fromDate, toDate } });
    return response.data;
  },

  getSupplierPerformance: async (fromDate?: string, toDate?: string): Promise<SupplierPerformanceReport> => {
    const response = await api.get('/purchase/reports/supplier-performance', { params: { fromDate, toDate } });
    return response.data;
  },

  getThreeWayMatch: async (fromDate?: string, toDate?: string): Promise<ThreeWayMatchReport> => {
    const response = await api.get('/purchase/reports/three-way-match', { params: { fromDate, toDate } });
    return response.data;
  },

  getProcurementAnalysis: async (fromDate?: string, toDate?: string): Promise<ProcurementAnalysisReport> => {
    const response = await api.get('/purchase/reports/analysis', { params: { fromDate, toDate } });
    return response.data;
  },

  apAging: async (asOfDate?: string): Promise<Record<string, unknown>> => {
    const response = await api.get('/purchase/reports/ap-aging', { params: { asOfDate } });
    return response.data;
  },
  budgetVsActual: async (dateFrom: string, dateTo: string): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/purchase/reports/budget-vs-actual', { params: { dateFrom, dateTo } });
    return response.data;
  },
  duplicateInvoiceLog: async (): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/purchase/reports/duplicate-invoices');
    return response.data;
  },
  returnAnalysis: async (dateFrom: string, dateTo: string): Promise<Record<string, unknown>> => {
    const response = await api.get('/purchase/reports/return-analysis', { params: { dateFrom, dateTo } });
    return response.data;
  },
  supplierSpend: async (dateFrom: string, dateTo: string): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/purchase/reports/supplier-spend', { params: { dateFrom, dateTo } });
    return response.data;
  },
};

// ============================================================================
// PURCHASE RETURN TYPES
// ============================================================================

export type PurchaseReturnStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
export type ReturnReason = 'DEFECTIVE' | 'DAMAGED' | 'WRONG_ITEM' | 'EXCESS_QUANTITY' | 'POOR_QUALITY' | 'NOT_AS_ORDERED' | 'EXPIRED' | 'OTHER';

export interface PurchaseReturn {
  id: number;
  companyId: number;
  supplierId: number;
  grnId: number;
  returnNumber: string;
  returnDate: string;
  status: PurchaseReturnStatus;
  reference?: string;
  totalAmount: number;
  notes?: string;
  approvedById?: number;
  approvedDate?: string;
  approvalNotes?: string;
  rejectedById?: number;
  rejectedDate?: string;
  rejectionReason?: string;
  completedDate?: string;
  creditNoteId?: number;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier;
  grn?: GoodsReceivedNote;
  lines?: PurchaseReturnLine[];
  createdBy?: { id: number; name?: string };
  approvedBy?: { id: number; name?: string };
}

export interface PurchaseReturnLine {
  id?: number;
  itemId: number;
  grnLineId: number;
  returnQuantity: number;
  returnReason: ReturnReason;
  notes?: string;
  unitPrice?: number;
  totalAmount?: number;
  item?: { id: number; name?: string; code?: string };
}

export interface PurchaseReturnStats {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  completed: number;
  rejected: number;
  totalReturnValue: number;
  avgReturnValue: number;
}

export interface CreatePurchaseReturnDto {
  companyId: number;
  supplierId: number;
  grnId: number;
  returnDate: string;
  lines: {
    itemId: number;
    grnLineId: number;
    returnQuantity: number;
    returnReason: ReturnReason;
    notes?: string;
    unitPrice?: number;
    totalAmount?: number;
  }[];
  reference?: string;
  notes?: string;
}

export interface UpdatePurchaseReturnDto {
  returnDate?: string;
  reference?: string;
  notes?: string;
  lines?: CreatePurchaseReturnDto['lines'];
}

export interface PurchaseReturnQuery {
  companyId?: number;
  supplierId?: number;
  status?: PurchaseReturnStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// ============================================================================
// PURCHASE RETURNS API
// ============================================================================

export const purchaseReturnsApi = {
  list: async (query?: PurchaseReturnQuery): Promise<PurchaseReturn[]> => {
    const params = new URLSearchParams();
    if (query?.companyId) params.set('companyId', String(query.companyId));
    if (query?.supplierId) params.set('supplierId', String(query.supplierId));
    if (query?.status) params.set('status', query.status);
    if (query?.startDate) params.set('startDate', query.startDate);
    if (query?.endDate) params.set('endDate', query.endDate);
    if (query?.search) params.set('search', query.search);
    const { data } = await api.get(`/purchase/returns?${params.toString()}`);
    return data;
  },

  get: async (id: number): Promise<PurchaseReturn> => {
    const { data } = await api.get(`/purchase/returns/${id}`);
    return data;
  },

  getStats: async (companyId?: number): Promise<PurchaseReturnStats> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    const { data } = await api.get(`/purchase/returns/stats${params}`);
    return data;
  },

  create: async (dto: CreatePurchaseReturnDto): Promise<PurchaseReturn> => {
    const { data } = await api.post('/purchase/returns', dto);
    return data;
  },

  update: async (id: number, dto: UpdatePurchaseReturnDto): Promise<PurchaseReturn> => {
    const { data } = await api.put(`/purchase/returns/${id}`, dto);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/purchase/returns/${id}`);
  },

  submit: async (id: number): Promise<PurchaseReturn> => {
    const { data } = await api.post(`/purchase/returns/${id}/submit`);
    return data;
  },

  approve: async (id: number, approvalNotes?: string): Promise<PurchaseReturn> => {
    const { data } = await api.post(`/purchase/returns/${id}/approve`, { approvalNotes });
    return data;
  },

  reject: async (id: number, rejectionReason: string): Promise<PurchaseReturn> => {
    const { data } = await api.post(`/purchase/returns/${id}/reject`, { rejectionReason });
    return data;
  },

  complete: async (id: number, createStockAdjustment?: boolean): Promise<PurchaseReturn> => {
    const { data } = await api.post(`/purchase/returns/${id}/complete`, { createStockAdjustment });
    return data;
  },
};

// ============================================================================
// PO MATCHING API
// ============================================================================

export const poMatchingApi = {
  getDashboard: async (): Promise<Record<string, unknown>> => {
    const { data } = await api.get('/purchase/po-matching/dashboard');
    return data;
  },
  matchPO: async (poId: number): Promise<ThreeWayMatchResult> => {
    const { data } = await api.get(`/purchase/po-matching/po/${poId}`);
    return data;
  },
};

// ============================================================================
// SUPPLIER PERFORMANCE API
// ============================================================================

export const supplierPerformanceApi = {
  getReport: async (fromDate?: string, toDate?: string): Promise<SupplierPerformanceReport> => {
    const params = new URLSearchParams();
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    const { data } = await api.get(`/purchase/supplier-performance/report?${params.toString()}`);
    return data;
  },
  getForSupplier: async (supplierId: number): Promise<Record<string, unknown>> => {
    const { data } = await api.get(`/purchase/supplier-performance/supplier/${supplierId}/metrics`);
    return data;
  },
};

// ============================================================================
// SUPPLIER PAYMENT TYPES
// ============================================================================

export interface SupplierPaymentAllocation {
  id: number;
  paymentId: number;
  purchaseInvoiceId: number;
  amount: number;
  whtId: number | null;
  whtRate: number;
  whtAmount: number;
  netAmount: number;
  allocationDate: string;
  notes: string | null;
  invoiceNumber?: string;
  supplierInvoiceNumber?: string;
  invoiceTotal?: number;
}

export interface SupplierPaymentMethod {
  id: number;
  paymentId: number;
  paymentMethodId: number;
  bankId: number;
  amount: number;
  reference: string | null;
  paymentMethodName?: string;
  bankName?: string;
}

export interface SupplierPayment {
  id: number;
  companyId: number;
  supplierId: number;
  supplierName?: string;
  supplierCode?: string | null;
  paymentNumber: string;
  paymentDate: string;
  totalAmount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  whtAmount: number;
  netAmount: number;
  reference: string | null;
  notes: string | null;
  status: string;
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected' | 'voided';
  journalEntryId: number | null;
  isPosted: boolean;
  approvedBy: number | null;
  approvedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  allocations?: SupplierPaymentAllocation[];
  paymentMethods?: SupplierPaymentMethod[];
  createdAt: string;
  updatedAt: string;
}

export interface SupplierPaymentStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  voided: number;
  totalAmount: number;
}

export interface PaymentMethodLine {
  paymentMethodId: number;
  bankId: number;
  amount: number;
  reference?: string;
}

export interface PaymentAllocationLine {
  invoiceId: number;
  amount: number;
  whtId?: number;
  whtRate?: number;
  notes?: string;
}

export interface CreateSupplierPaymentDto {
  supplierId: number;
  paymentDate: string;
  totalAmount: number;
  reference?: string;
  notes?: string;
  paymentMethods: PaymentMethodLine[];
  allocations?: PaymentAllocationLine[];
}

export interface SupplierPaymentQuery {
  supplierId?: number;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// SUPPLIER PAYMENTS API
// ============================================================================

export const supplierPaymentsApi = {
  create: async (dto: CreateSupplierPaymentDto): Promise<SupplierPayment> => {
    const { data } = await api.post('/purchase/payments', dto);
    return data;
  },

  list: async (query?: SupplierPaymentQuery): Promise<{ data: SupplierPayment[]; total: number }> => {
    const params = new URLSearchParams();
    if (query?.supplierId) params.set('supplierId', String(query.supplierId));
    if (query?.status) params.set('status', query.status);
    if (query?.search) params.set('search', query.search);
    if (query?.dateFrom) params.set('dateFrom', query.dateFrom);
    if (query?.dateTo) params.set('dateTo', query.dateTo);
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    const { data } = await api.get(`/purchase/payments?${params.toString()}`);
    return data;
  },

  get: async (id: number): Promise<SupplierPayment> => {
    const { data } = await api.get(`/purchase/payments/${id}`);
    return data;
  },

  getStats: async (): Promise<SupplierPaymentStats> => {
    const { data } = await api.get('/purchase/payments/stats');
    return data;
  },

  approve: async (id: number, notes?: string): Promise<SupplierPayment> => {
    const { data } = await api.post(`/purchase/payments/${id}/approve`, { notes });
    return data;
  },

  reject: async (id: number, reason: string): Promise<SupplierPayment> => {
    const { data } = await api.post(`/purchase/payments/${id}/reject`, { reason });
    return data;
  },

  void: async (id: number, reason: string, voidDate?: string): Promise<SupplierPayment> => {
    const { data } = await api.post(`/purchase/payments/${id}/void`, { reason, voidDate });
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/purchase/payments/${id}`);
  },

  // Get outstanding invoices for a supplier (for allocation selection)
  getOutstandingInvoices: async (supplierId: number): Promise<PurchaseInvoice[]> => {
    const [unpaid, partial] = await Promise.all([
      api.get(`/purchase/invoices?supplierId=${supplierId}&paymentStatus=unpaid&status=approved&limit=100`),
      api.get(`/purchase/invoices?supplierId=${supplierId}&paymentStatus=partial&status=approved&limit=100`),
    ]);
    return [...(unpaid.data?.data ?? []), ...(partial.data?.data ?? [])];
  },
};
