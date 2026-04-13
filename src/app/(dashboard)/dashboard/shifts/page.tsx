import Link from 'next/link';
import { Button } from '@/components/ui';
import { ShiftList } from './ShiftList';

/**
 * Shifts list page.
 * Shows all shifts with filtering and actions.
 */
export default function ShiftsPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Shift Management</h1>
          <p className="text-muted">Schedule and track employee shifts.</p>
        </div>
        <Link href="/dashboard/shifts/new">
          <Button>Create Shift</Button>
        </Link>
      </div>

      {/* Shift list */}
      <ShiftList />
    </div>
  );
}
