import { api } from '../api';

// ============================================================================
// TYPES - ENUMS
// ============================================================================

export type ImportOrderStatus = 'draft' | 'proforma_received' | 'form_m_pending' | 'form_m_approved' | 'lc_pending' | 'lc_issued' | 'shipped' | 'in_transit' | 'arrived' | 'clearing' | 'duty_paid' | 'released' | 'in_haulage' | 'delivered' | 'closed' | 'cancelled';
export type Incoterms = 'FOB' | 'CIF' | 'CFR' | 'EXW' | 'FCA' | 'CPT' | 'CIP' | 'DAP' | 'DPU' | 'DDP';
export type PaymentInstrument = 'lc' | 'tt' | 'mixed';
export type ImportPaymentType = 'lc_margin' | 'lc_payment' | 'tt_advance' | 'tt_balance' | 'duty_payment' | 'clearing_fee' | 'shipping_charge' | 'insurance' | 'terminal_charge' | 'haulage' | 'demurrage' | 'storage' | 'other';
export type ContainerType = 'fcl_20' | 'fcl_40' | 'fcl_40hc' | 'lcl';
export type RiskChannel = 'green' | 'blue' | 'yellow' | 'red';
export type DocumentType = 'proforma_invoice' | 'commercial_invoice' | 'packing_list' | 'bill_of_lading' | 'airway_bill' | 'certificate_of_origin' | 'form_m' | 'paar' | 'soncap_pc' | 'soncap_sc' | 'nafdac_permit' | 'insurance_certificate' | 'release_order' | 'delivery_note' | 'duty_receipt' | 'lc_copy' | 'other';
export type CertificationType = 'soncap_pc' | 'soncap_sc' | 'nafdac' | 'son_inspection' | 'quarantine' | 'nesrea';
export type FormMStatus = 'draft' | 'submitted' | 'validated' | 'approved' | 'utilized' | 'extended' | 'expired' | 'cancelled';
export type LCStatus = 'draft' | 'applied' | 'issued' | 'confirmed' | 'amended' | 'documents_presented' | 'negotiated' | 'paid' | 'expired' | 'cancelled';
export type LCType = 'sight' | 'usance' | 'deferred' | 'revolving' | 'standby' | 'confirmed';

// ============================================================================
// TYPES - ENTITIES
// ============================================================================

// ImportOrderLine
export interface ImportOrderLine {
  id: number;
  importOrderId: number;
  itemId: number;
  description: string | null;
  hsCode: string | null;
  quantity: number;
  uomId: number | null;
  unitPrice: number;
  lineTotal: number;
  grossWeightKg: number | null;
  netWeightKg: number | null;
  volumeCbm: number | null;
  packageCount: number | null;
  packageType: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  item?: { id: number; name: string; sku: string | null };
}

// ImportOrder
export interface ImportOrder {
  id: number;
  companyId: number;
  branchId: number | null;
  orderNumber: string;
  supplierId: number;
  currencyId: number | null;
  exchangeRate: number | null;
  incoterms: Incoterms | null;
  paymentInstrument: PaymentInstrument | null;
  proformaNumber: string | null;
  proformaDate: string | null;
  proformaAmount: number | null;
  countryOfOrigin: string | null;
  portOfLoading: string | null;
  portOfDischarge: string | null;
  finalDestination: string | null;
  fobValue: number | null;
  freightValue: number | null;
  insuranceValue: number | null;
  cifValue: number | null;
  totalDutyAmount: number | null;
  totalLandedCost: number | null;
  warehouseId: number | null;
  expectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  status: ImportOrderStatus;
  notes: string | null;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  supplier?: { id: number; name: string; code: string | null };
  currency?: { id: number; code: string; name: string };
  lines?: ImportOrderLine[];
  formM?: ImportFormM;
  letterOfCredit?: ImportLetterOfCredit;
  payments?: ImportPayment[];
  shipments?: ImportShipment[];
  clearance?: ImportCustomsClearance;
  dutyAssessment?: ImportDutyAssessment;
  documents?: ImportDocument[];
  certifications?: ImportCertification[];
  statusHistory?: ImportStatusHistory[];
}

// ImportFormM
export interface ImportFormM {
  id: number;
  importOrderId: number;
  formMNumber: string | null;
  baNumber: string | null;
  bankId: number | null;
  amount: number | null;
  currencyId: number | null;
  submittedDate: string | null;
  validatedDate: string | null;
  approvedDate: string | null;
  expiryDate: string | null;
  status: FormMStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  bank?: { id: number; name: string };
}

// ImportLetterOfCredit
export interface ImportLetterOfCredit {
  id: number;
  importOrderId: number;
  lcNumber: string | null;
  lcType: LCType | null;
  issuingBankId: number | null;
  advisingBankName: string | null;
  confirmingBankName: string | null;
  amount: number | null;
  currencyId: number | null;
  exchangeRate: number | null;
  marginPercentage: number | null;
  marginAmount: number | null;
  tenorDays: number | null;
  issueDate: string | null;
  expiryDate: string | null;
  latestShipmentDate: string | null;
  amendments: unknown[];
  status: LCStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  issuingBank?: { id: number; name: string };
}

// ImportPayment
export interface ImportPayment {
  id: number;
  importOrderId: number;
  paymentNumber: string;
  paymentType: ImportPaymentType;
  amount: number;
  currencyId: number | null;
  exchangeRate: number | null;
  localAmount: number | null;
  bankId: number | null;
  paymentDate: string | null;
  reference: string | null;
  description: string | null;
  status: string;
  journalEntryId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  bank?: { id: number; name: string };
}

// ImportShipment
export interface ImportShipment {
  id: number;
  importOrderId: number;
  billOfLadingNumber: string | null;
  airwayBillNumber: string | null;
  shippingLine: string | null;
  vesselName: string | null;
  voyageNumber: string | null;
  portOfLoading: string | null;
  portOfDischarge: string | null;
  estimatedDeparture: string | null;
  actualDeparture: string | null;
  estimatedArrival: string | null;
  actualArrival: string | null;
  totalGrossWeight: number | null;
  totalNetWeight: number | null;
  totalVolume: number | null;
  totalPackages: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  containers?: ImportContainer[];
}

// ImportContainer
export interface ImportContainer {
  id: number;
  shipmentId: number;
  containerNumber: string;
  sealNumber: string | null;
  containerType: ContainerType;
  grossWeight: number | null;
  netWeight: number | null;
  volume: number | null;
  packageCount: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ImportCustomsClearance
export interface ImportCustomsClearance {
  id: number;
  importOrderId: number;
  clearingAgentId: number | null;
  clearingAgentLicense: string | null;
  paarNumber: string | null;
  paarDate: string | null;
  paarAmount: number | null;
  sgdNumber: string | null;
  sgdDate: string | null;
  riskChannel: RiskChannel | null;
  examinationDate: string | null;
  examinationResult: string | null;
  releaseOrderNumber: string | null;
  releaseDate: string | null;
  terminalName: string | null;
  terminalCharges: number | null;
  haulageCost: number | null;
  demurrageDays: number | null;
  demurrageCharges: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ImportDutyAssessment
export interface ImportDutyAssessment {
  id: number;
  importOrderId: number;
  cifValue: number | null;
  exchangeRate: number | null;
  cifValueNgn: number | null;
  dutyRate: number | null;
  dutyAmount: number | null;
  surchargeRate: number | null;
  surchargeAmount: number | null;
  cissRate: number | null;
  cissAmount: number | null;
  etlsRate: number | null;
  etlsAmount: number | null;
  vatRate: number | null;
  vatAmount: number | null;
  totalAssessment: number | null;
  assessmentDate: string | null;
  assessmentNumber: string | null;
  isPaid: boolean;
  paidDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ImportDocument
export interface ImportDocument {
  id: number;
  importOrderId: number;
  documentType: DocumentType;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  issuedBy: string | null;
  fileUrl: string | null;
  isVerified: boolean;
  verifiedBy: number | null;
  verifiedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ImportCertification
export interface ImportCertification {
  id: number;
  importOrderId: number;
  certificationType: CertificationType;
  certificateNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  issuedBy: string | null;
  feeAmount: number | null;
  status: string;
  fileUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ImportLandedCost
export interface ImportLandedCost {
  id: number;
  importOrderLineId: number;
  fobCost: number | null;
  freightCost: number | null;
  insuranceCost: number | null;
  cifCost: number | null;
  dutyAmount: number | null;
  surchargeAmount: number | null;
  vatAmount: number | null;
  cissAmount: number | null;
  etlsAmount: number | null;
  clearingCharges: number | null;
  terminalCharges: number | null;
  haulageCharges: number | null;
  demurrageCharges: number | null;
  otherCharges: number | null;
  totalLandedCost: number | null;
  landedCostPerUnit: number | null;
  exchangeRate: number | null;
  isFinalized: boolean;
  inventoryUpdated: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ImportStatusHistory
export interface ImportStatusHistory {
  id: number;
  importOrderId: number;
  fromStatus: string | null;
  toStatus: string;
  // Backend returns previousStatus/newStatus — map both
  previousStatus?: string | null;
  newStatus?: string;
  changedBy: number | null;
  notes: string | null;
  changedAt: string;
  createdAt?: string;
}

// ============================================================================
// TYPES - STATS & DASHBOARD
// ============================================================================

export interface ImportOrderStats {
  total: number;
  byStatus: Record<string, number>;
  totalValue: number;
}

export interface ImportDashboard {
  stats: ImportOrderStats;
  recentOrders: ImportOrder[];
  pendingFormM: number;
  pendingLC: number;
  inTransit: number;
  pendingClearance: number;
}

// ============================================================================
// TYPES - QUERY & FILTER
// ============================================================================

export interface ImportOrderQuery {
  search?: string;
  status?: ImportOrderStatus;
  supplierId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

// Paginated response type
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// TYPES - DTOs
// ============================================================================

export interface CreateImportOrderLineDto {
  itemId: number;
  description?: string;
  hsCode?: string;
  quantity: number;
  uomId?: number;
  unitPrice: number;
  grossWeightKg?: number;
  netWeightKg?: number;
  volumeCbm?: number;
  packageCount?: number;
  packageType?: string;
  notes?: string;
}

export interface CreateImportOrderDto {
  branchId?: number;
  supplierId: number;
  currencyId?: number;
  exchangeRate?: number;
  incoterms?: Incoterms;
  paymentInstrument?: PaymentInstrument;
  proformaNumber?: string;
  proformaDate?: string;
  proformaAmount?: number;
  countryOfOrigin?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  finalDestination?: string;
  warehouseId?: number;
  expectedDeliveryDate?: string;
  notes?: string;
  lines: CreateImportOrderLineDto[];
}

export interface UpdateImportOrderDto {
  currencyId?: number;
  exchangeRate?: number;
  incoterms?: Incoterms;
  paymentInstrument?: PaymentInstrument;
  proformaNumber?: string;
  proformaDate?: string;
  proformaAmount?: number;
  countryOfOrigin?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  finalDestination?: string;
  warehouseId?: number;
  expectedDeliveryDate?: string;
  notes?: string;
  lines?: CreateImportOrderLineDto[];
}

export interface CreateImportFormMDto {
  formMNumber?: string;
  baNumber?: string;
  bankId?: number;
  amount?: number;
  currencyId?: number;
  submittedDate?: string;
  expiryDate?: string;
  notes?: string;
}

export interface UpdateImportFormMDto {
  formMNumber?: string;
  baNumber?: string;
  bankId?: number;
  amount?: number;
  currencyId?: number;
  submittedDate?: string;
  expiryDate?: string;
  notes?: string;
}

export interface CreateImportLCDto {
  lcNumber?: string;
  lcType?: LCType;
  issuingBankId?: number;
  advisingBankName?: string;
  confirmingBankName?: string;
  amount?: number;
  currencyId?: number;
  exchangeRate?: number;
  marginPercentage?: number;
  marginAmount?: number;
  tenorDays?: number;
  issueDate?: string;
  expiryDate?: string;
  latestShipmentDate?: string;
  notes?: string;
}

export interface UpdateImportLCDto {
  lcNumber?: string;
  lcType?: LCType;
  issuingBankId?: number;
  advisingBankName?: string;
  confirmingBankName?: string;
  amount?: number;
  currencyId?: number;
  exchangeRate?: number;
  marginPercentage?: number;
  marginAmount?: number;
  tenorDays?: number;
  issueDate?: string;
  expiryDate?: string;
  latestShipmentDate?: string;
  notes?: string;
}

export interface LCAmendmentDto {
  amendmentNumber?: string;
  amendmentDate?: string;
  description: string;
  previousValue?: string;
  newValue?: string;
  notes?: string;
}

export interface RecordImportPaymentDto {
  paymentType: ImportPaymentType;
  amount: number;
  currencyId?: number;
  exchangeRate?: number;
  localAmount?: number;
  bankId?: number;
  paymentDate?: string;
  reference?: string;
  description?: string;
  notes?: string;
}

export interface CreateImportShipmentDto {
  billOfLadingNumber?: string;
  airwayBillNumber?: string;
  shippingLine?: string;
  vesselName?: string;
  voyageNumber?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  estimatedDeparture?: string;
  actualDeparture?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  totalGrossWeight?: number;
  totalNetWeight?: number;
  totalVolume?: number;
  totalPackages?: number;
  notes?: string;
}

export interface UpdateImportShipmentDto {
  billOfLadingNumber?: string;
  airwayBillNumber?: string;
  shippingLine?: string;
  vesselName?: string;
  voyageNumber?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  estimatedDeparture?: string;
  actualDeparture?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  totalGrossWeight?: number;
  totalNetWeight?: number;
  totalVolume?: number;
  totalPackages?: number;
  notes?: string;
}

export interface CreateImportContainerDto {
  containerNumber: string;
  sealNumber?: string;
  containerType: ContainerType;
  grossWeight?: number;
  netWeight?: number;
  volume?: number;
  packageCount?: number;
  notes?: string;
}

export interface UpdateImportContainerDto {
  containerNumber?: string;
  sealNumber?: string;
  containerType?: ContainerType;
  grossWeight?: number;
  netWeight?: number;
  volume?: number;
  packageCount?: number;
  notes?: string;
}

export interface CreateImportClearanceDto {
  clearingAgentId?: number;
  clearingAgentLicense?: string;
  paarNumber?: string;
  paarDate?: string;
  paarAmount?: number;
  sgdNumber?: string;
  sgdDate?: string;
  riskChannel?: RiskChannel;
  terminalName?: string;
  terminalCharges?: number;
  haulageCost?: number;
  notes?: string;
}

export interface UpdateImportClearanceDto {
  clearingAgentId?: number;
  clearingAgentLicense?: string;
  paarNumber?: string;
  paarDate?: string;
  paarAmount?: number;
  sgdNumber?: string;
  sgdDate?: string;
  riskChannel?: RiskChannel;
  examinationDate?: string;
  examinationResult?: string;
  releaseOrderNumber?: string;
  releaseDate?: string;
  terminalName?: string;
  terminalCharges?: number;
  haulageCost?: number;
  demurrageDays?: number;
  demurrageCharges?: number;
  notes?: string;
}

export interface CalculateDutyDto {
  cifValue?: number;
  exchangeRate?: number;
  dutyRate?: number;
  surchargeRate?: number;
  cissRate?: number;
  etlsRate?: number;
  vatRate?: number;
}

export interface UpdateImportDutyDto {
  cifValue?: number;
  exchangeRate?: number;
  cifValueNgn?: number;
  dutyRate?: number;
  dutyAmount?: number;
  surchargeRate?: number;
  surchargeAmount?: number;
  cissRate?: number;
  cissAmount?: number;
  etlsRate?: number;
  etlsAmount?: number;
  vatRate?: number;
  vatAmount?: number;
  totalAssessment?: number;
  assessmentDate?: string;
  assessmentNumber?: string;
  notes?: string;
}

export interface MarkDutyPaidDto {
  paidDate: string;
  reference?: string;
  bankId?: number;
  notes?: string;
}

export interface AddImportDocumentDto {
  documentType: DocumentType;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  issuedBy?: string;
  fileUrl?: string;
  notes?: string;
}

export interface UpdateImportDocumentDto {
  documentType?: DocumentType;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  issuedBy?: string;
  fileUrl?: string;
  notes?: string;
}

export interface CreateImportCertificationDto {
  certificationType: CertificationType;
  certificateNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  issuedBy?: string;
  feeAmount?: number;
  fileUrl?: string;
  notes?: string;
}

export interface UpdateImportCertificationDto {
  certificationType?: CertificationType;
  certificateNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  issuedBy?: string;
  feeAmount?: number;
  fileUrl?: string;
  notes?: string;
}

// Landed cost breakdown
export interface ImportLandedCostBreakdown {
  lines: Array<ImportLandedCost & { item?: { id: number; name: string; sku: string | null } }>;
  totals: {
    fobCost: number;
    freightCost: number;
    insuranceCost: number;
    cifCost: number;
    dutyAmount: number;
    surchargeAmount: number;
    vatAmount: number;
    cissAmount: number;
    etlsAmount: number;
    clearingCharges: number;
    terminalCharges: number;
    haulageCharges: number;
    demurrageCharges: number;
    otherCharges: number;
    totalLandedCost: number;
  };
}

// Payment summary
export interface ImportPaymentSummary {
  payments: ImportPayment[];
  totalPaid: number;
  totalPaidLocal: number;
  byType: Record<string, number>;
}

// Document checklist
export interface ImportDocumentChecklist {
  required: Array<{ documentType: DocumentType; label: string; provided: boolean; verified: boolean }>;
  optional: Array<{ documentType: DocumentType; label: string; provided: boolean; verified: boolean }>;
  completionPercentage: number;
}

// ============================================================================
// IMPORT ORDERS API
// ============================================================================

export const importOrdersApi = {
  list: async (query?: ImportOrderQuery): Promise<PaginatedResponse<ImportOrder>> => {
    const response = await api.get('/purchase/imports', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<ImportOrder> => {
    const response = await api.get(`/purchase/imports/${id}`);
    return response.data;
  },

  create: async (data: CreateImportOrderDto): Promise<ImportOrder> => {
    const response = await api.post('/purchase/imports', data);
    return response.data;
  },

  update: async (id: number, data: UpdateImportOrderDto): Promise<ImportOrder> => {
    const response = await api.put(`/purchase/imports/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/purchase/imports/${id}`);
  },

  getStats: async (): Promise<ImportOrderStats> => {
    const response = await api.get('/purchase/imports/stats');
    return response.data;
  },

  getDashboard: async (): Promise<ImportDashboard> => {
    const response = await api.get('/purchase/imports/dashboard');
    return response.data;
  },

  createPurchaseInvoice: async (id: number, data: { supplierInvoiceNumber?: string; invoiceDate?: string; dueDate?: string; notes?: string }): Promise<Record<string, unknown>> => {
    const response = await api.post(`/purchase/imports/${id}/create-purchase-invoice`, data);
    return response.data;
  },

  transitionStatus: async (id: number, status: ImportOrderStatus, options?: { notes?: string; warehouseId?: number; deliveryDate?: string }): Promise<ImportOrder> => {
    const response = await api.post(`/purchase/imports/${id}/transition`, { status, ...options });
    return response.data;
  },

  close: async (id: number, notes?: string): Promise<ImportOrder> => {
    const response = await api.post(`/purchase/imports/${id}/close`, { notes });
    return response.data;
  },

  cancel: async (id: number, reason: string): Promise<ImportOrder> => {
    const response = await api.post(`/purchase/imports/${id}/cancel`, { reason });
    return response.data;
  },
};

// ============================================================================
// IMPORT FORM M API
// ============================================================================

export const importFormMApi = {
  get: async (importOrderId: number): Promise<ImportFormM> => {
    const response = await api.get(`/purchase/imports/${importOrderId}/form-m`);
    return response.data;
  },

  create: async (importOrderId: number, data: CreateImportFormMDto): Promise<ImportFormM> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/form-m`, data);
    return response.data;
  },

  update: async (importOrderId: number, id: number, data: UpdateImportFormMDto): Promise<ImportFormM> => {
    const response = await api.put(`/purchase/imports/${importOrderId}/form-m/${id}`, data);
    return response.data;
  },

  transitionStatus: async (importOrderId: number, id: number, status: FormMStatus, notes?: string): Promise<ImportFormM> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/form-m/${id}/transition`, { status, notes });
    return response.data;
  },
};

// ============================================================================
// IMPORT LETTER OF CREDIT API
// ============================================================================

export const importLCApi = {
  get: async (importOrderId: number): Promise<ImportLetterOfCredit> => {
    const response = await api.get(`/purchase/imports/${importOrderId}/lc`);
    return response.data;
  },

  create: async (importOrderId: number, data: CreateImportLCDto): Promise<ImportLetterOfCredit> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/lc`, data);
    return response.data;
  },

  update: async (importOrderId: number, id: number, data: UpdateImportLCDto): Promise<ImportLetterOfCredit> => {
    const response = await api.put(`/purchase/imports/${importOrderId}/lc/${id}`, data);
    return response.data;
  },

  addAmendment: async (importOrderId: number, id: number, amendment: LCAmendmentDto): Promise<ImportLetterOfCredit> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/lc/${id}/amend`, amendment);
    return response.data;
  },

  transitionStatus: async (importOrderId: number, id: number, status: LCStatus, notes?: string): Promise<ImportLetterOfCredit> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/lc/${id}/transition`, { status, notes });
    return response.data;
  },
};

// ============================================================================
// IMPORT PAYMENTS API
// ============================================================================

export const importPaymentsApi = {
  list: async (importOrderId: number): Promise<ImportPayment[]> => {
    const response = await api.get(`/purchase/imports/${importOrderId}/payments`);
    return response.data;
  },

  record: async (importOrderId: number, data: RecordImportPaymentDto): Promise<ImportPayment> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/payments`, data);
    return response.data;
  },

  reverse: async (
    importOrderId: number,
    id: number,
    reason: string,
    reversalDate?: string,
  ): Promise<ImportPayment> => {
    const response = await api.post(
      `/purchase/imports/${importOrderId}/payments/${id}/reverse`,
      { reason, reversalDate },
    );
    return response.data;
  },

  getSummary: async (importOrderId: number): Promise<ImportPaymentSummary> => {
    const response = await api.get(`/purchase/imports/${importOrderId}/payments/summary`);
    return response.data;
  },
};

// ============================================================================
// IMPORT SHIPMENTS API
// ============================================================================

export const importShipmentsApi = {
  list: async (importOrderId: number): Promise<ImportShipment[]> => {
    const response = await api.get(`/purchase/imports/${importOrderId}/shipments`);
    return response.data;
  },

  get: async (importOrderId: number, id: number): Promise<ImportShipment> => {
    const response = await api.get(`/purchase/imports/${importOrderId}/shipments/${id}`);
    return response.data;
  },

  create: async (importOrderId: number, data: CreateImportShipmentDto): Promise<ImportShipment> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/shipments`, data);
    return response.data;
  },

  update: async (importOrderId: number, id: number, data: UpdateImportShipmentDto): Promise<ImportShipment> => {
    const response = await api.put(`/purchase/imports/${importOrderId}/shipments/${id}`, data);
    return response.data;
  },

  addContainer: async (importOrderId: number, shipmentId: number, data: CreateImportContainerDto): Promise<ImportContainer> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/shipments/${shipmentId}/containers`, data);
    return response.data;
  },

  updateContainer: async (importOrderId: number, shipmentId: number, containerId: number, data: UpdateImportContainerDto): Promise<ImportContainer> => {
    const response = await api.put(`/purchase/imports/${importOrderId}/shipments/${shipmentId}/containers/${containerId}`, data);
    return response.data;
  },

  transitionStatus: async (importOrderId: number, id: number, status: string, notes?: string): Promise<ImportShipment> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/shipments/${id}/transition`, { status, notes });
    return response.data;
  },
};

// ============================================================================
// IMPORT CUSTOMS CLEARANCE API
// ============================================================================

export const importClearanceApi = {
  get: async (importOrderId: number): Promise<ImportCustomsClearance> => {
    const response = await api.get(`/purchase/imports/${importOrderId}/clearance`);
    return response.data;
  },

  create: async (importOrderId: number, data: CreateImportClearanceDto): Promise<ImportCustomsClearance> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/clearance`, data);
    return response.data;
  },

  update: async (importOrderId: number, id: number, data: UpdateImportClearanceDto): Promise<ImportCustomsClearance> => {
    const response = await api.put(`/purchase/imports/${importOrderId}/clearance/${id}`, data);
    return response.data;
  },

  transitionStatus: async (importOrderId: number, id: number, status: string, notes?: string): Promise<ImportCustomsClearance> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/clearance/${id}/transition`, { status, notes });
    return response.data;
  },
};

// ============================================================================
// IMPORT DUTY ASSESSMENT API
// ============================================================================

export const importDutyApi = {
  get: async (importOrderId: number): Promise<ImportDutyAssessment> => {
    const response = await api.get(`/purchase/imports/${importOrderId}/duty`);
    return response.data;
  },

  calculate: async (importOrderId: number, data: CalculateDutyDto): Promise<ImportDutyAssessment> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/duty/calculate`, data);
    return response.data;
  },

  update: async (importOrderId: number, id: number, data: UpdateImportDutyDto): Promise<ImportDutyAssessment> => {
    const response = await api.put(`/purchase/imports/${importOrderId}/duty/${id}`, data);
    return response.data;
  },

  markPaid: async (importOrderId: number, id: number, data: MarkDutyPaidDto): Promise<ImportDutyAssessment> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/duty/${id}/paid`, data);
    return response.data;
  },
};

// ============================================================================
// IMPORT DOCUMENTS API
// ============================================================================

export const importDocumentsApi = {
  list: async (importOrderId: number): Promise<ImportDocument[]> => {
    const response = await api.get(`/purchase/imports/${importOrderId}/documents`);
    return response.data;
  },

  add: async (importOrderId: number, data: AddImportDocumentDto): Promise<ImportDocument> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/documents`, data);
    return response.data;
  },

  update: async (importOrderId: number, id: number, data: UpdateImportDocumentDto): Promise<ImportDocument> => {
    const response = await api.put(`/purchase/imports/${importOrderId}/documents/${id}`, data);
    return response.data;
  },

  verify: async (importOrderId: number, id: number): Promise<ImportDocument> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/documents/${id}/verify`);
    return response.data;
  },

  getChecklist: async (importOrderId: number): Promise<ImportDocumentChecklist> => {
    const response = await api.get(`/purchase/imports/${importOrderId}/documents/checklist`);
    return response.data;
  },
};

// ============================================================================
// IMPORT CERTIFICATIONS API
// ============================================================================

export const importCertificationsApi = {
  list: async (importOrderId: number): Promise<ImportCertification[]> => {
    const response = await api.get(`/purchase/imports/${importOrderId}/certifications`);
    return response.data;
  },

  create: async (importOrderId: number, data: CreateImportCertificationDto): Promise<ImportCertification> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/certifications`, data);
    return response.data;
  },

  update: async (importOrderId: number, id: number, data: UpdateImportCertificationDto): Promise<ImportCertification> => {
    const response = await api.put(`/purchase/imports/${importOrderId}/certifications/${id}`, data);
    return response.data;
  },

  transitionStatus: async (importOrderId: number, id: number, status: string, notes?: string): Promise<ImportCertification> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/certifications/${id}/transition`, { status, notes });
    return response.data;
  },
};

// ============================================================================
// IMPORT LANDED COST API
// ============================================================================

export const importLandedCostApi = {
  get: async (importOrderId: number): Promise<ImportLandedCost[]> => {
    const response = await api.get(`/purchase/imports/${importOrderId}/landed-cost`);
    return response.data;
  },

  calculate: async (importOrderId: number): Promise<ImportLandedCost[]> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/landed-cost/calculate`);
    return response.data;
  },

  getBreakdown: async (importOrderId: number): Promise<ImportLandedCostBreakdown> => {
    const response = await api.get(`/purchase/imports/${importOrderId}/landed-cost`);
    return response.data;
  },

  finalize: async (importOrderId: number): Promise<ImportLandedCost[]> => {
    const response = await api.post(`/purchase/imports/${importOrderId}/landed-cost/finalize`);
    return response.data;
  },
};
