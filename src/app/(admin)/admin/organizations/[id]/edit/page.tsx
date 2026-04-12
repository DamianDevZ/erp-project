import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OrganizationForm } from '../../OrganizationForm';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Edit organization page for super-admins.
 */
export default async function EditOrganizationPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !org) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Edit Organization</h1>
        <p className="text-muted">Update organization details.</p>
      </div>

      <OrganizationForm organization={org} />
    </div>
  );
}
