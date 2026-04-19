import Link from 'next/link';
import { Button, PageHeader, PageContent } from '@/components/ui';
import { OrdersList } from './OrdersList';

/**
 * Orders list page.
 * Shows all delivery orders with filtering.
 */
export default function OrdersPage() {
  return (
    <PageContent>
      <PageHeader
        title="Orders"
        description="View and manage delivery orders from all platforms."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Orders' },
        ]}
        actions={
          <div className="flex gap-2">
            <Link href="/dashboard/orders/import">
              <Button variant="outline">Import Orders</Button>
            </Link>
            <Link href="/dashboard/orders/reconcile">
              <Button>Reconcile</Button>
            </Link>
          </div>
        }
      />
      <OrdersList />
    </PageContent>
  );
}
