import Link from 'next/link';
import { Button, PageHeader, PageContent } from '@/components/ui';
import { PlatformList } from './PlatformList';

/**
 * Clients list page.
 * Shows all clients with actions.
 */
export default function PlatformsPage() {
  return (
    <PageContent>
      <PageHeader
        title="Clients"
        description="Manage clients and billing rates."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clients' },
        ]}
        actions={
          <Link href="/dashboard/platforms/new">
            <Button>Add Client</Button>
          </Link>
        }
      />
      <PlatformList />
    </PageContent>
  );
}
