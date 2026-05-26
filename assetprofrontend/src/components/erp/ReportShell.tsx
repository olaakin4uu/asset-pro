'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import type { BreadcrumbItem } from '@/types/core';
import type { LucideIcon } from 'lucide-react';

export interface ExportAction {
  label: string;
  format: 'csv' | 'excel' | 'pdf';
  onClick: () => void;
}

interface ReportShellProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  subtitle?: string;
  breadcrumbs: BreadcrumbItem[];
  filters?: ReactNode;
  stats?: ReactNode;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  /** Legacy single-action export (CSV). Use `exports` for multi-format. */
  onExport?: () => void;
  /** Multi-format export actions — renders a dropdown when provided. */
  exports?: ExportAction[];
  children: ReactNode;
}

function ExportDropdown({ actions }: { actions: ExportAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const icon = (fmt: string) => {
    if (fmt === 'excel') return <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />;
    if (fmt === 'pdf')   return <FileText className="w-3.5 h-3.5 text-red-500" />;
    return <Download className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent transition-colors"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 z-[200] mt-1 w-44 rounded-md border bg-popover shadow-md py-1">
          {actions.map((a) => (
            <button
              key={a.format}
              onClick={() => { a.onClick(); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              {icon(a.format)}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Shared shell for fund-management reports.
 * Provides: page header, filter row, stat cards, loading/empty/error states, export button(s).
 */
export function ReportShell({
  icon,
  title,
  description,
  subtitle,
  breadcrumbs,
  filters,
  stats,
  loading,
  error,
  empty,
  emptyMessage = 'No rows match the current filters.',
  onExport,
  exports,
  children,
}: ReportShellProps) {
  // Build header actions
  const headerActions = !exports && onExport
    ? [{ id: 'export', label: 'Export CSV', icon: Download, variant: 'outline' as const, onClick: onExport }]
    : [];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        {...PageHeaderPresets.financial}
        icon={icon}
        title={title}
        description={description}
        actions={headerActions}
      >
        {exports && exports.length > 0 && (
          <ExportDropdown actions={exports} />
        )}
      </PageHeader>

      <div className="p-6 space-y-4">
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}

        {stats && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{stats}</div>}

        {filters && (
          <div className="rounded-xl border bg-card p-4 flex flex-wrap items-end gap-3">
            {filters}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : empty ? (
          <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </TenantLayout>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

export function ReportStat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const toneClasses = {
    default: 'bg-card text-foreground',
    success: 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    danger:  'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800',
    info:    'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  };
  return (
    <div className={`rounded-xl border p-4 ${toneClasses[tone]}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {hint && <p className="text-[11px] opacity-60 mt-0.5">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table wrapper
// ---------------------------------------------------------------------------

export function ReportTable({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

export function exportToCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  headers: Array<{ key: keyof T; label: string }>,
) {
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [
    headers.map((h) => esc(h.label)).join(','),
    ...rows.map((r) => headers.map((h) => esc(r[h.key])).join(',')),
  ].join('\n');

  trigger(filename, new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
}

// ---------------------------------------------------------------------------
// Excel export (xlsx)
// ---------------------------------------------------------------------------

export interface ExcelSheet {
  name: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

export async function exportToExcel(filename: string, sheets: ExcelSheet[]) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const data = [sheet.headers, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Bold header row
    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
      if (cell) cell.s = { font: { bold: true } };
    }

    // Auto column widths
    ws['!cols'] = sheet.headers.map((h, ci) => ({
      wch: Math.max(
        h.length,
        ...sheet.rows.map((r) => String(r[ci] ?? '').length),
        10,
      ),
    }));

    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }

  XLSX.writeFile(wb, filename);
}

// ---------------------------------------------------------------------------
// PDF export (jspdf + jspdf-autotable)
// ---------------------------------------------------------------------------

export interface PdfSection {
  title?: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  subtotalRow?: string[];
  /** Per-column halign override — index matches headers array */
  columnAlign?: ('left' | 'right' | 'center')[];
}

export interface PdfMeta {
  asAt?: string;
  generatedBy?: string;
  organization?: string;
  subtitle?: string;
  /** Summary stats shown below the header */
  stats?: Array<{ label: string; value: string }>;
}

export async function exportToPdf(
  filename: string,
  reportTitle: string,
  sections: PdfSection[],
  meta?: PdfMeta,
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const EMERALD_DARK:  [number, number, number] = [2,  84, 62];   // #02543e
  const EMERALD_MID:  [number, number, number] = [4, 120, 87];    // emerald-700
  const EMERALD_LIGHT:[number, number, number] = [209, 250, 229]; // emerald-100
  const EMERALD_50:   [number, number, number] = [236, 253, 245]; // emerald-50
  const EMERALD_200:  [number, number, number] = [167, 243, 208]; // emerald-200
  const EMERALD_900:  [number, number, number] = [6, 95, 70];     // emerald-900
  const WHITE:        [number, number, number] = [255, 255, 255];

  const HEADER_H = 42;

  // ── Main header band ────────────────────────────────────────────────────────
  // Dark background
  doc.setFillColor(...EMERALD_DARK);
  doc.rect(0, 0, pageW, HEADER_H, 'F');

  // Accent stripe at very top (2mm, brighter)
  doc.setFillColor(...EMERALD_MID);
  doc.rect(0, 0, pageW, 2, 'F');

  // Left vertical accent bar
  doc.setFillColor(...EMERALD_MID);
  doc.rect(margin - 2, 6, 3, HEADER_H - 10, 'F');

  // Report title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text(reportTitle.toUpperCase(), margin + 4, 17);

  // Subtitle (if any)
  if (meta?.subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...EMERALD_LIGHT);
    doc.text(meta.subtitle, margin + 4, 25);
  }

  // Organisation name
  if (meta?.organization) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(134, 239, 172); // emerald-300
    doc.text(meta.organization, margin + 4, meta?.subtitle ? 33 : 27);
  }

  // ── Right-side date box ─────────────────────────────────────────────────────
  const boxX = pageW - margin - 58;
  const boxY = 6;
  const boxW2 = 58;
  const boxH2 = HEADER_H - 10;

  // Box background
  doc.setFillColor(4, 100, 72);
  doc.setDrawColor(...EMERALD_200);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, boxW2, boxH2, 2, 2, 'FD');

  const printedDate = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

  if (meta?.asAt) {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...EMERALD_LIGHT);
    doc.text('AS AT', boxX + boxW2 / 2, boxY + 7, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(meta.asAt, boxX + boxW2 / 2, boxY + 16, { align: 'center' });
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(134, 239, 172);
    doc.text(`Printed: ${printedDate}`, boxX + boxW2 / 2, boxY + 24, { align: 'center' });
  } else {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...EMERALD_LIGHT);
    doc.text('PRINTED', boxX + boxW2 / 2, boxY + 9, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(printedDate, boxX + boxW2 / 2, boxY + 18, { align: 'center' });
  }

  // ── Thin separator line below header ────────────────────────────────────────
  doc.setDrawColor(...EMERALD_MID);
  doc.setLineWidth(0.8);
  doc.line(0, HEADER_H, pageW, HEADER_H);

  // ── Summary stats bar ────────────────────────────────────────────────────────
  let y = HEADER_H + 4;
  if (meta?.stats && meta.stats.length > 0) {
    const statW = (pageW - margin * 2) / meta.stats.length;
    meta.stats.forEach(({ label, value }, i) => {
      const x = margin + i * statW;
      doc.setFillColor(...EMERALD_50);
      doc.setDrawColor(...EMERALD_200);
      doc.setLineWidth(0.25);
      doc.roundedRect(x + 0.5, y, statW - 1, 18, 2, 2, 'FD');

      // Top colour strip inside box
      doc.setFillColor(...EMERALD_MID);
      doc.rect(x + 0.5, y, statW - 1, 3, 'F');

      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...EMERALD_900);
      doc.text(label.toUpperCase(), x + 3.5, y + 8.5);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...EMERALD_MID);
      doc.text(value, x + 3.5, y + 15.5);
    });
    y += 22;
  }

  doc.setTextColor(0, 0, 0);

  // ── Sections ─────────────────────────────────────────────────────────────────
  for (const section of sections) {
    if (y > pageH - 40) {
      doc.addPage();
      y = 14;
    }

    if (section.title) {
      // Section header: dark band with left accent
      doc.setFillColor(...EMERALD_DARK);
      doc.rect(margin, y, pageW - margin * 2, 8, 'F');
      // Bright left accent strip
      doc.setFillColor(...EMERALD_MID);
      doc.rect(margin, y, 3, 8, 'F');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...WHITE);
      doc.text(section.title, margin + 6, y + 5.5);

      if (section.subtitle) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...EMERALD_LIGHT);
        doc.text(section.subtitle, pageW - margin - 3, y + 5.5, { align: 'right' });
      }
      doc.setTextColor(0, 0, 0);
      y += 9;
    }

    const body: string[][] = [...section.rows];
    if (section.subtotalRow) body.push(section.subtotalRow);

    const columnStyles: Record<number, { halign: 'left' | 'right' | 'center' }> = {};
    if (section.columnAlign) {
      section.columnAlign.forEach((align, ci) => {
        if (align !== 'left') columnStyles[ci] = { halign: align };
      });
    }

    autoTable(doc, {
      startY: y,
      head: [section.headers],
      body,
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
        halign: 'left',
        font: 'helvetica',
        textColor: [20, 20, 20],
      },
      headStyles: {
        fillColor: EMERALD_DARK,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'left',
        cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      },
      columnStyles,
      alternateRowStyles: { fillColor: [242, 255, 249] },
      bodyStyles: { lineColor: EMERALD_200, lineWidth: 0.1 },
      didParseCell: (data) => {
        if (data.section === 'head' && section.columnAlign) {
          const align = section.columnAlign[data.column.index];
          if (align) data.cell.styles.halign = align;
        }
        if (section.subtotalRow && data.section === 'body' && data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = EMERALD_200;
          data.cell.styles.textColor = EMERALD_DARK;
          data.cell.styles.fontSize = 8;
        }
      },
      margin: { left: margin, right: margin },
      tableWidth: pageW - margin * 2,
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  }

  // ── Footer on every page ─────────────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);

    // Footer bar
    doc.setFillColor(...EMERALD_DARK);
    doc.rect(0, pageH - 10, pageW, 10, 'F');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...EMERALD_LIGHT);
    doc.text(
      meta?.organization ? `${meta.organization}  |  ${reportTitle}` : reportTitle,
      margin,
      pageH - 4,
    );
    doc.setTextColor(134, 239, 172);
    doc.text('Private & Confidential', pageW / 2, pageH - 4, { align: 'center' });
    doc.setTextColor(...WHITE);
    doc.text(`Page ${i} of ${total}`, pageW - margin, pageH - 4, { align: 'right' });
  }

  doc.save(filename);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function trigger(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
