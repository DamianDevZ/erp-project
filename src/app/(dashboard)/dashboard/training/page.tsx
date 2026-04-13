import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { TrainingList } from './TrainingList';
import { Button } from '@/components/ui';

// Icons
function AcademicCapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
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

export default async function TrainingPage() {
  const supabase = await createClient();

  // Fetch training courses
  const { data: courses, error: coursesError } = await supabase
    .from('training_courses')
    .select('*')
    .order('name');

  // Fetch employee trainings with joined data
  const { data: trainings, error: trainingsError } = await supabase
    .from('employee_trainings')
    .select(`
      *,
      employee:employees!employee_trainings_employee_id_fkey(
        id,
        full_name,
        employee_id
      ),
      course:training_courses!employee_trainings_course_id_fkey(*)
    `)
    .order('assigned_at', { ascending: false });

  if (coursesError) {
    console.error('Error fetching courses:', coursesError);
  }
  if (trainingsError) {
    console.error('Error fetching trainings:', trainingsError);
  }

  // Stats
  const stats = {
    totalCourses: courses?.filter(c => c.is_active).length || 0,
    totalAssignments: trainings?.length || 0,
    completed: trainings?.filter(t => t.status === 'completed').length || 0,
    inProgress: trainings?.filter(t => t.status === 'in_progress').length || 0,
    overdue: trainings?.filter(t => 
      t.due_date && 
      new Date(t.due_date) < new Date() && 
      t.status !== 'completed'
    ).length || 0,
    expiringSoon: trainings?.filter(t => {
      if (!t.expiry_date || t.status !== 'completed') return false;
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return new Date(t.expiry_date) <= thirtyDaysFromNow;
    }).length || 0,
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <AcademicCapIcon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-heading">Training & Development</h1>
            <p className="text-sm text-muted">Track courses, certifications, and employee training</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/training/assign">
            <Button variant="outline">
              Assign Training
            </Button>
          </Link>
          <Link href="/dashboard/training/courses/new">
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              New Course
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm text-muted">Active Courses</div>
          <div className="mt-1 text-2xl font-semibold text-heading">{stats.totalCourses}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm text-muted">Assignments</div>
          <div className="mt-1 text-2xl font-semibold text-heading">{stats.totalAssignments}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm text-muted">Completed</div>
          <div className="mt-1 text-2xl font-semibold text-green-600">{stats.completed}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm text-muted">In Progress</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">{stats.inProgress}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm text-muted">Overdue</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">{stats.overdue}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm text-muted">Expiring Soon</div>
          <div className="mt-1 text-2xl font-semibold text-orange-600">{stats.expiringSoon}</div>
        </div>
      </div>

      {/* Tabs for Courses vs Assignments */}
      <TrainingList 
        courses={courses || []} 
        trainings={trainings || []} 
      />
    </div>
  );
}
