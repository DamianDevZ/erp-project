import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';

/**
 * Payroll list page.
 * Shows payroll batches with status and actions.
 */
export default async function PayrollPage() {
  const supabase = await createClient();

  const { data: payrollBatches } = await supabase
    .from('payroll')
    .select('*')
    .order('period_end', { ascending: false })
    .limit(50);

  // Get summary stats
  const pendingCount = payrollBatches?.filter(p => p.status === 'pending' || p.status === 'draft').length || 0;
  const processingCount = payrollBatches?.filter(p => p.status === 'processing').length || 0;
  const completedThisMonth = payrollBatches?.filter(p => {
    const date = new Date(p.period_end);
    const now = new Date();
    return p.status === 'completed' && date.getMonth() === now.getMonth();
  }).length || 0;

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'BHD 0.000';
    return new Intl.NumberFormat('en-BH', { style: 'currency', currency: 'BHD' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
      draft: 'outline',
      pending: 'warning',
      processing: 'warning',
      calculated: 'default',
      approved: 'success',
      completed: 'success',
      rejected: 'error',
      cancelled: 'error',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Payroll</h1>
          <p className="text-muted">Manage payroll batches and process payments.</p>
        </div>
        <Link href="/dashboard/payroll/new">
          <Button>New Payroll Run</Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-heading">{pendingCount}</div>
            <p className="text-sm text-muted">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-heading">{processingCount}</div>
            <p className="text-sm text-muted">Processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-heading">{completedThisMonth}</div>
            <p className="text-sm text-muted">Completed This Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-heading">
              {formatCurrency(payrollBatches?.reduce((sum, p) => sum + (p.total_net_pay || 0), 0) || 0)}
            </div>
            <p className="text-sm text-muted">Total Processed</p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll batches list */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {payrollBatches && payrollBatches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Batch</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Period</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Employees</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Gross Pay</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Deductions</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Net Pay</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollBatches.map((batch) => (
                    <tr key={batch.id} className="border-b border-border hover:bg-hover">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/payroll/${batch.id}`} className="font-medium text-primary hover:underline">
                          {batch.batch_number || `PR-${batch.id.slice(0, 8)}`}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-body">
                        {new Date(batch.period_start).toLocaleDateString()} - {new Date(batch.period_end).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-body">{batch.total_employees || 0}</td>
                      <td className="px-4 py-3 text-sm text-body">{formatCurrency(batch.total_gross_pay)}</td>
                      <td className="px-4 py-3 text-sm text-body">{formatCurrency(batch.total_deductions)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-heading">{formatCurrency(batch.total_net_pay)}</td>
                      <td className="px-4 py-3">{getStatusBadge(batch.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link href={`/dashboard/payroll/${batch.id}`}>
                            <Button size="sm" variant="outline">View</Button>
                          </Link>
                          {(batch.status === 'draft' || batch.status === 'pending') && (
                            <Button size="sm" variant="outline">Approve</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="h-12 w-12 mx-auto text-muted opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-heading">No payroll batches yet</h3>
              <p className="mt-1 text-sm text-muted">Create your first payroll run to get started.</p>
              <Link href="/dashboard/payroll/new">
                <Button className="mt-4">Create Payroll Run</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}