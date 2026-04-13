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

  const [employeeResult, coachingsResult, assignmentsResult, documentsResult] = await Promise.all([
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
      .limit(20),
    supabase
      .from('platform_assignments')
      .select('*, platform:platforms(id, name)')
      .eq('employee_id', id)
      .order('start_date', { ascending: false }),
    supabase
      .from('employee_documents')
      .select('*')
      .eq('employee_id', id)
      .order('created_at', { ascending: false }),
  ]);

  const { data: employee, error } = employeeResult;
  const { data: coachings } = coachingsResult;
  const { data: assignments } = assignmentsResult;
  const { data: documents } = documentsResult;

  if (error || !employee) {
    notFound();
  }

  // Get active platform assignments
  const activeAssignments = assignments?.filter(a => a.status === 'active') || [];

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

      {/* Employee info - Contact & Employment with Platform Assignments */}
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
            {employee.termination_date && (
              <div>
                <p className="text-sm text-muted">Termination Date</p>
                <p className="font-medium text-heading">
                  {new Date(employee.termination_date).toLocaleDateString()}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted">Client Assignments</p>
              {activeAssignments.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {activeAssignments.map((assignment) => (
                    <Badge key={assignment.id} variant="default">
                      {assignment.platform?.name || 'Unknown'}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="font-medium text-heading">No active assignments</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History & Attachments - 70/30 split */}
      <div className="grid gap-6 lg:grid-cols-[7fr_3fr]">
        {/* Left Column - History (70%) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>History</CardTitle>
            <Link href={`/dashboard/coaching/new?employee_id=${id}`}>
              <Button size="sm">Add Coaching</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Timeline of events */}
              {(coachings && coachings.length > 0) || employee.created_at ? (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
                  
                  <div className="space-y-4">
                    {/* Coaching sessions */}
                    {coachings?.map((coaching) => (
                      <Link
                        key={coaching.id}
                        href={`/dashboard/coaching/${coaching.id}`}
                        className="relative flex gap-4 pl-8 group"
                      >
                        <div className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full bg-blue-500 border-2 border-background" />
                        <div className="flex-1 rounded-lg border border-border p-3 hover:bg-hover transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-heading">Coaching Session</span>
                            <span className="text-xs text-muted">
                              {new Date(coaching.coaching_date).toLocaleDateString()}
                            </span>
                          </div>
                          {coaching.notes && (
                            <p className="mt-1 text-sm text-muted line-clamp-2">
                              {coaching.notes}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}

                    {/* Employee created event */}
                    <div className="relative flex gap-4 pl-8">
                      <div className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                      <div className="flex-1 rounded-lg border border-border p-3 bg-background-subtle">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-heading">Employee Created</span>
                          <span className="text-xs text-muted">
                            {new Date(employee.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted">
                          {employee.full_name} was added to the system
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted">No history available.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Attachments (30%) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Attachments</CardTitle>
            <Button size="sm" variant="outline" disabled>
              Upload
            </Button>
          </CardHeader>
          <CardContent>
            {documents && documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-border p-2 hover:bg-hover transition-colors"
                  >
                    <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-heading truncate">
                        {doc.file_name || 'Document'}
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted">
                <svg className="h-10 w-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-sm">No attachments yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
