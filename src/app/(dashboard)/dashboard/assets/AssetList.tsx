'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  DataTable, 
  type Column,
  Button,
  Badge,
  FilterBar,
  FilterSelect,
} from '@/components/ui';
import { 
  AssetOwnershipBadge,
  AssetCategoryBadge,
  type Asset,
  type AssetOwnership,
} from '@/features/assets';
import { useAssets } from '@/features/assets/queries';

/**
 * Asset list component using reusable DataTable.
 */
export function AssetList() {
  const router = useRouter();
  const [ownershipFilter, setOwnershipFilter] = useState<AssetOwnership | ''>('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortColumn, setSortColumn] = useState<string | null>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Build filters for query
  const filters = useMemo(() => ({
    ownership: ownershipFilter || undefined,
    is_active: activeFilter === '' ? undefined : activeFilter === 'active',
    search: search || undefined,
  }), [ownershipFilter, activeFilter, search]);

  // Fetch assets using data access hook
  const { data: result, isLoading, error, refetch } = useAssets(
    filters,
    { page, pageSize },
    sortColumn ? { column: sortColumn, direction: sortDirection } : undefined
  );

  // Column definitions
  const columns: Column<Asset>[] = useMemo(() => [
    {
      key: 'asset_number',
      header: 'Asset ID',
      sortable: true,
      render: (asset) => (
        <span className="font-mono text-xs uppercase text-muted">{asset.asset_number || '—'}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (asset) => <span className="font-medium text-heading">{asset.name}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: (asset) => <AssetCategoryBadge category={asset.category} />,
    },
    {
      key: 'make',
      header: 'Make / Model / Year',
      sortable: true,
      render: (asset) => {
        const vehicleInfo = [asset.make, asset.model, asset.year].filter(Boolean).join(' ');
        return <span className="text-muted">{vehicleInfo || '—'}</span>;
      },
    },
    {
      key: 'license_plate',
      header: 'License Plate',
      sortable: true,
      render: (asset) => <span className="font-mono">{asset.license_plate || '—'}</span>,
    },
    {
      key: 'ownership',
      header: 'Ownership',
      sortable: true,
      render: (asset) => <AssetOwnershipBadge ownership={asset.ownership} />,
    },
    {
      key: 'is_active',
      header: 'Status',
      sortable: true,
      render: (asset) => (
        <Badge variant={asset.is_active ? 'success' : 'error'}>
          {asset.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (asset) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Link href={`/dashboard/assets/${asset.id}`}>
            <Button variant="ghost" size="sm">View</Button>
          </Link>
          <Link href={`/dashboard/assets/${asset.id}/edit`}>
            <Button variant="ghost" size="sm">Edit</Button>
          </Link>
        </div>
      ),
    },
  ], []);

  const ownershipOptions = [
    { value: 'company_owned', label: 'Company Owned' },
    { value: 'employee_owned', label: 'Employee Owned' },
    { value: 'rental', label: 'Rental' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  const handleRowClick = (asset: Asset) => {
    router.push(`/dashboard/assets/${asset.id}`);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <DataTable
      data={result?.data || []}
      columns={columns}
      getRowKey={(asset) => asset.id}
      loading={isLoading}
      error={error?.message}
      emptyMessage={search || ownershipFilter || activeFilter 
        ? "No assets match your filters."
        : "No assets yet. Add your first asset to get started."
      }
      searchPlaceholder="Search by name, plate, or make..."
      searchValue={search}
      onSearch={(v) => { setSearch(v); setPage(1); }}
      pagination={{
        page,
        pageSize,
        totalPages: result?.totalPages || 1,
        totalCount: result?.count,
      }}
      onPageChange={setPage}
      sort={{ column: sortColumn, direction: sortDirection }}
      onSort={handleSort}
      onRowClick={handleRowClick}
      onRetry={refetch}
      filters={
        <FilterBar>
          <FilterSelect
            label="All Ownership"
            value={ownershipFilter}
            onChange={(v) => { setOwnershipFilter(v as AssetOwnership | ''); setPage(1); }}
            options={ownershipOptions}
          />
          <FilterSelect
            label="All Statuses"
            value={activeFilter}
            onChange={(v) => { setActiveFilter(v); setPage(1); }}
            options={statusOptions}
          />
        </FilterBar>
      }
    />
  );
}
