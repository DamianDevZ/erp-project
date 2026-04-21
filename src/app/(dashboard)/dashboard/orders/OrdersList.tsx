'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DataTable,
  type Column,
  Button,
  Badge,
  FilterBar,
  FilterSelect,
  Input,
} from '@/components/ui';
import { useOrders, type OrderFilters } from '@/features/orders/queries';
import { ORDER_STATUS_LABELS, type OrderStatus, type OrderWithRelations } from '@/features/orders';
import { useOptionalClientContext } from '@/contexts/ClientContext';

// NOTE: The query returns OrderWithRelations but useOrders types as Order
// We use a type alias to match the actual data structure
type Order = OrderWithRelations;

/**
 * Orders list component using reusable DataTable.
 */
export function OrdersList() {
  const router = useRouter();
  const [filters, setFilters] = useState<OrderFilters>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [sortColumn, setSortColumn] = useState<string | null>('order_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Get client filter from context
  const clientContext = useOptionalClientContext();
  const clientIds = clientContext?.getClientFilter() ?? null;

  // Build filters for query
  const queryFilters = useMemo(() => ({
    ...filters,
    search: search || undefined,
    clientIds,
  }), [filters, search, clientIds]);

  const { data: result, isLoading, error, refetch } = useOrders(queryFilters, { page, pageSize });

  const formatCurrency = (amount: number | null) =>
    amount != null
      ? new Intl.NumberFormat('en-BH', { style: 'currency', currency: 'BHD' }).format(amount)
      : 'â€”';

  const formatTime = (time: string | null) =>
    time ? new Date(time).toLocaleTimeString('en-BH', { hour: '2-digit', minute: '2-digit' }) : 'â€”';

  // Column definitions
  const columns: Column<Order>[] = useMemo(() => [
    {
      key: 'external_order_id',
      header: 'Order ID',
      sortable: true,
      render: (order) => (
        <span className="font-mono text-sm">{order.external_order_id}</span>
      ),
    },
    {
      key: 'client_id',
      header: 'Client',
      sortable: true,
      render: (order) => (
        <span className="text-heading font-medium">
          {(order.client as { name: string } | null)?.name || 'â€”'}
        </span>
      ),
    },
    {
      key: 'employee_id',
      header: 'Rider',
      sortable: true,
      render: (order) => (
        (order.employee as { full_name: string } | null)?.full_name || (
          <span className="text-muted">Unassigned</span>
        )
      ),
    },
    {
      key: 'order_date',
      header: 'Date',
      sortable: true,
      render: (order) => new Date(order.order_date).toLocaleDateString('en-BH'),
    },
    {
      key: 'pickup_time',
      header: 'Time',
      sortable: true,
      render: (order) => formatTime(order.pickup_time),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (order) => <OrderStatusBadge status={order.status} />,
    },
    {
      key: 'total_revenue',
      header: 'Amount',
      sortable: true,
      className: 'text-right',
      render: (order) => (
        <span className="font-medium">{formatCurrency(order.total_revenue)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (order) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Link href={`/dashboard/orders/${order.id}`}>
            <Button variant="ghost" size="sm">View</Button>
          </Link>
        </div>
      ),
    },
  ], []);

  const statusOptions = Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const handleRowClick = (order: Order) => {
    router.push(`/dashboard/orders/${order.id}`);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <DataTable
      data={(result?.data || []) as Order[]}
      columns={columns}
      getRowKey={(order) => order.id}
      loading={isLoading}
      error={error?.message}
      emptyMessage={search || filters.status || filters.date 
        ? "No orders match your filters."
        : "No orders found."
      }
      searchPlaceholder="Search by order ID..."
      searchValue={search}
      onSearch={(v) => { setSearch(v); setPage(1); }}
      pagination={{
        page,
        pageSize,
        totalPages: result?.totalPages || 1,
        totalCount: result?.count,
      }}
      onPageChange={setPage}
      sort={{ column: sortColumn, direction: sortDirection }}
      onSort={handleSort}
      onRowClick={handleRowClick}
      onRetry={refetch}
      filters={
        <FilterBar>
          <FilterSelect
            label="All Status"
            value={filters.status || ''}
            onChange={(v) => { 
              setFilters(prev => ({ ...prev, status: v as OrderStatus || undefined })); 
              setPage(1); 
            }}
            options={statusOptions}
          />
          <Input
            type="date"
            value={filters.date || ''}
            onChange={(e) => { 
              setFilters(prev => ({ ...prev, date: e.target.value || undefined })); 
              setPage(1); 
            }}
            className="w-40"
          />
        </FilterBar>
      }
    />
  );
}

/**
 * Order status badge component.
 */
function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const variants: Record<OrderStatus, 'success' | 'warning' | 'error' | 'outline' | 'default'> = {
    completed: 'success',
    pending: 'warning',
    cancelled: 'error',
    returned: 'outline',
    disputed: 'error',
  };

  return (
    <Badge variant={variants[status]}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}