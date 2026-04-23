'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
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
    // Cost section
    totalPayrollCost: 0,
    totalDeductions: 0,
    grossProfit: 0,
    payrollBatchCount: 0,
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
          totalPayrollCost: 0,
          totalDeductions: 0,
          grossProfit: 0,
          payrollBatchCount: 0,
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
          .select('id, total_revenue, net_revenue, status, created_at')
          .gte('created_at', thirtyDaysAgo),
        supabase
          .from('payroll_batches')
          .select('id, period_start, period_end, status, total_gross_pay, total_net_pay, total_employees')
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

      // Order revenue (30 days)
      const codCollected = orders
        .filter(o => o.status === 'completed')
        .reduce((sum: number, o: any) => sum + (o.total_revenue || 0), 0);
      const codPending = orders
        .filter(o => o.status === 'pending')
        .reduce((sum: number, o: any) => sum + (o.total_revenue || 0), 0);

      const payrollPending = payroll.filter(p => p.status === 'pending' || p.status === 'processing').length;

      // Cost calculations
      const totalPayrollCost = payroll
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (p.total_net_pay || 0), 0);
      const grossProfit = totalRevenue - totalPayrollCost;

      setStats({
        totalRevenue,
        pendingInvoices: pendingInvoices.length,
        pendingInvoiceAmount,
        overdueInvoices: overdueInvoices.length,
        codCollected,
        codPending,
        payrollPending,
        totalPayrollCost,
        totalDeductions: 0, // extend when deductions table is queried
        grossProfit,
        payrollBatchCount: payroll.length,
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

  const paidInvoices = recentInvoices.filter(i => i.status === 'paid').length;
  const sentInvoices = recentInvoices.filter(i => i.status === 'sent' || i.status === 'draft').length;
  const totalInvoiceCount = recentInvoices.length || 1;

  const invoiceChartData = [
    { name: 'Paid', value: paidInvoices, color: '#22c55e' },
    { name: 'Pending', value: sentInvoices, color: '#3b82f6' },
    { name: 'Overdue', value: stats.overdueInvoices, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const revenueBarData = [
    { name: 'Revenue', value: stats.totalRevenue },
    { name: 'Payroll Cost', value: stats.totalPayrollCost },
    { name: 'Gross Profit', value: stats.grossProfit },
  ];

  const orderRevenueBarData = [
    { name: 'Completed', value: stats.codCollected, fill: '#22c55e' },
    { name: 'Pending', value: stats.codPending, fill: '#f59e0b' },
  ];

  const margin = stats.totalRevenue > 0 ? Math.round((stats.grossProfit / stats.totalRevenue) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Finance Dashboard</h1>
          <p className="text-muted">Financial overview • {clientLabel}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/invoices/new"><Button variant="outline">Create Invoice</Button></Link>
          <Link href="/dashboard/payroll/new"><Button>Run Payroll</Button></Link>
        </div>
      </div>

      {/* Alerts */}
      {(stats.overdueInvoices > 0 || stats.payrollPending > 0) && (
        <div className="rounded-lg border border-warning bg-warning/10 p-4">
          <h3 className="font-semibold text-warning">Requires Attention</h3>
          <div className="mt-2 flex flex-wrap gap-4">
            {stats.overdueInvoices > 0 && <span className="text-sm text-body">⚠ {stats.overdueInvoices} invoice(s) overdue</span>}
            {stats.payrollPending > 0 && <span className="text-sm text-body">💰 {stats.payrollPending} payroll batch(es) pending</span>}
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border border-l-4 border-l-success bg-card p-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Total Revenue</p>
          <p className="text-2xl font-bold mt-1 text-success">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-xs text-muted mt-1">paid invoices</p>
        </div>
        <div className={`rounded-lg border border-border border-l-4 ${stats.grossProfit >= 0 ? 'border-l-primary' : 'border-l-error'} bg-card p-4`}>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Gross Profit</p>
          <p className={`text-2xl font-bold mt-1 ${stats.grossProfit >= 0 ? 'text-primary' : 'text-error'}`}>{formatCurrency(stats.grossProfit)}</p>
          <p className="text-xs text-muted mt-1">{margin}% margin</p>
        </div>
        <div className="rounded-lg border border-border border-l-4 border-l-error bg-card p-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Payroll Cost</p>
          <p className="text-2xl font-bold mt-1 text-error">{formatCurrency(stats.totalPayrollCost)}</p>
          <p className="text-xs text-muted mt-1">{stats.payrollBatchCount} batch(es)</p>
        </div>
        <div className="rounded-lg border border-border border-l-4 border-l-warning bg-card p-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Pending Invoices</p>
          <p className="text-2xl font-bold mt-1 text-warning">{formatCurrency(stats.pendingInvoiceAmount)}</p>
          <p className="text-xs text-muted mt-1">{stats.pendingInvoices} invoice(s)</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Invoice Status</CardTitle></CardHeader>
          <CardContent>
            {invoiceChartData.length > 0 ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative h-52 w-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={invoiceChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={96} dataKey="value" stroke="transparent" paddingAngle={2}>
                        {invoiceChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-heading">{recentInvoices.length}</span>
                    <span className="text-xs text-muted">invoices</span>
                  </div>
                </div>
                <div className="w-full grid grid-cols-2 gap-2">
                  {invoiceChartData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 p-2 rounded-lg bg-hover">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ background: d.color }} />
                      <div>
                        <p className="text-xs text-muted">{d.name}</p>
                        <p className="text-sm font-bold text-heading">{d.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted text-center py-16">No invoice data.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Revenue vs Cost</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueBarData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                  <Tooltip formatter={(v) => [formatCurrency(Number(v)), '']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={80}>
                    {revenueBarData.map((entry, i) => (
                      <Cell key={i} fill={i === 0 ? '#22c55e' : i === 1 ? '#ef4444' : entry.value >= 0 ? '#3b82f6' : '#f97316'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Revenue (30 days) */}
      <Card>
        <CardHeader><CardTitle>Order Revenue — Last 30 Days</CardTitle></CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderRevenueBarData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v)), '']} />
                <Bar dataKey="value" name="Revenue (BHD)" radius={[4, 4, 0, 0]} maxBarSize={120}>
                  {orderRevenueBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-hover text-center">
              <p className="text-xl font-bold text-success">{formatCurrency(stats.codCollected)}</p>
              <p className="text-xs text-muted mt-0.5">Completed Orders Revenue</p>
            </div>
            <div className="p-3 rounded-lg bg-hover text-center">
              <p className="text-xl font-bold text-warning">{formatCurrency(stats.codPending)}</p>
              <p className="text-xs text-muted mt-0.5">Pending Orders Revenue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent invoices + Payroll */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Link href="/dashboard/invoices"><Button variant="outline" size="sm">View All</Button></Link>
          </CardHeader>
          <CardContent>
            {recentInvoices.length > 0 ? (
              <div className="space-y-2">
                {recentInvoices.slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <Link href={`/dashboard/invoices/${invoice.id}`} className="font-medium text-primary hover:underline text-sm">
                        {invoice.invoice_number}
                      </Link>
                      <p className="text-xs text-muted">{(invoice.platform as unknown as { name: string } | null)?.name || invoice.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-heading text-sm">{formatCurrency(invoice.total || 0)}</p>
                      <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'error' : invoice.status === 'sent' ? 'default' : 'outline'}>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Payroll Batches</CardTitle>
            <Link href="/dashboard/payroll"><Button variant="outline" size="sm">View All</Button></Link>
          </CardHeader>
          <CardContent>
            {payrollBatches.length > 0 ? (
              <div className="space-y-2">
                {payrollBatches.slice(0, 5).map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium text-heading text-sm">
                        {new Date(batch.period_start).toLocaleDateString('en-GB')} – {new Date(batch.period_end).toLocaleDateString('en-GB')}
                      </p>
                      <p className="text-xs text-muted">Gross: {formatCurrency(batch.total_gross_pay || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-heading text-sm">{formatCurrency(batch.total_net_pay || 0)}</p>
                      <Badge variant={batch.status === 'completed' ? 'success' : batch.status === 'processing' ? 'default' : 'warning'}>
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
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/invoices/new"><Button variant="outline">Create Invoice</Button></Link>
            <Link href="/dashboard/payroll/new"><Button variant="outline">Run Payroll</Button></Link>
            <Link href="/dashboard/finance"><Button variant="outline">COD Tracking</Button></Link>
            <Link href="/dashboard/vendors"><Button variant="outline">Vendors</Button></Link>
            <Link href="/dashboard/reports"><Button variant="outline">Generate Report</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
