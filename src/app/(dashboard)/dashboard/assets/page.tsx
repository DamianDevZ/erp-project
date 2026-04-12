import Link from 'next/link';
import { Button } from '@/components/ui';
import { AssetList } from './AssetList';

/**
 * Assets list page.
 * Shows all assets with filtering and actions.
 */
export default function AssetsPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Assets</h1>
          <p className="text-muted">Manage vehicles, equipment, and other assets.</p>
        </div>
        <Link href="/dashboard/assets/new">
          <Button>Add Asset</Button>
        </Link>
      </div>

      {/* Asset list */}
      <AssetList />
    </div>
  );
}
