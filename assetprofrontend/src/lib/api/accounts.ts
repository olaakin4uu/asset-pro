import { api } from '../api';

// ============================================================================
// TYPES
// ============================================================================

export interface Account {
  id: number;
  entityId: number | null;
  companyId: number | null;
  categoryId: number | null;
  currencyId: number | null;
  code: string;
  name: string;
  description: string | null;
  accountType: string;
  ifrs18AccountType: string | null;
  parentId: number | null;
  isPosting: boolean;
  closingRate: boolean;
  isActive: boolean;
  children?: Account[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  entityId: number | null;
  name: string;
  categoryType: string;
  code: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: number;
  companyId: number;
  entryNumber: string;
  entryDate: string;
  reference: string | null;
  narration: string | null;
  totalDebit: number;
  totalCredit: number;
  status: 'draft' | 'pending' | 'posted' | 'reversed';
  journalType: string | null;
  sourceType: string | null;
  sourceId: number | null;
  postedAt: string | null;
  postedBy: number | null;
  reversedAt: string | null;
  reversedBy: number | null;
  reversalOf: number | null;
  fiscalYearId: number | null;
  createdBy: number | null;
  lines?: JournalEntryLine[];
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntryLine {
  id: number;
  journalEntryId: number;
  accountId: number;
  debit: number | null;
  credit: number | null;
  narration: string | null;
  reference: string | null;
  account_code?: string;
  account_name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FiscalYear {
  id: number;
  companyId: number;
  name: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'adjusting' | 'closed';
  isCurrent: boolean;
  closedAt: string | null;
  closedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Bank {
  id: number;
  companyId: number;
  branchId: number | null;
  name: string;
  accountName: string | null;
  accountNumber: string;
  bankName: string;
  branchCode: string | null;
  swiftCode: string | null;
  iban: string | null;
  routingNumber: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  glAccountId: number | null;
  currencyCode: string;
  openingBalance: number | null;
  openingBalanceDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransfer {
  id: number;
  companyId: number;
  fromBankId: number;
  toBankId: number;
  transferNumber: string;
  branchId: number | null;
  entityId: number | null;
  amount: number;
  totalAmount: number;
  currencyId: number | null;
  exchangeRate: number;
  transferDate: string;
  reference: string | null;
  description: string | null;
  status: string;
  journalEntryId: number | null;
  approvedBy: number | null;
  approvedAt: string | null;
  approvalNotes: string | null;
  postedBy: number | null;
  postedAt: string | null;
  completedAt: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  items?: BankTransferItem[];
  fromBankName?: string;
  toBankName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransferItem {
  id: number;
  bankTransferId: number;
  lineNumber: number;
  transferType: string;
  sourceAccountId: number;
  sourceBankId: number | null;
  destinationBankId: number;
  destinationAccountId: number;
  amount: number;
  description: string | null;
  sourceAccountName?: string;
  destinationAccountName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankAuthorization {
  id: number;
  bankId: number;
  employeeId: number;
  employeeName?: string;
  bankName?: string;
  canView: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  canTransfer: boolean;
  maxAmount: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankReconciliation {
  id: number;
  companyId: number;
  bankId: number;
  reconciliationDate: string;
  statementDate: string;
  statementBalance: number;
  bookBalance: number | null;
  reconciledBalance: number | null;
  difference: number | null;
  status: string;
  notes: string | null;
  completedAt: string | null;
  completedBy: number | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  bankName?: string;
  bankCode?: string;
  itemCount?: number;
}

export interface Currency {
  id: number;
  entityId: number;
  name: string;
  code: string;
  symbol: string | null;
  decimalPlaces: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeRate {
  id: number;
  fromCurrencyId: number;
  toCurrencyId: number;
  rate: number;
  validFrom: string;
  validTo: string | null;
  source: string | null;
  isActive: boolean;
  createdBy: number | null;
  fromCurrencyName?: string;
  fromCurrencyCode?: string;
  toCurrencyName?: string;
  toCurrencyCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vat {
  id: number;
  entityId: number;
  name: string;
  code: string;
  rate: number;
  accountId: number | null;
  accountCode?: string;
  accountName?: string;
  inputAccountId: number | null;
  inputAccountCode?: string;
  inputAccountName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: number;
  companyId: number;
  name: string;
  code: string;
  description: string | null;
  type: string;
  isActive: boolean;
  requiresRef: boolean;
  bankId: number | null;
  glAccountId: number | null;
  feeAccountId: number | null;
  cardType: string | null;
  mobileProvider: string | null;
  mobileNumber: string | null;
  transactionFeePercent: number;
  transactionFeeFixed: number;
  requiresApproval: boolean;
  approvalThreshold: number | null;
  allowPartialPayment: boolean;
  isDefault: boolean;
  sortOrder: number;
  icon: string | null;
  color: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Wht {
  id: number;
  companyId: number;
  name: string;
  code: string;
  rate: number;
  accountId: number | null;
  accountCode?: string;
  accountName?: string;
  receivableAccountId: number | null;
  category: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Query types
export interface AccountQuery {
  accountType?: string;
  categoryId?: number;
  parentId?: number | null;
  isActive?: boolean;
  isPosting?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface JournalEntryQuery {
  status?: string;
  journalType?: string;
  sourceType?: string;
  fiscalYearId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FiscalYearQuery {
  status?: string;
  isCurrent?: boolean;
  page?: number;
  limit?: number;
}

export interface YearEndChecklistItem {
  id: string;
  label: string;
  description: string;
  status: 'pass' | 'fail' | 'warning';
  detail: string;
  count?: number;
}

export interface YearEndChecklist {
  fiscalYear: FiscalYear;
  checks: YearEndChecklistItem[];
  summary: {
    totalEntries: number;
    totalDebit: number;
    totalCredit: number;
    trialBalanceDiff: number;
    unpostedCount: number;
    openPeriodsCount: number;
  };
}

export interface ImportAccountItem {
  code: string;
  name: string;
  accountType: string;
  categoryType?: string;
  parentCode?: string;
  description?: string;
  isPosting?: boolean;
  ifrs18AccountType?: string;
  closingRate?: boolean;
  isActive?: boolean;
}

export interface ImportAccountsResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; code: string; message: string }[];
}

export interface BankQuery {
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CurrencyQuery {
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ExchangeRateQuery {
  fromCurrencyId?: number;
  toCurrencyId?: number;
  isActive?: boolean;
  asOfDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface VatQuery {
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaymentMethodQuery {
  isActive?: boolean;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface WhtQuery {
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GroupedTrialBalanceQuery {
  asOfDate?: string;
  fiscalYearId?: number;
  includeZeroBalances?: boolean;
  companyId?: number;
  page?: number;
  limit?: number;
}

// Report types
export interface TrialBalanceItem {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  categoryName: string | null;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalanceReport {
  asOfDate: string;
  items: TrialBalanceItem[];
  totals: {
    openingDebit: number;
    openingCredit: number;
    periodDebit: number;
    periodCredit: number;
    closingDebit: number;
    closingCredit: number;
  };
}

export interface BalanceSheetSection {
  name: string;
  items: {
    accountId: number;
    accountCode: string;
    accountName: string;
    balance: number;
  }[];
  total: number;
}

export interface BalanceSheetReport {
  asOfDate: string;
  assets: {
    nonCurrentAssets: BalanceSheetSection;
    currentAssets: BalanceSheetSection;
    totalAssets: number;
  };
  liabilities: {
    nonCurrentLiabilities: BalanceSheetSection;
    currentLiabilities: BalanceSheetSection;
    totalLiabilities: number;
  };
  equity: {
    items: BalanceSheetSection;
    retainedEarnings: number;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
}

export interface IncomeStatementSection {
  name: string;
  items: {
    accountId: number;
    accountCode: string;
    accountName: string;
    amount: number;
  }[];
  total: number;
}

export interface IncomeStatementReport {
  startDate: string;
  endDate: string;
  revenue: IncomeStatementSection;
  costOfSales: IncomeStatementSection;
  grossProfit: number;
  operatingExpenses: IncomeStatementSection;
  operatingProfit: number;
  otherIncome: IncomeStatementSection;
  otherExpenses: IncomeStatementSection;
  netProfitBeforeTax: number;
  taxExpense: number;
  netProfit: number;
}

export interface GeneralLedgerEntry {
  date: string;
  transactionNo: string;
  reference: string | null;
  narration: string;
  debit: number | null;
  credit: number | null;
  balance: number;
}

export interface GeneralLedgerReport {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  entries: GeneralLedgerEntry[];
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
}

export interface AccountingSummary {
  currentPeriod: { startDate: string; endDate: string };
  revenue: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

// DTO types
export interface CreateAccountDto {
  code: string;
  name: string;
  description?: string;
  accountType: string;
  ifrs18AccountType?: string;
  parentId?: number;
  categoryId?: number;
  currencyId?: number;
  entityId?: number;
  isPosting?: boolean;
  closingRate?: boolean;
  isActive?: boolean;
}

export interface UpdateAccountDto {
  name?: string;
  description?: string;
  accountType?: string;
  ifrs18AccountType?: string;
  parentId?: number;
  categoryId?: number;
  currencyId?: number;
  isPosting?: boolean;
  closingRate?: boolean;
  isActive?: boolean;
}

export interface CreateCategoryDto {
  name: string;
  categoryType: string;
  code?: string;
  entityId?: number;
}

export interface UpdateCategoryDto {
  name?: string;
  categoryType?: string;
  code?: string;
}

export interface CreateJournalEntryDto {
  entryDate: string;
  reference?: string;
  narration?: string;
  journalType?: string;
  sourceType?: string;
  sourceId?: number;
  fiscalYearId?: number;
  lines: {
    accountId: number;
    debit?: number;
    credit?: number;
    narration?: string;
    reference?: string;
  }[];
}

export interface UpdateJournalEntryDto {
  entryDate?: string;
  reference?: string;
  narration?: string;
  journalType?: string;
  fiscalYearId?: number;
  lines?: {
    accountId: number;
    debit?: number;
    credit?: number;
    narration?: string;
    reference?: string;
  }[];
}

export interface CreateFiscalYearDto {
  name: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

export interface UpdateFiscalYearDto {
  name?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateBankDto {
  branchId?: number;
  name: string;
  accountName?: string;
  accountNumber: string;
  bankName: string;
  branch?: string;
  swiftCode?: string;
  routingNumber?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  glAccountId?: number;
  currencyCode?: string;
  openingBalance?: number;
  openingBalanceDate?: string;
  isActive?: boolean;
  authorizedEmployeeIds?: number[];
}

export interface UpdateBankDto {
  branchId?: number;
  name?: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  branch?: string;
  swiftCode?: string;
  routingNumber?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  glAccountId?: number;
  currencyCode?: string;
  isActive?: boolean;
  authorizedEmployeeIds?: number[];
}

export interface BankTransferDto {
  fromBankId: number;
  toBankId: number;
  amount: number;
  transferDate: string;
  reference?: string;
  narration?: string;
  exchangeRate?: number;
}

export interface BankTransferItemDto {
  transferType: string;
  sourceAccountId: number;
  sourceBankId?: number;
  destinationBankId: number;
  destinationAccountId: number;
  amount: number;
  description?: string;
}

export interface CreateBankTransferDto {
  fromBankId: number;
  toBankId: number;
  transferDate: string;
  reference?: string;
  description?: string;
  currencyId?: number;
  exchangeRate?: number;
  items: BankTransferItemDto[];
}

export interface UpdateBankTransferDto {
  transferDate?: string;
  reference?: string;
  description?: string;
  currencyId?: number;
  exchangeRate?: number;
  items?: BankTransferItemDto[];
}

export interface BankTransferQuery {
  status?: string;
  bankId?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ApproveBankTransferDto {
  notes?: string;
}

export interface RejectBankTransferDto {
  reason: string;
}

export interface CreateBankAuthorizationDto {
  bankId: number;
  employeeId: number;
  canView?: boolean;
  canDeposit?: boolean;
  canWithdraw?: boolean;
  canTransfer?: boolean;
  maxAmount?: number;
  isActive?: boolean;
}

export interface UpdateBankAuthorizationDto {
  canView?: boolean;
  canDeposit?: boolean;
  canWithdraw?: boolean;
  canTransfer?: boolean;
  maxAmount?: number;
  isActive?: boolean;
}

export interface CreateBankReconciliationDto {
  bankId: number;
  reconciliationDate: string;
  statementDate: string;
  statementBalance: number;
  bookBalance: number;
  notes?: string;
}

export interface UpdateBankReconciliationDto {
  reconciliationDate?: string;
  statementDate?: string;
  statementBalance?: number;
  bookBalance?: number;
  notes?: string;
}

export interface CreateCurrencyDto {
  name: string;
  code: string;
  symbol?: string;
  decimalPlaces?: number;
  isActive?: boolean;
}

export interface UpdateCurrencyDto {
  name?: string;
  symbol?: string;
  decimalPlaces?: number;
  isActive?: boolean;
}

export interface CreateExchangeRateDto {
  fromCurrencyId: number;
  toCurrencyId: number;
  rate: number;
  validFrom: string;
  validTo?: string;
  source?: string;
  isActive?: boolean;
}

export interface UpdateExchangeRateDto {
  rate?: number;
  validFrom?: string;
  validTo?: string;
  source?: string;
  isActive?: boolean;
}

export interface CreateVatDto {
  name: string;
  code: string;
  rate: number;
  accountId?: number;
  inputAccountId?: number;
  isActive?: boolean;
}

export interface UpdateVatDto {
  name?: string;
  rate?: number;
  accountId?: number;
  inputAccountId?: number;
  isActive?: boolean;
}

export interface CreatePaymentMethodDto {
  name: string;
  code: string;
  description?: string;
  type: string;
  isActive?: boolean;
  requiresRef?: boolean;
}

export interface UpdatePaymentMethodDto {
  name?: string;
  description?: string;
  type?: string;
  isActive?: boolean;
  requiresRef?: boolean;
}

export interface CreateWhtDto {
  name: string;
  code: string;
  rate: number;
  accountId?: number;
  description?: string;
  isActive?: boolean;
}

export interface UpdateWhtDto {
  name?: string;
  rate?: number;
  accountId?: number;
  description?: string;
  isActive?: boolean;
}

export interface OpeningBalance {
  id: number;
  entityId: number;
  accountId: number;
  year: number;
  period: number;
  balance: number;
  balanceType: 'debit' | 'credit';
  accountCode?: string;
  accountName?: string;
  accountType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpeningBalanceSummary {
  year: number;
  period: number;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  accountCount: number;
}

export interface OpeningBalanceQuery {
  year?: number;
  period?: number;
  accountType?: string;
  includeZeroBalances?: boolean;
}

export interface OpeningBalanceEntryDto {
  accountId: number;
  balance: number;
  balanceType: 'debit' | 'credit';
}

export interface SetOpeningBalancesDto {
  year: number;
  period: number;
  entries: OpeningBalanceEntryDto[];
}

export interface UpdateOpeningBalanceDto {
  balance?: number;
  balanceType?: 'debit' | 'credit';
}

export interface ExpenseRequestAttachment {
  id: number;
  expenseRequestId: number;
  filename: string;
  originalName: string;
  path: string;
  url: string;
  mimeType?: string;
  size?: number;
  uploadedBy?: number;
  createdAt: string;
}

export interface ExpenseRequest {
  id: number;
  companyId: number;
  requestNumber: string;
  requesterId?: number;
  requesterName?: string;
  requestDate: string;
  description: string;
  totalAmount: number;
  status: string;
  approvedAmount: number | null;
  approvedAt: string | null;
  approvedBy: number | null;
  approverName?: string;
  paidAt: string | null;
  paidBy: number | null;
  payerName?: string;
  notes: string | null;
  branchId: number | null;
  departmentId: number | null;
  beneficiaryName: string | null;
  beneficiaryAccountNumber: string | null;
  beneficiaryBankName: string | null;
  beneficiaryBankId: number | null;
  memoFrom: string | null;
  memoTo: string | null;
  subject: string | null;
  background: string | null;
  justification: string | null;
  prayer: string | null;
  whtAmount: number;
  netAmount: number;
  currency: string;
  expenseAccountId: number | null;
  expenseAccountName?: string;
  expenseAccountCode?: string;
  bankAccountId: number | null;
  bankName?: string;
  bankAccountNumber?: string;
  whtApplicable: boolean;
  whtRate: number | null;
  budgetNotes: string | null;
  budgetExceeded: boolean;
  paymentVoucherNumber: string | null;
  transferMemoNumber: string | null;
  paymentDate: string | null;
  paymentReference: string | null;
  journalEntryId: number | null;
  rejectionReason: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  pendingStepName?: string | null;
  pendingRoleName?: string | null;
  // True when any approver has already acted on the approval flow. The
  // requester's edit window closes once this becomes true.
  approvalsStarted?: boolean;
  tripId?: number | null;
  vehicleId?: number | null;
  fleetCostType?: string | null;
  lines?: ExpenseRequestLine[];
  attachments?: ExpenseRequestAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRequestLine {
  id: number;
  expenseRequestId: number;
  description: string;
  accountId: number | null;
  accountCode?: string;
  accountName?: string;
  expenseAccountId: number | null;
  amount: number;
  quantity: number;
  unitPrice: number;
  whtId: number | null;
  whtApplicable: boolean;
  whtRate: number | null;
  whtAmount: number;
  netAmount: number;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

// kept for legacy reference - no longer used in flow
export interface ExpenseRequestApproval {
  id: number;
  expenseRequestId: number;
  approvalType: string;
  approvalOrder: number;
  approverId: number | null;
  approverName: string | null;
  approverTitle: string | null;
  status: string;
  comments: string | null;
  approvedAt: string | null;
  signaturePath: string | null;
  hasStamp: boolean;
  stampType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRequestQuery {
  status?: string;
  requesterId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
}

export interface ExpenseRequestLineDto {
  description: string;
  accountId?: number;
  expenseAccountId?: number;
  quantity: number;
  unitPrice: number;
  whtId?: number;
  whtApplicable?: boolean;
  whtRate?: number;
  remarks?: string;
}

export interface CreateExpenseRequestDto {
  requesterId?: number;
  requesterName?: string;
  requestDate: string;
  description: string;
  notes?: string;
  branchId?: number;
  departmentId?: number;
  beneficiaryName?: string;
  beneficiaryAccountNumber?: string;
  beneficiaryBankName?: string;
  beneficiaryBankId?: number;
  memoFrom?: string;
  memoTo?: string;
  subject?: string;
  background?: string;
  justification?: string;
  prayer?: string;
  currency?: string;
  expenseAccountId?: number;
  bankAccountId?: number;
  whtApplicable?: boolean;
  whtRate?: number;
  lines: ExpenseRequestLineDto[];
  tripId?: number;
  vehicleId?: number;
  fleetCostType?: string;
  attachments?: { filename: string; originalName: string; path: string; url: string; mimeType?: string; size?: number }[];
}

export interface UpdateExpenseRequestDto {
  requestDate?: string;
  description?: string;
  notes?: string;
  departmentId?: number;
  expenseAccountId?: number;
  bankAccountId?: number;
  beneficiaryName?: string;
  beneficiaryAccountNumber?: string;
  beneficiaryBankName?: string;
  memoFrom?: string;
  memoTo?: string;
  subject?: string;
  background?: string;
  justification?: string;
  prayer?: string;
  branchId?: number;
  lines?: ExpenseRequestLineDto[];
  tripId?: number;
  vehicleId?: number;
  fleetCostType?: string;
}

export interface ApproveExpenseRequestDto {
  approvedAmount?: number;
  comments?: string;
  expenseAccountId?: number;
  lines?: Array<{ lineId: number; accountId: number }>;
}

export interface RejectExpenseRequestDto {
  reason: string;
}

export interface PayExpenseRequestDto {
  bankAccountId?: number;
  notes?: string;
  paymentReference?: string;
}

export interface CompanySettings {
  id: number;
  companyId: number;
  defaultCashAccountId: number | null;
  defaultBankAccountId: number | null;
  defaultSalesRevenueAccountId: number | null;
  defaultAccountsReceivableAccountId: number | null;
  defaultVatOutputAccountId: number | null;
  defaultCustomerDepositsAccountId: number | null;
  defaultDiscountAllowedAccountId: number | null;
  useExpenseApproval: boolean;
  requireJournalApproval: boolean;
}

export interface UpdateCompanySettingsDto {
  defaultCashAccountId?: number | null;
  defaultBankAccountId?: number | null;
  defaultSalesRevenueAccountId?: number | null;
  defaultAccountsReceivableAccountId?: number | null;
  defaultVatOutputAccountId?: number | null;
  defaultCustomerDepositsAccountId?: number | null;
  defaultDiscountAllowedAccountId?: number | null;
  useExpenseApproval?: boolean;
  requireJournalApproval?: boolean;
}

export interface ExpenseRequestStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  paid: number;
  rejected: number;
  totalAmount: number;
  approvedAmount: number;
}

// Paginated response type
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================================
// ACCOUNTS API
// ============================================================================

export const accountsApi = {
  // Chart of Accounts
  list: async (query?: AccountQuery): Promise<PaginatedResponse<Account>> => {
    const response = await api.get('/accounts/chart', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Account> => {
    const response = await api.get(`/accounts/chart/${id}`);
    return response.data;
  },

  create: async (data: CreateAccountDto): Promise<Account> => {
    const response = await api.post('/accounts/chart', data);
    return response.data;
  },

  update: async (id: number, data: UpdateAccountDto): Promise<Account> => {
    const response = await api.put(`/accounts/chart/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounts/chart/${id}`);
  },

  getTree: async (accountType?: string): Promise<Account[]> => {
    const response = await api.get('/accounts/chart/tree', { params: { accountType } });
    return response.data;
  },

  getBalance: async (id: number): Promise<{ balance: number; debitTotal: number; creditTotal: number }> => {
    const response = await api.get(`/accounts/chart/${id}/balance`);
    return response.data;
  },

  // Audit Trail
  getAuditTrail: async (params?: AuditTrailQuery): Promise<AuditTrailList> => {
    const response = await api.get('/accounts/audit-trail', { params });
    return response.data;
  },

  exportAuditTrail: async (params?: AuditTrailQuery): Promise<void> => {
    const response = await api.get('/accounts/audit-trail/export', { params, responseType: 'blob' });
    const blob = new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-trail.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  // Report methods
  getGroupedTrialBalance: async (params?: GroupedTrialBalanceQuery): Promise<Record<string, unknown>> => {
    const response = await api.get('/accounts/reports/trial-balance-grouped', { params });
    return response.data;
  },

  exportGroupedTrialBalance: async (params?: GroupedTrialBalanceQuery): Promise<void> => {
    const response = await api.get('/accounts/reports/trial-balance-grouped/export', { params, responseType: 'blob' });
    const blob = new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trial-balance-grouped.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  getCompanies: async (): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/core/companies');
    return response.data?.data || response.data || [];
  },

  getConsolidationReport: async (params?: ConsolidationQuery): Promise<ConsolidationReport> => {
    const response = await api.get('/accounts/reports/consolidation', { params });
    return response.data;
  },

  exportConsolidationReport: async (params?: ConsolidationQuery): Promise<void> => {
    const response = await api.get('/accounts/reports/consolidation/export', { params, responseType: 'blob' });
    const blob = new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'consolidation-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  // Import
  importAccounts: async (accounts: ImportAccountItem[], importMode?: 'skip' | 'update' | 'overwrite'): Promise<ImportAccountsResult> => {
    const response = await api.post('/accounts/chart/import', { accounts, importMode });
    return response.data;
  },

  getImportTemplate: async (): Promise<{ headers: string[]; sampleRows: string[][] }> => {
    const response = await api.get('/accounts/chart/import/template');
    return response.data;
  },
};

export const categoriesApi = {
  list: async (categoryType?: string): Promise<Category[]> => {
    const response = await api.get('/accounts/categories', { params: { categoryType } });
    return response.data;
  },

  get: async (id: number): Promise<Category> => {
    const response = await api.get(`/accounts/categories/${id}`);
    return response.data;
  },

  create: async (data: CreateCategoryDto): Promise<Category> => {
    const response = await api.post('/accounts/categories', data);
    return response.data;
  },

  update: async (id: number, data: UpdateCategoryDto): Promise<Category> => {
    const response = await api.put(`/accounts/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounts/categories/${id}`);
  },
};

// ============================================================================
// JOURNAL ENTRIES API
// ============================================================================

export const journalEntriesApi = {
  list: async (query?: JournalEntryQuery): Promise<PaginatedResponse<JournalEntry>> => {
    const response = await api.get('/accounts/journal-entries', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<JournalEntry> => {
    const response = await api.get(`/accounts/journal-entries/${id}`);
    return response.data;
  },

  create: async (data: CreateJournalEntryDto): Promise<JournalEntry> => {
    const response = await api.post('/accounts/journal-entries', data);
    return response.data;
  },

  update: async (id: number, data: UpdateJournalEntryDto): Promise<JournalEntry> => {
    const response = await api.put(`/accounts/journal-entries/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounts/journal-entries/${id}`);
  },

  post: async (id: number, notes?: string): Promise<JournalEntry> => {
    const response = await api.post(`/accounts/journal-entries/${id}/post`, { notes });
    return response.data;
  },

  reverse: async (id: number, reversalDate: string, reason?: string): Promise<JournalEntry> => {
    const response = await api.post(`/accounts/journal-entries/${id}/reverse`, { reversalDate, reason });
    return response.data;
  },
};

// ============================================================================
// FISCAL YEARS API
// ============================================================================

export const fiscalYearsApi = {
  list: async (query?: FiscalYearQuery): Promise<PaginatedResponse<FiscalYear>> => {
    const response = await api.get('/accounts/fiscal-years', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<FiscalYear> => {
    const response = await api.get(`/accounts/fiscal-years/${id}`);
    return response.data;
  },

  create: async (data: CreateFiscalYearDto): Promise<FiscalYear> => {
    const response = await api.post('/accounts/fiscal-years', data);
    return response.data;
  },

  update: async (id: number, data: UpdateFiscalYearDto): Promise<FiscalYear> => {
    const response = await api.put(`/accounts/fiscal-years/${id}`, data);
    return response.data;
  },

  getCurrent: async (): Promise<FiscalYear | null> => {
    const response = await api.get('/accounts/fiscal-years/current');
    return response.data;
  },

  setCurrent: async (id: number): Promise<FiscalYear> => {
    const response = await api.post(`/accounts/fiscal-years/${id}/set-current`);
    return response.data;
  },

  close: async (id: number, createOpeningBalances?: boolean, notes?: string): Promise<FiscalYear> => {
    const response = await api.post(`/accounts/fiscal-years/${id}/close`, { createOpeningBalances, notes });
    return response.data;
  },

  getChecklist: async (id: number): Promise<YearEndChecklist> => {
    const response = await api.get(`/accounts/fiscal-years/${id}/checklist`);
    return response.data;
  },

};

// ============================================================================
// BANKS API
// ============================================================================

export const banksApi = {
  list: async (query?: BankQuery): Promise<PaginatedResponse<Bank>> => {
    const response = await api.get('/accounts/banks', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Bank> => {
    const response = await api.get(`/accounts/banks/${id}`);
    return response.data;
  },

  create: async (data: CreateBankDto): Promise<Bank> => {
    const response = await api.post('/accounts/banks', data);
    return response.data;
  },

  update: async (id: number, data: UpdateBankDto): Promise<Bank> => {
    const response = await api.put(`/accounts/banks/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounts/banks/${id}`);
  },

  getBalance: async (id: number): Promise<{ balance: number; totalDeposits: number; totalWithdrawals: number }> => {
    const response = await api.get(`/accounts/banks/${id}/balance`);
    return response.data;
  },

  createTransfer: async (data: BankTransferDto): Promise<BankTransfer> => {
    const response = await api.post('/accounts/banks/transfers', data);
    return response.data;
  },

  getTransfers: async (bankId?: number): Promise<BankTransfer[]> => {
    const response = await api.get('/accounts/banks/transfers', { params: { bankId } });
    return response.data;
  },

  createReconciliation: async (data: CreateBankReconciliationDto): Promise<BankReconciliation> => {
    const response = await api.post('/accounts/bank-reconciliation', data);
    return response.data;
  },

  updateReconciliation: async (id: number, data: UpdateBankReconciliationDto): Promise<BankReconciliation> => {
    const response = await api.put(`/accounts/bank-reconciliation/${id}`, data);
    return response.data;
  },

  getReconciliation: async (id: number): Promise<BankReconciliation> => {
    const response = await api.get(`/accounts/bank-reconciliation/${id}`);
    return response.data;
  },

  getReconciliations: async (params?: { bankId?: number; status?: string; page?: number; limit?: number }): Promise<{ data: BankReconciliation[]; total: number; page: number; limit: number }> => {
    const response = await api.get('/accounts/bank-reconciliation', { params });
    return response.data;
  },

  deleteReconciliation: async (id: number): Promise<void> => {
    await api.delete(`/accounts/bank-reconciliation/${id}`);
  },

  completeReconciliation: async (id: number): Promise<BankReconciliation> => {
    const response = await api.post(`/accounts/bank-reconciliation/${id}/complete`);
    return response.data;
  },

  // Bank Authorizations
  getAuthorizations: async (bankId: number): Promise<BankAuthorization[]> => {
    const response = await api.get(`/accounts/banks/${bankId}/authorizations`);
    return response.data;
  },

  getAuthorizationsByEmployee: async (employeeId: number): Promise<BankAuthorization[]> => {
    const response = await api.get(`/accounts/banks/authorizations/employee/${employeeId}`);
    return response.data;
  },

  getAuthorizedBanks: async (): Promise<Bank[]> => {
    const response = await api.get('/accounts/banks/authorized');
    return response.data;
  },

  createAuthorization: async (bankId: number, data: CreateBankAuthorizationDto): Promise<BankAuthorization> => {
    const response = await api.post(`/accounts/banks/${bankId}/authorizations`, { ...data, bankId });
    return response.data;
  },

  updateAuthorization: async (id: number, data: UpdateBankAuthorizationDto): Promise<BankAuthorization> => {
    const response = await api.put(`/accounts/banks/authorizations/${id}`, data);
    return response.data;
  },

  deleteAuthorization: async (id: number): Promise<void> => {
    await api.delete(`/accounts/banks/authorizations/${id}`);
  },

  // Enhanced Transfers (Multi-Item Workflow)
  createTransferEnhanced: async (data: CreateBankTransferDto): Promise<BankTransfer> => {
    const response = await api.post('/accounts/banks/transfers/enhanced', data);
    return response.data;
  },

  updateTransfer: async (id: number, data: UpdateBankTransferDto): Promise<BankTransfer> => {
    const response = await api.put(`/accounts/banks/transfers/${id}`, data);
    return response.data;
  },

  deleteTransfer: async (id: number): Promise<void> => {
    await api.delete(`/accounts/banks/transfers/${id}`);
  },

  getTransfer: async (id: number): Promise<BankTransfer> => {
    const response = await api.get(`/accounts/banks/transfers/${id}`);
    return response.data;
  },

  listTransfers: async (query?: BankTransferQuery): Promise<PaginatedResponse<BankTransfer>> => {
    const response = await api.get('/accounts/banks/transfers/list', { params: query });
    return response.data;
  },

  submitTransfer: async (id: number): Promise<BankTransfer> => {
    const response = await api.post(`/accounts/banks/transfers/${id}/submit`);
    return response.data;
  },

  approveTransfer: async (id: number, data?: ApproveBankTransferDto): Promise<BankTransfer> => {
    const response = await api.post(`/accounts/banks/transfers/${id}/approve`, data || {});
    return response.data;
  },

  rejectTransfer: async (id: number, data: RejectBankTransferDto): Promise<BankTransfer> => {
    const response = await api.post(`/accounts/banks/transfers/${id}/reject`, data);
    return response.data;
  },

  postTransfer: async (id: number): Promise<BankTransfer> => {
    const response = await api.post(`/accounts/banks/transfers/${id}/post`);
    return response.data;
  },

  cancelTransfer: async (id: number): Promise<BankTransfer> => {
    const response = await api.post(`/accounts/banks/transfers/${id}/cancel`);
    return response.data;
  },

  getCashAccounts: async (): Promise<Array<{ id: number; code: string; name: string }>> => {
    const response = await api.get('/accounts/banks/cash-accounts');
    return response.data;
  },
};

// ============================================================================
// REPORTS API
// ============================================================================

export const reportsApi = {
  getTrialBalance: async (asOfDate?: string, includeZeroBalances?: boolean): Promise<TrialBalanceReport> => {
    const response = await api.get('/accounts/reports/trial-balance', {
      params: { asOfDate, includeZeroBalances },
    });
    return response.data;
  },

  getBalanceSheet: async (asOfDate?: string): Promise<BalanceSheetReport> => {
    const response = await api.get('/accounts/reports/balance-sheet', { params: { asOfDate } });
    return response.data;
  },

  getIncomeStatement: async (startDate?: string, endDate?: string): Promise<IncomeStatementReport> => {
    const response = await api.get('/accounts/reports/income-statement', { params: { startDate, endDate } });
    return response.data;
  },

  getGeneralLedger: async (accountId: number, startDate?: string, endDate?: string): Promise<GeneralLedgerReport> => {
    const response = await api.get('/accounts/reports/general-ledger', {
      params: { accountId, startDate, endDate },
    });
    return response.data;
  },

  getSummary: async (): Promise<AccountingSummary> => {
    const response = await api.get('/accounts/reports/summary');
    return response.data;
  },
};

// ============================================================================
// CURRENCIES API
// ============================================================================

export const currenciesApi = {
  list: async (query?: CurrencyQuery): Promise<PaginatedResponse<Currency>> => {
    const response = await api.get('/accounts/currencies', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Currency> => {
    const response = await api.get(`/accounts/currencies/${id}`);
    return response.data;
  },

  getByCode: async (code: string): Promise<Currency | null> => {
    const response = await api.get(`/accounts/currencies/code/${code}`);
    return response.data;
  },

  create: async (data: CreateCurrencyDto): Promise<Currency> => {
    const response = await api.post('/accounts/currencies', data);
    return response.data;
  },

  update: async (id: number, data: UpdateCurrencyDto): Promise<Currency> => {
    const response = await api.put(`/accounts/currencies/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounts/currencies/${id}`);
  },

  getActive: async (): Promise<Currency[]> => {
    const response = await api.get('/accounts/currencies', {
      params: { isActive: true, limit: 1000 },
    });
    return response.data.data || response.data;
  },
};

// ============================================================================
// EXCHANGE RATES API
// ============================================================================

export const exchangeRatesApi = {
  list: async (query?: ExchangeRateQuery): Promise<PaginatedResponse<ExchangeRate>> => {
    const response = await api.get('/accounts/currencies/exchange-rates', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<ExchangeRate> => {
    const response = await api.get(`/accounts/currencies/exchange-rates/${id}`);
    return response.data;
  },

  getCurrent: async (
    fromCurrencyId: number,
    toCurrencyId: number,
    asOfDate?: string,
  ): Promise<ExchangeRate | null> => {
    const response = await api.get('/accounts/currencies/exchange-rates/current', {
      params: { fromCurrencyId, toCurrencyId, asOfDate },
    });
    return response.data;
  },

  create: async (data: CreateExchangeRateDto): Promise<ExchangeRate> => {
    const response = await api.post('/accounts/currencies/exchange-rates', data);
    return response.data;
  },

  update: async (id: number, data: UpdateExchangeRateDto): Promise<ExchangeRate> => {
    const response = await api.put(`/accounts/currencies/exchange-rates/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounts/currencies/exchange-rates/${id}`);
  },
};

// ============================================================================
// VAT API
// ============================================================================

export const vatApi = {
  list: async (query?: VatQuery): Promise<PaginatedResponse<Vat>> => {
    const response = await api.get('/accounts/vat', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Vat> => {
    const response = await api.get(`/accounts/vat/${id}`);
    return response.data;
  },

  getByCode: async (code: string): Promise<Vat | null> => {
    const response = await api.get(`/accounts/vat/code/${code}`);
    return response.data;
  },

  getActive: async (): Promise<Vat[]> => {
    const response = await api.get('/accounts/vat/active/list');
    return response.data;
  },

  create: async (data: CreateVatDto): Promise<Vat> => {
    const response = await api.post('/accounts/vat', data);
    return response.data;
  },

  update: async (id: number, data: UpdateVatDto): Promise<Vat> => {
    const response = await api.put(`/accounts/vat/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounts/vat/${id}`);
  },
};

// ============================================================================
// PAYMENT METHODS API
// ============================================================================

export const paymentMethodsApi = {
  list: async (query?: PaymentMethodQuery): Promise<PaginatedResponse<PaymentMethod>> => {
    const response = await api.get('/accounts/payment-methods', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<PaymentMethod> => {
    const response = await api.get(`/accounts/payment-methods/${id}`);
    return response.data;
  },

  getByCode: async (code: string): Promise<PaymentMethod | null> => {
    const response = await api.get(`/accounts/payment-methods/code/${code}`);
    return response.data;
  },

  getActive: async (): Promise<PaymentMethod[]> => {
    const response = await api.get('/accounts/payment-methods/active/list');
    return response.data;
  },

  getByType: async (type: string): Promise<PaymentMethod[]> => {
    const response = await api.get(`/accounts/payment-methods/type/${type}`);
    return response.data;
  },

  create: async (data: CreatePaymentMethodDto): Promise<PaymentMethod> => {
    const response = await api.post('/accounts/payment-methods', data);
    return response.data;
  },

  update: async (id: number, data: UpdatePaymentMethodDto): Promise<PaymentMethod> => {
    const response = await api.put(`/accounts/payment-methods/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounts/payment-methods/${id}`);
  },
};

// ============================================================================
// WHT (WITHHOLDING TAX) API
// ============================================================================

export const whtApi = {
  list: async (query?: WhtQuery): Promise<PaginatedResponse<Wht>> => {
    const response = await api.get('/accounts/wht', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Wht> => {
    const response = await api.get(`/accounts/wht/${id}`);
    return response.data;
  },

  getByCode: async (code: string): Promise<Wht | null> => {
    const response = await api.get(`/accounts/wht/code/${code}`);
    return response.data;
  },

  getActive: async (): Promise<Wht[]> => {
    const response = await api.get('/accounts/wht/active/list');
    return response.data;
  },

  create: async (data: CreateWhtDto): Promise<Wht> => {
    const response = await api.post('/accounts/wht', data);
    return response.data;
  },

  update: async (id: number, data: UpdateWhtDto): Promise<Wht> => {
    const response = await api.put(`/accounts/wht/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounts/wht/${id}`);
  },

  calculate: async (
    whtId: number,
    amount: number,
  ): Promise<{ whtAmount: number; netAmount: number; rate: number }> => {
    const response = await api.post('/accounts/wht/calculate', { whtId, amount });
    return response.data;
  },
};

// ============================================================================
// OPENING BALANCES API
// ============================================================================

export const openingBalancesApi = {
  list: async (
    query?: OpeningBalanceQuery,
  ): Promise<{ data: OpeningBalance[]; summary: OpeningBalanceSummary }> => {
    const response = await api.get('/accounts/opening-balances', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<OpeningBalance> => {
    const response = await api.get(`/accounts/opening-balances/${id}`);
    return response.data;
  },

  set: async (data: SetOpeningBalancesDto): Promise<{ success: boolean; count: number }> => {
    const response = await api.post('/accounts/opening-balances', data);
    return response.data;
  },

  update: async (id: number, data: UpdateOpeningBalanceDto): Promise<OpeningBalance> => {
    const response = await api.put(`/accounts/opening-balances/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounts/opening-balances/${id}`);
  },

  getYears: async (): Promise<{ year: number; period: number }[]> => {
    const response = await api.get('/accounts/opening-balances/years');
    return response.data;
  },

  getAccounts: async (): Promise<
    { id: number; code: string; name: string; accountType: string }[]
  > => {
    const response = await api.get('/accounts/opening-balances/accounts');
    return response.data;
  },

  clearYear: async (year: number, period?: number): Promise<{ deleted: number }> => {
    const response = await api.delete(`/accounts/opening-balances/year/${year}`, {
      params: { period },
    });
    return response.data;
  },

  getImportTemplate: async (): Promise<{
    headers: string[];
    instructions: string[];
    sampleRows: Record<string, unknown>[];
    accounts: { code: string; name: string; accountType: string; normalBalance: string }[];
  }> => {
    const response = await api.get('/accounts/opening-balances/import/template');
    return response.data;
  },

  importBalances: async (data: {
    year: number;
    period: number;
    rows: { accountCode: string; debit: number; credit: number }[];
  }): Promise<{
    imported: number;
    skipped: number;
    total: number;
    totalDebit: number;
    totalCredit: number;
    difference: number;
    errors: string[];
  }> => {
    const response = await api.post('/accounts/opening-balances/import', data);
    return response.data;
  },
};

// ============================================================================
// EXPENSE REQUESTS API
// ============================================================================

export const expenseRequestsApi = {
  list: async (query?: ExpenseRequestQuery): Promise<PaginatedResponse<ExpenseRequest>> => {
    const response = await api.get('/accounts/expense-requests', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<ExpenseRequest> => {
    const response = await api.get(`/accounts/expense-requests/${id}`);
    return response.data;
  },

  getStats: async (): Promise<ExpenseRequestStats> => {
    const response = await api.get('/accounts/expense-requests/stats');
    return response.data;
  },

  create: async (data: CreateExpenseRequestDto): Promise<ExpenseRequest> => {
    const response = await api.post('/accounts/expense-requests', data);
    return response.data;
  },

  update: async (id: number, data: UpdateExpenseRequestDto): Promise<ExpenseRequest> => {
    const response = await api.put(`/accounts/expense-requests/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounts/expense-requests/${id}`);
  },

  submit: async (id: number): Promise<ExpenseRequest> => {
    const response = await api.post(`/accounts/expense-requests/${id}/submit`);
    return response.data;
  },

  approve: async (id: number, data: ApproveExpenseRequestDto): Promise<ExpenseRequest> => {
    const response = await api.post(`/accounts/expense-requests/${id}/approve`, data);
    return response.data;
  },

  reject: async (id: number, data: RejectExpenseRequestDto): Promise<ExpenseRequest> => {
    const response = await api.post(`/accounts/expense-requests/${id}/reject`, data);
    return response.data;
  },

  markAsPaid: async (id: number, data?: PayExpenseRequestDto): Promise<ExpenseRequest> => {
    const response = await api.post(`/accounts/expense-requests/${id}/pay`, data || {});
    return response.data;
  },

  cancel: async (id: number): Promise<ExpenseRequest> => {
    const response = await api.post(`/accounts/expense-requests/${id}/cancel`);
    return response.data;
  },
  saveLineCoding: async (id: number, lines: Array<{ lineId: number; accountId?: number; whtId?: number | null; whtApplicable?: boolean }>): Promise<ExpenseRequest> => {
    const response = await api.post(`/accounts/expense-requests/${id}/save-coding`, { lines });
    return response.data;
  },
  resetApproval: async (id: number): Promise<void> => {
    await api.post(`/accounts/expense-requests/${id}/reset-approval`);
  },
  resubmit: async (id: number): Promise<void> => {
    await api.post(`/accounts/expense-requests/${id}/resubmit`);
  },
  processPayment: async (id: number, data: { bankAccountId: number; paymentReference?: string; notes?: string }): Promise<ExpenseRequest> => {
    const response = await api.post(`/accounts/expense-requests/${id}/process-payment`, data);
    return response.data;
  },
  getPaymentVoucher: async (id: number): Promise<Blob> => {
    const response = await api.get(`/accounts/expense-requests/${id}/payment-voucher`, { responseType: 'blob' });
    return response.data;
  },
  generateTransferRequest: async (id: number, sourceBankAccountId: number): Promise<Blob> => {
    const response = await api.post(`/accounts/expense-requests/${id}/transfer-request`, { sourceBankAccountId }, { responseType: 'blob' });
    return response.data;
  },
  generateBatchTransferRequest: async (requestIds: number[], sourceBankAccountId: number): Promise<Blob> => {
    const response = await api.post('/accounts/expense-requests/transfer-request/batch', { requestIds, sourceBankAccountId }, { responseType: 'blob' });
    return response.data;
  },
  getMemo: async (id: number): Promise<Blob> => {
    const response = await api.get(`/accounts/expense-requests/${id}/expense-memo`, { responseType: 'blob' });
    return response.data;
  },

  addAttachment: async (id: number, dto: { filename: string; originalName: string; path: string; url: string; mimeType?: string; size?: number }): Promise<{ id: number }> => {
    const response = await api.post(`/accounts/expense-requests/${id}/attachments`, dto);
    return response.data;
  },

  removeAttachment: async (id: number, attachmentId: number): Promise<void> => {
    await api.delete(`/accounts/expense-requests/${id}/attachments/${attachmentId}`);
  },

  uploadDocument: async (file: File): Promise<{ url: string; path: string; filename: string; originalName: string; mimeType: string; size: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('destination', 'documents');
    const response = await api.post('/common/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },

  // Batch import — rows are CSV rows parsed on the client. Each row is one
  // expense-request *line*; rows sharing an externalRef become one request.
  batchDryRun: async (rows: BatchImportRow[], batchLabel?: string): Promise<BatchDryRunResponse> => {
    const res = await api.post('/accounts/expense-requests/batch/dry-run', { rows, batchLabel });
    return res.data;
  },
  batchCommit: async (rows: BatchImportRow[], batchLabel?: string): Promise<BatchCommitResponse> => {
    const res = await api.post('/accounts/expense-requests/batch/commit', { rows, batchLabel });
    return res.data;
  },

  // Historical load — Super Admin only on the backend. Adds paymentDate +
  // bankAccountCode + paymentReference to each row. Posts the GL entry on
  // the row's own paymentDate so prior-period reports tie out.
  historicalDryRun: async (rows: HistoricalLoadRow[], batchLabel?: string): Promise<BatchDryRunResponse> => {
    const res = await api.post('/accounts/expense-requests/historical/dry-run', { rows, batchLabel });
    return res.data;
  },
  historicalCommit: async (rows: HistoricalLoadRow[], batchLabel?: string): Promise<BatchCommitResponse> => {
    const res = await api.post('/accounts/expense-requests/historical/commit', { rows, batchLabel });
    return res.data;
  },
};

// ============================================================================
// BATCH IMPORT TYPES
// ============================================================================

export interface BatchImportRow {
  externalRef: string;
  requestDate: string;
  requesterEmail: string;
  description: string;
  memoFrom?: string;
  memoTo?: string;
  subject?: string;
  background?: string;
  justification?: string;
  prayer?: string;
  beneficiaryName?: string;
  beneficiaryAccountNumber?: string;
  beneficiaryBankName?: string;
  expenseAccountCode: string;
  lineDescription: string;
  quantity: number;
  unitPrice: number;
  whtCode?: string;
}

export interface HistoricalLoadRow extends BatchImportRow {
  paymentDate: string;
  bankAccountCode: string;
  paymentReference?: string;
}

export interface BatchValidationResult {
  externalRef: string;
  rowCount: number;
  requesterName?: string;
  totalAmount: number;
  errors: string[];
  warnings: string[];
}

export interface BatchDryRunResponse {
  batchRef: string;
  results: BatchValidationResult[];
  validCount: number;
  invalidCount: number;
}

export interface BatchCommitResponse {
  batchRef: string;
  createdRequestIds: number[];
  failedRefs: Array<{ externalRef: string; error: string }>;
}

// ============================================================================
// COMPANY SETTINGS API
// ============================================================================

export const companySettingsApi = {
  get: async (): Promise<CompanySettings> => {
    const response = await api.get('/accounts/settings');
    return response.data;
  },

  update: async (data: UpdateCompanySettingsDto): Promise<CompanySettings> => {
    const response = await api.patch('/accounts/settings', data);
    return response.data;
  },
};

// ============================================================================
// REPORTING PERIODS API
// ============================================================================

export interface ReportingPeriod {
  id: number;
  entityId: number;
  calendarYear: number;
  number: number;
  label: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'ADJUSTING' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportingPeriodDto {
  calendarYear: number;
  number: number;
  label: string;
  startDate: string;
  endDate: string;
  status?: string;
}

export interface UpdateReportingPeriodDto {
  status?: string;
}

export interface ReportingPeriodQuery {
  status?: string;
  calendarYear?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export const reportingPeriodsApi = {
  list: async (query?: ReportingPeriodQuery): Promise<PaginatedResponse<ReportingPeriod>> => {
    const response = await api.get('/accounts/reporting-periods', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<ReportingPeriod> => {
    const response = await api.get(`/accounts/reporting-periods/${id}`);
    return response.data;
  },

  create: async (data: CreateReportingPeriodDto): Promise<ReportingPeriod> => {
    const response = await api.post('/accounts/reporting-periods', data);
    return response.data;
  },

  update: async (id: number, data: UpdateReportingPeriodDto): Promise<ReportingPeriod> => {
    const response = await api.put(`/accounts/reporting-periods/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounts/reporting-periods/${id}`);
  },

  close: async (id: number): Promise<ReportingPeriod> => {
    const response = await api.post(`/accounts/reporting-periods/${id}/close`);
    return response.data;
  },

  reopen: async (id: number): Promise<ReportingPeriod> => {
    const response = await api.post(`/accounts/reporting-periods/${id}/reopen`);
    return response.data;
  },
};

// ============================================================================
// CONSOLIDATION API
// ============================================================================

export interface ConsolidationQuery {
  companyIds: number[];
  asOfDate?: string;
  startDate?: string;
  endDate?: string;
  fiscalYearId?: number;
  method?: 'full' | 'proportional' | 'equity';
  applyEliminations?: boolean;
  includeAdjustmentDetails?: boolean;
}

export interface ConsolidatedAccountLine {
  accountCode: string;
  accountName: string;
  category: string;
  companyBalances: Record<string, number>;
  totalBeforeEliminations: number;
  eliminationAdjustments: number;
  consolidatedBalance: number;
}

export interface EliminationEntry {
  id: number;
  type: string;
  description: string;
  debitAccountCode: string;
  debitAccountName: string;
  debitAmount: number;
  creditAccountCode: string;
  creditAccountName: string;
  creditAmount: number;
  sourceCompanyId: number;
  sourceCompanyName: string;
  targetCompanyId: number;
  targetCompanyName: string;
}

export interface ConsolidationReport {
  title: string;
  subtitle: string;
  asOfDate: string;
  companyIds: number[];
  companyNames: Record<string, string>;
  method: string;
  lines: ConsolidatedAccountLine[];
  totalBeforeEliminations: number;
  totalEliminationAdjustments: number;
  consolidatedTotal: number;
  eliminationEntries?: EliminationEntry[];
  generatedAt: string;
}

export interface ConsolidatedBalanceSheet extends ConsolidationReport {
  assets: ConsolidatedAccountLine[];
  liabilities: ConsolidatedAccountLine[];
  equity: ConsolidatedAccountLine[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface ConsolidatedIncomeStatement extends ConsolidationReport {
  revenue: ConsolidatedAccountLine[];
  costOfSales: ConsolidatedAccountLine[];
  operatingExpenses: ConsolidatedAccountLine[];
  otherIncomeExpenses: ConsolidatedAccountLine[];
  grossProfit: number;
  operatingProfit: number;
  netProfit: number;
}

export const consolidationApi = {
  getBalanceSheet: async (query: ConsolidationQuery): Promise<ConsolidatedBalanceSheet> => {
    const response = await api.get('/accounts/consolidation/balance-sheet', { params: query });
    return response.data;
  },

  getIncomeStatement: async (query: ConsolidationQuery): Promise<ConsolidatedIncomeStatement> => {
    const response = await api.get('/accounts/consolidation/income-statement', { params: query });
    return response.data;
  },
};

// ============================================================================
// AUDIT TRAIL API
// ============================================================================

export interface AuditTrailQuery {
  entityType?: string;
  entityId?: number;
  action?: string;
  userId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FieldChange {
  fieldName: string;
  fieldLabel: string;
  oldValue: unknown;
  newValue: unknown;
  dataType: string;
}

export interface AuditTrailEntry {
  id: number;
  entityType: string;
  entityId: number;
  entityReference: string;
  action: string;
  userId: number;
  userName: string;
  userEmail: string;
  timestamp: string;
  ipAddress: string | null;
  userAgent: string | null;
  description: string;
  changes: FieldChange[];
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AuditTrailList {
  data: AuditTrailEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CompareVersions {
  version1Timestamp: string;
  version2Timestamp: string;
  differences: FieldChange[];
  version1User: string;
  version2User: string;
}

export interface AuditStatistics {
  totalEntries: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  mostActiveUsers: Array<{
    userId: number;
    userName: string;
    changeCount: number;
  }>;
  changesByDate: Record<string, number>;
}

export const auditTrailApi = {
  list: async (query?: AuditTrailQuery): Promise<AuditTrailList> => {
    const response = await api.get('/accounts/audit-trail', { params: query });
    return response.data;
  },

  getEntityAuditTrail: async (entityType: string, entityId: number): Promise<AuditTrailEntry[]> => {
    const response = await api.get(`/accounts/audit-trail/entity/${entityType}/${entityId}`);
    return response.data;
  },

  compareVersions: async (
    entityType: string,
    entityId: number,
    timestamp1: string,
    timestamp2: string,
  ): Promise<CompareVersions> => {
    const response = await api.get(`/accounts/audit-trail/compare/${entityType}/${entityId}`, {
      params: { timestamp1, timestamp2 },
    });
    return response.data;
  },

  getStatistics: async (startDate?: string, endDate?: string): Promise<AuditStatistics> => {
    const response = await api.get('/accounts/audit-trail/statistics', {
      params: { startDate, endDate },
    });
    return response.data;
  },
};

// ============================================================================
// MISC RECEIPTS
// ============================================================================

export interface MiscReceipt {
  id: number;
  companyId: number;
  receiptNumber: string;
  bankId: number;
  bankName: string;
  glAccountId: number;
  glAccountCode: string;
  glAccountName: string;
  amount: number;
  receiptDate: string;
  description: string;
  reference: string | null;
  status: 'draft' | 'posted' | 'cancelled';
  journalEntryId: number | null;
  postedBy: number | null;
  postedAt: string | null;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMiscReceiptDto {
  bankId: number;
  glAccountId: number;
  amount: number;
  receiptDate: string;
  description: string;
  reference?: string;
}

export interface MiscReceiptStats {
  total: number;
  draft: number;
  posted: number;
  totalAmount: number;
  postedAmount: number;
}

export interface MiscReceiptQuery {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const miscReceiptsApi = {
  list: async (query?: MiscReceiptQuery): Promise<PaginatedResponse<MiscReceipt>> => {
    const response = await api.get('/accounts/misc-receipts', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<MiscReceipt> => {
    const response = await api.get(`/accounts/misc-receipts/${id}`);
    return response.data;
  },

  getStats: async (): Promise<MiscReceiptStats> => {
    const response = await api.get('/accounts/misc-receipts/stats');
    return response.data;
  },

  create: async (data: CreateMiscReceiptDto): Promise<MiscReceipt> => {
    const response = await api.post('/accounts/misc-receipts', data);
    return response.data;
  },

  update: async (id: number, data: Partial<CreateMiscReceiptDto>): Promise<MiscReceipt> => {
    const response = await api.put(`/accounts/misc-receipts/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounts/misc-receipts/${id}`);
  },

  post: async (id: number): Promise<MiscReceipt> => {
    const response = await api.post(`/accounts/misc-receipts/${id}/post`);
    return response.data;
  },
};
