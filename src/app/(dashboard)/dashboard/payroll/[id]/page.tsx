import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  Badge, Button,
  PageHeader, PageContent, DetailLayout, DetailCard, DetailItem, DetailGrid,
} from '@/components/ui';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PayrollDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: payroll, error } = await supabase
    .from('payroll')
    .select('*, employee:employees(id, full_name, employee_number)')
    .eq('id', id)
    .single();

  if (error || !payroll) {
    notFound();
  }

  const formatCurrency = (amount: number | null) =>
    amount != null
      ? new Intl.NumberFormat('en-BH', { style: 'currency', currency: 'BHD' }).format(amount)
      : '—';

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-BH') : '—';

  const employee = payroll.employee as { id: string; full_name: string; employee_number: string | null } | null;

  const statusVariants: Record<string, string> = {
    draft: 'secondary',
    pending: 'warning',
    approved: 'success',
    paid: 'success',
    cancelled: 'destructive',
  };

  return (
    <PageContent>
      <PageHeader
        title={`Payroll #${payroll.payroll_number}`}
        description={
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={(statusVariants[payroll.status] as any) || 'secondary'}>
              {payroll.status}
            </Badge>
          </div>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Payroll', href: '/dashboard/payroll' },
          { label: payroll.payroll_number },
        ]}
        actions={
          <Link href="/dashboard/payroll">
            <Button variant="outline">Back to Payroll</Button>
          </Link>
        }
      />

      <DetailLayout>
        <DetailCard title="Payroll Details">
          <DetailGrid>
            <DetailItem label="Payroll #" value={payroll.payroll_number} />
            <DetailItem label="Status" value={
              <Badge variant={(statusVariants[payroll.status] as any) || 'secondary'}>
                {payroll.status}
              </Badge>
            } />
            <DetailItem label="Employee" value={
              employee ? (
                <Link href={`/dashboard/employees/${employee.id}`} className="text-primary hover:underline">
                  {employee.full_name}
                </Link>
              ) : '—'
            } />
            <DetailItem label="Employee #" value={employee?.employee_number || '—'} />
            <DetailItem label="Period Start" value={formatDate(payroll.period_start)} />
            <DetailItem label="Period End" value={formatDate(payroll.period_end)} />
            <DetailItem label="Payment Date" value={formatDate(payroll.payment_date)} />
            <DetailItem label="Rider Category" value={payroll.rider_category || '—'} />
          </DetailGrid>
        </DetailCard>

        <DetailCard title="Earnings">
          <DetailGrid>
            <DetailItem label="Base Salary" value={formatCurrency(payroll.base_salary)} />
            <DetailItem label="Orders Count" value={payroll.orders_count ?? 0} />
            <DetailItem label="Order Earnings" value={formatCurrency(payroll.order_earnings)} />
            <DetailItem label="Hours Worked" value={payroll.hours_worked != null ? `${payroll.hours_worked}h` : '—'} />
            <DetailItem label="Hourly Earnings" value={formatCurrency(payroll.hourly_earnings)} />
            <DetailItem label="Overtime Hours" value={payroll.overtime_hours != null ? `${payroll.overtime_hours}h` : '—'} />
            <DetailItem label="Overtime Pay" value={formatCurrency(payroll.overtime_pay)} />
            <DetailItem label="Incentives" value={formatCurrency(payroll.incentives)} />
            <DetailItem label="Tips" value={formatCurrency(payroll.tips)} />
            <DetailItem label="Vehicle Allowance" value={formatCurrency(payroll.vehicle_allowance)} />
            <DetailItem label="Phone Allowance" value={formatCurrency(payroll.phone_allowance)} />
            <DetailItem label="Fuel Allowance" value={formatCurrency(payroll.fuel_allowance)} />
            <DetailItem label="Other Allowances" value={formatCurrency(payroll.other_allowances)} />
            <DetailItem label="Gross Pay" value={<span className="font-semibold">{formatCurrency(payroll.gross_pay)}</span>} />
          </DetailGrid>
        </DetailCard>

        <DetailCard title="Deductions">
          <DetailGrid>
            <DetailItem label="Vehicle Deduction" value={formatCurrency(payroll.vehicle_deduction)} />
            <DetailItem label="Uniform Deduction" value={formatCurrency(payroll.uniform_deduction)} />
            <DetailItem label="Equipment Deduction" value={formatCurrency(payroll.equipment_deduction)} />
            <DetailItem label="Damage Deduction" value={formatCurrency(payroll.damage_deduction)} />
            <DetailItem label="Advance Recovery" value={formatCurrency(payroll.advance_recovery)} />
            <DetailItem label="Absence Deduction" value={formatCurrency(payroll.absence_deduction)} />
            <DetailItem label="Other Deductions" value={formatCurrency(payroll.other_deductions)} />
            <DetailItem label="Total Deductions" value={<span className="font-semibold text-error">{formatCurrency(payroll.total_deductions)}</span>} />
          </DetailGrid>
        </DetailCard>

        <DetailCard title="Net Pay">
          <DetailGrid>
            <DetailItem label="Net Pay" value={<span className="text-xl font-bold text-success">{formatCurrency(payroll.net_pay)}</span>} />
            <DetailItem label="Payment Method" value={payroll.payment_method || '—'} />
            <DetailItem label="Payment Reference" value={payroll.payment_reference || '—'} />
            <DetailItem label="WPS Included" value={
              <Badge variant={payroll.wps_included ? 'success' : 'secondary'}>
                {payroll.wps_included ? 'Yes' : 'No'}
              </Badge>
            } />
            {payroll.wps_reference && <DetailItem label="WPS Reference" value={payroll.wps_reference} />}
            {payroll.notes && <DetailItem label="Notes" value={payroll.notes} />}
          </DetailGrid>
        </DetailCard>
      </DetailLayout>
    </PageContent>
  );
}
