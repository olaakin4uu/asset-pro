'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import PublicLayout from '@/components/layout/PublicLayout';
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Globe,
  User,
  Mail,
  Phone,
  Lock,
  Building,
  Sparkles,
  ExternalLink,
  Shield,
  Clock,
  Zap,
  RefreshCw,
  Package,
  ChevronRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface SelectedPlan {
  id: number;
  name: string;
  slug: string;
  trial_days: number;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  included_modules: string[];
  max_users: number | null;
  max_companies: number | null;
}

interface FormData {
  company_name: string;
  subdomain: string;
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  password: string;
  password_confirmation: string;
  terms_accepted: boolean;
  plan_slug: string;
}

interface FormErrors {
  [key: string]: string;
}

// Fallback plans (used while API loads or if API fails)
const fallbackPlans: Record<string, SelectedPlan> = {
  starter: { id: 1, name: 'Starter', slug: 'starter', trial_days: 14, price_monthly: 25000, price_yearly: 250000, features: ['Up to 5 users', 'Basic financial management'], included_modules: ['Finance', 'HR'], max_users: 5, max_companies: 1 },
  standard: { id: 2, name: 'Standard', slug: 'standard', trial_days: 30, price_monthly: 75000, price_yearly: 750000, features: ['Up to 25 users', 'Full financial suite', 'Inventory'], included_modules: ['Finance', 'HR', 'Inventory'], max_users: 25, max_companies: 3 },
  enterprise: { id: 3, name: 'Enterprise', slug: 'enterprise', trial_days: 30, price_monthly: 150000, price_yearly: 1500000, features: ['Unlimited users', 'All modules', 'Dedicated support'], included_modules: ['All modules'], max_users: null, max_companies: null },
};

// Progress steps
const progressSteps = [
  { threshold: 10, label: 'Creating organization' },
  { threshold: 20, label: 'Setting up database' },
  { threshold: 35, label: 'Configuring company' },
  { threshold: 50, label: 'Setting up accounting' },
  { threshold: 70, label: 'Configuring taxes' },
  { threshold: 85, label: 'Setting up inventory' },
  { threshold: 95, label: 'Finalizing setup' },
  { threshold: 100, label: 'Complete!' },
];

const DOMAIN_SUFFIX = process.env.NEXT_PUBLIC_DOMAIN_SUFFIX || 'salvage.test';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api/v1';

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const planSlug = searchParams.get('plan') || 'standard';

  // Dynamic plans from API
  const [availablePlans, setAvailablePlans] = useState<Record<string, SelectedPlan>>(fallbackPlans);
  useEffect(() => {
    fetch(`${API_BASE_URL.replace('/api/v1', '')}/public/plans`).then((r) => r.json()).then((plans: Array<Record<string, unknown>>) => {
      if (!Array.isArray(plans) || plans.length === 0) return;
      const mapped: Record<string, SelectedPlan> = {};
      for (const p of plans) {
        const slug = (p.slug as string) || '';
        mapped[slug] = {
          id: p.id as number,
          name: p.name as string,
          slug,
          trial_days: (p.trialDays as number) || 14,
          price_monthly: Number(p.priceMonthly) || 0,
          price_yearly: Number(p.priceYearly) || 0,
          features: (p.features as string[]) || [],
          included_modules: ((p.modules as Array<Record<string, unknown>>) || []).filter((m) => m.inclusionType === 'included').map((m) => (m.module as Record<string, string>)?.name || ''),
          max_users: (p.limits as Record<string, number>)?.maxUsers ?? null,
          max_companies: (p.limits as Record<string, number>)?.maxCompanies ?? null,
        };
      }
      if (Object.keys(mapped).length > 0) setAvailablePlans(mapped);
    }).catch(() => {}); // Silently fall back to hardcoded
  }, []);

  // Form state
  const [form, setForm] = useState<FormData>({
    company_name: '',
    subdomain: '',
    admin_name: '',
    admin_email: '',
    admin_phone: '',
    password: '',
    password_confirmation: '',
    terms_accepted: false,
    plan_slug: planSlug,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Subdomain checking
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [subdomainMessage, setSubdomainMessage] = useState('');

  // Email checking
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailMessage, setEmailMessage] = useState('');

  // Company name checking
  const [isCheckingCompany, setIsCheckingCompany] = useState(false);
  const [companyAvailable, setCompanyAvailable] = useState<boolean | null>(null);
  const [companyMessage, setCompanyMessage] = useState('');

  // Registration state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [registrationProgress, setRegistrationProgress] = useState(0);
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [registrationError, setRegistrationError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);

  const selectedPlan = availablePlans[form.plan_slug] || availablePlans.standard;
  const trialDays = selectedPlan?.trial_days || 30;

  const fullDomain = form.subdomain ? form.subdomain.toLowerCase() + '.' + DOMAIN_SUFFIX : '';

  const currentStep = progressSteps.reduce(
    (acc, step) => (registrationProgress >= step.threshold ? step : acc),
    progressSteps[0]
  );

  // Format price helper
  const formatPrice = (price: number) => {
    return formatCurrency(price);
  };

  // Debounced subdomain check
  useEffect(() => {
    if (!form.subdomain || form.subdomain.length < 3) {
      setSubdomainAvailable(null);
      setSubdomainMessage('');
      return;
    }

    setIsCheckingSubdomain(true);
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/register/check-subdomain?subdomain=${encodeURIComponent(form.subdomain)}`
        );
        const data = await response.json();
        setSubdomainAvailable(data.available);
        setSubdomainMessage(data.message);
      } catch {
        setSubdomainAvailable(null);
        setSubdomainMessage('Unable to check availability');
      } finally {
        setIsCheckingSubdomain(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [form.subdomain]);

  // Debounced email check
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.admin_email || !emailRegex.test(form.admin_email)) {
      setEmailAvailable(null);
      setEmailMessage('');
      return;
    }

    setIsCheckingEmail(true);
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/register/check-email?email=${encodeURIComponent(form.admin_email)}`
        );
        const data = await response.json();
        setEmailAvailable(data.available);
        setEmailMessage(data.message);
      } catch {
        setEmailAvailable(null);
        setEmailMessage('Unable to check availability');
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [form.admin_email]);

  // Debounced company name check
  useEffect(() => {
    if (!form.company_name || form.company_name.length < 2) {
      setCompanyAvailable(null);
      setCompanyMessage('');
      return;
    }

    setIsCheckingCompany(true);
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/register/check-company?company_name=${encodeURIComponent(form.company_name)}`
        );
        const data = await response.json();
        setCompanyAvailable(data.available);
        setCompanyMessage(data.message);
      } catch {
        setCompanyAvailable(null);
        setCompanyMessage('Unable to check availability');
      } finally {
        setIsCheckingCompany(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [form.company_name]);

  // Form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!form.company_name || form.company_name.length < 2) {
      newErrors.company_name = 'Company name must be at least 2 characters';
    } else if (companyAvailable === false) {
      newErrors.company_name = companyMessage;
    }

    if (!form.subdomain || form.subdomain.length < 3) {
      newErrors.subdomain = 'Subdomain must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(form.subdomain)) {
      newErrors.subdomain = 'Subdomain can only contain letters, numbers, dashes, and underscores';
    } else if (subdomainAvailable === false) {
      newErrors.subdomain = subdomainMessage;
    }

    if (!form.admin_name || form.admin_name.length < 2) {
      newErrors.admin_name = 'Administrator name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.admin_email || !emailRegex.test(form.admin_email)) {
      newErrors.admin_email = 'Please enter a valid email address';
    } else if (emailAvailable === false) {
      newErrors.admin_email = emailMessage;
    }

    if (!form.password || form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and numbers';
    }

    if (form.password !== form.password_confirmation) {
      newErrors.password_confirmation = 'Passwords do not match';
    }

    if (!form.terms_accepted) {
      newErrors.terms_accepted = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form, companyAvailable, companyMessage, subdomainAvailable, subdomainMessage, emailAvailable, emailMessage]);

  // Poll for progress
  const pollProgress = useCallback(async (regId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/register/status?registration_id=${regId}`);
      const data = await response.json();

      setRegistrationProgress(data.progress || 0);
      setRegistrationMessage(data.message || '');

      if (data.status === 'completed') {
        setRegistrationComplete(true);
        setRedirectUrl(data.redirect_url || `https://${form.subdomain}.${DOMAIN_SUFFIX}/auth/login`);
        setIsSubmitting(false);
      } else if (data.status === 'failed') {
        setRegistrationError(data.message || 'Setup failed');
        setIsSubmitting(false);
      } else {
        setTimeout(() => pollProgress(regId), 1000);
      }
    } catch {
      setTimeout(() => pollProgress(regId), 2000);
    }
  }, [form.subdomain]);

  // Submit registration
  const submitRegistration = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setRegistrationError('');
    setSessionExpired(false);
    setRegistrationProgress(5);
    setRegistrationMessage('Initializing registration...');

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      if (response.status === 419) {
        setSessionExpired(true);
        setRegistrationError('Your session has expired. Please refresh the page and try again.');
        setIsSubmitting(false);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
        }
        throw new Error(data.message || 'Registration failed');
      }

      setRegistrationId(data.registration_id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      pollProgress(data.registration_id);
    } catch (error) {
      setRegistrationError(error instanceof Error ? error.message : 'Registration failed');
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubdomainChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    handleInputChange('subdomain', sanitized);
  };

  const refreshPage = () => {
    window.location.reload();
  };

  const resetRegistration = () => {
    setRegistrationId(null);
    setRegistrationError('');
  };

  // Benefits to show
  const benefits = [
    {
      icon: Shield,
      title: 'IFRS Compliant',
      description: 'Built for Nigerian business standards',
    },
    {
      icon: Clock,
      title: 'Setup in Minutes',
      description: 'Your workspace ready instantly',
    },
    {
      icon: Zap,
      title: `${trialDays}-Day Free Trial`,
      description: 'Full access, no credit card needed',
    },
  ];

  const validationChecks = {
    notCheckingSubdomain: !isCheckingSubdomain,
    notCheckingEmail: !isCheckingEmail,
    notCheckingCompany: !isCheckingCompany,
    subdomainOk: subdomainAvailable !== false,
    emailOk: emailAvailable !== false,
    companyOk: companyAvailable !== false,
    companyNameLength: form.company_name.length >= 2,
    subdomainLength: form.subdomain.length >= 3,
    adminNameLength: form.admin_name.length >= 2,
    emailValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.admin_email),
    passwordLength: form.password.length >= 8,
    passwordsMatch: form.password === form.password_confirmation,
    termsAccepted: form.terms_accepted,
  };

  const isFormValid = Object.values(validationChecks).every(Boolean);

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            {/* Left Column - Benefits */}
            <div className="lg:sticky lg:top-32">
              <div className="mb-8">
                <h1 className="mb-4 text-4xl font-bold text-slate-900">Transform Your Business Today</h1>
                <p className="text-xl text-slate-600">
                  Join hundreds of Nigerian businesses already using AssetPro to streamline operations and drive
                  growth.
                </p>
              </div>

              <div className="mb-8 space-y-6">
                {benefits.map((benefit) => {
                  const Icon = benefit.icon;
                  return (
                    <div
                      key={benefit.title}
                      className="flex items-start gap-4 rounded-xl bg-white/50 p-4 backdrop-blur-sm"
                    >
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{benefit.title}</h3>
                        <p className="text-slate-600">{benefit.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg bg-white/50 p-4">
                  <div className="text-2xl font-bold text-blue-600">500+</div>
                  <div className="text-sm text-slate-600">Active Companies</div>
                </div>
                <div className="rounded-lg bg-white/50 p-4">
                  <div className="text-2xl font-bold text-blue-600">99.9%</div>
                  <div className="text-sm text-slate-600">Uptime</div>
                </div>
                <div className="rounded-lg bg-white/50 p-4">
                  <div className="text-2xl font-bold text-blue-600">24/7</div>
                  <div className="text-sm text-slate-600">Support</div>
                </div>
              </div>
            </div>

            {/* Right Column - Form */}
            <div>
              {/* Registration Form */}
              {!registrationId ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
                  <div className="mb-6 text-center">
                    <div className="mb-4 inline-flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 p-3">
                      <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="mb-2 text-3xl font-bold text-slate-900">Start Your Free Trial</h2>
                    <p className="text-slate-600">Create your organization and start managing your business</p>
                  </div>

                  {/* Selected Plan Confirmation */}
                  {selectedPlan && (
                    <div className="mb-6 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 rounded-lg bg-blue-600 p-2">
                            <Package className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-blue-900">{selectedPlan.name} Plan</h3>
                            <p className="text-sm text-blue-700">
                              {trialDays}-day free trial, then {formatPrice(selectedPlan.price_monthly)}/month
                            </p>
                            {selectedPlan.features && selectedPlan.features.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {selectedPlan.features.slice(0, 3).map((feature) => (
                                  <span
                                    key={feature}
                                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    {feature}
                                  </span>
                                ))}
                                {selectedPlan.features.length > 3 && (
                                  <span className="text-xs text-blue-600">
                                    +{selectedPlan.features.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <Link
                          href="/pricing"
                          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          Change
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  )}

                  <form onSubmit={(e) => { e.preventDefault(); submitRegistration(); }} className="space-y-6">
                    {/* Company Name */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Building className="h-4 w-4" />
                        Company Name
                      </label>
                      <div className="relative">
                        <InputText
                          value={form.company_name}
                          onChange={(e) => handleInputChange('company_name', e.target.value)}
                          placeholder="Enter your company name"
                          className={`h-12 w-full pr-10 ${errors.company_name ? 'p-invalid' : ''}`}
                          disabled={isSubmitting}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isCheckingCompany && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
                          {!isCheckingCompany && companyAvailable === true && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                          {!isCheckingCompany && companyAvailable === false && (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </div>
                      {companyMessage && !errors.company_name && (
                        <p className={`mt-1 text-sm ${companyAvailable ? 'text-green-500' : 'text-red-500'}`}>
                          {companyMessage}
                        </p>
                      )}
                      {errors.company_name && <small className="text-red-500">{errors.company_name}</small>}
                    </div>

                    {/* Subdomain */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Globe className="h-4 w-4" />
                        Choose Your Subdomain
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <InputText
                            value={form.subdomain}
                            onChange={(e) => handleSubdomainChange(e.target.value)}
                            placeholder="yourcompany"
                            className={`h-12 w-full pr-10 ${errors.subdomain ? 'p-invalid' : ''}`}
                            disabled={isSubmitting}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isCheckingSubdomain && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
                            {!isCheckingSubdomain && subdomainAvailable === true && (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            )}
                            {!isCheckingSubdomain && subdomainAvailable === false && (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                        </div>
                        <span className="whitespace-nowrap rounded-lg bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600">
                          {DOMAIN_SUFFIX}
                        </span>
                      </div>
                      {fullDomain && (
                        <p className="mt-2 text-sm text-slate-500">
                          Your URL: <span className="font-medium text-blue-600">{fullDomain}</span>
                        </p>
                      )}
                      {subdomainMessage && !errors.subdomain && (
                        <p className={`mt-1 text-sm ${subdomainAvailable ? 'text-green-500' : 'text-red-500'}`}>
                          {subdomainMessage}
                        </p>
                      )}
                      {errors.subdomain && <small className="text-red-500">{errors.subdomain}</small>}
                    </div>

                    {/* Admin Name */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <User className="h-4 w-4" />
                        Administrator Name
                      </label>
                      <InputText
                        value={form.admin_name}
                        onChange={(e) => handleInputChange('admin_name', e.target.value)}
                        placeholder="Your full name"
                        className={`h-12 w-full ${errors.admin_name ? 'p-invalid' : ''}`}
                        disabled={isSubmitting}
                      />
                      {errors.admin_name && <small className="text-red-500">{errors.admin_name}</small>}
                    </div>

                    {/* Admin Email */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Mail className="h-4 w-4" />
                        Administrator Email
                      </label>
                      <div className="relative">
                        <InputText
                          value={form.admin_email}
                          onChange={(e) => handleInputChange('admin_email', e.target.value)}
                          type="email"
                          placeholder="admin@company.com"
                          className={`h-12 w-full pr-10 ${errors.admin_email ? 'p-invalid' : ''}`}
                          disabled={isSubmitting}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isCheckingEmail && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
                          {!isCheckingEmail && emailAvailable === true && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                          {!isCheckingEmail && emailAvailable === false && (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </div>
                      {emailMessage && !errors.admin_email && (
                        <p className={`mt-1 text-sm ${emailAvailable ? 'text-green-500' : 'text-red-500'}`}>
                          {emailMessage}
                        </p>
                      )}
                      {errors.admin_email && <small className="text-red-500">{errors.admin_email}</small>}
                    </div>

                    {/* Admin Phone */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Phone className="h-4 w-4" />
                        Phone Number <span className="text-slate-400">(optional)</span>
                      </label>
                      <InputText
                        value={form.admin_phone}
                        onChange={(e) => handleInputChange('admin_phone', e.target.value)}
                        type="tel"
                        placeholder="+234 800 000 0000"
                        className="h-12 w-full"
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Password Fields */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Lock className="h-4 w-4" />
                          Password
                        </label>
                        <div className="relative">
                          <InputText
                            value={form.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Create password"
                            className={`h-12 w-full pr-10 ${errors.password ? 'p-invalid' : ''}`}
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {errors.password && <small className="text-red-500">{errors.password}</small>}
                      </div>
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Lock className="h-4 w-4" />
                          Confirm Password
                        </label>
                        <div className="relative">
                          <InputText
                            value={form.password_confirmation}
                            onChange={(e) => handleInputChange('password_confirmation', e.target.value)}
                            type={showPasswordConfirm ? 'text' : 'password'}
                            placeholder="Confirm password"
                            className={`h-12 w-full pr-10 ${errors.password_confirmation ? 'p-invalid' : ''}`}
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPasswordConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {errors.password_confirmation && (
                          <small className="text-red-500">{errors.password_confirmation}</small>
                        )}
                      </div>
                    </div>

                    {/* Terms */}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        inputId="terms"
                        checked={form.terms_accepted}
                        onChange={(e) => handleInputChange('terms_accepted', e.checked ?? false)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="terms" className="cursor-pointer text-sm text-slate-600">
                        I agree to the{' '}
                        <Link href="/terms" className="text-blue-600 hover:underline">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-blue-600 hover:underline">
                          Privacy Policy
                        </Link>
                      </label>
                    </div>
                    {errors.terms_accepted && <small className="text-red-500">{errors.terms_accepted}</small>}

                    {/* Error Message */}
                    {registrationError && (
                      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 flex-shrink-0" />
                          <span>{registrationError}</span>
                        </div>
                        {sessionExpired && (
                          <button
                            type="button"
                            onClick={refreshPage}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Refresh Page
                          </button>
                        )}
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isSubmitting || !isFormValid}
                      className="flex h-14 w-full items-center justify-center gap-2 border-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-lg"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          Create My Organization
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </Button>

                    {/* Login Link */}
                    <div className="text-center text-sm text-slate-600">
                      Already have an account?{' '}
                      <Link href="/auth/login" className="font-medium text-blue-600 hover:underline">
                        Sign in
                      </Link>
                    </div>
                  </form>
                </div>
              ) : (
                /* Progress View */
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
                  <div className="text-center">
                    {/* Success State */}
                    {registrationComplete ? (
                      <div className="relative">
                        <div className="mb-6 inline-flex items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 p-5 shadow-lg shadow-green-500/30">
                          <CheckCircle2 className="h-14 w-14 text-white" />
                        </div>
                        <h2 className="mb-3 text-3xl font-bold text-slate-900">Congratulations!</h2>
                        <p className="mb-2 text-xl text-slate-700">Your organization is ready to use</p>
                        <p className="mb-6 text-slate-500">
                          We&apos;ve sent a welcome email to{' '}
                          <span className="font-medium text-blue-600">{form.admin_email}</span> with your login details.
                        </p>

                        {/* Tenant URL Card */}
                        <div className="mb-8 rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6">
                          <p className="mb-2 text-sm font-medium text-green-700">Your Workspace URL</p>
                          <p className="mb-1 text-2xl font-bold text-green-800">{fullDomain}</p>
                          <p className="text-sm text-green-600">Bookmark this URL to access your account anytime</p>
                        </div>

                        {/* What's Next Section */}
                        <div className="mb-8 text-left">
                          <h3 className="mb-4 text-center text-lg font-semibold text-slate-900">What&apos;s Next?</h3>
                          <div className="space-y-3">
                            {[
                              'Click the button below to go to your login page',
                              'Login with your email and the password you created',
                              'Start exploring your new ERP system',
                            ].map((step, index) => (
                              <div key={index} className="flex items-start gap-3">
                                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                                  {index + 1}
                                </div>
                                <p className="text-sm text-slate-600">{step}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Login Button */}
                        <a
                          href={redirectUrl}
                          className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/40"
                        >
                          <ExternalLink className="h-5 w-5" />
                          Login to Your Account
                        </a>

                        <p className="mt-4 text-sm text-slate-500">
                          Your {trialDays}-day free trial has started. Enjoy!
                        </p>
                      </div>
                    ) : registrationError ? (
                      /* Error State */
                      <>
                        <div className="mb-6 inline-flex items-center justify-center rounded-full bg-red-100 p-4">
                          <AlertCircle className="h-12 w-12 text-red-500" />
                        </div>
                        <h2 className="mb-2 text-2xl font-bold text-slate-900">Setup Failed</h2>
                        <p className="mb-6 text-slate-600">{registrationError}</p>
                        <button
                          onClick={resetRegistration}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition-all hover:bg-slate-50"
                        >
                          Try Again
                        </button>
                      </>
                    ) : (
                      /* Progress State */
                      <>
                        <div className="mb-6 inline-flex items-center justify-center rounded-full bg-blue-100 p-4">
                          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                        </div>
                        <h2 className="mb-2 text-2xl font-bold text-slate-900">Setting Up Your Organization</h2>
                        <p className="mb-8 text-slate-600">
                          {registrationMessage || 'Please wait while we prepare your workspace...'}
                        </p>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-700">{currentStep.label}</span>
                            <span className="text-slate-500">{registrationProgress}%</span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                              style={{ width: `${registrationProgress}%` }}
                            />
                          </div>
                        </div>

                        {/* Progress Steps */}
                        <div className="mt-8 grid grid-cols-4 gap-2">
                          {progressSteps.slice(0, 8).map((step, index) => (
                            <div key={index} className="text-center">
                              <div
                                className={`mx-auto mb-1 h-2 w-2 rounded-full transition-all ${
                                  registrationProgress >= step.threshold
                                    ? 'bg-green-500'
                                    : registrationProgress >= step.threshold - 10
                                      ? 'animate-pulse bg-blue-500'
                                      : 'bg-slate-300'
                                }`}
                              />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

function RegisterPageFallback() {
  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-8 shadow-xl w-full max-w-xl">
              <div className="h-8 bg-slate-200 rounded w-3/4 mx-auto mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto mb-8"></div>
              <div className="space-y-4">
                <div className="h-12 bg-slate-200 rounded"></div>
                <div className="h-12 bg-slate-200 rounded"></div>
                <div className="h-12 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterPageFallback />}>
      <RegisterPageContent />
    </Suspense>
  );
}
