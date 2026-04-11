import { Badge } from '@/components/ui';
import type { EmployeeRole } from '../types';

const roleConfig: Record<EmployeeRole, { color: string; label: string }> = {
  rider: { color: 'bg-blue-100 text-blue-800', label: 'Rider' },
  supervisor: { color: 'bg-purple-100 text-purple-800', label: 'Supervisor' },
  manager: { color: 'bg-indigo-100 text-indigo-800', label: 'Manager' },
  hr: { color: 'bg-pink-100 text-pink-800', label: 'HR' },
};

interface EmployeeRoleBadgeProps {
  role: EmployeeRole;
  className?: string;
}

/**
 * Displays employee role as a colored badge.
 * 
 * @example
 * <EmployeeRoleBadge role="rider" />
 */
export function EmployeeRoleBadge({ role, className = '' }: EmployeeRoleBadgeProps) {
  const config = roleConfig[role];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color} ${className}`}>
      {config.label}
    </span>
  );
}
