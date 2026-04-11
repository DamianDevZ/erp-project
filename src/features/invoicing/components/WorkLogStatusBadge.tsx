import { Badge, type BadgeProps } from '@/components/ui';
import type { WorkLogStatus } from '../types';

const statusConfig: Record<WorkLogStatus, { variant: BadgeProps['variant']; label: string }> = {
  pending: { variant: 'warning', label: 'Pending' },
  verified: { variant: 'success', label: 'Verified' },
  invoiced: { variant: 'default', label: 'Invoiced' },
};

interface WorkLogStatusBadgeProps {
  status: WorkLogStatus;
  className?: string;
}

/**
 * Displays work log status as a colored badge.
 * 
 * @example
 * <WorkLogStatusBadge status="verified" />
 */
export function WorkLogStatusBadge({ status, className }: WorkLogStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
