'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardHeader, CardTitle, CardContent, Label, Input } from '@/components/ui';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

/**
 * Create new payroll run page.
 */
export default function NewPayrollPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [periodStart, setPeriodStart] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  });
  const [paymentDate, setPaymentDate] = useState(() => {
    const now = new Date();
    const payDate = new Date(now.getFullYear(), now.getMonth() + 1, 5);
    return payDate.toISOString().split('T')[0];
  });
  const [department, setDepartment] = useState<string>('all');
  const [riderCategory, setRiderCategory] = useState<string>('all');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const supabase = createClient();

    // Generate batch number
    const batchNumber = `PR-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

    // Get organization from first employee (simplified - in production use auth context)
    const { data: firstEmp } = await supabase.from('employees').select('organization_id').limit(1).single();
    if (!firstEmp) {
      setError('No employees found');
      return;
    }

    // Create payroll batch
    const { data, error: insertError } = await supabase
      .from('payroll')
      .insert({
        organization_id: firstEmp.organization_id,
        batch_number: batchNumber,
        period_start: periodStart,
        period_end: periodEnd,
        payment_date: paymentDate,
        department: department === 'all' ? null : department,
        rider_category: riderCategory === 'all' ? null : riderCategory,
        status: 'draft',
        total_employees: 0,
        total_gross_pay: 0,
        total_deductions: 0,
        total_net_pay: 0,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    startTransition(() => {
      router.push(`/dashboard/payroll/${data.id}`);
    });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">New Payroll Run</h1>
          <p className="text-muted">Create a new payroll batch for processing.</p>
        </div>
        <Link href="/dashboard/payroll">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Payroll Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            {/* Period dates */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="periodStart">Period Start</Label>
                <Input
                  id="periodStart"
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodEnd">Period End</Label>
                <Input
                  id="periodEnd"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Filters */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rider Category</Label>
                <Select value={riderCategory} onValueChange={setRiderCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
              <strong>Note:</strong> After creating this payroll run, you&apos;ll be able to:
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Review and adjust individual employee calculations</li>
                <li>Add bonuses or deductions</li>
                <li>Generate WPS file for bank transfers</li>
                <li>Approve and process the payroll</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Link href="/dashboard/payroll">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating...' : 'Create Payroll Run'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
