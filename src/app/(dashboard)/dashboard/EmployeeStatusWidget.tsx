'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

interface StatusEmployee {
  id: string;
  full_name: string;
  status: 'active' | 'pending' | 'past';
  leave_reason?: string;
  leave_type?: string;
  leave_end?: string;
}

interface StatusCounts {
  active: number;
  on_leave: number;
  inactive: number;
  pending: number;
}

/**
 * Employee Status Widget
 * Shows active vs inactive employees with reason for inactivity.
 * Used on the admin dashboard.
 */
export function EmployeeStatusWidget() {
  const [counts, setCounts] = useState<StatusCounts>({ active: 0, on_leave: 0, inactive: 0, pending: 0 });
  const [onLeave, setOnLeave] = useState<StatusEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);

      const [employeesResult, leavesResult] = await Promise.all([
        supabase
          .from('employees')
          .select('id, full_name, status')
          .order('full_name'),
        supabase
          .from('leaves')
          .select('employee_id, leave_type, reason, end_date, employee:employees(full_name)')
          .eq('status', 'approved')
          .lte('start_date', today)
          .gte('end_date', today),
      ]);

      const employees = employeesResult.data || [];
      const activeLeaves = leavesResult.data || [];

      // Build set of employee IDs currently on approved leave
      const onLeaveIds = new Set(activeLeaves.map(l => l.employee_id));

      const countMap: StatusCounts = { active: 0, on_leave: 0, inactive: 0, pending: 0 };
      for (const emp of employees) {
        if (emp.status === 'active') {
          if (onLeaveIds.has(emp.id)) {
            countMap.on_leave++;
          } else {
            countMap.active++;
          }
        } else if (emp.status === 'pending') {
          countMap.pending++;
        } else {
          countMap.inactive++;
        }
      }

      const leaveList: StatusEmployee[] = activeLeaves.map(l => ({
        id: l.employee_id,
        full_name: (l.employee as unknown as { full_name: string } | null)?.full_name ?? 'Unknown',
        status: 'active' as const,
        leave_reason: l.reason || undefined,
        leave_type: l.leave_type
          ? l.leave_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
          : undefined,
        leave_end: l.end_date,
      }));

      setCounts(countMap);
      setOnLeave(leaveList);
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Employee Status</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalActive = counts.active + counts.on_leave;
  const totalAll = totalActive + counts.inactive + counts.pending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Employee Status</CardTitle>
        <Link
          href="/dashboard/employees"
          className="text-xs text-primary hover:underline"
        >
          View all →
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary bars */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatusTile
            label="Active"
            count={counts.active}
            total={totalAll}
            color="success"
          />
          <StatusTile
            label="On Leave"
            count={counts.on_leave}
            total={totalAll}
            color="warning"
          />
          <StatusTile
            label="Pending"
            count={counts.pending}
            total={totalAll}
            color="default"
          />
          <StatusTile
            label="Inactive"
            count={counts.inactive}
            total={totalAll}
            color="error"
          />
        </div>

        {/* Employees currently on leave */}
        {onLeave.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Currently on leave ({onLeave.length})
            </p>
            <div className="space-y-2">
              {onLeave.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <Link
                      href={`/dashboard/employees/${emp.id}`}
                      className="text-sm font-medium text-heading hover:text-primary"
                    >
                      {emp.full_name}
                    </Link>
                    {emp.leave_type && (
                      <p className="text-xs text-muted">{emp.leave_type}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                      On Leave
                    </span>
                    {emp.leave_end && (
                      <p className="text-xs text-muted mt-0.5">
                        Until {new Date(emp.leave_end).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {onLeave.length === 0 && (
          <p className="text-sm text-muted text-center py-2">No employees currently on leave.</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatusTile({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: 'success' | 'warning' | 'error' | 'default';
}) {
  const colorMap = {
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    default: 'text-muted',
  };

  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="rounded-lg border border-border p-3">
      <p className={`text-2xl font-bold ${colorMap[color]}`}>{count}</p>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-xs text-muted">{pct}%</p>
    </div>
  );
}
