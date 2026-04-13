import { createClient } from '@/lib/supabase/server';
import { EmployeeForm } from '../EmployeeForm';

/**
 * New employee page.
 */
export default async function NewEmployeePage() {
  const supabase = await createClient();

  // Fetch employees for reports_to dropdown
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name')
    .order('full_name');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-heading">Add Employee</h1>
        <p className="text-muted">Create a new employee record.</p>
      </div>

      <EmployeeForm employees={employees || []} />
    </div>
  );
}
