import { createClient } from '@/lib/supabase/server';
import { RiderDashboard } from '@/features/dashboard';

/**
 * Rider Dashboard page.
 * Shows the rider's upcoming shifts, recent orders, documents status, and earnings.
 * As admin, shows a sample rider view.
 */
export default async function RiderDashboardPage() {
  const supabase = await createClient();
  
  // Get current user's profile
  const { data: { user } } = await supabase.auth.getUser();
  
  let employeeId: string | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('employee_id')
      .eq('id', user.id)
      .single();
    employeeId = profile?.employee_id || undefined;
  }

  return <RiderDashboard employeeId={employeeId} />;
}
