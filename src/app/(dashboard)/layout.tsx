import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { RoleSwitcher } from '@/components/dev/RoleSwitcher';

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
      organization:organizations(name, logo_url)
    `)
    .eq('id', user.id)
    .single();

  // Super-admins without an organization should use /admin
  if (profile?.is_super_admin && !profile?.organization_id) {
    redirect('/admin');
  }

  const userName = profile?.full_name || user.email || 'User';
  // Supabase returns joined data as array, access first element
  const orgData = profile?.organization;
  const organization = Array.isArray(orgData) ? orgData[0] : orgData;
  const organizationName = organization?.name || 'No Organization';
  const organizationLogo = organization?.logo_url || null;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar organizationName={organizationName} organizationLogo={organizationLogo} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header userName={userName} organizationName={organizationName} />

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      {/* Dev role switcher - enabled via env var or in development */}
      {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === 'true') && <RoleSwitcher />}
    </div>
  );
}
