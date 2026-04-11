import { Badge, type BadgeProps } from '@/components/ui';
import type { InvoiceStatus } from '../types';

const statusConfig: Record<InvoiceStatus, { variant: BadgeProps['variant']; label: string }> = {
  draft: { variant: 'outline', label: 'Draft' },
  sent: { variant: 'default', label: 'Sent' },
  paid: { variant: 'success', label: 'Paid' },
  overdue: { variant: 'error', label: 'Overdue' },
  cancelled: { variant: 'error', label: 'Cancelled' },
};

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

/**
 * Displays invoice status as a colored badge.
 * 
 * @example
 * <InvoiceStatusBadge status="paid" />
 */
export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
