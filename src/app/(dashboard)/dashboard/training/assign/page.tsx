import { createClient } from '@/lib/supabase/server';
import { AssignTrainingForm } from '../AssignTrainingForm';

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
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-heading">Assign Training</h1>
        <p className="text-muted">Assign a training course to an employee</p>
      </div>

      {/* Form */}
      <AssignTrainingForm employees={employees || []} courses={courses || []} />
    </div>
  );
}
