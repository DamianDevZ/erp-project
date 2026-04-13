'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui';
import {
  type PerformanceDiscipline,
  type DisciplineType,
  type DisciplineStatus,
  DISCIPLINE_TYPE_LABELS,
  DISCIPLINE_TYPE_COLORS,
  DISCIPLINE_STATUS_LABELS,
  DISCIPLINE_STATUS_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
} from '@/features/performance';

interface PerformanceListProps {
  records: PerformanceDiscipline[];
}

// Icons
function MagnifyingGlassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function FolderOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
    </svg>
  );
}

/**
 * List of performance/discipline records with search and filters.
 */
export function PerformanceList({ records }: PerformanceListProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DisciplineType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DisciplineStatus | 'all'>('all');

  // Filter records
  const filteredRecords = records.filter((record) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const employeeName = record.employee?.full_name?.toLowerCase() ?? '';
      const matches = 
        employeeName.includes(searchLower) ||
        record.title.toLowerCase().includes(searchLower) ||
        record.employee?.employee_id?.toLowerCase().includes(searchLower);
      if (!matches) return false;
    }

    // Type filter
    if (typeFilter !== 'all' && record.type !== typeFilter) return false;

    // Status filter
    if (statusFilter !== 'all' && record.status !== statusFilter) return false;

    return true;
  });

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            type="search"
            placeholder="Search by employee name or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as DisciplineType | 'all')}
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Types</option>
            {Object.entries(DISCIPLINE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DisciplineStatus | 'all')}
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            {Object.entries(DISCIPLINE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-background-subtle">
            <FolderOpenIcon className="h-8 w-8 text-muted" />
          </div>
          <h3 className="text-lg font-medium text-heading">No records found</h3>
          <p className="mt-1 text-sm text-muted">
            {search || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create a new record to get started'
            }
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell>
                  <div>
                    <div className="font-medium text-heading">
                      {record.employee?.full_name}
                    </div>
                    {record.employee?.employee_id && (
                      <div className="text-xs text-muted">{record.employee.employee_id}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate font-medium text-heading">
                    {record.title}
                  </div>
                  {record.description && (
                    <div className="text-xs text-muted truncate max-w-xs">
                      {record.description}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={DISCIPLINE_TYPE_COLORS[record.type]}>
                    {DISCIPLINE_TYPE_LABELS[record.type]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={SEVERITY_COLORS[record.severity]}>
                    {SEVERITY_LABELS[record.severity]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={DISCIPLINE_STATUS_COLORS[record.status]}>
                    {DISCIPLINE_STATUS_LABELS[record.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-heading">
                    {new Date(record.incident_date).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dashboard/performance/${record.id}/edit`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-heading transition-colors"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <p className="text-sm text-muted">
          Showing {filteredRecords.length} of {records.length} records
        </p>
      </div>
    </div>
  );
}
