import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { AssetOwnershipBadge } from './AssetOwnershipBadge';
import type { Asset } from '../types';

interface AssetCardProps {
  asset: Asset;
  onClick?: () => void;
  className?: string;
}

/**
 * Card displaying asset summary.
 * 
 * @example
 * <AssetCard asset={asset} onClick={() => openDetails(asset.id)} />
 */
export function AssetCard({ asset, onClick, className = '' }: AssetCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-shadow hover:shadow-md ${className}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">{asset.name}</CardTitle>
        <AssetOwnershipBadge ownership={asset.ownership} />
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-sm text-muted">
          {asset.license_plate && (
            <p className="font-mono">{asset.license_plate}</p>
          )}
          {asset.make && asset.model && (
            <p>{asset.make} {asset.model} {asset.year && `(${asset.year})`}</p>
          )}
          {!asset.is_active && (
            <p className="text-error">Inactive</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
