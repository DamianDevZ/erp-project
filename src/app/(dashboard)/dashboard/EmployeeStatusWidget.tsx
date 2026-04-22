'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

interface InactiveEmployee {
  id: string;
  full_name: string;
  sub: string;
  badge: 'on_leave' | 'pending' | 'inactive';
}

interface StatusCounts {
  active: number;
  on_leave: number;
  inactive: number;
  pending: number;
}

type ExpandedTile = 'on_leave' | 'pending' | 'inactive' | null;

export function EmployeeStatusWidget() {
  const [counts, setCounts] = useState<StatusCounts>({ active: 0, on_leave: 0, inactive: 0, pending: 0 });
  const [employees, setEmployees] = useState<InactiveEmployee[]>([]);
  const [expanded, setExpanded] = useState<ExpandedTile>(null);
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

      const emps = employeesResult.data || [];
      const activeLeaves = leavesResult.data || [];

      const leaveMap = new Map<string, { leave_type: string; reason: string; end_date: string }>();
      for (const l of activeLeaves) {
        leaveMap.set(l.employee_id, { leave_type: l.leave_type, reason: l.reason, end_date: l.end_date });
      }

      const countMap: StatusCounts = { active: 0, on_leave: 0, inactive: 0, pending: 0 };
      const list: InactiveEmployee[] = [];

      for (const emp of emps) {
        if (emp.status === 'active') {
          const leave = leaveMap.get(emp.id);
          if (leave) {
            countMap.on_leave++;
            const leaveLabel = leave.leave_type
              ? leave.leave_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
              : 'Leave';
            list.push({
              id: emp.id,
              full_name: emp.full_name,
              sub: leave.reason
                ? `${leaveLabel} — ${leave.reason} (returns ${new Date(leave.end_date).toLocaleDateString()})`
                : `${leaveLabel} — returns ${new Date(leave.end_date).toLocaleDateString()}`,
              badge: 'on_leave',
            });
          } else {
            countMap.active++;
          }
        } else if (emp.status === 'pending') {
          countMap.pending++;
          const step = emp.onboarding_step
            ? emp.onboarding_step.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
            : 'Pending onboarding';
          list.push({
            id: emp.id,
            full_name: emp.full_name,
            sub: emp.notes || step,
            badge: 'pending',
          });
        } else {
          countMap.inactive++;
          list.push({
            id: emp.id,
            full_name: emp.full_name,
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
      setEmployees(list);
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

  function toggle(tile: ExpandedTile) {
    setExpanded(prev => (prev === tile ? null : tile));
  }

  const visibleEmployees = expanded ? employees.filter(e => e.badge === expanded) : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Employee Status <span className="text-sm font-normal text-muted ml-1">({totalAll} total)</span></CardTitle>
        <Link href="/dashboard/employees" className="text-xs text-primary hover:underline">
          View all →
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Active — no dropdown */}
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xl font-bold text-success">{counts.active}</p>
            <p className="text-xs text-muted mt-0.5">Active</p>
            <p className="text-xs text-muted">{totalAll > 0 ? Math.round((counts.active / totalAll) * 100) : 0}%</p>
          </div>

          {/* On Leave — clickable */}
          <ExpandableTile
            label="On Leave"
            count={counts.on_leave}
            total={totalAll}
            color="warning"
            isOpen={expanded === 'on_leave'}
            onClick={() => toggle('on_leave')}
          />

          {/* Pending — clickable */}
          <ExpandableTile
            label="Pending"
            count={counts.pending}
            total={totalAll}
            color="default"
            isOpen={expanded === 'pending'}
            onClick={() => toggle('pending')}
          />

          {/* Inactive — clickable */}
          <ExpandableTile
            label="Inactive"
            count={counts.inactive}
            total={totalAll}
            color="error"
            isOpen={expanded === 'inactive'}
            onClick={() => toggle('inactive')}
          />
        </div>

        {/* Inline dropdown */}
        {expanded && visibleEmployees.length > 0 && (
          <div className="mt-3 rounded-lg border border-border bg-background divide-y divide-border">
            {visibleEmployees.map((emp) => (
              <div key={emp.id} className="flex items-start justify-between px-3 py-2.5">
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/employees/${emp.id}`}
                    className="text-sm font-medium text-heading hover:text-primary"
                  >
                    {emp.full_name}
                  </Link>
                  <p className="text-xs text-muted">{emp.sub}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {expanded && visibleEmployees.length === 0 && (
          <p className="mt-3 text-sm text-muted text-center py-2">None.</p>
        )}
      </CardContent>

    </Card>
  );
}

function ExpandableTile({
  label, count, total, color, isOpen, onClick,
}: {
  label: string;
  count: number;
  total: number;
  color: 'warning' | 'error' | 'default';
  isOpen: boolean;
  onClick: () => void;
}) {
  const colorMap = { warning: 'text-warning', error: 'text-error', default: 'text-muted' };
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-3 text-left w-full transition-colors hover:bg-hover ${isOpen ? 'border-primary bg-hover' : 'border-border'}`}
    >
      <p className={`text-2xl font-bold ${colorMap[color]}`}>{count}</p>
      <div className="flex items-center justify-between mt-0.5">
        <p className="text-xs text-muted">{label}</p>
        <span className="text-xs text-muted">{isOpen ? '?' : '?'}</span>
      </div>
      <p className="text-xs text-muted">{pct}%</p>
    </button>
  );
}
