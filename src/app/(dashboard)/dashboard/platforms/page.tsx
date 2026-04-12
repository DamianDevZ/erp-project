import Link from 'next/link';
import { Button } from '@/components/ui';
import { PlatformList } from './PlatformList';

/**
 * Platforms list page.
 * Shows all delivery platforms with actions.
 */
export default function PlatformsPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Platforms</h1>
          <p className="text-muted">Manage delivery platforms and billing rates.</p>
        </div>
        <Link href="/dashboard/platforms/new">
          <Button>Add Platform</Button>
        </Link>
      </div>

      {/* Platform list */}
      <PlatformList />
    </div>
  );
}
