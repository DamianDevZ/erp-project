'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useClientContext } from '@/contexts';

/**
 * Finance Dashboard
 * Shows invoices, COD collections, payroll status, and financial metrics.
 */
export function FinanceDashboard() {
  const { getClientFilter, selectedClientIds, showAllClients } = useClientContext();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingInvoices: 0,
    pendingInvoiceAmount: 0,
    overdueInvoices: 0,
    codCollected: 0,
    codPending: 0,
    payrollPending: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [payrollBatches, setPayrollBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const clientFilter = getClientFilter();

      // If no clients selected (empty array), show nothing
      if (clientFilter !== null && clientFilter.length === 0) {
        setStats({
          totalRevenue: 0,
          pendingInvoices: 0,
          pendingInvoiceAmount: 0,
          overdueInvoices: 0,
          codCollected: 0,
          codPending: 0,
          payrollPending: 0,
        });
        setRecentInvoices([]);
        setPayrollBatches([]);
        setLoading(false);
        return;
      }

      // Fetch invoices
      let invoicesQuery = supabase
        .from('invoices')
        .select('id, invoice_number, title, total, status, due_at, client:clients(name)')
        .order('created_at', { ascending: false });

      if (clientFilter && clientFilter.length > 0) {
        invoicesQuery = invoicesQuery.in('client_id', clientFilter);
      }

      const [invoicesResult, ordersResult, payrollResult] = await Promise.all([
        invoicesQuery.limit(20),
        supabase
          .from('orders')
          .select('id, cod_amount, status, created_at')
          .gte('created_at', thirtyDaysAgo)
          .gt('cod_amount', 0),
        supabase
          .from('payroll_batches')
          .select('id, period_start, period_end, status, total_gross, total_net')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const invoices = invoicesResult.data || [];
      const orders = ordersResult.data || [];
      const payroll = payrollResult.data || [];

      // Calculate stats
      const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'draft');
      const overdueInvoices = invoices.filter(i => i.status === 'overdue');
      const totalRevenue = invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + (i.total || 0), 0);
      const pendingInvoiceAmount = pendingInvoices.reduce((sum, i) => sum + (i.total || 0), 0);

      const codCollected = orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.cod_amount || 0), 0);
      const codPending = orders
        .filter(o => o.status !== 'completed' && o.status !== 'cancelled')
        .reduce((sum, o) => sum + (o.cod_amount || 0), 0);

      const payrollPending = payroll.filter(p => p.status === 'pending' || p.status === 'processing').length;

      setStats({
        totalRevenue,
        pendingInvoices: pendingInvoices.length,
        pendingInvoiceAmount,
        overdueInvoices: overdueInvoices.length,
        codCollected,
        codPending,
        payrollPending,
      });
      setRecentInvoices(invoices.slice(0, 8));
      setPayrollBatches(payroll);
      setLoading(false);
    }

    fetchData();
  }, [getClientFilter, selectedClientIds, showAllClients]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BH', { style: 'currency', currency: 'BHD' }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const clientLabel = showAllClients ? 'All Clients' : 
    selectedClientIds.length > 0 ? `${selectedClientIds.length} Client(s)` : 'Your Clients';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Finance Dashboard</h1>
          <p className="text-muted">Financial overview â€¢ {clientLabel}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/invoices/new">
            <Button variant="outline">Create Invoice</Button>
          </Link>
          <Link href="/dashboard/payroll/new">
            <Button>Run Payroll</Button>
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {(stats.overdueInvoices > 0 || stats.payrollPending > 0) && (
        <div className="rounded-lg border border-warning bg-warning/10 p-4">
          <h3 className="font-semibold text-warning">Requires Attention</h3>
          <ul className="mt-2 space-y-1 text-sm text-body">
            {stats.overdueInvoices > 0 && (
              <li>â€¢ {stats.overdueInvoices} invoice(s) are overdue</li>
            )}
            {stats.payrollPending > 0 && (
              <li>â€¢ {stats.payrollPending} payroll batch(es) pending processing</li>
            )}
          </ul>
        </div>
      )}

      {/* Financial KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-heading">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-sm text-muted">Revenue (Paid)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">{formatCurrency(stats.pendingInvoiceAmount)}</div>
            <p className="text-sm text-muted">Pending ({stats.pendingInvoices} invoices)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">{formatCurrency(stats.codCollected)}</div>
            <p className="text-sm text-muted">COD Collected (30d)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">{formatCurrency(stats.codPending)}</div>
            <p className="text-sm text-muted">COD Pending</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Link href="/dashboard/invoices">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentInvoices.length > 0 ? (
              <div className="space-y-3">
                {recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <Link href={`/dashboard/invoices/${invoice.id}`} className="font-medium text-primary hover:underline">
                        {invoice.invoice_number}
                      </Link>
                      <p className="text-sm text-muted">{invoice.platform?.name || invoice.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-heading">{formatCurrency(invoice.total || 0)}</p>
                      <Badge variant={
                        invoice.status === 'paid' ? 'success' :
                        invoice.status === 'overdue' ? 'error' :
                        invoice.status === 'sent' ? 'default' : 'outline'
                      }>
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center py-8">No invoices yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Payroll batches */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Payroll Batches</CardTitle>
            <Link href="/dashboard/payroll">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {payrollBatches.length > 0 ? (
              <div className="space-y-3">
                {payrollBatches.map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium text-heading">
                        {new Date(batch.period_start).toLocaleDateString('en-GB')} - {new Date(batch.period_end).toLocaleDateString('en-GB')}
                      </p>
                      <p className="text-sm text-muted">
                        Gross: {formatCurrency(batch.total_gross || 0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-heading">{formatCurrency(batch.total_net || 0)}</p>
                      <Badge variant={
                        batch.status === 'completed' ? 'success' :
                        batch.status === 'processing' ? 'default' : 'warning'
                      }>
                        {batch.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center py-8">No payroll batches yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/invoices/new">
              <Button variant="outline">Create Invoice</Button>
            </Link>
            <Link href="/dashboard/payroll/new">
              <Button variant="outline">Run Payroll</Button>
            </Link>
            <Link href="/dashboard/finance">
              <Button variant="outline">COD Tracking</Button>
            </Link>
            <Link href="/dashboard/vendors">
              <Button variant="outline">Vendors</Button>
            </Link>
            <Link href="/dashboard/reports">
              <Button variant="outline">Generate Report</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}