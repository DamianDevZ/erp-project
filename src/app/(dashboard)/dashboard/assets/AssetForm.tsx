'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Label,
} from '@/components/ui';
import type { Asset, AssetOwnership, AssetCategory } from '@/features/assets';

interface AssetFormProps {
  asset?: Asset;
}

// Icons
function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}

/**
 * Form for creating or editing an asset.
 */
export function AssetForm({ asset }: AssetFormProps) {
  const router = useRouter();
  const isEdit = !!asset;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(asset?.name || '');
  const [category, setCategory] = useState<AssetCategory>(asset?.category || 'vehicle');
  const [licensePlate, setLicensePlate] = useState(asset?.license_plate || '');
  const [make, setMake] = useState(asset?.make || '');
  const [model, setModel] = useState(asset?.model || '');
  const [year, setYear] = useState(asset?.year?.toString() || '');
  const [ownership, setOwnership] = useState<AssetOwnership>(asset?.ownership || 'company_owned');
  const [isActive, setIsActive] = useState(asset?.is_active ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const data: Record<string, unknown> = {
        name,
        category,
        license_plate: licensePlate || null,
        make: make || null,
        model: model || null,
        year: year ? parseInt(year) : null,
        ownership,
        is_active: isActive,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('assets')
          .update(data)
          .eq('id', asset.id);

        if (error) throw error;
      } else {
        // Generate asset_number: {category}-{6 digits}
        const prefix = category.toLowerCase();
        const { count, error: countError } = await supabase
          .from('assets')
          .select('*', { count: 'exact', head: true })
          .like('asset_number', `${prefix}-%`);
        
        if (countError) throw countError;
        
        const sequence = ((count || 0) + 1).toString().padStart(6, '0');
        data.asset_number = `${prefix}-${sequence}`;

        const { error } = await supabase
          .from('assets')
          .insert(data);

        if (error) throw error;
      }

      router.push('/dashboard/assets');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save asset');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl">
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Basic Information */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <TruckIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Asset Information</CardTitle>
                <p className="text-sm text-muted">Basic details about the asset</p>
              </div>
            </div>
            {isEdit && asset.asset_number && (
              <div className="text-right">
                <p className="text-xs text-muted uppercase tracking-wide">Asset ID</p>
                <p className="text-lg font-bold font-mono text-heading uppercase">
                  {asset.asset_number}
                </p>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Name */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name" required>Asset Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Company Bike #1"
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" required>Category</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as AssetCategory)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                required
              >
                <option value="vehicle">Vehicle</option>
                <option value="helmet">Helmet</option>
                <option value="uniform">Uniform</option>
                <option value="phone">Phone</option>
                <option value="bag">Delivery Bag</option>
                <option value="accessory">Accessory</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Ownership */}
            <div className="space-y-2">
              <Label htmlFor="ownership" required>Ownership</Label>
              <select
                id="ownership"
                value={ownership}
                onChange={(e) => setOwnership(e.target.value as AssetOwnership)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                required
              >
                <option value="company_owned">Company Owned</option>
                <option value="employee_owned">Employee Owned</option>
                <option value="rental">Rental</option>
              </select>
            </div>

            {/* License Plate - only show for vehicles */}
            {category === 'vehicle' && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="licensePlate">License Plate</Label>
                <Input
                  id="licensePlate"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="ABC-1234"
                  className="font-mono"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Details - only show for vehicles */}
      {category === 'vehicle' && (
        <Card className="mb-6">
          <CardHeader className="border-b border-border bg-background-subtle">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <TagIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Vehicle Details</CardTitle>
                <p className="text-sm text-muted">Make, model, and year information</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Make */}
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  placeholder="Honda"
                />
              </div>

              {/* Model */}
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="PCX 150"
                />
              </div>

              {/* Year */}
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2024"
                  min="1900"
                  max="2100"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status (only show in edit mode) */}
      {isEdit && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background-subtle p-4">
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-5 w-5 rounded border-border accent-primary"
              />
              <div>
                <Label htmlFor="isActive" className="text-heading font-medium">Active Asset</Label>
                <p className="text-sm text-muted">Uncheck to mark this asset as inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Create Asset'}
        </Button>
      </div>
    </form>
  );
}
