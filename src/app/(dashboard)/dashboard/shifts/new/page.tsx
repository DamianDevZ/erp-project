import Link from 'next/link';
import { ShiftForm } from '../ShiftForm';

/**
 * New shift page.
 */
export default function NewShiftPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted mb-2">
          <Link href="/dashboard/shifts" className="hover:text-heading">
            Shifts
          </Link>
          <span>/</span>
          <span>New</span>
        </div>
        <h1 className="text-2xl font-bold text-heading">Create Shift</h1>
        <p className="text-muted">Schedule a new shift for an employee.</p>
      </div>

      {/* Form */}
      <ShiftForm />
    </div>
  );
}
