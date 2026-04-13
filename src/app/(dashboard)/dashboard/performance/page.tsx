import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PerformanceList } from './PerformanceList';
import { Button } from '@/components/ui';

// Icons
function ShieldExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export default async function PerformanceDisciplinePage() {
  const supabase = await createClient();

  // Fetch performance/discipline records with employee info
  const { data: records, error } = await supabase
    .from('performance_discipline')
    .select(`
      *,
      employee:employees!performance_discipline_employee_id_fkey(
        id,
        full_name,
        employee_id
      ),
      reporter:employees!performance_discipline_reporter_id_fkey(
        id,
        full_name
      )
    `)
    .order('incident_date', { ascending: false });

  if (error) {
    console.error('Error fetching performance records:', error);
  }

  // Stats
  const stats = {
    total: records?.length || 0,
    open: records?.filter(r => r.status === 'open').length || 0,
    underReview: records?.filter(r => r.status === 'under_review').length || 0,
    commendations: records?.filter(r => r.type === 'commendation').length || 0,
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldExclamationIcon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-heading">Performance & Discipline</h1>
            <p className="text-sm text-muted">Track incidents, warnings, and employee performance</p>
          </div>
        </div>
        <Link href="/dashboard/performance/new">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Record
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-sm text-muted">Total Records</div>
          <div className="mt-2 text-2xl font-semibold text-heading">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-sm text-muted">Open Cases</div>
          <div className="mt-2 text-2xl font-semibold text-blue-600">{stats.open}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-sm text-muted">Under Review</div>
          <div className="mt-2 text-2xl font-semibold text-yellow-600">{stats.underReview}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-sm text-muted">Commendations</div>
          <div className="mt-2 text-2xl font-semibold text-green-600">{stats.commendations}</div>
        </div>
      </div>

      {/* List */}
      <PerformanceList records={records || []} />
    </div>
  );
}
