'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  Input,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Spinner,
} from '@/components/ui';
import type { Location, LocationType } from '@/features/assets';

interface LocationListProps {
  locations: Location[];
  loading?: boolean;
}

const TYPE_COLORS: Record<LocationType, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  warehouse: 'default',
  client: 'success',
  vendor: 'warning',
  employee: 'outline',
  maintenance: 'error',
  other: 'outline',
};

const TYPE_LABELS: Record<LocationType, string> = {
  warehouse: 'Warehouse',
  client: 'Client Site',
  vendor: 'Vendor',
  employee: 'With Employee',
  maintenance: 'Maintenance',
  other: 'Other',
};

/**
 * Location list component with search and filtering.
 */
export function LocationList({ locations, loading }: LocationListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLocations = locations.filter((location) => {
    const name = location.name?.toLowerCase() || '';
    const address = location.address?.toLowerCase() || '';
    const type = location.type?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return name.includes(search) || address.includes(search) || type.includes(search);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <Input
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Link href="/dashboard/locations/new">
          <Button>
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Location
          </Button>
        </Link>
      </div>

      {/* Table */}
      <Card>
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted">
                    {searchTerm ? 'No locations found matching your search.' : 'No locations yet. Add your first location!'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLocations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">
                      {location.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={TYPE_COLORS[location.type as LocationType] || 'default'}>
                        {TYPE_LABELS[location.type as LocationType] || location.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted max-w-xs truncate">
                      {location.address || '-'}
                    </TableCell>
                    <TableCell>
                      {location.contact_name ? (
                        <div className="flex flex-col">
                          <span className="text-sm">{location.contact_name}</span>
                          {location.contact_phone && (
                            <span className="text-xs text-muted">{location.contact_phone}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={location.is_active ? 'success' : 'outline'}>
                        {location.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/dashboard/locations/${location.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </Card>
    </div>
  );
}
