import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Organization detail page for super-admins.
 */
export default async function OrganizationDetailPage({ params }: Props) {
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

  // Get user count for this org
  const { count: userCount } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', id);

  // Get employee count for this org
  const { count: employeeCount } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">{org.name}</h1>
          <p className="text-muted">Organization details</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/organizations/${id}/edit`}>
            <Button>Edit</Button>
          </Link>
          <Link href="/admin/organizations">
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </div>

      {/* Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organization Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted">Name</p>
              <p className="font-medium text-heading">{org.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Slug</p>
              <p className="font-mono text-heading">{org.slug}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Created</p>
              <p className="text-heading">
                {new Date(org.created_at).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted">Users</p>
              <p className="text-2xl font-bold text-heading">{userCount || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Employees</p>
              <p className="text-2xl font-bold text-heading">{employeeCount || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
