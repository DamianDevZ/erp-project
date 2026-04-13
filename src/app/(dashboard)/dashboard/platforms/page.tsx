import Link from 'next/link';
import { Button } from '@/components/ui';
import { PlatformList } from './PlatformList';

/**
 * Clients list page.
 * Shows all clients with actions.
 */
export default function PlatformsPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Clients</h1>
          <p className="text-muted">Manage clients and billing rates.</p>
        </div>
        <Link href="/dashboard/platforms/new">
          <Button>Add Client</Button>
        </Link>
      </div>

      {/* Client list */}
      <PlatformList />
    </div>
  );
}
