import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EmployeeForm } from '../../EmployeeForm';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Edit employee page.
 */
export default async function EditEmployeePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the employee and all employees in parallel
  const [employeeResult, employeesResult] = await Promise.all([
    supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('employees')
      .select('id, full_name')
      .order('full_name'),
  ]);

  if (employeeResult.error || !employeeResult.data) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-heading">Edit Employee</h1>
        <p className="text-muted">Update employee information.</p>
      </div>

      <EmployeeForm employee={employeeResult.data} employees={employeesResult.data || []} />
    </div>
  );
}
