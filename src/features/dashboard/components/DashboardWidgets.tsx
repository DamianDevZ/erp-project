'use client';

import { Card, CardContent, CardHeader, CardTitle, Spinner } from '@/components/ui';
import { 
  useDashboardMetrics, 
  useComplianceOverview,
  usePlatformPerformance,
  useTopRiders,
} from '@/features/analytics/queries';
import { useOptionalClientContext } from '@/contexts';

/**
 * Real-time dashboard metrics using hooks
 */

// ============================================================================
// METRIC CARD
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  href?: string;
  loading?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  loading,
  variant = 'default',
}: MetricCardProps) {
  const variantStyles = {
    default: 'border-border',
    success: 'border-l-4 border-l-success',
    warning: 'border-l-4 border-l-warning',
    error: 'border-l-4 border-l-error',
  };

  return (
    <Card className={variantStyles[variant]}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted">{title}</CardTitle>
        {icon && <div className="text-muted">{icon}</div>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Spinner size="sm" />
        ) : (
          <>
            <div className="text-2xl font-bold text-heading">{value}</div>
            {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
            {trend && trendValue && (
              <p className={`text-xs mt-1 ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-error' : 'text-muted'}`}>
                {trend === 'up' ? 'â†‘' : trend === 'down' ? 'â†“' : 'â†’'} {trendValue}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// DASHBOARD METRICS COMPONENT
// ============================================================================

export function DashboardMetricsGrid() {
  const clientContext = useOptionalClientContext();
  const clientIds = clientContext?.getClientFilter() ?? null;

  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics(clientIds);
  const { data: compliance, isLoading: complianceLoading } = useComplianceOverview();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-BH', { style: 'currency', currency: 'BHD' }).format(amount);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Orders Today"
        value={metrics?.total_orders_today ?? 0}
        subtitle="Deliveries processed"
        loading={metricsLoading}
        icon={<OrdersIcon />}
      />
      <MetricCard
        title="Revenue Today"
        value={metrics ? formatCurrency(metrics.total_revenue_today) : 'â€”'}
        subtitle="Total earnings"
        loading={metricsLoading}
        icon={<RevenueIcon />}
      />
      <MetricCard
        title="Active Riders"
        value={`${metrics?.active_employees ?? 0} / ${metrics?.total_employees ?? 0}`}
        subtitle="Currently working"
        loading={metricsLoading}
        icon={<RidersIcon />}
      />
      <MetricCard
        title="Fleet Status"
        value={`${metrics?.available_vehicles ?? 0} / ${metrics?.total_vehicles ?? 0}`}
        subtitle="Vehicles available"
        loading={metricsLoading}
        icon={<FleetIcon />}
      />

      <MetricCard
        title="Compliance Alerts"
        value={compliance?.total_alerts ?? 0}
        subtitle={`${compliance?.critical_alerts ?? 0} critical`}
        loading={complianceLoading}
        variant={compliance?.critical_alerts ? 'error' : compliance?.expiring_documents ? 'warning' : 'default'}
        icon={<AlertIcon />}
      />
      <MetricCard
        title="Compliance Score"
        value={`${compliance?.compliance_score ?? 100}%`}
        subtitle="Document compliance"
        loading={complianceLoading}
        variant={
          (compliance?.compliance_score ?? 100) >= 90 ? 'success' :
          (compliance?.compliance_score ?? 100) >= 70 ? 'warning' : 'error'
        }
        icon={<ComplianceIcon />}
      />
      <MetricCard
        title="Pending COD"
        value={metrics ? formatCurrency(metrics.pending_cod_remittance) : 'â€”'}
        subtitle="To be remitted"
        loading={metricsLoading}
        variant={(metrics?.pending_cod_remittance ?? 0) > 10000 ? 'warning' : 'default'}
        icon={<CashIcon />}
      />
      <MetricCard
        title="Today's Shifts"
        value={metrics?.total_shifts_today ?? 0}
        subtitle="Scheduled shifts"
        loading={metricsLoading}
        icon={<ShiftsIcon />}
      />
    </div>
  );
}

// ============================================================================
// PLATFORM PERFORMANCE WIDGET
// ============================================================================

export function PlatformPerformanceWidget() {
  const clientContext = useOptionalClientContext();
  const clientIds = clientContext?.getClientFilter() ?? null;

  const { data: platforms, isLoading, error } = usePlatformPerformance(undefined, undefined, clientIds);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform Performance</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (error || !platforms?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">No platform data available</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-BH', { style: 'currency', currency: 'BHD', minimumFractionDigits: 0 }).format(amount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {platforms.slice(0, 5).map((platform) => (
            <div key={platform.platform_id} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-heading">{platform.platform_name}</span>
                  <span className="text-sm text-muted">{platform.total_orders} orders</span>
                </div>
                <div className="h-2 bg-hover rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (platform.total_orders / Math.max(...platforms.map(p => p.total_orders))) * 100)}%`
                    }}
                  />
                </div>
              </div>
              <div className="ml-4 text-right">
                <span className="text-sm font-medium text-heading">{formatCurrency(platform.total_revenue)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TOP RIDERS WIDGET
// ============================================================================

export function TopRidersWidget() {
  const { data: riders, isLoading, error } = useTopRiders(5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (error || !riders?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">No rider data available</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-BH', { style: 'currency', currency: 'BHD', minimumFractionDigits: 0 }).format(amount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {riders.map((rider, index) => (
            <div key={rider.employee_id} className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
                ${index === 0 ? 'bg-warning-light text-warning' : 
                  index === 1 ? 'bg-hover text-muted' : 
                  index === 2 ? 'bg-warning-light text-warning' : 'bg-hover text-muted'}`}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-heading truncate">{rider.employee_name}</p>
                <p className="text-xs text-muted">{rider.orders_completed} orders</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-heading">{formatCurrency(rider.total_earnings)}</p>
                <p className="text-xs text-success">{rider.on_time_percentage}% on-time</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ICONS
// ============================================================================

const OrdersIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const RevenueIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const RidersIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const FleetIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const AlertIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const ComplianceIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const CashIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const ShiftsIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

// ============================================================================
// COMPLIANCE ALERTS WIDGET
// ============================================================================

interface AlertItem {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  due_date: string;
  entity_type: 'employee' | 'vehicle';
  entity_name?: string;
}

export function ComplianceAlertsWidget({ alerts }: { alerts: AlertItem[] }) {
  if (!alerts?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compliance Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-success-light p-3 mb-3">
              <ComplianceIcon />
            </div>
            <p className="text-sm text-muted">All clear! No pending alerts.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const severityStyles = {
    critical: 'bg-error-light text-error',
    high: 'bg-warning-light text-warning',
    medium: 'bg-primary-light text-primary',
    low: 'bg-hover text-muted',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Compliance Alerts</CardTitle>
        <span className="text-xs bg-error-light text-error px-2 py-1 rounded-full font-medium">
          {alerts.length} pending
        </span>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-hover transition-colors">
              <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${severityStyles[alert.severity]}`}>
                {alert.severity}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-heading truncate">{alert.title}</p>
                <p className="text-xs text-muted">
                  {alert.entity_name && `${alert.entity_name} Â· `}
                  Due: {new Date(alert.due_date).toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>
          ))}
        </div>
        {alerts.length > 5 && (
          <p className="text-xs text-muted text-center mt-3">
            +{alerts.length - 5} more alerts
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// RECENT ACTIVITY WIDGET
// ============================================================================

interface ActivityItem {
  id: string;
  type: 'order' | 'employee' | 'vehicle' | 'invoice' | 'shift';
  action: string;
  subject: string;
  time: string;
}

export function RecentActivityWidget({ activities }: { activities: ActivityItem[] }) {
  const typeIcons: Record<string, React.ReactNode> = {
    order: <OrdersIcon />,
    employee: <RidersIcon />,
    vehicle: <FleetIcon />,
    invoice: <RevenueIcon />,
    shift: <ShiftsIcon />,
  };

  if (!activities?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted text-center py-6">No recent activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.slice(0, 8).map((activity) => (
            <div key={activity.id} className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-hover text-muted">
                {typeIcons[activity.type] || <OrdersIcon />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-heading truncate">
                  <span className="font-medium">{activity.action}</span> {activity.subject}
                </p>
                <p className="text-xs text-muted">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}