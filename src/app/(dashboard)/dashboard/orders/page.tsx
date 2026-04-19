import Link from 'next/link';
import { Button } from '@/components/ui';
import { OrdersList } from './OrdersList';

/**
 * Orders list page.
 * Shows all delivery orders with filtering.
 */
export default function OrdersPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Orders</h1>
          <p className="text-muted">View and manage delivery orders from all platforms.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/orders/import">
            <Button variant="outline">Import Orders</Button>
          </Link>
          <Link href="/dashboard/orders/reconcile">
            <Button>Reconcile</Button>
          </Link>
        </div>
      </div>

      {/* Orders list */}
      <OrdersList />
    </div>
  );
}
