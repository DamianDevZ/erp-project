import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AssignTrainingForm } from '../AssignTrainingForm';

// Icons
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  );
}

export default async function AssignTrainingPage() {
  const supabase = await createClient();

  // Fetch employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, employee_id')
    .order('full_name');

  // Fetch active courses
  const { data: courses } = await supabase
    .from('training_courses')
    .select('*')
    .eq('is_active', true)
    .order('name');

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/training" className="text-muted hover:text-heading transition-colors">
          Training
        </Link>
        <span className="text-muted">/</span>
        <span className="text-heading font-medium">Assign Training</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/training" 
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted hover:bg-hover hover:text-heading transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <UserPlusIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-heading">Assign Training</h1>
            <p className="text-sm text-muted">Assign a training course to an employee</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <AssignTrainingForm employees={employees || []} courses={courses || []} />
    </div>
  );
}
