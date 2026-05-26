'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, Building2, Plus } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  businessType?: string;
  city?: string;
  status: 'active' | 'trial' | 'inactive';
}

interface CompanySwitcherProps {
  currentCompany: Company;
  companies?: Company[];
  onSwitch?: (company: Company) => void;
  collapsed?: boolean;
}

export function CompanySwitcher({
  currentCompany,
  companies = [],
  onSwitch,
  collapsed = false,
}: CompanySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSwitch = async (company: Company) => {
    if (company.id === currentCompany.id) {
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      await onSwitch?.(company);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = (status: Company['status']) => {
    switch (status) {
      case 'trial':
        return (
          <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/20 dark:text-orange-300">
            Trial
          </span>
        );
      case 'inactive':
        return (
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/20 dark:text-red-300">
            Inactive
          </span>
        );
      default:
        return null;
    }
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg transition-transform hover:scale-105"
        title={currentCompany.name}
      >
        {currentCompany.logo ? (
          <img
            src={currentCompany.logo}
            alt={currentCompany.name}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <span className="text-xs font-bold text-white">{getInitials(currentCompany.name)}</span>
        )}
      </button>
    );
  }

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-left transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 ${
          isOpen ? 'bg-gray-100 dark:bg-gray-800' : ''
        }`}
      >
        {/* Company Logo/Avatar */}
        <div className="relative h-8 w-8 flex-shrink-0">
          {isLoading ? (
            <div className="h-8 w-8 animate-spin rounded-lg border-2 border-gray-300 border-t-primary" />
          ) : currentCompany.logo ? (
            <img
              src={currentCompany.logo}
              alt={currentCompany.name}
              className="h-8 w-8 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gradient-to-br from-purple-500 to-pink-500 dark:border-gray-700">
              <span className="text-xs font-bold text-white">{getInitials(currentCompany.name)}</span>
            </div>
          )}
        </div>

        {/* Company Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {currentCompany.name}
          </p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {currentCompany.businessType || 'Enterprise'}
          </p>
        </div>

        {/* Chevron */}
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {/* Search (if more than 5 companies) */}
          {companies.length > 5 && (
            <div className="border-b border-gray-200 p-2 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Current Company */}
          <div className="border-b border-gray-200 p-2 dark:border-gray-700">
            <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Current
            </p>
            <div className="flex items-center space-x-3 rounded-lg bg-purple-50 px-3 py-2 dark:bg-purple-900/20">
              {currentCompany.logo ? (
                <img
                  src={currentCompany.logo}
                  alt={currentCompany.name}
                  className="h-8 w-8 rounded-lg border border-purple-200 object-cover dark:border-purple-700"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                  <span className="text-xs font-bold text-white">{getInitials(currentCompany.name)}</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-purple-900 dark:text-purple-100">
                  {currentCompany.name}
                </p>
                <p className="truncate text-xs text-purple-600 dark:text-purple-300">
                  {currentCompany.city || currentCompany.businessType}
                </p>
              </div>
              <Check className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          {/* Other Companies */}
          {filteredCompanies.length > 0 && (
            <div className="p-2">
              <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Switch to
              </p>
              {filteredCompanies
                .filter((c) => c.id !== currentCompany.id)
                .map((company) => (
                  <button
                    key={company.id}
                    onClick={() => handleSwitch(company)}
                    disabled={company.status === 'inactive'}
                    className="flex w-full cursor-pointer items-center space-x-3 rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800"
                  >
                    {company.logo ? (
                      <img
                        src={company.logo}
                        alt={company.name}
                        className="h-8 w-8 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gradient-to-br from-blue-500 to-cyan-500 dark:border-gray-700">
                        <span className="text-xs font-bold text-white">{getInitials(company.name)}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {company.name}
                        </p>
                        {getStatusBadge(company.status)}
                      </div>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {company.city || company.businessType}
                      </p>
                    </div>
                  </button>
                ))}
            </div>
          )}

          {/* Manage Companies Action */}
          <div className="border-t border-gray-200 p-2 dark:border-gray-700">
            <button className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-purple-600 transition-colors hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20">
              <Plus className="h-4 w-4" />
              Manage Companies
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
