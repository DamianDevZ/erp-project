import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { EmployeeStatusBadge, EmployeeRoleBadge } from '@/features/employees';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Employee detail page.
 */
export default async function EmployeeDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !employee) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">{employee.full_name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <EmployeeRoleBadge role={employee.role} />
            <EmployeeStatusBadge status={employee.status} />
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/employees/${id}/edit`}>
            <Button>Edit</Button>
          </Link>
          <Link href="/dashboard/employees">
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </div>

      {/* Employee info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted">Email</p>
              <p className="font-medium text-heading">{employee.email || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Phone</p>
              <p className="font-medium text-heading">{employee.phone || 'Not provided'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted">Hire Date</p>
              <p className="font-medium text-heading">
                {employee.hire_date 
                  ? new Date(employee.hire_date).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted">Termination Date</p>
              <p className="font-medium text-heading">
                {employee.termination_date 
                  ? new Date(employee.termination_date).toLocaleDateString()
                  : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform assignments (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted">Platform assignments will be shown here.</p>
        </CardContent>
      </Card>

      {/* Documents (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted">Employee documents will be shown here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
