import { Badge, type BadgeProps } from '@/components/ui';
import type { EmployeeStatus } from '../types';

const statusConfig: Record<EmployeeStatus, { variant: BadgeProps['variant']; label: string }> = {
  active: { variant: 'success', label: 'Active' },
  pending: { variant: 'warning', label: 'Pending' },
  past: { variant: 'error', label: 'Past' },
};

interface EmployeeStatusBadgeProps {
  status: EmployeeStatus;
  className?: string;
}

/**
 * Displays employee status as a colored badge.
 * 
 * @example
 * <EmployeeStatusBadge status="active" />
 */
export function EmployeeStatusBadge({ status, className }: EmployeeStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
