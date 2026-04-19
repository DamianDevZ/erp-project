import Link from 'next/link';
import { Button, PageHeader, PageContent } from '@/components/ui';
import { ShiftList } from './ShiftList';

/**
 * Shifts list page.
 * Shows all shifts with filtering and actions.
 */
export default function ShiftsPage() {
  return (
    <PageContent>
      <PageHeader
        title="Shift Management"
        description="Schedule and track employee shifts."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Shifts' },
        ]}
        actions={
          <Link href="/dashboard/shifts/new">
            <Button>Create Shift</Button>
          </Link>
        }
      />
      <ShiftList />
    </PageContent>
  );
}
