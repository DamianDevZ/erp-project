import Link from 'next/link';
import { Button, PageHeader, PageContent } from '@/components/ui';
import { ClientList } from './ClientList';

/**
 * Clients list page.
 * Shows all clients (delivery services) with actions.
 */
export default function ClientsPage() {
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
          <Link href="/dashboard/clients/new">
            <Button>Add Client</Button>
          </Link>
        }
      />
      <ClientList />
    </PageContent>
  );
}
