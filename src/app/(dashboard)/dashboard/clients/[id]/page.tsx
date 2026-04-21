import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Client detail page.
 */
export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseClient();

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !client) {
    notFound();
  }

  // Get employee count assigned to this client
  const { count: assignmentCount } = await supabase
    .from('client_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', id)
    .eq('status', 'active');

  const formatRate = () => {
    if (!client.billing_rate) return 'Not set';
    const rate = `$${client.billing_rate}`;
    switch (client.billing_rate_type) {
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
          <h1 className="text-2xl font-bold text-heading">{client.name}</h1>
          <Badge variant={client.is_active ? 'success' : 'error'} className="mt-1">
            {client.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/clients/${id}/edit`}>
            <Button>Edit</Button>
          </Link>
          <Link href="/dashboard/clients">
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </div>

      {/* Client info */}
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
                {client.billing_rate_type?.replace('_', ' ') || 'Not set'}
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
                {new Date(client.created_at).toLocaleDateString()}
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
