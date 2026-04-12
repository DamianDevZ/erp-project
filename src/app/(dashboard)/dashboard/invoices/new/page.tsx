import { InvoiceForm } from '../InvoiceForm';

/**
 * New invoice page.
 */
export default function NewInvoicePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-heading">Create Invoice</h1>
        <p className="text-muted">Create a new invoice for a platform.</p>
      </div>

      <InvoiceForm />
    </div>
  );
}
