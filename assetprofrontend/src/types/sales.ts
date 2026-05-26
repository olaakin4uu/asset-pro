// ============================================================================
// SALES MODULE TYPES
// ============================================================================

// ============================================================================
// ENUMS & STATUS TYPES
// ============================================================================

export type SalesOrderStatus = 'draft' | 'pending' | 'approved' | 'partial' | 'delivered' | 'invoiced' | 'cancelled';
export type DeliveryStatus = 'draft' | 'pending' | 'approved' | 'in_transit' | 'delivered' | 'cancelled';
export type InvoiceStatus = 'draft' | 'pending' | 'approved' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'voided';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';
export type LoadingOrderStatus = 'draft' | 'loading' | 'loaded' | 'completed' | 'dispatched' | 'delivered' | 'invoiced' | 'cancelled';
export type ApprovalStatus = 'draft' | 'submitted' | 'pending' | 'approved' | 'rejected' | 'returned';
export type InvoiceType = 'direct' | 'from_order' | 'from_delivery' | 'proforma';

// ============================================================================
// SALES ORDER
// ============================================================================

export interface SalesOrderLine {
  id: number;
  salesOrderId: number;
  itemId: number;
  itemName?: string;
  itemCode?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'amount' | 'percentage';
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  unitOfMeasure?: string;
  warehouseId?: number;
  warehouseName?: string;
  lineNumber?: number;
  uomId?: number;
  vatId?: number;
  lineStatus?: string;
  invoicedQty?: number;
  deliveredQty?: number;
  uom?: { id: number; name: string; abbreviation?: string };
  vat?: { id: number; name: string; rate: number };
}

export interface SalesOrder {
  id: number;
  companyId: number;
  branchId: number;
  branchName?: string;
  orderNumber: string;
  customerId: number;
  customerName?: string;
  customerBranchId?: number;
  customerBranchName?: string;
  salesRepId?: number;
  salesRepName?: string;
  warehouseId?: number;
  warehouseName?: string;
  currencyId: number;
  currencyCode?: string;
  exchangeRate: number;
  orderDate: string;
  deliveryDate?: string;
  expiryDate?: string;
  paymentTerms?: string;
  reference?: string;
  notes?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  customerPoNumber?: string;
  priority?: string;
  invoiceStatus?: string;
  termsConditions?: string;
  submittedAt?: string;
  status: SalesOrderStatus;
  approvalStatus: ApprovalStatus;
  approvalStepsDone?: number;
  lines?: SalesOrderLine[];
  branch?: { id: number; name: string };
  salesRep?: { id: number; firstName: string; lastName: string };
  warehouse?: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
  createdById?: number;
  createdByName?: string;
}

export interface CreateSalesOrderDto {
  customerId: number;
  customerBranchId?: number;
  branchId?: number;
  salesRepId?: number;
  warehouseId?: number;
  currencyId?: number;
  orderDate: string;
  deliveryDate?: string;
  paymentTerms?: string;
  reference?: string;
  customerPoNumber?: string;
  priority?: string;
  termsConditions?: string;
  notes?: string;
  discountAmount?: number;
  lines: CreateSalesOrderLineDto[];
}

export interface CreateSalesOrderLineDto {
  itemId: number;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountType?: 'amount' | 'percentage';
  taxRate?: number;
  warehouseId?: number;
  lineNumber?: number;
  uomId?: number;
  vatId?: number;
}

export interface UpdateSalesOrderDto extends Partial<CreateSalesOrderDto> {}

// ============================================================================
// LOADING ORDER
// ============================================================================

export interface LoadingOrderLine {
  id: number;
  loadingOrderId: number;
  salesOrderLineId: number;
  itemId: number;
  itemName?: string;
  itemCode?: string;
  quantityOrdered: number;
  quantityLoaded: number;
  variance: number;
  notes?: string;
  lineNumber?: number;
  description?: string;
  unitPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  vatId?: number;
  uomId?: number;
  taxAmount?: number;
  lineTotal?: number;
  lineStatus?: string;
  quantityInvoiced?: number;
}

export interface LoadingOrder {
  id: number;
  companyId: number;
  branchId: number;
  branchName?: string;
  loadingOrderNumber: string;
  /** Backend actually returns `loadingNumber` (matches DB column); kept alongside the historical `loadingOrderNumber` alias to avoid breaking existing callers. */
  loadingNumber?: string;
  salesOrderId: number;
  salesOrderNumber?: string;
  customerId: number;
  customerName?: string;
  warehouseId: number;
  warehouseName?: string;
  loadingDate: string;
  loadedById?: number;
  loadedByName?: string;
  totalQuantityOrdered: number;
  totalQuantityLoaded: number;
  loadingInstructions?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  status: LoadingOrderStatus;
  notes?: string;
  completedAt?: string;
  createdBy?: number;
  lines?: LoadingOrderLine[];
  inspectionId?: number | null;
  inspectionStatus?: string | null;
  inspectionResult?: string | null;
  inspectionOfficers?: {
    id: number;
    employeeName: string;
    role: string;
    status: string;
    result: string;
  }[];
  /** True if at least one non-deleted sales invoice references this LO. Populated by the list endpoint via EXISTS subquery. */
  hasInvoice?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoadingOrderDto {
  salesOrderId: number;
  warehouseId: number;
  branchId?: number;
  loadingDate: string;
  loadedById?: number;
  loadingInstructions?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  notes?: string;
  lines: CreateLoadingOrderLineDto[];
}

export interface CreateLoadingOrderLineDto {
  salesOrderLineId: number;
  itemId: number;
  orderedQuantity: number;
  notes?: string;
}

export interface UpdateLoadingOrderDto extends Partial<CreateLoadingOrderDto> {}

// ============================================================================
// SALES DELIVERY
// ============================================================================

export interface SalesDeliveryLine {
  id: number;
  salesDeliveryId: number;
  itemId: number;
  itemName?: string;
  itemCode?: string;
  quantityDelivered: number;
  condition?: string;
  notes?: string;
  lineNumber?: number;
  description?: string;
  unitCost?: number;
  uomId?: number;
}

export interface SalesDelivery {
  id: number;
  companyId: number;
  branchId: number;
  branchName?: string;
  deliveryNumber: string;
  salesOrderId?: number;
  salesOrderNumber?: string;
  customerId: number;
  customerName?: string;
  customerBranchId?: number;
  customerBranchName?: string;
  warehouseId?: number;
  warehouseName?: string;
  driverId?: number;
  driverName?: string;
  vehicleId?: number;
  vehiclePlate?: string;
  deliveryDate: string;
  deliveryAddress?: string;
  contactPerson?: string;
  contactPhone?: string;
  receivedByEmployeeId?: number;
  journalEntryId?: number;
  status: DeliveryStatus;
  approvalStatus: ApprovalStatus;
  notes?: string;
  autoInvoiceError?: string | null;
  autoInvoiceAttemptedAt?: string | null;
  lines?: SalesDeliveryLine[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalesDeliveryDto {
  salesOrderId?: number;
  customerId: number;
  customerBranchId?: number;
  branchId?: number;
  warehouseId?: number;
  driverId?: number;
  vehicleId?: number;
  deliveryDate: string;
  deliveryAddress?: string;
  contactPerson?: string;
  contactPhone?: string;
  notes?: string;
  lines: CreateSalesDeliveryLineDto[];
}

export interface CreateSalesDeliveryLineDto {
  itemId: number;
  quantityDelivered: number;
  condition?: string;
  notes?: string;
}

export interface UpdateSalesDeliveryDto extends Partial<CreateSalesDeliveryDto> {}

// ============================================================================
// SALES INVOICE
// ============================================================================

export interface SalesInvoiceLine {
  id: number;
  salesInvoiceId: number;
  itemId: number;
  itemName?: string;
  itemCode?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'amount' | 'percentage';
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  lineNumber?: number;
  uomId?: number;
  withholdingTaxRate?: number;
  withholdingTaxAmount?: number;
  loadingOrderLineId?: number;
  salesDeliveryLineId?: number;
}

export interface SalesInvoice {
  id: number;
  companyId: number;
  branchId: number;
  branchName?: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  customerId: number;
  customerName?: string;
  customerBranchId?: number;
  customerBranchName?: string;
  salesOrderId?: number;
  salesOrderNumber?: string;
  customerPoNumber?: string | null;
  salesDeliveryId?: number;
  salesDeliveryNumber?: string;
  currencyId: number;
  currencyCode?: string;
  exchangeRate: number;
  salesRepId?: number;
  salesRepName?: string;
  warehouseId?: number;
  warehouseName?: string;
  loadingOrderId?: number;
  invoiceDate: string;
  dueDate: string;
  expectedDeliveryDate?: string;
  paymentTerms?: string;
  reference?: string;
  priority?: string;
  deliveryAddress?: string;
  termsConditions?: string;
  notes?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  withholdingTaxAmount: number;
  transportation: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  journalEntryId?: number;
  updatedBy?: number;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  approvalStatus: ApprovalStatus;
  lines?: SalesInvoiceLine[];
  payments?: InvoicePayment[];
  branch?: { id: number; name: string };
  salesRep?: { id: number; firstName: string; lastName: string };
  warehouse?: { id: number; name: string };
  validUntil?: string;
  convertedOrderId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalesInvoiceDto {
  invoiceType: InvoiceType;
  customerId: number;
  customerBranchId?: number;
  branchId?: number;
  salesRepId?: number;
  warehouseId?: number;
  loadingOrderId?: number;
  salesOrderId?: number;
  salesDeliveryId?: number;
  currencyId?: number;
  invoiceDate: string;
  dueDate: string;
  expectedDeliveryDate?: string;
  paymentTerms?: string;
  reference?: string;
  priority?: string;
  deliveryAddress?: string;
  termsConditions?: string;
  notes?: string;
  discountAmount?: number;
  withholdingTaxAmount?: number;
  transportation?: number;
  validUntil?: string;
  lines: CreateSalesInvoiceLineDto[];
}

export interface CreateSalesInvoiceLineDto {
  itemId: number;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountType?: 'amount' | 'percentage';
  taxRate?: number;
  lineTotal?: number;
}

export interface UpdateSalesInvoiceDto extends Partial<CreateSalesInvoiceDto> {}

// ============================================================================
// INVOICE PAYMENT
// ============================================================================

export interface InvoicePayment {
  id: number;
  salesInvoiceId: number;
  invoiceNumber?: string;
  paymentMethodId: number;
  paymentMethodName?: string;
  bankId?: number;
  bankName?: string;
  amount: number;
  transactionFee?: number;
  totalAmount?: number;
  paymentDate: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled';
  approvalStatus?: string;
  approvedBy?: number;
  approvedAt?: string;
  approvalNotes?: string;
  createdBy?: number;
  updatedBy?: number;
  createdAt: string;
  updatedAt: string;
  salesInvoice?: {
    id: number;
    invoiceNumber: string;
    totalAmount: number;
    balanceAmount: number;
    customer?: { id: number; name: string };
  };
}

export interface CreateInvoicePaymentDto {
  salesInvoiceId: number;
  paymentMethodId: number;
  bankId?: number;
  amount: number;
  transactionFee?: number;
  paymentDate: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}

export interface UpdateInvoicePaymentDto extends Partial<CreateInvoicePaymentDto> {}

// ============================================================================
// SALES AREA
// ============================================================================

export interface SalesArea {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  customerCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalesAreaDto {
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateSalesAreaDto extends Partial<CreateSalesAreaDto> {}

// ============================================================================
// CUSTOMER BRANCH
// ============================================================================

export interface CustomerBranch {
  id: number;
  companyId: number;
  customerId: number;
  customerName?: string;
  code: string;
  name: string;
  salesAreaId?: number;
  salesAreaName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  customer?: { id: number; code: string | null; name: string };
}

export interface CreateCustomerBranchDto {
  customerId: number;
  code: string;
  name: string;
  salesAreaId?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdateCustomerBranchDto extends Partial<CreateCustomerBranchDto> {}

// ============================================================================
// SALES SETTINGS
// ============================================================================

export type CommissionBasis = 'revenue' | 'profit' | 'quantity' | 'net_sale' | 'gross_sale' | 'margin';

export interface SalesSettings {
  id: number;
  companyId: number;

  // =========================================================================
  // 1. INVENTORY & STOCK (7 fields)
  // =========================================================================
  allowNegativeStock: boolean;
  strictStockValidation: boolean;
  requireWarehouseSelection: boolean;
  reserveStockOnOrder: boolean;
  autoAllocateStock: boolean;
  checkStockOnOrder: boolean;
  checkStockOnDelivery: boolean;

  // =========================================================================
  // 2. WORKFLOW (22 fields)
  // =========================================================================
  requireSalesOrder: boolean;
  requireDeliveryNote: boolean;
  requireLoadingOrder: boolean;
  requireLoadingOrderApproval: boolean;
  requireInspectionBeforeDispatch: boolean;
  autoDispatchOnInspectionPass: boolean;
  inspectionQcOfficerIds: number[] | null;
  inspectionAuditOfficerIds: number[] | null;
  inspectionChecklist: Record<string, unknown>[] | null;
  allowDirectInvoice: boolean;
  allowPartialDelivery: boolean;
  allowPartialInvoicing: boolean;
  requireCustomerOrder: boolean;
  allowQuoteToOrder: boolean;
  allowOrderToDelivery: boolean;
  allowDeliveryToInvoice: boolean;
  requireDeliveryBeforeInvoice: boolean;
  allowOrderEditAfterApproval: boolean;
  autoApproveOrder: boolean;
  autoCloseOrderOnFullDelivery: boolean;
  allowOverDelivery: boolean;
  autoCreateInvoice: boolean;
  requireOrderApproval: boolean;
  requireDeliveryApproval: boolean;
  requireInvoiceApproval: boolean;
  requireCustomerPoNumber: boolean;
  requireDeliveryAddress: boolean;

  // =========================================================================
  // 3. PRICING & DISCOUNTS (14 fields)
  // =========================================================================
  allowPriceOverride: boolean;
  requireApprovalForPriceOverride: boolean;
  priceOverrideRequiresApproval: boolean;
  maxDiscountPercentage: number;
  allowLineItemDiscount: boolean;
  allowOrderLevelDiscount: boolean;
  allowManualDiscount: boolean;
  requireDiscountApproval: boolean;
  discountRequiresApproval: boolean;
  allowZeroPrice: boolean;
  allowZeroCost: boolean;
  blockBelowCostSelling: boolean;
  defaultPriceListId: number | null;
  defaultPriceList: string | null;
  pricesIncludeTax: boolean;
  allowDiscountOnDiscounted: boolean;
  minOrderAmount: number | null;
  maxOrderAmount: number | null;
  minimumOrderAmount: number | null;
  maximumOrderAmount: number | null;
  applyPromotionalPrices: boolean;
  applyQuantityDiscounts: boolean;

  // =========================================================================
  // 4. CUSTOMER SETTINGS (13 fields)
  // =========================================================================
  enforceCreditLimit: boolean;
  allowCreditLimitOverride: boolean;
  creditOverrideRequiresApproval: boolean;
  defaultCreditTerms: number;
  defaultPaymentTerms: string;
  blockOrdersOnOverdueInvoices: boolean;
  overdueToleranceDays: number;
  allowOnHoldCustomers: boolean;
  checkOverdueInvoices: boolean;
  requireCustomerCreditCheck: boolean;
  allowCustomerPriceOverride: boolean;
  requireCustomerApproval: boolean;
  validateCustomerCreditLimit: boolean;

  // =========================================================================
  // 5. APPROVALS (2 fields)
  // =========================================================================
  autoApproveBelowAmount: number | null;
  lockApprovedOrders: boolean;

  // =========================================================================
  // 6. RETURNS & CANCELLATIONS (10 fields)
  // =========================================================================
  allowReturns: boolean;
  returnWindowDays: number;
  returnRequiresApproval: boolean;
  requireReturnApproval: boolean;
  autoIssueCreditmemo: boolean;
  requireApprovalForCancellation: boolean;
  allowPartialReturns: boolean;
  allowSalesReturns: boolean;
  allowOrderCancellation: boolean;
  cancellationReasonRequired: boolean;

  // =========================================================================
  // 7. TAX SETTINGS (12 fields)
  // =========================================================================
  defaultVatId: number | null;
  defaultVatRate: number;
  defaultWhtId: number | null;
  defaultWhtRate: number;
  calculateTaxAutomatically: boolean;
  autoCalculateTax: boolean;
  applyWhtOnInvoice: boolean;
  applyWithholdingTax: boolean;
  vatBasis?: 'accrual' | 'cash';
  vatOutputHoldingAccountId?: number | null;
  applyTaxInclusive: boolean;
  separateTaxLineItems: boolean;
  requireTaxExemptionCertificate: boolean;
  generatePdfOnApproval: boolean;

  // =========================================================================
  // 8. DOCUMENT NUMBERING (17 fields)
  // =========================================================================
  orderNumberFormat: string;
  deliveryNoteFormat: string;
  invoiceNumberFormat: string;
  returnNumberFormat: string;
  creditNoteFormat: string;
  quotationNumberFormat: string;
  loadingOrderFormat: string;
  loadingOrderNumberFormat: string;
  proformaInvoiceFormat: string;
  sequencePadding: number;
  orderPrefix: string;
  deliveryPrefix: string;
  invoicePrefix: string;
  returnPrefix: string;
  creditNotePrefix: string;
  quotationPrefix: string;
  loadingOrderPrefix: string;
  proformaPrefix: string;

  // =========================================================================
  // 9. NOTIFICATIONS (11 fields)
  // =========================================================================
  autoSendOrderConfirmation: boolean;
  autoSendInvoice: boolean;
  autoSendDeliveryNote: boolean;
  notifyLowStockOnOrder: boolean;
  notifyOnOrderCreated: boolean;
  notifyOnOrderApproved: boolean;
  notifyOnDeliveryCreated: boolean;
  notifyLowStock: boolean;
  emailOrderConfirmation: boolean;
  emailDeliveryNote: boolean;
  emailInvoice: boolean;

  // =========================================================================
  // 10. COMMISSION (7 fields)
  // =========================================================================
  calculateCommission: boolean;
  defaultCommissionRate: number;
  commissionBasis: CommissionBasis;
  commissionPaidOn: string;
  commissionOnPayment: boolean;
  commissionExpenseAccountId: number | null;
  commissionPayableAccountId: number | null;

  // =========================================================================
  // 11. PAYMENT (5 fields)
  // =========================================================================
  requireDeposit: boolean;
  defaultDepositPercentage: number;
  requirePaymentTerms: boolean;
  allowPartialPayments: boolean;
  paymentTermsApprovalRequired: boolean;

  // =========================================================================
  // 12. QUOTATION (4 fields)
  // =========================================================================
  quotationValidityDays: number;
  quoteValidityDays: number;
  autoExpireQuotations: boolean;
  requireQuotationApproval: boolean;

  // =========================================================================
  // 13. PROFORMA INVOICE (2 fields)
  // =========================================================================
  requireProformaInvoice: boolean;
  proformaValidityDays: number;

  // =========================================================================
  // 14. DOCUMENT SETTINGS (7 fields)
  // =========================================================================
  printCompanyLogo: boolean;
  printCompanyAddress: boolean;
  printTermsAndConditions: boolean;
  defaultTermsAndConditions: string | null;
  defaultDeliveryTerms: string | null;
  emailInvoiceOnCreate: boolean;
  emailDeliveryNoteOnCreate: boolean;

  // =========================================================================
  // 15. GL INTEGRATION (5 fields)
  // =========================================================================
  autoPostToGL: boolean;
  defaultSalesAccountId: number | null;
  defaultReceivablesAccountId: number | null;
  defaultDiscountAccountId: number | null;
  defaultReturnAccountId: number | null;

  // =========================================================================
  // 16. MISCELLANEOUS (2 fields)
  // =========================================================================
  trackSalesByProject: boolean;
  allowBackorders: boolean;

  updatedAt: string;
}

export interface UpdateSalesSettingsDto extends Partial<Omit<SalesSettings, 'id' | 'companyId' | 'updatedAt'>> {}

// ============================================================================
// STATISTICS & DASHBOARD
// ============================================================================

export interface SalesStats {
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  deliveredOrders: number;
  totalInvoices: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
}

export interface SalesDashboard {
  stats: SalesStats;
  recentOrders: SalesOrder[];
  topCustomers: Array<{
    customerId: number;
    customerName: string;
    totalOrders: number;
    totalRevenue: number;
  }>;
  revenueTrend: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
  overdueInvoices: SalesInvoice[];
}

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface SalesOrderListQuery {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: number;
  status?: SalesOrderStatus;
  approvalStatus?: ApprovalStatus;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  active?: boolean;
}

export interface SalesInvoiceListQuery {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: number;
  status?: InvoiceStatus;
  paymentStatus?: PaymentStatus;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  invoiceType?: string;
  excludeProforma?: boolean;
}

export interface SalesDeliveryListQuery {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: number;
  status?: DeliveryStatus;
  fromDate?: string;
  toDate?: string;
}

export interface LoadingOrderListQuery {
  page?: number;
  limit?: number;
  search?: string;
  salesOrderId?: number;
  status?: LoadingOrderStatus;
  /**
   * Workflow lifecycle filter — combines LO status + inspection result + invoice
   * existence. Use this for management-oriented views ("where is each LO stuck").
   * Defaults applied at the page level (not the API): typically `active`.
   */
  lifecycle?: 'active' | 'inspection' | 'delivery' | 'invoice' | 'closed';
  fromDate?: string;
  toDate?: string;
}

export interface SalesAreaListQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface CustomerBranchListQuery {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: number;
  salesAreaId?: number;
  isActive?: boolean;
}

// ============================================================================
// SALES REP
// ============================================================================

export type SalesRepType = 'internal' | 'external';

export interface SalesRep {
  id: number;
  companyId: number;
  code: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  type: SalesRepType;
  employeeId: number | null;
  commissionRate: number | null;
  commissionBasis: string;
  commissionPaidOn: string;
  paymentMethod: string;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  bankSortCode: string | null;
  taxId: string | null;
  whtRate: number | null;
  salesAreaId: number | null;
  managerId: number | null;
  isActive: boolean;
  notes: string | null;
  createdBy: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  salesAreaName?: string;
  managerName?: string;
  employeeName?: string;
  branchNames?: string;
  customerCount?: number;
  orderCount?: number;
  branches?: Array<{ branchId: number; branchName: string }>;
}

export interface SalesRepStats {
  total: number;
  active: number;
  inactive: number;
  internal: number;
  external: number;
}

export interface ImportSalesRepRow {
  code: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  type?: string;
  commissionRate?: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  taxId?: string;
  whtRate?: number;
}

export interface ImportSalesRepsResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}
