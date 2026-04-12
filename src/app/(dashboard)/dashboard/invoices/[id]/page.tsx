import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui';
import { InvoiceDocument } from './InvoiceDocument';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Invoice detail page with professional invoice view and PDF download.
 */
export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user's organization
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  // Fetch invoice with platform
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*, platform:platforms(name)')
    .eq('id', id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  // Fetch organization details for the invoice header
  const { data: organization } = await supabase
    .from('organizations')
    .select('name, logo_url')
    .eq('id', profile?.organization_id)
    .single();

  // Fetch line items
  const { data: lineItems } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', id)
    .order('created_at');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <Link 
            href="/dashboard/invoices"
            className="inline-flex items-center text-sm text-muted hover:text-heading mb-2"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Invoices
          </Link>
          <h1 className="text-2xl font-bold text-heading">Invoice Details</h1>
        </div>
        <Link href={`/dashboard/invoices/${id}/edit`}>
          <Button variant="outline">
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Invoice
          </Button>
        </Link>
      </div>

      {/* Invoice Document */}
      <div id="invoice-document">
        <InvoiceDocument 
          invoice={invoice}
          organization={organization}
          lineItems={lineItems || []}
        />
      </div>
    </div>
  );
}
