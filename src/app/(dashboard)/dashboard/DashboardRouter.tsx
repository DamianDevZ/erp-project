'use client';

import { useDevRole } from '@/components/dev/RoleSwitcher';
import { 
  RiderDashboard, 
  OperationsDashboard, 
  HRDashboard, 
  FinanceDashboard 
} from '@/features/dashboard';
import { AdminDashboard } from './AdminDashboard';

interface DashboardRouterProps {
  /** User's employee_id if they have one */
  employeeId?: string | null;
  /** Pre-fetched data for admin dashboard */
  adminDashboardData?: {
    complianceAlerts: Array<{
      id: string;
      title: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      due_date: string;
      entity_type: 'employee' | 'vehicle';
    }>;
    activities: Array<{
      id: string;
      type: 'order';
      action: string;
      subject: string;
      time: string;
    }>;
  };
}

/**
 * Dashboard Router
 * Renders the appropriate dashboard based on the user's role.
 * Uses the dev role switcher in development, otherwise uses admin dashboard.
 */
export function DashboardRouter({ employeeId, adminDashboardData }: DashboardRouterProps) {
  const role = useDevRole();

  // Enable dev tools in development or when env var is set
  const devToolsEnabled = typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'development' || 
    process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === 'true'
  );

  // In production without dev tools, show admin dashboard
  if (!devToolsEnabled) {
    return <AdminDashboard {...adminDashboardData} />;
  }

  // Render based on selected role
  switch (role) {
    case 'rider':
      return <RiderDashboard employeeId={employeeId || undefined} />;
    case 'operations':
      return <OperationsDashboard />;
    case 'hr':
      return <HRDashboard />;
    case 'finance':
      return <FinanceDashboard />;
    case 'administrator':
    default:
      return <AdminDashboard {...adminDashboardData} />;
  }
}
