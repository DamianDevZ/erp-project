import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PerformanceForm } from '../../PerformanceForm';
import type { PerformanceDiscipline } from '@/features/performance';

// Icons
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function ShieldExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
    </svg>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPerformanceRecordPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the record
  const { data: record, error } = await supabase
    .from('performance_discipline')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !record) {
    notFound();
  }

  // Fetch employees for the dropdown
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, employee_id')
    .order('full_name');

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/performance" className="text-muted hover:text-heading transition-colors">
          Performance & Discipline
        </Link>
        <span className="text-muted">/</span>
        <span className="text-heading font-medium">Edit Record</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/performance" 
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted hover:bg-hover hover:text-heading transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <ShieldExclamationIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-heading">Edit Record</h1>
            <p className="text-sm text-muted">{record.title}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <PerformanceForm record={record as PerformanceDiscipline} employees={employees || []} />
    </div>
  );
}
