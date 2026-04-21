/**
 * Dashboard Feature Module
 */

export {
  MetricCard,
  DashboardMetricsGrid,
  PlatformPerformanceWidget,
  TopRidersWidget,
  ComplianceAlertsWidget,
  RecentActivityWidget,
} from './components/DashboardWidgets';

// Role-specific dashboards
export { RiderDashboard } from './components/RiderDashboard';
export { OperationsDashboard } from './components/OperationsDashboard';
export { HRDashboard } from './components/HRDashboard';
export { FinanceDashboard } from './components/FinanceDashboard';
