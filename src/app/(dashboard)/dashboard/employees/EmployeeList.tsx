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
  SortableTableHead,
  type SortDirection,
  Button,
  Spinner,
  Input,
} from '@/components/ui';
import { 
  EmployeeStatusBadge, 
  EmployeeRoleBadge,
  type Employee,
  type EmployeeStatus,
  type EmployeeRole,
} from '@/features/employees';

/**
 * Client component that fetches and displays employees.
 */
export function EmployeeList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<string | null>('full_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc');
      if (sortDirection === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }

  // Filter and sort employees
  const filteredEmployees = employees
    .filter((emp) => {
      const matchesSearch = 
        emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
        emp.email?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (!sortKey || !sortDirection) return 0;
      
      let aVal = a[sortKey as keyof Employee];
      let bVal = b[sortKey as keyof Employee];
      
      // Handle null/undefined
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
      
      // String comparison
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
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
        <p className="text-red-500">{error}</p>
        <Button variant="outline" onClick={fetchEmployees} className="mt-4">
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
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as EmployeeStatus | 'all')}
          className="rounded-md border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="past">Past</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        {filteredEmployees.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted">
              {employees.length === 0 
                ? 'No employees yet. Add your first employee to get started.'
                : 'No employees match your filters.'
              }
            </p>
            {employees.length === 0 && (
              <Link href="/dashboard/employees/new">
                <Button className="mt-4">Add Employee</Button>
              </Link>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="full_name" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Name</SortableTableHead>
                <SortableTableHead sortKey="email" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Email</SortableTableHead>
                <SortableTableHead sortKey="phone" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Phone</SortableTableHead>
                <SortableTableHead sortKey="role" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Role</SortableTableHead>
                <SortableTableHead sortKey="status" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Status</SortableTableHead>
                <SortableTableHead sortKey="hire_date" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Hire Date</SortableTableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.full_name}</TableCell>
                  <TableCell>{employee.email || '—'}</TableCell>
                  <TableCell>{employee.phone || '—'}</TableCell>
                  <TableCell>
                    <EmployeeRoleBadge role={employee.role} />
                  </TableCell>
                  <TableCell>
                    <EmployeeStatusBadge status={employee.status} />
                  </TableCell>
                  <TableCell className="text-muted">
                    {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/employees/${employee.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                      <Link href={`/dashboard/employees/${employee.id}/edit`}>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
