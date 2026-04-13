import Link from 'next/link';
import { LeaveForm } from '../LeaveForm';

/**
 * New leave request page.
 */
export default function NewLeavePage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted mb-2">
          <Link href="/dashboard/leaves" className="hover:text-heading">
            Leaves
          </Link>
          <span>/</span>
          <span>New Request</span>
        </div>
        <h1 className="text-2xl font-bold text-heading">New Leave Request</h1>
        <p className="text-muted">Submit a new leave request for an employee.</p>
      </div>

      {/* Form */}
      <LeaveForm />
    </div>
  );
}
