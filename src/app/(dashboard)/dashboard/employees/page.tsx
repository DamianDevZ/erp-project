import Link from 'next/link';
import { Button, PageHeader, PageContent } from '@/components/ui';
import { EmployeeList } from './EmployeeList';

/**
 * Employees list page.
 * Shows all employees with filtering, bulk actions, and import/export.
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
          <div className="flex gap-2">
            <Button variant="outline">Import</Button>
            <Button variant="outline">Export All</Button>
            <Link href="/dashboard/employees/new">
              <Button>Add Employee</Button>
            </Link>
          </div>
        }
      />
      <EmployeeList />
    </PageContent>
  );
}
