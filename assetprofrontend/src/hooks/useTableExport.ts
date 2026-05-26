'use client';

import { useState, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type TableExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

export interface ExportColumn<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => unknown;
  /** Format value for export */
  format?: (value: unknown, row: T) => string;
}

export interface ExportOptions {
  /** File name without extension */
  filename?: string;
  /** Include headers in export */
  includeHeaders?: boolean;
  /** Columns to export (defaults to all) */
  columns?: string[];
  /** Export only selected rows */
  selectedOnly?: boolean;
  /** Custom title for PDF */
  title?: string;
  /** Custom subtitle for PDF */
  subtitle?: string;
  /** Date format for date values */
  dateFormat?: string;
  /** Number format for numeric values */
  numberFormat?: Intl.NumberFormatOptions;
}

export interface UseTableExportConfig<T> {
  /** Column definitions for export */
  columns: ExportColumn<T>[];
  /** Data getter function */
  getData: () => T[];
  /** Selected row IDs (for selectedOnly export) */
  selectedIds?: Set<string | number>;
  /** ID key for matching selected rows */
  idKey?: keyof T;
  /** Default filename */
  defaultFilename?: string;
  /** Custom export handlers */
  handlers?: {
    csv?: (data: T[], columns: ExportColumn<T>[], options: ExportOptions) => Promise<void>;
    excel?: (data: T[], columns: ExportColumn<T>[], options: ExportOptions) => Promise<void>;
    pdf?: (data: T[], columns: ExportColumn<T>[], options: ExportOptions) => Promise<void>;
    json?: (data: T[], columns: ExportColumn<T>[], options: ExportOptions) => Promise<void>;
  };
  /** Callback after export */
  onExportComplete?: (format: TableExportFormat, rowCount: number) => void;
  /** Callback on export error */
  onExportError?: (format: TableExportFormat, error: Error) => void;
}

export interface UseTableExportReturn<T> {
  // State
  isExporting: boolean;
  exportingFormat: TableExportFormat | null;
  lastExport: { format: TableExportFormat; timestamp: Date; rowCount: number } | null;

  // Actions
  exportTo: (format: TableExportFormat, options?: ExportOptions) => Promise<void>;
  exportToCsv: (options?: ExportOptions) => Promise<void>;
  exportToExcel: (options?: ExportOptions) => Promise<void>;
  exportToPdf: (options?: ExportOptions) => Promise<void>;
  exportToJson: (options?: ExportOptions) => Promise<void>;

  // Helpers
  availableFormats: TableExportFormat[];
  canExport: boolean;
}

// ============================================================================
// CSV EXPORT HELPER
// ============================================================================

function escapeCsvValue(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains special characters
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCsv<T>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions
): string {
  const rows: string[] = [];

  // Add headers
  if (options.includeHeaders !== false) {
    rows.push(columns.map((col) => escapeCsvValue(col.header)).join(','));
  }

  // Add data rows
  for (const row of data) {
    const values = columns.map((col) => {
      let value: unknown;
      if (col.accessorFn) {
        value = col.accessorFn(row);
      } else if (col.accessorKey) {
        value = row[col.accessorKey];
      } else {
        value = '';
      }

      // Apply format if provided
      if (col.format) {
        value = col.format(value, row);
      }

      return escapeCsvValue(value);
    });
    rows.push(values.join(','));
  }

  return rows.join('\n');
}

// ============================================================================
// JSON EXPORT HELPER
// ============================================================================

function generateJson<T>(
  data: T[],
  columns: ExportColumn<T>[]
): string {
  const exportData = data.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const col of columns) {
      let value: unknown;
      if (col.accessorFn) {
        value = col.accessorFn(row);
      } else if (col.accessorKey) {
        value = row[col.accessorKey];
      }
      obj[col.id] = value;
    }
    return obj;
  });
  return JSON.stringify(exportData, null, 2);
}

// ============================================================================
// DOWNLOAD HELPER
// ============================================================================

function downloadFile(content: string | Blob, filename: string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// HOOK
// ============================================================================

export function useTableExport<T extends Record<string, unknown>>(
  config: UseTableExportConfig<T>
): UseTableExportReturn<T> {
  const {
    columns,
    getData,
    selectedIds,
    idKey = 'id' as keyof T,
    defaultFilename = 'export',
    handlers = {},
    onExportComplete,
    onExportError,
  } = config;

  // State
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<TableExportFormat | null>(null);
  const [lastExport, setLastExport] = useState<{
    format: TableExportFormat;
    timestamp: Date;
    rowCount: number;
  } | null>(null);

  // Get data to export (optionally filtered by selection)
  const getExportData = useCallback(
    (options: ExportOptions): T[] => {
      let data = getData();

      // Filter by selection if requested
      if (options.selectedOnly && selectedIds && selectedIds.size > 0) {
        data = data.filter((row) => {
          const id = row[idKey];
          return typeof id === 'string' || typeof id === 'number'
            ? selectedIds.has(id)
            : false;
        });
      }

      return data;
    },
    [getData, selectedIds, idKey]
  );

  // Get columns to export
  const getExportColumns = useCallback(
    (options: ExportOptions): ExportColumn<T>[] => {
      if (options.columns && options.columns.length > 0) {
        const columnSet = new Set(options.columns);
        return columns.filter((col) => columnSet.has(col.id));
      }
      return columns;
    },
    [columns]
  );

  // Export handlers
  const exportToCsv = useCallback(
    async (options: ExportOptions = {}) => {
      const data = getExportData(options);
      const exportColumns = getExportColumns(options);
      const filename = options.filename ?? defaultFilename;

      if (handlers.csv) {
        await handlers.csv(data, exportColumns, options);
      } else {
        const csv = generateCsv(data, exportColumns, options);
        downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8');
      }

      return data.length;
    },
    [getExportData, getExportColumns, defaultFilename, handlers]
  );

  const exportToJson = useCallback(
    async (options: ExportOptions = {}) => {
      const data = getExportData(options);
      const exportColumns = getExportColumns(options);
      const filename = options.filename ?? defaultFilename;

      if (handlers.json) {
        await handlers.json(data, exportColumns, options);
      } else {
        const json = generateJson(data, exportColumns);
        downloadFile(json, `${filename}.json`, 'application/json');
      }

      return data.length;
    },
    [getExportData, getExportColumns, defaultFilename, handlers]
  );

  const exportToExcel = useCallback(
    async (options: ExportOptions = {}) => {
      const data = getExportData(options);
      const exportColumns = getExportColumns(options);
      const filename = options.filename ?? defaultFilename;

      if (handlers.excel) {
        await handlers.excel(data, exportColumns, options);
      } else {
        // Fallback to CSV for Excel (real Excel export requires a library like xlsx)
        const csv = generateCsv(data, exportColumns, options);
        downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8');
        console.warn('Excel export fallback to CSV. Install xlsx library for true Excel export.');
      }

      return data.length;
    },
    [getExportData, getExportColumns, defaultFilename, handlers]
  );

  const exportToPdf = useCallback(
    async (options: ExportOptions = {}) => {
      const data = getExportData(options);
      const exportColumns = getExportColumns(options);

      if (handlers.pdf) {
        await handlers.pdf(data, exportColumns, options);
      } else {
        // PDF export requires a library like jspdf
        console.warn('PDF export requires a custom handler. Install jspdf or similar library.');
        throw new Error('PDF export handler not configured');
      }

      return data.length;
    },
    [getExportData, getExportColumns, handlers]
  );

  // Main export function
  const exportTo = useCallback(
    async (format: TableExportFormat, options: ExportOptions = {}) => {
      if (isExporting) return;

      setIsExporting(true);
      setExportingFormat(format);

      try {
        let rowCount = 0;

        switch (format) {
          case 'csv':
            rowCount = await exportToCsv(options);
            break;
          case 'excel':
            rowCount = await exportToExcel(options);
            break;
          case 'pdf':
            rowCount = await exportToPdf(options);
            break;
          case 'json':
            rowCount = await exportToJson(options);
            break;
        }

        setLastExport({ format, timestamp: new Date(), rowCount });
        onExportComplete?.(format, rowCount);
      } catch (error) {
        onExportError?.(format, error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsExporting(false);
        setExportingFormat(null);
      }
    },
    [
      isExporting,
      exportToCsv,
      exportToExcel,
      exportToPdf,
      exportToJson,
      onExportComplete,
      onExportError,
    ]
  );

  // Available formats
  const availableFormats: TableExportFormat[] = ['csv', 'excel', 'json'];
  if (handlers.pdf) {
    availableFormats.push('pdf');
  }

  // Can export check
  const canExport = !isExporting && getData().length > 0;

  return {
    // State
    isExporting,
    exportingFormat,
    lastExport,

    // Actions
    exportTo,
    exportToCsv: (options) => exportTo('csv', options),
    exportToExcel: (options) => exportTo('excel', options),
    exportToPdf: (options) => exportTo('pdf', options),
    exportToJson: (options) => exportTo('json', options),

    // Helpers
    availableFormats,
    canExport,
  };
}
