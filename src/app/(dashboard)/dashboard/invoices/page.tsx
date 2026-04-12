import Link from 'next/link';
import { Button } from '@/components/ui';
import { InvoiceList } from './InvoiceList';

/**
 * Invoices list page.
 * Shows all invoices with filtering and actions.
 */
export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Invoices</h1>
          <p className="text-muted">Track and manage invoices to delivery platforms.</p>
        </div>
        <Link href="/dashboard/invoices/new">
          <Button>Create Invoice</Button>
        </Link>
      </div>

      {/* Invoice list */}
      <InvoiceList />
    </div>
  );
}
