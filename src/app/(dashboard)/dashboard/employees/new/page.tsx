import { createClient } from '@/lib/supabase/server';
import { PageHeader, PageContent } from '@/components/ui';
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
    <PageContent className="max-w-3xl mx-auto">
      <PageHeader
        title="Add Employee"
        description="Create a new employee record."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Employees', href: '/dashboard/employees' },
          { label: 'New Employee' },
        ]}
      />
      <EmployeeForm employees={employees || []} />
    </PageContent>
  );
}
