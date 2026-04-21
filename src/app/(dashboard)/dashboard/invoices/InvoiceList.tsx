'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
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
  SortableTableHead,
  type SortDirection,
} from '@/components/ui';
import { 
  InvoiceStatusBadge,
  type Invoice,
  type InvoiceStatus,
} from '@/features/invoicing';
import { useOptionalClientContext } from '@/contexts/ClientContext';

interface InvoiceWithClient extends Invoice {
  client?: { name: string };
}

/**
 * Client component that fetches and displays invoices.
 */
export function InvoiceList() {
  const [invoices, setInvoices] = useState<InvoiceWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<string | null>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Get client filter from context
  const clientContext = useOptionalClientContext();
  const clientIds = clientContext?.getClientFilter() ?? null;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc');
      if (sortDirection === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [clientIds]);

  async function fetchInvoices() {
    try {
      setLoading(true);
      const supabase = createClient();
      
      let query = supabase
        .from('invoices')
        .select('*, client:clients(name)')
        .order('created_at', { ascending: false });

      // Filter by client IDs
      if (clientIds && clientIds.length > 0) {
        query = query.in('client_id', clientIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }

  // Filter invoices
  const filteredInvoices = invoices
    .filter((invoice) => {
      const matchesSearch = 
        invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        invoice.client?.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (!sortKey || !sortDirection) return 0;
      
      let aVal: string | number | null | undefined;
      let bVal: string | number | null | undefined;
      
      if (sortKey === 'client') {
        aVal = a.client?.name;
        bVal = b.client?.name;
      } else {
        aVal = a[sortKey as keyof Invoice] as string | number | null | undefined;
        bVal = b[sortKey as keyof Invoice] as string | number | null | undefined;
      }
      
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-error">{error}</p>
        <Button variant="outline" onClick={fetchInvoices} className="mt-4">
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
          placeholder="Search by invoice # or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
          className="rounded-md border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        {filteredInvoices.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted">
              {invoices.length === 0 
                ? 'No invoices yet. Create your first invoice.'
                : 'No invoices match your filters.'
              }
            </p>
            {invoices.length === 0 && (
              <Link href="/dashboard/invoices/new">
                <Button className="mt-4">Create Invoice</Button>
              </Link>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="invoice_number" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Invoice #</SortableTableHead>
                <SortableTableHead sortKey="client" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Client</SortableTableHead>
                <SortableTableHead sortKey="period_start" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Period</SortableTableHead>
                <SortableTableHead sortKey="subtotal" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Subtotal</SortableTableHead>
                <SortableTableHead sortKey="tax_amount" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Tax</SortableTableHead>
                <SortableTableHead sortKey="total" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Total</SortableTableHead>
                <SortableTableHead sortKey="due_at" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Due Date</SortableTableHead>
                <SortableTableHead sortKey="status" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Status</SortableTableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono font-medium">
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell className="text-body">
                    {invoice.client?.name || '—'}
                  </TableCell>
                  <TableCell className="text-muted">
                    {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
                  </TableCell>
                  <TableCell className="text-muted">
                    {formatCurrency(invoice.subtotal)}
                  </TableCell>
                  <TableCell className="text-muted">
                    {formatCurrency(invoice.tax_amount)}
                  </TableCell>
                  <TableCell className="font-semibold text-heading">
                    {formatCurrency(invoice.total)}
                  </TableCell>
                  <TableCell className="text-muted">
                    {invoice.due_at ? formatDate(invoice.due_at) : '—'}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/invoices/${invoice.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                      <Link href={`/dashboard/invoices/${invoice.id}/edit`}>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
