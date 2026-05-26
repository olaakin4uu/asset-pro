'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Users, FileText, Package, CheckCircle, ArrowRight, ArrowLeft, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { brand } from '@/lib/brand';

const steps = [
  {
    id: 'welcome',
    title: `Welcome to ${brand.appName}`,
    description: 'Let\'s get your business set up in a few quick steps.',
    icon: Sparkles,
    content: (
      <div className="text-center py-8">
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Your ERP is ready!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          We've set up your company with default settings, chart of accounts, and permissions.
          Follow these steps to customize your workspace.
        </p>
      </div>
    ),
    action: { label: 'Get Started', href: null },
  },
  {
    id: 'company',
    title: 'Company Profile',
    description: 'Add your company logo, address, and contact details.',
    icon: Building2,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Update your company information so it appears on invoices, purchase orders, and reports.</p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Upload company logo</li>
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-muted-foreground" /> Add business address</li>
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-muted-foreground" /> Set tax registration number</li>
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-muted-foreground" /> Configure default currency</li>
        </ul>
      </div>
    ),
    action: { label: 'Go to Company Settings', href: '/core/companies' },
  },
  {
    id: 'employees',
    title: 'Add Employees',
    description: 'Add your team members so they can log in and use the system.',
    icon: Users,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Each employee gets a user account with role-based access. Import from CSV for bulk setup.</p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-muted-foreground" /> Add employees individually or import CSV</li>
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-muted-foreground" /> Assign departments and positions</li>
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-muted-foreground" /> Create user accounts with login access</li>
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-muted-foreground" /> Assign roles and permissions</li>
        </ul>
      </div>
    ),
    action: { label: 'Go to Employees', href: '/hrpayroll/employees' },
  },
  {
    id: 'accounts',
    title: 'Chart of Accounts',
    description: 'Review your IFRS-compliant chart of accounts.',
    icon: FileText,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">We've seeded a standard IFRS chart of accounts. Customize it for your business needs.</p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> IFRS accounts pre-loaded</li>
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> VAT and WHT rates configured</li>
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-muted-foreground" /> Add custom accounts for your industry</li>
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-muted-foreground" /> Set up bank accounts</li>
        </ul>
      </div>
    ),
    action: { label: 'Go to Chart of Accounts', href: '/accounts/chart-of-accounts' },
  },
  {
    id: 'inventory',
    title: 'Inventory Setup',
    description: 'Add your products, set up warehouses, and import items.',
    icon: Package,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Set up your inventory to start tracking stock, prices, and movements.</p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Default warehouse created</li>
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-muted-foreground" /> Add inventory items or import from CSV</li>
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-muted-foreground" /> Set up item categories and brands</li>
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-muted-foreground" /> Configure pricing and units of measure</li>
        </ul>
      </div>
    ),
    action: { label: 'Go to Inventory', href: '/inventory/items' },
  },
  {
    id: 'done',
    title: 'You\'re All Set!',
    description: 'Your workspace is configured. Start using AssetPro.',
    icon: CheckCircle,
    content: (
      <div className="text-center py-8">
        <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Setup Complete!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          You can always come back to these settings later. Explore the dashboard to see your business overview.
        </p>
      </div>
    ),
    action: { label: 'Go to Dashboard', href: '/dashboard' },
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const Icon = step.icon;

  const handleAction = () => {
    if (step.action.href) {
      // Mark onboarding as seen
      try { localStorage.setItem('assetpro_onboarding_complete', 'true'); } catch {}
      router.push(step.action.href);
    } else {
      setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
    }
  };

  const handleSkip = () => {
    try { localStorage.setItem('assetpro_onboarding_complete', 'true'); } catch {}
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center gap-1 mb-8 px-4">
          {steps.map((_, i) => (
            <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-all', i <= currentStep ? 'bg-primary' : 'bg-muted')} />
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{step.title}</h1>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">{currentStep + 1} of {steps.length}</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">{step.content}</div>

          {/* Actions */}
          <div className="p-6 border-t bg-muted/20 flex items-center justify-between">
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button onClick={() => setCurrentStep((s) => s - 1)}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              )}
              {currentStep < steps.length - 1 && (
                <button onClick={handleSkip} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Skip Setup
                </button>
              )}
            </div>
            <button onClick={handleAction}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              {step.action.label}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
