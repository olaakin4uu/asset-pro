'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp';
import { Settings, User, Lock, PenTool, Shield, Palette } from 'lucide-react';

const settingsTabs = [
  { href: '/settings/profile', label: 'Profile', icon: User },
  { href: '/settings/password', label: 'Password', icon: Lock },
  { href: '/settings/signature', label: 'Signature', icon: PenTool },
  { href: '/settings/security', label: 'Security', icon: Shield },
  { href: '/settings/appearance', label: 'Appearance', icon: Palette },
];

const breadcrumbs = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Settings' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Settings}
        title="Account Settings"
        description="Manage your profile, security, and preferences"
        {...PageHeaderPresets.core}
      />

      <div>
        {/* Tab Navigation */}
        <div className="border-b mb-6">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {settingsTabs.map((tab) => {
              const isActive = pathname === tab.href;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`
                    inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                    ${isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Page Content */}
        {children}
      </div>
    </TenantLayout>
  );
}
