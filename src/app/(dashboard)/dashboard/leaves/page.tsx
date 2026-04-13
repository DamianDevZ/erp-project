import Link from 'next/link';
import { Button } from '@/components/ui';
import { LeaveList } from './LeaveList';

/**
 * Leaves list page.
 * Shows all leave requests with filtering and actions.
 */
export default function LeavesPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Leaves & Vacations</h1>
          <p className="text-muted">Manage employee leave requests and time off.</p>
        </div>
        <Link href="/dashboard/leaves/new">
          <Button>Request Leave</Button>
        </Link>
      </div>

      {/* Leave list */}
      <LeaveList />
    </div>
  );
}
