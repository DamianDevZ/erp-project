'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

interface InactiveEmployee {
  id: string;
  full_name: string;
  reason: string;
  sub: string;
  badge: 'on_leave' | 'pending' | 'inactive';
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
  const [inactive, setInactive] = useState<InactiveEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);

      const [employeesResult, leavesResult] = await Promise.all([
        supabase
          .from('employees')
          .select('id, full_name, status, notes, termination_date, onboarding_step')
          .order('full_name'),
        supabase
          .from('leaves')
          .select('employee_id, leave_type, reason, end_date')
          .eq('status', 'approved')
          .lte('start_date', today)
          .gte('end_date', today),
      ]);

      const employees = employeesResult.data || [];
      const activeLeaves = leavesResult.data || [];

      // Map employee_id → leave info
      const leaveMap = new Map<string, { leave_type: string; reason: string; end_date: string }>();
      for (const l of activeLeaves) {
        leaveMap.set(l.employee_id, { leave_type: l.leave_type, reason: l.reason, end_date: l.end_date });
      }

      const countMap: StatusCounts = { active: 0, on_leave: 0, inactive: 0, pending: 0 };
      const inactiveList: InactiveEmployee[] = [];

      for (const emp of employees) {
        if (emp.status === 'active') {
          const leave = leaveMap.get(emp.id);
          if (leave) {
            countMap.on_leave++;
            const leaveLabel = leave.leave_type
              ? leave.leave_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
              : 'Leave';
            inactiveList.push({
              id: emp.id,
              full_name: emp.full_name,
              reason: leaveLabel,
              sub: leave.reason
                ? `${leave.reason} — returns ${new Date(leave.end_date).toLocaleDateString()}`
                : `Returns ${new Date(leave.end_date).toLocaleDateString()}`,
              badge: 'on_leave',
            });
          } else {
            countMap.active++;
          }
        } else if (emp.status === 'pending') {
          countMap.pending++;
          const step = emp.onboarding_step
            ? emp.onboarding_step.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
            : 'Pending Onboarding';
          inactiveList.push({
            id: emp.id,
            full_name: emp.full_name,
            reason: 'Pending Onboarding',
            sub: emp.notes || step,
            badge: 'pending',
          });
        } else {
          // past / inactive
          countMap.inactive++;
          inactiveList.push({
            id: emp.id,
            full_name: emp.full_name,
            reason: 'Inactive',
            sub: emp.notes
              ? emp.notes
              : emp.termination_date
              ? `Left ${new Date(emp.termination_date).toLocaleDateString()}`
              : 'No longer active',
            badge: 'inactive',
          });
        }
      }

      setCounts(countMap);
      setInactive(inactiveList);
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

  const totalAll = counts.active + counts.on_leave + counts.inactive + counts.pending;

  const badgeStyles: Record<InactiveEmployee['badge'], string> = {
    on_leave: 'bg-warning/10 text-warning',
    pending: 'bg-primary/10 text-primary',
    inactive: 'bg-error/10 text-error',
  };

  const badgeLabels: Record<InactiveEmployee['badge'], string> = {
    on_leave: 'On Leave',
    pending: 'Pending',
    inactive: 'Inactive',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Employee Status</CardTitle>
        <Link href="/dashboard/employees" className="text-xs text-primary hover:underline">
          View all →
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatusTile label="Active" count={counts.active} total={totalAll} color="success" />
          <StatusTile label="On Leave" count={counts.on_leave} total={totalAll} color="warning" />
          <StatusTile label="Pending" count={counts.pending} total={totalAll} color="default" />
          <StatusTile label="Inactive" count={counts.inactive} total={totalAll} color="error" />
        </div>

        {/* All non-active employees with reason */}
        {inactive.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Not Currently Active ({inactive.length})
            </p>
            <div className="space-y-2">
              {inactive.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-start justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/employees/${emp.id}`}
                      className="text-sm font-medium text-heading hover:text-primary"
                    >
                      {emp.full_name}
                    </Link>
                    <p className="text-xs text-muted truncate">{emp.sub}</p>
                  </div>
                  <span className={`ml-2 shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyles[emp.badge]}`}>
                    {badgeLabels[emp.badge]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted text-center py-2">All employees are currently active.</p>
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
