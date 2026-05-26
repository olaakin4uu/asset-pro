'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import type { BranchDetails } from '@/lib/api/core';

// ============================================================================
// TYPES
// ============================================================================

export interface BranchSelectorProps {
  /** List of branches the employee has access to */
  branches: BranchDetails[];
  /** Currently selected branch ID */
  value: number | null;
  /** Called when the employee selects a branch */
  onChange: (branchId: number | null) => void;
  /** If true, the employee has only 1 branch — renders nothing */
  hasSingleBranch?: boolean;
  /** Show "All Branches" option (branchId = null means company-wide) */
  showAllOption?: boolean;
  /** Label for the "All Branches" option */
  allOptionLabel?: string;
  /** Label text */
  label?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Error message */
  error?: string | null;
  /** Additional CSS class for the container */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Branch selector dropdown for transaction forms.
 *
 * This should be the FIRST field on every transaction form.
 * - If the employee has only 1 branch → renders nothing (auto-selected)
 * - If the employee has multiple branches → renders a dropdown
 *
 * Usage:
 * ```tsx
 * const { branches, selectedBranchId, setSelectedBranchId, hasSingleBranch } = useBranchAccess();
 *
 * <BranchSelector
 *   branches={branches}
 *   value={selectedBranchId}
 *   onChange={setSelectedBranchId}
 *   hasSingleBranch={hasSingleBranch}
 *   required
 * />
 * ```
 */
export function BranchSelector({
  branches,
  value,
  onChange,
  hasSingleBranch = false,
  showAllOption = false,
  allOptionLabel = 'All Branches (Company-wide)',
  label = 'Branch',
  required = true,
  disabled = false,
  error,
  className = '',
}: BranchSelectorProps) {
  // If single branch and no "All" option, don't render — branch is auto-selected
  if (hasSingleBranch && !showAllOption) {
    return null;
  }

  return (
    <div className={`${className}`}>
      <label
        htmlFor="branch-selector"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        <span className="flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-blue-500" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </span>
      </label>
      <select
        id="branch-selector"
        value={value === null && showAllOption ? 'all' : (value ?? '')}
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'all') {
            onChange(null);
          } else {
            onChange(val ? parseInt(val, 10) : null);
          }
        }}
        disabled={disabled}
        className={`
          w-full rounded-lg border px-3 py-2 text-sm
          bg-white dark:bg-gray-800
          ${error
            ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
          }
          focus:outline-none focus:ring-2
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        `}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? 'branch-selector-error' : undefined}
      >
        {showAllOption ? (
          <option value="all">{allOptionLabel}</option>
        ) : (
          <option value="">-- Select Branch --</option>
        )}
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
            {branch.isHeadOffice ? ' (HQ)' : ''}
            {branch.code ? ` — ${branch.code}` : ''}
          </option>
        ))}
      </select>
      {error && (
        <p id="branch-selector-error" className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
