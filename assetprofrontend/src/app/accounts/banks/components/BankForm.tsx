'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X, UserCheck, Plus, Trash2 } from 'lucide-react';
import { accountsApi, banksApi, exchangeRatesApi } from '@/lib/api/accounts';
import type { Bank, Account, BankAuthorization, Currency, CreateBankDto, UpdateBankDto } from '@/lib/api/accounts';
import { lookupsApi } from '@/lib/api/lookups';
import { branchesApi } from '@/lib/api/core';
import { employeesApi } from '@/lib/api/hrpayroll';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FormField, EntityCombobox } from '@/components/erp';
import { useCompanyContext } from '@/stores/company-context';

// ============================================================================
// SCHEMAS
// ============================================================================

const bankFormSchema = z.object({
  branchId: z.number().optional(),
  name: z.string().min(1, 'Display name is required'),
  accountName: z.string().optional(),
  accountNumber: z.string().min(1, 'Account number is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  branch: z.string().optional(),
  swiftCode: z.string().optional(),
  routingNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  glAccountId: z.number({ required_error: 'GL Account is required' }).min(1, 'GL Account is required'),
  currencyCode: z.string().min(1, 'Currency is required'),
  isActive: z.boolean(),
  openingBalance: z.number().optional(),
  openingBalanceDate: z.string().optional(),
  openingBalanceExchangeRate: z.number().optional(),
});

type FormValues = z.infer<typeof bankFormSchema>;

// ============================================================================
// TYPES
// ============================================================================

type EmployeeLookup = { id: number; fullName: string; employeeCode: string; companyId: number };

interface BankFormProps {
  bank?: Bank;
  onSubmit: (data: CreateBankDto | UpdateBankDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// ============================================================================
// BANK FORM COMPONENT
// ============================================================================

export function BankForm({ bank, onSubmit, onCancel, submitLabel = 'Save' }: BankFormProps) {
  const isEditing = !!bank;
  const { currency: companyCurrency } = useCompanyContext();

  // Tab state
  const [activeTab, setActiveTab] = useState<'basic' | 'authorization'>('basic');

  // GL Accounts for dropdown
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  // Currencies for dropdown
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);

  // Branches for dropdown
  const [branches, setBranches] = useState<Array<{ id: number; name: string; code?: string }>>([]);

  // Exchange rate
  const [fetchingRate, setFetchingRate] = useState(false);


  // Employees for authorization (minimal lookup — no permission required)
  const [employees, setEmployees] = useState<EmployeeLookup[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // Authorization state
  const [authorizedIds, setAuthorizedIds] = useState<number[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(bankFormSchema),
    defaultValues: {
      branchId: bank?.branchId ?? undefined,
      name: bank?.name ?? '',
      accountName: bank?.accountName ?? '',
      accountNumber: bank?.accountNumber ?? '',
      bankName: bank?.bankName ?? '',
      branch: bank?.branchCode ?? '',
      swiftCode: bank?.swiftCode ?? '',
      routingNumber: bank?.routingNumber ?? '',
      contactPerson: bank?.contactPerson ?? '',
      contactPhone: bank?.contactPhone ?? '',
      contactEmail: bank?.contactEmail ?? '',
      glAccountId: bank?.glAccountId ?? undefined,
      currencyCode: bank?.currencyCode ?? companyCurrency ?? 'NGN',
      openingBalance: Number(bank?.openingBalance ?? 0),
      openingBalanceDate: bank?.openingBalanceDate?.split('T')[0] ?? new Date().toISOString().split('T')[0],
      openingBalanceExchangeRate: 1,
      isActive: bank?.isActive ?? true,
    },
  });

  // Load GL accounts and filter out ones already used by other banks
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setAccountsLoading(true);
        const [accountsRes, banksRes] = await Promise.all([
          accountsApi.list({ isPosting: true, limit: 500 }),
          banksApi.list({ limit: 500 }),
        ]);
        const allAccounts = accountsRes.data;
        const usedGlIds = new Set(
          (banksRes.data || [])
            .filter((b: Bank) => b.glAccountId && b.id !== bank?.id)
            .map((b: Bank) => b.glAccountId),
        );
        setAccounts(allAccounts.filter((a: Account) => !usedGlIds.has(a.id)));
      } catch (err) {
        console.error('Failed to load accounts:', err);
      } finally {
        setAccountsLoading(false);
      }
    };
    loadAccounts();
  }, [bank?.id]);


  // Load currencies via the lookups endpoint (no special permission required)
  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        setCurrenciesLoading(true);
        const data = await lookupsApi.currencies();
        setCurrencies(data);
      } catch (err) {
        console.error('Failed to load currencies:', err);
      } finally {
        setCurrenciesLoading(false);
      }
    };
    loadCurrencies();
  }, []);

  // Load branches
  useEffect(() => {
    branchesApi.list({ limit: 100 }).then((res) => {
      setBranches(res.data || []);
    }).catch(() => {});
  }, []);

  // Load employees via lookup endpoint (no view-employees permission required)
  useEffect(() => {
    setEmployeesLoading(true);
    employeesApi
      .lookup()
      .then((data) => setEmployees(data))
      .catch((err) => console.error('Employee lookup failed:', err))
      .finally(() => setEmployeesLoading(false));
  }, []);

  // Load existing authorizations for edit mode
  useEffect(() => {
    if (!bank?.id) return;
    const loadAuthorizations = async () => {
      try {
        const auths = await banksApi.getAuthorizations(bank.id);
        setAuthorizedIds(auths.map((a) => a.employeeId));
      } catch (err) {
        console.error('Failed to load authorizations:', err);
      }
    };
    loadAuthorizations();
  }, [bank?.id]);

  // Available employees (not already authorized)
  const availableEmployees = useMemo(
    () => employees.filter((emp) => !authorizedIds.includes(emp.id)),
    [employees, authorizedIds],
  );

  const addAuthorizedEmployee = useCallback(() => {
    const empId = parseInt(selectedEmployeeId);
    if (!empId || authorizedIds.includes(empId)) return;
    setAuthorizedIds((prev) => [...prev, empId]);
    setSelectedEmployeeId('');
  }, [selectedEmployeeId, authorizedIds]);

  const removeAuthorizedEmployee = useCallback((empId: number) => {
    setAuthorizedIds((prev) => prev.filter((id) => id !== empId));
  }, []);

  const getEmployeeName = useCallback(
    (empId: number): string => {
      const emp = employees.find((e) => e.id === empId);
      return emp?.fullName || `Employee #${empId}`;
    },
    [employees],
  );

  const getEmployeeCode = useCallback(
    (empId: number): string => {
      const emp = employees.find((e) => e.id === empId);
      return emp?.employeeCode || '';
    },
    [employees],
  );

  const onFormSubmit = async (data: FormValues) => {
    try {
      // Validate exchange rate for foreign currency banks with opening balance
      const isForeignCurrency = data.currencyCode && data.currencyCode !== (companyCurrency || 'NGN');
      if (isForeignCurrency && (data.openingBalance ?? 0) > 0 && (!data.openingBalanceExchangeRate || data.openingBalanceExchangeRate <= 0)) {
        setError('openingBalanceExchangeRate', {
          message: `Exchange rate is required for ${data.currencyCode} opening balance. Enter the rate or use auto-fetch.`,
        });
        return;
      }

      const baseData = {
        branchId: data.branchId,
        name: data.name,
        accountName: data.accountName || undefined,
        accountNumber: data.accountNumber,
        bankName: data.bankName,
        branch: data.branch || undefined,
        swiftCode: data.swiftCode || undefined,
        routingNumber: data.routingNumber || undefined,
        contactPerson: data.contactPerson || undefined,
        contactPhone: data.contactPhone || undefined,
        contactEmail: data.contactEmail || undefined,
        glAccountId: data.glAccountId,
        currencyCode: data.currencyCode,
        isActive: data.isActive,
        authorizedEmployeeIds: authorizedIds,
      };

      const payload = {
        ...baseData,
        openingBalance: data.openingBalance,
        openingBalanceDate: data.openingBalanceDate,
        openingBalanceExchangeRate: data.openingBalanceExchangeRate,
      };

      if (isEditing) {
        await onSubmit(payload as UpdateBankDto);
      } else {
        await onSubmit(payload as CreateBankDto);
      }
    } catch (err: unknown) {
      setError('root', { message: extractErrorMessage(err, 'Failed to save bank account') });
    }
  };

  // On validation failure, switch to basic tab (all required fields are there)
  const onValidationError = () => {
    const missing: string[] = [];
    if (errors.name) missing.push('Display Name');
    if (errors.accountNumber) missing.push('Account Number');
    if (errors.bankName) missing.push('Bank Name');
    if (errors.glAccountId) missing.push('GL Account');
    if (errors.currencyCode) missing.push('Currency');
    if (missing.length > 0) {
      setError('root', {
        message: `Please fill in required fields in the Basic Information tab: ${missing.join(', ')}.`,
      });
    }
    setActiveTab('basic');
  };

  const inputClass = 'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <form onSubmit={handleSubmit(onFormSubmit, onValidationError)} className="space-y-6">
      {/* Error Banner */}
      {errors.root && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {errors.root.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px relative',
            activeTab === 'basic'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
            Object.keys(errors).some(k => k !== 'root') && activeTab !== 'basic' && 'text-red-500',
          )}
        >
          Basic Information
          {Object.keys(errors).some(k => k !== 'root') && (
            <span className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-red-500" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('authorization')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-2',
            activeTab === 'authorization'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <UserCheck className="h-4 w-4" />
          Authorized Employees
          {authorizedIds.length > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-primary/10 text-primary text-xs font-bold px-1.5">
              {authorizedIds.length}
            </span>
          )}
        </button>
      </div>

      {/* Basic Information Tab */}
      {activeTab === 'basic' && (
        <div className="rounded-xl border bg-card p-6 space-y-6">
          {/* Display Name */}
          <FormField id="name" label="Display Name" required error={errors.name?.message}>
            {(props) => (
              <input
                {...props}
                {...register('name')}
                type="text"
                placeholder="e.g., Main Operating Account"
                className={cn(inputClass, errors.name && 'border-red-500')}
              />
            )}
          </FormField>

          {/* Branch Scope */}
          <FormField id="branchId" label="Branch Access">
            {(props) => (
              <select
                {...props}
                value={watch('branchId') ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setValue('branchId', val, { shouldValidate: true });
                }}
                className={inputClass}
              >
                <option value="">All Branches (company-wide)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}{b.code ? ` (${b.code})` : ''}</option>
                ))}
              </select>
            )}
          </FormField>

          {/* Bank Name */}
          <FormField id="bankName" label="Bank Name" required error={errors.bankName?.message}>
            {(props) => (
              <input
                {...props}
                {...register('bankName')}
                type="text"
                placeholder="e.g., First Bank"
                className={cn(inputClass, errors.bankName && 'border-red-500')}
              />
            )}
          </FormField>

          {/* Account Number and Account Name */}
          <div className="grid grid-cols-2 gap-4">
            <FormField id="accountNumber" label="Account Number" required error={errors.accountNumber?.message}>
              {(props) => (
                <input
                  {...props}
                  {...register('accountNumber')}
                  type="text"
                  placeholder="e.g., 0123456789"
                  className={cn(inputClass, 'font-mono', errors.accountNumber && 'border-red-500')}
                />
              )}
            </FormField>

            <FormField id="accountName" label="Account Name">
              {(props) => (
                <input
                  {...props}
                  {...register('accountName')}
                  type="text"
                  placeholder="Account holder name"
                  className={inputClass}
                />
              )}
            </FormField>
          </div>

          {/* SWIFT Code and Routing Number */}
          <div className="grid grid-cols-2 gap-4">
            <FormField id="swiftCode" label="SWIFT Code">
              {(props) => (
                <input
                  {...props}
                  {...register('swiftCode')}
                  type="text"
                  placeholder="e.g., FBNINGLA"
                  className={cn(inputClass, 'font-mono uppercase')}
                />
              )}
            </FormField>

            <FormField id="routingNumber" label="Routing Number">
              {(props) => (
                <input
                  {...props}
                  {...register('routingNumber')}
                  type="text"
                  placeholder="e.g., 011000015"
                  className={cn(inputClass, 'font-mono')}
                />
              )}
            </FormField>
          </div>

          {/* Currency */}
          <div className="grid grid-cols-2 gap-4">
            <FormField id="currencyCode" label="Currency" required error={errors.currencyCode?.message}>
              {(props) => (
                <select
                  {...props}
                  value={watch('currencyCode')}
                  onChange={(e) => setValue('currencyCode', e.target.value, { shouldValidate: true })}
                  className={cn(inputClass, errors.currencyCode && 'border-red-500')}
                  disabled={currenciesLoading}
                >
                  {currenciesLoading ? (
                    <option value="">Loading currencies...</option>
                  ) : (
                    currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))
                  )}
                </select>
              )}
            </FormField>
            <div className="flex items-end pb-2">
              <p className="text-xs text-muted-foreground">
                Transactions in this bank account will be recorded in this currency.
                Reporting uses exchange rates to convert.
              </p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t pt-6">
            <h4 className="text-sm font-semibold text-muted-foreground mb-4">Contact Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField id="contactPerson" label="Contact Person">
                {(props) => (
                  <input
                    {...props}
                    {...register('contactPerson')}
                    type="text"
                    placeholder="e.g., John Doe"
                    className={inputClass}
                  />
                )}
              </FormField>

              <FormField id="contactPhone" label="Contact Phone">
                {(props) => (
                  <input
                    {...props}
                    {...register('contactPhone')}
                    type="text"
                    placeholder="e.g., +234 800 000 0000"
                    className={inputClass}
                  />
                )}
              </FormField>
            </div>

            <div className="mt-4">
              <FormField id="contactEmail" label="Contact Email">
                {(props) => (
                  <input
                    {...props}
                    {...register('contactEmail')}
                    type="email"
                    placeholder="e.g., contact@bank.com"
                    className={inputClass}
                  />
                )}
              </FormField>
            </div>
          </div>

          {/* GL Account */}
          <EntityCombobox
            value={watch('glAccountId') ?? null}
            onChange={(id) => setValue('glAccountId', id ?? undefined, { shouldValidate: true })}
            items={accounts}
            labelKey="name"
            subtitleKey="code"
            searchKeys={['name', 'code']}
            label="GL Account"
            placeholder="Select GL Account"
            required
            disabled={accountsLoading}
            error={errors.glAccountId?.message}
          />

          {/* Opening Balance */}
          <div className="grid grid-cols-2 gap-4">
            <FormField id="openingBalance" label="Opening Balance">
              {(props) => (
                <input
                  {...props}
                  {...register('openingBalance', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className={inputClass}
                />
              )}
            </FormField>

            <FormField id="openingBalanceDate" label="As of Date">
              {(props) => (
                <input
                  {...props}
                  {...register('openingBalanceDate')}
                  type="date"
                  className={inputClass}
                />
              )}
            </FormField>
          </div>

          {/* Exchange Rate - only for foreign currency banks */}
          {watch('currencyCode') && watch('currencyCode') !== (companyCurrency || 'NGN') && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Exchange Rate ({watch('currencyCode')} → {companyCurrency || 'NGN'})
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    Rate to convert opening balance to base currency for GL posting
                  </p>
                </div>
                <button
                  type="button"
                  disabled={fetchingRate}
                  onClick={async () => {
                    try {
                      setFetchingRate(true);
                      const bankCurrency = currencies.find((c) => c.code === watch('currencyCode'));
                      const baseCurrency = currencies.find((c) => c.code === (companyCurrency || 'NGN'));
                      if (bankCurrency && baseCurrency) {
                        const rate = await exchangeRatesApi.getCurrent(bankCurrency.id, baseCurrency.id);
                        if (rate && rate.rate) {
                          setValue('openingBalanceExchangeRate', Number(rate.rate), { shouldValidate: true });
                        } else {
                          alert('No exchange rate found. Please enter manually.');
                        }
                      }
                    } catch {
                      alert('Could not fetch exchange rate. Please enter manually.');
                    } finally {
                      setFetchingRate(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/30 disabled:opacity-50 transition-colors"
                >
                  {fetchingRate ? 'Fetching...' : 'Auto-fetch rate'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField id="openingBalanceExchangeRate" label={`1 ${watch('currencyCode')} = ? ${companyCurrency || 'NGN'}`}>
                  {(props) => (
                    <input
                      {...props}
                      {...register('openingBalanceExchangeRate', { valueAsNumber: true })}
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder="e.g., 1550.00"
                      className={inputClass}
                    />
                  )}
                </FormField>
                <div className="flex items-end pb-2">
                  {(watch('openingBalance') ?? 0) > 0 && (watch('openingBalanceExchangeRate') ?? 0) > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Base currency value: <span className="font-semibold">{(companyCurrency || 'NGN')} {((watch('openingBalance') ?? 0) * (watch('openingBalanceExchangeRate') ?? 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Active Checkbox */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              {...register('isActive')}
              type="checkbox"
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm">Active</span>
          </label>
        </div>
      )}

      {/* Authorization Tab */}
      {activeTab === 'authorization' && (
        <div className="space-y-4">
          {/* Add Employee */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-sm font-semibold mb-3">Authorize Employee</h3>
            <div className="flex gap-3">
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className={cn(inputClass, 'flex-1')}
                disabled={employeesLoading}
              >
                <option value="">
                  {employeesLoading ? 'Loading employees...' : 'Select an employee to authorize...'}
                </option>
                {availableEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} {emp.employeeCode ? `(${emp.employeeCode})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addAuthorizedEmployee}
                disabled={!selectedEmployeeId}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>

          {/* Authorized List */}
          <div className="rounded-xl border bg-card">
            <div className="px-6 py-4 border-b">
              <h3 className="text-sm font-semibold">
                Authorized Employees
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({authorizedIds.length})
                </span>
              </h3>
            </div>

            {authorizedIds.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <UserCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No authorized employees yet. Use the form above to add employees.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {authorizedIds.map((empId) => (
                  <div
                    key={empId}
                    className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                        <UserCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{getEmployeeName(empId)}</div>
                        <div className="text-xs text-muted-foreground">
                          {getEmployeeCode(empId) || 'Employee'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAuthorizedEmployee(empId)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remove authorization"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
