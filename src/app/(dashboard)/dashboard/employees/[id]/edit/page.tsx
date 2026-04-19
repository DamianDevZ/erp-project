import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PageContent } from '@/components/ui';
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
    <PageContent className="max-w-3xl mx-auto">
      <PageHeader
        title="Edit Employee"
        description="Update employee information."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Employees', href: '/dashboard/employees' },
          { label: employeeResult.data.full_name, href: `/dashboard/employees/${id}` },
          { label: 'Edit' },
        ]}
      />
      <EmployeeForm employee={employeeResult.data} employees={employeesResult.data || []} />
    </PageContent>
  );
}
