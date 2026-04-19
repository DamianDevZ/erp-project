import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { TrainingList } from './TrainingList';
import { Button, PageHeader, PageContent, StatsGrid } from '@/components/ui';

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
    <PageContent>
      <PageHeader
        title="Training & Development"
        description="Track courses, certifications, and employee training"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Training' },
        ]}
        actions={
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
        }
      />

      {/* Stats */}
      <StatsGrid
        stats={[
          { label: 'Active Courses', value: stats.totalCourses },
          { label: 'Assignments', value: stats.totalAssignments },
          { label: 'Completed', value: stats.completed },
          { label: 'In Progress', value: stats.inProgress },
          { label: 'Overdue', value: stats.overdue },
          { label: 'Expiring Soon', value: stats.expiringSoon },
        ]}
        className="sm:grid-cols-3 lg:grid-cols-6"
      />

      {/* Tabs for Courses vs Assignments */}
      <TrainingList 
        courses={courses || []} 
        trainings={trainings || []} 
      />
    </PageContent>
  );
}
