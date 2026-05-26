'use client';

import { useCompanyContext } from '@/stores/company-context';

interface ReportHeaderProps {
  reportTitle: string;
  subtitle?: string;
}

/**
 * Professional report header with company logo, name, and report title.
 * Shown on screen and optimised for print.
 */
export function ReportHeader({ reportTitle, subtitle }: ReportHeaderProps) {
  const { company } = useCompanyContext();
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace('/api/v1', '');

  return (
    <div className="text-center mb-2 print:mb-4">
      {/* Logo */}
      {company?.logoPath && (
        <img
          src={`${apiBase}/uploads/${company.logoPath}`}
          alt={company?.name || 'Company'}
          className="mx-auto mb-2 max-h-14 object-contain print:max-h-16"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}

      {/* Company Name */}
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 print:text-2xl">
        {company?.displayName || company?.name || ''}
      </h1>

      {/* Report Title */}
      <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mt-1 print:text-lg">
        {reportTitle}
      </h2>

      {/* Subtitle (date range, as-of date, etc.) */}
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {subtitle}
        </p>
      )}

      {/* Separator */}
      <div className="mt-3 border-b-2 border-gray-800 dark:border-gray-200 print:border-black" />
    </div>
  );
}
