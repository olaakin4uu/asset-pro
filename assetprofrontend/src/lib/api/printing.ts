import { api } from '../api';
import type { PaginatedResponse } from '@/types/core';
import type {
  PrintTemplate,
  CreatePrintTemplateDto,
  UpdatePrintTemplateDto,
  PrintTemplateQueryParams,
  GeneratePrintDto,
  PreviewPrintDto,
  BatchPrintDto,
  DocumentTypeFieldsDto,
  TemplateStats,
} from '@/types/printing';

// ============================================================================
// PRINT TEMPLATES API
// ============================================================================

const printTemplatesApi = {
  /**
   * List all print templates with optional filters
   */
  list: async (params?: PrintTemplateQueryParams): Promise<PaginatedResponse<PrintTemplate>> => {
    const response = await api.get('/printing/templates', { params });
    return response.data;
  },

  /**
   * Get a single print template by ID
   */
  get: async (id: number): Promise<PrintTemplate> => {
    const response = await api.get(`/printing/templates/${id}`);
    return response.data;
  },

  /**
   * Get templates for a specific document type
   */
  getByDocumentType: async (documentType: string): Promise<PrintTemplate[]> => {
    const response = await api.get(`/printing/templates/by-type/${documentType}`);
    return response.data;
  },

  /**
   * Create a new print template
   */
  create: async (data: CreatePrintTemplateDto): Promise<PrintTemplate> => {
    const response = await api.post('/printing/templates', data);
    return response.data;
  },

  /**
   * Update an existing print template
   */
  update: async (id: number, data: UpdatePrintTemplateDto): Promise<PrintTemplate> => {
    const response = await api.patch(`/printing/templates/${id}`, data);
    return response.data;
  },

  /**
   * Delete a print template (soft delete)
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/printing/templates/${id}`);
  },

  /**
   * Clone an existing template
   */
  clone: async (id: number): Promise<PrintTemplate> => {
    const response = await api.post(`/printing/templates/${id}/clone`);
    return response.data;
  },

  /**
   * Set a template as the default for its document type
   */
  setDefault: async (id: number): Promise<PrintTemplate> => {
    const response = await api.post(`/printing/templates/${id}/set-default`);
    return response.data;
  },

  /**
   * Get template statistics
   */
  getStats: async (): Promise<TemplateStats> => {
    const response = await api.get('/printing/templates/stats');
    return response.data;
  },
};

// ============================================================================
// PRINT OPERATIONS API
// ============================================================================

const printApi = {
  /**
   * Generate a document (returns PDF file)
   */
  generate: async (data: GeneratePrintDto): Promise<Blob> => {
    const response = await api.post('/printing/print/generate', data, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Generate a document and return download URL
   */
  generateAndDownload: async (data: GeneratePrintDto, filename?: string): Promise<string> => {
    const blob = await printApi.generate(data);
    const url = window.URL.createObjectURL(blob);

    // Trigger download if filename provided
    if (filename) {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    return url;
  },

  /**
   * Preview a template with sample data
   */
  preview: async (data: PreviewPrintDto): Promise<Blob> => {
    const response = await api.post('/printing/print/preview', data, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Generate multiple documents in batch
   */
  batch: async (data: BatchPrintDto): Promise<Record<string, unknown>> => {
    const response = await api.post('/printing/print/batch', data);
    return response.data;
  },

  /**
   * Get available fields for a document type
   */
  getFields: async (documentType: string): Promise<DocumentTypeFieldsDto> => {
    const response = await api.get(`/printing/print/fields/${documentType}`);
    return response.data;
  },
};

// ============================================================================
// COMBINED PRINTING API
// ============================================================================

export const printingApi = {
  templates: printTemplatesApi,
  print: printApi,
};

// Export individual APIs for convenience
export { printTemplatesApi, printApi };
