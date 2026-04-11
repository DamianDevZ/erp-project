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

  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !employee) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Edit Employee</h1>
        <p className="text-muted">Update employee information.</p>
      </div>

      <EmployeeForm employee={employee} />
    </div>
  );
}
