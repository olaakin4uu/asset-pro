'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { publicApi } from '@/lib/api';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';
  const slug = searchParams.get('slug') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !slug) {
      setError('Invalid invitation link. Please check your email and try again.');
    }
  }, [token, slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await publicApi.acceptInvite(token, slug, password);
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to activate account';
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message ?? msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="bg-card rounded-2xl border shadow-lg p-10 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Account Activated!</h1>
          <p className="text-muted-foreground mb-6">
            Your account is ready. Redirecting you to login&hellip;
          </p>
          <Link href="/auth/login" className="text-primary underline text-sm">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (!token || !slug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="bg-card rounded-2xl border shadow-lg p-10 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Invalid Invitation</h1>
          <p className="text-muted-foreground">
            This invitation link is invalid or has expired. Please ask an admin to resend your invitation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="bg-card rounded-2xl border shadow-lg p-10 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-1">Accept Your Invitation</h1>
          <p className="text-muted-foreground text-sm">Set a password to activate your account.</p>
        </div>

        {error && (
          <div className="mb-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                className="w-full pl-9 pr-10 py-2.5 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                className="w-full pl-9 pr-10 py-2.5 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Activating&hellip;
              </>
            ) : (
              'Activate Account'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary hover:underline font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
