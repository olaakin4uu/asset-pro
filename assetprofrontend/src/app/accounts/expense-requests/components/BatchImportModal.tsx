'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { Upload, Download, X, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react';
import {
  expenseRequestsApi,
  type BatchImportRow,
  type HistoricalLoadRow,
  type BatchValidationResult,
  type BatchCommitResponse,
} from '@/lib/api/accounts';
import { extractErrorMessage } from '@/lib/utils';
import { useIsSuperAdmin } from '@/hooks/usePermission';

// ============================================================================
// MODE
// ============================================================================
// Two upload modes live in the same modal because they share 90% of the UI.
// The backend endpoints are distinct, so the mode picks which API call is
// made and which columns are required.

type Mode = 'live' | 'historical';

interface BatchImportModalProps {
  open: boolean;
  onClose: () => void;
  onCommitted: (response: BatchCommitResponse) => void;
}

// ============================================================================
// CHUNKING
// ============================================================================
// Prod Nginx cuts requests at 60s and each row does real backend work
// (create + submit for live, or create + JE post for historical). A single
// big commit of 1000+ groups will blow past that ceiling. So the modal
// groups rows by externalRef, splits them into chunks of `CHUNK_SIZE`
// complete groups (never splitting a group across chunks), and commits
// them sequentially with a progress bar. Each chunk gets its own HTTP
// round-trip, so one slow chunk doesn't doom the whole upload — and
// idempotency on externalRef means a retried chunk won't double-post.

const DEFAULT_CHUNK_SIZE = 200;
const MIN_CHUNK_SIZE = 10;
const MAX_CHUNK_SIZE = 500;

interface Chunk<T> {
  index: number;       // 0-based position in the sequence
  groupCount: number;
  rowCount: number;
  rows: T[];
}

// ============================================================================
// CSV TEMPLATE CONTENT
// ============================================================================

const LIVE_TEMPLATE_HEADERS = [
  'externalRef',
  'requestDate',
  'requester',
  'description',
  'memoFrom',
  'memoTo',
  'subject',
  'background',
  'justification',
  'prayer',
  'beneficiaryName',
  'beneficiaryAccountNumber',
  'beneficiaryBankName',
  'expenseAccountCode',
  'lineDescription',
  'quantity',
  'unitPrice',
  'whtCode',
];

const HISTORICAL_TEMPLATE_HEADERS = [
  ...LIVE_TEMPLATE_HEADERS,
  'paymentDate',
  'bankAccountCode',
  'paymentReference',
];

// ============================================================================
// CSV PARSER — handles quoted fields with commas and escaped quotes.
// Mirrors the pattern used by /inventory/beginning-balances so we don't
// need a papaparse dep for a human-generated-template use case.
// ============================================================================

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; continue; }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += ch;
  }
  result.push(current);
  return result.map((s) => s.trim());
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = parseCSVLine(line);
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = cols[i] ?? '';
    }
    return obj;
  });
  return { headers, rows };
}

function downloadTemplate(mode: Mode) {
  const headers = mode === 'historical' ? HISTORICAL_TEMPLATE_HEADERS : LIVE_TEMPLATE_HEADERS;
  const filename = mode === 'historical'
    ? 'expense-requests-historical-template.csv'
    : 'expense-requests-batch-template.csv';
  // Examples show the flexible identifier: personal email, employee code,
  // staff ID, and full name all work.
  const example = mode === 'historical'
    ? `EXP-001,2026-03-15,EMP-0012,"March utilities",,,,,,,,Access Bank,55-001,Electricity,1,45000,,2026-03-15,Access Bank,BANK-REF-9921`
    : `EXP-001,2026-04-20,John Doe,"Office supplies",,,,,,,,Access Bank,55-002,Stationery,1,12500,`;
  const content = headers.join(',') + '\n' + example + '\n';
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// DATE NORMALISER
// ============================================================================
// The backend's @IsDateString() wants strict ISO 8601 (YYYY-MM-DD). Excel /
// Google Sheets often silently convert typed dates to the user's locale
// format when saving as CSV — so a CSV authored in Nigeria arrives as
// "23/04/2026" and the backend rejects every single row. Normalising here
// means the common real-world formats just work:
//
//   2026-04-23            ← already ISO, pass through
//   2026/04/23            ← slash ISO, normalise separators
//   23/04/2026            ← Nigerian DD/MM/YYYY (our default for ambiguous)
//   04/23/2026            ← US MM/DD/YYYY (detected when the other part > 12)
//   23-04-2026            ← same with dashes
//   Apr 23, 2026          ← fallback to JS Date parser
//
// If nothing matches we return '' and let the backend flag it with a
// clear per-row error.

function normalizeDate(raw: string): string {
  if (!raw) return '';
  const s = raw.trim();
  if (!s) return '';

  // Already ISO 8601 (date-only or with time) — pass through
  if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(s)) return s;

  // YYYY/MM/DD or YYYY.MM.DD → swap separator to -
  let m = s.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;

  // Two-digit parts with a 4-digit year: X/Y/YYYY with any of / - .
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    const y = m[3];
    // Part 1 > 12 → it must be the day, so DD/MM/YYYY
    if (a > 12 && b <= 12) return `${y}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
    // Part 2 > 12 → it must be the day, so MM/DD/YYYY
    if (b > 12 && a <= 12) return `${y}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
    // Both ≤ 12: ambiguous. Default to DD/MM/YYYY (Nigerian convention
    // matching the tenant base we're serving today).
    if (a <= 12 && b <= 12) return `${y}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
  }

  // Last-chance fallback — let JS try. Handles "Apr 23, 2026" and similar.
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  }
  return '';
}

// ============================================================================
// ROW NORMALISERS — convert raw CSV records to typed API rows
// ============================================================================

function toLiveRow(raw: Record<string, string>): BatchImportRow {
  return {
    externalRef: raw.externalRef || '',
    requestDate: normalizeDate(raw.requestDate),
    // Accept either `requester` (new, accepts any identifier) or
    // `requesterEmail` (old column name) — pre-existing CSVs keep working.
    requesterEmail: raw.requester || raw.requesterEmail || '',
    description: raw.description || '',
    memoFrom: raw.memoFrom || undefined,
    memoTo: raw.memoTo || undefined,
    subject: raw.subject || undefined,
    background: raw.background || undefined,
    justification: raw.justification || undefined,
    prayer: raw.prayer || undefined,
    beneficiaryName: raw.beneficiaryName || undefined,
    beneficiaryAccountNumber: raw.beneficiaryAccountNumber || undefined,
    beneficiaryBankName: raw.beneficiaryBankName || undefined,
    expenseAccountCode: raw.expenseAccountCode || '',
    lineDescription: raw.lineDescription || '',
    quantity: Number(raw.quantity || 0),
    unitPrice: Number(raw.unitPrice || 0),
    whtCode: raw.whtCode || undefined,
  };
}

function toHistoricalRow(raw: Record<string, string>): HistoricalLoadRow {
  return {
    ...toLiveRow(raw),
    paymentDate: normalizeDate(raw.paymentDate),
    bankAccountCode: raw.bankAccountCode || '',
    paymentReference: raw.paymentReference || undefined,
  };
}

// ============================================================================
// CHUNK BUILDER — groups rows by externalRef, preserves order within
// a group, and splits the groups (not the rows) into fixed-size chunks.
// Never splits a group across chunks — the backend treats all rows
// sharing an externalRef as a single expense request.
// ============================================================================

function buildChunks<T extends { externalRef: string }>(
  rows: T[],
  chunkSize: number,
): Chunk<T>[] {
  const groupsInOrder: string[] = [];
  const groupMap = new Map<string, T[]>();
  for (const row of rows) {
    const ref = (row.externalRef || '').trim();
    if (!ref) continue;
    const existing = groupMap.get(ref);
    if (existing) {
      existing.push(row);
    } else {
      groupMap.set(ref, [row]);
      groupsInOrder.push(ref);
    }
  }
  const chunks: Chunk<T>[] = [];
  for (let i = 0; i < groupsInOrder.length; i += chunkSize) {
    const refs = groupsInOrder.slice(i, i + chunkSize);
    const chunkRows = refs.flatMap((r) => groupMap.get(r) ?? []);
    chunks.push({
      index: chunks.length,
      groupCount: refs.length,
      rowCount: chunkRows.length,
      rows: chunkRows,
    });
  }
  return chunks;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BatchImportModal({ open, onClose, onCommitted }: BatchImportModalProps) {
  const isSuperAdmin = useIsSuperAdmin();
  const [mode, setMode] = useState<Mode>('live');
  const [fileName, setFileName] = useState<string>('');
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [batchLabel, setBatchLabel] = useState('');
  const [chunkSize, setChunkSize] = useState(DEFAULT_CHUNK_SIZE);
  const [validation, setValidation] = useState<BatchValidationResult[] | null>(null);
  const [validCount, setValidCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [progress, setProgress] = useState<{
    phase: 'dry-run' | 'commit';
    chunkIndex: number;   // currently-processing chunk index
    totalChunks: number;
    processedGroups: number;
    totalGroups: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commitResult, setCommitResult] = useState<BatchCommitResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build the chunk plan whenever rows, mode, or chunk size change. The UI
  // uses it for the banner ("this will upload as N chunks") and the commit
  // loop iterates over it directly.
  const chunks = useMemo(() => {
    const apiRows = mode === 'historical'
      ? rawRows.map(toHistoricalRow)
      : rawRows.map(toLiveRow);
    return buildChunks(apiRows, chunkSize);
  }, [rawRows, mode, chunkSize]);

  const totalGroups = useMemo(
    () => chunks.reduce((sum, c) => sum + c.groupCount, 0),
    [chunks],
  );

  const reset = useCallback(() => {
    setFileName('');
    setRawRows([]);
    setValidation(null);
    setValidCount(0);
    setInvalidCount(0);
    setProgress(null);
    setError(null);
    setCommitResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleFile = useCallback(async (file: File) => {
    reset();
    setFileName(file.name);
    try {
      const text = await file.text();
      const { rows } = parseCSV(text);
      if (rows.length === 0) {
        setError('CSV has no data rows');
        return;
      }
      setRawRows(rows);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to parse CSV'));
    }
  }, [reset]);

  // ----- Dry-run all chunks sequentially, merge per-group results -----
  const runDryRun = useCallback(async () => {
    if (chunks.length === 0) return;
    setIsValidating(true);
    setError(null);
    setValidation(null);
    try {
      const merged: BatchValidationResult[] = [];
      let runningValid = 0;
      let runningInvalid = 0;
      let processedGroups = 0;

      for (const chunk of chunks) {
        setProgress({
          phase: 'dry-run',
          chunkIndex: chunk.index,
          totalChunks: chunks.length,
          processedGroups,
          totalGroups,
        });

        const res = mode === 'historical'
          ? await expenseRequestsApi.historicalDryRun(
              chunk.rows as HistoricalLoadRow[],
              batchLabel || undefined,
            )
          : await expenseRequestsApi.batchDryRun(
              chunk.rows as BatchImportRow[],
              batchLabel || undefined,
            );

        merged.push(...res.results);
        runningValid += res.validCount;
        runningInvalid += res.invalidCount;
        processedGroups += chunk.groupCount;

        setValidation([...merged]);
        setValidCount(runningValid);
        setInvalidCount(runningInvalid);
      }
      setProgress(null);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Dry-run failed'));
      setProgress(null);
    } finally {
      setIsValidating(false);
    }
  }, [chunks, mode, batchLabel, totalGroups]);

  // ----- Commit all chunks sequentially, aggregate created + failed -----
  const runCommit = useCallback(async () => {
    if (validCount === 0) return;
    setIsCommitting(true);
    setError(null);
    try {
      const aggregated: BatchCommitResponse = {
        batchRef: '',
        createdRequestIds: [],
        failedRefs: [],
      };
      let processedGroups = 0;

      for (const chunk of chunks) {
        setProgress({
          phase: 'commit',
          chunkIndex: chunk.index,
          totalChunks: chunks.length,
          processedGroups,
          totalGroups,
        });

        try {
          const res = mode === 'historical'
            ? await expenseRequestsApi.historicalCommit(
                chunk.rows as HistoricalLoadRow[],
                batchLabel || undefined,
              )
            : await expenseRequestsApi.batchCommit(
                chunk.rows as BatchImportRow[],
                batchLabel || undefined,
              );
          if (!aggregated.batchRef) aggregated.batchRef = res.batchRef;
          aggregated.createdRequestIds.push(...res.createdRequestIds);
          aggregated.failedRefs.push(...res.failedRefs);
          processedGroups += chunk.groupCount;
          // Surface partial progress to the caller as each chunk lands
          setCommitResult({ ...aggregated });
        } catch (err: unknown) {
          // Network / server error on a chunk — halt the run. Already-
          // committed chunks remain (idempotency via externalRef means a
          // retry will skip them), and the user sees what's done vs not.
          const msg = extractErrorMessage(err, `Chunk ${chunk.index + 1} failed`);
          setError(
            `${msg}. Already committed ${aggregated.createdRequestIds.length} request(s) across ${chunk.index} chunk(s). Retrying the upload will skip committed rows (deduplicated by externalRef).`,
          );
          setCommitResult({ ...aggregated });
          break;
        }
      }
      setProgress(null);
      onCommitted({ ...aggregated });
    } finally {
      setIsCommitting(false);
    }
  }, [chunks, mode, batchLabel, totalGroups, validCount, onCommitted]);

  if (!open) return null;

  const historicalDisabled = !isSuperAdmin;
  const progressPct = progress
    ? Math.round((progress.processedGroups / Math.max(1, progress.totalGroups)) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl bg-background shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Batch Import Expense Requests</h2>
              <p className="text-xs text-muted-foreground">
                Upload a CSV to create many expense requests at once. Large uploads are split into chunks automatically.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isValidating || isCommitting}
            className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode selector */}
        <div className="px-4 py-3 border-b bg-muted/20">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-medium">Mode:</label>
            <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
              <button
                onClick={() => { setMode('live'); reset(); }}
                disabled={isValidating || isCommitting}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  mode === 'live' ? 'bg-blue-600 text-white' : 'hover:bg-muted'
                } disabled:opacity-40`}
              >
                Normal batch
              </button>
              <button
                disabled={historicalDisabled || isValidating || isCommitting}
                onClick={() => { if (!historicalDisabled) { setMode('historical'); reset(); } }}
                title={historicalDisabled ? 'Super Admin only' : 'Historical load bypasses approval'}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  mode === 'historical' ? 'bg-amber-600 text-white' : 'hover:bg-muted'
                } ${historicalDisabled ? 'opacity-40 cursor-not-allowed' : ''} disabled:opacity-40`}
              >
                Historical load (Super Admin)
              </button>
            </div>
            <button
              onClick={() => downloadTemplate(mode)}
              className="ml-auto flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              <Download className="h-4 w-4" />
              Download {mode === 'historical' ? 'historical' : 'batch'} template
            </button>
          </div>
          {mode === 'historical' && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              Historical load bypasses the approval flow, posts the expense as <strong>paid</strong>,
              and dates the journal entry to each row&apos;s <code>paymentDate</code>. Real bank accounts are
              debited, so bank reconciliations will reflect these entries.
            </p>
          )}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* File + label + chunk size */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_140px] gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="hidden"
                id="batch-csv-input"
                disabled={isValidating || isCommitting}
              />
              <label
                htmlFor="batch-csv-input"
                className={`cursor-pointer flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm ${
                  isValidating || isCommitting ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <Upload className="h-4 w-4" />
                Choose CSV
              </label>
              <span className="text-sm text-muted-foreground truncate">
                {fileName || 'No file selected'}
              </span>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Batch label (optional)</label>
              <input
                type="text"
                placeholder="MARCH-UTILITIES"
                value={batchLabel}
                onChange={(e) => setBatchLabel(e.target.value)}
                disabled={isValidating || isCommitting}
                className="w-full h-9 rounded-md border bg-background px-3 text-sm disabled:opacity-40"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Chunk size</label>
              <input
                type="number"
                min={MIN_CHUNK_SIZE}
                max={MAX_CHUNK_SIZE}
                value={chunkSize}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n)) setChunkSize(Math.min(MAX_CHUNK_SIZE, Math.max(MIN_CHUNK_SIZE, n)));
                }}
                disabled={isValidating || isCommitting}
                className="w-full h-9 rounded-md border bg-background px-3 text-sm disabled:opacity-40"
                title={`Groups per HTTP request (${MIN_CHUNK_SIZE}–${MAX_CHUNK_SIZE})`}
              />
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Chunking plan — shown as soon as the file is parsed */}
          {rawRows.length > 0 && !commitResult && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm flex items-center justify-between flex-wrap gap-3">
              <div>
                Parsed <strong>{rawRows.length}</strong> row{rawRows.length === 1 ? '' : 's'} →
                <strong> {totalGroups}</strong> expense request{totalGroups === 1 ? '' : 's'} →
                <strong> {chunks.length}</strong> chunk{chunks.length === 1 ? '' : 's'} of up to {chunkSize}.
              </div>
              {!validation && !isValidating && (
                <button
                  onClick={runDryRun}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm"
                >
                  <FileText className="h-4 w-4" />
                  Validate (dry run)
                </button>
              )}
            </div>
          )}

          {/* Progress bar — shown during dry-run and commit */}
          {progress && (
            <div className="rounded-lg border bg-blue-50 dark:bg-blue-900/10 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-blue-700 dark:text-blue-400">
                  {progress.phase === 'dry-run' ? 'Validating' : 'Committing'} chunk{' '}
                  <strong>{progress.chunkIndex + 1}</strong> of <strong>{progress.totalChunks}</strong>
                  {' — '}
                  {progress.processedGroups} / {progress.totalGroups} groups done
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${progress.phase === 'commit' ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Validation results table */}
          {validation && !commitResult && (
            <div className="rounded-lg border overflow-hidden">
              <div className="bg-muted/30 px-3 py-2 border-b flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <strong>{validCount}</strong> ready
                </span>
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <strong>{invalidCount}</strong> with errors
                </span>
                <span className="ml-auto text-muted-foreground">
                  {validation.length} group{validation.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr>
                      <th className="text-left p-2 font-medium">externalRef</th>
                      <th className="text-left p-2 font-medium">Rows</th>
                      <th className="text-left p-2 font-medium">Requester</th>
                      <th className="text-right p-2 font-medium">Total</th>
                      <th className="text-left p-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validation.map((v) => (
                      <tr key={v.externalRef} className="border-b last:border-b-0">
                        <td className="p-2 font-mono text-xs">{v.externalRef}</td>
                        <td className="p-2">{v.rowCount}</td>
                        <td className="p-2">{v.requesterName ?? '—'}</td>
                        <td className="p-2 text-right font-mono">
                          {v.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-2">
                          {v.errors.length === 0 ? (
                            <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 text-xs">
                              <CheckCircle className="h-3.5 w-3.5" />
                              OK{v.warnings.length > 0 ? ` (${v.warnings.length} warning${v.warnings.length === 1 ? '' : 's'})` : ''}
                            </span>
                          ) : (
                            <span className="inline-flex flex-col gap-0.5 text-red-700 dark:text-red-400 text-xs">
                              {v.errors.map((e, i) => (<span key={i}>{e}</span>))}
                            </span>
                          )}
                          {v.warnings.length > 0 && v.errors.length === 0 && (
                            <div className="text-amber-700 dark:text-amber-400 text-xs mt-1">
                              {v.warnings.map((w, i) => (<div key={i}>⚠ {w}</div>))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Commit result — shown after commit finishes (fully or partially) */}
          {commitResult && (
            <div className="space-y-3">
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Committed {commitResult.createdRequestIds.length} request{commitResult.createdRequestIds.length === 1 ? '' : 's'}.
                    {commitResult.batchRef && (
                      <>
                        {' '}Batch ref: <code className="font-mono text-xs">{commitResult.batchRef}</code>
                      </>
                    )}
                  </p>
                </div>
              </div>
              {commitResult.failedRefs.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 p-3">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                    {commitResult.failedRefs.length} group{commitResult.failedRefs.length === 1 ? '' : 's'} failed:
                  </p>
                  <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                    {commitResult.failedRefs.map((f) => (
                      <li key={f.externalRef}>
                        <code className="font-mono">{f.externalRef}</code>: {f.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-3 flex items-center justify-end gap-2">
          <button
            onClick={handleClose}
            disabled={isValidating || isCommitting}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-40"
          >
            {commitResult ? 'Close' : 'Cancel'}
          </button>
          {validation && !commitResult && (
            <button
              onClick={runCommit}
              disabled={validCount === 0 || isCommitting}
              className={`rounded-md px-4 py-1.5 text-sm text-white flex items-center gap-1.5 disabled:opacity-50 ${
                mode === 'historical' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isCommitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Commit {validCount} group{validCount === 1 ? '' : 's'}
              {chunks.length > 1 ? ` (${chunks.length} chunks)` : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
