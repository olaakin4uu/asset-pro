'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { AuthLayout } from '../components';

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and numbers'),
  password_confirmation: z.string(),
}).refine((data) => data.password === data.password_confirmation, {
  message: 'Passwords do not match',
  path: ['password_confirmation'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api/v1';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'AssetPro';

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to reset password');
      }

      setIsSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show error if no token
  if (!token) {
    return (
      <AuthLayout
        showFeatures={true}
        title="Reset Your Password"
        subtitle="Create a new secure password for your account"
      >
        <div
          className={`rounded-xl border p-6 shadow-lg sm:rounded-2xl sm:p-8 sm:shadow-xl ${
            isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="text-center py-4">
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-red-100 p-3">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Invalid Reset Link
            </h3>
            <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      showFeatures={true}
      title="Reset Your Password"
      subtitle="Create a new secure password for your account"
    >
      {/* Form Header */}
      <div className="mb-6 lg:mb-8">
        <h2 className={`text-xl font-bold lg:text-2xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Create New Password
        </h2>
        <p className={`mt-1 text-xs lg:mt-2 lg:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Your new password must be different from previous passwords
        </p>
      </div>

      {/* Form Content */}
      <div
        className={`rounded-xl border p-6 shadow-lg sm:rounded-2xl sm:p-8 sm:shadow-xl ${
          isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
        }`}
      >
        {isSuccess ? (
          <div className="text-center py-4">
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Password Reset Successful
            </h3>
            <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Your password has been successfully reset. You will be redirected to the login page shortly.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <>
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
              {/* Password Field */}
              <div className="space-y-1.5 sm:space-y-2">
                <label
                  htmlFor="password"
                  className={`text-xs font-medium sm:text-sm ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}
                >
                  New Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 sm:pl-3">
                    <Lock className="h-4 w-4 text-gray-400 sm:h-5 sm:w-5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    autoComplete="new-password"
                    placeholder="Enter new password"
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
                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Must be at least 8 characters with uppercase, lowercase, and numbers
                </p>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1.5 sm:space-y-2">
                <label
                  htmlFor="password_confirmation"
                  className={`text-xs font-medium sm:text-sm ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 sm:pl-3">
                    <Lock className="h-4 w-4 text-gray-400 sm:h-5 sm:w-5" />
                  </div>
                  <input
                    id="password_confirmation"
                    type={showPasswordConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Confirm new password"
                    {...register('password_confirmation')}
                    className={`h-10 w-full rounded-md border pl-8 pr-10 text-sm sm:h-12 sm:pl-10 sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.password_confirmation
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : isDarkMode
                          ? 'border-gray-600 bg-gray-800 text-white placeholder:text-gray-500'
                          : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 sm:pr-3"
                  >
                    {!showPasswordConfirm ? (
                      <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 sm:h-5 sm:w-5" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 sm:h-5 sm:w-5" />
                    )}
                  </button>
                </div>
                {errors.password_confirmation && (
                  <p className="text-xs text-red-500 sm:text-sm">{errors.password_confirmation.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="h-10 w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:h-12 sm:text-base flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin sm:h-5 sm:w-5" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <span>Reset Password</span>
                )}
              </button>

              {/* Back to Login Link */}
              <div className="text-center">
                <Link
                  href="/auth/login"
                  className={`inline-flex items-center gap-2 text-sm font-medium ${
                    isDarkMode
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

function ResetPasswordFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
      <div className="animate-pulse">
        <div className="h-8 w-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
