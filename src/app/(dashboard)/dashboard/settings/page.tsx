import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-heading">Settings</h1>
          <p className="text-muted">No organization assigned.</p>
        </div>
      </div>
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-heading">Settings</h1>
          <p className="text-muted">Organization not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Settings</h1>
        <p className="text-muted">Manage your organization settings.</p>
      </div>

      <SettingsForm organization={organization} canEdit={canEdit} />
    </div>
  );
}
