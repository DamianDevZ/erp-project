import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, PageHeader, PageContent } from '@/components/ui';
import { AssetOwnershipBadge } from '@/features/assets';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Asset detail page.
 */
export default async function AssetDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: asset, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !asset) {
    notFound();
  }

  return (
    <PageContent>
      {/* Header */}
      <PageHeader
        title={asset.name}
        description={
          <div className="flex items-center gap-2 mt-1">
            <AssetOwnershipBadge ownership={asset.ownership} />
            <Badge variant={asset.is_active ? 'success' : 'error'}>
              {asset.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Assets', href: '/dashboard/assets' },
          { label: asset.name },
        ]}
        actions={
          <Link href={`/dashboard/assets/${id}/edit`}>
            <Button>Edit</Button>
          </Link>
        }
      />

      {/* Asset info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted">License Plate</p>
              <p className="font-mono text-heading">{asset.license_plate || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Make / Model</p>
              <p className="font-medium text-heading">
                {asset.make && asset.model 
                  ? `${asset.make} ${asset.model}` 
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted">Year</p>
              <p className="text-heading">{asset.year || 'Not set'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted">Assigned Employee</p>
              <p className="text-heading">
                {asset.assigned_employee_id ? 'Assigned' : 'Unassigned'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted">Created</p>
              <p className="text-heading">
                {new Date(asset.created_at).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContent>
  );
}
