import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PerformanceList } from './PerformanceList';
import { Button, PageHeader, PageContent, StatsGrid } from '@/components/ui';

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
    <PageContent>
      <PageHeader
        title="Performance & Discipline"
        description="Track incidents, warnings, and employee performance"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Performance' },
        ]}
        actions={
          <Link href="/dashboard/performance/new">
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              New Record
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <StatsGrid
        stats={[
          { label: 'Total Records', value: stats.total },
          { label: 'Open Cases', value: stats.open },
          { label: 'Under Review', value: stats.underReview },
          { label: 'Commendations', value: stats.commendations },
        ]}
      />

      {/* List */}
      <PerformanceList records={records || []} />
    </PageContent>
  );
}
