'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, ShieldCheck, ShieldOff, Copy, RefreshCw, Loader2, Eye, EyeOff } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi, TwoFactorSetup } from '@/lib/api/settings';
import { extractErrorMessage } from '@/lib/utils';
import { FormField } from '@/components/erp/FormField';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const confirmCodeSchema = z.object({
  code: z
    .string()
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Code must contain only digits'),
});

type ConfirmCodeFormValues = z.infer<typeof confirmCodeSchema>;

const disablePasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

type DisablePasswordFormValues = z.infer<typeof disablePasswordSchema>;

// ============================================================================
// TYPES
// ============================================================================

type Step = 'status' | 'setup' | 'confirm';

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function SecuritySettingsPage() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: () => settingsApi.getProfile(),
  });
  const loadError = fetchError ? extractErrorMessage(fetchError, 'Failed to load profile') : null;

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 2FA setup state
  const [step, setStep] = useState<Step>('status');
  const [setupData, setSetupData] = useState<TwoFactorSetup | null>(null);

  // Disable state
  const [showDisable, setShowDisable] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Recovery codes state
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [showCodes, setShowCodes] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Confirm code form (react-hook-form)
  const confirmForm = useForm<ConfirmCodeFormValues>({
    resolver: zodResolver(confirmCodeSchema),
    defaultValues: { code: '' },
  });

  // Disable password form (react-hook-form)
  const disableForm = useForm<DisablePasswordFormValues>({
    resolver: zodResolver(disablePasswordSchema),
    defaultValues: { password: '' },
  });

  // Enable 2FA - Step 1: Get setup data
  const handleEnable = async () => {
    try {
      setError(null);
      const data = await settingsApi.enable2fa();
      setSetupData(data);
      setStep('setup');
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to initialize 2FA'));
    }
  };

  // Enable 2FA - Step 2: Confirm with TOTP code
  const handleConfirm = async (values: ConfirmCodeFormValues) => {
    try {
      setError(null);
      await settingsApi.confirm2fa(values.code);
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
      setStep('status');
      setSetupData(null);
      confirmForm.reset();
      setSuccess('Two-factor authentication enabled successfully');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Invalid verification code'));
    }
  };

  // Disable 2FA
  const handleDisable = async (values: DisablePasswordFormValues) => {
    try {
      setError(null);
      await settingsApi.disable2fa(values.password);
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
      setShowDisable(false);
      disableForm.reset();
      setRecoveryCodes(null);
      setSuccess('Two-factor authentication disabled');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to disable 2FA'));
    }
  };

  // Load recovery codes
  const handleViewCodes = async () => {
    try {
      setError(null);
      const { codes } = await settingsApi.getRecoveryCodes();
      setRecoveryCodes(codes);
      setShowCodes(true);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to load recovery codes'));
    }
  };

  // Regenerate recovery codes
  const handleRegenerateCodes = async () => {
    if (!confirm('This will invalidate your existing recovery codes. Continue?')) return;
    try {
      setRegenerating(true);
      setError(null);
      const { codes } = await settingsApi.regenerateRecoveryCodes();
      setRecoveryCodes(codes);
      setSuccess('Recovery codes regenerated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to regenerate codes'));
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(error || loadError) && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error || loadError}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* 2FA Status Card */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h3 className="font-semibold">Two-Factor Authentication</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add an extra layer of security to your account using an authenticator app
          </p>
        </div>

        <div className="p-6">
          {step === 'status' && (
            <>
              <div className="flex items-center gap-4 mb-6">
                {profile?.twoFactorEnabled ? (
                  <>
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <ShieldCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-700">2FA is enabled</p>
                      <p className="text-sm text-muted-foreground">
                        Your account is protected with two-factor authentication
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <ShieldOff className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-amber-700">2FA is not enabled</p>
                      <p className="text-sm text-muted-foreground">
                        Enable two-factor authentication for enhanced security
                      </p>
                    </div>
                  </>
                )}
              </div>

              {profile?.twoFactorEnabled ? (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button
                      onClick={handleViewCodes}
                      className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                    >
                      <Eye className="h-4 w-4" />
                      View Recovery Codes
                    </button>

                    <button
                      onClick={() => setShowDisable(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <ShieldOff className="h-4 w-4" />
                      Disable 2FA
                    </button>
                  </div>

                  {/* Disable Confirmation */}
                  {showDisable && (
                    <form onSubmit={disableForm.handleSubmit(handleDisable)} className="mt-4 p-4 border rounded-lg bg-red-50/50">
                      <p className="text-sm font-medium mb-3">Enter your password to disable 2FA</p>
                      <FormField
                        id="disable-password"
                        label="Current Password"
                        required
                        error={disableForm.formState.errors.password?.message}
                      >
                        {(ariaProps) => (
                          <div className="relative mb-3">
                            <input
                              {...ariaProps}
                              type={showPassword ? 'text' : 'password'}
                              {...disableForm.register('password')}
                              placeholder="Current password"
                              className="w-full rounded-lg border px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        )}
                      </FormField>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={disableForm.formState.isSubmitting}
                          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {disableForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                          Confirm Disable
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowDisable(false); disableForm.reset(); }}
                          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Recovery Codes */}
                  {showCodes && recoveryCodes && (
                    <div className="mt-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium">Recovery Codes</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(recoveryCodes.join('\n'))}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </button>
                          <button
                            onClick={handleRegenerateCodes}
                            disabled={regenerating}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                          >
                            {regenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                            Regenerate
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {recoveryCodes.map((code) => (
                          <code key={code} className="block text-sm bg-muted px-3 py-1.5 rounded font-mono">
                            {code}
                          </code>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Store these codes in a safe place. Each code can only be used once.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleEnable}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Shield className="h-4 w-4" />
                  Enable Two-Factor Authentication
                </button>
              )}
            </>
          )}

          {/* Setup Step */}
          {step === 'setup' && setupData && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Step 1: Scan QR Code</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <div className="border rounded-lg p-6 bg-white inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.otpauthUrl)}`}
                    alt="2FA QR Code"
                    width={200}
                    height={200}
                  />
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Or enter this secret manually</h4>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-4 py-2 rounded font-mono text-sm break-all">
                    {setupData.secret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(setupData.secret)}
                    className="p-2 text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Recovery Codes</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Save these codes somewhere safe. You can use them to access your account if you lose your authenticator device.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {setupData.recoveryCodes.map((code) => (
                    <code key={code} className="block text-sm bg-muted px-3 py-1.5 rounded font-mono">
                      {code}
                    </code>
                  ))}
                </div>
                <button
                  onClick={() => copyToClipboard(setupData.recoveryCodes.join('\n'))}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3 w-3" />
                  Copy All
                </button>
              </div>

              <form onSubmit={confirmForm.handleSubmit(handleConfirm)}>
                <h4 className="font-medium mb-2">Step 2: Verify Code</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Enter the 6-digit code from your authenticator app to confirm setup
                </p>
                <div className="flex gap-3 items-start">
                  <FormField
                    id="confirm-code"
                    label="Verification Code"
                    required
                    error={confirmForm.formState.errors.code?.message}
                    className="sr-only-label"
                  >
                    {(ariaProps) => (
                      <input
                        {...ariaProps}
                        type="text"
                        {...confirmForm.register('code', {
                          onChange: (e) => {
                            const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                            confirmForm.setValue('code', cleaned);
                          },
                        })}
                        placeholder="000000"
                        className="w-40 rounded-lg border px-4 py-2 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
                        maxLength={6}
                      />
                    )}
                  </FormField>
                  <button
                    type="submit"
                    disabled={confirmForm.formState.isSubmitting || confirmForm.watch('code').length !== 6}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {confirmForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Verify & Enable
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep('status'); setSetupData(null); confirmForm.reset(); }}
                    className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
                {confirmForm.formState.errors.code && (
                  <p className="text-sm text-red-500 mt-1">{confirmForm.formState.errors.code.message}</p>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
