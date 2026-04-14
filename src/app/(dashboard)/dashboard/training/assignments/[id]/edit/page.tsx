import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AssignTrainingForm } from '../../../AssignTrainingForm';
import type { EmployeeTraining } from '@/features/training';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTrainingAssignmentPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the training assignment
  const { data: training, error } = await supabase
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
    .eq('id', id)
    .single();

  if (error || !training) {
    notFound();
  }

  // Fetch employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, employee_id')
    .order('full_name');

  // Fetch all courses (including inactive for editing)
  const { data: courses } = await supabase
    .from('training_courses')
    .select('*')
    .order('name');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-heading">Edit Training Assignment</h1>
        <p className="text-muted">
          {training.employee?.full_name} - {training.course?.name}
        </p>
      </div>

      {/* Form */}
      <AssignTrainingForm 
        training={training as EmployeeTraining} 
        employees={employees || []} 
        courses={courses || []} 
      />
    </div>
  );
}
