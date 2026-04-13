'use client';

import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';

interface KPIData {
  workforce: {
    totalEmployees: number;
    activeEmployees: number;
    pendingEmployees: number;
    pastEmployees: number;
    byRole: {
      rider: number;
      supervisor: number;
      manager: number;
      hr: number;
    };
    recentHires: number;
  };
  assets: {
    totalAssets: number;
    available: number;
    assigned: number;
    maintenance: number;
    retired: number;
    utilizationRate: number;
  };
  financial: {
    totalInvoices: number;
    totalRevenue: number;
    paidInvoices: number;
    pendingInvoices: number;
    paidAmount: number;
    pendingAmount: number;
  };
  training: {
    totalAssignments: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    completionRate: number;
  };
  coaching: {
    total: number;
    completed: number;
    pending: number;
    byType: {
      performance: number;
      behavior: number;
      development: number;
      recognition: number;
    };
  };
  performance: {
    total: number;
    open: number;
    resolved: number;
    warnings: number;
    commendations: number;
    critical: number;
  };
  operations: {
    platformAssignments: number;
    activeAssignments: number;
    pendingLeaves: number;
    approvedLeaves: number;
  };
}

interface KPIDashboardProps {
  data: KPIData;
}

// Icons
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function CubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

function CurrencyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AcademicCapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  );
}

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.285z" />
    </svg>
  );
}

function RocketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  );
}

function TrendUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}

function TrendDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
    </svg>
  );
}

/**
 * Simple progress bar component
 */
function ProgressBar({ value, max, color = 'bg-primary' }: { value: number; max: number; color?: string }) {
  const percentage = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-background-subtle overflow-hidden">
      <div 
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

/**
 * Ring chart component for simple visualizations
 */
function RingChart({ 
  segments, 
  size = 120,
  strokeWidth = 12,
}: { 
  segments: Array<{ value: number; color: string; label: string }>;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  
  let cumulativeOffset = 0;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--background-subtle)"
          strokeWidth={strokeWidth}
        />
        {/* Segments */}
        {total > 0 && segments.map((segment, i) => {
          const segmentLength = (segment.value / total) * circumference;
          const offset = cumulativeOffset;
          cumulativeOffset += segmentLength;
          
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
              strokeDashoffset={-offset}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-heading">{total}</span>
        <span className="text-xs text-muted">Total</span>
      </div>
    </div>
  );
}

/**
 * KPI stat card with optional trend indicator
 */
function StatCard({ 
  label, 
  value, 
  icon: Icon,
  color = 'bg-primary/10 text-primary',
  subValue,
  trend,
}: { 
  label: string; 
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  subValue?: string;
  trend?: 'up' | 'down' | null;
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color.split(' ')[0]}`}>
        <Icon className={`h-6 w-6 ${color.split(' ')[1]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted truncate">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-heading">{value}</span>
          {trend && (
            trend === 'up' 
              ? <TrendUpIcon className="h-4 w-4 text-green-600" />
              : <TrendDownIcon className="h-4 w-4 text-red-600" />
          )}
        </div>
        {subValue && (
          <p className="text-xs text-muted">{subValue}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-BH', {
    style: 'currency',
    currency: 'BHD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Operations KPI Dashboard Component
 */
export function KPIDashboard({ data }: KPIDashboardProps) {
  const { workforce, assets, financial, training, coaching, performance, operations } = data;

  return (
    <div className="space-y-8">
      {/* Top Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Employees"
          value={workforce.activeEmployees}
          icon={UsersIcon}
          color="bg-blue-100 text-blue-600"
          subValue={`${workforce.totalEmployees} total`}
        />
        <StatCard
          label="Asset Utilization"
          value={`${assets.utilizationRate}%`}
          icon={CubeIcon}
          color="bg-purple-100 text-purple-600"
          subValue={`${assets.assigned} of ${assets.assigned + assets.available} in use`}
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(financial.totalRevenue)}
          icon={CurrencyIcon}
          color="bg-green-100 text-green-600"
          subValue={`${financial.paidInvoices} paid invoices`}
        />
        <StatCard
          label="Training Completion"
          value={`${training.completionRate}%`}
          icon={AcademicCapIcon}
          color="bg-amber-100 text-amber-600"
          subValue={`${training.completed} of ${training.totalAssignments} completed`}
        />
      </div>

      {/* Workforce & HR Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Workforce Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <UsersIcon className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-base">Workforce Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <RingChart
                segments={[
                  { value: workforce.activeEmployees, color: '#22c55e', label: 'Active' },
                  { value: workforce.pendingEmployees, color: '#eab308', label: 'Pending' },
                  { value: workforce.pastEmployees, color: '#94a3b8', label: 'Past' },
                ]}
              />
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm text-heading">Active</span>
                  </div>
                  <span className="font-medium text-heading">{workforce.activeEmployees}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span className="text-sm text-heading">Pending</span>
                  </div>
                  <span className="font-medium text-heading">{workforce.pendingEmployees}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-slate-400" />
                    <span className="text-sm text-heading">Past</span>
                  </div>
                  <span className="font-medium text-heading">{workforce.pastEmployees}</span>
                </div>
              </div>
            </div>
            {workforce.recentHires > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <Badge className="bg-green-100 text-green-800">
                  {workforce.recentHires} new hire{workforce.recentHires !== 1 ? 's' : ''} in last 30 days
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Roles Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                <RocketIcon className="h-5 w-5 text-indigo-600" />
              </div>
              <CardTitle className="text-base">Headcount by Role</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Riders', value: workforce.byRole.rider, color: 'bg-blue-500' },
              { label: 'Supervisors', value: workforce.byRole.supervisor, color: 'bg-purple-500' },
              { label: 'Managers', value: workforce.byRole.manager, color: 'bg-amber-500' },
              { label: 'HR', value: workforce.byRole.hr, color: 'bg-green-500' },
            ].map((role) => (
              <div key={role.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-heading">{role.label}</span>
                  <span className="font-medium text-heading">{role.value}</span>
                </div>
                <ProgressBar value={role.value} max={workforce.totalEmployees || 1} color={role.color} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Assets & Financial Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Asset Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <CubeIcon className="h-5 w-5 text-purple-600" />
              </div>
              <CardTitle className="text-base">Asset Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <RingChart
                segments={[
                  { value: assets.assigned, color: '#3b82f6', label: 'Assigned' },
                  { value: assets.available, color: '#22c55e', label: 'Available' },
                  { value: assets.maintenance, color: '#eab308', label: 'Maintenance' },
                  { value: assets.retired, color: '#94a3b8', label: 'Retired' },
                ]}
              />
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-heading">Assigned</span>
                  </div>
                  <span className="font-medium text-heading">{assets.assigned}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm text-heading">Available</span>
                  </div>
                  <span className="font-medium text-heading">{assets.available}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span className="text-sm text-heading">Maintenance</span>
                  </div>
                  <span className="font-medium text-heading">{assets.maintenance}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-slate-400" />
                    <span className="text-sm text-heading">Retired</span>
                  </div>
                  <span className="font-medium text-heading">{assets.retired}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <CurrencyIcon className="h-5 w-5 text-green-600" />
              </div>
              <CardTitle className="text-base">Financial Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm text-green-700">Paid</p>
                <p className="text-xl font-bold text-green-800">{formatCurrency(financial.paidAmount)}</p>
                <p className="text-xs text-green-600">{financial.paidInvoices} invoices</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-700">Pending</p>
                <p className="text-xl font-bold text-amber-800">{formatCurrency(financial.pendingAmount)}</p>
                <p className="text-xs text-amber-600">{financial.pendingInvoices} invoices</p>
              </div>
            </div>
            <div className="pt-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted">Collection Rate</span>
                <span className="font-medium text-heading">
                  {financial.totalRevenue > 0 
                    ? Math.round((financial.paidAmount / financial.totalRevenue) * 100) 
                    : 0}%
                </span>
              </div>
              <ProgressBar 
                value={financial.paidAmount} 
                max={financial.totalRevenue || 1} 
                color="bg-green-500" 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* HR Metrics Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Training Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <AcademicCapIcon className="h-5 w-5 text-amber-600" />
              </div>
              <CardTitle className="text-base">Training Progress</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {training.totalAssignments === 0 ? (
              <p className="text-center text-muted py-4">No training assigned yet</p>
            ) : (
              <>
                <div className="text-center">
                  <span className="text-4xl font-bold text-heading">{training.completionRate}%</span>
                  <p className="text-sm text-muted">Completion Rate</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-heading">Completed</span>
                    <span className="text-green-600 font-medium">{training.completed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-heading">In Progress</span>
                    <span className="text-blue-600 font-medium">{training.inProgress}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-heading">Not Started</span>
                    <span className="text-muted font-medium">{training.notStarted}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Coaching Stats */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
                <ChatBubbleIcon className="h-5 w-5 text-cyan-600" />
              </div>
              <CardTitle className="text-base">Coaching</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {coaching.total === 0 ? (
              <p className="text-center text-muted py-4">No coaching sessions yet</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-background-subtle">
                    <span className="text-2xl font-bold text-heading">{coaching.completed}</span>
                    <p className="text-xs text-muted">Completed</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background-subtle">
                    <span className="text-2xl font-bold text-heading">{coaching.pending}</span>
                    <p className="text-xs text-muted">Pending</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {coaching.byType.performance > 0 && (
                    <Badge className="bg-blue-100 text-blue-800">{coaching.byType.performance} Performance</Badge>
                  )}
                  {coaching.byType.behavior > 0 && (
                    <Badge className="bg-purple-100 text-purple-800">{coaching.byType.behavior} Behavior</Badge>
                  )}
                  {coaching.byType.development > 0 && (
                    <Badge className="bg-green-100 text-green-800">{coaching.byType.development} Development</Badge>
                  )}
                  {coaching.byType.recognition > 0 && (
                    <Badge className="bg-amber-100 text-amber-800">{coaching.byType.recognition} Recognition</Badge>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Performance & Discipline */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <ShieldIcon className="h-5 w-5 text-red-600" />
              </div>
              <CardTitle className="text-base">Performance & Discipline</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {performance.total === 0 ? (
              <p className="text-center text-muted py-4">No records yet</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                    <span className="text-2xl font-bold text-red-700">{performance.open}</span>
                    <p className="text-xs text-red-600">Open Issues</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                    <span className="text-2xl font-bold text-green-700">{performance.resolved}</span>
                    <p className="text-xs text-green-600">Resolved</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {performance.warnings > 0 && (
                    <Badge className="bg-orange-100 text-orange-800">{performance.warnings} Warnings</Badge>
                  )}
                  {performance.commendations > 0 && (
                    <Badge className="bg-green-100 text-green-800">{performance.commendations} Commendations</Badge>
                  )}
                  {performance.critical > 0 && (
                    <Badge className="bg-red-100 text-red-800">{performance.critical} Critical</Badge>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operations Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
              <RocketIcon className="h-5 w-5 text-teal-600" />
            </div>
            <CardTitle className="text-base">Operations Summary</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-lg bg-background-subtle border border-border">
              <p className="text-sm text-muted">Platform Assignments</p>
              <p className="text-2xl font-bold text-heading">{operations.platformAssignments}</p>
              <p className="text-xs text-muted">{operations.activeAssignments} active</p>
            </div>
            <div className="p-4 rounded-lg bg-background-subtle border border-border">
              <p className="text-sm text-muted">Pending Leaves</p>
              <p className="text-2xl font-bold text-heading">{operations.pendingLeaves}</p>
              <p className="text-xs text-muted">Awaiting approval</p>
            </div>
            <div className="p-4 rounded-lg bg-background-subtle border border-border">
              <p className="text-sm text-muted">Approved Leaves</p>
              <p className="text-2xl font-bold text-heading">{operations.approvedLeaves}</p>
              <p className="text-xs text-muted">This period</p>
            </div>
            <div className="p-4 rounded-lg bg-background-subtle border border-border">
              <p className="text-sm text-muted">Total Assets</p>
              <p className="text-2xl font-bold text-heading">{assets.totalAssets}</p>
              <p className="text-xs text-muted">{assets.utilizationRate}% utilized</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
