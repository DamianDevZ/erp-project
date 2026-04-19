'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Spinner } from '@/components/ui';
import { useOrder } from '@/features/orders/queries';
import { ORDER_STATUS_LABELS, ORDER_TYPE_LABELS, type OrderStatus } from '@/features/orders';

/**
 * Order detail page.
 * Shows full order information.
 */
export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const { data: order, isLoading, error } = useOrder(orderId);

  const formatCurrency = (amount: number | null) =>
    amount != null
      ? new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount)
      : '—';

  const formatDateTime = (datetime: string | null) =>
    datetime ? new Date(datetime).toLocaleString('en-AE') : '—';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-heading">Order Not Found</h1>
          <p className="text-muted">The order you're looking for doesn't exist or has been removed.</p>
        </div>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const statusVariants: Record<OrderStatus, 'success' | 'warning' | 'destructive' | 'secondary'> = {
    completed: 'success',
    pending: 'warning',
    cancelled: 'destructive',
    returned: 'secondary',
    disputed: 'destructive',
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-heading">Order #{order.external_order_id}</h1>
            <Badge variant={statusVariants[order.status]}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
          </div>
          <p className="text-muted">
            {(order.platform as { name: string } | null)?.name || 'Unknown Platform'} · {order.order_date}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>Back</Button>
        </div>
      </div>

      {/* Order details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow label="Order ID" value={order.external_order_id} />
            <DetailRow label="Order Type" value={ORDER_TYPE_LABELS[order.order_type]} />
            <DetailRow label="Platform" value={(order.platform as { name: string } | null)?.name || '—'} />
            <DetailRow label="Order Date" value={order.order_date} />
            <DetailRow label="Pickup Time" value={formatDateTime(order.pickup_time)} />
            <DetailRow label="Delivery Time" value={formatDateTime(order.delivery_time)} />
          </CardContent>
        </Card>

        {/* Assignment */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow 
              label="Rider" 
              value={
                order.employee_id ? (
                  <Link href={`/dashboard/employees/${order.employee_id}`} className="text-primary hover:underline">
                    {(order.employee as { full_name: string } | null)?.full_name || 'View Rider'}
                  </Link>
                ) : '—'
              } 
            />
            <DetailRow 
              label="Vehicle" 
              value={
                order.asset_id ? (
                  <Link href={`/dashboard/assets/${order.asset_id}`} className="text-primary hover:underline">
                    {(order.asset as { license_plate: string } | null)?.license_plate || 'View Vehicle'}
                  </Link>
                ) : '—'
              }
            />
            <DetailRow label="Distance" value={order.distance_km ? `${order.distance_km} km` : '—'} />
          </CardContent>
        </Card>

        {/* Locations */}
        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow label="Pickup" value={order.pickup_location || '—'} />
            <DetailRow label="Delivery" value={order.delivery_location || '—'} />
          </CardContent>
        </Card>

        {/* Financial */}
        <Card>
          <CardHeader>
            <CardTitle>Financial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow label="Order Value" value={formatCurrency(order.order_value)} />
            <DetailRow label="Delivery Fee" value={formatCurrency(order.delivery_fee)} />
            <DetailRow label="Base Payout" value={formatCurrency(order.base_payout)} />
            <DetailRow label="Incentive" value={formatCurrency(order.incentive_payout)} />
            <DetailRow label="Tip" value={formatCurrency(order.tip_amount)} />
            <div className="border-t border-border pt-3 mt-3">
              <DetailRow 
                label="Total Revenue" 
                value={<span className="text-lg font-bold">{formatCurrency(order.total_revenue)}</span>} 
              />
            </div>
          </CardContent>
        </Card>

        {/* COD Details */}
        {order.cod_amount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Cash on Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailRow label="COD Amount" value={formatCurrency(order.cod_amount)} />
              <DetailRow 
                label="COD Status" 
                value={
                  <Badge variant={order.cod_collected ? 'success' : 'warning'}>
                    {order.cod_collected ? 'Collected' : 'Pending'}
                  </Badge>
                } 
              />
            </CardContent>
          </Card>
        )}

        {/* Processing Status */}
        <Card>
          <CardHeader>
            <CardTitle>Processing Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow 
              label="Reconciliation" 
              value={
                <Badge variant={order.reconciliation_status === 'matched' ? 'success' : 'warning'}>
                  {order.reconciliation_status}
                </Badge>
              } 
            />
            <DetailRow 
              label="Payroll Processed" 
              value={
                <Badge variant={order.payroll_processed ? 'success' : 'secondary'}>
                  {order.payroll_processed ? 'Yes' : 'No'}
                </Badge>
              } 
            />
            <DetailRow 
              label="Invoice Processed" 
              value={
                <Badge variant={order.invoice_processed ? 'success' : 'secondary'}>
                  {order.invoice_processed ? 'Yes' : 'No'}
                </Badge>
              } 
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium text-heading text-right ml-4">{value}</span>
    </div>
  );
}
