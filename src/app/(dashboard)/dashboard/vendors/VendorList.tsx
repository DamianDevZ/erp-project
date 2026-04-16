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
import type { Vendor, VendorType, VendorStatus } from '@/features/vendors';

interface VendorListProps {
  vendors: Vendor[];
  loading?: boolean;
}

const TYPE_LABELS: Record<VendorType, string> = {
  equipment: 'Equipment',
  staffing: 'Staffing',
  maintenance: 'Maintenance',
  uniform: 'Uniform',
  technology: 'Technology',
  other: 'Other',
};

const STATUS_COLORS: Record<VendorStatus, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  active: 'success',
  inactive: 'outline',
  pending: 'warning',
};

const STATUS_LABELS: Record<VendorStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
};

/**
 * Vendor list component with search and filtering.
 */
export function VendorList({ vendors, loading }: VendorListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<VendorType | 'all'>('all');

  const filteredVendors = vendors.filter((vendor) => {
    const name = vendor.name?.toLowerCase() || '';
    const contact = vendor.contact_name?.toLowerCase() || '';
    const services = vendor.services_provided?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    const matchesSearch = name.includes(search) || contact.includes(search) || services.includes(search);
    const matchesType = filterType === 'all' || vendor.type === filterType;
    return matchesSearch && matchesType;
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as VendorType | 'all')}
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-heading"
          >
            <option value="all">All Types</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <Link href="/dashboard/vendors/new">
          <Button>
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Vendor
          </Button>
        </Link>
      </div>

      {/* Table */}
      <Card>
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted">
                    {searchTerm || filterType !== 'all' 
                      ? 'No vendors found matching your criteria.' 
                      : 'No vendors yet. Add your first vendor!'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">
                      {vendor.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {TYPE_LABELS[vendor.type as VendorType] || vendor.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {vendor.contact_name ? (
                        <div className="flex flex-col">
                          <span className="text-sm">{vendor.contact_name}</span>
                          {vendor.contact_email && (
                            <span className="text-xs text-muted">{vendor.contact_email}</span>
                          )}
                          {vendor.contact_phone && (
                            <span className="text-xs text-muted">{vendor.contact_phone}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted">
                      {vendor.services_provided || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[vendor.status as VendorStatus] || 'default'}>
                        {STATUS_LABELS[vendor.status as VendorStatus] || vendor.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/dashboard/vendors/${vendor.id}/edit`}>
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
