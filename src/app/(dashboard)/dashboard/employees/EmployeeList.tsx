'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  DataTable, 
  type Column,
  Button,
  FilterBar,
  FilterSelect,
} from '@/components/ui';
import { 
  EmployeeStatusBadge, 
  EmployeeRoleBadge,
  type Employee,
  type EmployeeStatus,
  type EmployeeRole,
} from '@/features/employees';
import { useEmployees } from '@/features/employees/queries';

/**
 * Employee list component using reusable DataTable.
 * Features: search, filters, sorting, pagination, row actions.
 */
export function EmployeeList() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | ''>('');
  const [roleFilter, setRoleFilter] = useState<EmployeeRole | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortColumn, setSortColumn] = useState<string | null>('full_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Build filters for query
  const filters = useMemo(() => ({
    status: statusFilter || undefined,
    role: roleFilter || undefined,
    search: search || undefined,
  }), [statusFilter, roleFilter, search]);

  // Fetch employees using data access hook
  const { data: result, isLoading, error, refetch } = useEmployees(
    filters,
    { page, pageSize },
    sortColumn ? { column: sortColumn, direction: sortDirection } : undefined
  );

  // Column definitions
  const columns: Column<Employee>[] = useMemo(() => [
    {
      key: 'full_name',
      header: 'Name',
      sortable: true,
      render: (employee) => (
        <span className="font-medium text-heading">{employee.full_name}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (employee) => employee.email || '—',
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: true,
      render: (employee) => employee.phone || '—',
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (employee) => <EmployeeRoleBadge role={employee.role} />,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (employee) => <EmployeeStatusBadge status={employee.status} />,
    },
    {
      key: 'hire_date',
      header: 'Hire Date',
      sortable: true,
      render: (employee) => (
        <span className="text-muted">
          {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (employee) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Link href={`/dashboard/employees/${employee.id}`}>
            <Button variant="ghost" size="sm">View</Button>
          </Link>
          <Link href={`/dashboard/employees/${employee.id}/edit`}>
            <Button variant="ghost" size="sm">Edit</Button>
          </Link>
        </div>
      ),
    },
  ], []);

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'past', label: 'Past' },
  ];

  const roleOptions = [
    { value: 'rider', label: 'Rider' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'manager', label: 'Manager' },
    { value: 'hr', label: 'HR' },
    { value: 'finance', label: 'Finance' },
    { value: 'coordinator', label: 'Coordinator' },
  ];

  const handleRowClick = (employee: Employee) => {
    router.push(`/dashboard/employees/${employee.id}`);
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
      getRowKey={(emp) => emp.id}
      loading={isLoading}
      error={error?.message}
      emptyMessage={search || statusFilter || roleFilter 
        ? "No employees match your filters."
        : "No employees yet. Add your first employee to get started."
      }
      searchPlaceholder="Search by name, email..."
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
            label="All Statuses"
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v as EmployeeStatus | ''); setPage(1); }}
            options={statusOptions}
          />
          <FilterSelect
            label="All Roles"
            value={roleFilter}
            onChange={(v) => { setRoleFilter(v as EmployeeRole | ''); setPage(1); }}
            options={roleOptions}
          />
        </FilterBar>
      }
    />
  );
}
