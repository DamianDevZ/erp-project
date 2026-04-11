import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import type { Platform } from '../types';

interface PlatformCardProps {
  platform: Platform;
  activeEmployees?: number;
  onClick?: () => void;
  className?: string;
}

/**
 * Card displaying platform summary.
 * 
 * @example
 * <PlatformCard platform={platform} activeEmployees={12} onClick={viewPlatform} />
 */
export function PlatformCard({ platform, activeEmployees, onClick, className = '' }: PlatformCardProps) {
  const formatRate = () => {
    if (!platform.billing_rate) return null;
    const rate = `$${platform.billing_rate}`;
    switch (platform.billing_rate_type) {
      case 'per_delivery': return `${rate}/delivery`;
      case 'hourly': return `${rate}/hour`;
      case 'fixed': return `${rate}/period`;
      default: return rate;
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-shadow hover:shadow-md ${className}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">{platform.name}</CardTitle>
        {!platform.is_active && (
          <Badge variant="error">Inactive</Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-sm text-muted">
          {activeEmployees !== undefined && (
            <p>{activeEmployees} active employee{activeEmployees !== 1 ? 's' : ''}</p>
          )}
          {formatRate() && (
            <p className="font-medium text-body">{formatRate()}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
