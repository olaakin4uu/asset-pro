'use client';

import { X, Printer, CalendarDays, TrendingDown, Landmark, BarChart3 } from 'lucide-react';
import { generatePreviewSchedule, type SchedulePreviewInput } from '@/lib/schedule-preview';

const fmt = (v: number) =>
  v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const METHOD_LABELS: Record<string, string> = {
  emi: 'Equal Monthly Installments (EMI)',
  declining_balance: 'Declining Balance',
  bullet: 'Bullet (Profit-Only)',
  balloon: 'Balloon Payment',
};

const G = {
  forest:  '#14532d',
  deep:    '#166534',
  mid:     '#15803d',
  soft:    '#16a34a',
  light:   '#dcfce7',
  lighter: '#f0fdf4',
  border:  '#bbf7d0',
  mint:    '#86efac',
};

interface SchedulePreviewModalProps {
  open: boolean;
  onClose: () => void;
  input: SchedulePreviewInput;
  customerName?: string;
  facilityTypeName?: string;
}

function buildPrintHtml(
  rows: ReturnType<typeof generatePreviewSchedule>,
  input: SchedulePreviewInput,
  customerName: string,
  facilityTypeName: string,
  totalPrincipal: number,
  totalProfit: number,
  totalPayment: number,
): string {
  const metaItems = [
    { label: 'Customer',           value: customerName  || '—' },
    { label: 'Facility Type',      value: facilityTypeName || '—' },
    { label: 'Repayment Method',   value: METHOD_LABELS[input.repaymentMethod] || input.repaymentMethod },
    { label: 'Frequency',          value: input.repaymentFrequency === 'quarterly' ? 'Quarterly' : 'Monthly' },
    { label: 'Cost Price',         value: `&#8358;${fmt(input.costPrice)}` },
    { label: 'Annual Profit Rate', value: `${input.profitRate}%` },
    { label: 'Tenure',             value: `${input.tenureMonths} months` },
    { label: 'Total Installments', value: String(rows.length) },
  ];

  const metaHtml = metaItems.map((m) => `
    <div style="background:${G.lighter};border:1px solid ${G.border};border-radius:8px;padding:8px 12px;">
      <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:${G.deep};margin-bottom:3px;">${m.label}</div>
      <div style="font-size:12px;font-weight:700;color:${G.forest};">${m.value}</div>
    </div>`).join('');

  const totalsHtml = [
    { label: 'Total Principal',  value: `&#8358;${fmt(totalPrincipal)}` },
    { label: 'Total Profit',     value: `&#8358;${fmt(totalProfit)}` },
    { label: 'Total Repayment',  value: `&#8358;${fmt(totalPayment)}` },
  ].map((t) => `
    <div style="background:${G.forest};border-radius:8px;padding:10px 14px;">
      <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:${G.mint};margin-bottom:3px;">${t.label}</div>
      <div style="font-size:14px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums;">${t.value}</div>
    </div>`).join('');

  const rowsHtml = rows.map((row) => {
    const bg = row.installmentNumber % 2 === 0 ? G.lighter : '#fff';
    const dueDate = row.dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return `
      <tr>
        <td style="padding:5px 9px;border-bottom:1px solid ${G.border};background:${bg};color:${G.deep};font-weight:700;font-variant-numeric:tabular-nums;">${row.installmentNumber}</td>
        <td style="padding:5px 9px;border-bottom:1px solid ${G.border};background:${bg};color:#374151;">${dueDate}</td>
        <td style="padding:5px 9px;border-bottom:1px solid ${G.border};background:${bg};text-align:right;color:#374151;font-variant-numeric:tabular-nums;">${fmt(row.principalPortion)}</td>
        <td style="padding:5px 9px;border-bottom:1px solid ${G.border};background:${bg};text-align:right;color:${G.soft};font-weight:600;font-variant-numeric:tabular-nums;">${fmt(row.profitPortion)}</td>
        <td style="padding:5px 9px;border-bottom:1px solid ${G.border};background:${bg};text-align:right;color:${G.forest};font-weight:700;font-variant-numeric:tabular-nums;">${fmt(row.totalAmount)}</td>
        <td style="padding:5px 9px;border-bottom:1px solid ${G.border};background:${bg};text-align:right;color:#6b7280;font-variant-numeric:tabular-nums;">${fmt(row.balanceAfter)}</td>
      </tr>`;
  }).join('');

  const noteText = [
    'Schedule is indicative; actual due dates are calculated from the disbursement date.',
    input.repaymentMethod === 'declining_balance' ? ' Declining balance: profit decreases each period as principal reduces.' : '',
    input.repaymentMethod === 'balloon'           ? ' Balloon: final installment includes a 50% principal balloon repayment.' : '',
    input.repaymentMethod === 'bullet'            ? ' Bullet: profit-only payments throughout; full principal returned at maturity.' : '',
  ].join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Payment Schedule — ${customerName || 'Credit Facility'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a2e1a; background: #fff; padding: 28px 32px; }
    table { width: 100%; border-collapse: collapse; }
    @media print {
      body { padding: 16px; }
      @page { margin: 1cm; size: A4 landscape; }
    }
  </style>
</head>
<body>

  <!-- Title -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;padding-bottom:14px;border-bottom:3px solid ${G.forest};">
    <div>
      <div style="font-size:20px;font-weight:700;color:${G.forest};letter-spacing:-.3px;">Payment Schedule</div>
      <div style="font-size:10px;color:#555;margin-top:3px;">Indicative preview — actual due dates calculated from disbursement date</div>
    </div>
    <div style="background:${G.forest};color:#fff;font-size:9px;font-weight:700;padding:4px 12px;border-radius:20px;margin-top:4px;">INDICATIVE PREVIEW</div>
  </div>

  <!-- Meta cards -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;">
    ${metaHtml}
  </div>

  <!-- Totals bar -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">
    ${totalsHtml}
  </div>

  <!-- Table -->
  <div style="border:1px solid ${G.border};border-radius:10px;overflow:hidden;">
    <table>
      <thead>
        <tr style="background:${G.forest};">
          <th style="padding:8px 9px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#fff;">#</th>
          <th style="padding:8px 9px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#fff;">Due Date</th>
          <th style="padding:8px 9px;text-align:right;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#fff;">Principal (&#8358;)</th>
          <th style="padding:8px 9px;text-align:right;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#fff;">Profit (&#8358;)</th>
          <th style="padding:8px 9px;text-align:right;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#fff;">Installment (&#8358;)</th>
          <th style="padding:8px 9px;text-align:right;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#fff;">Balance After (&#8358;)</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <tr style="background:${G.forest};">
          <td colspan="2" style="padding:8px 9px;font-weight:700;font-size:10px;color:#fff;">TOTALS</td>
          <td style="padding:8px 9px;text-align:right;font-weight:700;font-size:10px;color:#fff;font-variant-numeric:tabular-nums;">${fmt(totalPrincipal)}</td>
          <td style="padding:8px 9px;text-align:right;font-weight:700;font-size:10px;color:${G.mint};font-variant-numeric:tabular-nums;">${fmt(totalProfit)}</td>
          <td style="padding:8px 9px;text-align:right;font-weight:700;font-size:10px;color:#fff;font-variant-numeric:tabular-nums;">${fmt(totalPayment)}</td>
          <td style="padding:8px 9px;text-align:right;font-weight:700;font-size:10px;color:${G.mint};font-variant-numeric:tabular-nums;">0.00</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Note -->
  <p style="font-size:9px;color:#888;margin-top:10px;padding-top:8px;border-top:1px solid ${G.border};">* ${noteText}</p>

</body>
</html>`;
}

export function SchedulePreviewModal({
  open,
  onClose,
  input,
  customerName,
  facilityTypeName,
}: SchedulePreviewModalProps) {
  if (!open) return null;

  const rows = generatePreviewSchedule(input);
  const totalPrincipal = rows.reduce((s, r) => s + r.principalPortion, 0);
  const totalProfit    = rows.reduce((s, r) => s + r.profitPortion,    0);
  const totalPayment   = rows.reduce((s, r) => s + r.totalAmount,      0);

  const handlePrint = () => {
    const html = buildPrintHtml(rows, input, customerName || '', facilityTypeName || '', totalPrincipal, totalProfit, totalPayment);
    const win = window.open('', '_blank', 'width=1000,height=760');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  const metaItems = [
    { label: 'Customer',           value: customerName || '—',       icon: <Landmark className="h-3 w-3" /> },
    { label: 'Facility Type',      value: facilityTypeName || '—',   icon: <BarChart3 className="h-3 w-3" /> },
    { label: 'Repayment Method',   value: METHOD_LABELS[input.repaymentMethod] || input.repaymentMethod, icon: <TrendingDown className="h-3 w-3" /> },
    { label: 'Frequency',          value: input.repaymentFrequency === 'quarterly' ? 'Quarterly' : 'Monthly', icon: <CalendarDays className="h-3 w-3" /> },
    { label: 'Cost Price',         value: `₦${fmt(input.costPrice)}` },
    { label: 'Annual Profit Rate', value: `${input.profitRate}%` },
    { label: 'Tenure',             value: `${input.tenureMonths} months` },
    { label: 'Total Installments', value: String(rows.length) },
  ];

  return (
    <div className="fixed inset-0 z-[9998] flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-6 px-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ border: `1px solid ${G.border}` }}>

        {/* Header */}
        <div style={{ background: G.forest }} className="flex items-center justify-between px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Payment Schedule Preview</h2>
            <p className="text-xs mt-0.5" style={{ color: G.mint }}>
              Indicative — actual due dates calculated from disbursement date
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: G.soft, color: '#fff' }}
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center h-8 w-8 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: G.mint }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">

          {/* Meta cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {metaItems.map((item) => (
              <div
                key={item.label}
                className="rounded-xl px-3 py-2.5"
                style={{ background: G.lighter, border: `1px solid ${G.border}` }}
              >
                <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: G.deep }}>
                  {'icon' in item && item.icon}
                  {item.label}
                </p>
                <p className="text-sm font-bold" style={{ color: G.forest }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Totals bar */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Total Principal', value: `₦${fmt(totalPrincipal)}` },
              { label: 'Total Profit',    value: `₦${fmt(totalProfit)}` },
              { label: 'Total Repayment', value: `₦${fmt(totalPayment)}` },
            ].map((item) => (
              <div key={item.label} className="rounded-xl px-4 py-3" style={{ background: G.forest }}>
                <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: G.mint }}>{item.label}</p>
                <p className="text-base font-bold tabular-nums text-white">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${G.border}` }}>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: G.forest }}>
                  <th className="px-3 py-2.5 text-left font-semibold text-white text-[11px]">#</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-white text-[11px]">Due Date</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-white text-[11px]">Principal (₦)</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-white text-[11px]">Profit (₦)</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-white text-[11px]">Installment (₦)</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-white text-[11px]">Balance After (₦)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const bg = row.installmentNumber % 2 === 0 ? G.lighter : '#fff';
                  return (
                    <tr key={row.installmentNumber} style={{ borderBottom: `1px solid ${G.border}` }}>
                      <td className="px-3 py-2 font-bold font-mono" style={{ background: bg, color: G.deep }}>{row.installmentNumber}</td>
                      <td className="px-3 py-2" style={{ background: bg, color: '#374151' }}>
                        {row.dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-3 py-2 text-right font-mono" style={{ background: bg, color: '#374151' }}>{fmt(row.principalPortion)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold" style={{ background: bg, color: G.soft }}>{fmt(row.profitPortion)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold" style={{ background: bg, color: G.forest }}>{fmt(row.totalAmount)}</td>
                      <td className="px-3 py-2 text-right font-mono" style={{ background: bg, color: '#6b7280' }}>{fmt(row.balanceAfter)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: G.forest }}>
                  <td colSpan={2} className="px-3 py-2.5 font-bold text-xs text-white">TOTALS</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-xs text-white">{fmt(totalPrincipal)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-xs" style={{ color: G.mint }}>{fmt(totalProfit)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-xs text-white">{fmt(totalPayment)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-xs" style={{ color: G.mint }}>0.00</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-[10px] mt-3 pt-2" style={{ color: '#6b7280', borderTop: `1px solid ${G.border}` }}>
            * Schedule is indicative and based on application date as start date. Actual due dates will be calculated from the disbursement date.
            {input.repaymentMethod === 'declining_balance' && ' Declining balance: profit decreases each period as the principal reduces.'}
            {input.repaymentMethod === 'balloon' && ' Balloon: final installment includes a 50% principal balloon repayment.'}
            {input.repaymentMethod === 'bullet' && ' Bullet: profit-only payments throughout; full principal returned at maturity.'}
          </p>
        </div>
      </div>
    </div>
  );
}
