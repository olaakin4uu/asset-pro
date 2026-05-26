// ============================================================================
// RECEIVABLES MODULE TYPES
// ============================================================================

// ============================================================================
// ENUMS
// ============================================================================

export enum ReceiptStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED',
  PARTIALLY_ALLOCATED = 'PARTIALLY_ALLOCATED',
  FULLY_ALLOCATED = 'FULLY_ALLOCATED',
  VOIDED = 'VOIDED',
}

export enum CreditNoteReason {
  GOODS_RETURNED = 'GOODS_RETURNED',
  DAMAGED_GOODS = 'DAMAGED_GOODS',
  PRICING_ERROR = 'PRICING_ERROR',
  QUANTITY_DISPUTE = 'QUANTITY_DISPUTE',
  SERVICE_ISSUE = 'SERVICE_ISSUE',
  DUPLICATE_INVOICE = 'DUPLICATE_INVOICE',
  OTHER = 'OTHER',
}

export enum CreditNoteStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  POSTED = 'POSTED',
  PARTIALLY_ALLOCATED = 'PARTIALLY_ALLOCATED',
  FULLY_ALLOCATED = 'FULLY_ALLOCATED',
  VOIDED = 'VOIDED',
}

// ============================================================================
// RECEIPT TYPES
// ============================================================================

export interface ReceiptPaymentMethod {
  id: number;
  receiptId: number;
  paymentMethodId: number;
  paymentMethodName?: string;
  bankId?: number;
  bankName?: string;
  accountId?: number;
  accountName?: string;
  amount: number;
  reference?: string;
  notes?: string;
}

export interface ReceiptAllocation {
  id: number;
  receiptId: number;
  invoiceId: number;
  invoiceNumber?: string;
  allocatedAmount: number;
  discountAllowed?: number;
  writeOffAmount?: number;
  whtId?: number;
  whtAmount?: number;
  notes?: string;
  createdAt: string;
}

export interface Receipt {
  id: number;
  companyId: number;
  branchId?: number;
  receiptNumber: string;
  customerId: number;
  customerName?: string;
  customerCode?: string;
  receiptDate: string;
  totalAmount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  currency: string;
  exchangeRate: number;
  bankAccountId?: number;
  bankAccountNumber?: string;
  bankName?: string;
  checkNumber?: string;
  referenceNumber?: string;
  description?: string;
  notes?: string;
  status: ReceiptStatus;
  postedAt?: string;
  postedById?: number;
  postedByName?: string;
  voidedAt?: string;
  voidedById?: number;
  voidedByName?: string;
  voidReason?: string;
  createdById: number;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  paymentMethods?: ReceiptPaymentMethod[];
  allocations?: ReceiptAllocation[];
}

export interface CreateReceiptPaymentMethodDto {
  paymentMethodId: number;
  bankId?: number;
  accountId?: number;
  amount: number;
  reference?: string;
  notes?: string;
}

export interface CreateReceiptAllocationDto {
  invoiceId: number;
  allocatedAmount: number;
  discountAllowed?: number;
  writeOffAmount?: number;
  whtId?: number;
  notes?: string;
}

export interface CreateReceiptDto {
  customerId: number;
  branchId?: number;
  receiptDate: string;
  totalAmount: number;
  currency?: string;
  exchangeRate?: number;
  bankAccountId?: number;
  bankAccountNumber?: string;
  bankName?: string;
  checkNumber?: string;
  referenceNumber?: string;
  description?: string;
  notes?: string;
  paymentMethods?: CreateReceiptPaymentMethodDto[];
  allocations?: CreateReceiptAllocationDto[];
}

export interface UpdateReceiptDto {
  receiptDate?: string;
  totalAmount?: number;
  referenceNumber?: string;
  description?: string;
  notes?: string;
  paymentMethods?: CreateReceiptPaymentMethodDto[];
  allocations?: CreateReceiptAllocationDto[];
}

export interface ReceiptQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: number;
  status?: ReceiptStatus;
  fromDate?: string;
  toDate?: string;
}

export interface ReceiptStats {
  total: number;
  draft: number;
  pendingApproval: number;
  posted: number;
  fullyAllocated: number;
  partiallyAllocated: number;
  totalAmount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
}

// ============================================================================
// CREDIT NOTE TYPES
// ============================================================================

export interface CreditNoteLine {
  id: number;
  creditNoteId: number;
  itemId?: number;
  itemCode?: string;
  itemName?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercentage: number;
  discountAmount: number;
  taxCode?: string;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  warehouseId?: number;
  warehouseName?: string;
  originalInvoiceLineId?: number;
}

export interface CreditNoteAllocation {
  id: number;
  creditNoteId: number;
  invoiceId: number;
  invoiceNumber?: string;
  allocatedAmount: number;
  notes?: string;
  createdAt: string;
}

export interface CreditNote {
  id: number;
  companyId: number;
  branchId?: number;
  creditNoteNumber: string;
  customerId: number;
  customerName?: string;
  customerCode?: string;
  creditNoteDate: string;
  originalInvoiceId?: number;
  originalInvoiceNumber?: string;
  reason: CreditNoteReason;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  description?: string;
  notes?: string;
  status: CreditNoteStatus;
  postToGL?: boolean;
  glAccountId?: number;
  isPosted?: boolean;
  postedAt?: string;
  postedById?: number;
  postedByName?: string;
  approvedAt?: string;
  approvedBy?: number;
  rejectionReason?: string;
  voidedAt?: string;
  voidedById?: number;
  voidedByName?: string;
  voidReason?: string;
  createdById: number;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  currentStepName?: string | null;
  lines?: CreditNoteLine[];
  allocations?: CreditNoteAllocation[];
}

export interface CreateCreditNoteLineDto {
  itemId?: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercentage?: number;
  taxCode?: string;
  taxRate?: number;
  warehouseId?: number;
  originalInvoiceLineId?: number;
}

export interface CreateCreditNoteDto {
  customerId: number;
  branchId?: number;
  creditNoteDate: string;
  originalInvoiceId?: number;
  reason: CreditNoteReason;
  currency?: string;
  exchangeRate?: number;
  description?: string;
  notes?: string;
  postToGL?: boolean;
  glAccountId?: number;
  amount?: number;
  lines?: CreateCreditNoteLineDto[];
}

export interface UpdateCreditNoteDto {
  creditNoteDate?: string;
  reason?: CreditNoteReason;
  description?: string;
  notes?: string;
  lines?: CreateCreditNoteLineDto[];
}

export interface CreditNoteQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: number;
  status?: CreditNoteStatus;
  reason?: CreditNoteReason;
  fromDate?: string;
  toDate?: string;
}

export interface CreditNoteStats {
  total: number;
  draft: number;
  pendingApproval: number;
  posted: number;
  fullyAllocated: number;
  partiallyAllocated: number;
  totalAmount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
}

// ============================================================================
// AGING & REPORTS
// ============================================================================

export interface CustomerAging {
  customerId: number;
  customerCode: string;
  customerName: string;
  creditLimit?: number;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90Days: number;
  totalOutstanding: number;
}

export interface ReceivablesAgingSummary {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90Days: number;
  total: number;
  customerCount: number;
}

export interface CustomerStatement {
  customerId: number;
  customerCode: string;
  customerName: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  closingBalance: number;
  transactions: CustomerStatementLine[];
}

export interface CustomerStatementLine {
  date: string;
  documentType: 'INVOICE' | 'RECEIPT' | 'CREDIT_NOTE';
  documentNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}
