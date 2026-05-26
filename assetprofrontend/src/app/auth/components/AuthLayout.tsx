'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
/* eslint-disable @next/next/no-img-element */
import { Sun, Moon, Building2, BarChart3, Shield, Globe } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  showFeatures?: boolean;
  title?: string;
  subtitle?: string;
  appNameOverride?: string;
  platformLogoUrl?: string;
  topRightLink?: { href: string; label: string };
}

const features = [
  {
    icon: Building2,
    title: 'Fixed Asset Register',
    description: 'Complete asset lifecycle from acquisition to disposal, with full audit trail and custody tracking.',
  },
  {
    icon: BarChart3,
    title: 'IFRS-Compliant Depreciation',
    description: 'Straight-line and reducing balance methods with automated periodic depreciation runs.',
  },
  {
    icon: Shield,
    title: 'GL Integration',
    description: 'Automatic journal entries for depreciation, disposals, and transfers — always in sync with your ledger.',
  },
  {
    icon: Globe,
    title: 'Multi-Tenant Platform',
    description: 'Isolated schemas for every organisation — your data is always secure and segregated.',
  },
];

export function AuthLayout({ children, showFeatures = true, title, subtitle, appNameOverride, platformLogoUrl, topRightLink }: AuthLayoutProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const appName = appNameOverride || process.env.NEXT_PUBLIC_APP_NAME || 'AssetPro';
  const logoSrc = platformLogoUrl || '/assetpro-icon.png';
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  return (
    <div
      className={`min-h-screen ${
        isDarkMode
          ? 'bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950'
          : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
      }`}
    >
      {/* Background Pattern */}
      <div
        className={`absolute inset-0 ${isDarkMode ? 'bg-grid-slate-800/50' : 'bg-grid-slate-200/50'}`}
        style={{
          backgroundImage: isDarkMode
            ? "url(\"data:image/svg+xml,%3csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='%231e293b' fill-opacity='0.5' fill-rule='evenodd'%3e%3cpath d='m0 40 40-40h-40v40zm40 0v-40h-40l40 40z'/%3e%3c/g%3e%3c/svg%3e\")"
            : "url(\"data:image/svg+xml,%3csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='%23e2e8f0' fill-opacity='0.5' fill-rule='evenodd'%3e%3cpath d='m0 40 40-40h-40v40zm40 0v-40h-40l40 40z'/%3e%3c/g%3e%3c/svg%3e\")",
          maskImage: isDarkMode
            ? 'linear-gradient(0deg, rgba(255,255,255,0.1), rgba(255,255,255,0.5))'
            : 'linear-gradient(0deg, white, rgba(255,255,255,0.6))',
          WebkitMaskImage: isDarkMode
            ? 'linear-gradient(0deg, rgba(255,255,255,0.1), rgba(255,255,255,0.5))'
            : 'linear-gradient(0deg, white, rgba(255,255,255,0.6))',
        }}
      />

      {/* Top-right corner link (e.g. portal access) */}
      {topRightLink && (
        <div className="absolute top-4 right-4 z-10 sm:top-5 sm:right-6">
          <Link
            href={topRightLink.href}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              isDarkMode
                ? 'border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white'
                : 'border-gray-200 text-gray-500 bg-white/70 hover:bg-white hover:text-gray-800 shadow-sm'
            }`}
          >
            {topRightLink.label}
          </Link>
        </div>
      )}

      <div className="relative flex min-h-screen flex-col lg:flex-row">
        {/* Left Panel - Branding & Info */}
        {showFeatures && (
          <div className="hidden flex-col justify-between px-6 py-8 lg:flex lg:w-1/2 lg:px-8 lg:py-12">
            <div className="mx-auto max-w-md">
              {/* Company Logo & Branding */}
              <div className="mb-8 lg:mb-12">
                <Link href="/" className="flex items-center space-x-3">
                  <img src={logoSrc} alt={appName} width={48} height={48} className="h-10 w-10 lg:h-12 lg:w-12" />
                  <div>
                    <h1
                      className={`text-xl font-bold lg:text-2xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                    >
                      {appName}
                    </h1>
                    <p className={`text-xs lg:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Fixed Asset Management Platform
                    </p>
                  </div>
                </Link>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-6 lg:space-y-8">
                {title && (
                  <div>
                    <h2
                      className={`mb-3 text-base font-semibold lg:mb-4 lg:text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                    >
                      {title}
                    </h2>
                    {subtitle && (
                      <p
                        className={`text-sm leading-relaxed lg:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                      >
                        {subtitle}
                      </p>
                    )}
                  </div>
                )}

                {/* Key Features */}
                <div className="space-y-3 lg:space-y-4">
                  {features.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div key={feature.title} className="flex items-start space-x-3">
                        <div
                          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'}`}
                        >
                          <Icon className={`h-4 w-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        </div>
                        <div>
                          <h3
                            className={`text-sm font-medium lg:text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                          >
                            {feature.title}
                          </h3>
                          <p className={`text-xs lg:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mx-auto max-w-md">
              <div
                className={`flex flex-col items-start justify-between gap-4 text-xs sm:flex-row sm:items-center lg:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
              >
                <p>
                  &copy; {currentYear} {appName}. All rights reserved.
                </p>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={toggleTheme}
                    className={`rounded-lg p-2 ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                  >
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Panel - Form Content */}
        <div className={`flex w-full flex-col justify-center px-4 py-8 sm:px-6 ${showFeatures ? 'lg:w-1/2' : ''} lg:px-8 lg:py-12`}>
          <div className="mx-auto w-full max-w-md">
            {/* Mobile Header with Theme Toggle */}
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <Link href="/" className="flex items-center space-x-2">
                <img src={logoSrc} alt={appName} width={32} height={32} className="h-8 w-8" />
                <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {appName}
                </span>
              </Link>
              <button
                onClick={toggleTheme}
                className={`rounded-lg p-2 ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>

            {/* Form Content */}
            {children}

            {/* Additional Links */}
            <div className="mt-6 text-center lg:mt-8">
              <div className="flex flex-col items-center justify-center gap-3 text-xs md:flex-row md:gap-6 md:text-sm">
                <Link
                  href="/privacy"
                  className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Terms of Service
                </Link>
                <Link
                  href="/contact"
                  className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Context for sharing theme state
export function useAuthTheme() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  return { isDarkMode, setIsDarkMode };
}
