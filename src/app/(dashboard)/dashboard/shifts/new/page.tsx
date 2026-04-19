import { PageHeader, PageContent } from '@/components/ui';
import { ShiftForm } from '../ShiftForm';

/**
 * New shift page.
 */
export default function NewShiftPage() {
  return (
    <PageContent className="max-w-3xl mx-auto">
      <PageHeader
        title="Create Shift"
        description="Schedule a new shift for an employee."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Shifts', href: '/dashboard/shifts' },
          { label: 'New Shift' },
        ]}
      />
      <ShiftForm />
    </PageContent>
  );
}
