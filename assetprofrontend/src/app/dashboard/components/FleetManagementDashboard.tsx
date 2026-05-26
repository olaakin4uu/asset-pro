'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Car, Users, CalendarCheck, Wrench, Fuel, AlertTriangle,
  TrendingUp, Clock, CheckCircle, XCircle, Building2,
  ArrowRight, RefreshCw, MapPin, BarChart2, Plus,
} from 'lucide-react';
import { StatCard, StatCardColors, StatCardsGrid } from '@/components/erp';
import { useCompanyContext } from '@/stores/company-context';
import { useTenantStore } from '@/store/tenantStore';
import { pendingApprovalsApi } from '@/lib/api/approvals';
import {
  vehiclesApi,
  driversApi,
  tripsApi,
  vehicleBookingsApi,
  vehicleMaintenanceApi,
  fuelRecordsApi,
  fleetCostReportsApi,
} from '@/lib/api/fleet-management';
import { NotificationsFeed } from '@/components/dashboard/NotificationsFeed';
import { cn } from '@/lib/utils';

// ============================================================================
// HELPERS
// ============================================================================

function fmt(v: number | null | undefined, currency = true) {
  const n = v ?? 0;
  if (currency) return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return n.toLocaleString('en-NG');
}

function fmtShort(v: number | null | undefined) {
  const n = v ?? 0;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toFixed(0)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const bookingStatusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
  REJECTED: 'bg-red-100 text-red-600',
};

const tripStatusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

// ============================================================================
// WELCOME HERO
// ============================================================================

function WelcomeHero({ userName, companyName, loading }: { userName: string; companyName: string; loading?: boolean }) {
  const router = useRouter();
  const currentDate = useMemo(() => new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), []);

  const quickActions = [
    { label: 'New Booking', icon: CalendarCheck, href: '/fleet-management/bookings/create', color: 'bg-blue-500' },
    { label: 'New Trip', icon: MapPin, href: '/fleet-management/trips/create', color: 'bg-green-500' },
    { label: 'Log Fuel', icon: Fuel, href: '/fleet-management/fuel-records/create', color: 'bg-amber-500' },
    { label: 'Schedule Service', icon: Wrench, href: '/fleet-management/vehicle-maintenance/create', color: 'bg-purple-500' },
  ];

  return (
    <div className="welcome-hero p-5 md:p-6">
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {loading ? <div className="h-6 w-32 bg-primary/10 rounded-full animate-pulse" /> : (
              <>
                <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 border border-primary/20">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">{companyName}</span>
                </div>
                <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
                  Fleet Management
                </span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {userName.split(' ')[0]}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{currentDate}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => router.push(a.href)}
              className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-muted/50 transition-colors"
            >
              <span className={cn('flex h-4 w-4 items-center justify-center rounded', a.color)}>
                <a.icon className="h-2.5 w-2.5 text-white" />
              </span>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SECTION HEADER
// ============================================================================

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ============================================================================
// BOOKING STATUS DONUT
// ============================================================================

function BookingStatusDonut({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">No bookings yet</div>;

  const cx = 60, cy = 60, outerR = 52, innerR = 34;
  let angle = -Math.PI / 2;

  const slices = data.filter(d => d.value > 0).map((d) => {
    const pct = d.value / total;
    const sweep = pct * 2 * Math.PI;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    const largeArc = sweep > Math.PI ? 1 : 0;
    const ox1 = cx + outerR * Math.cos(start), oy1 = cy + outerR * Math.sin(start);
    const ox2 = cx + outerR * Math.cos(end), oy2 = cy + outerR * Math.sin(end);
    const ix1 = cx + innerR * Math.cos(end), iy1 = cy + innerR * Math.sin(end);
    const ix2 = cx + innerR * Math.cos(start), iy2 = cy + innerR * Math.sin(start);
    return {
      path: `M ${ox1} ${oy1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`,
      ...d, pct,
    };
  });

  return (
    <div className="flex items-center gap-4">
      <svg width={120} height={120} viewBox="0 0 120 120">
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} className="hover:opacity-80" />)}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-foreground font-bold" fontSize={14}>{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-muted-foreground" fontSize={8}>bookings</text>
      </svg>
      <div className="space-y-1 flex-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="flex-1 text-muted-foreground">{s.label}</span>
            <span className="font-mono font-medium">{s.value}</span>
            <span className="text-muted-foreground/60">({(s.pct * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// VEHICLE UTILISATION BAR
// ============================================================================

function UtilisationBar({ available, inUse, maintenance, total }: { available: number; inUse: number; maintenance: number; total: number }) {
  if (total === 0) return null;
  const pctInUse = (inUse / total) * 100;
  const pctMaint = (maintenance / total) * 100;
  const pctAvail = (available / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex gap-0.5 h-4 rounded-full overflow-hidden">
        <div className="bg-green-500 transition-all" style={{ width: `${pctInUse}%` }} title={`In use: ${inUse}`} />
        <div className="bg-amber-400 transition-all" style={{ width: `${pctMaint}%` }} title={`Maintenance: ${maintenance}`} />
        <div className="bg-muted transition-all" style={{ width: `${pctAvail}%` }} title={`Available: ${available}`} />
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> In use ({inUse})</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Maintenance ({maintenance})</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/30" /> Available ({available})</span>
      </div>
    </div>
  );
}

// ============================================================================
// PENDING APPROVALS CARD
// ============================================================================

function PendingApprovalsCard({ loading }: { loading: boolean }) {
  const router = useRouter();
  const { data: approvalStats, isLoading } = useQuery({
    queryKey: ['pending-approvals-stats'],
    queryFn: () => pendingApprovalsApi.getStats(),
    refetchInterval: 60000,
  });

  const isLoad = loading || isLoading;
  const total = (approvalStats as { total?: number } | undefined)?.total ?? 0;
  const byFlow = (approvalStats as { byFlow?: { flowName: string; approvableType: string; count: number }[] } | undefined)?.byFlow ?? [];

  return (
    <div className="rounded-xl border bg-card p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Approvals</h3>
        {total > 0 && (
          <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-bold">{total}</span>
        )}
      </div>
      {isLoad ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-8 rounded bg-muted/50 animate-pulse" />)}</div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-sm text-muted-foreground">
          <CheckCircle className="h-8 w-8 mb-2 text-green-500/50" />
          All caught up
        </div>
      ) : (
        <div className="space-y-1.5">
          {byFlow.slice(0, 6).map((flow, i) => (
            <button
              key={i}
              onClick={() => router.push('/approvals')}
              className="flex items-center justify-between w-full rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors text-left"
            >
              <span className="text-sm truncate">{flow.flowName}</span>
              <span className="ml-2 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-bold flex-shrink-0">{flow.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// RECENT BOOKINGS
// ============================================================================

function RecentBookings({ loading }: { loading?: boolean }) {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ['fleet-recent-bookings'],
    queryFn: () => vehicleBookingsApi.list({ limit: 8, page: 1 }),
    refetchInterval: 60000,
  });

  const bookings = (data as { data?: Record<string, unknown>[] } | undefined)?.data ?? [];

  if (loading) return <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-10 rounded bg-muted/50 animate-pulse" />)}</div>;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Bookings</h3>
        <Link href="/fleet-management/bookings" className="flex items-center gap-1 text-xs text-primary hover:underline">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {bookings.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">No bookings yet</div>
      ) : (
        <div className="divide-y">
          {bookings.map((b: Record<string, unknown>, i) => (
            <button
              key={i}
              onClick={() => router.push(`/fleet-management/bookings/${b.id}`)}
              className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-muted/30 transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <CalendarCheck className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{String(b.bookingReference ?? b.id)}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {String(b.vehicleName ?? b.vehicleId ?? '—')} · {String(b.customerName ?? '—')}
                </p>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0', bookingStatusColors[String(b.status)] ?? 'bg-gray-100 text-gray-600')}>
                {String(b.status ?? '—').replace('_', ' ')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ACTIVE TRIPS
// ============================================================================

function ActiveTrips({ loading }: { loading?: boolean }) {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ['fleet-active-trips'],
    queryFn: () => tripsApi.list({ status: 'IN_PROGRESS', limit: 6 }),
    refetchInterval: 30000,
  });

  const trips = (data as { data?: Record<string, unknown>[] } | undefined)?.data ?? [];

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded bg-muted/50 animate-pulse" />)}</div>;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Trips</h3>
          {trips.length > 0 && (
            <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-bold">{trips.length}</span>
          )}
        </div>
        <Link href="/fleet-management/trips" className="flex items-center gap-1 text-xs text-primary hover:underline">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {trips.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">No trips in progress</div>
      ) : (
        <div className="divide-y">
          {trips.map((t: Record<string, unknown>, i) => (
            <button
              key={i}
              onClick={() => router.push(`/fleet-management/trips/${t.id}`)}
              className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-muted/30 transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-3.5 w-3.5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{String(t.tripNumber ?? `Trip #${t.id}`)}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {String(t.vehicleName ?? t.vehicleId ?? '—')} · {String(t.driverName ?? '—')}
                </p>
              </div>
              <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-medium flex-shrink-0">
                In Progress
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAINTENANCE ALERTS
// ============================================================================

function MaintenanceAlerts({ loading }: { loading?: boolean }) {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ['fleet-maintenance-due'],
    queryFn: () => vehicleMaintenanceApi.list({ status: 'SCHEDULED', limit: 5 }),
    refetchInterval: 120000,
  });

  const items = (data as { data?: Record<string, unknown>[] } | undefined)?.data ?? [];

  if (loading || items.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5 text-amber-600" />
          <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Maintenance Due</h3>
          <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-bold">{items.length}</span>
        </div>
        <Link href="/fleet-management/vehicle-maintenance" className="flex items-center gap-1 text-xs text-amber-700 hover:underline">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="divide-y divide-amber-200/50">
        {items.map((m: Record<string, unknown>, i) => (
          <button
            key={i}
            onClick={() => router.push(`/fleet-management/vehicle-maintenance/${m.id}`)}
            className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-amber-100/50 transition-colors"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{String(m.vehicleName ?? m.vehicleId ?? '—')}</p>
              <p className="text-[10px] text-muted-foreground truncate">{String(m.serviceType ?? m.maintenanceType ?? '—')}</p>
            </div>
            {m.scheduledDate && (
              <span className="text-[10px] text-amber-600 flex-shrink-0">
                {new Date(String(m.scheduledDate)).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXPIRING LICENSES
// ============================================================================

function ExpiringLicenses({ expiringDrivers }: { expiringDrivers: { driverId: number; name: string; licenseNumber: string; daysUntilExpiry: number }[] }) {
  const router = useRouter();
  if (expiringDrivers.length === 0) return null;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-900/10 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-red-200">
        <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
        <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wider">Expiring Driver Licenses</h3>
        <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-bold">{expiringDrivers.length}</span>
      </div>
      <div className="divide-y divide-red-200/50">
        {expiringDrivers.slice(0, 4).map((d) => (
          <button
            key={d.driverId}
            onClick={() => router.push(`/fleet-management/drivers/${d.driverId}`)}
            className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-red-100/50 transition-colors"
          >
            <Users className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{d.name}</p>
              <p className="text-[10px] text-muted-foreground">{d.licenseNumber}</p>
            </div>
            <span className={cn('text-[10px] font-medium flex-shrink-0', d.daysUntilExpiry <= 7 ? 'text-red-600' : 'text-amber-600')}>
              {d.daysUntilExpiry <= 0 ? 'Expired' : `${d.daysUntilExpiry}d left`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// FLEET MANAGEMENT DASHBOARD
// ============================================================================

export default function FleetManagementDashboard() {
  const { company, companyName } = useCompanyContext();
  const user = useTenantStore((s) => s.user);
  const companyId = company?.id;

  // Vehicle summary
  const { data: vehicleSummary, isLoading: vLoading } = useQuery({
    queryKey: ['fleet-vehicle-summary', companyId],
    queryFn: () => vehiclesApi.getSummary(companyId!),
    enabled: !!companyId,
    refetchInterval: 60000,
  });

  // Driver summary
  const { data: driverSummary, isLoading: dLoading } = useQuery({
    queryKey: ['fleet-driver-summary', companyId],
    queryFn: () => driversApi.getSummary(companyId!),
    enabled: !!companyId,
    refetchInterval: 60000,
  });

  // Trip summary
  const { data: tripSummary, isLoading: tLoading } = useQuery({
    queryKey: ['fleet-trip-summary', companyId],
    queryFn: () => tripsApi.getSummary(companyId!),
    enabled: !!companyId,
    refetchInterval: 60000,
  });

  // Bookings — pending + approved today
  const { data: bookingsPending } = useQuery({
    queryKey: ['fleet-bookings-pending'],
    queryFn: () => vehicleBookingsApi.list({ status: 'PENDING', limit: 100 }),
    refetchInterval: 60000,
  });

  const { data: bookingsApproved } = useQuery({
    queryKey: ['fleet-bookings-approved'],
    queryFn: () => vehicleBookingsApi.list({ status: 'APPROVED', limit: 100 }),
    refetchInterval: 60000,
  });

  const { data: bookingsInProgress } = useQuery({
    queryKey: ['fleet-bookings-inprogress'],
    queryFn: () => vehicleBookingsApi.list({ status: 'IN_PROGRESS', limit: 100 }),
    refetchInterval: 60000,
  });

  // MTD trip costs
  const { data: mtdCosts } = useQuery({
    queryKey: ['fleet-mtd-costs', monthStart(), today()],
    queryFn: () => fleetCostReportsApi.tripCosts({ from: monthStart(), to: today() }),
    refetchInterval: 120000,
  });

  const vs = vehicleSummary as Record<string, unknown> | undefined;
  const ds = driverSummary as Record<string, unknown> | undefined;
  const ts = tripSummary as Record<string, unknown> | undefined;
  const costs = mtdCosts as { totals?: Record<string, unknown> } | undefined;
  const mtdRevenue = Number(costs?.totals?.totalCost ?? costs?.totals?.revenue ?? 0);

  const totalVehicles = Number(vs?.totalVehicles ?? vs?.total ?? 0);
  const activeVehicles = Number(vs?.activeVehicles ?? vs?.active ?? 0);
  const inMaintenanceVehicles = Number(vs?.inMaintenanceVehicles ?? vs?.inMaintenance ?? 0);
  const availableVehicles = Number(vs?.availableVehicles ?? Math.max(0, activeVehicles - Number(ts?.inProgressTrips ?? 0)));

  const pendingBookings = Number((bookingsPending as { total?: number } | undefined)?.total ?? (bookingsPending as { data?: unknown[] } | undefined)?.data?.length ?? 0);
  const approvedBookings = Number((bookingsApproved as { total?: number } | undefined)?.total ?? (bookingsApproved as { data?: unknown[] } | undefined)?.data?.length ?? 0);
  const inProgressBookings = Number((bookingsInProgress as { total?: number } | undefined)?.total ?? (bookingsInProgress as { data?: unknown[] } | undefined)?.data?.length ?? 0);
  const completedTrips = Number(ts?.completedTrips ?? 0);
  const totalTrips = Number(ts?.totalTrips ?? 0);

  const expiringDrivers = (ds?.expiringLicenses as { driverId: number; name: string; licenseNumber: string; daysUntilExpiry: number }[]) ?? [];

  const isLoading = vLoading || dLoading || tLoading;

  const userName = user?.name || 'User';

  const bookingDonutData = [
    { label: 'Pending', value: pendingBookings, color: '#f59e0b' },
    { label: 'Approved', value: approvedBookings, color: '#3b82f6' },
    { label: 'In Progress', value: inProgressBookings, color: '#22c55e' },
    { label: 'Completed', value: completedTrips, color: '#10b981' },
  ];

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <WelcomeHero userName={userName} companyName={companyName || 'Fleet'} loading={isLoading} />

      {/* Alerts */}
      <MaintenanceAlerts loading={isLoading} />
      <ExpiringLicenses expiringDrivers={expiringDrivers} />

      {/* KPI Stats */}
      <SectionHeader title="Fleet Overview" />
      <StatCardsGrid columns={4}>
        <StatCard
          title="Total Vehicles"
          value={isLoading ? '' : totalVehicles.toString()}
          icon={Car}
          color={StatCardColors.blue}
          loading={isLoading}
        />
        <StatCard
          title="Active Drivers"
          value={isLoading ? '' : Number(ds?.activeDrivers ?? 0).toString()}
          icon={Users}
          color={StatCardColors.green}
          loading={isLoading}
        />
        <StatCard
          title="Pending Bookings"
          value={isLoading ? '' : pendingBookings.toString()}
          icon={CalendarCheck}
          color={StatCardColors.amber}
          loading={isLoading}
        />
        <StatCard
          title="MTD Revenue"
          value={isLoading ? '' : fmtShort(mtdRevenue)}
          icon={TrendingUp}
          color={StatCardColors.purple}
          loading={isLoading}
        />
      </StatCardsGrid>

      <StatCardsGrid columns={4}>
        <StatCard
          title="Trips In Progress"
          value={isLoading ? '' : Number(ts?.inProgressTrips ?? 0).toString()}
          icon={MapPin}
          color={StatCardColors.green}
          loading={isLoading}
        />
        <StatCard
          title="Trips Completed (All)"
          value={isLoading ? '' : completedTrips.toString()}
          icon={CheckCircle}
          color={StatCardColors.blue}
          loading={isLoading}
        />
        <StatCard
          title="In Maintenance"
          value={isLoading ? '' : inMaintenanceVehicles.toString()}
          icon={Wrench}
          color={StatCardColors.red}
          loading={isLoading}
        />
        <StatCard
          title="Available Vehicles"
          value={isLoading ? '' : availableVehicles.toString()}
          icon={Car}
          color={StatCardColors.green}
          loading={isLoading}
        />
      </StatCardsGrid>

      {/* Vehicle utilisation */}
      {!isLoading && totalVehicles > 0 && (
        <>
          <SectionHeader title="Fleet Utilisation" />
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">{totalVehicles} vehicles total</span>
              <Link href="/fleet-management/vehicles" className="flex items-center gap-1 text-xs text-primary hover:underline">
                Manage fleet <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <UtilisationBar
              available={availableVehicles}
              inUse={inProgressBookings}
              maintenance={inMaintenanceVehicles}
              total={totalVehicles}
            />
          </div>
        </>
      )}

      {/* Booking status + Recent/Active */}
      <SectionHeader title="Bookings & Trips" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Booking donut */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booking Status</h3>
            <Link href="/fleet-management/bookings" className="flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {isLoading ? (
            <div className="h-32 bg-muted/50 rounded animate-pulse" />
          ) : (
            <BookingStatusDonut data={bookingDonutData} />
          )}
        </div>

        {/* Recent bookings */}
        <div className="lg:col-span-2">
          <RecentBookings loading={isLoading} />
        </div>
      </div>

      {/* Active trips */}
      <ActiveTrips loading={isLoading} />

      {/* Approvals + Notifications */}
      <SectionHeader title="Activity" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5">
          <PendingApprovalsCard loading={isLoading} />
        </div>
        <div className="lg:col-span-4">
          {/* Trip stats summary */}
          <div className="rounded-xl border bg-card p-4 h-full">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Trip Summary</h3>
            {isLoading ? (
              <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-6 rounded bg-muted/50 animate-pulse" />)}</div>
            ) : (
              <div className="space-y-2">
                {[
                  { label: 'Scheduled', value: Number(ts?.scheduledTrips ?? 0), color: 'bg-blue-500' },
                  { label: 'In Progress', value: Number(ts?.inProgressTrips ?? 0), color: 'bg-green-500' },
                  { label: 'Completed', value: Number(ts?.completedTrips ?? 0), color: 'bg-emerald-500' },
                  { label: 'Cancelled', value: Number(ts?.cancelledTrips ?? 0), color: 'bg-gray-400' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className={cn('h-2 w-2 rounded-full flex-shrink-0', row.color)} />
                    <span className="flex-1 text-sm text-muted-foreground">{row.label}</span>
                    <span className="font-mono text-sm font-medium">{row.value}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex items-center justify-between text-sm">
                  <span className="font-medium">Total</span>
                  <span className="font-mono font-bold">{totalTrips}</span>
                </div>
                <Link href="/fleet-management/trips" className="flex items-center gap-1 text-xs text-primary hover:underline pt-1">
                  View all trips <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
        <div className="lg:col-span-3">
          <NotificationsFeed />
        </div>
      </div>

      {/* Refresh indicator */}
      <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground pt-2">
        <RefreshCw className="h-3 w-3" />
        Auto-refreshes every minute
      </div>
    </div>
  );
}
