import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PageContent } from '@/components/ui';
import { SettingsForm } from './SettingsForm';

/**
 * Organization settings page.
 * Allows owners/admins to update organization details and logo.
 */
export default async function SettingsPage() {
  const supabase = await createClient();

  // Get current user's organization
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    return (
      <PageContent>
        <PageHeader
          title="Settings"
          description="No organization assigned."
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Settings' },
          ]}
        />
      </PageContent>
    );
  }

  // Check if user has admin/owner access
  const canEdit = ['owner', 'admin'].includes(profile.role || '');

  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.organization_id)
    .single();

  if (!organization) {
    return (
      <PageContent>
        <PageHeader
          title="Settings"
          description="Organization not found."
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Settings' },
          ]}
        />
      </PageContent>
    );
  }

  return (
    <PageContent>
      <PageHeader
        title="Settings"
        description="Manage your organization settings."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings' },
        ]}
      />
      <SettingsForm organization={organization} canEdit={canEdit} />
    </PageContent>
  );
}
