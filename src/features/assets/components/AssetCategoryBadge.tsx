import { Badge } from '@/components/ui';
import type { AssetCategory } from '../types';

interface AssetCategoryBadgeProps {
  category: AssetCategory;
}

const categoryLabels: Record<AssetCategory, string> = {
  vehicle: 'Vehicle',
  helmet: 'Helmet',
  uniform: 'Uniform',
  phone: 'Phone',
  bag: 'Bag',
  accessory: 'Accessory',
  other: 'Other',
};

/**
 * Badge displaying asset category.
 */
export function AssetCategoryBadge({ category }: AssetCategoryBadgeProps) {
  const label = categoryLabels[category] || categoryLabels.other;
  
  return (
    <Badge variant="outline">
      {label}
    </Badge>
  );
}
