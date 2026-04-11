import type { AssetOwnership } from '../types';

const ownershipConfig: Record<AssetOwnership, { color: string; label: string }> = {
  company_owned: { color: 'bg-green-100 text-green-800', label: 'Company' },
  employee_owned: { color: 'bg-blue-100 text-blue-800', label: 'Employee' },
  rental: { color: 'bg-orange-100 text-orange-800', label: 'Rental' },
};

interface AssetOwnershipBadgeProps {
  ownership: AssetOwnership;
  className?: string;
}

/**
 * Displays asset ownership type as a colored badge.
 * 
 * @example
 * <AssetOwnershipBadge ownership="rental" />
 */
export function AssetOwnershipBadge({ ownership, className = '' }: AssetOwnershipBadgeProps) {
  const config = ownershipConfig[ownership];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color} ${className}`}>
      {config.label}
    </span>
  );
}
