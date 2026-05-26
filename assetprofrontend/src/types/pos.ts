// ============================================================================
// POS MODULE TYPES
// ============================================================================

// ============================================================================
// CASH REGISTER
// ============================================================================

export interface CashRegister {
  id: number;
  companyId: number;
  branchId: number;
  registerName: string;
  registerCode: string;
  location?: string;
  description?: string;
  openingFloat: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCashRegisterDto {
  branchId: number;
  registerName: string;
  registerCode: string;
  location?: string;
  description?: string;
  openingFloat?: number;
  isActive?: boolean;
}

export interface UpdateCashRegisterDto extends Partial<CreateCashRegisterDto> {}

export interface CashRegisterListQuery {
  branchId?: number;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// CASH REGISTER SESSION
// ============================================================================

export type SessionStatus = 'open' | 'closed';

export interface SessionPaymentMethod {
  paymentMethodId: number;
  paymentMethodName: string;
  paymentMethodCode: string;
  openingAmount: number;
  closingAmount?: number;
  expectedAmount?: number;
}

export interface CashRegisterSession {
  id: number;
  companyId: number;
  branchId: number;
  cashRegisterId: number;
  cashRegister?: CashRegister;
  sessionNumber: string;
  openingAmount: number;
  closingAmount?: number;
  expectedAmount?: number;
  varianceAmount?: number;
  status: SessionStatus;
  openedAt: string;
  closedAt?: string;
  openedById: number;
  openedByName?: string;
  closedById?: number;
  closedByName?: string;
  openingNotes?: string;
  closingNotes?: string;
  paymentMethods: SessionPaymentMethod[];
  createdAt: string;
  updatedAt: string;
}

export interface OpenSessionDto {
  cashRegisterId: number;
  openingAmount: number;
  paymentMethodIds: number[];
  openingNotes?: string;
}

export interface CloseSessionDto {
  closingAmounts: {
    paymentMethodId: number;
    amount: number;
  }[];
  closingNotes?: string;
}

export interface SessionListQuery {
  cashRegisterId?: number;
  branchId?: number;
  status?: SessionStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface SessionClosingSummary {
  session: CashRegisterSession;
  salesSummary: {
    totalSales: number;
    cashSales: number;
    creditSales: number;
    salesCount: number;
  };
  paymentMethodBreakdown: {
    paymentMethodId: number;
    paymentMethodName: string;
    salesAmount: number;
    paymentsReceived: number;
    total: number;
  }[];
  creditSalesDetails: {
    invoiceNumber: string;
    customerName: string;
    amount: number;
  }[];
  paymentsReceivedDetails: {
    receiptNumber: string;
    customerName: string;
    amount: number;
  }[];
  expectedCash: number;
  actualCash?: number;
  variance?: number;
}

// ============================================================================
// CUSTOMER DEPOSIT
// ============================================================================

export type DepositStatus = 'active' | 'partially_applied' | 'fully_applied' | 'refunded';

export interface CustomerDeposit {
  id: number;
  companyId: number;
  branchId: number;
  customerId: number;
  customerName?: string;
  customerCode?: string;
  depositNumber: string;
  depositDate: string;
  amount: number;
  availableBalance: number;
  appliedAmount: number;
  refundedAmount: number;
  paymentMethodId: number;
  paymentMethodName?: string;
  sessionId?: number;
  sessionNumber?: string;
  salesOrderId?: number;
  salesOrderNumber?: string;
  status: DepositStatus;
  expiryDate?: string;
  notes?: string;
  createdById: number;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerDepositDto {
  customerId: number;
  amount: number;
  paymentMethodId: number;
  depositDate?: string;
  salesOrderId?: number;
  expiryDate?: string;
  notes?: string;
}

export interface UpdateCustomerDepositDto {
  expiryDate?: string;
  notes?: string;
}

export interface DepositRefundDto {
  amount: number;
  reason?: string;
  paymentMethodId?: number;
}

export interface DepositApplicationDto {
  salesOrderId: number;
  amount: number;
}

export interface DepositListQuery {
  customerId?: number;
  branchId?: number;
  sessionId?: number;
  status?: DepositStatus;
  availableOnly?: boolean;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DepositStats {
  totalDeposits: number;
  activeDeposits: number;
  totalAmount: number;
  availableBalance: number;
  appliedAmount: number;
  refundedAmount: number;
}

// ============================================================================
// EXPENSE PAYMENT
// ============================================================================

export type ExpensePostingStatus = 'draft' | 'posted';
export type ExpenseApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface ExpensePaymentItem {
  id: number;
  expensePaymentId: number;
  expenseAccountId: number;
  expenseAccountName?: string;
  expenseAccountCode?: string;
  description: string;
  amount: number;
  taxAmount: number;
  netAmount: number;
  costCenterId?: number;
  costCenterName?: string;
}

export interface ExpensePayment {
  id: number;
  companyId: number;
  branchId: number;
  sessionId?: number;
  sessionNumber?: string;
  expenseNumber: string;
  expenseDate: string;
  payeeName: string;
  paymentMethodId: number;
  paymentMethodName?: string;
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  postingStatus: ExpensePostingStatus;
  approvalStatus: ExpenseApprovalStatus;
  description?: string;
  reference?: string;
  items: ExpensePaymentItem[];
  journalEntryId?: number;
  createdById: number;
  createdByName?: string;
  approvedById?: number;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpensePaymentItemDto {
  expenseAccountId: number;
  description: string;
  amount: number;
  taxAmount?: number;
  costCenterId?: number;
}

export interface CreateExpensePaymentDto {
  expenseDate?: string;
  payeeName: string;
  paymentMethodId: number;
  description?: string;
  reference?: string;
  items: CreateExpensePaymentItemDto[];
}

export interface UpdateExpensePaymentDto extends Partial<CreateExpensePaymentDto> {}

export interface ExpenseListQuery {
  branchId?: number;
  sessionId?: number;
  postingStatus?: ExpensePostingStatus;
  approvalStatus?: ExpenseApprovalStatus;
  paymentMethodId?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ExpenseStats {
  totalExpenses: number;
  draftExpenses: number;
  postedExpenses: number;
  totalAmount: number;
  draftAmount: number;
  postedAmount: number;
}

// ============================================================================
// POS TRANSACTION
// ============================================================================

export type TransactionType = 'cash_sale' | 'credit_sale' | 'payment_receipt';

export interface POSTransactionItem {
  itemId: number;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount: number;
  uomId: number;
  uomName?: string;
  warehouseId: number;
}

export interface POSPaymentAllocation {
  paymentMethodId: number;
  amount: number;
}

export interface CreateCashSaleDto {
  sessionId?: number;
  customerId: number;
  items: Omit<POSTransactionItem, 'itemCode' | 'itemName' | 'uomName'>[];
  payments?: POSPaymentAllocation[];
  paymentMethod?: string;
  amountTendered?: number;
  notes?: string;
  discountPercent?: number;
  discountAmount?: number;
}

export interface CreateCreditSaleDto {
  sessionId?: number;
  customerId: number;
  items: Omit<POSTransactionItem, 'itemCode' | 'itemName' | 'uomName'>[];
  notes?: string;
  discountPercent?: number;
  discountAmount?: number;
}

export interface CreatePaymentReceiptDto {
  customerId: number;
  payments: POSPaymentAllocation[];
  allocations: {
    invoiceId: number;
    amount: number;
  }[];
  notes?: string;
}

// ============================================================================
// PAYMENT RECEIPT
// ============================================================================

export type PaymentReceiptStatus = 'pending' | 'completed' | 'cancelled';

export interface PaymentReceiptItem {
  id: number;
  paymentReceiptId: number;
  invoiceId: number;
  invoiceNumber?: string;
  allocatedAmount: number;
}

export interface PaymentReceipt {
  id: number;
  companyId: number;
  branchId: number;
  sessionId?: number;
  receiptNumber: string;
  receiptDate: string;
  customerId: number;
  customerName?: string;
  customerCode?: string;
  paymentMethodId: number;
  paymentMethodName?: string;
  totalAmount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  paymentStatus: PaymentReceiptStatus;
  notes?: string;
  items: PaymentReceiptItem[];
  createdById: number;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// POS DASHBOARD
// ============================================================================

export interface POSDashboardStats {
  todaySales: number;
  todayTransactions: number;
  todayPaymentsReceived: number;
  todayExpenses: number;
  cashInRegister: number;
  activeSession?: CashRegisterSession;
}

export interface POSRecentTransaction {
  id: number;
  type: 'invoice' | 'receipt' | 'expense';
  documentNumber: string;
  customerName?: string;
  payeeName?: string;
  amount: number;
  createdAt: string;
}

// ============================================================================
// POS SETTINGS
// ============================================================================

export interface POSSettings {
  id: number;
  companyId: number;
  defaultCashRegisterId?: number;
  defaultWarehouseId?: number;
  defaultPriceListId?: number;
  requireCustomerForSale: boolean;
  allowCreditSales: boolean;
  allowNegativeStock: boolean;
  autoPostSales: boolean;
  autoPostPayments: boolean;
  autoPostExpenses: boolean;
  receiptPrintFormat: 'thermal' | 'a4';
  receiptHeader?: string;
  receiptFooter?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePOSSettingsDto extends Partial<Omit<POSSettings, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>> {}

// ============================================================================
// POS CUSTOMER (lightweight POS-specific customer view)
// ============================================================================

export interface POSCustomer {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  creditLimit: number;
  balance: number;
  availableDeposit: number;
}

export interface CreatePOSCustomerDto {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface POSCustomerStatement {
  customer: {
    id: number;
    name: string;
    code: string;
    creditLimit: number;
  };
  summary: {
    totalInvoiced: number;
    totalPaid: number;
    totalBalance: number;
    invoiceCount: number;
    availableDeposits: number;
    availableCredit: number;
  };
}

export interface POSCustomerInvoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  saleType: string;
}

export interface POSCustomerStats {
  total: number;
  active: number;
  withBalance: number;
  withDeposits: number;
  totalOutstanding: number;
  totalDeposits: number;
}

// ============================================================================
// POS PRODUCT (Read-only view of Inventory Items for POS)
// ============================================================================

export interface POSProduct {
  id: number;
  sku: string;
  name: string;
  barcode: string | null;
  sellingPrice: number;
  costPrice: number;
  quantityOnHand: number;
  vatId: number | null;
  vatRate: number | null;
  categoryId: number | null;
  categoryName: string | null;
  unitOfMeasure: string | null;
  imageUrl: string | null;
}

export interface POSProductCategory {
  id: number;
  name: string;
  parentId: number | null;
  productCount: number;
}

export interface POSProductStock {
  warehouseId: number;
  warehouseName: string;
  quantity: number;
}

export interface POSProductSearchQuery {
  q?: string;
  categoryId?: number;
  limit?: number;
}
