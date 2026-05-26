'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Check,
  Search,
  Building2,
  Settings,
  GitBranch,
  Loader2,
} from 'lucide-react';
import { cn, resolveUploadUrl } from '@/lib/utils';
import { useCompanyContext, useCompanyInitials } from '@/stores/company-context';
import type { CompanyDetails, BranchDetails } from '@/lib/api/core';

// ============================================================================
// COMPANY SWITCHER COMPONENT
// ============================================================================

interface CompanySwitcherProps {
  className?: string;
  showBranchSelector?: boolean;
  collapsed?: boolean;
}

export function CompanySwitcher({
  className,
  showBranchSelector = true,
  collapsed = false,
}: CompanySwitcherProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBranches, setShowBranches] = useState(false);

  const {
    company,
    branch,
    availableCompanies,
    accessibleBranches,
    hasMultipleCompanies,
    hasMultipleBranches,
    isSwitching,
    switchingTo,
    switchCompany,
    switchBranch,
    fetchContext,
  } = useCompanyContext();

  const companyInitials = useCompanyInitials();

  // Note: Context is fetched by TenantLayout, no need to fetch here

  // Filter companies based on search
  const filteredCompanies = useMemo(() => {
    if (!searchQuery) {
      return availableCompanies.filter((c) => c.id !== company?.id);
    }

    const query = searchQuery.toLowerCase();
    return availableCompanies.filter(
      (c) =>
        c.id !== company?.id &&
        (c.name.toLowerCase().includes(query) ||
          c.displayName?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query))
    );
  }, [availableCompanies, company?.id, searchQuery]);

  // Handle company switch
  const handleSwitchCompany = async (targetCompany: CompanyDetails) => {
    if (isSwitching || targetCompany.id === company?.id) return;

    setIsOpen(false);
    await switchCompany(targetCompany.id);
  };

  // Handle branch switch
  const handleSwitchBranch = async (targetBranch: BranchDetails) => {
    if (isSwitching || targetBranch.id === branch?.id) return;

    setShowBranches(false);
    await switchBranch(targetBranch.id);
  };

  // Get company initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-company-switcher]')) {
        setIsOpen(false);
        setShowBranches(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show prompt to select company if none selected
  if (!company) {
    // If there are available companies, show a selection prompt
    if (availableCompanies.length > 0) {
      return (
        <div className={cn('relative', className)} data-company-switcher>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
              'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800',
              'hover:bg-amber-100 dark:hover:bg-amber-900/30'
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600">
              <Building2 className="h-5 w-5" />
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Select Company</p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Click to choose</p>
                </div>
                <ChevronDown className={cn('h-4 w-4 text-amber-600', isOpen && 'rotate-180')} />
              </>
            )}
          </button>

          {/* Company Selection Dropdown */}
          {isOpen && !collapsed && (
            <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border bg-popover shadow-lg">
              <div className="p-2">
                <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">
                  Select a Company
                </p>
                {availableCompanies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      switchCompany(c.id);
                      setIsOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                      {(c.displayName || c.name).split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.displayName || c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.branchCount} {c.branchCount === 1 ? 'branch' : 'branches'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // No companies available at all
    return (
      <div className={cn('rounded-lg bg-muted p-3', className)}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted-foreground/20">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">No Companies</p>
              <p className="text-xs text-muted-foreground/70">Contact admin</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)} data-company-switcher>
      {/* Current Company Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
          'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20',
          isSwitching && 'opacity-50 cursor-wait'
        )}
      >
        {/* Company Logo/Avatar */}
        <div className="relative flex-shrink-0">
          {company.logoUrl ? (
            <img
              src={resolveUploadUrl(company.logoUrl)}
              alt={company.name}
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white">
              {companyInitials}
            </div>
          )}
          {isSwitching && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Company Info — name wraps within the available width and centres so
            long company names don't spill over neighbouring header items. Capped
            at 2 lines via line-clamp to keep the row height bounded. */}
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-center text-sm font-medium leading-tight whitespace-normal break-words line-clamp-2">
                {company.displayName || company.name}
              </p>
              {branch && (
                <p className="truncate text-xs text-muted-foreground text-center mt-0.5">
                  {branch.name}
                  {branch.isHeadOffice && ' (HQ)'}
                </p>
              )}
            </div>

            <ChevronDown
              className={cn(
                'h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && !collapsed && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border bg-popover shadow-lg">
          {/* Search Box (only show if multiple companies) */}
          {availableCompanies.length > 5 && (
            <div className="border-b p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Current Company (Highlighted) */}
          <div className="border-b p-2">
            <div className="flex items-center gap-3 rounded-lg bg-primary/5 px-3 py-2">
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="h-8 w-8 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-bold text-white">
                  {companyInitials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-primary">
                  {company.displayName || company.name}
                </p>
                <p className="text-xs text-primary/70">Current workspace</p>
              </div>
              <Check className="h-4 w-4 flex-shrink-0 text-primary" />
            </div>
          </div>

          {/* Branch Selector (if applicable) */}
          {showBranchSelector && hasMultipleBranches && (
            <div className="border-b p-2">
              <button
                onClick={() => setShowBranches(!showBranches)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-left">
                  Switch Branch ({accessibleBranches.length})
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    showBranches && 'rotate-180'
                  )}
                />
              </button>

              {showBranches && (
                <div className="mt-1 max-h-40 overflow-y-auto">
                  {accessibleBranches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleSwitchBranch(b)}
                      disabled={isSwitching || b.id === branch?.id}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                        b.id === branch?.id
                          ? 'bg-primary/5 text-primary'
                          : 'hover:bg-muted',
                        isSwitching && 'opacity-50'
                      )}
                    >
                      <GitBranch className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{b.name}</span>
                      {b.isHeadOffice && (
                        <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          HQ
                        </span>
                      )}
                      {b.id === branch?.id && <Check className="h-4 w-4 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Available Companies */}
          {hasMultipleCompanies && (
            <div className="max-h-60 overflow-y-auto p-2">
              <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">
                Switch Company
              </p>
              {filteredCompanies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSwitchCompany(c)}
                  disabled={isSwitching}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted',
                    isSwitching &&
                      switchingTo?.type === 'company' &&
                      switchingTo.id === c.id &&
                      'bg-muted'
                  )}
                >
                  {c.logoUrl ? (
                    <img
                      src={c.logoUrl}
                      alt={c.name}
                      className="h-8 w-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                      {getInitials(c.displayName || c.name)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {c.displayName || c.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.branchCount} {c.branchCount === 1 ? 'branch' : 'branches'}
                    </p>
                  </div>

                  {isSwitching &&
                    switchingTo?.type === 'company' &&
                    switchingTo.id === c.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                </button>
              ))}

              {filteredCompanies.length === 0 && searchQuery && (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No companies found
                </p>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="border-t p-2">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/core/companies');
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span>Manage Companies</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
