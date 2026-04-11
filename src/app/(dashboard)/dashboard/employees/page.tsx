import Link from 'next/link';
import { Button } from '@/components/ui';
import { EmployeeList } from './EmployeeList';

/**
 * Employees list page.
 * Shows all employees with filtering and actions.
 */
export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Employees</h1>
          <p className="text-muted">Manage your riders, supervisors, and staff.</p>
        </div>
        <Link href="/dashboard/employees/new">
          <Button>Add Employee</Button>
        </Link>
      </div>

      {/* Employee list */}
      <EmployeeList />
    </div>
  );
}
