'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  Spinner,
  Input,
  Badge,
} from '@/components/ui';
import { useOrders, type OrderFilters } from '@/features/orders/queries';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/features/orders';

/**
 * Orders list component with filtering and pagination.
 */
export function OrdersList() {
  const [filters, setFilters] = useState<OrderFilters>({});
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data: ordersResult, isLoading, error, refetch } = useOrders(filters, { page, pageSize });
  const orders = ordersResult?.data || [];
  const totalPages = ordersResult?.totalPages || 1;

  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search }));
    setPage(1);
  };

  const handleStatusFilter = (status: OrderStatus | 'all') => {
    setFilters(prev => ({
      ...prev,
      status: status === 'all' ? undefined : status,
    }));
    setPage(1);
  };

  const formatCurrency = (amount: number | null) =>
    amount != null
      ? new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount)
      : '—';

  const formatTime = (time: string | null) =>
    time ? new Date(time).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' }) : '—';

  if (isLoading && !orders.length) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-error">Failed to load orders: {error.message}</p>
        <Button variant="outline" onClick={() => refetch()} className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Search by order ID..."
          value={filters.search || ''}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={filters.status || 'all'}
          onChange={(e) => handleStatusFilter(e.target.value as OrderStatus | 'all')}
          className="rounded-md border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Status</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <Input
          type="date"
          value={filters.date || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value || undefined }))}
          className="w-40"
        />
      </div>

      {/* Results count */}
      <div className="text-sm text-muted">
        {ordersResult?.count ?? 0} orders found
        {isLoading && <Spinner size="sm" className="ml-2 inline-block" />}
      </div>

      {/* Table */}
      <Card>
        {orders.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted">No orders found matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Rider</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">
                      {order.external_order_id}
                    </TableCell>
                    <TableCell>
                      <span className="text-heading font-medium">
                        {(order.platform as { name: string } | null)?.name || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {(order.employee as { full_name: string } | null)?.full_name || (
                        <span className="text-muted">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(order.order_date).toLocaleDateString('en-AE')}
                    </TableCell>
                    <TableCell>
                      {formatTime(order.pickup_time)}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.total_revenue)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/orders/${order.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Order status badge component.
 */
function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const variants: Record<OrderStatus, 'success' | 'warning' | 'destructive' | 'secondary' | 'default'> = {
    completed: 'success',
    pending: 'warning',
    cancelled: 'destructive',
    returned: 'secondary',
    disputed: 'destructive',
  };

  return (
    <Badge variant={variants[status]}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
