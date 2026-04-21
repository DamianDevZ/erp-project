import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';

/**
 * Finance page - COD tracking and financial overview.
 */
export default async function FinancePage() {
  const supabase = await createClient();

  const [ordersResult, remittancesResult, invoicesResult] = await Promise.all([
    // Get orders with COD in last 30 days
    supabase
      .from('orders')
      .select('id, external_order_id, total_revenue, cod_amount, status, created_at, employee:employees(full_name), client:clients(name)')
      .gt('cod_amount', 0)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50),
    // Get COD remittances
    supabase
      .from('cod_remittances')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20),
    // Get recent invoices
    supabase
      .from('invoices')
      .select('id, invoice_number, title, total, status, due_at, client:clients(name)')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const { data: codOrders } = ordersResult;
  const { data: remittances } = remittancesResult;
  const { data: invoices } = invoicesResult;

  // Calculate COD stats
  const totalCodCollected = codOrders?.reduce((sum, o) => sum + (o.cod_amount || 0), 0) || 0;
  const totalCodRemitted = remittances?.reduce((sum, r) => sum + (r.total_cod_collected || 0), 0) || 0;
  const pendingCod = totalCodCollected - totalCodRemitted;
  const pendingInvoices = invoices?.filter(i => i.status === 'sent' || i.status === 'overdue') || [];
  const pendingInvoiceTotal = pendingInvoices.reduce((sum, i) => sum + (i.total || 0), 0);

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'BHD 0.000';
    return new Intl.NumberFormat('en-BH', { style: 'currency', currency: 'BHD' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
      draft: 'outline',
      sent: 'default',
      paid: 'success',
      overdue: 'error',
      cancelled: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Finance</h1>
          <p className="text-muted">Track COD collections, remittances, and invoices.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/invoices/new">
            <Button variant="outline">Create Invoice</Button>
          </Link>
          <Button>New Remittance</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-heading">{formatCurrency(totalCodCollected)}</div>
            <p className="text-sm text-muted">COD Collected (30 days)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">{formatCurrency(pendingCod)}</div>
            <p className="text-sm text-muted">Pending Remittance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-heading">{formatCurrency(pendingInvoiceTotal)}</div>
            <p className="text-sm text-muted">Outstanding Invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-heading">{pendingInvoices.length}</div>
            <p className="text-sm text-muted">Invoices Pending</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent COD orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent COD Collections</CardTitle>
            <Link href="/dashboard/orders?cod=true">
              <Button size="sm" variant="outline">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {codOrders && codOrders.length > 0 ? (
              <div className="space-y-3">
                {codOrders.slice(0, 8).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div>
                      <Link href={`/dashboard/orders/${order.id}`} className="font-medium text-primary hover:underline">
                        {order.external_order_id || order.id}
                      </Link>
                      <p className="text-sm text-muted">
                        {(order.employee as { full_name: string } | null)?.full_name} • {(order.client as { name: string } | null)?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-heading">{formatCurrency(order.cod_amount)}</p>
                      <p className="text-xs text-muted">
                        {new Date(order.created_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted">
                <p>No COD orders in the last 30 days</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Link href="/dashboard/invoices">
              <Button size="sm" variant="outline">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {invoices && invoices.length > 0 ? (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div>
                      <Link href={`/dashboard/invoices/${invoice.id}`} className="font-medium text-primary hover:underline">
                        {invoice.invoice_number}
                      </Link>
                      <p className="text-sm text-muted">
                        {(invoice.client as { name: string } | null)?.name || invoice.title}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-heading">{formatCurrency(invoice.total)}</p>
                      <div className="mt-1">{getStatusBadge(invoice.status)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted">
                <p>No invoices yet</p>
                <Link href="/dashboard/invoices/new">
                  <Button className="mt-2" size="sm">Create First Invoice</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Remittances */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>COD Remittances</CardTitle>
          <Button>Record Remittance</Button>
        </CardHeader>
        <CardContent>
          {remittances && remittances.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Remittance #</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Period</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted">COD Collected</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted">Commission</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted">Our Share</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {remittances.map((rem) => (
                    <tr key={rem.id} className="border-b border-border">
                      <td className="px-4 py-3 font-medium">{rem.remittance_number}</td>
                      <td className="px-4 py-3 text-sm text-body">
                        {new Date(rem.period_start).toLocaleDateString()} - {new Date(rem.period_end).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">{formatCurrency(rem.total_cod_collected)}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatCurrency(rem.platform_commission)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(rem.our_share)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={rem.status === 'verified' ? 'success' : 'warning'}>
                          {rem.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted">
              <p>No remittances recorded yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}