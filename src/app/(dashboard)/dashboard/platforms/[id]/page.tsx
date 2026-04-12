import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Platform detail page.
 */
export default async function PlatformDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: platform, error } = await supabase
    .from('platforms')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !platform) {
    notFound();
  }

  // Get employee count assigned to this platform
  const { count: assignmentCount } = await supabase
    .from('platform_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('platform_id', id)
    .eq('is_active', true);

  const formatRate = () => {
    if (!platform.billing_rate) return 'Not set';
    const rate = `$${platform.billing_rate}`;
    switch (platform.billing_rate_type) {
      case 'per_delivery': return `${rate} per delivery`;
      case 'hourly': return `${rate} per hour`;
      case 'fixed': return `${rate} per period`;
      default: return rate;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">{platform.name}</h1>
          <Badge variant={platform.is_active ? 'success' : 'error'} className="mt-1">
            {platform.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/platforms/${id}/edit`}>
            <Button>Edit</Button>
          </Link>
          <Link href="/dashboard/platforms">
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </div>

      {/* Platform info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Billing Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted">Billing Rate</p>
              <p className="font-medium text-heading">{formatRate()}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Rate Type</p>
              <p className="text-heading capitalize">
                {platform.billing_rate_type?.replace('_', ' ') || 'Not set'}
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
              <p className="text-sm text-muted">Active Assignments</p>
              <p className="text-2xl font-bold text-heading">{assignmentCount || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Created</p>
              <p className="text-heading">
                {new Date(platform.created_at).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned employees (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted">Employee assignments will be shown here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
