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
  FilterBar,
  FilterSelect,
  StatsGrid,
} from '@/components/ui';
import { 
  Shift, 
  ShiftStatus, 
  SHIFT_STATUS_LABELS,
  calculateShiftHours,
} from '@/features/shifts/types';

const STATUS_COLORS: Record<ShiftStatus, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  scheduled: 'default',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'outline',
  no_show: 'error',
};

/**
 * Client component that fetches and displays shifts.
 */
export function ShiftList() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShiftStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchShifts();
  }, [dateFilter]);

  async function fetchShifts() {
    try {
      setLoading(true);
      const supabase = createClient();
      
      let query = supabase
        .from('shifts')
        .select(`
          *,
          employee:employees!shifts_employee_id_fkey(id, full_name, employee_id),
          platform:platforms!shifts_platform_id_fkey(id, name)
        `)
        .order('shift_date', { ascending: true })
        .order('start_time', { ascending: true });

      // Filter by date range (show week from selected date)
      if (dateFilter) {
        const startDate = new Date(dateFilter);
        const endDate = new Date(dateFilter);
        endDate.setDate(endDate.getDate() + 7);
        query = query
          .gte('shift_date', startDate.toISOString().split('T')[0])
          .lte('shift_date', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;
      setShifts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(shiftId: string, newStatus: ShiftStatus) {
    try {
      const supabase = createClient();
      const updateData: Record<string, unknown> = { status: newStatus };
      
      // Set actual times based on status
      if (newStatus === 'in_progress') {
        updateData.actual_start_time = new Date().toTimeString().slice(0, 5);
      } else if (newStatus === 'completed') {
        updateData.actual_end_time = new Date().toTimeString().slice(0, 5);
      }
      
      const { error } = await supabase
        .from('shifts')
        .update(updateData)
        .eq('id', shiftId);

      if (error) throw error;
      fetchShifts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  // Filter shifts based on search and filters
  const filteredShifts = shifts.filter((shift) => {
    const matchesSearch = 
      shift.employee?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      shift.employee?.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
      shift.platform?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || shift.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Group shifts by date
  const shiftsByDate = filteredShifts.reduce((acc, shift) => {
    const date = shift.shift_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(shift);
    return acc;
  }, {} as Record<string, Shift[]>);

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
        <Button variant="outline" onClick={fetchShifts} className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <FilterBar>
        <Input
          placeholder="Search by employee or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="max-w-[180px]"
        />
        <FilterSelect
          label="All Statuses"
          value={statusFilter === 'all' ? '' : statusFilter}
          onChange={(v) => setStatusFilter(v === '' ? 'all' : v as ShiftStatus)}
          options={[
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'no_show', label: 'No Show' },
          ]}
        />
      </FilterBar>

      {/* Stats */}
      <StatsGrid
        stats={[
          { label: 'This Week', value: shifts.length },
          { label: 'Scheduled', value: shifts.filter(s => s.status === 'scheduled').length },
          { label: 'Completed', value: shifts.filter(s => s.status === 'completed').length },
          { 
            label: 'Total Hours', 
            value: `${shifts
              .filter(s => s.status === 'completed')
              .reduce((sum, s) => sum + calculateShiftHours(s.start_time, s.end_time, s.break_minutes), 0)
              .toFixed(1)}h`
          },
        ]}
      />

      {/* Shifts by Date */}
      {Object.keys(shiftsByDate).length === 0 ? (
        <Card className="p-6 text-center text-muted">
          {search || statusFilter !== 'all'
            ? 'No shifts match your filters.'
            : 'No shifts scheduled for this period. Create your first shift.'}
        </Card>
      ) : (
        Object.entries(shiftsByDate).sort().map(([date, dayShifts]) => (
          <div key={date}>
            <h3 className="text-sm font-semibold text-heading mb-2 flex items-center gap-2">
              <span>{new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
              <Badge variant="default">{dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}</Badge>
            </h3>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayShifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-heading">{shift.employee?.full_name}</p>
                          <p className="text-xs text-muted">{shift.employee?.employee_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{shift.platform?.name || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{shift.start_time} - {shift.end_time}</p>
                          {shift.actual_start_time && (
                            <p className="text-xs text-muted">
                              Actual: {shift.actual_start_time}
                              {shift.actual_end_time ? ` - ${shift.actual_end_time}` : ''}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {calculateShiftHours(shift.start_time, shift.end_time, shift.break_minutes).toFixed(1)}h
                        </span>
                        {shift.break_minutes > 0 && (
                          <span className="text-xs text-muted ml-1">({shift.break_minutes}m break)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[shift.status]}>
                          {SHIFT_STATUS_LABELS[shift.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {shift.status === 'scheduled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(shift.id, 'in_progress')}
                              className="text-blue-600"
                            >
                              Start
                            </Button>
                          )}
                          {shift.status === 'in_progress' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(shift.id, 'completed')}
                              className="text-green-600"
                            >
                              Complete
                            </Button>
                          )}
                          <Link href={`/dashboard/shifts/${shift.id}/edit`}>
                            <Button size="sm" variant="ghost">
                              Edit
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        ))
      )}
    </div>
  );
}
