'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTenantStore } from '@/store/tenantStore';
import { publicApi } from '@/lib/api';
import { useFlashStore } from '@/stores/flash';
/* eslint-disable @next/next/no-img-element */
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthLayout } from '../components';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, setError } = useTenantStore();
  const { message: flashMessage, type: flashType, clearFlash } = useFlashStore();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [branding, setBranding] = useState<{
    tenantName: string;
    companyName: string | null;
    companyDisplayName: string | null;
    logoUrl: string | null;
    platformName: string | null;
    platformLogoUrl: string | null;
  } | null>(null);

  const defaultAppName = process.env.NEXT_PUBLIC_APP_NAME || 'AssetPro';
  const appName = branding?.platformName || defaultAppName;

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }

    // Extract subdomain from hostname
    const hostname = window.location.hostname;
    const domainSuffix = process.env.NEXT_PUBLIC_DOMAIN_SUFFIX || 'localhost';
    const parts = hostname.split('.');
    // For production: tenant.domain.com (3+ parts)
    // For local dev: tenant.localhost (2 parts when suffix is 'localhost')
    const hasSubdomain = parts.length >= 3
      ? parts[0] !== 'www'
      : parts.length === 2 && parts[1] === domainSuffix && parts[0] !== 'www';
    if (hasSubdomain) {
      const slug = parts[0];
      setSubdomain(slug);

      // Fetch tenant branding
      publicApi.getTenantBranding(slug).then(setBranding).catch(() => {});
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      await login(data.email, data.password, subdomain);
      // Route customers to the fleet portal; employees and others go to the
      // internal dashboard. The investor /portal has its own flow and is
      // entered via direct link, not the post-login default.
      // The TenantUser shape in this store doesn't include userType, so we
      // decode the JWT directly — same JTI/payload the backend issued.
      let userType: string | null = null;
      try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('access_token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
          userType = payload?.userType ?? null;
        }
      } catch {
        // Decode failure is non-fatal — fall through to default route.
      }
      if (userType === 'CUSTOMER') {
        router.push('/portal/fleet/bookings');
      } else {
        router.push('/dashboard');
      }
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <AuthLayout
      showFeatures={true}
      title={branding ? `Welcome to ${branding.companyDisplayName || branding.companyName || branding.tenantName}` : `Welcome back to ${appName}`}
      subtitle="Access your comprehensive business management dashboard with enterprise-grade security and intuitive design."
      appNameOverride={branding?.platformName || undefined}
      platformLogoUrl={branding?.platformLogoUrl || undefined}
      topRightLink={{ href: '/portal/login', label: 'Customer / Investor Portal →' }}
    >
      {/* Company Branding */}
      {branding && (
        <div className="mb-6 flex flex-col items-center text-center lg:mb-8">
          <img
            src={(() => {
              if (!branding.logoUrl) return '/salvage-icon.png';
              // If logoUrl points to localhost, replace with the actual API base
              if (branding.logoUrl.includes('localhost')) {
                const path = branding.logoUrl.replace(/^https?:\/\/[^/]+/, '');
                const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace('/api/v1', '');
                return apiBase ? `${apiBase}${path}` : path;
              }
              return branding.logoUrl;
            })()}
            alt={branding.companyDisplayName || branding.companyName || branding.tenantName}
            className="mb-3 h-16 w-16 rounded-xl object-contain sm:h-20 sm:w-20"
          />
          <h2 className={`text-lg font-bold sm:text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {branding.companyDisplayName || branding.companyName || branding.tenantName}
          </h2>
          <p className={`mt-1 text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Sign in to your account to continue
          </p>
        </div>
      )}

      {/* Fallback header when no branding loaded */}
      {!branding && (
        <div className="mb-6 lg:mb-8">
          <p className={`mt-1 text-xs lg:mt-2 lg:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Sign in to your {appName} account to continue
          </p>
        </div>
      )}

      {/* Form Content */}
      <div
        className={`rounded-xl border p-6 shadow-lg sm:rounded-2xl sm:p-8 sm:shadow-xl ${
          isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
        }`}
      >
        {/* Session Expired / Flash Message */}
        {flashMessage && (
          <div
            className={`mb-4 rounded-lg border p-3 sm:mb-6 sm:p-4 ${
              flashType === 'error'
                ? isDarkMode ? 'border-amber-800 bg-amber-900/20' : 'border-amber-200 bg-amber-50'
                : isDarkMode ? 'border-green-800 bg-green-900/20' : 'border-green-200 bg-green-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-xs font-medium sm:text-sm ${
                flashType === 'error'
                  ? isDarkMode ? 'text-amber-200' : 'text-amber-800'
                  : isDarkMode ? 'text-green-200' : 'text-green-800'
              }`}>
                {flashMessage}
              </p>
              <button onClick={clearFlash} className="ml-2 text-xs opacity-60 hover:opacity-100">&times;</button>
            </div>
          </div>
        )}

        {/* Status Message */}
        {status && (
          <div
            className={`mb-4 rounded-lg border p-3 sm:mb-6 sm:p-4 ${
              isDarkMode
                ? 'border-green-800 bg-green-900/20'
                : 'border-green-200 bg-green-50'
            }`}
          >
            <p
              className={`text-xs font-medium sm:text-sm ${
                isDarkMode ? 'text-green-200' : 'text-green-800'
              }`}
            >
              {status}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            className={`mb-4 rounded-lg border p-3 sm:mb-6 sm:p-4 ${
              isDarkMode
                ? 'border-red-800 bg-red-900/20'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <p
              className={`text-xs font-medium sm:text-sm ${
                isDarkMode ? 'text-red-200' : 'text-red-800'
              }`}
            >
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          {/* Email Field */}
          <div className="space-y-1.5 sm:space-y-2">
            <label
              htmlFor="email"
              className={`text-xs font-medium sm:text-sm ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}
            >
              Email address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 sm:pl-3">
                <Mail className="h-4 w-4 text-gray-400 sm:h-5 sm:w-5" />
              </div>
              <input
                id="email"
                type="email"
                autoFocus
                autoComplete="username"
                placeholder="Enter your email address"
                {...register('email')}
                className={`h-10 w-full rounded-md border pl-8 text-sm sm:h-12 sm:pl-10 sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : isDarkMode
                      ? 'border-gray-600 bg-gray-800 text-white placeholder:text-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'
                }`}
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500 sm:text-sm">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-center sm:gap-0">
              <label
                htmlFor="password"
                className={`text-xs font-medium sm:text-sm ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}
              >
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                tabIndex={6}
                className={`text-xs font-medium sm:text-sm ${
                  isDarkMode
                    ? 'text-blue-400 hover:text-blue-500'
                    : 'text-blue-600 hover:text-blue-500'
                }`}
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 sm:pl-3">
                <Lock className="h-4 w-4 text-gray-400 sm:h-5 sm:w-5" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                tabIndex={2}
                {...register('password')}
                className={`h-10 w-full rounded-md border pl-8 pr-10 text-sm sm:h-12 sm:pl-10 sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.password
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : isDarkMode
                      ? 'border-gray-600 bg-gray-800 text-white placeholder:text-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'
                }`}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={7}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 sm:pr-3"
              >
                {!showPassword ? (
                  <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 sm:h-5 sm:w-5" />
                ) : (
                  <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 sm:h-5 sm:w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 sm:text-sm">{errors.password.message}</p>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between">
            <label
              htmlFor="remember"
              className="flex cursor-pointer items-center space-x-2 sm:space-x-3"
            >
              <input
                id="remember"
                type="checkbox"
                tabIndex={3}
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Remember me
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            tabIndex={4}
            disabled={isLoading}
            className="h-10 w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:h-12 sm:text-base flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin sm:h-5 sm:w-5" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>

          {/* Sign Up Link */}
          <div
            className={`border-t pt-3 text-center sm:pt-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Don&apos;t have an account?
              <Link
                href="/auth/register"
                tabIndex={5}
                className={`ml-1 font-medium ${
                  isDarkMode
                    ? 'text-blue-400 hover:text-blue-500'
                    : 'text-blue-600 hover:text-blue-500'
                }`}
              >
                Create one now
              </Link>
            </p>
          </div>

        </form>
      </div>
    </AuthLayout>
  );
}
