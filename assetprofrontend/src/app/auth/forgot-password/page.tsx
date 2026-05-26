'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '../components';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api/v1';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send reset email');
      }

      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      showFeatures={true}
      title="Reset Your Password"
      subtitle="Enter your email address and we'll send you instructions to reset your password."
    >
      {/* Form Header */}
      <div className="mb-6 lg:mb-8">
        <h2 className={`text-xl font-bold lg:text-2xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Forgot Password?
        </h2>
        <p className={`mt-1 text-xs lg:mt-2 lg:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          No worries, we&apos;ll send you reset instructions
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
              Check your email
            </h3>
            <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              We&apos;ve sent a password reset link to{' '}
              <span className="font-medium text-blue-600">{getValues('email')}</span>
            </p>
            <p className={`text-xs mb-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Didn&apos;t receive the email? Check your spam folder or{' '}
              <button
                onClick={() => setIsSuccess(false)}
                className="text-blue-600 hover:underline font-medium"
              >
                try again
              </button>
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
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
                    autoComplete="email"
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="h-10 w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:h-12 sm:text-base flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin sm:h-5 sm:w-5" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send Reset Instructions</span>
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
