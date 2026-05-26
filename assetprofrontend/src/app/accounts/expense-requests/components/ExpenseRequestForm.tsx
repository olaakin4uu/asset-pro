'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, ChevronDown, ChevronUp, User, Building2, FileText, Landmark, Truck, Paperclip, UploadCloud, Trash2 } from 'lucide-react';
import { whtApi, accountsApi, banksApi, expenseRequestsApi } from '@/lib/api/accounts';
import { employeesApi } from '@/lib/api/hrpayroll';
import { departmentsApi } from '@/lib/api/hrpayroll';
import { tripsApi, vehiclesApi } from '@/lib/api/fleet-management';
import type { ExpenseRequest, ExpenseRequestAttachment, CreateExpenseRequestDto, UpdateExpenseRequestDto, Wht, Account, Bank } from '@/lib/api/accounts';
import type { Department } from '@/types/hrpayroll';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FormField, DraftSubmitActions, EntityCombobox } from '@/components/erp';
import { useCurrencyFormat } from '@/hooks';
import { useCompanyContext } from '@/stores/company-context';

// ============================================================================
// SCHEMA
// ============================================================================

const lineSchema = z.object({
  description: z.string(),
  accountId: z.coerce.number().optional(),
  quantity: z.coerce.number().min(0).default(1),
  unitPrice: z.coerce.number().min(0).default(0),
  whtId: z.coerce.number().optional(),
  whtApplicable: z.boolean().default(false),
  remarks: z.string().optional(),
});

const expenseRequestSchema = z.object({
  requesterId: z.coerce.number().optional(),
  requesterName: z.string().optional(),
  requestDate: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  notes: z.string().default(''),
  departmentId: z.coerce.number().optional(),
  expenseAccountId: z.coerce.number().optional(),
  bankAccountId: z.coerce.number().optional(),
  // Memo fields
  memoFrom: z.string().optional(),
  memoTo: z.string().optional(),
  subject: z.string().optional(),
  background: z.string().optional(),
  justification: z.string().optional(),
  prayer: z.string().optional(),
  // Beneficiary
  beneficiaryName: z.string().optional(),
  beneficiaryAccountNumber: z.string().optional(),
  beneficiaryBankName: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'At least one line item is required'),
  // Fleet linking (optional — only shown when fleet-management module is enabled)
  tripId: z.coerce.number().optional(),
  vehicleId: z.coerce.number().optional(),
  fleetCostType: z.string().optional(),
});

type ExpenseRequestFormValues = z.infer<typeof expenseRequestSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface ExpenseRequestFormProps {
  expenseRequest?: ExpenseRequest;
  useExpenseApproval?: boolean;
  onSubmit: (data: CreateExpenseRequestDto | UpdateExpenseRequestDto) => Promise<void>;
  onSaveDraft?: (data: CreateExpenseRequestDto | UpdateExpenseRequestDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ExpenseRequestForm({ expenseRequest, useExpenseApproval = true, onSubmit, onSaveDraft, onCancel, submitLabel = 'Save' }: ExpenseRequestFormProps) {
  const isEditing = !!expenseRequest;
  const showGlFields = !useExpenseApproval; // show GL/bank fields from creation when approval is OFF
  const [savingDraft, setSavingDraft] = useState(false);
  const [showMemo, setShowMemo] = useState(!!(expenseRequest?.memoFrom || expenseRequest?.subject));
  const [showBeneficiary, setShowBeneficiary] = useState(!!(expenseRequest?.beneficiaryName));

  // Attachment state
  const [attachments, setAttachments] = useState<(ExpenseRequestAttachment | { filename: string; originalName: string; path: string; url: string; mimeType?: string; size?: number; _pending?: true })[]>(
    expenseRequest?.attachments ?? []
  );
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { enabledModules } = useCompanyContext();
  const fleetEnabled = (enabledModules ?? []).some((m: { slug: string; isEnabled: boolean }) => m.slug === 'fleet-management' && m.isEnabled);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [whts, setWhts] = useState<Wht[]>([]);
  const [glAccounts, setGlAccounts] = useState<Account[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [trips, setTrips] = useState<{ id: number; tripNumber: string; purpose?: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: number; registrationNumber: string; make?: string; model?: string }[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseRequestFormValues>({
    resolver: zodResolver(expenseRequestSchema) as Resolver<ExpenseRequestFormValues>,
    defaultValues: {
      requesterId: expenseRequest?.requesterId ?? undefined,
      requesterName: (expenseRequest as any)?.requesterName ?? '',
      requestDate: expenseRequest?.requestDate?.split('T')[0] ?? new Date().toISOString().split('T')[0],
      description: expenseRequest?.description ?? '',
      notes: expenseRequest?.notes ?? '',
      departmentId: expenseRequest?.departmentId ?? undefined,
      expenseAccountId: expenseRequest?.expenseAccountId ?? undefined,
      bankAccountId: expenseRequest?.bankAccountId ?? undefined,
      memoFrom: expenseRequest?.memoFrom ?? '',
      memoTo: expenseRequest?.memoTo ?? '',
      subject: expenseRequest?.subject ?? '',
      background: expenseRequest?.background ?? '',
      justification: expenseRequest?.justification ?? '',
      prayer: expenseRequest?.prayer ?? '',
      beneficiaryName: expenseRequest?.beneficiaryName ?? '',
      beneficiaryAccountNumber: expenseRequest?.beneficiaryAccountNumber ?? '',
      beneficiaryBankName: expenseRequest?.beneficiaryBankName ?? '',
      lines: expenseRequest?.lines?.map(l => ({
        description: l.description,
        accountId: l.accountId ?? undefined,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
        whtId: l.whtId ?? undefined,
        whtApplicable: l.whtApplicable ?? false,
        remarks: l.remarks ?? '',
      })) ?? [{ description: '', accountId: undefined, quantity: 1, unitPrice: 0, whtApplicable: false }],
      tripId: expenseRequest?.tripId ?? undefined,
      vehicleId: expenseRequest?.vehicleId ?? undefined,
      fleetCostType: expenseRequest?.fleetCostType ?? '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const watchedLines = watch('lines');
  const { formatCurrency } = useCurrencyFormat();

  useEffect(() => {
    const load = async () => {
      const results = await Promise.allSettled([
        departmentsApi.list({ limit: 200 }),
        whtApi?.list?.(),
        showGlFields ? accountsApi.list({ limit: 500, isPosting: true }) : Promise.resolve(null),
        banksApi.getAuthorizedBanks(),
      ]);

      if (results[0].status === 'fulfilled') setDepartments((results[0].value as { data: Department[] }).data ?? []);
      if (results[1].status === 'fulfilled') {
        const w = results[1].value as { data?: Wht[] } | Wht[];
        setWhts(Array.isArray(w) ? w : (w?.data ?? []));
      }
      if (results[2].status === 'fulfilled' && results[2].value) {
        const accounts = (results[2].value as { data: Account[] }).data ?? [];
        setGlAccounts(accounts);
      }
      if (results[3].status === 'fulfilled') {
        setBanks((results[3].value as Bank[]) ?? []);
      }

      // Auto-populate requester name from logged-in employee (create mode only)
      if (!isEditing) {
        const me = await employeesApi.me().catch(() => null);
        if (me) {
          setValue('requesterId', me.id, { shouldValidate: false });
          setValue('requesterName', `${me.firstName} ${me.lastName}`.trim(), { shouldValidate: false });
          if (me.departmentId) {
            setValue('departmentId', me.departmentId, { shouldValidate: false });
            const deptList = results[0].status === 'fulfilled'
              ? ((results[0].value as { data: Department[] }).data ?? [])
              : [];
            const deptName = me.department?.name ?? deptList.find(d => d.id === me.departmentId)?.name;
            if (deptName) setValue('memoFrom', deptName, { shouldValidate: false });
          }
        }
      }
    };
    load();

    // Load fleet data only when fleet module is enabled
    if (fleetEnabled) {
      tripsApi.list({}).then(res => {
        const list = Array.isArray(res) ? res : (res as { data?: typeof res }).data ?? [];
        setTrips((list as { id: number; tripNumber: string; purpose?: string }[]).filter(t => t.id));
      }).catch(() => {});
      vehiclesApi.list({}).then(res => {
        const list = Array.isArray(res) ? res : (res as { data?: typeof res }).data ?? [];
        setVehicles((list as { id: number; registrationNumber: string; make?: string; model?: string }[]).filter(v => v.id));
      }).catch(() => {});
    }
  }, [showGlFields, fleetEnabled]);

  const calculateTotal = () =>
    (watchedLines ?? []).reduce((sum, line) => sum + (line.quantity ?? 0) * (line.unitPrice ?? 0), 0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be re-selected
    setUploadError(null);
    setUploadingFile(true);
    try {
      const result = await expenseRequestsApi.uploadDocument(file);
      if (isEditing && expenseRequest?.id) {
        // For edit mode: persist immediately
        const saved = await expenseRequestsApi.addAttachment(expenseRequest.id, result);
        setAttachments(prev => [...prev, { ...result, id: saved.id, expenseRequestId: expenseRequest.id, createdAt: new Date().toISOString() }]);
      } else {
        // For create mode: hold in state until form submit
        setAttachments(prev => [...prev, { ...result, _pending: true as const }]);
      }
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveAttachment = async (index: number) => {
    const att = attachments[index];
    if (isEditing && 'id' in att && att.id) {
      try {
        await expenseRequestsApi.removeAttachment(expenseRequest!.id, att.id);
      } catch {
        // Ignore — will retry on next load
      }
    }
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const buildDto = (data: ExpenseRequestFormValues): CreateExpenseRequestDto | UpdateExpenseRequestDto => {
    const validLines = data.lines.filter(l => l.description.trim() && l.unitPrice > 0);
    const base = {
      requestDate: data.requestDate,
      description: data.description,
      notes: data.notes || undefined,
      departmentId: data.departmentId || undefined,
      expenseAccountId: data.expenseAccountId || undefined,
      bankAccountId: data.bankAccountId || undefined,
      memoFrom: data.memoFrom || undefined,
      memoTo: data.memoTo || undefined,
      subject: data.subject || undefined,
      background: data.background || undefined,
      justification: data.justification || undefined,
      prayer: data.prayer || undefined,
      beneficiaryName: data.beneficiaryName || undefined,
      beneficiaryAccountNumber: data.beneficiaryAccountNumber || undefined,
      beneficiaryBankName: data.beneficiaryBankName || undefined,
      lines: validLines.map(l => ({
        description: l.description,
        accountId: l.accountId || undefined,
        quantity: useExpenseApproval ? 1 : l.quantity,
        unitPrice: l.unitPrice,
        whtId: useExpenseApproval ? undefined : (l.whtId || undefined),
        whtApplicable: useExpenseApproval ? false : (l.whtApplicable ?? false),
        remarks: l.remarks || undefined,
      })),
      tripId: data.tripId || undefined,
      vehicleId: data.vehicleId || undefined,
      fleetCostType: data.fleetCostType || undefined,
    };
    if (isEditing) return base as UpdateExpenseRequestDto;
    return {
      ...base,
      requesterId: data.requesterId || undefined,
      requesterName: data.requesterName?.trim() || undefined,
      attachments: attachments.length > 0 ? attachments.map(a => ({
        filename: a.filename,
        originalName: a.originalName,
        path: a.path,
        url: a.url,
        mimeType: a.mimeType,
        size: a.size,
      })) : undefined,
    } as CreateExpenseRequestDto;
  };

  const validateAndRun = async (data: ExpenseRequestFormValues, fn: (dto: CreateExpenseRequestDto | UpdateExpenseRequestDto) => Promise<void>) => {
    const validLines = data.lines.filter(l => l.description.trim() && l.unitPrice > 0);
    if (validLines.length === 0) {
      setError('lines', { message: useExpenseApproval
        ? 'At least one line item with description and amount is required'
        : 'At least one line item with description and price is required' });
      return;
    }
    if (!isEditing && !data.requesterId && !data.requesterName?.trim()) {
      setError('requesterName', { message: 'Requester name is required' });
      return;
    }
    await fn(buildDto(data));
  };

  const onSaveDraftClick = async () => {
    if (!onSaveDraft) return;
    await handleSubmit(async (data) => {
      setSavingDraft(true);
      try {
        await validateAndRun(data, onSaveDraft);
      } catch (err: unknown) {
        setError('root', { message: extractErrorMessage(err, 'Failed to save draft') });
      } finally {
        setSavingDraft(false);
      }
    })();
  };

  const onFormSubmit = async (data: ExpenseRequestFormValues) => {
    try {
      await validateAndRun(data, onSubmit);
    } catch (err: unknown) {
      setError('root', { message: extractErrorMessage(err, 'Failed to save expense request') });
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {errors.root?.message && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {errors.root.message}
        </div>
      )}

      {/* ── Main Details ── */}
      <div className="rounded-xl border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <FileText className="h-4 w-4" /> Request Details
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!isEditing && (
            <FormField id="requesterName" label="Requester" required error={errors.requesterName?.message}>
              {(ariaProps) => (
                <input
                  {...ariaProps}
                  {...register('requesterName')}
                  type="text"
                  placeholder="Enter requester name"
                  className={cn(
                    'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                    errors.requesterName && 'border-red-500'
                  )}
                />
              )}
            </FormField>
          )}

          <FormField id="requestDate" label="Request Date" required error={errors.requestDate?.message}>
            {(ariaProps) => (
              <input {...ariaProps} type="date" {...register('requestDate')}
                className={cn('w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary', errors.requestDate && 'border-red-500')}
              />
            )}
          </FormField>

          <FormField id="departmentId" label="Department">
            {() => (
              <select
                {...register('departmentId')}
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">— Select department —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
          </FormField>
        </div>

        <FormField id="description" label="Description" required error={errors.description?.message}>
          {(ariaProps) => (
            <textarea {...ariaProps} {...register('description')} placeholder="Describe the expense request..." rows={2}
              className={cn('w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none', errors.description && 'border-red-500')}
            />
          )}
        </FormField>

        <FormField id="notes" label="Notes">
          {(ariaProps) => (
            <textarea {...ariaProps} {...register('notes')} placeholder="Additional notes..." rows={2}
              className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          )}
        </FormField>
      </div>

      {/* ── Line Items ── */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <Building2 className="h-4 w-4" /> Line Items
        </div>
        {errors.lines?.message && <p className="text-sm text-red-500">{errors.lines.message}</p>}

        <div className="space-y-2">
          {useExpenseApproval ? (
            /* ── Simplified mode (approval ON): Description + Amount only ── */
            <>
              <div className="grid grid-cols-[1fr_160px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
                <div>Description *</div>
                <div>Amount *</div>
                <div />
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_160px_40px] gap-2 items-center">
                  <input
                    type="text"
                    {...register(`lines.${index}.description`)}
                    placeholder="Description"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    {...register(`lines.${index}.unitPrice`, { setValueAs: (v: string) => v === '' ? 0 : parseFloat(v) })}
                    placeholder="0.00"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </>
          ) : (
            /* ── Full mode (approval OFF): Description + Qty + Unit Price + WHT ── */
            <>
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                <div className="col-span-4">Description *</div>
                <div className="col-span-1">Qty</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-2">WHT</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-1" />
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <input type="text" {...register(`lines.${index}.description`)} placeholder="Description"
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="col-span-1">
                    <input type="text" inputMode="decimal"
                      {...register(`lines.${index}.quantity`, { setValueAs: (v: string) => v === '' ? 0 : parseFloat(v) })}
                      placeholder="1" className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="col-span-2">
                    <input type="text" inputMode="decimal"
                      {...register(`lines.${index}.unitPrice`, { setValueAs: (v: string) => v === '' ? 0 : parseFloat(v) })}
                      placeholder="0.00" className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="col-span-2">
                    <select {...register(`lines.${index}.whtId`)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setValue(`lines.${index}.whtId`, val ? Number(val) : undefined);
                        setValue(`lines.${index}.whtApplicable`, !!val);
                      }}
                      className="w-full rounded-lg border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">No WHT</option>
                      {whts.map(w => <option key={w.id} value={w.id}>{w.name} ({w.rate}%)</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 px-1 text-sm font-medium text-right tabular-nums">
                    {formatCurrency((watchedLines[index]?.quantity ?? 0) * (watchedLines[index]?.unitPrice ?? 0))}
                  </div>
                  <div className="col-span-1">
                    <button type="button" onClick={() => remove(index)} disabled={fields.length === 1}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          <button type="button"
            onClick={() => append({ description: '', accountId: undefined, quantity: 1, unitPrice: 0, whtApplicable: false })}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-1"
          >
            <Plus className="h-4 w-4" /> Add Line
          </button>
        </div>

        {useExpenseApproval ? (
          <div className="grid grid-cols-[1fr_160px_40px] gap-2 pt-2 border-t">
            <div className="text-right text-sm font-semibold text-muted-foreground">Total</div>
            <div className="text-right font-semibold tabular-nums">{formatCurrency(calculateTotal())}</div>
            <div />
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-2 pt-2 border-t">
            <div className="col-span-9 text-right text-sm font-semibold text-muted-foreground">Total</div>
            <div className="col-span-2 text-right font-semibold tabular-nums">{formatCurrency(calculateTotal())}</div>
            <div className="col-span-1" />
          </div>
        )}
      </div>

      {/* ── GL Accounts & Payment (visible when approval is OFF) ── */}
      {showGlFields && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <Landmark className="h-4 w-4" /> GL Accounts &amp; Payment
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Approval is disabled — this request will be approved immediately on submission. Select the GL accounts to use.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField id="expenseAccountId" label="Expense GL Account">
              {() => (
                <EntityCombobox
                  value={watch('expenseAccountId') ?? null}
                  onChange={(id) => setValue('expenseAccountId', id as number ?? undefined, { shouldValidate: false })}
                  items={glAccounts.map(a => ({ ...a, displayLabel: `${a.code} — ${a.name}` }))}
                  labelKey="displayLabel"
                  searchKeys={['code', 'name']}
                  placeholder="Search GL account…"
                />
              )}
            </FormField>
            <FormField id="bankAccountId" label="Payment (Bank) Account">
              {() => (
                <EntityCombobox
                  value={watch('bankAccountId') ?? null}
                  onChange={(id) => setValue('bankAccountId', id as number ?? undefined, { shouldValidate: false })}
                  items={banks.map(b => ({ ...b, displayLabel: `${b.bankName} — ${b.accountName ?? b.name}`, subtitle: b.accountNumber }))}
                  labelKey="displayLabel"
                  subtitleKey="subtitle"
                  searchKeys={['bankName', 'accountName', 'name', 'accountNumber']}
                  placeholder="Search bank account…"
                />
              )}
            </FormField>
          </div>
        </div>
      )}

      {/* ── Beneficiary ── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <button type="button" onClick={() => setShowBeneficiary(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <User className="h-4 w-4" /> Beneficiary Details
            <span className="text-xs font-normal normal-case text-muted-foreground/70">(optional)</span>
          </div>
          {showBeneficiary ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showBeneficiary && (
          <div className="px-6 pb-6 pt-2 space-y-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField id="beneficiaryName" label="Beneficiary Name">
                {(ariaProps) => (
                  <input {...ariaProps} {...register('beneficiaryName')} placeholder="Full name or company name"
                    className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </FormField>
              <FormField id="beneficiaryBankName" label="Bank Name">
                {(ariaProps) => (
                  <input {...ariaProps} {...register('beneficiaryBankName')} placeholder="e.g. Access Bank"
                    className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </FormField>
              <FormField id="beneficiaryAccountNumber" label="Account Number">
                {(ariaProps) => (
                  <input {...ariaProps} {...register('beneficiaryAccountNumber')} placeholder="10-digit account number"
                    className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </FormField>
            </div>
          </div>
        )}
      </div>

      {/* ── Memo — only shown when expense approval is enabled ── */}
      {useExpenseApproval && <div className="rounded-xl border bg-card overflow-hidden">
        <button type="button" onClick={() => setShowMemo(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <FileText className="h-4 w-4" /> Formal Memo
            <span className="text-xs font-normal normal-case text-muted-foreground/70">(optional — for printed memo documents)</span>
          </div>
          {showMemo ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showMemo && (
          <div className="px-6 pb-6 pt-2 space-y-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField id="memoFrom" label="FROM">
                {(ariaProps) => (
                  <input {...ariaProps} {...register('memoFrom')} placeholder="Your name / department"
                    className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </FormField>
              <FormField id="memoTo" label="TO">
                {(ariaProps) => (
                  <input {...ariaProps} {...register('memoTo')} placeholder="Recipient / approving authority"
                    className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </FormField>
            </div>
            <FormField id="subject" label="SUBJECT">
              {(ariaProps) => (
                <input {...ariaProps} {...register('subject')} placeholder="RE: Request for payment of..."
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
            </FormField>
            <FormField id="background" label="Background">
              {(ariaProps) => (
                <textarea {...ariaProps} {...register('background')} placeholder="Provide background context..." rows={3}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              )}
            </FormField>
            <FormField id="justification" label="Justification">
              {(ariaProps) => (
                <textarea {...ariaProps} {...register('justification')} placeholder="Justify why this expense is necessary..." rows={3}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              )}
            </FormField>
            <FormField id="prayer" label="Prayer / Request">
              {(ariaProps) => (
                <textarea {...ariaProps} {...register('prayer')} placeholder="We therefore humbly request your approval..." rows={2}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              )}
            </FormField>
          </div>
        )}
      </div>}

      {/* ── Fleet Linking (only when fleet-management module is enabled) ── */}
      {fleetEnabled && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <Truck className="h-4 w-4" /> Fleet Linking
            <span className="text-xs font-normal normal-case text-muted-foreground/70">(optional — links this expense to a trip or vehicle for cost tracking)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField id="fleetCostType" label="Cost Type">
              {(ariaProps) => (
                <select {...ariaProps} {...register('fleetCostType')}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— Select cost type —</option>
                  <option value="FUEL">Fuel</option>
                  <option value="TOLL">Toll / Road charges</option>
                  <option value="PARKING">Parking</option>
                  <option value="DRIVER_ALLOWANCE">Driver Allowance</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="INSURANCE">Insurance</option>
                  <option value="LICENSING">Licensing / Registration</option>
                  <option value="TYRE">Tyre</option>
                  <option value="OTHER">Other</option>
                </select>
              )}
            </FormField>

            <FormField id="tripId" label="Link to Trip">
              {() => (
                <EntityCombobox
                  value={watch('tripId') ?? null}
                  onChange={(id) => {
                    setValue('tripId', id as number ?? undefined, { shouldValidate: false });
                    if (id) setValue('vehicleId', undefined, { shouldValidate: false });
                  }}
                  items={trips}
                  labelKey="tripNumber"
                  subtitleKey="purpose"
                  searchKeys={['tripNumber', 'purpose']}
                  placeholder="Search trip..."
                />
              )}
            </FormField>

            <FormField id="vehicleId" label="Link to Vehicle (if no trip)">
              {() => (
                <EntityCombobox
                  value={watch('vehicleId') ?? null}
                  onChange={(id) => {
                    setValue('vehicleId', id as number ?? undefined, { shouldValidate: false });
                    if (id) setValue('tripId', undefined, { shouldValidate: false });
                  }}
                  items={vehicles.map(v => ({ ...v, displayLabel: `${v.registrationNumber}${v.make ? ` — ${v.make} ${v.model ?? ''}` : ''}` }))}
                  labelKey="displayLabel"
                  subtitleKey="registrationNumber"
                  searchKeys={['registrationNumber', 'make', 'model']}
                  placeholder="Search vehicle..."
                />
              )}
            </FormField>
          </div>

          {watch('tripId') && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              When paid, the cost will be automatically added to trip cost fields and reflected in the vehicle cost report.
            </p>
          )}
          {!watch('tripId') && watch('vehicleId') && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              When paid, a vehicle cost entry will be created for this vehicle.
            </p>
          )}
        </div>
      )}

      {/* ── Supporting Documents ── */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <Paperclip className="h-4 w-4" /> Supporting Documents
            <span className="text-xs font-normal normal-case text-muted-foreground/70">(optional — receipts, quotes, invoices)</span>
          </div>
          <label className={cn(
            'inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border cursor-pointer transition-colors',
            uploadingFile
              ? 'opacity-50 cursor-not-allowed bg-muted'
              : 'hover:bg-primary/5 border-primary/30 text-primary'
          )}>
            <UploadCloud className="h-4 w-4" />
            {uploadingFile ? 'Uploading…' : 'Attach File'}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              disabled={uploadingFile}
              className="sr-only"
            />
          </label>
        </div>

        {uploadError && (
          <p className="text-sm text-red-500">{uploadError}</p>
        )}

        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents attached. Supported formats: PDF, Word, JPG, PNG (max 10 MB).</p>
        ) : (
          <ul className="space-y-2">
            {attachments.map((att, idx) => {
              const isPdf = att.mimeType?.includes('pdf');
              const isImage = att.mimeType?.startsWith('image/');
              const sizeKb = att.size ? Math.round(att.size / 1024) : null;
              return (
                <li key={idx} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className={cn('h-4 w-4 flex-shrink-0', isPdf ? 'text-red-500' : isImage ? 'text-blue-500' : 'text-muted-foreground')} />
                    <div className="min-w-0">
                      <a href={att.url} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline text-primary truncate block">
                        {att.originalName}
                      </a>
                      {sizeKb && <p className="text-xs text-muted-foreground">{sizeKb} KB</p>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(idx)}
                    className="p-1.5 rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex-shrink-0"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Actions */}
      <DraftSubmitActions
        onCancel={onCancel}
        onSaveDraft={onSaveDraft ? onSaveDraftClick : undefined}
        submitLabel={submitLabel}
        isSubmitting={isSubmitting}
        isSavingDraft={savingDraft}
      />
    </form>
  );
}
