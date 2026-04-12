'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  Card, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell,
  Button,
  Spinner,
  Input,
  Badge,
} from '@/components/ui';
import { 
  AssetOwnershipBadge,
  AssetCategoryBadge,
  type Asset,
  type AssetOwnership,
  type AssetCategory,
} from '@/features/assets';

/**
 * Client component that fetches and displays assets.
 */
export function AssetList() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<AssetOwnership | 'all'>('all');

  useEffect(() => {
    fetchAssets();
  }, []);

  async function fetchAssets() {
    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }

  // Filter assets based on search and ownership
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = 
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.license_plate?.toLowerCase().includes(search.toLowerCase()) ||
      asset.make?.toLowerCase().includes(search.toLowerCase());
    const matchesOwnership = ownershipFilter === 'all' || asset.ownership === ownershipFilter;
    return matchesSearch && matchesOwnership;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-error">{error}</p>
        <Button variant="outline" onClick={fetchAssets} className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Search by name, plate, or make..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={ownershipFilter}
          onChange={(e) => setOwnershipFilter(e.target.value as AssetOwnership | 'all')}
          className="rounded-md border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Ownership</option>
          <option value="company_owned">Company Owned</option>
          <option value="employee_owned">Employee Owned</option>
          <option value="rental">Rental</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        {filteredAssets.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted">
              {assets.length === 0 
                ? 'No assets yet. Add your first asset to get started.'
                : 'No assets match your filters.'
              }
            </p>
            {assets.length === 0 && (
              <Link href="/dashboard/assets/new">
                <Button className="mt-4">Add Asset</Button>
              </Link>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Make / Model / Year</TableHead>
                <TableHead>License Plate</TableHead>
                <TableHead>Ownership</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => {
                const vehicleInfo = [asset.make, asset.model, asset.year].filter(Boolean).join(' ');
                return (
                  <TableRow key={asset.id}>
                    <TableCell className="font-mono font-medium text-muted">
                      <span className="font-mono text-xs uppercase">{asset.asset_number || '—'}</span>
                    </TableCell>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>
                      <AssetCategoryBadge category={asset.category} />
                    </TableCell>
                    <TableCell className="text-muted">{vehicleInfo || '—'}</TableCell>
                    <TableCell className="font-mono">{asset.license_plate || '—'}</TableCell>
                    <TableCell>
                      <AssetOwnershipBadge ownership={asset.ownership} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={asset.is_active ? 'success' : 'error'}>
                        {asset.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/dashboard/assets/${asset.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                        <Link href={`/dashboard/assets/${asset.id}/edit`}>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
