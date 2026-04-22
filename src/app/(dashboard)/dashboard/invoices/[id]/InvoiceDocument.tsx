'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui';

interface InvoiceDocumentProps {
  invoice: {
    invoice_number: string;
    title: string | null;
    period_start: string;
    period_end: string;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
    status: string;
    issued_at: string | null;
    due_at: string | null;
    notes: string | null;
    platform?: { 
      name: string;
      vat_id?: string | null;
      address?: string | null;
      city?: string | null;
      country?: string | null;
    } | null;
    client?: { 
      name: string;
      vat_id?: string | null;
      address?: string | null;
      city?: string | null;
      country?: string | null;
    } | null;
  };
  organization: {
    name: string;
    logo_url: string | null;
  } | null;
}

/**
 * Professional invoice document component.
 * Currency: BHD (Bahraini Dinar) with 3 decimal places
 * Displays: Payroll Amount, VAT (10%), Total Invoiced Amount
 */
export function InvoiceDocument({ invoice, organization }: InvoiceDocumentProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Format BHD with 3 decimal places
  const formatBHD = (amount: number) =>
    `BHD ${amount.toFixed(3)}`;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });

  const handlePrint = () => {
    window.print();
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };

  return (
    <div>
      {/* Print/Download buttons - hidden when printing */}
      <div className="print:hidden mb-6 flex items-center justify-end gap-3">
        <Button onClick={handlePrint} variant="outline">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Invoice
        </Button>
        <Button onClick={handlePrint}>
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download PDF
        </Button>
      </div>

      {/* Invoice Document */}
      <div 
        ref={printRef}
        className="bg-white rounded-lg border border-border shadow-sm p-8 print:shadow-none print:border-0 print:p-0"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-8">
          <div>
            {organization?.logo_url ? (
              <img 
                src={organization.logo_url} 
                alt={organization.name} 
                className="h-16 w-auto object-contain mb-2"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-white text-2xl font-bold mb-2">
                {organization?.name?.charAt(0) || 'C'}
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-900">{organization?.name || 'Your Company'}</h1>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-gray-900">INVOICE</h2>
            <p className="text-lg font-mono text-gray-600 mt-1">{invoice.invoice_number}</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium uppercase ${statusColors[invoice.status] || statusColors.draft}`}>
              {invoice.status}
            </span>
          </div>
        </div>

        {/* Bill To & Invoice Info */}
        <div className="grid grid-cols-2 gap-8 py-8 border-b border-gray-200">
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Bill To</p>
            <p className="text-lg font-semibold text-gray-900">{((invoice.client ?? invoice.platform) as any)?.name || 'Client'}</p>
            {((invoice.client ?? invoice.platform) as any)?.vat_id && (
              <p className="text-sm text-gray-600 mt-1">VAT ID: {((invoice.client ?? invoice.platform) as any).vat_id}</p>
            )}
            {((invoice.client ?? invoice.platform) as any)?.address && (
              <p className="text-sm text-gray-600 mt-1">{((invoice.client ?? invoice.platform) as any).address}</p>
            )}
            {(((invoice.client ?? invoice.platform) as any)?.city || ((invoice.client ?? invoice.platform) as any)?.country) && (
              <p className="text-sm text-gray-600">
                {[((invoice.client ?? invoice.platform) as any).city, ((invoice.client ?? invoice.platform) as any).country].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="space-y-2">
              <div className="flex justify-end gap-8">
                <span className="text-sm text-gray-500">Invoice Date:</span>
                <span className="text-sm font-medium text-gray-900">
                  {invoice.issued_at ? formatDate(invoice.issued_at) : formatDate(new Date().toISOString())}
                </span>
              </div>
              <div className="flex justify-end gap-8">
                <span className="text-sm text-gray-500">Due Date:</span>
                <span className="text-sm font-medium text-gray-900">
                  {invoice.due_at ? formatDate(invoice.due_at) : 'On Receipt'}
                </span>
              </div>
              <div className="flex justify-end gap-8">
                <span className="text-sm text-gray-500">Period:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Title (if provided) */}
        {invoice.title && (
          <div className="py-6 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Description</p>
            <p className="text-lg text-gray-900">{invoice.title}</p>
          </div>
        )}

        {/* Billing Summary */}
        <div className="py-8">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">Description</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700 uppercase tracking-wide w-40">Amount (BHD)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-gray-50">
                <td className="py-4 px-2 text-gray-900">Payroll Amount</td>
                <td className="py-4 px-2 text-right font-mono text-gray-900">{formatBHD(invoice.subtotal)}</td>
              </tr>
              <tr>
                <td className="py-4 px-2 text-gray-900">VAT ({invoice.tax_rate || 10}%)</td>
                <td className="py-4 px-2 text-right font-mono text-gray-900">{formatBHD(invoice.tax_amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="border-t-2 border-gray-900 pt-6">
          <div className="flex justify-end">
            <div className="w-72">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-900">Total Invoiced Amount</span>
                <span className="text-xl font-bold font-mono text-gray-900">{formatBHD(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Notes</p>
            <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            Thank you for your business!
          </p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-document, #invoice-document * {
            visibility: visible;
          }
          #invoice-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
