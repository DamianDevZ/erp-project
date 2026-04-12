import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { InvoiceForm } from '../../InvoiceForm';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Edit invoice page.
 */
export default async function EditInvoicePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch invoice
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  // Fetch line items
  const { data: lineItems } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', id)
    .order('created_at');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center">
        <Link 
          href={`/dashboard/invoices/${id}`}
          className="inline-flex items-center text-sm text-muted hover:text-heading mb-2"
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Invoice
        </Link>
        <h1 className="text-2xl font-bold text-heading">Edit Invoice</h1>
        <p className="text-muted">Update invoice details and line items.</p>
      </div>

      <InvoiceForm invoice={invoice} existingLineItems={lineItems || []} />
    </div>
  );
}
