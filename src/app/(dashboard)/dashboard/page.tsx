import { createClient } from '@/lib/supabase/server';
import { DashboardRouter } from './DashboardRouter';

/**
 * Dashboard home page.
 * Renders role-specific dashboard based on user's role.
 * Administrator sees summary, other roles see department-specific views.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user's profile to pass employee_id to dashboard
  const { data: { user } } = await supabase.auth.getUser();
  
  let employeeId: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('employee_id')
      .eq('id', user.id)
      .single();
    employeeId = profile?.employee_id || null;
  }

  // Fetch compliance alerts for admin dashboard
  const { data: alerts } = await supabase
    .from('compliance_alerts')
    .select('id, title, severity, expires_at, employee_id, asset_id')
    .in('status', ['open', 'acknowledged'])
    .order('severity', { ascending: true })
    .order('expires_at', { ascending: true })
    .limit(10);

  // Fetch recent orders for activity feed
  const { data: recentOrders } = await supabase
    .from('orders')
    .select(`
      id,
      external_order_id,
      status,
      created_at,
      employee:employees(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  // Transform to activity items
  const activities = [
    ...(recentOrders?.map(order => ({
      id: order.id,
      type: 'order' as const,
      action: order.status === 'completed' ? 'Delivered' : 
              order.status === 'in_transit' ? 'Picked up' : 'Created',
      subject: `Order #${order.external_order_id}`,
      time: formatTimeAgo(order.created_at),
    })) || []),
  ];

  // Transform alerts for widget
  const complianceAlerts = alerts?.map(a => ({
    id: a.id,
    title: a.title,
    severity: a.severity as 'critical' | 'high' | 'medium' | 'low',
    due_date: a.expires_at,
    entity_type: (a.employee_id ? 'employee' : 'vehicle') as 'employee' | 'vehicle',
  })) || [];

  return (
    <DashboardRouter 
      employeeId={employeeId}
      adminDashboardData={{
        complianceAlerts,
        activities,
      }}
    />
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
