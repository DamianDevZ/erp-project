/**
 * Admin layout - for super-admin panel.
 * Similar to dashboard but with different branding.
 */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Header } from '@/components/layout/Header';

// Force dynamic rendering - don't cache auth checks
export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Check if user is super-admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_super_admin, full_name')
    .eq('id', user.id)
    .single();

  if (!profile?.is_super_admin) {
    // Not a super-admin, redirect to regular dashboard
    redirect('/dashboard');
  }

  const userName = profile?.full_name || user.email || 'Admin';

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header isAdmin userName={userName} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
