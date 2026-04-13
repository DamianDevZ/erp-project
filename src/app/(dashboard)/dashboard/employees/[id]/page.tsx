import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
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

  const [employeeResult, coachingsResult] = await Promise.all([
    supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('coachings')
      .select('*')
      .eq('employee_id', id)
      .order('coaching_date', { ascending: false })
      .order('coaching_time', { ascending: false })
      .limit(10),
  ]);

  const { data: employee, error } = employeeResult;
  const { data: coachings } = coachingsResult;

  if (error || !employee) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-heading">{employee.full_name}</h1>
            {employee.employee_id && (
              <Badge variant="outline">{employee.employee_id}</Badge>
            )}
          </div>
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
            {employee.employee_id && (
              <div>
                <p className="text-sm text-muted">Employee ID</p>
                <p className="font-medium text-heading">{employee.employee_id}</p>
              </div>
            )}
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

      {/* Coaching History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Coaching History</CardTitle>
          <Link href={`/dashboard/coaching/new?employee_id=${id}`}>
            <Button size="sm">Add Coaching</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {coachings && coachings.length > 0 ? (
            <div className="space-y-3">
              {coachings.map((coaching) => (
                <Link
                  key={coaching.id}
                  href={`/dashboard/coaching/${coaching.id}`}
                  className="block rounded-lg border border-border p-3 hover:bg-hover transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-heading">
                      {new Date(coaching.coaching_date).toLocaleDateString()}
                      {coaching.coaching_time && (
                        <span className="ml-2 text-muted">
                          at {coaching.coaching_time.slice(0, 5)}
                        </span>
                      )}
                    </div>
                  </div>
                  {coaching.notes && (
                    <p className="mt-1 text-sm text-muted line-clamp-2">
                      {coaching.notes}
                    </p>
                  )}
                </Link>
              ))}
              <div className="pt-2">
                <Link 
                  href={`/dashboard/coaching?employee_id=${id}`}
                  className="text-sm text-primary hover:underline"
                >
                  View all coaching sessions →
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-muted">No coaching sessions recorded yet.</p>
          )}
        </CardContent>
      </Card>

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
