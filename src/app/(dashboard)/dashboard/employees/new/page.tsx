import { EmployeeForm } from '../EmployeeForm';

/**
 * New employee page.
 */
export default function NewEmployeePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-heading">Add Employee</h1>
        <p className="text-muted">Create a new employee record.</p>
      </div>

      <EmployeeForm />
    </div>
  );
}
