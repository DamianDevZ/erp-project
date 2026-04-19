import Link from 'next/link';
import { Button, PageHeader, PageContent } from '@/components/ui';
import { EmployeeList } from './EmployeeList';

/**
 * Employees list page.
 * Shows all employees with filtering and actions.
 */
export default function EmployeesPage() {
  return (
    <PageContent>
      <PageHeader
        title="Employees"
        description="Manage your riders, supervisors, and staff."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Employees' },
        ]}
        actions={
          <Link href="/dashboard/employees/new">
            <Button>Add Employee</Button>
          </Link>
        }
      />
      <EmployeeList />
    </PageContent>
  );
}
