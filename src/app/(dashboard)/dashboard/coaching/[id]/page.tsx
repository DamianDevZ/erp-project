import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Coaching session detail page.
 */
export default async function CoachingDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: coaching, error } = await supabase
    .from('coachings')
    .select(`
      *,
      employee:employees(id, full_name, employee_id, email, phone)
    `)
    .eq('id', id)
    .single();

  if (error || !coaching) {
    notFound();
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link 
            href="/dashboard/coaching"
            className="inline-flex items-center text-sm text-muted hover:text-heading mb-2"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Coaching
          </Link>
          <h1 className="text-2xl font-bold text-heading">Coaching Session</h1>
          <p className="text-muted">{formatDate(coaching.coaching_date)} at {formatTime(coaching.coaching_date)}</p>
        </div>
        <Link href={`/dashboard/coaching/${id}/edit`}>
          <Button variant="outline">
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Button>
        </Link>
      </div>

      {/* Employee Info */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Employee</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg">
              {coaching.employee?.full_name?.charAt(0) || '?'}
            </div>
            <div>
              <Link
                href={`/dashboard/employees/${coaching.employee_id}`}
                className="text-lg font-semibold text-heading hover:text-primary"
              >
                {coaching.employee?.full_name || 'Unknown Employee'}
              </Link>
              {coaching.employee?.employee_id && (
                <p className="text-sm text-muted font-mono">{coaching.employee.employee_id}</p>
              )}
              <div className="flex gap-4 mt-1 text-sm text-muted">
                {coaching.employee?.email && <span>{coaching.employee.email}</span>}
                {coaching.employee?.phone && <span>{coaching.employee.phone}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Coaching Notes</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {coaching.notes ? (
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-body">{coaching.notes}</p>
            </div>
          ) : (
            <p className="text-muted italic">No notes recorded for this session.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
