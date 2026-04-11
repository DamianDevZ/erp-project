import { EmployeeForm } from '../EmployeeForm';

/**
 * New employee page.
 */
export default function NewEmployeePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Add Employee</h1>
        <p className="text-muted">Create a new employee record.</p>
      </div>

      <EmployeeForm />
    </div>
  );
}
