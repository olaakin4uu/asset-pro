// ============================================================================
// PRINTING MODULE TYPES
// ============================================================================

// Enums
export enum TemplateFormat {
  THERMAL = 'THERMAL',
  A4 = 'A4',
  A5 = 'A5',
  LETTER = 'LETTER',
}

export enum TemplateEngine {
  HTML = 'HTML',
  DESIGNER = 'DESIGNER',
}

export enum Orientation {
  PORTRAIT = 'PORTRAIT',
  LANDSCAPE = 'LANDSCAPE',
}

export enum FieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  CURRENCY = 'CURRENCY',
  BOOLEAN = 'BOOLEAN',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT',
}

// ============================================================================
// PRINT TEMPLATE TYPES
// ============================================================================

export interface PrintTemplate {
  id: number;
  companyId: number;
  documentType: string;
  name: string;
  description: string | null;
  format: string; // TemplateFormat as string
  engine: string; // TemplateEngine as string
  orientation: string; // Orientation as string
  headerHtml: string | null;
  bodyHtml: string | null;
  footerHtml: string | null;
  designerJson: string | null;
  customCss: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt: string | Date | null;
  createdBy: number;
  updatedBy: number | null;
}

export interface CreatePrintTemplateDto {
  documentType: string;
  name: string;
  description?: string;
  format: TemplateFormat;
  engine: TemplateEngine;
  orientation: Orientation;
  headerHtml?: string;
  bodyHtml?: string;
  footerHtml?: string;
  designerJson?: string;
  customCss?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdatePrintTemplateDto {
  name?: string;
  description?: string;
  format?: TemplateFormat;
  orientation?: Orientation;
  headerHtml?: string;
  bodyHtml?: string;
  footerHtml?: string;
  designerJson?: string;
  customCss?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface PrintTemplateQueryParams {
  documentType?: string;
  format?: TemplateFormat;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ============================================================================
// PRINT REQUEST TYPES
// ============================================================================

export interface GeneratePrintDto {
  documentType: string;
  entityId: number;
  templateId?: number;
  format?: TemplateFormat;
  data?: Record<string, unknown>;
}

export interface PreviewPrintDto {
  templateId: number;
  sampleData: Record<string, unknown>;
}

export interface BatchPrintDto {
  requests: GeneratePrintDto[];
}

// ============================================================================
// FIELD DEFINITION TYPES
// ============================================================================

export interface FieldDefinition {
  name: string;
  label: string;
  type: string; // FieldType as string
  description?: string;
  isRequired?: boolean;
  defaultValue?: unknown;
}

export interface DocumentTypeFieldsDto {
  documentType: string;
  fields: FieldDefinition[];
}

// ============================================================================
// DESIGNER TYPES
// ============================================================================

export interface DesignerElement {
  id: string;
  type: 'text' | 'image' | 'table' | 'line' | 'rectangle' | 'barcode' | 'qrcode' | 'field';
  x: number;
  y: number;
  width: number;
  height: number;
  properties: Record<string, unknown>;
}

export interface DesignerConfig {
  version: string;
  elements: DesignerElement[];
  pageSize: {
    width: number;
    height: number;
  };
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

// ============================================================================
// STATS TYPES
// ============================================================================

export interface TemplateStats {
  total: number;
  byDocumentType: Record<string, number>;
  byFormat: Record<string, number>;
  byEngine: Record<string, number>;
  active: number;
  inactive: number;
}

// ============================================================================
// DOCUMENT TYPE DEFINITIONS
// ============================================================================

export const DOCUMENT_TYPES = [
  { value: 'sales-invoice', label: 'Sales Invoice', module: 'Sales' },
  { value: 'sales-receipt', label: 'Sales Receipt', module: 'Sales' },
  { value: 'sales-order', label: 'Sales Order', module: 'Sales' },
  { value: 'delivery-note', label: 'Delivery Note', module: 'Sales' },
  { value: 'quotation', label: 'Quotation', module: 'Sales' },
  { value: 'purchase-order', label: 'Purchase Order', module: 'Purchase' },
  { value: 'purchase-invoice', label: 'Purchase Invoice', module: 'Purchase' },
  { value: 'grn', label: 'Goods Received Note', module: 'Purchase' },
  { value: 'purchase-requisition', label: 'Purchase Requisition', module: 'Purchase' },
  { value: 'payslip', label: 'Payslip', module: 'HR & Payroll' },
  { value: 'expense-request', label: 'Expense Request', module: 'Accounts' },
  { value: 'journal-entry', label: 'Journal Entry', module: 'Accounts' },
  { value: 'asset-register', label: 'Asset Register', module: 'Assets' },
  { value: 'stock-transfer', label: 'Stock Transfer', module: 'Inventory' },
  { value: 'production-order', label: 'Production Order', module: 'Manufacturing' },
  { value: 'loading-order-permit', label: 'Loading Order Permit', module: 'Sales' },
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number]['value'];

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface TemplatePreview {
  templateId: number;
  html: string;
  css: string;
}

export interface PrintJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: string; // URL or base64
  error?: string;
}
