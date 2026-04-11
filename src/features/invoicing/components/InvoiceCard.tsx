import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import type { Invoice } from '../types';

interface InvoiceCardProps {
  invoice: Invoice;
  platformName?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Card displaying invoice summary.
 * 
 * @example
 * <InvoiceCard invoice={invoice} platformName="Uber Eats" onClick={viewInvoice} />
 */
export function InvoiceCard({ invoice, platformName, onClick, className = '' }: InvoiceCardProps) {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Card 
      className={`cursor-pointer transition-shadow hover:shadow-md ${className}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-mono">{invoice.invoice_number}</CardTitle>
          {platformName && <p className="text-sm text-muted">{platformName}</p>}
        </div>
        <InvoiceStatusBadge status={invoice.status} />
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted">
          {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
        </p>
      </CardContent>
      <CardFooter className="justify-between">
        <span className="text-2xl font-semibold text-heading">{formatCurrency(invoice.total)}</span>
        {invoice.due_at && (
          <span className="text-sm text-muted">
            Due {formatDate(invoice.due_at)}
          </span>
        )}
      </CardFooter>
    </Card>
  );
}
