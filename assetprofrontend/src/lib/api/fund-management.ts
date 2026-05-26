import { api } from '../api';

// ============================================================================
// TYPES - ENUMS
// ============================================================================

export type FmFundType = 'OPEN_ENDED' | 'CLOSED_END' | 'PRIVATE_EQUITY';
export type FmFundStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'LIQUIDATING' | 'TERMINATED';
export type FmNavFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type FmPerformanceFeeMethod = 'HIGH_WATER_MARK' | 'HURDLE' | 'BOTH' | 'HURDLE_RATE' | 'SIMPLE';
export type FmRegulatoryType = 'SEC' | 'PENCOM' | 'BOTH';
export type FmPencomFundType = 'FUND_I' | 'FUND_II' | 'FUND_III' | 'FUND_IV' | 'FUND_V' | 'FUND_VI';

export type FmAssetClass = 'EQUITY' | 'FIXED_INCOME' | 'MONEY_MARKET' | 'ALTERNATIVE' | 'REAL_ESTATE' | 'SUKUK' | 'CASH';
export type FmSecurityType =
  | 'STOCK' | 'BOND' | 'FGN_BOND' | 'STATE_BOND' | 'CORPORATE_BOND'
  | 'TBILL' | 'COMMERCIAL_PAPER' | 'MUTUAL_FUND' | 'SUKUK' | 'ETF'
  | 'REIT' | 'PRIVATE_EQUITY' | 'MONEY_MARKET_FUND';
export type FmExchange = 'NGX' | 'FMDQ' | 'NASD' | 'OTC' | 'PRIVATE';
export type FmCouponFrequency = 'ANNUAL' | 'SEMI_ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'ZERO_COUPON';
export type FmDayCountConvention = 'ACT_360' | 'ACT_365' | 'ACT_ACT' | 'THIRTY_360';
export type FmShariaStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW' | 'WATCH' | 'NOT_SCREENED';

export type FmPriceSource = 'MANUAL' | 'NGX_FEED' | 'FMDQ_FEED' | 'BLOOMBERG' | 'REUTERS' | 'CBN' | 'CUSTOM';
export type FmFxRateSource = 'CBN_OFFICIAL' | 'CBN_PARALLEL' | 'MARKET' | 'MANUAL';
export type FmFeedFormat = 'SWIFT_MT535' | 'SWIFT_MT536' | 'CSV' | 'CUSTOM';
export type FmAccountType = 'CUSTODY' | 'SETTLEMENT' | 'INCOME' | 'EXPENSE' | 'SUBSCRIPTION';

export type FmInvestorType = 'INDIVIDUAL' | 'CORPORATE' | 'INSTITUTIONAL' | 'HNI';
export type FmIdType = 'BVN' | 'NIN' | 'PASSPORT' | 'DRIVERS_LICENSE' | 'VOTER_CARD' | 'CAC';
export type FmRiskProfile = 'CONSERVATIVE' | 'MODERATE' | 'MODERATE_AGGRESSIVE' | 'AGGRESSIVE';
export type FmInvestmentObjective = 'CAPITAL_PRESERVATION' | 'INCOME' | 'GROWTH' | 'AGGRESSIVE_GROWTH';
export type FmAccreditationStatus = 'RETAIL' | 'QUALIFIED' | 'ACCREDITED';
export type FmKycStatus = 'PENDING' | 'APPROVED' | 'EXPIRED' | 'REJECTED';
export type FmAmlRiskRating = 'LOW' | 'MEDIUM' | 'HIGH';
export type FmInvestorAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'DORMANT';
export type FmBusinessType =
  | 'LIMITED_LIABILITY'
  | 'PLC'
  | 'LLP'
  | 'SOLE_PROPRIETOR'
  | 'PARTNERSHIP'
  | 'COOPERATIVE'
  | 'NGO'
  | 'TRUST'
  | 'PUBLIC_SECTOR';

// ============================================================================
// TYPES - ENTITIES
// ============================================================================

export interface Fund {
  id: number;
  companyId: number;
  fundCode: string;
  name: string;
  shortName: string | null;
  description: string | null;
  fundType: FmFundType;
  regulatoryType: FmRegulatoryType;
  pencomFundType: FmPencomFundType | null;
  status: FmFundStatus;
  inceptionDate: string;
  terminationDate: string | null;
  baseCurrency: string;
  navFrequency: FmNavFrequency;
  navCalendarId: number | null;
  isShariaCompliant: boolean;
  minimumSubscription: number | null;
  minimumRedemption: number | null;
  lockUpPeriodDays: number | null;
  redemptionNoticeDays: number | null;
  redemptionSettlementDays: number | null;
  redemptionGateThreshold: number | null;
  managementFeeRate: number | null;
  performanceFeeRate: number | null;
  adminFeeRate: number | null;
  custodyFeeRate: number | null;
  trusteeshipFeeRate: number | null;
  highWaterMark: number | null;
  hurdleRate: number | null;
  performanceFeeMethod: FmPerformanceFeeMethod | null;
  benchmarkId: number | null;
  prospectusRef: string | null;
  secRegistrationNo: string | null;
  projectedRate: number | null;
  benchmarkFormula: string | null;
  profitSharingRatio: string | null;
  autoReinvest: boolean;
  totalAUM: number | null;
  totalUnitsOutstanding: number | null;
  latestNAVPerUnit: number | null;
  latestNAVDate: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string | null;
  // Live-computed fields
  investorCount?: number;
  liveAUM?: number;
  liveUnitsOutstanding?: number;
}

export interface FundStats {
  totalFunds: number;
  activeFunds: number;
  draftFunds: number;
  suspendedFunds: number;
  terminatedFunds: number;
  totalAUM: number;
  openEndedCount: number;
  closedEndCount: number;
  privateEquityCount: number;
  shariaCompliantCount: number;
}

export interface FundClass {
  id: number;
  fundId: number;
  classCode: string;
  className: string;
  currency: string;
  managementFeeOverride: number | null;
  performanceFeeOverride: number | null;
  minimumInvestment: number | null;
  entryLoad: number | null;
  exitLoad: number | null;
  isInstitutional: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface FundClassStats {
  totalClasses: number;
  activeClasses: number;
  inactiveClasses: number;
  institutionalClasses: number;
  retailClasses: number;
}

export interface Benchmark {
  id: number;
  companyId: number;
  name: string;
  code: string;
  provider: string | null;
  currency: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface BenchmarkPrice {
  id: number;
  benchmarkId: number;
  date: string;
  value: number;
  returnPct: number | null;
  createdAt: string;
}

export interface BenchmarkReturn {
  benchmarkId: number;
  startDate: string;
  endDate: string;
  startValue: number;
  endValue: number;
  returnPct: number;
}

export interface NavCalendar {
  id: number;
  companyId: number;
  name: string;
  frequency: FmNavFrequency;
  weeklyDay: number | null;
  monthlyDay: number | null;
  holidays: string[] | null;
  weekendDays: number[] | null;
  cutoffTime: string | null;
  timezone: string;
  createdAt: string;
}

export interface Custodian {
  id: number;
  companyId: number;
  name: string;
  code: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  swiftCode: string | null;
  feedFormat: FmFeedFormat | null;
  feedEndpoint: string | null;
  feedSchedule: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface FundAccount {
  id: number;
  fundId: number;
  accountType: FmAccountType;
  bankName: string;
  accountNumber: string;
  accountName: string | null;
  currency: string;
  custodianId: number | null;
  currentBalance: number | null;
  isActive: boolean;
  createdAt: string;
  // Joined fields
  custodianName?: string;
  fundName?: string;
}

export interface Security {
  id: number;
  companyId: number;
  securityCode: string;
  isin: string | null;
  name: string;
  shortName: string | null;
  assetClass: FmAssetClass;
  securityType: FmSecurityType;
  currency: string;
  exchange: FmExchange | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  issuer: string | null;
  couponRate: number | null;
  maturityDate: string | null;
  faceValue: number | null;
  couponFrequency: FmCouponFrequency | null;
  dayCountConvention: FmDayCountConvention | null;
  issueDate: string | null;
  callDate: string | null;
  lotSize: number | null;
  shariaStatus: FmShariaStatus;
  shariaScreenDate: string | null;
  shariaScreenNotes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface SecurityPrice {
  id: number;
  securityId: number;
  priceDate: string;
  bidPrice: number | null;
  askPrice: number | null;
  closePrice: number | null;
  cleanPrice: number | null;
  dirtyPrice: number | null;
  accruedInterest: number | null;
  yield: number | null;
  volume: number | null;
  source: FmPriceSource;
  isVerified: boolean;
  verifiedBy: number | null;
  verifiedAt: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface FxRate {
  id: number;
  companyId: number;
  fromCurrency: string;
  toCurrency: string;
  rateDate: string;
  rate: number;
  inverseRate: number;
  source: FmFxRateSource;
  isVerified: boolean;
  verifiedBy: number | null;
  createdAt: string;
}

export interface Investor {
  id: number;
  companyId: number;
  investorCode: string;
  customerNumber: string | null;
  investorType: FmInvestorType;
  firstName: string | null;
  lastName: string | null;
  otherNames: string | null;
  companyName: string | null;
  rcNumber: string | null;
  businessType: FmBusinessType | null;
  dateOfIncorporation: string | null;
  businessNature: string | null;
  contactPersonName: string | null;
  contactPersonPosition: string | null;
  contactPersonEmail: string | null;
  contactPersonPhone: string | null;
  annualTurnover: number | null;
  passportPhotoUrl: string | null;
  guardianName: string | null;
  guardianRelationship: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  guardianIdType: string | null;
  guardianIdNumber: string | null;
  guardianBvn: string | null;
  guardianAddress: string | null;
  email: string;
  phone: string | null;
  alternatePhone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  maritalStatus: string | null;
  idType: FmIdType;
  idNumber: string;
  idExpiryDate: string | null;
  taxId: string | null;
  riskProfile: FmRiskProfile;
  investmentObjective: FmInvestmentObjective | null;
  accreditationStatus: FmAccreditationStatus;
  isPEP: boolean;
  pepDetails: string | null;
  kycStatus: FmKycStatus;
  kycApprovedBy: number | null;
  kycApprovedAt: string | null;
  kycExpiryDate: string | null;
  kycRevalidationDate: string | null;
  kycDocuments: Record<string, unknown> | null;
  customerRole: 'investor' | 'investee' | 'both' | null;
  portalEnabled?: boolean;
  lastLoginAt?: string | null;
  amlRiskRating: FmAmlRiskRating;
  amlLastReviewDate: string | null;
  sourceOfFunds: string | null;
  sourceOfFundsHalalCertified: boolean;
  sourceOfFundsCertifiedAt: string | null;
  employerName: string | null;
  occupation: string | null;
  annualIncome: number | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  bankCode: string | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  nextOfKinRelationship: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface InvestorStats {
  total: number;
  individual: number;
  corporate: number;
  institutional: number;
  hni: number;
  kycPending: number;
  kycApproved: number;
  kycExpired: number;
  kycRejected: number;
  amlLow: number;
  amlMedium: number;
  amlHigh: number;
  pepCount: number;
}

export interface InvestorAccount {
  id: number;
  investorId: number;
  fundId: number;
  fundClassId: number | null;
  accountNumber: string;
  unitsHeld: number;
  averageCostPerUnit: number | null;
  totalInvested: number;
  totalRedeemed: number;
  totalDistributions: number;
  currentValue: number | null;
  unrealizedGainLoss: number | null;
  status: FmInvestorAccountStatus;
  openDate: string;
  closeDate: string | null;
  lastTransactionDate: string | null;
  companyId: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface InvestorAccountWithDetails extends InvestorAccount {
  investorName: string | null;
  investorCode: string | null;
  fundName: string | null;
  fundCode: string | null;
  fundClassName: string | null;
  latestNavPerUnit: number | null;
}

export interface InvestorAccountStats {
  totalAccounts: number;
  activeAccounts: number;
  suspendedAccounts: number;
  closedAccounts: number;
  dormantAccounts: number;
  totalInvested: number;
  totalCurrentValue: number;
  totalUnrealizedGainLoss: number;
}

export interface AccountStatementEntry {
  id: number;
  type: string;
  date: string;
  description: string;
  units: number | null;
  amount: number;
  navPerUnit: number | null;
  status: string;
  reference: string | null;
}

// ============================================================================
// TYPES - DTOs
// ============================================================================

export interface CreateFundDto {
  fundCode: string;
  name: string;
  shortName?: string;
  description?: string;
  fundType: FmFundType;
  inceptionDate: string;
  terminationDate?: string;
  baseCurrency: string;
  status?: FmFundStatus;
  isShariaCompliant?: boolean;
  navFrequency: FmNavFrequency;
  navCalendarId?: number;
  minimumSubscription?: number;
  minimumRedemption?: number;
  lockUpPeriodDays?: number;
  redemptionNoticeDays?: number;
  redemptionSettlementDays?: number;
  redemptionGateThreshold?: number;
  managementFeeRate?: number;
  performanceFeeRate?: number;
  adminFeeRate?: number;
  custodyFeeRate?: number;
  trusteeshipFeeRate?: number;
  highWaterMark?: number;
  hurdleRate?: number;
  performanceFeeMethod?: FmPerformanceFeeMethod;
  benchmarkId?: number;
  regulatoryType: FmRegulatoryType;
  pencomFundType?: FmPencomFundType;
  prospectusRef?: string;
  secRegistrationNo?: string;
  projectedRate?: number;
  benchmarkFormula?: string;
  profitSharingRatio?: string;
  autoReinvest?: boolean;
}

export interface UpdateFundDto {
  name?: string;
  shortName?: string;
  description?: string;
  terminationDate?: string;
  isShariaCompliant?: boolean;
  navFrequency?: FmNavFrequency;
  navCalendarId?: number;
  minimumSubscription?: number;
  minimumRedemption?: number;
  lockUpPeriodDays?: number;
  redemptionNoticeDays?: number;
  redemptionSettlementDays?: number;
  redemptionGateThreshold?: number;
  managementFeeRate?: number;
  performanceFeeRate?: number;
  adminFeeRate?: number;
  custodyFeeRate?: number;
  trusteeshipFeeRate?: number;
  highWaterMark?: number;
  hurdleRate?: number;
  performanceFeeMethod?: FmPerformanceFeeMethod;
  benchmarkId?: number;
  pencomFundType?: FmPencomFundType;
  prospectusRef?: string;
  secRegistrationNo?: string;
  projectedRate?: number;
  benchmarkFormula?: string;
  profitSharingRatio?: string;
  autoReinvest?: boolean;
}

export interface UpdateFundStatusDto {
  status: FmFundStatus;
  reason?: string;
}

export interface CreateFundClassDto {
  fundId: number;
  classCode: string;
  className: string;
  currency: string;
  managementFeeOverride?: number;
  performanceFeeOverride?: number;
  minimumInvestment?: number;
  entryLoad?: number;
  exitLoad?: number;
  isInstitutional?: boolean;
  isActive?: boolean;
}

export interface UpdateFundClassDto {
  className?: string;
  currency?: string;
  managementFeeOverride?: number;
  performanceFeeOverride?: number;
  minimumInvestment?: number;
  entryLoad?: number;
  exitLoad?: number;
  isInstitutional?: boolean;
  isActive?: boolean;
}

export interface CreateBenchmarkDto {
  name: string;
  code: string;
  provider?: string;
  currency: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateBenchmarkDto {
  name?: string;
  provider?: string;
  currency?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateBenchmarkPriceDto {
  date: string;
  value: number;
  returnPct?: number;
}

export interface CreateNavCalendarDto {
  name: string;
  frequency: FmNavFrequency;
  weeklyDay?: number;
  monthlyDay?: number;
  holidays?: string[];
  weekendDays?: number[];
  cutoffTime?: string;
  timezone: string;
}

export interface UpdateNavCalendarDto {
  name?: string;
  frequency?: FmNavFrequency;
  weeklyDay?: number;
  monthlyDay?: number;
  holidays?: string[];
  weekendDays?: number[];
  cutoffTime?: string;
  timezone?: string;
}

export interface CreateCustodianDto {
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  swiftCode?: string;
  feedFormat?: FmFeedFormat;
  feedEndpoint?: string;
  feedSchedule?: string;
  isActive?: boolean;
}

export interface UpdateCustodianDto {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  swiftCode?: string;
  feedFormat?: FmFeedFormat;
  feedEndpoint?: string;
  feedSchedule?: string;
  isActive?: boolean;
}

export interface CreateFundAccountDto {
  fundId: number;
  accountType: FmAccountType;
  bankName: string;
  accountNumber: string;
  accountName?: string;
  currency: string;
  custodianId?: number;
  currentBalance?: number;
  isActive?: boolean;
}

export interface UpdateFundAccountDto {
  accountType?: FmAccountType;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  currency?: string;
  custodianId?: number;
  currentBalance?: number;
  isActive?: boolean;
}

export interface CreateSecurityDto {
  securityCode: string;
  isin?: string;
  name: string;
  shortName?: string;
  assetClass: FmAssetClass;
  securityType: FmSecurityType;
  currency: string;
  exchange?: FmExchange;
  sector?: string;
  industry?: string;
  country?: string;
  issuer?: string;
  couponRate?: number;
  maturityDate?: string;
  faceValue?: number;
  couponFrequency?: FmCouponFrequency;
  dayCountConvention?: FmDayCountConvention;
  issueDate?: string;
  callDate?: string;
  lotSize?: number;
  shariaStatus?: FmShariaStatus;
  shariaScreenDate?: string;
  shariaScreenNotes?: string;
  isActive?: boolean;
}

export interface UpdateSecurityDto {
  isin?: string;
  name?: string;
  shortName?: string;
  assetClass?: FmAssetClass;
  securityType?: FmSecurityType;
  currency?: string;
  exchange?: FmExchange;
  sector?: string;
  industry?: string;
  country?: string;
  issuer?: string;
  couponRate?: number;
  maturityDate?: string;
  faceValue?: number;
  couponFrequency?: FmCouponFrequency;
  dayCountConvention?: FmDayCountConvention;
  issueDate?: string;
  callDate?: string;
  lotSize?: number;
  shariaStatus?: FmShariaStatus;
  shariaScreenDate?: string;
  shariaScreenNotes?: string;
  isActive?: boolean;
}

export interface UpdateShariaStatusDto {
  shariaStatus: FmShariaStatus;
  shariaScreenDate?: string;
  shariaScreenNotes?: string;
}

export interface CreateSecurityPriceDto {
  securityId: number;
  priceDate: string;
  bidPrice?: number;
  askPrice?: number;
  closePrice?: number;
  cleanPrice?: number;
  dirtyPrice?: number;
  accruedInterest?: number;
  yield?: number;
  volume?: number;
  source: FmPriceSource;
}

export interface UpdateSecurityPriceDto {
  bidPrice?: number;
  askPrice?: number;
  closePrice?: number;
  cleanPrice?: number;
  dirtyPrice?: number;
  accruedInterest?: number;
  yield?: number;
  volume?: number;
  source?: FmPriceSource;
}

export interface BulkPriceItemDto {
  securityId: number;
  priceDate: string;
  bidPrice?: number;
  askPrice?: number;
  closePrice?: number;
  cleanPrice?: number;
  dirtyPrice?: number;
  accruedInterest?: number;
  yield?: number;
  volume?: number;
}

export interface BulkPriceImportDto {
  source: FmPriceSource;
  prices: BulkPriceItemDto[];
}

export interface PriceVerificationDto {
  isVerified: boolean;
}

export interface CreateFxRateDto {
  fromCurrency: string;
  toCurrency: string;
  rateDate: string;
  rate: number;
  inverseRate?: number;
  source: FmFxRateSource;
}

export interface UpdateFxRateDto {
  rate?: number;
  inverseRate?: number;
  source?: FmFxRateSource;
}

export interface CreateInvestorDto {
  investorType: FmInvestorType;
  firstName?: string;
  lastName?: string;
  otherNames?: string;
  companyName?: string;
  rcNumber?: string;
  businessType?: FmBusinessType;
  dateOfIncorporation?: string;
  businessNature?: string;
  contactPersonName?: string;
  contactPersonPosition?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  annualTurnover?: number;
  passportPhotoUrl?: string;
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianIdType?: string;
  guardianIdNumber?: string;
  guardianBvn?: string;
  guardianAddress?: string;
  email: string;
  phone?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  nationality?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  idType: FmIdType;
  idNumber: string;
  idExpiryDate?: string;
  taxId?: string;
  riskProfile?: FmRiskProfile;
  investmentObjective?: FmInvestmentObjective;
  accreditationStatus?: FmAccreditationStatus;
  isPEP?: boolean;
  pepDetails?: string;
  kycDocuments?: Record<string, unknown>;
  amlRiskRating?: FmAmlRiskRating;
  sourceOfFunds?: string;
  sourceOfFundsHalalCertified?: boolean;
  employerName?: string;
  occupation?: string;
  annualIncome?: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankCode?: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  nextOfKinRelationship?: string;
}

export interface UpdateInvestorDto {
  investorType?: FmInvestorType;
  firstName?: string;
  lastName?: string;
  otherNames?: string;
  companyName?: string;
  rcNumber?: string;
  businessType?: FmBusinessType;
  dateOfIncorporation?: string;
  businessNature?: string;
  contactPersonName?: string;
  contactPersonPosition?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  annualTurnover?: number;
  passportPhotoUrl?: string;
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianIdType?: string;
  guardianIdNumber?: string;
  guardianBvn?: string;
  guardianAddress?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  nationality?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  idType?: FmIdType;
  idNumber?: string;
  idExpiryDate?: string;
  taxId?: string;
  riskProfile?: FmRiskProfile;
  investmentObjective?: FmInvestmentObjective;
  accreditationStatus?: FmAccreditationStatus;
  kycDocuments?: Record<string, unknown>;
  sourceOfFunds?: string;
  sourceOfFundsHalalCertified?: boolean;
  employerName?: string;
  occupation?: string;
  annualIncome?: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankCode?: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  nextOfKinRelationship?: string;
}

export type FmCustomerRole = 'investor' | 'investee' | 'both';

export interface KycApprovalDto {
  kycStatus: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  kycExpiryDate?: string;
  /** Required when kycStatus is APPROVED — sets what the customer can do next. */
  customerRole?: FmCustomerRole;
}

export interface UpdatePepDto {
  isPEP: boolean;
  pepDetails?: string;
}

export interface UpdateAmlRiskDto {
  amlRiskRating: FmAmlRiskRating;
}

export interface CreateInvestorAccountDto {
  investorId: number;
  fundId: number;
  fundClassId?: number;
}

export interface UpdateInvestorAccountDto {
  fundClassId?: number;
  status?: FmInvestorAccountStatus;
}

// ============================================================================
// TYPES - QUERIES
// ============================================================================

export interface FundQuery {
  search?: string;
  status?: FmFundStatus;
  fundType?: FmFundType;
  regulatoryType?: FmRegulatoryType;
  isShariaCompliant?: boolean;
  page?: number;
  limit?: number;
}

export interface FundClassQuery {
  search?: string;
  isActive?: boolean;
  isInstitutional?: boolean;
  page?: number;
  limit?: number;
}

export interface BenchmarkQuery {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface BenchmarkPriceQuery {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface NavCalendarQuery {
  search?: string;
  frequency?: FmNavFrequency;
  page?: number;
  limit?: number;
}

export interface CustodianQuery {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface FundAccountQuery {
  search?: string;
  accountType?: FmAccountType;
  isActive?: boolean;
  custodianId?: number;
  page?: number;
  limit?: number;
}

export interface SecurityQuery {
  search?: string;
  assetClass?: FmAssetClass;
  securityType?: FmSecurityType;
  exchange?: FmExchange;
  shariaStatus?: FmShariaStatus;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface SecurityPriceQuery {
  securityId?: number;
  startDate?: string;
  endDate?: string;
  source?: FmPriceSource;
  isVerified?: boolean;
  page?: number;
  limit?: number;
}

export interface FxRateQuery {
  fromCurrency?: string;
  toCurrency?: string;
  startDate?: string;
  endDate?: string;
  source?: FmFxRateSource;
  isVerified?: boolean;
  page?: number;
  limit?: number;
}

export interface InvestorQuery {
  search?: string;
  investorType?: FmInvestorType;
  kycStatus?: FmKycStatus;
  amlRiskRating?: FmAmlRiskRating;
  isPEP?: boolean;
  page?: number;
  limit?: number;
}

export interface InvestorAccountQuery {
  fundId?: number;
  investorId?: number;
  status?: FmInvestorAccountStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AccountStatementQuery {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// TYPES - PAGINATED RESPONSE
// ============================================================================

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

// ============================================================================
// FUNDS API
// ============================================================================

export const fundsApi = {
  list: async (query?: FundQuery): Promise<PaginatedResponse<Fund>> => {
    const response = await api.get('/fund-management/funds', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Fund> => {
    const response = await api.get(`/fund-management/funds/${id}`);
    return response.data;
  },

  create: async (data: CreateFundDto): Promise<Fund> => {
    const response = await api.post('/fund-management/funds', data);
    return response.data;
  },

  update: async (id: number, data: UpdateFundDto): Promise<Fund> => {
    const response = await api.put(`/fund-management/funds/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/funds/${id}`);
  },

  updateStatus: async (id: number, data: UpdateFundStatusDto): Promise<Fund> => {
    const response = await api.patch(`/fund-management/funds/${id}/status`, data);
    return response.data;
  },

  getStats: async (): Promise<FundStats> => {
    const response = await api.get('/fund-management/funds/stats');
    return response.data;
  },

  getSummary: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/fund-management/funds/summary');
    return response.data;
  },
};

// ============================================================================
// FUND CLASSES API
// ============================================================================

export const fundClassesApi = {
  list: async (fundId: number, query?: FundClassQuery): Promise<PaginatedResponse<FundClass>> => {
    const response = await api.get(`/fund-management/funds/${fundId}/classes`, { params: query });
    return response.data;
  },

  get: async (fundId: number, id: number): Promise<FundClass> => {
    const response = await api.get(`/fund-management/funds/${fundId}/classes/${id}`);
    return response.data;
  },

  getStats: async (fundId: number): Promise<FundClassStats> => {
    const response = await api.get(`/fund-management/funds/${fundId}/classes/stats`);
    return response.data;
  },

  create: async (fundId: number, data: CreateFundClassDto): Promise<FundClass> => {
    const response = await api.post(`/fund-management/funds/${fundId}/classes`, data);
    return response.data;
  },

  update: async (fundId: number, id: number, data: UpdateFundClassDto): Promise<FundClass> => {
    const response = await api.put(`/fund-management/funds/${fundId}/classes/${id}`, data);
    return response.data;
  },

  delete: async (fundId: number, id: number): Promise<void> => {
    await api.delete(`/fund-management/funds/${fundId}/classes/${id}`);
  },
};

// ============================================================================
// BENCHMARKS API
// ============================================================================

export const benchmarksApi = {
  list: async (query?: BenchmarkQuery): Promise<PaginatedResponse<Benchmark>> => {
    const response = await api.get('/fund-management/benchmarks', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Benchmark> => {
    const response = await api.get(`/fund-management/benchmarks/${id}`);
    return response.data;
  },

  create: async (data: CreateBenchmarkDto): Promise<Benchmark> => {
    const response = await api.post('/fund-management/benchmarks', data);
    return response.data;
  },

  update: async (id: number, data: UpdateBenchmarkDto): Promise<Benchmark> => {
    const response = await api.patch(`/fund-management/benchmarks/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/benchmarks/${id}`);
  },

  getStats: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/fund-management/benchmarks/stats');
    return response.data;
  },

  addPrice: async (id: number, data: CreateBenchmarkPriceDto): Promise<BenchmarkPrice> => {
    const response = await api.post(`/fund-management/benchmarks/${id}/prices`, data);
    return response.data;
  },

  getPriceHistory: async (id: number, query?: BenchmarkPriceQuery): Promise<PaginatedResponse<BenchmarkPrice>> => {
    const response = await api.get(`/fund-management/benchmarks/${id}/prices`, { params: query });
    return response.data;
  },

  getLatestPrice: async (id: number): Promise<BenchmarkPrice | null> => {
    const response = await api.get(`/fund-management/benchmarks/${id}/prices/latest`);
    return response.data;
  },

  calculateReturn: async (id: number, startDate: string, endDate: string): Promise<BenchmarkReturn> => {
    const response = await api.get(`/fund-management/benchmarks/${id}/return`, {
      params: { startDate, endDate },
    });
    return response.data;
  },
};

// ============================================================================
// NAV CALENDARS API
// ============================================================================

export const navCalendarsApi = {
  list: async (query?: NavCalendarQuery): Promise<PaginatedResponse<NavCalendar>> => {
    const response = await api.get('/fund-management/nav-calendars', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<NavCalendar> => {
    const response = await api.get(`/fund-management/nav-calendars/${id}`);
    return response.data;
  },

  create: async (data: CreateNavCalendarDto): Promise<NavCalendar> => {
    const response = await api.post('/fund-management/nav-calendars', data);
    return response.data;
  },

  update: async (id: number, data: UpdateNavCalendarDto): Promise<NavCalendar> => {
    const response = await api.put(`/fund-management/nav-calendars/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/nav-calendars/${id}`);
  },

  getStats: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/fund-management/nav-calendars/stats');
    return response.data;
  },
};

// ============================================================================
// CUSTODIANS API
// ============================================================================

export const custodiansApi = {
  list: async (query?: CustodianQuery): Promise<PaginatedResponse<Custodian>> => {
    const response = await api.get('/fund-management/custodians', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Custodian> => {
    const response = await api.get(`/fund-management/custodians/${id}`);
    return response.data;
  },

  create: async (data: CreateCustodianDto): Promise<Custodian> => {
    const response = await api.post('/fund-management/custodians', data);
    return response.data;
  },

  update: async (id: number, data: UpdateCustodianDto): Promise<Custodian> => {
    const response = await api.patch(`/fund-management/custodians/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/custodians/${id}`);
  },

  getStats: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/fund-management/custodians/stats');
    return response.data;
  },
};

// ============================================================================
// FUND ACCOUNTS API
// ============================================================================

export const fundAccountsApi = {
  list: async (fundId: number, query?: FundAccountQuery): Promise<PaginatedResponse<FundAccount>> => {
    const response = await api.get(`/fund-management/funds/${fundId}/accounts`, { params: query });
    return response.data;
  },

  get: async (fundId: number, id: number): Promise<FundAccount> => {
    const response = await api.get(`/fund-management/funds/${fundId}/accounts/${id}`);
    return response.data;
  },

  create: async (fundId: number, data: CreateFundAccountDto): Promise<FundAccount> => {
    const response = await api.post(`/fund-management/funds/${fundId}/accounts`, data);
    return response.data;
  },

  update: async (fundId: number, id: number, data: UpdateFundAccountDto): Promise<FundAccount> => {
    const response = await api.put(`/fund-management/funds/${fundId}/accounts/${id}`, data);
    return response.data;
  },

  delete: async (fundId: number, id: number): Promise<void> => {
    await api.delete(`/fund-management/funds/${fundId}/accounts/${id}`);
  },

  getStats: async (fundId: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/fund-management/funds/${fundId}/accounts/stats`);
    return response.data;
  },
};

// ============================================================================
// SECURITIES API
// ============================================================================

export const securitiesApi = {
  list: async (query?: SecurityQuery): Promise<PaginatedResponse<Security>> => {
    const response = await api.get('/fund-management/securities', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Security> => {
    const response = await api.get(`/fund-management/securities/${id}`);
    return response.data;
  },

  create: async (data: CreateSecurityDto): Promise<Security> => {
    const response = await api.post('/fund-management/securities', data);
    return response.data;
  },

  update: async (id: number, data: UpdateSecurityDto): Promise<Security> => {
    const response = await api.patch(`/fund-management/securities/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/securities/${id}`);
  },

  getStats: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/fund-management/securities/stats');
    return response.data;
  },

  getAssetBreakdown: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/fund-management/securities/asset-breakdown');
    return response.data;
  },

  updateShariaStatus: async (id: number, data: UpdateShariaStatusDto): Promise<Security> => {
    const response = await api.patch(`/fund-management/securities/${id}/sharia-status`, data);
    return response.data;
  },
};

// ============================================================================
// SECURITY PRICES API
// ============================================================================

export const securityPricesApi = {
  list: async (query?: SecurityPriceQuery): Promise<PaginatedResponse<SecurityPrice>> => {
    const response = await api.get('/fund-management/security-prices', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<SecurityPrice> => {
    const response = await api.get(`/fund-management/security-prices/${id}`);
    return response.data;
  },

  create: async (data: CreateSecurityPriceDto): Promise<SecurityPrice> => {
    const response = await api.post('/fund-management/security-prices', data);
    return response.data;
  },

  update: async (id: number, data: UpdateSecurityPriceDto): Promise<SecurityPrice> => {
    const response = await api.patch(`/fund-management/security-prices/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/security-prices/${id}`);
  },

  bulkImport: async (data: BulkPriceImportDto): Promise<{ imported: number; skipped: number; errors: number }> => {
    const response = await api.post('/fund-management/security-prices/bulk-import', data);
    return response.data;
  },

  getStale: async (staleDays?: number): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/fund-management/security-prices/stale', { params: { staleDays } });
    return response.data;
  },

  getLatest: async (securityId: number): Promise<SecurityPrice | null> => {
    const response = await api.get(`/fund-management/security-prices/latest/${securityId}`);
    return response.data;
  },

  getHistory: async (
    securityId: number,
    query?: { startDate?: string; endDate?: string },
  ): Promise<SecurityPrice[]> => {
    const response = await api.get(`/fund-management/security-prices/history/${securityId}`, { params: query });
    return response.data;
  },

  verify: async (id: number, data: PriceVerificationDto): Promise<SecurityPrice> => {
    const response = await api.patch(`/fund-management/security-prices/${id}/verify`, data);
    return response.data;
  },
};

// ============================================================================
// FX RATES API
// ============================================================================

export const fxRatesApi = {
  list: async (query?: FxRateQuery): Promise<PaginatedResponse<FxRate>> => {
    const response = await api.get('/fund-management/fx-rates', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<FxRate> => {
    const response = await api.get(`/fund-management/fx-rates/${id}`);
    return response.data;
  },

  create: async (data: CreateFxRateDto): Promise<FxRate> => {
    const response = await api.post('/fund-management/fx-rates', data);
    return response.data;
  },

  update: async (id: number, data: UpdateFxRateDto): Promise<FxRate> => {
    const response = await api.patch(`/fund-management/fx-rates/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/fx-rates/${id}`);
  },

  getPairs: async (): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/fund-management/fx-rates/pairs');
    return response.data;
  },

  getLatest: async (fromCurrency: string, toCurrency: string): Promise<FxRate | null> => {
    const response = await api.get(`/fund-management/fx-rates/latest/${fromCurrency}/${toCurrency}`);
    return response.data;
  },

  getHistory: async (
    fromCurrency: string,
    toCurrency: string,
    query?: { startDate?: string; endDate?: string },
  ): Promise<FxRate[]> => {
    const response = await api.get(`/fund-management/fx-rates/history/${fromCurrency}/${toCurrency}`, {
      params: query,
    });
    return response.data;
  },
};

// ============================================================================
// INVESTORS API
// ============================================================================

export const investorsApi = {
  list: async (query?: InvestorQuery): Promise<PaginatedResponse<Investor>> => {
    const response = await api.get('/fund-management/investors', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Investor & { accounts?: InvestorAccount[] }> => {
    const response = await api.get(`/fund-management/investors/${id}`);
    return response.data;
  },

  create: async (data: CreateInvestorDto): Promise<Investor> => {
    const response = await api.post('/fund-management/investors', data);
    return response.data;
  },

  update: async (id: number, data: UpdateInvestorDto): Promise<Investor> => {
    const response = await api.put(`/fund-management/investors/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/investors/${id}`);
  },

  getStats: async (): Promise<InvestorStats> => {
    const response = await api.get('/fund-management/investors/stats');
    return response.data;
  },

  getExpiringKyc: async (daysUntilExpiry?: number): Promise<Investor[]> => {
    const response = await api.get('/fund-management/investors/expiring-kyc', {
      params: { daysUntilExpiry },
    });
    return response.data;
  },

  updateKyc: async (id: number, data: KycApprovalDto): Promise<Investor> => {
    const response = await api.patch(`/fund-management/investors/${id}/kyc`, data);
    return response.data;
  },

  updatePep: async (id: number, data: UpdatePepDto): Promise<Investor> => {
    const response = await api.patch(`/fund-management/investors/${id}/pep`, data);
    return response.data;
  },

  updateAmlRisk: async (id: number, data: UpdateAmlRiskDto): Promise<Investor> => {
    const response = await api.patch(`/fund-management/investors/${id}/aml-risk`, data);
    return response.data;
  },

  updateCustomerRole: async (id: number, customerRole: 'investor' | 'investee' | 'both' | null): Promise<Investor> => {
    const response = await api.patch(`/fund-management/investors/${id}/customer-role`, { customerRole });
    return response.data;
  },

  triggerKycRevalidation: async (id: number): Promise<Investor> => {
    const response = await api.post(`/fund-management/investors/${id}/kyc-revalidation`);
    return response.data;
  },

  enablePortal: async (id: number, password: string): Promise<Investor> => {
    const response = await api.post(`/fund-management/investors/${id}/enable-portal`, { password });
    return response.data;
  },

  disablePortal: async (id: number): Promise<Investor> => {
    const response = await api.post(`/fund-management/investors/${id}/disable-portal`);
    return response.data;
  },
};

// ============================================================================
// INVESTOR DOCUMENTS API
// ============================================================================

export const FM_DOCUMENT_TYPES = [
  'ID_CARD', 'UTILITY_BILL', 'CAC_CERTIFICATE', 'BOARD_RESOLUTION',
  'MANDATE_FORM', 'PASSPORT_PHOTO', 'SIGNATURE', 'TAX_CERTIFICATE', 'OTHER',
] as const;

export const FM_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ID_CARD: 'National ID Card',
  UTILITY_BILL: 'Utility Bill (Proof of Address)',
  CAC_CERTIFICATE: 'CAC Certificate',
  BOARD_RESOLUTION: 'Board Resolution',
  MANDATE_FORM: 'Mandate Form',
  PASSPORT_PHOTO: 'Passport Photograph',
  SIGNATURE: 'Specimen Signature',
  TAX_CERTIFICATE: 'Tax Clearance Certificate',
  OTHER: 'Other Document',
};

export interface InvestorDocument {
  id: number;
  investorId: number;
  documentCode: string;
  documentName: string;
  documentType: string;
  documentCategory: string;
  description: string | null;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  issuingAuthority: string | null;
  fileName: string;
  originalFileName: string;
  filePath: string;
  fileExtension: string;
  mimeType: string;
  fileSize: number;
  status: string;
  isMandatory: boolean;
  isVerified: boolean;
  verifiedDate: string | null;
  verifiedBy: number | null;
  verificationNotes: string | null;
  version: number;
  uploadedBy: number;
  uploadedAt: string;
  createdAt: string;
}

export interface MandatoryDocumentStatus {
  documentType: string;
  label: string;
  isMandatory: boolean;
  isUploaded: boolean;
  isVerified: boolean;
  documentId: number | null;
  status: string | null;
}

export interface CreateInvestorDocumentDto {
  documentName: string;
  documentType: string;
  documentCategory?: string;
  description?: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  fileName: string;
  originalFileName: string;
  filePath: string;
  fileExtension: string;
  mimeType: string;
  fileSize: number;
}

export const investorDocumentsApi = {
  list: async (investorId: number, query?: { documentType?: string; status?: string; search?: string }): Promise<InvestorDocument[]> => {
    const response = await api.get(`/fund-management/investors/${investorId}/documents`, { params: query });
    return response.data;
  },

  get: async (investorId: number, docId: number): Promise<InvestorDocument> => {
    const response = await api.get(`/fund-management/investors/${investorId}/documents/${docId}`);
    return response.data;
  },

  create: async (investorId: number, data: CreateInvestorDocumentDto): Promise<InvestorDocument> => {
    const response = await api.post(`/fund-management/investors/${investorId}/documents`, data);
    return response.data;
  },

  verify: async (investorId: number, docId: number, notes?: string): Promise<InvestorDocument> => {
    const response = await api.patch(`/fund-management/investors/${investorId}/documents/${docId}/verify`, { verificationNotes: notes });
    return response.data;
  },

  reject: async (investorId: number, docId: number, notes: string): Promise<InvestorDocument> => {
    const response = await api.patch(`/fund-management/investors/${investorId}/documents/${docId}/reject`, { verificationNotes: notes });
    return response.data;
  },

  delete: async (investorId: number, docId: number): Promise<void> => {
    await api.delete(`/fund-management/investors/${investorId}/documents/${docId}`);
  },

  getMandatoryStatus: async (investorId: number): Promise<MandatoryDocumentStatus[]> => {
    const response = await api.get(`/fund-management/investors/${investorId}/documents/mandatory-status`);
    return response.data;
  },
};

// ============================================================================
// INVESTOR DIRECTORS API
// ============================================================================

export type FmUboControlType = 'DIRECT' | 'INDIRECT' | 'VOTING_RIGHTS' | 'OTHER';

export interface InvestorDirector {
  id: number;
  investorId: number;
  companyId: number;
  fullName: string;
  position: string;
  idType: FmIdType | null;
  idNumber: string | null;
  bvn: string | null;
  nationality: string | null;
  email: string | null;
  phone: string | null;
  dateAppointed: string | null;
  isActive: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateInvestorDirectorDto {
  fullName: string;
  position: string;
  idType?: FmIdType;
  idNumber?: string;
  bvn?: string;
  nationality?: string;
  email?: string;
  phone?: string;
  dateAppointed?: string;
  isActive?: boolean;
}

export interface UpdateInvestorDirectorDto {
  fullName?: string;
  position?: string;
  idType?: FmIdType;
  idNumber?: string;
  bvn?: string;
  nationality?: string;
  email?: string;
  phone?: string;
  dateAppointed?: string;
  isActive?: boolean;
}

export const investorDirectorsApi = {
  list: async (investorId: number): Promise<InvestorDirector[]> => {
    const response = await api.get(`/fund-management/investors/${investorId}/directors`);
    return response.data;
  },

  get: async (investorId: number, directorId: number): Promise<InvestorDirector> => {
    const response = await api.get(`/fund-management/investors/${investorId}/directors/${directorId}`);
    return response.data;
  },

  create: async (investorId: number, data: CreateInvestorDirectorDto): Promise<InvestorDirector> => {
    const response = await api.post(`/fund-management/investors/${investorId}/directors`, data);
    return response.data;
  },

  update: async (
    investorId: number,
    directorId: number,
    data: UpdateInvestorDirectorDto,
  ): Promise<InvestorDirector> => {
    const response = await api.patch(`/fund-management/investors/${investorId}/directors/${directorId}`, data);
    return response.data;
  },

  delete: async (investorId: number, directorId: number): Promise<void> => {
    await api.delete(`/fund-management/investors/${investorId}/directors/${directorId}`);
  },
};

// ============================================================================
// INVESTOR BENEFICIAL OWNERS (UBO) API
// ============================================================================

export interface InvestorUbo {
  id: number;
  investorId: number;
  companyId: number;
  fullName: string;
  ownershipPercent: number;
  controlType: FmUboControlType;
  idType: FmIdType | null;
  idNumber: string | null;
  bvn: string | null;
  nationality: string | null;
  address: string | null;
  isPEP: boolean;
  pepDetails: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateInvestorUboDto {
  fullName: string;
  ownershipPercent: number;
  controlType: FmUboControlType;
  idType?: FmIdType;
  idNumber?: string;
  bvn?: string;
  nationality?: string;
  address?: string;
  isPEP?: boolean;
  pepDetails?: string;
}

export interface UpdateInvestorUboDto {
  fullName?: string;
  ownershipPercent?: number;
  controlType?: FmUboControlType;
  idType?: FmIdType;
  idNumber?: string;
  bvn?: string;
  nationality?: string;
  address?: string;
  isPEP?: boolean;
  pepDetails?: string;
}

export const investorUbosApi = {
  list: async (investorId: number): Promise<InvestorUbo[]> => {
    const response = await api.get(`/fund-management/investors/${investorId}/ubos`);
    return response.data;
  },

  get: async (investorId: number, uboId: number): Promise<InvestorUbo> => {
    const response = await api.get(`/fund-management/investors/${investorId}/ubos/${uboId}`);
    return response.data;
  },

  create: async (investorId: number, data: CreateInvestorUboDto): Promise<InvestorUbo> => {
    const response = await api.post(`/fund-management/investors/${investorId}/ubos`, data);
    return response.data;
  },

  update: async (
    investorId: number,
    uboId: number,
    data: UpdateInvestorUboDto,
  ): Promise<InvestorUbo> => {
    const response = await api.patch(`/fund-management/investors/${investorId}/ubos/${uboId}`, data);
    return response.data;
  },

  delete: async (investorId: number, uboId: number): Promise<void> => {
    await api.delete(`/fund-management/investors/${investorId}/ubos/${uboId}`);
  },
};

// ============================================================================
// FEE GL CONFIGURATION API (tenant-defined mapping per fee type)
// ============================================================================
// FmFeeType is declared in the FEE CALCULATIONS section further down in the file.

export const FM_FEE_TYPE_LABELS: Record<FmFeeType, string> = {
  MANAGEMENT: 'Management Fee',
  PERFORMANCE: 'Performance Fee',
  ADMIN: 'Admin Fee',
  CUSTODY: 'Custody Fee',
  TRUSTEESHIP: 'Trusteeship Fee',
  AUDIT: 'Audit Fee',
};

export interface FeeGlConfig {
  id: number;
  companyId: number;
  fundId: number | null;
  feeType: FmFeeType;
  expenseAccountId: number;
  liabilityAccountId: number;
  cashAccountId: number;
  isActive: boolean;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  // joined
  expenseAccountCode?: string;
  expenseAccountName?: string;
  liabilityAccountCode?: string;
  liabilityAccountName?: string;
  cashAccountCode?: string;
  cashAccountName?: string;
  fundCode?: string | null;
  fundName?: string | null;
}

export interface CreateFeeGlConfigDto {
  fundId?: number;
  feeType: FmFeeType;
  expenseAccountId: number;
  liabilityAccountId: number;
  cashAccountId: number;
  isActive?: boolean;
  notes?: string;
}

export interface UpdateFeeGlConfigDto {
  expenseAccountId?: number;
  liabilityAccountId?: number;
  cashAccountId?: number;
  isActive?: boolean;
  notes?: string;
}

export const feeGlConfigApi = {
  list: async (params?: { fundId?: number | 'null'; activeOnly?: boolean }): Promise<FeeGlConfig[]> => {
    const response = await api.get('/fund-management/settings/fee-gl-config', { params });
    return response.data;
  },
  get: async (id: number): Promise<FeeGlConfig> => {
    const response = await api.get(`/fund-management/settings/fee-gl-config/${id}`);
    return response.data;
  },
  create: async (data: CreateFeeGlConfigDto): Promise<FeeGlConfig> => {
    const response = await api.post('/fund-management/settings/fee-gl-config', data);
    return response.data;
  },
  update: async (id: number, data: UpdateFeeGlConfigDto): Promise<FeeGlConfig> => {
    const response = await api.patch(`/fund-management/settings/fee-gl-config/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/settings/fee-gl-config/${id}`);
  },
};

// ============================================================================
// AML SETTINGS API (tenant-level HIGH-risk subscription gate)
// ============================================================================

export interface AmlSettings {
  companyId: number;
  highRiskBlockEnabled: boolean;
  highRiskThreshold: number;
  requiresSeniorApproval: boolean;
  notes: string | null;
  updatedBy: number | null;
  updatedAt: string;
  createdAt: string;
}

export interface UpsertAmlSettingsDto {
  highRiskBlockEnabled?: boolean;
  highRiskThreshold?: number;
  requiresSeniorApproval?: boolean;
  notes?: string;
}

export const amlSettingsApi = {
  get: async (): Promise<AmlSettings> => {
    const r = await api.get('/fund-management/settings/aml');
    return r.data;
  },
  upsert: async (data: UpsertAmlSettingsDto): Promise<AmlSettings> => {
    const r = await api.put('/fund-management/settings/aml', data);
    return r.data;
  },
};

// ============================================================================
// INVESTMENT TRANSACTION GL CONFIGURATION API (tenant-defined)
// ============================================================================

export type FmTransactionType = 'SUBSCRIPTION' | 'REDEMPTION' | 'DISTRIBUTION' | 'SWITCH';

export const FM_TRANSACTION_TYPE_LABELS: Record<FmTransactionType, string> = {
  SUBSCRIPTION: 'Subscription (money in)',
  REDEMPTION: 'Liquidation (money out)',
  DISTRIBUTION: 'Distribution (profit payout)',
  SWITCH: 'Fund Switch',
};

export interface TransactionGlConfig {
  id: number;
  companyId: number;
  fundId: number | null;
  transactionType: FmTransactionType;
  debitAccountId: number;
  creditAccountId: number;
  isActive: boolean;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  debitAccountCode?: string;
  debitAccountName?: string;
  creditAccountCode?: string;
  creditAccountName?: string;
  fundCode?: string | null;
  fundName?: string | null;
}

export interface CreateTransactionGlConfigDto {
  fundId?: number;
  transactionType: FmTransactionType;
  debitAccountId: number;
  creditAccountId: number;
  isActive?: boolean;
  notes?: string;
}

export interface UpdateTransactionGlConfigDto {
  debitAccountId?: number;
  creditAccountId?: number;
  isActive?: boolean;
  notes?: string;
}

// ============================================================================
// CREDIT FACILITY GL CONFIG
// ============================================================================

export type FmFacilityGlEventType =
  | 'DISBURSEMENT'
  | 'PRINCIPAL_REPAYMENT'
  | 'PROFIT_ACCRUAL'
  | 'PROFIT_RECEIPT'
  | 'PROCESSING_FEE'
  | 'LATE_FEE'
  | 'PROVISION';

export type FmFacilityStructure = 'murabaha' | 'musharakah' | 'ijarah' | 'mudarabah' | 'wakalah' | 'istisnaa';

export const FM_FACILITY_GL_EVENT_LABELS: Record<FmFacilityGlEventType, string> = {
  DISBURSEMENT:        'Disbursement (capital deployed)',
  PRINCIPAL_REPAYMENT: 'Principal Repayment',
  PROFIT_ACCRUAL:      'Profit Accrual (recognition)',
  PROFIT_RECEIPT:      'Profit Receipt (cash in)',
  PROCESSING_FEE:      'Processing Fee',
  LATE_FEE:            'Late Fee / Penalty',
  PROVISION:           'Provision / Impairment',
};

export const FM_FACILITY_STRUCTURE_LABELS: Record<FmFacilityStructure, string> = {
  murabaha:   'Murabaha (cost-plus sale)',
  musharakah: 'Musharakah (partnership)',
  ijarah:     'Ijarah (lease)',
  mudarabah:  'Mudarabah (profit-sharing)',
  wakalah:    'Wakalah (agency investment)',
  istisnaa:   "Istisna'a (manufacture-to-order)",
};

export const FM_FACILITY_GL_EVENT_HELP: Record<FmFacilityGlEventType, { debit: string; credit: string }> = {
  DISBURSEMENT:        { debit: 'Murabaha Receivable (DR — total facility amount incl. profit)', credit: 'Deferred Murabaha Income (CR — profit component). Bank is selected at disbursement time.' },
  PRINCIPAL_REPAYMENT: { debit: 'Bank / Cash (principal received)',       credit: 'Facility Receivable / Investment asset' },
  PROFIT_ACCRUAL:      { debit: 'Accrued Profit Receivable',              credit: 'Deferred Profit / Profit Income' },
  PROFIT_RECEIPT:      { debit: 'Bank / Cash (profit received)',          credit: 'Accrued Profit Receivable' },
  PROCESSING_FEE:      { debit: 'Bank / Cash (fee received)',             credit: 'Processing Fee Income' },
  LATE_FEE:            { debit: 'Bank / Cash (late fee received)',        credit: 'Late Fee Income / Charity Payable' },
  PROVISION:           { debit: 'Bad Debt / Impairment Expense',          credit: 'Provision for Credit Losses' },
};

export interface CreditFacilityGlConfig {
  id: number;
  companyId: number;
  fundId: number | null;
  facilityStructure: FmFacilityStructure | null;
  eventType: FmFacilityGlEventType;
  debitAccountId: number;
  creditAccountId: number;
  isActive: boolean;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  debitAccountCode?: string;
  debitAccountName?: string;
  creditAccountCode?: string;
  creditAccountName?: string;
  fundCode?: string | null;
  fundName?: string | null;
}

export interface CreateCreditFacilityGlConfigDto {
  fundId?: number;
  facilityStructure?: FmFacilityStructure;
  eventType: FmFacilityGlEventType;
  debitAccountId: number;
  creditAccountId: number;
  isActive?: boolean;
  notes?: string;
}

export interface UpdateCreditFacilityGlConfigDto {
  debitAccountId?: number;
  creditAccountId?: number;
  isActive?: boolean;
  notes?: string;
}

export const creditFacilityGlConfigApi = {
  list: async (): Promise<CreditFacilityGlConfig[]> => {
    const response = await api.get('/fund-management/settings/credit-facility-gl-config');
    return response.data;
  },
  get: async (id: number): Promise<CreditFacilityGlConfig> => {
    const response = await api.get(`/fund-management/settings/credit-facility-gl-config/${id}`);
    return response.data;
  },
  create: async (data: CreateCreditFacilityGlConfigDto): Promise<CreditFacilityGlConfig> => {
    const response = await api.post('/fund-management/settings/credit-facility-gl-config', data);
    return response.data;
  },
  update: async (id: number, data: UpdateCreditFacilityGlConfigDto): Promise<CreditFacilityGlConfig> => {
    const response = await api.patch(`/fund-management/settings/credit-facility-gl-config/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/settings/credit-facility-gl-config/${id}`);
  },
};

export const transactionGlConfigApi = {
  list: async (params?: { fundId?: number | 'null'; activeOnly?: boolean }): Promise<TransactionGlConfig[]> => {
    const response = await api.get('/fund-management/settings/transaction-gl-config', { params });
    return response.data;
  },
  get: async (id: number): Promise<TransactionGlConfig> => {
    const response = await api.get(`/fund-management/settings/transaction-gl-config/${id}`);
    return response.data;
  },
  create: async (data: CreateTransactionGlConfigDto): Promise<TransactionGlConfig> => {
    const response = await api.post('/fund-management/settings/transaction-gl-config', data);
    return response.data;
  },
  update: async (id: number, data: UpdateTransactionGlConfigDto): Promise<TransactionGlConfig> => {
    const response = await api.patch(`/fund-management/settings/transaction-gl-config/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/settings/transaction-gl-config/${id}`);
  },
};

// ============================================================================
// INVESTOR DOCUMENT TYPES API (tenant-configurable KYC checklist)
// ============================================================================

export type FmApplicableInvestorType = 'ALL' | 'INDIVIDUAL' | 'CORPORATE' | 'INSTITUTIONAL' | 'HNI';

export interface InvestorDocumentType {
  id: number;
  companyId: number;
  name: string;
  code: string;
  description: string | null;
  isRequired: boolean;
  applicableTypes: FmApplicableInvestorType[];
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateInvestorDocumentTypeDto {
  name: string;
  code?: string;
  description?: string;
  isRequired?: boolean;
  applicableTypes?: FmApplicableInvestorType[];
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateInvestorDocumentTypeDto {
  name?: string;
  code?: string;
  description?: string;
  isRequired?: boolean;
  applicableTypes?: FmApplicableInvestorType[];
  sortOrder?: number;
  isActive?: boolean;
}

export const investorDocumentTypesApi = {
  list: async (params?: { activeOnly?: boolean; investorType?: string }): Promise<InvestorDocumentType[]> => {
    const response = await api.get('/fund-management/settings/document-types', { params });
    return response.data;
  },

  get: async (id: number): Promise<InvestorDocumentType> => {
    const response = await api.get(`/fund-management/settings/document-types/${id}`);
    return response.data;
  },

  create: async (data: CreateInvestorDocumentTypeDto): Promise<InvestorDocumentType> => {
    const response = await api.post('/fund-management/settings/document-types', data);
    return response.data;
  },

  update: async (id: number, data: UpdateInvestorDocumentTypeDto): Promise<InvestorDocumentType> => {
    const response = await api.patch(`/fund-management/settings/document-types/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/settings/document-types/${id}`);
  },
};

// ============================================================================
// INVESTOR ACCOUNTS API
// ============================================================================

export const investorAccountsApi = {
  list: async (query?: InvestorAccountQuery): Promise<PaginatedResponse<InvestorAccountWithDetails>> => {
    const response = await api.get('/fund-management/investor-accounts', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<InvestorAccountWithDetails> => {
    const response = await api.get(`/fund-management/investor-accounts/${id}`);
    return response.data;
  },

  create: async (data: CreateInvestorAccountDto): Promise<InvestorAccount> => {
    const response = await api.post('/fund-management/investor-accounts', data);
    return response.data;
  },

  update: async (id: number, data: UpdateInvestorAccountDto): Promise<InvestorAccount> => {
    const response = await api.put(`/fund-management/investor-accounts/${id}`, data);
    return response.data;
  },

  getStats: async (): Promise<InvestorAccountStats> => {
    const response = await api.get('/fund-management/investor-accounts/stats');
    return response.data;
  },

  getStatement: async (id: number, query?: AccountStatementQuery): Promise<PaginatedResponse<AccountStatementEntry>> => {
    const response = await api.get(`/fund-management/investor-accounts/${id}/statement`, { params: query });
    return response.data;
  },

  close: async (id: number): Promise<InvestorAccount> => {
    const response = await api.patch(`/fund-management/investor-accounts/${id}/close`);
    return response.data;
  },
};

// ============================================================================
// TYPES - SUBSCRIPTION ENUMS & INTERFACES
// ============================================================================

export type FmSubscriptionStatus = 'PENDING' | 'PAYMENT_VERIFIED' | 'APPROVED' | 'ALLOCATED' | 'SETTLED' | 'REJECTED' | 'CANCELLED';

export interface Subscription {
  id: number;
  subscriptionNumber: string;
  investorAccountId: number;
  fundId: number;
  fundClassId: number | null;
  amount: number;
  currency: string;
  fxRate: number;
  amountInBaseCurrency: number;
  navPerUnit: number | null;
  entryLoadRate: number | null;
  entryLoadAmount: number | null;
  unitsAllocated: number | null;
  paymentReference: string | null;
  paymentDate: string | null;
  paymentVerified: boolean;
  kycChecked: boolean;
  amlChecked: boolean;
  status: FmSubscriptionStatus;
  notes: string | null;
  journalEntryId: number | null;
  companyId: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string | null;
  // Joined fields from list queries
  investorName?: string;
  fundName?: string;
  fundClassName?: string;
}

export interface SubscriptionStats {
  totalSubscriptions: number;
  pendingCount: number;
  settledCount: number;
  totalAmount: number;
  totalUnitsAllocated: number;
}

export interface CreateSubscriptionDto {
  investorAccountId: number;
  fundId: number;
  fundClassId?: number;
  amount: number;
  currency: string;
  fxRate?: number;
  paymentReference?: string;
  paymentDate?: string;
  notes?: string;
}

export interface VerifyPaymentDto {
  paymentReference: string;
  paymentDate: string;
  paymentVerified: boolean;
}

export interface ApproveSubscriptionDto {
  navPerUnit: number;
  notes?: string;
}

export interface AllocateSubscriptionDto {
  navPerUnit: number;
  entryLoadRate?: number;
  notes?: string;
}

export interface SubscriptionQuery {
  search?: string;
  status?: FmSubscriptionStatus;
  fundId?: number;
  investorAccountId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// TYPES - REDEMPTION ENUMS & INTERFACES
// ============================================================================

export type FmRedemptionStatus = 'PENDING' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELLED' | 'GATED';
export type FmRedemptionType = 'PARTIAL' | 'FULL';

export interface Redemption {
  id: number;
  redemptionNumber: string;
  investorAccountId: number;
  fundId: number;
  fundClassId: number | null;
  redemptionType: FmRedemptionType;
  unitsToRedeem: number;
  amountToRedeem: number | null;
  navPerUnit: number | null;
  grossAmount: number | null;
  exitLoadRate: number | null;
  exitLoadAmount: number | null;
  withholdingTaxRate: number | null;
  withholdingTaxAmount: number | null;
  netPayable: number | null;
  lockUpCheckPassed: boolean;
  liquidityCheckPassed: boolean;
  gatedPercentage: number | null;
  paymentReference: string | null;
  paymentDate: string | null;
  status: FmRedemptionStatus;
  notes: string | null;
  journalEntryId: number | null;
  companyId: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string | null;
  // Joined fields
  investorName?: string;
  fundName?: string;
  fundClassName?: string;
}

export interface RedemptionStats {
  totalRedemptions: number;
  pendingCount: number;
  paidCount: number;
  totalGrossAmount: number;
  totalNetPayable: number;
}

export interface CreateRedemptionDto {
  investorAccountId: number;
  fundId: number;
  fundClassId?: number;
  redemptionType: FmRedemptionType;
  unitsToRedeem?: number;
  amountToRedeem?: number;
  notes?: string;
}

export interface ApproveRedemptionDto {
  navPerUnit: number;
  exitLoadRate?: number;
  withholdingTaxRate?: number;
  notes?: string;
}

export interface ProcessRedemptionPaymentDto {
  paymentReference: string;
  paymentDate: string;
  notes?: string;
}

export interface RejectRedemptionDto {
  reason: string;
}

export interface RedemptionQuery {
  search?: string;
  status?: FmRedemptionStatus;
  fundId?: number;
  investorAccountId?: number;
  redemptionType?: FmRedemptionType;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// TYPES - TRADE ENUMS & INTERFACES
// ============================================================================

export type FmTradeStatus = 'PENDING' | 'APPROVED' | 'EXECUTED' | 'SETTLING' | 'SETTLED' | 'CANCELLED' | 'FAILED';
export type FmTradeType = 'BUY' | 'SELL';
export type FmComplianceStatus = 'PASSED' | 'FAILED' | 'OVERRIDDEN' | 'PENDING';

export interface Trade {
  id: number;
  tradeNumber: string;
  fundId: number;
  securityId: number;
  tradeDate: string;
  settlementDate: string | null;
  tradeType: FmTradeType;
  quantity: number;
  price: number;
  grossAmount: number;
  commission: number;
  secFee: number;
  cscsCharge: number;
  stampDuty: number;
  otherFees: number;
  totalFees: number;
  netAmount: number;
  preTradeComplianceStatus: FmComplianceStatus | null;
  shariaComplianceStatus: FmComplianceStatus | null;
  complianceOverrideReason: string | null;
  complianceOverrideBy: number | null;
  status: FmTradeStatus;
  notes: string | null;
  journalEntryId: number | null;
  companyId: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string | null;
  // Joined fields
  securityName?: string;
  securityTicker?: string;
  fundName?: string;
}

export interface TradeStats {
  totalTrades: number;
  pendingCount: number;
  settledCount: number;
  totalBuyAmount: number;
  totalSellAmount: number;
  totalFees: number;
}

export interface CreateTradeDto {
  fundId: number;
  securityId: number;
  tradeDate: string;
  settlementDate?: string;
  tradeType: FmTradeType;
  quantity: number;
  price: number;
  commission?: number;
  secFee?: number;
  cscsCharge?: number;
  stampDuty?: number;
  otherFees?: number;
  notes?: string;
}

export interface ExecuteTradeDto {
  executionPrice?: number;
  executionDate?: string;
  notes?: string;
}

export interface SettleTradeDto {
  settlementReference?: string;
  notes?: string;
}

export interface TradeAllocationDto {
  fundId: number;
  quantity: number;
  amount: number;
}

export interface TradeQuery {
  search?: string;
  status?: FmTradeStatus;
  fundId?: number;
  securityId?: number;
  tradeType?: FmTradeType;
  preTradeComplianceStatus?: FmComplianceStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// SUBSCRIPTIONS API
// ============================================================================

export const subscriptionsApi = {
  list: async (query?: SubscriptionQuery): Promise<PaginatedResponse<Subscription>> => {
    const response = await api.get('/fund-management/subscriptions', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Subscription> => {
    const response = await api.get(`/fund-management/subscriptions/${id}`);
    return response.data;
  },

  create: async (data: CreateSubscriptionDto): Promise<Subscription> => {
    const response = await api.post('/fund-management/subscriptions', data);
    return response.data;
  },

  getStats: async (): Promise<SubscriptionStats> => {
    const response = await api.get('/fund-management/subscriptions/stats');
    return response.data;
  },

  verifyPayment: async (id: number, data: VerifyPaymentDto): Promise<Subscription> => {
    const response = await api.patch(`/fund-management/subscriptions/${id}/verify-payment`, data);
    return response.data;
  },

  approve: async (id: number, data: ApproveSubscriptionDto): Promise<Subscription> => {
    const response = await api.patch(`/fund-management/subscriptions/${id}/approve`, data);
    return response.data;
  },

  allocate: async (id: number, data: AllocateSubscriptionDto): Promise<Subscription> => {
    const response = await api.patch(`/fund-management/subscriptions/${id}/allocate`, data);
    return response.data;
  },

  settle: async (id: number): Promise<Subscription> => {
    const response = await api.patch(`/fund-management/subscriptions/${id}/settle`);
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<Subscription> => {
    const response = await api.patch(`/fund-management/subscriptions/${id}/reject`, { reason });
    return response.data;
  },

  cancel: async (id: number, reason: string): Promise<Subscription> => {
    const response = await api.patch(`/fund-management/subscriptions/${id}/cancel`, { reason });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/subscriptions/${id}`);
  },
};

// ============================================================================
// REDEMPTIONS API
// ============================================================================

export const redemptionsApi = {
  list: async (query?: RedemptionQuery): Promise<PaginatedResponse<Redemption>> => {
    const response = await api.get('/fund-management/redemptions', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Redemption> => {
    const response = await api.get(`/fund-management/redemptions/${id}`);
    return response.data;
  },

  create: async (data: CreateRedemptionDto): Promise<Redemption> => {
    const response = await api.post('/fund-management/redemptions', data);
    return response.data;
  },

  getStats: async (): Promise<RedemptionStats> => {
    const response = await api.get('/fund-management/redemptions/stats');
    return response.data;
  },

  approve: async (id: number, data: ApproveRedemptionDto): Promise<Redemption> => {
    const response = await api.patch(`/fund-management/redemptions/${id}/approve`, data);
    return response.data;
  },

  processPayment: async (id: number, data: ProcessRedemptionPaymentDto): Promise<Redemption> => {
    const response = await api.patch(`/fund-management/redemptions/${id}/process-payment`, data);
    return response.data;
  },

  reject: async (id: number, data: RejectRedemptionDto): Promise<Redemption> => {
    const response = await api.patch(`/fund-management/redemptions/${id}/reject`, data);
    return response.data;
  },

  cancel: async (id: number, reason: string): Promise<Redemption> => {
    const response = await api.patch(`/fund-management/redemptions/${id}/cancel`, { reason });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/redemptions/${id}`);
  },
};

// ============================================================================
// TRADES API
// ============================================================================

export const tradesApi = {
  list: async (query?: TradeQuery): Promise<PaginatedResponse<Trade>> => {
    const response = await api.get('/fund-management/trades', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Trade> => {
    const response = await api.get(`/fund-management/trades/${id}`);
    return response.data;
  },

  create: async (data: CreateTradeDto): Promise<Trade> => {
    const response = await api.post('/fund-management/trades', data);
    return response.data;
  },

  getStats: async (): Promise<TradeStats> => {
    const response = await api.get('/fund-management/trades/stats');
    return response.data;
  },

  approve: async (id: number): Promise<Trade> => {
    const response = await api.patch(`/fund-management/trades/${id}/approve`);
    return response.data;
  },

  overrideCompliance: async (id: number, reason: string): Promise<Trade> => {
    const response = await api.patch(`/fund-management/trades/${id}/override-compliance`, { reason });
    return response.data;
  },

  execute: async (id: number, data?: ExecuteTradeDto): Promise<Trade> => {
    const response = await api.patch(`/fund-management/trades/${id}/execute`, data || {});
    return response.data;
  },

  settle: async (id: number, data?: SettleTradeDto): Promise<Trade> => {
    const response = await api.patch(`/fund-management/trades/${id}/settle`, data || {});
    return response.data;
  },

  cancel: async (id: number, reason: string): Promise<Trade> => {
    const response = await api.patch(`/fund-management/trades/${id}/cancel`, { reason });
    return response.data;
  },

  allocateBlockTrade: async (id: number, allocations: TradeAllocationDto[]): Promise<void> => {
    await api.post(`/fund-management/trades/${id}/allocate`, allocations);
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/trades/${id}`);
  },
};

// ============================================================================
// TYPES - NAV ENUMS & INTERFACES
// ============================================================================

export type FmNavStatus = 'DRAFT' | 'VERIFIED' | 'PUBLISHED';
export type FmAccrualType = 'INTEREST_INCOME' | 'MANAGEMENT_FEE' | 'PERFORMANCE_FEE' | 'ADMIN_FEE';

export interface NavCalculation {
  id: number;
  fundId: number;
  navDate: string;
  totalInvestments: number;
  totalCash: number;
  totalAccruals: number;
  totalFees: number;
  totalLiabilities: number;
  netAssets: number;
  unitsOutstanding: number;
  navPerUnit: number;
  accruedInterest: number;
  accruedManagementFee: number;
  accruedPerformanceFee: number;
  dailyReturn: number | null;
  mtdReturn: number | null;
  qtdReturn: number | null;
  ytdReturn: number | null;
  inceptionReturn: number | null;
  status: FmNavStatus;
  verifiedBy: number | null;
  verifiedAt: string | null;
  publishedBy: number | null;
  publishedAt: string | null;
  notes: string | null;
  companyId: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string | null;
  fundName?: string;
  fundCode?: string;
}

export interface NavSummary {
  fundId: number;
  fundName: string;
  fundCode: string;
  latestNavPerUnit: number | null;
  latestNavDate: string | null;
  totalAum: number;
  dailyReturn: number | null;
  mtdReturn: number | null;
  ytdReturn: number | null;
}

export interface NavHistoryItem {
  navDate: string;
  navPerUnit: number;
  netAssets: number;
  dailyReturn: number | null;
}

export interface PriceValidationResult {
  securityId: number;
  securityName: string;
  ticker: string;
  lastPriceDate: string | null;
  currentPrice: number | null;
  isStale: boolean;
  staleDays: number;
}

export interface NavStats {
  totalCalculations: number;
  draftCount: number;
  verifiedCount: number;
  publishedCount: number;
  latestNavDate: string | null;
}

export interface CalculateNavDto {
  fundId: number;
  navDate: string;
  notes?: string;
}

export interface NavQuery {
  fundId?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: FmNavStatus;
  page?: number;
  limit?: number;
}

// ============================================================================
// TYPES - COMPLIANCE ENUMS & INTERFACES
// ============================================================================

export type FmComplianceRuleType = 'CONCENTRATION_LIMIT' | 'SECTOR_LIMIT' | 'ASSET_CLASS_LIMIT' | 'ISSUER_LIMIT' | 'LIQUIDITY_LIMIT' | 'CURRENCY_LIMIT' | 'SUKUK_LIMIT';
export type FmComplianceScope = 'FUND' | 'ALL_FUNDS' | 'PENCOM';
export type FmComplianceOperator = 'LTE' | 'GTE' | 'EQ' | 'BETWEEN';
export type FmComplianceCheckStatus = 'PASSED' | 'FAILED' | 'OVERRIDDEN';

export interface ComplianceRule {
  id: number;
  ruleName: string;
  ruleType: FmComplianceRuleType;
  scope: FmComplianceScope;
  fundId: number | null;
  fundName?: string;
  ruleValue: Record<string, unknown>;
  operator: FmComplianceOperator;
  isActive: boolean;
  companyId: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ComplianceCheck {
  id: number;
  fundId: number;
  tradeId: number | null;
  checkDate: string;
  ruleId: number;
  ruleName?: string;
  ruleType?: string;
  fundName?: string;
  status: FmComplianceCheckStatus;
  details: Record<string, unknown>;
  overrideReason: string | null;
  overrideBy: number | null;
  companyId: number;
  createdAt: string;
}

export interface ComplianceDashboard {
  totalRules: number;
  activeRules: number;
  totalChecks: number;
  passedCount: number;
  failedCount: number;
  overriddenCount: number;
  recentBreaches: Array<{
    checkId: number;
    ruleName: string;
    fundName: string;
    checkDate: string;
    status: string;
  }>;
}

export interface CreateComplianceRuleDto {
  ruleName: string;
  ruleType: FmComplianceRuleType;
  scope: FmComplianceScope;
  fundId?: number;
  ruleValue: Record<string, unknown>;
  operator: FmComplianceOperator;
  isActive?: boolean;
}

export interface UpdateComplianceRuleDto {
  ruleName?: string;
  ruleType?: FmComplianceRuleType;
  scope?: FmComplianceScope;
  fundId?: number;
  ruleValue?: Record<string, unknown>;
  operator?: FmComplianceOperator;
  isActive?: boolean;
}

export interface ComplianceRuleQuery {
  search?: string;
  ruleType?: FmComplianceRuleType;
  scope?: FmComplianceScope;
  fundId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface ComplianceCheckQuery {
  fundId?: number;
  tradeId?: number;
  ruleId?: number;
  status?: FmComplianceCheckStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// TYPES - SHARIAH ENUMS & INTERFACES
// ============================================================================

export type FmShariaScreeningResult = 'PASS' | 'FAIL' | 'WATCH';
export type FmBoardDecisionType = 'APPROVAL' | 'REJECTION' | 'REVIEW' | 'FATWA' | 'GUIDELINE';
export type FmPurificationStatus = 'CALCULATED' | 'DISTRIBUTED' | 'PAID';

export interface ShariaScreening {
  id: number;
  securityId: number;
  securityName?: string;
  securityTicker?: string;
  screeningDate: string;
  businessActivityResult: FmShariaScreeningResult;
  debtRatioResult: FmShariaScreeningResult | null;
  cashRatioResult: FmShariaScreeningResult | null;
  receivablesRatioResult: FmShariaScreeningResult | null;
  interestIncomeResult: FmShariaScreeningResult | null;
  overallResult: FmShariaScreeningResult;
  debtRatio: number | null;
  cashRatio: number | null;
  receivablesRatio: number | null;
  interestIncomeRatio: number | null;
  notes: string | null;
  validUntil: string | null;
  companyId: number;
  createdAt: string;
}

export interface ScreeningQueueItem {
  id: number;
  name: string;
  ticker: string;
  assetClass: string;
  lastScreeningDate: string | null;
  validUntil: string | null;
}

export interface ShariaBoardDecision {
  id: number;
  fundId: number | null;
  securityId: number | null;
  fundName?: string;
  securityName?: string;
  decisionDate: string;
  decisionType: FmBoardDecisionType;
  description: string;
  effectiveDate: string | null;
  validityPeriod: number | null;
  documentUrl: string | null;
  companyId: number;
  createdAt: string;
}

export interface PurificationRecord {
  id: number;
  fundId: number;
  investorAccountId: number | null;
  fundName?: string;
  investorName?: string;
  periodStart: string;
  periodEnd: string;
  nonPermissibleIncome: number;
  purificationRatio: number;
  purificationAmount: number;
  status: FmPurificationStatus;
  notes: string | null;
  companyId: number;
  createdAt: string;
}

export interface PurificationSummary {
  fundId: number;
  fundName: string;
  totalNonPermissible: number;
  totalPurification: number;
  investorCount: number;
  periodStart: string;
  periodEnd: string;
}

export interface CreateShariaScreeningDto {
  securityId: number;
  screeningDate: string;
  businessActivityResult: FmShariaScreeningResult;
  debtRatio?: number;
  cashRatio?: number;
  receivablesRatio?: number;
  interestIncomeRatio?: number;
  notes?: string;
  validUntil?: string;
}

export interface ShariaScreeningQuery {
  securityId?: number;
  overallResult?: FmShariaScreeningResult;
  dateFrom?: string;
  dateTo?: string;
  includeExpired?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateBoardDecisionDto {
  fundId?: number;
  securityId?: number;
  decisionDate: string;
  decisionType: FmBoardDecisionType;
  description: string;
  effectiveDate?: string;
  validityPeriod?: number;
  documentUrl?: string;
}

export interface BoardDecisionQuery {
  fundId?: number;
  securityId?: number;
  decisionType?: FmBoardDecisionType;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface CalculatePurificationDto {
  fundId: number;
  periodStart: string;
  periodEnd: string;
}

export interface PurificationQuery {
  fundId?: number;
  investorAccountId?: number;
  status?: FmPurificationStatus;
  periodStart?: string;
  periodEnd?: string;
  page?: number;
  limit?: number;
}

export interface PriceImportItem {
  securityId: number;
  priceDate: string;
  price: number;
  source: string;
}

export interface PriceImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface StalePriceItem {
  securityId: number;
  name: string;
  ticker: string;
  lastPriceDate: string | null;
  staleDays: number;
}

// ============================================================================
// NAV API
// ============================================================================

export const navApi = {
  calculate: async (data: CalculateNavDto): Promise<NavCalculation> => {
    const response = await api.post('/fund-management/nav/calculate', data);
    return response.data;
  },

  list: async (query?: NavQuery): Promise<PaginatedResponse<NavCalculation>> => {
    const response = await api.get('/fund-management/nav', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<NavCalculation> => {
    const response = await api.get(`/fund-management/nav/${id}`);
    return response.data;
  },

  getStats: async (): Promise<NavStats> => {
    const response = await api.get('/fund-management/nav/stats');
    return response.data;
  },

  getSummaries: async (): Promise<NavSummary[]> => {
    const response = await api.get('/fund-management/nav/summaries');
    return response.data;
  },

  validatePrices: async (fundId: number, navDate?: string): Promise<PriceValidationResult[]> => {
    const response = await api.get(`/fund-management/nav/validate-prices/${fundId}`, { params: { navDate } });
    return response.data;
  },

  getLatestByFund: async (fundId: number): Promise<NavCalculation> => {
    const response = await api.get(`/fund-management/nav/fund/${fundId}/latest`);
    return response.data;
  },

  getHistory: async (fundId: number, dateFrom?: string, dateTo?: string): Promise<NavHistoryItem[]> => {
    const response = await api.get(`/fund-management/nav/fund/${fundId}/history`, { params: { dateFrom, dateTo } });
    return response.data;
  },

  verify: async (id: number, notes?: string): Promise<NavCalculation> => {
    const response = await api.patch(`/fund-management/nav/${id}/verify`, { notes });
    return response.data;
  },

  publish: async (id: number, notes?: string): Promise<NavCalculation> => {
    const response = await api.patch(`/fund-management/nav/${id}/publish`, { notes });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/nav/${id}`);
  },
};

// ============================================================================
// COMPLIANCE API
// ============================================================================

export const complianceApi = {
  // Rules
  listRules: async (query?: ComplianceRuleQuery): Promise<PaginatedResponse<ComplianceRule>> => {
    const response = await api.get('/fund-management/compliance/rules', { params: query });
    return response.data;
  },

  getRule: async (id: number): Promise<ComplianceRule> => {
    const response = await api.get(`/fund-management/compliance/rules/${id}`);
    return response.data;
  },

  createRule: async (data: CreateComplianceRuleDto): Promise<ComplianceRule> => {
    const response = await api.post('/fund-management/compliance/rules', data);
    return response.data;
  },

  updateRule: async (id: number, data: UpdateComplianceRuleDto): Promise<ComplianceRule> => {
    const response = await api.patch(`/fund-management/compliance/rules/${id}`, data);
    return response.data;
  },

  deleteRule: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/compliance/rules/${id}`);
  },

  toggleRule: async (id: number): Promise<ComplianceRule> => {
    const response = await api.patch(`/fund-management/compliance/rules/${id}/toggle`);
    return response.data;
  },

  // Dashboard & Checks
  getDashboard: async (): Promise<ComplianceDashboard> => {
    const response = await api.get('/fund-management/compliance/dashboard');
    return response.data;
  },

  getChecks: async (query?: ComplianceCheckQuery): Promise<PaginatedResponse<ComplianceCheck>> => {
    const response = await api.get('/fund-management/compliance/checks', { params: query });
    return response.data;
  },

  getRulesForFund: async (fundId: number): Promise<ComplianceRule[]> => {
    const response = await api.get(`/fund-management/compliance/fund/${fundId}/rules`);
    return response.data;
  },

  seedPencom: async (): Promise<{ seeded: number; skipped: number; fundTypes: string[] }> => {
    const response = await api.post('/fund-management/compliance/seed-pencom');
    return response.data;
  },
};

// ============================================================================
// SHARIAH API
// ============================================================================

export const shariaApi = {
  // Screenings
  listScreenings: async (query?: ShariaScreeningQuery): Promise<PaginatedResponse<ShariaScreening>> => {
    const response = await api.get('/fund-management/sharia/screenings', { params: query });
    return response.data;
  },

  getScreening: async (id: number): Promise<ShariaScreening> => {
    const response = await api.get(`/fund-management/sharia/screenings/${id}`);
    return response.data;
  },

  createScreening: async (data: CreateShariaScreeningDto): Promise<ShariaScreening> => {
    const response = await api.post('/fund-management/sharia/screenings', data);
    return response.data;
  },

  getScreeningQueue: async (): Promise<ScreeningQueueItem[]> => {
    const response = await api.get('/fund-management/sharia/screenings/queue');
    return response.data;
  },

  getLatestScreening: async (securityId: number): Promise<ShariaScreening> => {
    const response = await api.get(`/fund-management/sharia/screenings/security/${securityId}/latest`);
    return response.data;
  },

  // Board Decisions
  listDecisions: async (query?: BoardDecisionQuery): Promise<PaginatedResponse<ShariaBoardDecision>> => {
    const response = await api.get('/fund-management/sharia/decisions', { params: query });
    return response.data;
  },

  getDecision: async (id: number): Promise<ShariaBoardDecision> => {
    const response = await api.get(`/fund-management/sharia/decisions/${id}`);
    return response.data;
  },

  createDecision: async (data: CreateBoardDecisionDto): Promise<ShariaBoardDecision> => {
    const response = await api.post('/fund-management/sharia/decisions', data);
    return response.data;
  },

  getDecisionsForSecurity: async (securityId: number): Promise<ShariaBoardDecision[]> => {
    const response = await api.get(`/fund-management/sharia/decisions/security/${securityId}`);
    return response.data;
  },

  getDecisionsForFund: async (fundId: number): Promise<ShariaBoardDecision[]> => {
    const response = await api.get(`/fund-management/sharia/decisions/fund/${fundId}`);
    return response.data;
  },

  // Purification
  calculatePurification: async (data: CalculatePurificationDto): Promise<PurificationSummary> => {
    const response = await api.post('/fund-management/sharia/purification/calculate', data);
    return response.data;
  },

  listPurification: async (query?: PurificationQuery): Promise<PaginatedResponse<PurificationRecord>> => {
    const response = await api.get('/fund-management/sharia/purification', { params: query });
    return response.data;
  },

  getPurification: async (id: number): Promise<PurificationRecord> => {
    const response = await api.get(`/fund-management/sharia/purification/${id}`);
    return response.data;
  },

  getPurificationSummary: async (fundId: number, periodStart: string, periodEnd: string): Promise<PurificationSummary> => {
    const response = await api.get(`/fund-management/sharia/purification/fund/${fundId}/summary`, { params: { periodStart, periodEnd } });
    return response.data;
  },

  getPurificationHistory: async (fundId: number): Promise<PurificationRecord[]> => {
    const response = await api.get(`/fund-management/sharia/purification/fund/${fundId}/history`);
    return response.data;
  },

  markPurificationDistributed: async (recordIds: number[]): Promise<void> => {
    await api.patch('/fund-management/sharia/purification/mark-distributed', { recordIds });
  },

  markPurificationPaid: async (recordIds: number[]): Promise<void> => {
    await api.patch('/fund-management/sharia/purification/mark-paid', { recordIds });
  },

  // Price Feeds
  importPrices: async (prices: PriceImportItem[]): Promise<PriceImportResult> => {
    const response = await api.post('/fund-management/sharia/prices/import', prices);
    return response.data;
  },

  importPricesCsv: async (csvData: string): Promise<PriceImportResult> => {
    const response = await api.post('/fund-management/sharia/prices/import-csv', { csvData });
    return response.data;
  },

  getStalePrices: async (staleDays?: number): Promise<StalePriceItem[]> => {
    const response = await api.get('/fund-management/sharia/prices/stale', { params: { staleDays } });
    return response.data;
  },

  verifyPrice: async (priceId: number): Promise<void> => {
    await api.patch(`/fund-management/sharia/prices/${priceId}/verify`);
  },

  getUnverifiedPrices: async (page?: number, limit?: number): Promise<PaginatedResponse<SecurityPrice>> => {
    const response = await api.get('/fund-management/sharia/prices/unverified', { params: { page, limit } });
    return response.data;
  },

  getPriceHistory: async (securityId: number, dateFrom?: string, dateTo?: string): Promise<SecurityPrice[]> => {
    const response = await api.get(`/fund-management/sharia/prices/security/${securityId}/history`, { params: { dateFrom, dateTo } });
    return response.data;
  },
};

// ============================================================================
// FEE CALCULATIONS
// ============================================================================

export type FmFeeType = 'MANAGEMENT' | 'PERFORMANCE' | 'ADMIN' | 'CUSTODY' | 'TRUSTEESHIP' | 'AUDIT';
export type FmFeeStatus = 'ACCRUED' | 'INVOICED' | 'PAID' | 'WAIVED';

export interface FeeCalculation {
  id: number;
  fundId: number;
  fundName: string;
  feeType: FmFeeType;
  periodStart: string;
  periodEnd: string;
  baseAmount: number;
  rate: number;
  calculatedAmount: number;
  currency: string;
  performanceFeeMethod?: FmPerformanceFeeMethod;
  highWaterMark?: number;
  hurdleRate?: number;
  excessReturn?: number;
  status: FmFeeStatus;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  paymentDate?: string;
  paymentReference?: string;
  journalEntryId?: number;
  notes?: string;
  createdAt: string;
}

export interface FeeStats {
  totalAccrued: number;
  totalInvoiced: number;
  totalPaid: number;
  totalWaived: number;
  currency: string;
  byType: Array<{ feeType: FmFeeType; amount: number }>;
}

export interface CalculateFeeDto {
  fundId: number;
  feeType: FmFeeType;
  periodStart: string;
  periodEnd: string;
  notes?: string;
}

export interface CreateFeeInvoiceDto {
  invoiceDate: string;
  dueDate: string;
  invoiceNumber?: string;
  notes?: string;
}

export interface PayFeeDto {
  paymentDate: string;
  paymentReference?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface WaiveFeeDto {
  reason: string;
  approvedBy?: number;
}

export interface FeeQuery {
  fundId?: number;
  feeType?: FmFeeType;
  status?: FmFeeStatus;
  periodStart?: string;
  periodEnd?: string;
  page?: number;
  limit?: number;
}

export const feesApi = {
  getStats: async (): Promise<FeeStats> => {
    const response = await api.get('/fund-management/fees/stats');
    return response.data;
  },
  list: async (query?: FeeQuery): Promise<PaginatedResponse<FeeCalculation>> => {
    const response = await api.get('/fund-management/fees', { params: query });
    return response.data;
  },
  calculate: async (data: CalculateFeeDto): Promise<FeeCalculation> => {
    const response = await api.post('/fund-management/fees/calculate', data);
    return response.data;
  },
  get: async (id: number): Promise<FeeCalculation> => {
    const response = await api.get(`/fund-management/fees/${id}`);
    return response.data;
  },
  getAccruedForFund: async (fundId: number): Promise<FeeCalculation[]> => {
    const response = await api.get(`/fund-management/fees/fund/${fundId}/accrued`);
    return response.data;
  },
  createInvoice: async (id: number, data: CreateFeeInvoiceDto): Promise<FeeCalculation> => {
    const response = await api.patch(`/fund-management/fees/${id}/invoice`, data);
    return response.data;
  },
  pay: async (id: number, data: PayFeeDto): Promise<FeeCalculation> => {
    const response = await api.patch(`/fund-management/fees/${id}/pay`, data);
    return response.data;
  },
  waive: async (id: number, data: WaiveFeeDto): Promise<FeeCalculation> => {
    const response = await api.patch(`/fund-management/fees/${id}/waive`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/fees/${id}`);
  },
};

// ============================================================================
// DISTRIBUTIONS
// ============================================================================

export type FmDistributionType = 'DIVIDEND' | 'INTEREST' | 'CAPITAL_GAIN' | 'RETURN_OF_CAPITAL';
export type FmDistributionStatus = 'DECLARED' | 'RECORD_DATE_SET' | 'ALLOCATED' | 'APPROVED' | 'PAID' | 'CANCELLED';

export interface Distribution {
  id: number;
  fundId: number;
  fundName: string;
  distributionNumber: string;
  distributionType: FmDistributionType;
  totalAmount: number;
  currency: string;
  amountPerUnit?: number;
  totalUnitsAtRecord?: number;
  declarationDate: string;
  recordDate: string;
  exDate: string;
  paymentDate: string;
  whtRate?: number;
  totalWht?: number;
  netAmount?: number;
  isPurificationDistribution: boolean;
  purificationAmount?: number;
  status: FmDistributionStatus;
  journalEntryId?: number;
  investorAllocations?: DistributionAllocation[];
  notes?: string;
  createdAt: string;
  // Projected vs actual tracking
  projectedProfit?: number | null;
  varianceAmount?: number | null;
  variancePct?: number | null;
  periodDays?: number | null;
  fundProjectedRate?: number | null;
  fundAumAtDeclaration?: number | null;
}

export interface DistributionAllocation {
  investorAccountId: number;
  investorName: string;
  accountNumber: string;
  unitsHeld: number;
  grossAmount: number;
  whtAmount: number;
  purificationDeduction: number;
  netAmount: number;
  paymentStatus: string;
}

export interface DistributionStats {
  totalDeclared: number;
  totalPaid: number;
  totalPending: number;
  currency: string;
  byType: Array<{ distributionType: FmDistributionType; amount: number; count: number }>;
}

export interface DeclareDistributionDto {
  fundId: number;
  distributionType: FmDistributionType;
  totalAmount: number;
  currency: string;
  declarationDate: string;
  recordDate: string;
  exDate: string;
  paymentDate: string;
  amountPerUnit?: number;
  whtRate?: number;
  isPurificationDistribution?: boolean;
  notes?: string;
}

export interface DistributionQuery {
  fundId?: number;
  distributionType?: FmDistributionType;
  status?: FmDistributionStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const distributionsApi = {
  getStats: async (): Promise<DistributionStats> => {
    const response = await api.get('/fund-management/distributions/stats');
    return response.data;
  },
  list: async (query?: DistributionQuery): Promise<PaginatedResponse<Distribution>> => {
    const response = await api.get('/fund-management/distributions', { params: query });
    return response.data;
  },
  declare: async (data: DeclareDistributionDto): Promise<Distribution> => {
    const response = await api.post('/fund-management/distributions', data);
    return response.data;
  },
  get: async (id: number): Promise<Distribution> => {
    const response = await api.get(`/fund-management/distributions/${id}`);
    return response.data;
  },
  allocate: async (id: number, notes?: string): Promise<Distribution> => {
    const response = await api.patch(`/fund-management/distributions/${id}/allocate`, { notes });
    return response.data;
  },
  approve: async (id: number, notes?: string): Promise<Distribution> => {
    const response = await api.patch(`/fund-management/distributions/${id}/approve`, { notes });
    return response.data;
  },
  processPayment: async (id: number, data?: { paymentReference?: string; paymentMethod?: string; notes?: string }): Promise<Distribution> => {
    const response = await api.patch(`/fund-management/distributions/${id}/pay`, data);
    return response.data;
  },
  cancel: async (id: number): Promise<Distribution> => {
    const response = await api.patch(`/fund-management/distributions/${id}/cancel`);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/distributions/${id}`);
  },
};

// ============================================================================
// REPORTING
// ============================================================================

export interface InvestorStatement {
  investorName: string;
  accountNumber: string;
  fundName: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: { units: number; navPerUnit: number; marketValue: number };
  transactions: Array<{
    date: string;
    type: string;
    description: string;
    units: number;
    amount: number;
    navPerUnit: number;
    balance: number;
  }>;
  fees: Array<{ type: string; amount: number }>;
  distributions: Array<{ date: string; type: string; grossAmount: number; wht: number; net: number }>;
  purification?: { totalAmount: number; distributed: number; pending: number };
  closingBalance: { units: number; navPerUnit: number; marketValue: number };
  periodReturn: number;
  unrealisedGain: number;
}

export interface StatementQueryDto {
  investorAccountId: number;
  fundId: number;
  periodStart: string;
  periodEnd: string;
  includeUnrealisedGains?: boolean;
}

export interface PerformanceReport {
  fundName: string;
  fundId: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  returns: {
    daily: number;
    mtd: number;
    qtd: number;
    ytd: number;
    oneYear: number;
    threeYear: number;
    fiveYear: number;
    sinceInception: number;
  };
  benchmarkReturns?: {
    daily: number;
    mtd: number;
    qtd: number;
    ytd: number;
    oneYear: number;
    threeYear: number;
    fiveYear: number;
    sinceInception: number;
  };
  riskMetrics?: {
    volatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    alpha: number;
    beta: number;
    trackingError: number;
    informationRatio: number;
    maxDrawdown: number;
    maxDrawdownDate: string;
  };
  navHistory: Array<{ date: string; nav: number; navPerUnit: number }>;
  attribution: {
    sectorAllocation: Array<{ name: string; weight: number }>;
    assetClassAllocation: Array<{ name: string; weight: number }>;
  };
}

export interface PerformanceQueryDto {
  fundId: number;
  periodStart: string;
  periodEnd: string;
  benchmarkId?: number;
  includeRiskMetrics?: boolean;
}

export interface RegulatoryReturn {
  fundName: string;
  fundId: number;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  aum: number;
  aumCurrency: string;
  fundPerformance: number;
  investorCount: number;
  topHoldings: Array<{ securityName: string; ticker: string; weight: number; marketValue: number }>;
  sectorAllocation: Array<{ sector: string; weight: number }>;
  assetClassAllocation: Array<{ assetClass: string; weight: number }>;
  complianceStatus: { totalRules: number; passed: number; breached: number; warnings: number };
  cashAllocation: number;
  equityAllocation: number;
  fixedIncomeAllocation: number;
}

export interface RegulatoryReturnQueryDto {
  fundId: number;
  reportType: 'QUARTERLY' | 'ANNUAL';
  periodStart: string;
  periodEnd: string;
}

export interface StatementPeriod {
  label: string;
  periodStart: string;
  periodEnd: string;
}

export interface ReturnSeriesPoint {
  date: string;
  navPerUnit: number;
}

export const reportsApi = {
  generateStatement: async (data: StatementQueryDto): Promise<InvestorStatement> => {
    const response = await api.post('/fund-management/reports/investor-statement', data);
    return response.data;
  },
  getStatementPeriods: async (investorAccountId: number, fundId: number): Promise<StatementPeriod[]> => {
    const response = await api.get('/fund-management/reports/investor-statement/periods', { params: { investorAccountId, fundId } });
    return response.data;
  },
  generatePerformanceReport: async (data: PerformanceQueryDto): Promise<PerformanceReport> => {
    const response = await api.post('/fund-management/reports/performance', data);
    return response.data;
  },
  getReturnSeries: async (fundId: number, startDate: string, endDate: string): Promise<ReturnSeriesPoint[]> => {
    const response = await api.get('/fund-management/reports/performance/return-series', { params: { fundId, startDate, endDate } });
    return response.data;
  },
  generateRegulatoryReturn: async (data: RegulatoryReturnQueryDto): Promise<RegulatoryReturn> => {
    const response = await api.post('/fund-management/reports/regulatory-return', data);
    return response.data;
  },
  getAvailablePeriods: async (fundId: number): Promise<StatementPeriod[]> => {
    const response = await api.get('/fund-management/reports/regulatory-return/periods', { params: { fundId } });
    return response.data;
  },
};

// ============================================================================
// RECONCILIATION
// ============================================================================

export type FmReconciliationStatus = 'PENDING' | 'IN_PROGRESS' | 'MATCHED' | 'COMPLETED' | 'FAILED';
export type FmExceptionType = 'HOLDING_MISMATCH' | 'CASH_MISMATCH' | 'MISSING_INTERNAL' | 'MISSING_CUSTODIAN' | 'PRICE_DIFFERENCE' | 'QUANTITY_DIFFERENCE';
export type FmExceptionStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ACCEPTED';

export interface Reconciliation {
  id: number;
  fundId: number;
  fundName: string;
  custodianId: number;
  custodianName: string;
  reconciliationDate: string;
  status: FmReconciliationStatus;
  totalHoldings: number;
  matchedHoldings: number;
  unmatchedHoldings: number;
  totalCashAccounts: number;
  matchedCash: number;
  unmatchedCash: number;
  exceptions: number;
  importedFile?: string;
  notes?: string;
  createdAt: string;
}

export interface ReconciliationException {
  id: number;
  reconciliationId: number;
  exceptionType: FmExceptionType;
  securityName?: string;
  ticker?: string;
  isin?: string;
  internalQuantity?: number;
  custodianQuantity?: number;
  quantityDifference?: number;
  internalValue?: number;
  custodianValue?: number;
  valueDifference?: number;
  accountName?: string;
  internalBalance?: number;
  custodianBalance?: number;
  balanceDifference?: number;
  status: FmExceptionStatus;
  resolution?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface ReconciliationStats {
  totalReconciliations: number;
  completed: number;
  pending: number;
  failed: number;
  openExceptions: number;
  resolvedExceptions: number;
  matchRate: number;
}

export interface ReconciliationSummary {
  holdingMatches: Array<{ securityName: string; ticker: string; isin: string; internalQty: number; custodianQty: number; matched: boolean; difference: number }>;
  cashMatches: Array<{ accountName: string; currency: string; internalBalance: number; custodianBalance: number; matched: boolean; difference: number }>;
  exceptions: Record<string, number>;
}

export interface ReconciliationQuery {
  fundId?: number;
  custodianId?: number;
  status?: FmReconciliationStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ExceptionQuery {
  reconciliationId?: number;
  exceptionType?: FmExceptionType;
  exceptionStatus?: FmExceptionStatus;
  page?: number;
  limit?: number;
}

export const reconciliationApi = {
  getStats: async (): Promise<ReconciliationStats> => {
    const response = await api.get('/fund-management/reconciliation/stats');
    return response.data;
  },
  list: async (query?: ReconciliationQuery): Promise<PaginatedResponse<Reconciliation>> => {
    const response = await api.get('/fund-management/reconciliation', { params: query });
    return response.data;
  },
  create: async (data: { fundId: number; custodianId: number; reconciliationDate: string; notes?: string }): Promise<Reconciliation> => {
    const response = await api.post('/fund-management/reconciliation', data);
    return response.data;
  },
  get: async (id: number): Promise<Reconciliation> => {
    const response = await api.get(`/fund-management/reconciliation/${id}`);
    return response.data;
  },
  getSummary: async (id: number): Promise<ReconciliationSummary> => {
    const response = await api.get(`/fund-management/reconciliation/${id}/summary`);
    return response.data;
  },
  importFile: async (id: number, data: { fileContent: string; fileFormat: string; fileName: string }): Promise<Reconciliation> => {
    const response = await api.post(`/fund-management/reconciliation/${id}/import`, data);
    return response.data;
  },
  runMatching: async (id: number, data?: { holdingTolerance?: number; cashTolerance?: number; priceTolerance?: number; notes?: string }): Promise<ReconciliationSummary> => {
    const response = await api.post(`/fund-management/reconciliation/${id}/match`, data);
    return response.data;
  },
  complete: async (id: number): Promise<Reconciliation> => {
    const response = await api.patch(`/fund-management/reconciliation/${id}/complete`);
    return response.data;
  },
  getExceptions: async (query?: ExceptionQuery): Promise<PaginatedResponse<ReconciliationException>> => {
    const response = await api.get('/fund-management/reconciliation/exceptions', { params: query });
    return response.data;
  },
  resolveException: async (exceptionId: number, data: { resolution: string; adjustmentAmount?: number; notes: string }): Promise<ReconciliationException> => {
    const response = await api.patch(`/fund-management/reconciliation/exceptions/${exceptionId}/resolve`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/reconciliation/${id}`);
  },
};

// ============================================================================
// PRIVATE EQUITY
// ============================================================================

export type FmCommitmentStatus = 'ACTIVE' | 'FULLY_CALLED' | 'DEFAULTED' | 'WITHDRAWN';
export type FmCapitalCallStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERDUE' | 'CANCELLED';
export type FmCallPaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'DEFAULTED';

export interface Commitment {
  id: number;
  fundId: number;
  fundName: string;
  investorAccountId: number;
  investorName: string;
  accountNumber: string;
  commitmentAmount: number;
  calledAmount: number;
  uncalledAmount: number;
  paidAmount: number;
  currency: string;
  commitmentDate: string;
  expiryDate?: string;
  status: FmCommitmentStatus;
  percentageCalled: number;
  notes?: string;
  createdAt: string;
}

export interface CapitalCallItem {
  investorAccountId: number;
  investorName: string;
  accountNumber: string;
  commitmentAmount: number;
  uncalledBefore: number;
  callAmount: number;
  amountPaid: number;
  paymentStatus: FmCallPaymentStatus;
  paymentDate?: string;
  paymentReference?: string;
}

export interface CapitalCall {
  id: number;
  fundId: number;
  fundName: string;
  callNumber: string;
  callDate: string;
  dueDate: string;
  callPercentage?: number;
  totalCallAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  currency: string;
  purpose: string;
  status: FmCapitalCallStatus;
  journalEntryId?: number;
  notes?: string;
  callItems?: CapitalCallItem[];
  createdAt: string;
}

export interface CommitmentStats {
  totalCommitments: number;
  totalCommitted: number;
  totalCalled: number;
  totalUncalled: number;
  totalPaid: number;
  currency: string;
  activeCommitments: number;
  fullyCalledCommitments: number;
  defaultedCommitments: number;
}

export interface CapitalCallStats {
  totalCalls: number;
  totalCalled: number;
  totalPaid: number;
  totalOutstanding: number;
  currency: string;
  draftCalls: number;
  issuedCalls: number;
  fullyPaidCalls: number;
  overdueCalls: number;
}

export interface CommitmentQuery {
  fundId?: number;
  investorAccountId?: number;
  status?: FmCommitmentStatus;
  page?: number;
  limit?: number;
}

export interface CapitalCallQuery {
  fundId?: number;
  status?: FmCapitalCallStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const commitmentsApi = {
  getStats: async (): Promise<CommitmentStats> => {
    const response = await api.get('/fund-management/private-equity/commitments/stats');
    return response.data;
  },
  list: async (query?: CommitmentQuery): Promise<PaginatedResponse<Commitment>> => {
    const response = await api.get('/fund-management/private-equity/commitments', { params: query });
    return response.data;
  },
  create: async (data: { fundId: number; investorAccountId: number; commitmentAmount: number; currency: string; commitmentDate: string; expiryDate?: string; notes?: string }): Promise<Commitment> => {
    const response = await api.post('/fund-management/private-equity/commitments', data);
    return response.data;
  },
  get: async (id: number): Promise<Commitment> => {
    const response = await api.get(`/fund-management/private-equity/commitments/${id}`);
    return response.data;
  },
  update: async (id: number, data: { commitmentAmount?: number; expiryDate?: string; notes?: string }): Promise<Commitment> => {
    const response = await api.patch(`/fund-management/private-equity/commitments/${id}`, data);
    return response.data;
  },
  getByFund: async (fundId: number): Promise<Commitment[]> => {
    const response = await api.get(`/fund-management/private-equity/commitments/fund/${fundId}`);
    return response.data;
  },
  getByInvestor: async (investorAccountId: number): Promise<Commitment[]> => {
    const response = await api.get(`/fund-management/private-equity/commitments/investor/${investorAccountId}`);
    return response.data;
  },
  markDefault: async (id: number): Promise<Commitment> => {
    const response = await api.patch(`/fund-management/private-equity/commitments/${id}/default`);
    return response.data;
  },
  withdraw: async (id: number): Promise<Commitment> => {
    const response = await api.patch(`/fund-management/private-equity/commitments/${id}/withdraw`);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/private-equity/commitments/${id}`);
  },
};

export const capitalCallsApi = {
  getStats: async (): Promise<CapitalCallStats> => {
    const response = await api.get('/fund-management/private-equity/calls/stats');
    return response.data;
  },
  list: async (query?: CapitalCallQuery): Promise<PaginatedResponse<CapitalCall>> => {
    const response = await api.get('/fund-management/private-equity/calls', { params: query });
    return response.data;
  },
  create: async (data: { fundId: number; callDate: string; dueDate: string; callPercentage?: number; callAmount?: number; purpose: string; notes?: string }): Promise<CapitalCall> => {
    const response = await api.post('/fund-management/private-equity/calls', data);
    return response.data;
  },
  get: async (id: number): Promise<CapitalCall> => {
    const response = await api.get(`/fund-management/private-equity/calls/${id}`);
    return response.data;
  },
  issue: async (id: number, notes?: string): Promise<CapitalCall> => {
    const response = await api.patch(`/fund-management/private-equity/calls/${id}/issue`, { notes });
    return response.data;
  },
  recordPayment: async (id: number, data: { investorAccountId: number; amountPaid: number; paymentDate: string; paymentReference?: string; notes?: string }): Promise<CapitalCall> => {
    const response = await api.post(`/fund-management/private-equity/calls/${id}/payment`, data);
    return response.data;
  },
  checkOverdue: async (): Promise<CapitalCall[]> => {
    const response = await api.post('/fund-management/private-equity/calls/check-overdue');
    return response.data;
  },
  cancel: async (id: number): Promise<CapitalCall> => {
    const response = await api.patch(`/fund-management/private-equity/calls/${id}/cancel`);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/private-equity/calls/${id}`);
  },
};

// ============================================================================
// CREDIT FACILITY TYPES API
// ============================================================================

export const FACILITY_STRUCTURES = ['murabaha', 'musharakah', 'ijarah', 'mudarabah', 'wakalah', 'istisnaa'] as const;
export const PROFIT_CALCULATIONS = ['flat', 'declining_balance'] as const;
export const REPAYMENT_METHODS = ['emi', 'declining_balance', 'bullet', 'balloon'] as const;
export const REPAYMENT_FREQUENCIES = ['monthly', 'quarterly'] as const;

export const FACILITY_STRUCTURE_LABELS: Record<string, string> = {
  murabaha:   'Murabaha (Cost-Plus)',
  musharakah: 'Musharakah (Partnership)',
  ijarah:     'Ijarah (Lease)',
  mudarabah:  'Mudarabah (Profit-Sharing)',
  wakalah:    'Wakalah (Agency Investment)',
  istisnaa:   "Istisna'a (Manufacture-to-Order)",
};

export const REPAYMENT_METHOD_LABELS: Record<string, string> = {
  emi: 'Equal Monthly Installment (EMI)',
  declining_balance: 'Declining Balance',
  bullet: 'Bullet (Principal at Maturity)',
  balloon: 'Balloon (Large Final Payment)',
};

export interface CreditFacilityType {
  id: number;
  companyId: number;
  name: string;
  code: string;
  description: string | null;
  facilityStructure: string;
  profitRate: number;
  profitCalculation: string;
  repaymentMethod: string;
  repaymentFrequency: string;
  maxAmount: number | null;
  minAmount: number | null;
  maxTenureMonths: number;
  minTenureMonths: number;
  processingFee: number;
  processingFeeType: string;
  managerProfitSharePct: number;
  investorProfitSharePct: number;
  requiresApproval: boolean;
  isShariaCompliant: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCreditFacilityTypeDto {
  name: string;
  code: string;
  description?: string;
  facilityStructure: string;
  profitRate: number;
  profitCalculation?: string;
  repaymentMethod?: string;
  repaymentFrequency?: string;
  maxAmount?: number;
  minAmount?: number;
  maxTenureMonths?: number;
  minTenureMonths?: number;
  processingFee?: number;
  processingFeeType?: string;
  managerProfitSharePct: number;
  investorProfitSharePct: number;
  requiresApproval?: boolean;
  isShariaCompliant?: boolean;
}

export interface CreditFacilityTypeStats {
  total: number;
  active: number;
  facilitiesUsingCount: number;
}

export const creditFacilityTypesApi = {
  list: async (): Promise<CreditFacilityType[]> => {
    const response = await api.get('/fund-management/credit-facility-types');
    return response.data;
  },
  get: async (id: number): Promise<CreditFacilityType> => {
    const response = await api.get(`/fund-management/credit-facility-types/${id}`);
    return response.data;
  },
  create: async (data: CreateCreditFacilityTypeDto): Promise<CreditFacilityType> => {
    const response = await api.post('/fund-management/credit-facility-types', data);
    return response.data;
  },
  update: async (id: number, data: Partial<CreateCreditFacilityTypeDto> & { isActive?: boolean }): Promise<CreditFacilityType> => {
    const response = await api.patch(`/fund-management/credit-facility-types/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/credit-facility-types/${id}`);
  },
  getStats: async (): Promise<CreditFacilityTypeStats> => {
    const response = await api.get('/fund-management/credit-facility-types/stats');
    return response.data;
  },
};

// ============================================================================
// CREDIT FACILITIES API
// ============================================================================

export type CreditFacilityStatus = 'pending' | 'approved' | 'disbursed' | 'active' | 'completed' | 'defaulted' | 'cancelled';

export interface CreditFacility {
  id: number;
  facilityNumber: string;
  facilityTypeId: number;
  investorId: number;
  fundId: number;
  applicationDate: string;
  approvalDate: string | null;
  disbursementDate: string | null;
  maturityDate: string | null;
  purpose: string | null;
  assetDescription: string | null;
  costPrice: number;
  profitAmount: number;
  totalFacilityAmount: number;
  profitRate: number;
  tenureMonths: number;
  repaymentMethod: string;
  repaymentFrequency: string;
  installmentAmount: number;
  totalRepaid: number;
  outstandingBalance: number;
  managerProfitSharePct: number;
  investorProfitSharePct: number;
  managerProfitEarned: number;
  investorProfitEarned: number;
  processingFee: number;
  status: CreditFacilityStatus;
  approvedBy: number | null;
  createdBy: number | null;
  createdAt: string;
  // Joined fields
  facilityTypeName?: string;
  facilityStructure?: string;
  investorName?: string;
  fundName?: string;
}

export interface CreditScheduleItem {
  id: number;
  installmentNumber: number;
  dueDate: string;
  principalPortion: number;
  profitPortion: number;
  totalAmount: number;
  balanceAfter: number;
  status: string;
  paidAmount: number;
  paidDate: string | null;
}

export interface CreditRepayment {
  id: number;
  repaymentDate: string;
  amount: number;
  principalPortion: number;
  profitPortion: number;
  balanceAfter: number;
  paymentMethod: string;
  reference: string | null;
  receiptNumber: string | null;
  notes: string | null;
}

export interface CreditFacilityStats {
  totalFacilities: number;
  activeFacilities: number;
  totalDisbursed: number;
  totalOutstanding: number;
  totalProfitEarned: number;
  overdueCount: number;
}

export interface CreateCreditFacilityDto {
  facilityTypeId: number;
  investorId: number;
  fundId: number;
  applicationDate: string;
  purpose?: string;
  assetDescription?: string;
  costPrice: number;
  profitRate: number;
  tenureMonths: number;
  repaymentMethod?: string;
  repaymentFrequency?: string;
  managerProfitSharePct?: number;
  investorProfitSharePct?: number;
}

export interface RecordRepaymentDto {
  repaymentDate: string;
  amount: number;
  paymentMethod?: string;
  reference?: string;
  receiptNumber?: string;
  notes?: string;
}

export const creditFacilitiesApi = {
  list: async (query?: Record<string, unknown>): Promise<{ data: CreditFacility[]; total: number }> => {
    const response = await api.get('/fund-management/credit-facilities', { params: query });
    return response.data;
  },
  get: async (id: number): Promise<CreditFacility> => {
    const response = await api.get(`/fund-management/credit-facilities/${id}`);
    return response.data;
  },
  create: async (data: CreateCreditFacilityDto): Promise<CreditFacility> => {
    const response = await api.post('/fund-management/credit-facilities', data);
    return response.data;
  },
  approve: async (id: number, notes?: string): Promise<CreditFacility> => {
    const response = await api.patch(`/fund-management/credit-facilities/${id}/approve`, { approvalNotes: notes });
    return response.data;
  },
  reject: async (id: number, reason: string): Promise<CreditFacility> => {
    const response = await api.patch(`/fund-management/credit-facilities/${id}/reject`, { rejectionReason: reason });
    return response.data;
  },
  disburse: async (id: number, data?: {
    disbursementMethod?: string;
    disbursementReference?: string;
    bankId?: number;
    supplierId?: number;
    supplierName?: string;
    supplierInvoiceRef?: string;
    supplierDeliveryDate?: string;
    ownershipTransferredAt?: string;
  }): Promise<CreditFacility> => {
    const response = await api.patch(`/fund-management/credit-facilities/${id}/disburse`, data);
    return response.data;
  },
  getSchedule: async (id: number): Promise<CreditScheduleItem[]> => {
    const response = await api.get(`/fund-management/credit-facilities/${id}/schedule`);
    return response.data;
  },
  recordRepayment: async (id: number, data: RecordRepaymentDto): Promise<CreditRepayment> => {
    const response = await api.post(`/fund-management/credit-facilities/${id}/repayments`, data);
    return response.data;
  },
  getRepayments: async (id: number): Promise<CreditRepayment[]> => {
    const response = await api.get(`/fund-management/credit-facilities/${id}/repayments`);
    return response.data;
  },
  getStats: async (): Promise<CreditFacilityStats> => {
    const response = await api.get('/fund-management/credit-facilities/stats');
    return response.data;
  },
  allocateProfit: async (id: number, periodStart: string, periodEnd: string): Promise<Record<string, unknown>> => {
    const response = await api.post(`/fund-management/credit-facilities/${id}/profit-allocation`, { periodStart, periodEnd });
    return response.data;
  },

  // Reports
  getPortfolioReport: async (query?: Record<string, unknown>): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/fund-management/credit-facilities/reports/portfolio', { params: query });
    return response.data;
  },
  getRepaymentReport: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/fund-management/credit-facilities/reports/repayments');
    return response.data;
  },
  getProfitReport: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/fund-management/credit-facilities/reports/profit');
    return response.data;
  },

  // Opening balance & schedule setup (migration / cutover)
  setupOpeningBalance: async (id: number, data: {
    effectiveDate: string;
    principalOutstanding: number;
    deferredProfit: number;
    postGl?: boolean;
  }): Promise<Record<string, unknown>> => {
    const response = await api.post(`/fund-management/credit-facilities/${id}/opening-balance`, data);
    return response.data;
  },
  generateRemainingSchedule: async (id: number, data: {
    remainingInstallments: number;
    firstDueDate: string;
    profitOnlyMode?: boolean;
    profitPerInstallment?: number;
    totalProfitAmount?: number;
    repaymentFrequency?: string;
  }): Promise<Record<string, unknown>> => {
    const response = await api.post(`/fund-management/credit-facilities/${id}/generate-schedule`, data);
    return response.data;
  },
  getDeferredProfit: async (id: number): Promise<Record<string, unknown> | null> => {
    try {
      const response = await api.get(`/fund-management/credit-facilities/${id}/deferred-profit`);
      return response.data;
    } catch {
      return null;
    }
  },
};

// ============================================================================
// CHARITY NGO REGISTRY — Zakat / purification destinations
// ============================================================================

export const CHARITY_NGO_FOCUS_AREAS = [
  'poverty',
  'education',
  'healthcare',
  'orphans',
  'masjid',
  'water_sanitation',
  'food_security',
  'refugees',
  'widows',
  'disability',
  'general',
] as const;

export type CharityNgoFocusArea = (typeof CHARITY_NGO_FOCUS_AREAS)[number];

export const CHARITY_NGO_FOCUS_LABELS: Record<CharityNgoFocusArea, string> = {
  poverty: 'Poverty Alleviation',
  education: 'Education',
  healthcare: 'Healthcare',
  orphans: 'Orphans',
  masjid: 'Masjid / Islamic Centres',
  water_sanitation: 'Water & Sanitation',
  food_security: 'Food Security',
  refugees: 'Refugees / Displaced',
  widows: 'Widows',
  disability: 'Persons with Disability',
  general: 'General',
};

export interface CharityNgo {
  id: number;
  companyId: number;
  name: string;
  registrationNumber: string | null;
  description: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  bankCode: string | null;
  focusAreas: string[];
  isVerified: boolean;
  verifiedById: number | null;
  verifiedAt: string | null;
  isActive: boolean;
  notes: string | null;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCharityNgoDto {
  name: string;
  registrationNumber?: string;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankCode?: string;
  focusAreas?: string[];
  notes?: string;
}

export interface UpdateCharityNgoDto extends Partial<CreateCharityNgoDto> {
  isActive?: boolean;
}

export interface CharityNgoListQuery {
  isActive?: boolean;
  isVerified?: boolean;
  search?: string;
  skip?: number;
  take?: number;
}

export const charityNgosApi = {
  list: async (query?: CharityNgoListQuery): Promise<{ data: CharityNgo[]; total: number }> => {
    const response = await api.get('/fund-management/charity-ngos', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<CharityNgo> => {
    const response = await api.get(`/fund-management/charity-ngos/${id}`);
    return response.data;
  },

  create: async (data: CreateCharityNgoDto): Promise<CharityNgo> => {
    const response = await api.post('/fund-management/charity-ngos', data);
    return response.data;
  },

  update: async (id: number, data: UpdateCharityNgoDto): Promise<CharityNgo> => {
    const response = await api.patch(`/fund-management/charity-ngos/${id}`, data);
    return response.data;
  },

  verify: async (id: number): Promise<CharityNgo> => {
    const response = await api.post(`/fund-management/charity-ngos/${id}/verify`);
    return response.data;
  },

  unverify: async (id: number): Promise<CharityNgo> => {
    const response = await api.post(`/fund-management/charity-ngos/${id}/unverify`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/charity-ngos/${id}`);
  },
};

// ============================================================================
// CONTRACT TEMPLATES + SIGNINGS (Halal Aqad)
// ============================================================================

export const CONTRACT_TYPES = [
  'MUDARABAH',
  'WAKALA',
  'SUKUK_SUBSCRIPTION',
  'IJARAH',
  'MURABAHA',
] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  MUDARABAH: 'Mudarabah (Profit-Sharing)',
  WAKALA: 'Wakala (Agency)',
  SUKUK_SUBSCRIPTION: 'Sukuk Subscription',
  IJARAH: 'Ijarah (Lease)',
  MURABAHA: 'Murabaha (Cost-Plus Sale)',
};

export type ContractSigningStatus =
  | 'draft'
  | 'pending_signature'
  | 'signed'
  | 'cancelled'
  | 'expired';

export const CONTRACT_SIGNING_STATUS_LABELS: Record<ContractSigningStatus, string> = {
  draft: 'Draft',
  pending_signature: 'Pending Signature',
  signed: 'Signed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export interface ContractTemplate {
  id: number;
  companyId: number;
  type: ContractType;
  name: string;
  version: number;
  contentHtml: string;
  placeholders: string[];
  isActive: boolean;
  isDefault: boolean;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractSigning {
  id: number;
  companyId: number;
  templateId: number;
  type: ContractType;
  investorId: number;
  subscriptionId: number | null;
  facilityId: number | null;
  sukukIssueId: number | null;
  renderedContent: string;
  status: ContractSigningStatus;
  signedAt: string | null;
  signedByName: string | null;
  signedByEmail: string | null;
  signedByIpAddress: string | null;
  signedByUserAgent: string | null;
  otpSentAt: string | null;
  otpExpiresAt: string | null;
  otpVerifiedAt: string | null;
  otpAttempts: number;
  cancelledAt: string | null;
  cancelledById: number | null;
  cancellationReason: string | null;
  pdfPath: string | null;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
  templateName?: string;
  investorName?: string;
}

export interface CreateContractTemplateDto {
  type: ContractType;
  name: string;
  contentHtml: string;
  placeholders?: string[];
  isDefault?: boolean;
}

export interface UpdateContractTemplateDto {
  name?: string;
  contentHtml?: string;
  placeholders?: string[];
  isActive?: boolean;
}

export interface InitiateContractSigningDto {
  templateId?: number;
  type: ContractType;
  investorId: number;
  subscriptionId?: number;
  facilityId?: number;
  sukukIssueId?: number;
  variables?: Record<string, string | number>;
}

export interface InitiateSigningResult {
  signing: ContractSigning;
  /**
   * SMS delivery state. `delivered` — adapter accepted the message.
   * `dev_sandbox` — messaging not configured for this tenant; OTP is included.
   * `failed` — adapter threw; signing exists, operator can resend.
   */
  smsStatus: 'delivered' | 'dev_sandbox' | 'failed';
  /** Populated only when smsStatus = 'dev_sandbox' */
  otp?: string;
  /** Operator-facing diagnostic */
  smsMessage?: string;
}

export const contractTemplatesApi = {
  list: async (params?: { type?: ContractType; isActive?: boolean; isDefault?: boolean }): Promise<{ data: ContractTemplate[]; total: number }> => {
    const response = await api.get('/fund-management/contract-templates', { params });
    return response.data;
  },
  get: async (id: number): Promise<ContractTemplate> => {
    const response = await api.get(`/fund-management/contract-templates/${id}`);
    return response.data;
  },
  create: async (data: CreateContractTemplateDto): Promise<ContractTemplate> => {
    const response = await api.post('/fund-management/contract-templates', data);
    return response.data;
  },
  update: async (id: number, data: UpdateContractTemplateDto): Promise<ContractTemplate> => {
    const response = await api.patch(`/fund-management/contract-templates/${id}`, data);
    return response.data;
  },
  setDefault: async (id: number): Promise<ContractTemplate> => {
    const response = await api.post(`/fund-management/contract-templates/${id}/set-default`);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/contract-templates/${id}`);
  },
};

export const contractSigningsApi = {
  list: async (params?: { investorId?: number; subscriptionId?: number; facilityId?: number; status?: string; type?: string; skip?: number; take?: number }): Promise<{ data: ContractSigning[]; total: number }> => {
    const response = await api.get('/fund-management/contract-signings', { params });
    return response.data;
  },
  get: async (id: number): Promise<ContractSigning> => {
    const response = await api.get(`/fund-management/contract-signings/${id}`);
    return response.data;
  },
  initiate: async (data: InitiateContractSigningDto): Promise<InitiateSigningResult> => {
    const response = await api.post('/fund-management/contract-signings', data);
    return response.data;
  },
  verifyOtp: async (id: number, data: { otp: string; signedByName?: string; signedByEmail?: string }): Promise<ContractSigning> => {
    const response = await api.post(`/fund-management/contract-signings/${id}/verify-otp`, data);
    return response.data;
  },
  resendOtp: async (id: number): Promise<InitiateSigningResult> => {
    const response = await api.post(`/fund-management/contract-signings/${id}/resend-otp`);
    return response.data;
  },
  cancel: async (id: number, data: { reason?: string }): Promise<ContractSigning> => {
    const response = await api.post(`/fund-management/contract-signings/${id}/cancel`, data);
    return response.data;
  },
};

// ============================================================================
// FACILITY ASSETS — Halal asset-backed financing
// ============================================================================

export const ASSET_TYPES = [
  'vehicle',
  'property',
  'equipment',
  'raw_materials',
  'inventory',
  'other',
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  vehicle: 'Vehicle',
  property: 'Property / Real Estate',
  equipment: 'Equipment / Machinery',
  raw_materials: 'Raw Materials',
  inventory: 'Inventory / Stock',
  other: 'Other',
};

export type AssetStatus =
  | 'pending_proof'
  | 'proof_uploaded'
  | 'awaiting_payment'
  | 'paid_to_supplier'
  | 'delivered'
  | 'rejected';

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  pending_proof: 'Pending Proof',
  proof_uploaded: 'Proof Uploaded',
  awaiting_payment: 'Awaiting Payment',
  paid_to_supplier: 'Paid to Supplier',
  delivered: 'Delivered',
  rejected: 'Rejected',
};

export interface FacilityAsset {
  id: number;
  companyId: number;
  facilityId: number;
  assetType: AssetType;
  description: string;
  costPrice: number;
  supplierName: string;
  supplierAccountName: string | null;
  supplierAccountNumber: string | null;
  supplierBankName: string | null;
  supplierBankCode: string | null;
  certificateOfOwnershipUrl: string | null;
  invoiceUrl: string | null;
  additionalDocsUrls: unknown;
  status: AssetStatus;
  rejectedReason: string | null;
  rejectedById: number | null;
  rejectedAt: string | null;
  paidAt: string | null;
  paidByUserId: number | null;
  paidAmount: number | null;
  paidViaTransactionRef: string | null;
  deliveryConfirmedAt: string | null;
  deliveryConfirmedByUserId: number | null;
  deliveryNotes: string | null;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFacilityAssetDto {
  assetType: AssetType;
  description: string;
  costPrice: number;
  supplierName: string;
  supplierAccountName?: string;
  supplierAccountNumber?: string;
  supplierBankName?: string;
  supplierBankCode?: string;
}

export const facilityAssetsApi = {
  list: async (facilityId: number): Promise<{ data: FacilityAsset[]; total: number }> => {
    const response = await api.get(`/fund-management/credit-facilities/${facilityId}/assets`);
    return response.data;
  },
  get: async (facilityId: number, id: number): Promise<FacilityAsset> => {
    const response = await api.get(`/fund-management/credit-facilities/${facilityId}/assets/${id}`);
    return response.data;
  },
  create: async (facilityId: number, data: CreateFacilityAssetDto): Promise<FacilityAsset> => {
    const response = await api.post(`/fund-management/credit-facilities/${facilityId}/assets`, data);
    return response.data;
  },
  uploadProof: async (
    facilityId: number,
    id: number,
    data: { certificateOfOwnershipUrl?: string; invoiceUrl?: string },
  ): Promise<FacilityAsset> => {
    const response = await api.post(`/fund-management/credit-facilities/${facilityId}/assets/${id}/upload-proof`, data);
    return response.data;
  },
  uploadFile: async (
    facilityId: number,
    id: number,
    kind: 'certificate' | 'invoice',
    file: File,
  ): Promise<FacilityAsset> => {
    const form = new FormData();
    form.append('file', file);
    const response = await api.post(
      `/fund-management/credit-facilities/${facilityId}/assets/${id}/upload-file/${kind}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },
  verify: async (facilityId: number, id: number): Promise<FacilityAsset> => {
    const response = await api.post(`/fund-management/credit-facilities/${facilityId}/assets/${id}/verify`);
    return response.data;
  },
  paySupplier: async (
    facilityId: number,
    id: number,
    data: { paidViaTransactionRef: string; paidAmount?: number },
  ): Promise<FacilityAsset> => {
    const response = await api.post(`/fund-management/credit-facilities/${facilityId}/assets/${id}/pay-supplier`, data);
    return response.data;
  },
  confirmDelivery: async (
    facilityId: number,
    id: number,
    data: { notes?: string },
  ): Promise<FacilityAsset> => {
    const response = await api.post(`/fund-management/credit-facilities/${facilityId}/assets/${id}/confirm-delivery`, data);
    return response.data;
  },
  reject: async (facilityId: number, id: number, data: { reason: string }): Promise<FacilityAsset> => {
    const response = await api.post(`/fund-management/credit-facilities/${facilityId}/assets/${id}/reject`, data);
    return response.data;
  },
};

// ============================================================================
// SHARI'AH BOARD PORTAL
// ============================================================================

export interface BoardDashboardSummary {
  screenings: { total: number; passed: number; watch: number; failed: number; pendingReview: number };
  contractSignings: { total: number; pending: number; signed: number; expired: number };
  facilityAssets: { total: number; pendingProof: number; awaitingVerification: number; paidToSupplier: number; delivered: number; rejected: number };
  purification: { totalCalculated: number; totalDistributed: number; pendingDistribution: number };
  zakat: { totalCalculated: number; totalDistributed: number };
  investorsNotHalalCertified: number;
}

export const shariaBoardApi = {
  dashboard: async (): Promise<BoardDashboardSummary> => {
    const response = await api.get('/fund-management/sharia-board/dashboard');
    return response.data;
  },
  securityReport: async (id: number): Promise<unknown> => {
    const response = await api.get(`/fund-management/sharia-board/compliance-reports/securities/${id}`);
    return response.data;
  },
  facilityReport: async (id: number): Promise<unknown> => {
    const response = await api.get(`/fund-management/sharia-board/compliance-reports/facilities/${id}`);
    return response.data;
  },
  /** Returns a server-side absolute URL for the printable HTML — open in new tab. */
  securityReportPrintUrl: (id: number) => `/api/fund-management/sharia-board/compliance-reports/securities/${id}/print`,
  facilityReportPrintUrl: (id: number) => `/api/fund-management/sharia-board/compliance-reports/facilities/${id}/print`,
};

// ============================================================================
// LATE FEES (Halal — auto-route to charity)
// ============================================================================

export type LateFeeStatus = 'accrued' | 'settled_to_charity';

export interface LateFee {
  id: number;
  companyId: number;
  facilityId: number;
  repaymentId: number | null;
  feeAmount: number | string;
  reason: string | null;
  recordedAt: string;
  recordedById: number | null;
  charityNgoId: number | null;
  purificationRecordId: number | null;
  status: LateFeeStatus;
  settledAt: string | null;
  settledById: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  facilityNumber?: string | null;
  charityName?: string | null;
}

export interface RecordLateFeeDto {
  facilityId: number;
  repaymentId?: number;
  feeAmount: number;
  reason?: string;
  charityNgoId?: number;
  notes?: string;
}

export interface SettleLateFeeDto {
  charityNgoId: number;
  settlementDate?: string;
  paymentMethod?: 'bank_transfer' | 'cash' | 'other';
  paymentReference?: string;
  notes?: string;
}

export interface LateFeeListQuery {
  status?: LateFeeStatus;
  facilityId?: number;
  charityNgoId?: number;
  page?: number;
  limit?: number;
}

export const lateFeesApi = {
  list: async (
    query?: LateFeeListQuery,
  ): Promise<{ data: LateFee[]; total: number; page: number; limit: number }> => {
    const response = await api.get('/fund-management/late-fees', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<LateFee> => {
    const response = await api.get(`/fund-management/late-fees/${id}`);
    return response.data;
  },

  record: async (data: RecordLateFeeDto): Promise<LateFee> => {
    const response = await api.post('/fund-management/late-fees', data);
    return response.data;
  },

  settle: async (id: number, data: SettleLateFeeDto): Promise<LateFee> => {
    const response = await api.post(`/fund-management/late-fees/${id}/settle`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/late-fees/${id}`);
  },
};

// ============================================================================
// WAKALA FEE TIERS — Halal agency-fee schedules (tiered by AUM or flat)
// ============================================================================

export const WAKALA_FEE_METHODS = ['tiered', 'flat'] as const;
export type WakalaFeeMethod = (typeof WAKALA_FEE_METHODS)[number];

export const WAKALA_FEE_METHOD_LABELS: Record<WakalaFeeMethod, string> = {
  tiered: 'Tiered (banded by AUM)',
  flat: 'Flat (fixed periodic)',
};

export const WAKALA_FLAT_FREQUENCIES = ['monthly', 'quarterly', 'annually'] as const;
export type WakalaFlatFrequency = (typeof WAKALA_FLAT_FREQUENCIES)[number];

export const WAKALA_FLAT_FREQUENCY_LABELS: Record<WakalaFlatFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

export interface WakalaFeeBracket {
  id: number;
  tierId: number;
  lowerBound: number | string;
  upperBound: number | string | null;
  annualRate: number | string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface WakalaFeeTier {
  id: number;
  companyId: number;
  fundId: number | null;
  fundName?: string | null;
  name: string;
  description: string | null;
  feeMethod: WakalaFeeMethod;
  flatFeeAmount: number | string | null;
  flatFeeFrequency: WakalaFlatFrequency | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  notes: string | null;
  createdById: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  brackets: WakalaFeeBracket[];
}

export interface CreateWakalaFeeBracketDto {
  lowerBound: number;
  upperBound?: number | null;
  annualRate: number;
  sortOrder?: number;
}

export interface CreateWakalaFeeTierDto {
  name: string;
  description?: string;
  fundId?: number | null;
  feeMethod: WakalaFeeMethod;
  flatFeeAmount?: number;
  flatFeeFrequency?: WakalaFlatFrequency;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive?: boolean;
  notes?: string;
  brackets?: CreateWakalaFeeBracketDto[];
}

export interface UpdateWakalaFeeTierDto extends Partial<CreateWakalaFeeTierDto> {
  isActive?: boolean;
}

export interface WakalaFeeTierListQuery {
  fundId?: number;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PreviewWakalaFeeDto {
  aum: number;
  periodDays: number;
}

export interface WakalaFeeBracketBreakdown {
  bracketId: number | null;
  lowerBound: number;
  upperBound: number | null;
  annualRate: number;
  amountInBracket: number;
  annualisedFee: number;
  periodFee: number;
}

export interface WakalaFeePreviewResult {
  tierId: number;
  tierName: string;
  feeMethod: WakalaFeeMethod;
  aum: number;
  periodDays: number;
  totalAnnualisedFee: number;
  totalPeriodFee: number;
  blendedAnnualRate: number;
  breakdown: WakalaFeeBracketBreakdown[];
}

export const wakalaFeeTiersApi = {
  list: async (
    query?: WakalaFeeTierListQuery,
  ): Promise<{ data: WakalaFeeTier[]; total: number; page: number; limit: number }> => {
    const response = await api.get('/fund-management/wakala-fee-tiers', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<WakalaFeeTier> => {
    const response = await api.get(`/fund-management/wakala-fee-tiers/${id}`);
    return response.data;
  },

  create: async (data: CreateWakalaFeeTierDto): Promise<WakalaFeeTier> => {
    const response = await api.post('/fund-management/wakala-fee-tiers', data);
    return response.data;
  },

  update: async (id: number, data: UpdateWakalaFeeTierDto): Promise<WakalaFeeTier> => {
    const response = await api.patch(`/fund-management/wakala-fee-tiers/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/fund-management/wakala-fee-tiers/${id}`);
  },

  preview: async (id: number, data: PreviewWakalaFeeDto): Promise<WakalaFeePreviewResult> => {
    const response = await api.post(`/fund-management/wakala-fee-tiers/${id}/preview`, data);
    return response.data;
  },
};

// ============================================================================
// WAKALA FEE ACCRUALS
// ============================================================================

export interface WakalaFeeAccrual {
  id: number;
  companyId: number;
  facilityId: number;
  feeTierId: number;
  periodFrom: string;
  periodTo: string;
  periodDays: number;
  aum: number | string;
  feeMethod: string;
  totalFee: number | string;
  journalEntryId: number | null;
  voidedAt: string | null;
  voidedBy: number | null;
  voidJournalId: number | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  // Enriched
  facilityNumber?: string;
  tierName?: string;
  investeeName?: string;
}

export interface WakalaAccrualPreview {
  facilityId: number;
  facilityNumber: string;
  tierId: number;
  tierName: string;
  feeMethod: string;
  aum: number;
  periodFrom: string;
  periodTo: string;
  periodDays: number;
  totalFee: number;
  breakdown: WakalaFeeBracketBreakdown[];
}

export const wakalaFeeAccrualsApi = {
  list: async (query?: { facilityId?: number; includeVoided?: boolean; page?: number; limit?: number }) => {
    const response = await api.get('/fund-management/wakala-fee-accruals', { params: query });
    return response.data as { data: WakalaFeeAccrual[]; total: number; page: number; limit: number };
  },

  get: async (id: number): Promise<WakalaFeeAccrual> => {
    const response = await api.get(`/fund-management/wakala-fee-accruals/${id}`);
    return response.data;
  },

  preview: async (dto: { facilityId: number; periodFrom: string; periodTo: string }): Promise<WakalaAccrualPreview> => {
    const response = await api.post('/fund-management/wakala-fee-accruals/preview', dto);
    return response.data;
  },

  post: async (dto: { facilityId: number; periodFrom: string; periodTo: string; debitAccountId?: number; creditAccountId?: number; notes?: string }): Promise<WakalaFeeAccrual> => {
    const response = await api.post('/fund-management/wakala-fee-accruals', dto);
    return response.data;
  },

  void: async (id: number): Promise<WakalaFeeAccrual> => {
    const response = await api.post(`/fund-management/wakala-fee-accruals/${id}/void`);
    return response.data;
  },
};

// ============================================================================
// SUKUK LIFECYCLE — coupon distributions + redemptions
// ============================================================================

export const COUPON_DISTRIBUTION_STATUSES = ['calculated', 'paid', 'voided'] as const;
export type CouponDistributionStatus = (typeof COUPON_DISTRIBUTION_STATUSES)[number];

export const COUPON_DISTRIBUTION_STATUS_LABELS: Record<CouponDistributionStatus, string> = {
  calculated: 'Calculated',
  paid: 'Paid',
  voided: 'Voided',
};

export const SUKUK_REDEMPTION_TYPES = ['maturity', 'early', 'partial'] as const;
export type SukukRedemptionType = (typeof SUKUK_REDEMPTION_TYPES)[number];

export const SUKUK_REDEMPTION_TYPE_LABELS: Record<SukukRedemptionType, string> = {
  maturity: 'Maturity',
  early: 'Early',
  partial: 'Partial',
};

export const SUKUK_REDEMPTION_STATUSES = ['pending', 'settled', 'voided'] as const;
export type SukukRedemptionStatus = (typeof SUKUK_REDEMPTION_STATUSES)[number];

export const SUKUK_REDEMPTION_STATUS_LABELS: Record<SukukRedemptionStatus, string> = {
  pending: 'Pending',
  settled: 'Settled',
  voided: 'Voided',
};

export const SUKUK_PAYMENT_METHODS = ['bank_transfer', 'reinvest', 'other'] as const;
export type SukukPaymentMethod = (typeof SUKUK_PAYMENT_METHODS)[number];

export const SUKUK_PAYMENT_METHOD_LABELS: Record<SukukPaymentMethod, string> = {
  bank_transfer: 'Bank Transfer',
  reinvest: 'Reinvest',
  other: 'Other',
};

export interface SukukCouponDistribution {
  id: number;
  companyId: number;
  fundId: number;
  securityId: number;
  rentalScheduleId: number;
  distributionDate: string;
  totalDistributed: number | string;
  pricePerUnit: number | string;
  status: CouponDistributionStatus;
  paidAt: string | null;
  paymentMethod: SukukPaymentMethod | null;
  paymentReference: string | null;
  notes: string | null;
  recordedById: number | null;
  paidById: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  // joined
  securityName?: string | null;
  fundName?: string | null;
  rentalPeriodNumber?: number | null;
  rentalPeriodStart?: string | null;
  rentalPeriodEnd?: string | null;
  rentalExpected?: number | string | null;
}

export interface CalculateCouponDistributionDto {
  rentalScheduleId: number;
  distributionDate: string;
  totalDistributed?: number;
  notes?: string;
}

export interface MarkCouponPaidDto {
  paymentMethod: SukukPaymentMethod;
  paymentReference?: string;
  paidAt?: string;
  notes?: string;
}

export interface CouponDistributionListQuery {
  securityId?: number;
  fundId?: number;
  status?: CouponDistributionStatus;
  page?: number;
  limit?: number;
}

export interface SukukRedemption {
  id: number;
  companyId: number;
  fundId: number;
  securityId: number;
  redemptionType: SukukRedemptionType;
  redemptionDate: string;
  unitsRedeemed: number | string;
  faceValuePaid: number | string;
  premiumOrDiscount: number | string;
  totalProceeds: number | string;
  status: SukukRedemptionStatus;
  settledAt: string | null;
  paymentMethod: SukukPaymentMethod | null;
  paymentReference: string | null;
  notes: string | null;
  recordedById: number | null;
  settledById: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  // joined
  securityName?: string | null;
  fundName?: string | null;
}

export interface RecordRedemptionDto {
  securityId: number;
  redemptionType: SukukRedemptionType;
  redemptionDate: string;
  unitsRedeemed: number;
  faceValuePaid: number;
  premiumOrDiscount?: number;
  notes?: string;
}

export interface SettleRedemptionDto {
  paymentMethod: SukukPaymentMethod;
  paymentReference?: string;
  settledAt?: string;
  notes?: string;
}

export interface RedemptionListQuery {
  securityId?: number;
  fundId?: number;
  status?: SukukRedemptionStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export const sukukLifecycleApi = {
  // ---- coupon distributions ----
  calculateCouponDistribution: async (
    data: CalculateCouponDistributionDto,
  ): Promise<SukukCouponDistribution> => {
    const response = await api.post('/fund-management/sukuk/coupon-distributions', data);
    return response.data;
  },

  listCouponDistributions: async (
    query?: CouponDistributionListQuery,
  ): Promise<PaginatedResult<SukukCouponDistribution>> => {
    const response = await api.get('/fund-management/sukuk/coupon-distributions', {
      params: query,
    });
    return response.data;
  },

  getCouponDistribution: async (id: number): Promise<SukukCouponDistribution> => {
    const response = await api.get(`/fund-management/sukuk/coupon-distributions/${id}`);
    return response.data;
  },

  markCouponPaid: async (
    id: number,
    data: MarkCouponPaidDto,
  ): Promise<SukukCouponDistribution> => {
    const response = await api.post(
      `/fund-management/sukuk/coupon-distributions/${id}/mark-paid`,
      data,
    );
    return response.data;
  },

  voidCouponDistribution: async (id: number): Promise<SukukCouponDistribution> => {
    const response = await api.post(
      `/fund-management/sukuk/coupon-distributions/${id}/void`,
      {},
    );
    return response.data;
  },

  // ---- redemptions ----
  recordRedemption: async (data: RecordRedemptionDto): Promise<SukukRedemption> => {
    const response = await api.post('/fund-management/sukuk/redemptions', data);
    return response.data;
  },

  listRedemptions: async (
    query?: RedemptionListQuery,
  ): Promise<PaginatedResult<SukukRedemption>> => {
    const response = await api.get('/fund-management/sukuk/redemptions', { params: query });
    return response.data;
  },

  getRedemption: async (id: number): Promise<SukukRedemption> => {
    const response = await api.get(`/fund-management/sukuk/redemptions/${id}`);
    return response.data;
  },

  settleRedemption: async (
    id: number,
    data: SettleRedemptionDto,
  ): Promise<SukukRedemption> => {
    const response = await api.post(`/fund-management/sukuk/redemptions/${id}/settle`, data);
    return response.data;
  },

  voidRedemption: async (id: number): Promise<SukukRedemption> => {
    const response = await api.post(`/fund-management/sukuk/redemptions/${id}/void`, {});
    return response.data;
  },
};

// ============================================================================
// MURABAHA — cost-plus sale (fixed markup)
// ============================================================================

export interface MurabahaPricing {
  id: number;
  companyId: number;
  facilityId: number;
  assetCost: number | string;
  markupAmount: number | string;
  totalSalePrice: number | string;
  supplierName: string;
  supplierInvoice: string | null;
  costEvidenceUrl: string | null;
  pricingDate: string;
  notes: string | null;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SetMurabahaPricingDto {
  facilityId: number;
  assetCost: number;
  markupAmount: number;
  supplierName: string;
  supplierInvoice?: string;
  costEvidenceUrl?: string;
  pricingDate: string;
  notes?: string;
}

export interface PreviewMurabahaMarkupDto {
  assetCost: number;
  markupAmount: number;
}

export interface MurabahaMarkupPreview {
  assetCost: number;
  markupAmount: number;
  totalSalePrice: number;
  markupPercentage: number;
}

export const murabahaApi = {
  setPricing: async (data: SetMurabahaPricingDto): Promise<MurabahaPricing> => {
    const response = await api.post('/fund-management/murabaha/pricing', data);
    return response.data;
  },

  getPricing: async (facilityId: number): Promise<MurabahaPricing | null> => {
    const response = await api.get(`/fund-management/murabaha/pricing/${facilityId}`);
    return response.data;
  },

  previewMarkup: async (data: PreviewMurabahaMarkupDto): Promise<MurabahaMarkupPreview> => {
    const response = await api.post('/fund-management/murabaha/preview-markup', data);
    return response.data;
  },

  deletePricing: async (facilityId: number): Promise<void> => {
    await api.delete(`/fund-management/murabaha/pricing/${facilityId}`);
  },
};

// ============================================================================
// IJARAH — lease / lease-to-own
// ============================================================================

export const IJARAH_FREQUENCIES = ['monthly', 'quarterly', 'annually'] as const;
export type IjarahFrequency = (typeof IJARAH_FREQUENCIES)[number];

export const IJARAH_FREQUENCY_LABELS: Record<IjarahFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

export const IJARAH_RENTAL_STATUSES = [
  'scheduled',
  'invoiced',
  'paid',
  'overdue',
  'waived',
] as const;
export type IjarahRentalStatus = (typeof IJARAH_RENTAL_STATUSES)[number];

export const IJARAH_RENTAL_STATUS_LABELS: Record<IjarahRentalStatus, string> = {
  scheduled: 'Scheduled',
  invoiced: 'Invoiced',
  paid: 'Paid',
  overdue: 'Overdue',
  waived: 'Waived',
};

export const IJARAH_PAYMENT_METHODS = ['bank_transfer', 'cash', 'cheque', 'other'] as const;
export type IjarahPaymentMethod = (typeof IJARAH_PAYMENT_METHODS)[number];

export const IJARAH_PAYMENT_METHOD_LABELS: Record<IjarahPaymentMethod, string> = {
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  cheque: 'Cheque',
  other: 'Other',
};

export interface IjarahRentalScheduleRow {
  id: number;
  companyId: number;
  facilityId: number;
  periodNumber: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  rentAmount: number | string;
  status: IjarahRentalStatus;
  paidAmount: number | string | null;
  paidAt: string | null;
  paymentReference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface GenerateIjarahScheduleDto {
  firstPeriodStart: string;
  periodCount: number;
  rentAmount: number;
  frequency: IjarahFrequency;
}

export interface MarkIjarahRentalPaidDto {
  paymentMethod: IjarahPaymentMethod;
  paidAmount: number;
  paymentReference?: string;
  paidAt?: string;
  notes?: string;
}

export interface WaiveIjarahRentalDto {
  reason: string;
}

export const ijarahApi = {
  generateSchedule: async (
    facilityId: number,
    data: GenerateIjarahScheduleDto,
  ): Promise<IjarahRentalScheduleRow[]> => {
    const response = await api.post(
      `/fund-management/ijarah/facilities/${facilityId}/schedule`,
      data,
    );
    return response.data;
  },

  listSchedule: async (facilityId: number): Promise<IjarahRentalScheduleRow[]> => {
    const response = await api.get(`/fund-management/ijarah/facilities/${facilityId}/schedule`);
    return response.data;
  },

  regenerateSchedule: async (
    facilityId: number,
    data: GenerateIjarahScheduleDto,
  ): Promise<IjarahRentalScheduleRow[]> => {
    const response = await api.post(
      `/fund-management/ijarah/facilities/${facilityId}/schedule/regenerate`,
      data,
    );
    return response.data;
  },

  getRental: async (rowId: number): Promise<IjarahRentalScheduleRow> => {
    const response = await api.get(`/fund-management/ijarah/schedule/${rowId}`);
    return response.data;
  },

  markInvoiced: async (rowId: number): Promise<IjarahRentalScheduleRow> => {
    const response = await api.post(`/fund-management/ijarah/schedule/${rowId}/invoice`, {});
    return response.data;
  },

  markPaid: async (
    rowId: number,
    data: MarkIjarahRentalPaidDto,
  ): Promise<IjarahRentalScheduleRow> => {
    const response = await api.post(`/fund-management/ijarah/schedule/${rowId}/paid`, data);
    return response.data;
  },

  markOverdue: async (rowId: number): Promise<IjarahRentalScheduleRow> => {
    const response = await api.post(`/fund-management/ijarah/schedule/${rowId}/overdue`, {});
    return response.data;
  },

  waive: async (
    rowId: number,
    data: WaiveIjarahRentalDto,
  ): Promise<IjarahRentalScheduleRow> => {
    const response = await api.post(`/fund-management/ijarah/schedule/${rowId}/waive`, data);
    return response.data;
  },
};

// ============================================================================
// MUDARABAH — profit-sharing partnership
// ============================================================================

export const MUDARABAH_DISTRIBUTION_STATUSES = ['declared', 'paid', 'voided'] as const;
export type MudarabahDistributionStatus = (typeof MUDARABAH_DISTRIBUTION_STATUSES)[number];

export const MUDARABAH_DISTRIBUTION_STATUS_LABELS: Record<MudarabahDistributionStatus, string> = {
  declared: 'Declared',
  paid: 'Paid',
  voided: 'Voided',
};

export const MUDARABAH_PAYMENT_METHODS = [
  'bank_transfer',
  'reinvest',
  'cheque',
  'cash',
  'other',
] as const;
export type MudarabahPaymentMethod = (typeof MUDARABAH_PAYMENT_METHODS)[number];

export const MUDARABAH_PAYMENT_METHOD_LABELS: Record<MudarabahPaymentMethod, string> = {
  bank_transfer: 'Bank Transfer',
  reinvest: 'Reinvest',
  cheque: 'Cheque',
  cash: 'Cash',
  other: 'Other',
};

export interface MudarabahDistribution {
  id: number;
  companyId: number;
  facilityId: number;
  periodStart: string;
  periodEnd: string;
  declarationDate: string;
  totalProfit: number | string;
  managerSharePct: number | string;
  managerShare: number | string;
  investorShare: number | string;
  status: MudarabahDistributionStatus;
  paidAt: string | null;
  paymentReference: string | null;
  paymentMethod: MudarabahPaymentMethod | null;
  notes: string | null;
  declaredById: number | null;
  paidById: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  // joined
  facilityNumber?: string | null;
}

export interface DeclareMudarabahDistributionDto {
  periodStart: string;
  periodEnd: string;
  declarationDate: string;
  totalProfit: number;
  managerSharePct: number;
  notes?: string;
}

export interface MarkMudarabahDistributionPaidDto {
  paymentMethod: MudarabahPaymentMethod;
  paymentReference?: string;
  paidAt?: string;
  notes?: string;
}

export interface MudarabahDistributionListQuery {
  facilityId?: number;
  status?: MudarabahDistributionStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export const mudarabahApi = {
  declare: async (
    facilityId: number,
    data: DeclareMudarabahDistributionDto,
  ): Promise<MudarabahDistribution> => {
    const response = await api.post(
      `/fund-management/mudarabah/facilities/${facilityId}/distributions`,
      data,
    );
    return response.data;
  },

  list: async (
    query?: MudarabahDistributionListQuery,
  ): Promise<PaginatedResult<MudarabahDistribution>> => {
    const response = await api.get('/fund-management/mudarabah/distributions', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<MudarabahDistribution> => {
    const response = await api.get(`/fund-management/mudarabah/distributions/${id}`);
    return response.data;
  },

  markPaid: async (
    id: number,
    data: MarkMudarabahDistributionPaidDto,
  ): Promise<MudarabahDistribution> => {
    const response = await api.post(
      `/fund-management/mudarabah/distributions/${id}/mark-paid`,
      data,
    );
    return response.data;
  },

  void: async (id: number): Promise<MudarabahDistribution> => {
    const response = await api.post(`/fund-management/mudarabah/distributions/${id}/void`, {});
    return response.data;
  },
};
