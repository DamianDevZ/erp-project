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
  SortableTableHead,
  type SortDirection,
} from '@/components/ui';
import { 
  Leave, 
  LeaveStatus, 
  LeaveType,
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_LABELS,
} from '@/features/leaves/types';

const STATUS_COLORS: Record<LeaveStatus, 'default' | 'success' | 'warning' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'default',
};

/**
 * Client component that fetches and displays leave requests.
 */
export function LeaveList() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<LeaveType | 'all'>('all');
  const [sortKey, setSortKey] = useState<string | null>('start_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
    fetchLeaves();
  }, []);

  async function fetchLeaves() {
    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('leaves')
        .select(`
          *,
          employee:employees!leaves_employee_id_fkey(id, full_name, employee_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeaves(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaves');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(leaveId: string, newStatus: LeaveStatus) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('leaves')
        .update({ 
          status: newStatus,
          ...(newStatus === 'approved' ? { approved_at: new Date().toISOString() } : {}),
        })
        .eq('id', leaveId);

      if (error) throw error;
      fetchLeaves();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  // Filter leaves based on search and filters
  const filteredLeaves = leaves
    .filter((leave) => {
      const matchesSearch = 
        leave.employee?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        leave.employee?.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
        leave.reason?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || leave.status === statusFilter;
      const matchesType = typeFilter === 'all' || leave.leave_type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      if (!sortKey || !sortDirection) return 0;
      
      let aVal: string | number | null | undefined;
      let bVal: string | number | null | undefined;
      
      if (sortKey === 'employee') {
        aVal = a.employee?.full_name;
        bVal = b.employee?.full_name;
      } else {
        aVal = a[sortKey as keyof Leave] as string | number | null | undefined;
        bVal = b[sortKey as keyof Leave] as string | number | null | undefined;
      }
      
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
      
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
        <Button variant="outline" onClick={fetchLeaves} className="mt-4">
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
          placeholder="Search by employee name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeaveStatus | 'all')}
          className="rounded-md border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as LeaveType | 'all')}
          className="rounded-md border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Types</option>
          <option value="annual">Annual Leave</option>
          <option value="sick">Sick Leave</option>
          <option value="unpaid">Unpaid Leave</option>
          <option value="maternity">Maternity Leave</option>
          <option value="paternity">Paternity Leave</option>
          <option value="emergency">Emergency Leave</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead sortKey="employee" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Employee</SortableTableHead>
              <SortableTableHead sortKey="leave_type" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Type</SortableTableHead>
              <SortableTableHead sortKey="start_date" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Dates</SortableTableHead>
              <SortableTableHead sortKey="total_days" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Days</SortableTableHead>
              <SortableTableHead sortKey="reason" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Reason</SortableTableHead>
              <SortableTableHead sortKey="status" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Status</SortableTableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeaves.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted">
                  {search || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'No leave requests match your filters.'
                    : 'No leave requests yet. Create your first leave request.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredLeaves.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-heading">{leave.employee?.full_name}</p>
                      <p className="text-xs text-muted">{leave.employee?.employee_id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{LEAVE_TYPE_LABELS[leave.leave_type]}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{new Date(leave.start_date).toLocaleDateString()}</p>
                      <p className="text-muted">to {new Date(leave.end_date).toLocaleDateString()}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{leave.days_count}</span>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-muted max-w-[200px] truncate">
                      {leave.reason || '-'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLORS[leave.status]}>
                      {LEAVE_STATUS_LABELS[leave.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {leave.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(leave.id, 'approved')}
                            className="text-green-600 hover:text-green-700"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(leave.id, 'rejected')}
                            className="text-red-600 hover:text-red-700"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Link href={`/dashboard/leaves/${leave.id}/edit`}>
                        <Button size="sm" variant="ghost">
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
