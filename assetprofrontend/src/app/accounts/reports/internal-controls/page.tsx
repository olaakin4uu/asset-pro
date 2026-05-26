'use client';

export const dynamic = 'force-dynamic';
import { extractErrorMessage, cn } from '@/lib/utils';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Shield, Printer, AlertTriangle, PackageX, GitBranch, ClipboardCheck,
  ChevronDown, ChevronRight, CheckCircle, XCircle, Info, Truck, CreditCard,
  ShieldAlert, AlertCircle, TrendingDown, Activity, FileText,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, LoadingSpinner, EmptyState } from '@/components/erp';
import { api } from '@/lib/api';
import type { BreadcrumbItem } from '@/types/core';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InternalControlsReport {
  generatedAt: string;
  dateRange: { startDate: string; endDate: string };
  settingsRisk: Array<{ name: string; label: string; value: unknown; riskLevel: string; module: string; implication: string }>;
  negativeStock: { items: Array<Record<string, unknown>>; totalItems: number; totalNegativeValue: number };
  zeroCostTransactions: { items: Array<Record<string, unknown>>; totalRevenue: number; count: number };
  belowCostSales: { items: Array<Record<string, unknown>>; totalLoss: number; count: number };
  unapprovedTransactions: { grns: { count: number; totalValue: number }; orders: { count: number }; invoices: { count: number } };
  overReceivedGoods: { items: Array<Record<string, unknown>>; count: number };
  glConfigGaps: {
    categories: Array<{ id: number; name: string; type: string; missingMappings: string[]; itemCount: number }>;
    customersWithoutAR: Array<{ id: number; name: string; code: string; outstandingBalance: number }>;
    suppliersWithoutAP: Array<{ id: number; name: string; code: string; outstandingBalance: number }>;
    banksWithoutGL: Array<{ id: number; name: string; accountNumber: string; currencyCode: string }>;
  };
  purchaseInspections: {
    totalInspections: number; passed: number; failed: number; partial: number;
    grnsWithoutInspection: number; grnsWithoutInspectionValue: number;
    itemsReceivedDespiteFail: Array<Record<string, unknown>>; inspectionRequired: boolean;
  };
  salesInspections: {
    totalInspections: number; passed: number; failed: number; partial: number;
    deliveriesWithoutInspection: number; deliveriesWithoutInspectionValue: number;
    itemsDispatchedDespiteFail: Array<Record<string, unknown>>; inspectionRequired: boolean;
  };
  creditRisk: {
    customersOverCreditLimit: Array<{ name: string; code: string; creditLimit: number; outstandingBalance: number; overAmount: number }>;
    overdueInvoicesCount: number; overdueInvoicesValue: number; averageDaysOverdue: number;
  };
  segregationOfDuties: {
    usersWhoCreateAndApprove: Array<{ userName: string; entityType: string; count: number }>;
  };
  inventoryHealth: { zeroCostItems: number; staleItems: number; costVarianceItems: number };
  recommendations: Array<{ priority: string; message: string; action: string }>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Reports', href: '/accounts/reports' },
  { title: 'Internal Controls & Risk' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `₦${(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtQty = (n: number) => (n ?? 0).toLocaleString();

// ─── Micro Components ────────────────────────────────────────────────────────

function PriorityBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    high: 'bg-red-100 text-red-800 border-red-300',
    critical: 'bg-red-100 text-red-800 border-red-300',
    medium: 'bg-amber-100 text-amber-800 border-amber-300',
    advisory: 'bg-amber-100 text-amber-800 border-amber-300',
    low: 'bg-green-100 text-green-800 border-green-300',
    good: 'bg-green-100 text-green-800 border-green-300',
  };
  const cls = map[level?.toLowerCase()] ?? 'bg-gray-100 text-gray-700 border-gray-200';
  return (
    <span className={cn('inline-block px-2 py-0.5 text-xs font-bold rounded border uppercase tracking-wide', cls)}>
      {level}
    </span>
  );
}

function AllClear() {
  return (
    <div className="flex items-center gap-2 py-3 px-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm font-medium">
      <CheckCircle className="h-4 w-4 shrink-0" />
      All Clear — No issues detected in this area.
    </div>
  );
}

function ImplicationBox({ text, severity = 'advisory' }: { text: string; severity?: 'critical' | 'advisory' }) {
  const base = severity === 'critical'
    ? 'bg-red-50 border-red-200 text-red-800'
    : 'bg-amber-50 border-amber-200 text-amber-800';
  const Icon = severity === 'critical' ? AlertCircle : Info;
  return (
    <div className={cn('mt-3 p-3 rounded-lg border text-xs flex gap-2', base)}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}

function ProTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border overflow-hidden print:border-gray-300">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-700 text-white print:bg-slate-200 print:text-slate-800">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-semibold tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  );
}

function Tr({ children, odd }: { children: React.ReactNode; odd?: boolean }) {
  return <tr className={cn('hover:bg-slate-50', odd ? 'bg-slate-50/60' : 'bg-white')}>{children}</tr>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-3 py-2 text-slate-700', className)}>{children}</td>;
}

// ─── Section Shell ────────────────────────────────────────────────────────────

type SectionRisk = 'critical' | 'advisory' | 'clear';

function SectionCard({
  num, title, icon: Icon, risk, children,
}: {
  num: number; title: string; icon: React.ComponentType<{ className?: string }>;
  risk: SectionRisk; children: React.ReactNode;
}) {
  const borderColor = risk === 'critical' ? 'border-l-red-500' : risk === 'advisory' ? 'border-l-amber-400' : 'border-l-green-500';
  const headerColor = risk === 'critical' ? 'text-red-700' : risk === 'advisory' ? 'text-amber-700' : 'text-green-700';

  return (
    <div className={cn('rounded-xl border bg-white border-l-4 shadow-sm print:shadow-none print:break-inside-avoid', borderColor)}>
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <div className={cn('flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white',
          risk === 'critical' ? 'bg-red-500' : risk === 'advisory' ? 'bg-amber-400' : 'bg-green-500')}>
          {num}
        </div>
        <Icon className={cn('h-4 w-4', headerColor)} />
        <h2 className={cn('font-semibold text-sm uppercase tracking-wide', headerColor)}>{title}</h2>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

function CollapsibleSection({
  num, title, icon: Icon, risk, children,
}: {
  num: number; title: string; icon: React.ComponentType<{ className?: string }>;
  risk: SectionRisk; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const borderColor = risk === 'critical' ? 'border-l-red-500' : risk === 'advisory' ? 'border-l-amber-400' : 'border-l-green-500';
  const headerColor = risk === 'critical' ? 'text-red-700' : risk === 'advisory' ? 'text-amber-700' : 'text-green-700';
  const riskLabel = risk === 'critical' ? 'HIGH RISK' : risk === 'advisory' ? 'ADVISORY' : 'CLEAR';
  const riskBadge = risk === 'critical'
    ? 'bg-red-100 text-red-700 border-red-200'
    : risk === 'advisory'
    ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-green-100 text-green-700 border-green-200';

  return (
    <div className={cn('rounded-xl border bg-white border-l-4 shadow-sm print:shadow-none print:break-inside-avoid', borderColor)}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50/60 transition-colors"
      >
        <span className="flex items-center gap-3">
          <div className={cn('flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white',
            risk === 'critical' ? 'bg-red-500' : risk === 'advisory' ? 'bg-amber-400' : 'bg-green-500')}>
            {num}
          </div>
          <Icon className={cn('h-4 w-4', headerColor)} />
          <span className={cn('font-semibold text-sm uppercase tracking-wide', headerColor)}>{title}</span>
          <span className={cn('hidden md:inline-block px-2 py-0.5 text-xs font-bold rounded border', riskBadge)}>{riskLabel}</span>
        </span>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// ─── Executive Summary ────────────────────────────────────────────────────────

function ExecutiveSummary({ data }: { data: InternalControlsReport }) {
  const settings = data.settingsRisk ?? [];
  const goodCount = settings.filter(r => r.riskLevel?.toLowerCase() === 'low' || r.riskLevel?.toLowerCase() === 'good').length;
  const totalSettings = settings.length;
  const score = totalSettings > 0 ? Math.round((goodCount / totalSettings) * 100) : 100;

  const critical = [
    ...settings.filter(r => ['high', 'critical'].includes(r.riskLevel?.toLowerCase())),
    ...(data.negativeStock.totalItems > 0 ? [{}] : []),
    ...(data.belowCostSales.count > 0 ? [{}] : []),
    ...(data.segregationOfDuties.usersWhoCreateAndApprove?.length > 0 ? [{}] : []),
  ].length;

  const advisory = [
    ...settings.filter(r => ['medium', 'advisory'].includes(r.riskLevel?.toLowerCase())),
    ...(data.zeroCostTransactions.count > 0 ? [{}] : []),
    ...(data.unapprovedTransactions.grns.count > 0 ? [{}] : []),
    ...(data.overReceivedGoods.count > 0 ? [{}] : []),
  ].length;

  const passed = settings.filter(r => ['low', 'good'].includes(r.riskLevel?.toLowerCase())).length;

  const gaugeColor = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-500' : 'text-red-600';
  const gaugeBg = score >= 80 ? 'bg-green-50 border-green-200' : score >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
  const verdict = score >= 80
    ? 'Control environment is satisfactory. Monitor advisory items and schedule periodic reviews.'
    : score >= 50
    ? 'Control gaps identified. Management attention required to address advisory and critical findings before next audit.'
    : 'Significant control deficiencies detected. Immediate management intervention required to mitigate financial and operational risk.';

  return (
    <div className={cn('rounded-xl border-2 p-6 mb-2 shadow-sm print:shadow-none', gaugeBg)}>
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Score Gauge */}
        <div className="flex flex-col items-center shrink-0">
          <div className={cn('text-6xl font-black tabular-nums', gaugeColor)}>{score}</div>
          <div className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-widest">Control Score</div>
          <div className={cn('mt-2 px-3 py-1 rounded-full text-xs font-bold border',
            score >= 80 ? 'bg-green-100 text-green-700 border-green-300'
              : score >= 50 ? 'bg-amber-100 text-amber-700 border-amber-300'
              : 'bg-red-100 text-red-700 border-red-300')}>
            {score >= 80 ? 'LOW RISK' : score >= 50 ? 'MODERATE RISK' : 'HIGH RISK'}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px self-stretch bg-current opacity-20" />

        {/* Metrics */}
        <div className="flex-1 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-red-200 bg-white p-4 text-center">
            <div className="text-3xl font-black text-red-600">{critical}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Critical Issues</div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-white p-4 text-center">
            <div className="text-3xl font-black text-amber-500">{advisory}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Advisory Items</div>
          </div>
          <div className="rounded-lg border border-green-200 bg-white p-4 text-center">
            <div className="text-3xl font-black text-green-600">{passed}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Controls Passed</div>
          </div>
        </div>
      </div>

      {/* Verdict */}
      <div className="mt-4 pt-4 border-t border-current border-opacity-20">
        <p className="text-sm font-medium text-slate-700">
          <span className="font-bold uppercase text-xs tracking-widest text-slate-500 mr-2">Management Verdict:</span>
          {verdict}
        </p>
      </div>
    </div>
  );
}

// ─── Inspection Grid ──────────────────────────────────────────────────────────

function InspectionGrid({ total, passed, failed, partial, noInspection, noInspectionLabel }: {
  total: number; passed: number; failed: number; partial: number; noInspection: number; noInspectionLabel: string;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
      <div className="rounded-lg border p-3 text-center bg-white">
        <p className="text-xl font-bold text-slate-700">{total}</p>
        <p className="text-xs text-slate-500 mt-1">Total</p>
      </div>
      <div className="rounded-lg border border-green-200 p-3 text-center bg-green-50">
        <p className="text-xl font-bold text-green-600">{passed}</p>
        <p className="text-xs text-slate-500 mt-1">Passed</p>
      </div>
      <div className="rounded-lg border border-red-200 p-3 text-center bg-red-50">
        <p className="text-xl font-bold text-red-600">{failed}</p>
        <p className="text-xs text-slate-500 mt-1">Failed</p>
      </div>
      <div className="rounded-lg border border-amber-200 p-3 text-center bg-amber-50">
        <p className="text-xl font-bold text-amber-600">{partial}</p>
        <p className="text-xs text-slate-500 mt-1">Partial</p>
      </div>
      <div className="rounded-lg border border-red-200 p-3 text-center bg-red-50">
        <p className="text-xl font-bold text-red-600">{noInspection}</p>
        <p className="text-xs text-slate-500 mt-1">{noInspectionLabel}</p>
      </div>
    </div>
  );
}

// ─── Signature Block ──────────────────────────────────────────────────────────

function SignatureBlock() {
  const cols = ['Prepared by', 'Reviewed by', 'Approved by'];
  return (
    <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm print:shadow-none print:mt-16 print:break-inside-avoid">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">Authorization & Signatures</h2>
      <div className="grid grid-cols-3 gap-8">
        {cols.map((col) => (
          <div key={col} className="space-y-4 text-sm">
            <div className="font-semibold text-slate-700 border-b pb-1">{col}</div>
            {['Name', 'Date', 'Signature'].map((field) => (
              <div key={field}>
                <div className="text-xs text-slate-400 mb-1">{field}:</div>
                <div className="border-b border-dotted border-slate-400 h-6" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Print Styles ─────────────────────────────────────────────────────────────

const printStyles = `
@media print {
  @page { size: A4; margin: 15mm 12mm; }
  body { font-size: 11px !important; color: #1e293b !important; background: white !important; }
  .no-print { display: none !important; }
  .print-break { page-break-before: always; }
  table { font-size: 10px !important; }
  thead { background-color: #e2e8f0 !important; color: #1e293b !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  tr:nth-child(odd) { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .bg-green-50, .bg-amber-50, .bg-red-50 { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InternalControlsReportPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(0, 1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data, isLoading, error: queryError } = useQuery<InternalControlsReport>({
    queryKey: ['internal-controls-report', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/accounts/reports/internal-controls', { params: { startDate, endDate } });
      return res.data;
    },
  });

  const error = queryError ? extractErrorMessage(queryError, 'Failed to load internal controls report') : null;

  const pageActions = [
    {
      id: 'print', label: 'Print Report', icon: Printer,
      variant: 'default' as const, onClick: () => window.print(),
    },
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      <PageHeader
        {...PageHeaderPresets.financial}
        icon={Shield}
        title="Internal Controls & Risk Assessment"
        description="Confidential — For Management Review Only"
        actions={pageActions}
      />

      {/* ── Filters ── */}
      <div className="no-print flex flex-wrap items-center gap-4 mb-6 p-4 rounded-xl border bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-500">Period From</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="h-9 rounded-md border px-3 text-sm bg-white" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-500">To</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="h-9 rounded-md border px-3 text-sm bg-white" />
        </div>
        {data?.generatedAt && (
          <span className="text-xs text-slate-400 ml-auto">
            Generated: {new Date(data.generatedAt).toLocaleString()}
          </span>
        )}
      </div>

      {isLoading && <LoadingSpinner fullPage />}
      {error && <EmptyState icon={Shield} title="Failed to Load Report" description={error} />}

      {data && (
        <div className="space-y-4">
          {/* ── Report Header (print only) ── */}
          <div className="hidden print:block text-center mb-6 pb-4 border-b-2 border-slate-700">
            <div className="text-xl font-black text-slate-800 uppercase tracking-wide">
              INTERNAL CONTROLS & RISK ASSESSMENT REPORT
            </div>
            <div className="text-sm text-slate-500 mt-1">Confidential — For Management Review Only</div>
            <div className="text-xs text-slate-400 mt-2">
              Period: {startDate} to {endDate} &nbsp;|&nbsp; Generated: {new Date(data.generatedAt).toLocaleString()}
            </div>
          </div>

          {/* ── Section 0: Executive Summary ── */}
          <ExecutiveSummary data={data} />

          {/* ── Section 1: Settings Risk ── */}
          {(() => {
            const items = data.settingsRisk ?? [];
            const hasHigh = items.some(r => ['high', 'critical'].includes(r.riskLevel?.toLowerCase()));
            const hasMed = items.some(r => ['medium', 'advisory'].includes(r.riskLevel?.toLowerCase()));
            const risk: SectionRisk = hasHigh ? 'critical' : hasMed ? 'advisory' : 'clear';
            return (
              <SectionCard num={1} title="Settings Risk Summary" icon={Shield} risk={risk}>
                {items.length === 0 ? <AllClear /> : (
                  <ProTable headers={['Setting', 'Current Value', 'Risk Level', 'Module', 'Implication']}>
                    {items.map((r, i) => (
                      <Tr key={r.name} odd={i % 2 === 1}>
                        <Td className="font-medium">{r.label}</Td>
                        <Td className="font-mono">{String(r.value ?? '—')}</Td>
                        <Td><PriorityBadge level={r.riskLevel} /></Td>
                        <Td className="text-slate-500">{r.module}</Td>
                        <Td className="text-slate-500 max-w-[240px]">{r.implication}</Td>
                      </Tr>
                    ))}
                  </ProTable>
                )}
              </SectionCard>
            );
          })()}

          {/* ── Section 2: Negative Stock ── */}
          {(() => {
            const ns = data.negativeStock;
            const risk: SectionRisk = ns.totalItems > 0 ? 'critical' : 'clear';
            return (
              <CollapsibleSection num={2} title="Negative Stock Exposure" icon={PackageX} risk={risk}>
                {ns.totalItems === 0 ? <AllClear /> : (
                  <>
                    <p className="text-sm mb-3 text-slate-600">
                      <strong className="text-red-600">{ns.totalItems}</strong> item{ns.totalItems !== 1 ? 's' : ''} with negative stock —
                      total exposure: <strong className="font-mono text-red-600">{fmt(ns.totalNegativeValue)}</strong>
                    </p>
                    <ProTable headers={['Item', 'Code', 'Warehouse', 'Qty', 'Avg Cost', 'Negative Value']}>
                      {ns.items.map((item, i) => (
                        <Tr key={i} odd={i % 2 === 1}>
                          <Td className="font-medium">{String(item.itemName ?? item.name ?? '—')}</Td>
                          <Td className="text-slate-500 font-mono">{String(item.itemCode ?? item.code ?? '—')}</Td>
                          <Td>{String(item.warehouseName ?? item.warehouse ?? '—')}</Td>
                          <Td className="text-red-600 font-mono text-right">{fmtQty(Number(item.quantity ?? item.qty ?? 0))}</Td>
                          <Td className="font-mono text-right">{fmt(Number(item.avgCost ?? item.averageCost ?? 0))}</Td>
                          <Td className="text-red-600 font-bold font-mono text-right">{fmt(Number(item.negativeValue ?? 0))}</Td>
                        </Tr>
                      ))}
                    </ProTable>
                    <ImplicationBox severity="critical" text="Negative stock indicates goods were dispatched or consumed without adequate stock recording. This leads to inaccurate inventory valuation, distorted cost of goods sold, and potential financial misstatement." />
                  </>
                )}
              </CollapsibleSection>
            );
          })()}

          {/* ── Section 3: Zero-Cost Transactions ── */}
          {(() => {
            const zct = data.zeroCostTransactions;
            const risk: SectionRisk = zct.count > 0 ? 'advisory' : 'clear';
            return (
              <CollapsibleSection num={3} title="Zero-Cost Transactions" icon={AlertTriangle} risk={risk}>
                {zct.count === 0 ? <AllClear /> : (
                  <>
                    <p className="text-sm mb-3 text-slate-600">
                      <strong className="text-amber-600">{zct.count}</strong> item{zct.count !== 1 ? 's' : ''} sold at zero cost —
                      total revenue: <strong className="font-mono">{fmt(zct.totalRevenue)}</strong>
                    </p>
                    <ProTable headers={['Date', 'Invoice', 'Item', 'Qty', 'Revenue']}>
                      {zct.items.map((item, i) => (
                        <Tr key={i} odd={i % 2 === 1}>
                          <Td>{String(item.date ?? '—')}</Td>
                          <Td className="font-mono">{String(item.invoiceNumber ?? item.invoice ?? '—')}</Td>
                          <Td className="font-medium">{String(item.itemName ?? item.name ?? '—')}</Td>
                          <Td className="text-right">{fmtQty(Number(item.quantity ?? item.qty ?? 0))}</Td>
                          <Td className="font-mono text-right">{fmt(Number(item.revenue ?? item.amount ?? 0))}</Td>
                        </Tr>
                      ))}
                    </ProTable>
                    <ImplicationBox text="Items sold at zero cost result in overstated gross profit and may mask inventory pricing errors. Ensure all items have accurate cost records before invoicing." />
                  </>
                )}
              </CollapsibleSection>
            );
          })()}

          {/* ── Section 4: Below-Cost Sales ── */}
          {(() => {
            const bcs = data.belowCostSales;
            const risk: SectionRisk = bcs.count > 0 ? 'critical' : 'clear';
            return (
              <CollapsibleSection num={4} title="Below-Cost Sales" icon={TrendingDown} risk={risk}>
                {bcs.count === 0 ? <AllClear /> : (
                  <>
                    <p className="text-sm mb-3 text-slate-600">
                      <strong className="text-red-600">{bcs.count}</strong> transaction{bcs.count !== 1 ? 's' : ''} sold below cost —
                      total loss: <strong className="font-mono text-red-600">{fmt(bcs.totalLoss)}</strong>
                    </p>
                    <ProTable headers={['Date', 'Invoice', 'Item', 'Qty', 'Selling Price', 'Cost', 'Loss']}>
                      {bcs.items.map((item, i) => (
                        <Tr key={i} odd={i % 2 === 1}>
                          <Td>{String(item.date ?? '—')}</Td>
                          <Td className="font-mono">{String(item.invoiceNumber ?? item.invoice ?? '—')}</Td>
                          <Td className="font-medium">{String(item.itemName ?? item.name ?? '—')}</Td>
                          <Td className="text-right">{fmtQty(Number(item.quantity ?? item.qty ?? 0))}</Td>
                          <Td className="font-mono text-right">{fmt(Number(item.sellingPrice ?? item.price ?? 0))}</Td>
                          <Td className="font-mono text-right">{fmt(Number(item.cost ?? 0))}</Td>
                          <Td className="text-red-600 font-bold font-mono text-right">{fmt(Number(item.loss ?? 0))}</Td>
                        </Tr>
                      ))}
                    </ProTable>
                    <ImplicationBox severity="critical" text="Selling below cost erodes margins and may indicate pricing policy violations, unauthorised discounts, or system errors. Review pricing controls and approval workflows." />
                  </>
                )}
              </CollapsibleSection>
            );
          })()}

          {/* ── Section 5: Unapproved Transactions ── */}
          {(() => {
            const ut = data.unapprovedTransactions;
            const total = ut.grns.count + ut.orders.count + ut.invoices.count;
            const risk: SectionRisk = total > 0 ? 'advisory' : 'clear';
            return (
              <CollapsibleSection num={5} title="Unapproved Transactions" icon={XCircle} risk={risk}>
                {total === 0 ? <AllClear /> : (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      {[
                        { label: 'Pending GRNs', count: ut.grns.count, value: ut.grns.totalValue },
                        { label: 'Pending Purchase Orders', count: ut.orders.count, value: null },
                        { label: 'Pending Invoices', count: ut.invoices.count, value: null },
                      ].map(({ label, count, value }) => (
                        <div key={label} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                          <div className="text-2xl font-bold text-amber-600">{count}</div>
                          <div className="text-xs text-slate-500 mt-1">{label}</div>
                          {value != null && <div className="text-xs font-mono font-medium mt-1">{fmt(value)}</div>}
                        </div>
                      ))}
                    </div>
                    <ImplicationBox text="Transactions pending approval represent unconfirmed commitments. Unapproved GRNs may not be accounted for in payables. Enforce approval workflows to maintain audit readiness." />
                  </>
                )}
              </CollapsibleSection>
            );
          })()}

          {/* ── Section 6: Over-Received Goods ── */}
          {(() => {
            const org = data.overReceivedGoods;
            const risk: SectionRisk = org.count > 0 ? 'advisory' : 'clear';
            return (
              <CollapsibleSection num={6} title="Over-Received Goods" icon={AlertTriangle} risk={risk}>
                {org.count === 0 ? <AllClear /> : (
                  <>
                    <p className="text-sm mb-3 text-slate-600">
                      <strong className="text-amber-600">{org.count}</strong> over-receipt record{org.count !== 1 ? 's' : ''} found.
                    </p>
                    <ProTable headers={['GRN #', 'PO #', 'Supplier', 'Item', 'PO Qty', 'Received Qty', 'Excess']}>
                      {org.items.map((item, i) => (
                        <Tr key={i} odd={i % 2 === 1}>
                          <Td className="font-mono">{String(item.grnNumber ?? item.grn ?? '—')}</Td>
                          <Td className="font-mono">{String(item.poNumber ?? item.po ?? '—')}</Td>
                          <Td>{String(item.supplierName ?? item.supplier ?? '—')}</Td>
                          <Td className="font-medium">{String(item.itemName ?? item.name ?? '—')}</Td>
                          <Td className="text-right">{fmtQty(Number(item.orderedQty ?? item.poQty ?? 0))}</Td>
                          <Td className="text-right">{fmtQty(Number(item.receivedQty ?? 0))}</Td>
                          <Td className="text-amber-600 font-bold text-right">{fmtQty(Number(item.excessQty ?? item.excess ?? 0))}</Td>
                        </Tr>
                      ))}
                    </ProTable>
                    <ImplicationBox text="Over-receipts may lead to disputes with suppliers, inflated inventory, and unmatched payables. Verify with the originating purchase orders before confirming GRNs." />
                  </>
                )}
              </CollapsibleSection>
            );
          })()}

          {/* ── Section 7: GL Configuration Gaps ── */}
          {(() => {
            const g = data.glConfigGaps;
            const totalGaps = (g.categories.length) + (g.customersWithoutAR.length) + (g.suppliersWithoutAP.length) + (g.banksWithoutGL.length);
            const risk: SectionRisk = totalGaps > 5 ? 'critical' : totalGaps > 0 ? 'advisory' : 'clear';
            const subStyle = 'text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 mt-4';
            return (
              <SectionCard num={7} title="GL Configuration Gaps" icon={GitBranch} risk={risk}>
                <div className="space-y-3">
                  <div>
                    <p className={subStyle}>7a. Inventory Categories Missing GL Mappings</p>
                    {g.categories.length === 0 ? <AllClear /> : (
                      <ProTable headers={['Category', 'Type', 'Missing Accounts', 'Items Affected']}>
                        {g.categories.map((cat, i) => (
                          <Tr key={cat.id} odd={i % 2 === 1}>
                            <Td className="font-medium">{cat.name}</Td>
                            <Td className="text-slate-500 capitalize">{cat.type}</Td>
                            <Td>
                              <div className="flex flex-wrap gap-1">
                                {(cat.missingMappings ?? []).map((m) => (
                                  <span key={m} className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded border border-red-200">{m}</span>
                                ))}
                              </div>
                            </Td>
                            <Td className="text-right">{fmtQty(cat.itemCount)}</Td>
                          </Tr>
                        ))}
                      </ProTable>
                    )}
                  </div>
                  <div>
                    <p className={subStyle}>7b. Customers Without AR Account</p>
                    {g.customersWithoutAR.length === 0 ? <AllClear /> : (
                      <ProTable headers={['Customer', 'Code', 'Outstanding Balance']}>
                        {g.customersWithoutAR.map((c, i) => (
                          <Tr key={c.id} odd={i % 2 === 1}>
                            <Td className="font-medium">{c.name}</Td>
                            <Td className="font-mono text-slate-500">{c.code}</Td>
                            <Td className={cn('font-mono text-right', (c.outstandingBalance ?? 0) > 0 ? 'text-red-600 font-bold' : '')}>{fmt(c.outstandingBalance)}</Td>
                          </Tr>
                        ))}
                      </ProTable>
                    )}
                  </div>
                  <div>
                    <p className={subStyle}>7c. Suppliers Without AP Account</p>
                    {g.suppliersWithoutAP.length === 0 ? <AllClear /> : (
                      <ProTable headers={['Supplier', 'Code', 'Outstanding Balance']}>
                        {g.suppliersWithoutAP.map((s, i) => (
                          <Tr key={s.id} odd={i % 2 === 1}>
                            <Td className="font-medium">{s.name}</Td>
                            <Td className="font-mono text-slate-500">{s.code}</Td>
                            <Td className={cn('font-mono text-right', (s.outstandingBalance ?? 0) > 0 ? 'text-red-600 font-bold' : '')}>{fmt(s.outstandingBalance)}</Td>
                          </Tr>
                        ))}
                      </ProTable>
                    )}
                  </div>
                  <div>
                    <p className={subStyle}>7d. Banks Without GL Account</p>
                    {g.banksWithoutGL.length === 0 ? <AllClear /> : (
                      <ProTable headers={['Bank Name', 'Account #', 'Currency']}>
                        {g.banksWithoutGL.map((b, i) => (
                          <Tr key={b.id} odd={i % 2 === 1}>
                            <Td className="font-medium">{b.name}</Td>
                            <Td className="font-mono text-slate-500">{b.accountNumber}</Td>
                            <Td>{b.currencyCode}</Td>
                          </Tr>
                        ))}
                      </ProTable>
                    )}
                  </div>
                  {totalGaps > 0 && (
                    <ImplicationBox severity={risk === 'critical' ? 'critical' : 'advisory'} text="GL configuration gaps mean transactions for these entities cannot be automatically posted to the general ledger. This causes un-reconciled balances and financial reporting errors." />
                  )}
                </div>
              </SectionCard>
            );
          })()}

          {/* ── Section 8: Purchase Inspections ── */}
          {(() => {
            const pi = data.purchaseInspections;
            const hasIssues = (pi?.failed ?? 0) > 0 || (pi?.grnsWithoutInspection ?? 0) > 0;
            const risk: SectionRisk = hasIssues ? 'critical' : (pi?.totalInspections ?? 0) > 0 ? 'clear' : 'advisory';
            return (
              <CollapsibleSection num={8} title="Purchase Inspection Risk" icon={ClipboardCheck} risk={risk}>
                {!pi ? <AllClear /> : (
                  <div className="space-y-3">
                    <InspectionGrid total={pi.totalInspections} passed={pi.passed} failed={pi.failed} partial={pi.partial}
                      noInspection={pi.grnsWithoutInspection} noInspectionLabel="GRNs w/o Inspection" />
                    {pi.grnsWithoutInspection > 0 && (
                      <ImplicationBox severity={pi.inspectionRequired ? 'critical' : 'advisory'}
                        text={`${pi.grnsWithoutInspection} GRN(s) worth ${fmt(pi.grnsWithoutInspectionValue)} received without inspection${pi.inspectionRequired ? ' — inspection IS required by system settings.' : '.'}`} />
                    )}
                    {(pi.itemsReceivedDespiteFail ?? []).length > 0 && (
                      <>
                        <p className="text-sm font-semibold text-red-600 flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Items Received Despite Failed Inspection</p>
                        <ProTable headers={['GRN #', 'Item', 'Qty', 'Result']}>
                          {pi.itemsReceivedDespiteFail.map((item, i) => (
                            <Tr key={i} odd={i % 2 === 1}>
                              <Td className="font-mono">{String(item.grnNumber ?? '')}</Td>
                              <Td className="font-medium">{String(item.itemName ?? '')}</Td>
                              <Td className="text-right">{fmtQty(Number(item.quantity ?? 0))}</Td>
                              <Td><span className="text-red-600 font-semibold">{String(item.result ?? '')}</span></Td>
                            </Tr>
                          ))}
                        </ProTable>
                        <ImplicationBox severity="critical" text="Items received despite failed inspection may not meet quality standards. Quarantine, return to supplier, or arrange re-inspection immediately." />
                      </>
                    )}
                    {!hasIssues && pi.totalInspections === 0 && <AllClear />}
                  </div>
                )}
              </CollapsibleSection>
            );
          })()}

          {/* ── Section 9: Sales Inspections ── */}
          {(() => {
            const si = data.salesInspections;
            const hasIssues = (si?.failed ?? 0) > 0 || (si?.deliveriesWithoutInspection ?? 0) > 0;
            const risk: SectionRisk = hasIssues ? 'critical' : (si?.totalInspections ?? 0) > 0 ? 'clear' : 'advisory';
            return (
              <CollapsibleSection num={9} title="Sales / Loading Inspection Risk" icon={Truck} risk={risk}>
                {!si ? <AllClear /> : (
                  <div className="space-y-3">
                    <InspectionGrid total={si.totalInspections} passed={si.passed} failed={si.failed} partial={si.partial}
                      noInspection={si.deliveriesWithoutInspection} noInspectionLabel="Dispatched w/o Inspection" />
                    {si.deliveriesWithoutInspection > 0 && (
                      <ImplicationBox severity={si.inspectionRequired ? 'critical' : 'advisory'}
                        text={`${si.deliveriesWithoutInspection} delivery(s) worth ${fmt(si.deliveriesWithoutInspectionValue)} dispatched without loading inspection${si.inspectionRequired ? ' — inspection IS required by system settings.' : '.'}`} />
                    )}
                    {(si.itemsDispatchedDespiteFail ?? []).length > 0 && (
                      <>
                        <p className="text-sm font-semibold text-red-600 flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Items Dispatched Despite Failed Inspection</p>
                        <ProTable headers={['Delivery #', 'Item', 'Qty', 'Result']}>
                          {si.itemsDispatchedDespiteFail.map((item, i) => (
                            <Tr key={i} odd={i % 2 === 1}>
                              <Td className="font-mono">{String(item.deliveryNumber ?? '')}</Td>
                              <Td className="font-medium">{String(item.itemName ?? '')}</Td>
                              <Td className="text-right">{fmtQty(Number(item.quantity ?? 0))}</Td>
                              <Td><span className="text-red-600 font-semibold">{String(item.result ?? '')}</span></Td>
                            </Tr>
                          ))}
                        </ProTable>
                        <ImplicationBox severity="critical" text="Items dispatched despite failed inspection may result in customer complaints, returns, and reputational damage. Contact affected customers immediately." />
                      </>
                    )}
                    {!hasIssues && si.totalInspections === 0 && <AllClear />}
                  </div>
                )}
              </CollapsibleSection>
            );
          })()}

          {/* ── Section 10: Credit Risk ── */}
          {(() => {
            const cr = data.creditRisk;
            const hasIssues = (cr?.customersOverCreditLimit?.length ?? 0) > 0 || (cr?.overdueInvoicesCount ?? 0) > 0;
            const isHigh = (cr?.overdueInvoicesValue ?? 0) > 1000000;
            const risk: SectionRisk = hasIssues ? (isHigh ? 'critical' : 'advisory') : 'clear';
            return (
              <CollapsibleSection num={10} title="Credit Risk Exposure" icon={CreditCard} risk={risk}>
                {!cr || !hasIssues ? <AllClear /> : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                        <p className="text-xl font-bold text-red-600">{cr.customersOverCreditLimit?.length ?? 0}</p>
                        <p className="text-xs text-slate-500 mt-1">Over Credit Limit</p>
                      </div>
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                        <p className="text-xl font-bold text-amber-600">{cr.overdueInvoicesCount}</p>
                        <p className="text-xs text-slate-500 mt-1">Overdue Invoices</p>
                      </div>
                      <div className="rounded-lg border p-3 text-center bg-white">
                        <p className="text-xl font-bold text-slate-700">{cr.averageDaysOverdue}</p>
                        <p className="text-xs text-slate-500 mt-1">Avg Days Overdue</p>
                      </div>
                    </div>
                    {cr.overdueInvoicesCount > 0 && (
                      <ImplicationBox severity={isHigh ? 'critical' : 'advisory'}
                        text={`${fmt(cr.overdueInvoicesValue ?? 0)} in overdue invoices — average ${cr.averageDaysOverdue} days past due. Escalate collection for long-overdue accounts.`} />
                    )}
                    {(cr.customersOverCreditLimit?.length ?? 0) > 0 && (
                      <ProTable headers={['Customer', 'Code', 'Credit Limit', 'Outstanding', 'Over By']}>
                        {cr.customersOverCreditLimit.map((c, i) => (
                          <Tr key={i} odd={i % 2 === 1}>
                            <Td className="font-medium">{c.name}</Td>
                            <Td className="font-mono text-slate-500">{c.code}</Td>
                            <Td className="font-mono text-right">{fmt(c.creditLimit)}</Td>
                            <Td className="font-mono text-right">{fmt(c.outstandingBalance)}</Td>
                            <Td className="text-red-600 font-bold font-mono text-right">{fmt(c.overAmount)}</Td>
                          </Tr>
                        ))}
                      </ProTable>
                    )}
                  </div>
                )}
              </CollapsibleSection>
            );
          })()}

          {/* ── Section 11: Segregation of Duties ── */}
          {(() => {
            const sod = data.segregationOfDuties;
            const violations = sod?.usersWhoCreateAndApprove ?? [];
            const risk: SectionRisk = violations.length > 0 ? 'critical' : 'clear';
            return (
              <CollapsibleSection num={11} title="Segregation of Duties" icon={ShieldAlert} risk={risk}>
                {violations.length === 0 ? <AllClear /> : (
                  <div className="space-y-3">
                    <ProTable headers={['User', 'Entity Type', 'Occurrences']}>
                      {violations.map((v, i) => (
                        <Tr key={i} odd={i % 2 === 1}>
                          <Td className="font-medium">{v.userName}</Td>
                          <Td className="capitalize">{v.entityType.replace(/_/g, ' ')}</Td>
                          <Td className="text-red-600 font-bold text-right">{v.count}</Td>
                        </Tr>
                      ))}
                    </ProTable>
                    <ImplicationBox severity="critical" text="Users who create AND approve their own transactions bypass internal controls. This is a fraud risk. Configure approval flows to require a different approver for each transaction type." />
                  </div>
                )}
              </CollapsibleSection>
            );
          })()}

          {/* ── Section 12: Inventory Health ── */}
          {(() => {
            const ih = data.inventoryHealth;
            const total = (ih.zeroCostItems ?? 0) + (ih.staleItems ?? 0) + (ih.costVarianceItems ?? 0);
            const risk: SectionRisk = ih.zeroCostItems > 0 ? 'advisory' : total > 0 ? 'advisory' : 'clear';
            return (
              <SectionCard num={12} title="Inventory Health Metrics" icon={Activity} risk={risk}>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Zero-Cost Items', value: ih.zeroCostItems, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
                    { label: 'Stale Items (90+ days)', value: ih.staleItems, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                    { label: 'Cost Variance Items', value: ih.costVarianceItems, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={cn('rounded-lg border p-4 text-center', bg)}>
                      <div className={cn('text-3xl font-black', color)}>{fmtQty(value ?? 0)}</div>
                      <div className="text-xs text-slate-500 mt-1">{label}</div>
                    </div>
                  ))}
                </div>
                {total > 0 && (
                  <ImplicationBox text="Inventory health issues affect cost accuracy and financial reporting. Zero-cost items distort COGS; stale items may require write-downs; cost variance items need investigation." />
                )}
              </SectionCard>
            );
          })()}

          {/* ── Section 13: Recommendations Action Plan ── */}
          {(() => {
            const recs = data.recommendations ?? [];
            return (
              <SectionCard num={13} title="Recommendations & Action Plan" icon={FileText} risk={recs.length > 0 ? 'advisory' : 'clear'}>
                {recs.length === 0 ? (
                  <AllClear />
                ) : (
                  <ProTable headers={['#', 'Priority', 'Finding', 'Recommended Action', 'Responsible', 'Target Date']}>
                    {recs.map((rec, i) => (
                      <Tr key={i} odd={i % 2 === 1}>
                        <Td className="font-bold text-slate-400 text-right">{i + 1}</Td>
                        <Td><PriorityBadge level={rec.priority} /></Td>
                        <Td className="font-medium max-w-[200px]">{rec.message}</Td>
                        <Td className="text-slate-600 max-w-[220px]">{rec.action}</Td>
                        <Td className="text-slate-300 print:text-slate-200 min-w-[80px]">___________</Td>
                        <Td className="text-slate-300 print:text-slate-200 min-w-[80px]">___________</Td>
                      </Tr>
                    ))}
                  </ProTable>
                )}
              </SectionCard>
            );
          })()}

          {/* ── Signature Block ── */}
          <SignatureBlock />
        </div>
      )}
    </TenantLayout>
  );
}
