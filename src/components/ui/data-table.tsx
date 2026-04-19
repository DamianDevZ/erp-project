'use client';

import * as React from 'react';
import { Spinner } from './spinner';

/**
 * DataTable - A reusable table component with built-in:
 * - Column definitions with sorting
 * - Search/filtering
 * - Pagination
 * - Loading and empty states
 * - Row actions
 * 
 * @example
 * const columns: Column<Employee>[] = [
 *   { key: 'full_name', header: 'Name', sortable: true },
 *   { key: 'status', header: 'Status', render: (row) => <Badge>{row.status}</Badge> },
 *   { key: 'actions', header: '', render: (row) => <Button size="sm">Edit</Button> },
 * ];
 * 
 * <DataTable
 *   data={employees}
 *   columns={columns}
 *   searchPlaceholder="Search employees..."
 *   onSearch={setSearch}
 *   pagination={{ page: 1, pageSize: 20, totalPages: 5 }}
 *   onPageChange={setPage}
 *   loading={isLoading}
 * />
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Column<T> {
  /** Unique key for the column (used for sorting) */
  key: string;
  /** Column header text */
  header: string;
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Custom render function for cell content */
  render?: (row: T, index: number) => React.ReactNode;
  /** Cell alignment */
  align?: 'left' | 'center' | 'right';
  /** Column width (CSS value) */
  width?: string;
  /** Hide on mobile */
  hideOnMobile?: boolean;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount?: number;
}

export interface SortState {
  column: string | null;
  direction: 'asc' | 'desc' | null;
}

export interface DataTableProps<T> {
  /** Data array to display */
  data: T[];
  /** Column definitions */
  columns: Column<T>[];
  /** Function to get unique key for each row */
  getRowKey: (row: T) => string;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
  /** Retry function for errors */
  onRetry?: () => void;
  /** Search input placeholder */
  searchPlaceholder?: string;
  /** Current search value */
  searchValue?: string;
  /** Search change handler */
  onSearch?: (value: string) => void;
  /** Pagination state */
  pagination?: PaginationState;
  /** Page change handler */
  onPageChange?: (page: number) => void;
  /** Current sort state */
  sort?: SortState;
  /** Sort change handler */
  onSort?: (column: string) => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state action */
  emptyAction?: React.ReactNode;
  /** Filter controls to render above table */
  filters?: React.ReactNode;
  /** Bulk actions (shown when rows are selected) */
  bulkActions?: React.ReactNode;
  /** Enable row selection */
  selectable?: boolean;
  /** Selected row keys */
  selectedKeys?: Set<string>;
  /** Selection change handler */
  onSelectionChange?: (keys: Set<string>) => void;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Additional class name for container */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DataTable<T>({
  data,
  columns,
  getRowKey,
  loading = false,
  error = null,
  onRetry,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearch,
  pagination,
  onPageChange,
  sort,
  onSort,
  emptyMessage = 'No data found',
  emptyAction,
  filters,
  bulkActions,
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  // Handle sort click
  const handleSort = (column: string) => {
    if (onSort) {
      onSort(column);
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    
    if (selectedKeys.size === data.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(getRowKey)));
    }
  };

  // Handle row select
  const handleSelectRow = (key: string) => {
    if (!onSelectionChange) return;
    
    const newKeys = new Set(selectedKeys);
    if (newKeys.has(key)) {
      newKeys.delete(key);
    } else {
      newKeys.add(key);
    }
    onSelectionChange(newKeys);
  };

  // All selected?
  const allSelected = data.length > 0 && selectedKeys.size === data.length;
  const someSelected = selectedKeys.size > 0 && selectedKeys.size < data.length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toolbar: Search + Filters */}
      {(onSearch || filters) && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {onSearch && (
              <div className="relative w-full sm:w-72">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearch(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-input pl-9 pr-3 text-sm text-heading placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
            {filters}
          </div>
          {selectedKeys.size > 0 && bulkActions && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">{selectedKeys.size} selected</span>
              {bulkActions}
            </div>
          )}
        </div>
      )}

      {/* Card wrapper */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Loading overlay */}
        {loading && data.length > 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80">
            <Spinner size="lg" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="p-8 text-center">
            <p className="text-error mb-4">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm text-primary hover:underline"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {/* Loading state (no data) */}
        {loading && data.length === 0 && !error && (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && data.length === 0 && (
          <div className="py-12 text-center">
            <EmptyIcon className="mx-auto h-12 w-12 text-muted/50" />
            <p className="mt-4 text-muted">{emptyMessage}</p>
            {emptyAction && <div className="mt-4">{emptyAction}</div>}
          </div>
        )}

        {/* Table */}
        {!error && data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Header */}
              <thead className="border-b border-border bg-hover/50">
                <tr>
                  {selectable && (
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                    </th>
                  )}
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted
                        ${col.sortable ? 'cursor-pointer select-none hover:text-heading' : ''}
                        ${col.align === 'center' ? 'text-center' : ''}
                        ${col.align === 'right' ? 'text-right' : ''}
                        ${col.hideOnMobile ? 'hidden sm:table-cell' : ''}
                      `}
                      style={{ width: col.width }}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                        {col.header}
                        {col.sortable && (
                          <SortIndicator
                            active={sort?.column === col.key}
                            direction={sort?.column === col.key ? sort.direction : null}
                          />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-border">
                {data.map((row, index) => {
                  const key = getRowKey(row);
                  const isSelected = selectedKeys.has(key);

                  return (
                    <tr
                      key={key}
                      className={`
                        transition-colors
                        ${onRowClick ? 'cursor-pointer' : ''}
                        ${isSelected ? 'bg-primary/5' : 'hover:bg-hover/50'}
                      `}
                      onClick={() => onRowClick?.(row)}
                    >
                      {selectable && (
                        <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(key)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-sm
                            ${col.align === 'center' ? 'text-center' : ''}
                            ${col.align === 'right' ? 'text-right' : ''}
                            ${col.hideOnMobile ? 'hidden sm:table-cell' : ''}
                          `}
                        >
                          {col.render
                            ? col.render(row, index)
                            : String((row as Record<string, unknown>)[col.key] ?? '')}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted">
              {pagination.totalCount !== undefined && (
                <>
                  Showing {((pagination.page - 1) * pagination.pageSize) + 1}-
                  {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{' '}
                  {pagination.totalCount}
                </>
              )}
              {pagination.totalCount === undefined && (
                <>Page {pagination.page} of {pagination.totalPages}</>
              )}
            </p>
            <div className="flex gap-1">
              <PaginationButton
                onClick={() => onPageChange?.(1)}
                disabled={pagination.page === 1}
              >
                <ChevronDoubleLeftIcon className="h-4 w-4" />
              </PaginationButton>
              <PaginationButton
                onClick={() => onPageChange?.(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </PaginationButton>
              
              {/* Page numbers */}
              {generatePageNumbers(pagination.page, pagination.totalPages).map((pageNum, i) => (
                pageNum === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-2 py-1 text-muted">...</span>
                ) : (
                  <PaginationButton
                    key={pageNum}
                    onClick={() => onPageChange?.(pageNum as number)}
                    active={pagination.page === pageNum}
                  >
                    {pageNum}
                  </PaginationButton>
                )
              ))}

              <PaginationButton
                onClick={() => onPageChange?.(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </PaginationButton>
              <PaginationButton
                onClick={() => onPageChange?.(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages}
              >
                <ChevronDoubleRightIcon className="h-4 w-4" />
              </PaginationButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];
  
  if (current <= 3) {
    pages.push(1, 2, 3, 4, '...', total);
  } else if (current >= total - 2) {
    pages.push(1, '...', total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }

  return pages;
}

function PaginationButton({
  children,
  onClick,
  disabled = false,
  active = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-sm font-medium transition-colors
        ${active
          ? 'bg-primary text-white'
          : disabled
            ? 'cursor-not-allowed text-muted/50'
            : 'text-muted hover:bg-hover hover:text-heading'
        }
      `}
    >
      {children}
    </button>
  );
}

function SortIndicator({ active, direction }: { active: boolean; direction: 'asc' | 'desc' | null }) {
  return (
    <span className="ml-1 inline-flex flex-col">
      <ChevronUpIcon
        className={`h-3 w-3 -mb-1 ${active && direction === 'asc' ? 'text-primary' : 'text-muted/30'}`}
      />
      <ChevronDownIcon
        className={`h-3 w-3 ${active && direction === 'desc' ? 'text-primary' : 'text-muted/30'}`}
      />
    </span>
  );
}

// ============================================================================
// ICONS
// ============================================================================

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function EmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 5l7 7H5z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 19l-7-7h14z" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ChevronDoubleLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
  );
}

function ChevronDoubleRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================
// Column, PaginationState, SortState are exported inline with their definitions
