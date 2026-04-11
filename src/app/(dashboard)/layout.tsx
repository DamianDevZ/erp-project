import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Dashboard layout wrapper.
 * Wraps all authenticated pages with sidebar and header.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Get user profile and organization
  const { data: profile } = await supabase
    .from('user_profiles')
    .select(`
      full_name,
      is_super_admin,
      organization_id,
      organization:organizations(name)
    `)
    .eq('id', user.id)
    .single();

  // Super-admins without an organization should use /admin
  if (profile?.is_super_admin && !profile?.organization_id) {
    redirect('/admin');
  }

  const userName = profile?.full_name || user.email || 'User';
  const organizationName = (profile?.organization as any)?.name || 'No Organization';

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header userName={userName} organizationName={organizationName} />

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
