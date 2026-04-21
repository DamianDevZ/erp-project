import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  Card, CardHeader, CardTitle, CardContent,
  Button, Badge,
  PageHeader, PageContent, DetailLayout, DetailCard, DetailItem, DetailGrid,
} from '@/components/ui';
import { ORDER_STATUS_LABELS, RECONCILIATION_STATUS_LABELS } from '@/features/orders';

interface Props {
  params: Promise<{ id: string }>;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: 'warning',
    completed: 'success',
    cancelled: 'destructive',
    returned: 'secondary',
    disputed: 'destructive',
  };
  return (
    <Badge variant={(variants[status] as any) || 'secondary'}>
      {ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] || status}
    </Badge>
  );
}

function ReconciliationBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: 'secondary',
    matched: 'success',
    mismatched: 'destructive',
    resolved: 'success',
  };
  return (
    <Badge variant={(variants[status] as any) || 'secondary'}>
      {RECONCILIATION_STATUS_LABELS[status as keyof typeof RECONCILIATION_STATUS_LABELS] || status}
    </Badge>
  );
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      client:clients(id, name),
      employee:employees(id, full_name, employee_number),
      asset:assets(id, name, license_plate)
    `)
    .eq('id', id)
    .single();

  if (error || !order) {
    notFound();
  }

  const formatCurrency = (amount: number | null) =>
    amount != null
      ? new Intl.NumberFormat('en-BH', { style: 'currency', currency: 'BHD' }).format(amount)
      : '—';

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-BH') : '—';

  const formatDateTime = (d: string | null) =>
    d ? new Date(d).toLocaleString('en-BH') : '—';

  const client = order.client as { id: string; name: string } | null;
  const employee = order.employee as { id: string; full_name: string; employee_number: string | null } | null;
  const asset = order.asset as { id: string; name: string; license_plate: string | null } | null;

  return (
    <PageContent>
      <PageHeader
        title={`Order #${order.external_order_id}`}
        description={
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={order.status} />
            <ReconciliationBadge status={order.reconciliation_status} />
          </div>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Orders', href: '/dashboard/orders' },
          { label: order.external_order_id },
        ]}
        actions={
          <Link href="/dashboard/orders">
            <Button variant="outline">Back to Orders</Button>
          </Link>
        }
      />

      <DetailLayout>
        {/* Core details */}
        <DetailCard title="Order Details">
          <DetailGrid>
            <DetailItem label="Order ID" value={order.external_order_id} />
            <DetailItem label="Order Date" value={formatDate(order.order_date)} />
            <DetailItem label="Order Type" value={order.order_type} />
            <DetailItem label="Status" value={<StatusBadge status={order.status} />} />
            <DetailItem label="Client" value={
              client ? (
                <Link href={`/dashboard/clients/${client.id}`} className="text-primary hover:underline">
                  {client.name}
                </Link>
              ) : '—'
            } />
            <DetailItem label="Reconciliation" value={<ReconciliationBadge status={order.reconciliation_status} />} />
          </DetailGrid>
        </DetailCard>

        {/* Assignment */}
        <DetailCard title="Assignment">
          <DetailGrid>
            <DetailItem label="Rider" value={
              employee ? (
                <Link href={`/dashboard/employees/${employee.id}`} className="text-primary hover:underline">
                  {employee.full_name}
                </Link>
              ) : <span className="text-muted">Unassigned</span>
            } />
            <DetailItem label="Employee #" value={employee?.employee_number || '—'} />
            <DetailItem label="Vehicle" value={asset ? `${asset.name}${asset.license_plate ? ` (${asset.license_plate})` : ''}` : '—'} />
            <DetailItem label="Pickup Time" value={formatDateTime(order.pickup_time)} />
            <DetailItem label="Delivery Time" value={formatDateTime(order.delivery_time)} />
            <DetailItem label="Distance" value={order.distance_km != null ? `${order.distance_km} km` : '—'} />
          </DetailGrid>
        </DetailCard>

        {/* Locations */}
        <DetailCard title="Locations">
          <DetailGrid>
            <DetailItem label="Pickup Location" value={order.pickup_location || '—'} />
            <DetailItem label="Delivery Location" value={order.delivery_location || '—'} />
          </DetailGrid>
        </DetailCard>

        {/* Financials */}
        <DetailCard title="Financials">
          <DetailGrid>
            <DetailItem label="Order Value" value={formatCurrency(order.order_value)} />
            <DetailItem label="Delivery Fee" value={formatCurrency(order.delivery_fee)} />
            <DetailItem label="Base Payout" value={formatCurrency(order.base_payout)} />
            <DetailItem label="Incentive Payout" value={formatCurrency(order.incentive_payout)} />
            <DetailItem label="Tip Amount" value={formatCurrency(order.tip_amount)} />
            <DetailItem label="Platform Commission" value={formatCurrency(order.platform_commission)} />
            <DetailItem label="Penalty Amount" value={formatCurrency(order.penalty_amount)} />
            <DetailItem label="Total Revenue" value={<span className="font-semibold">{formatCurrency(order.total_revenue)}</span>} />
            <DetailItem label="Net Revenue" value={<span className="font-semibold">{formatCurrency(order.net_revenue)}</span>} />
          </DetailGrid>
        </DetailCard>

        {/* Processing status */}
        <DetailCard title="Processing">
          <DetailGrid>
            <DetailItem label="Payroll Processed" value={
              <Badge variant={order.payroll_processed ? 'success' : 'secondary'}>
                {order.payroll_processed ? 'Yes' : 'No'}
              </Badge>
            } />
            <DetailItem label="Invoice Processed" value={
              <Badge variant={order.invoice_processed ? 'success' : 'secondary'}>
                {order.invoice_processed ? 'Yes' : 'No'}
              </Badge>
            } />
            <DetailItem label="Imported At" value={formatDateTime(order.imported_at)} />
            <DetailItem label="Reconciled At" value={formatDateTime(order.reconciled_at)} />
            {order.cancellation_reason && (
              <DetailItem label="Cancellation Reason" value={order.cancellation_reason} />
            )}
            {order.reconciliation_notes && (
              <DetailItem label="Reconciliation Notes" value={order.reconciliation_notes} />
            )}
          </DetailGrid>
        </DetailCard>
      </DetailLayout>
    </PageContent>
  );
}
