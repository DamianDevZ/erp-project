import Link from 'next/link';
import { Button, PageHeader, PageContent } from '@/components/ui';
import { AssetList } from './AssetList';

/**
 * Assets list page.
 * Shows all assets with filtering and actions.
 */
export default function AssetsPage() {
  return (
    <PageContent>
      <PageHeader
        title="Assets"
        description="Manage vehicles, equipment, and other assets."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Assets' },
        ]}
        actions={
          <Link href="/dashboard/assets/new">
            <Button>Add Asset</Button>
          </Link>
        }
      />
      <AssetList />
    </PageContent>
  );
}
