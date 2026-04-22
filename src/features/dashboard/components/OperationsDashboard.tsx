'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useClientContext } from '@/contexts';

interface OrderStats {
  todayOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  activeRiders: number;
  completionRate: number;
  // fleet
  totalVehicles: number;
  activeVehicles: number;
  idleVehicles: number;
  maintenanceVehicles: number;
  // attendance
  noShows: number;
  lateLogins: number;
  // COD
  openCods: number;
  openCodAmount: number;
}

/**
 * Operations Dashboard
 * Shows KPIs, orders, active riders, fleet status, attendance exceptions, and operational alerts.
 */
export function OperationsDashboard() {
  const { getClientFilter, selectedClientIds, showAllClients } = useClientContext();
  const [stats, setStats] = useState<OrderStats>({
    todayOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    rejectedOrders: 0,
    activeRiders: 0,
    completionRate: 0,
    totalVehicles: 0,
    activeVehicles: 0,
    idleVehicles: 0,
    maintenanceVehicles: 0,
    noShows: 0,
    lateLogins: 0,
    openCods: 0,
    openCodAmount: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [activeShifts, setActiveShifts] = useState<any[]>([]);
  const [fleetBreakdown, setFleetBreakdown] = useState<any[]>([]);
  const [attendanceIssues, setAttendanceIssues] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];
      const clientFilter = getClientFilter();

      if (clientFilter !== null && clientFilter.length === 0) {
        setLoading(false);
        return;
      }

      let ordersQuery = supabase
        .from('orders')
        .select('id, external_order_id, status, created_at, order_value, cod_amount, cod_status, client:clients(name), employee:employees(full_name)')
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: false });

      if (clientFilter && clientFilter.length > 0) {
        ordersQuery = ordersQuery.in('client_id', clientFilter);
      }

      const [ordersResult, shiftsResult, vehiclesResult, alertsResult, noShowResult, lateResult] = await Promise.all([
        ordersQuery.limit(100),
        supabase
          .from('attendance')
          .select('id, employee:employees(id, full_name), status, check_in_time, check_out_time')
          .eq('attendance_date', today)
          .not('check_in_time', 'is', null)
          .limit(30),
        supabase
          .from('assets')
          .select('id, name, vehicle_status, asset_type, make, model, assigned_to')
          .eq('type', 'vehicle'),
        supabase
          .from('compliance_alerts')
          .select('id, title, severity')
          .in('status', ['open', 'acknowledged'])
          .in('severity', ['critical', 'high'])
          .limit(5),
        // No-shows: shifts today with no_show status
        supabase
          .from('shifts')
          .select('id, employee:employees(full_name), status, start_time, client:clients(name)')
          .eq('shift_date', today)
          .eq('status', 'no_show')
          .limit(20),
        // Late logins: attendance where check_in > shift start + 15 min
        supabase
          .from('attendance')
          .select('id, employee:employees(full_name), check_in_time, shift:shifts(start_time, client:clients(name))')
          .eq('attendance_date', today)
          .not('check_in_time', 'is', null)
          .limit(50),
      ]);

      const orders = ordersResult.data || [];
      const shifts = shiftsResult.data || [];
      const vehicles = vehiclesResult.data || [];
      const alertsData = alertsResult.data || [];
      const noShows = noShowResult.data || [];
      const attendanceData = lateResult.data || [];

      // Order stats
      const todayOrders = orders.length;
      const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'in_transit').length;
      const completedOrders = orders.filter(o => o.status === 'completed').length;
      const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
      const rejectedOrders = orders.filter(o => o.status === 'rejected').length;
      const completionRate = todayOrders > 0 ? Math.round((completedOrders / todayOrders) * 100) : 0;

      // Fleet stats
      const totalVehicles = vehicles.length;
      const activeVehicles = vehicles.filter(v => v.vehicle_status === 'assigned').length;
      const idleVehicles = vehicles.filter(v => v.vehicle_status === 'available').length;
      const maintenanceVehicles = vehicles.filter(v => v.vehicle_status === 'maintenance').length;

      // COD tracking
      const openCods = orders.filter(o => o.cod_amount > 0 && o.cod_status !== 'remitted' && o.cod_status !== 'cleared').length;
      const openCodAmount = orders
        .filter(o => o.cod_amount > 0 && o.cod_status !== 'remitted' && o.cod_status !== 'cleared')
        .reduce((sum: number, o: any) => sum + (o.cod_amount || 0), 0);

      // Late logins: check_in > shift start + 15 minutes
      const lateLogins = attendanceData.filter((a: any) => {
        if (!a.check_in_time || !a.shift?.start_time) return false;
        const checkIn = new Date(a.check_in_time).getTime();
        const shiftStart = new Date(`${today}T${a.shift.start_time}`).getTime();
        return checkIn > shiftStart + 15 * 60 * 1000;
      });

      // Fleet breakdown for display
      const fleet = vehicles.slice(0, 10).map((v: any) => ({
        id: v.id,
        name: v.name || `${v.make} ${v.model}`.trim() || 'Vehicle',
        status: v.vehicle_status || 'unknown',
        type: v.asset_type || 'vehicle',
      }));

      // Attendance issues list (no-shows + late logins)
      const issues = [
        ...noShows.map((s: any) => ({
          id: s.id,
          name: (s.employee as unknown as { full_name: string } | null)?.full_name ?? 'Unknown',
          issue: 'No Show',
          client: (s.client as unknown as { name: string } | null)?.name ?? '',
          variant: 'error' as const,
        })),
        ...lateLogins.slice(0, 5).map((a: any) => ({
          id: a.id + '_late',
          name: (a.employee as unknown as { full_name: string } | null)?.full_name ?? 'Unknown',
          issue: 'Late Login',
          client: (a.shift as unknown as { client: { name: string } | null } | null)?.client?.name ?? '',
          variant: 'warning' as const,
        })),
      ];

      setStats({
        todayOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        rejectedOrders,
        activeRiders: shifts.length,
        completionRate,
        totalVehicles,
        activeVehicles,
        idleVehicles,
        maintenanceVehicles,
        noShows: noShows.length,
        lateLogins: lateLogins.length,
        openCods,
        openCodAmount,
      });
      setRecentOrders(orders.slice(0, 10));
      setActiveShifts(shifts);
      setFleetBreakdown(fleet);
      setAttendanceIssues(issues);
      setAlerts(alertsData);
      setLoading(false);
    }

    fetchData();
  }, [getClientFilter, selectedClientIds, showAllClients]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const clientLabel = showAllClients ? 'All Clients' : 
    selectedClientIds.length > 0 ? `${selectedClientIds.length} Client(s)` : 'Your Clients';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Operations Dashboard</h1>
          <p className="text-muted">Real-time operations overview • {clientLabel}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/kpis">
            <Button variant="outline">View KPIs</Button>
          </Link>
          <Link href="/dashboard/orders">
            <Button>Manage Orders</Button>
          </Link>
        </div>
      </div>

      {/* Critical alerts */}
      {alerts.length > 0 && (
        <div className="rounded-lg border border-error bg-error/10 p-4">
          <h3 className="font-semibold text-error">Critical Alerts ({alerts.length})</h3>
          <ul className="mt-2 space-y-1">
            {alerts.map((alert) => (
              <li key={alert.id} className="text-sm text-body">• {alert.title}</li>
            ))}
          </ul>
          <Link href="/dashboard/compliance" className="text-sm text-primary hover:underline mt-2 inline-block">
            View All Alerts →
          </Link>
        </div>
      )}

      {/* — SECTION 1: Order KPIs — */}
      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Orders Today</h2>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total" value={stats.todayOrders} />
          <StatCard label="Pending" value={stats.pendingOrders} color="warning" />
          <StatCard label="Completed" value={stats.completedOrders} color="success" />
          <StatCard label="Completion Rate" value={`${stats.completionRate}%`} color="success" />
          <StatCard label="Cancelled" value={stats.cancelledOrders} color="error" />
          <StatCard label="Rejected" value={stats.rejectedOrders} color="error" />
        </div>
      </div>

      {/* — SECTION 2: Attendance & Riders — */}
      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Attendance Today</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Active Riders" value={stats.activeRiders} color="success" />
          <StatCard label="No Shows" value={stats.noShows} color="error" />
          <StatCard label="Late Logins" value={stats.lateLogins} color="warning" />
          <StatCard label="CODs Outstanding" value={stats.openCods} color={stats.openCods > 0 ? 'error' : 'success'} />
        </div>
      </div>

      {/* — SECTION 3: Fleet — */}
      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Fleet Status</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Total Vehicles" value={stats.totalVehicles} />
          <StatCard label="Active (Assigned)" value={stats.activeVehicles} color="success" />
          <StatCard label="Idle (Available)" value={stats.idleVehicles} color="warning" />
          <StatCard label="In Maintenance" value={stats.maintenanceVehicles} color="error" />
        </div>
        {fleetBreakdown.length > 0 && (
          <div className="mt-3 rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-hover">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">Vehicle</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fleetBreakdown.map((v) => (
                  <tr key={v.id} className="hover:bg-hover">
                    <td className="px-4 py-2 font-medium text-heading">{v.name}</td>
                    <td className="px-4 py-2 text-muted capitalize">{v.type}</td>
                    <td className="px-4 py-2">
                      <Badge variant={
                        v.status === 'assigned' ? 'success' :
                        v.status === 'maintenance' ? 'error' :
                        v.status === 'available' ? 'warning' : 'outline'
                      }>
                        {v.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.totalVehicles > 10 && (
              <div className="px-4 py-2 text-xs text-muted bg-hover border-t border-border">
                Showing 10 of {stats.totalVehicles} —{' '}
                <Link href="/dashboard/assets" className="text-primary hover:underline">View all</Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* — SECTION 4: Attendance Issues + CODs — */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendance issues */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Attendance Issues</CardTitle>
            <Link href="/dashboard/shifts">
              <Button variant="outline" size="sm">View Shifts</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {attendanceIssues.length > 0 ? (
              <div className="space-y-2">
                {attendanceIssues.map((issue) => (
                  <div key={issue.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium text-heading">{issue.name}</p>
                      {issue.client && <p className="text-xs text-muted">{issue.client}</p>}
                    </div>
                    <Badge variant={issue.variant}>{issue.issue}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center py-8">No attendance issues today.</p>
            )}
          </CardContent>
        </Card>

        {/* COD outstanding */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>COD Outstanding</CardTitle>
            <Link href="/dashboard/finance">
              <Button variant="outline" size="sm">COD Tracking</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.openCods > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-error/5 border border-error/20 p-4">
                  <div>
                    <p className="text-2xl font-bold text-error">{stats.openCods}</p>
                    <p className="text-sm text-muted">Unreturned CODs today</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-error">
                      {stats.openCodAmount.toFixed(3)} BHD
                    </p>
                    <p className="text-xs text-muted">Total outstanding</p>
                  </div>
                </div>
                <Link
                  href="/dashboard/finance"
                  className="block text-center text-sm text-primary hover:underline"
                >
                  View full COD tracking →
                </Link>
              </div>
            ) : (
              <p className="text-muted text-center py-8">No outstanding CODs today.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* — SECTION 5: Live Orders + Active Riders — */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Live Orders</CardTitle>
            <Link href="/dashboard/orders">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <Link href={`/dashboard/orders/${order.id}`} className="font-medium text-primary hover:underline">
                        #{order.external_order_id}
                      </Link>
                      <p className="text-sm text-muted">
                        {(order.employee as unknown as { full_name: string } | null)?.full_name || 'Unassigned'} •{' '}
                        {(order.client as unknown as { name: string } | null)?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        order.status === 'completed' ? 'success' :
                        order.status === 'in_transit' ? 'default' :
                        order.status === 'pending' ? 'warning' :
                        order.status === 'cancelled' || order.status === 'rejected' ? 'error' : 'outline'
                      }>
                        {order.status.replace(/_/g, ' ')}
                      </Badge>
                      <p className="text-xs text-muted mt-1">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center py-8">No orders today.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active Riders</CardTitle>
            <Link href="/dashboard/shifts">
              <Button variant="outline" size="sm">View Shifts</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {activeShifts.length > 0 ? (
              <div className="space-y-3">
                {activeShifts.map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                      <div>
                        <p className="font-medium text-heading">
                          {(shift.employee as unknown as { full_name: string } | null)?.full_name}
                        </p>
                        <p className="text-sm text-muted">
                          Checked in {new Date(shift.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="success">On Duty</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center py-8">No riders currently on duty.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/shifts/new">
              <Button variant="outline">Create Shift</Button>
            </Link>
            <Link href="/dashboard/coaching/new">
              <Button variant="outline">Log Coaching</Button>
            </Link>
            <Link href="/dashboard/incidents/new">
              <Button variant="outline">Report Incident</Button>
            </Link>
            <Link href="/dashboard/assets">
              <Button variant="outline">Manage Fleet</Button>
            </Link>
            <Link href="/dashboard/finance">
              <Button variant="outline">COD Tracking</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: 'success' | 'warning' | 'error' }) {
  const colorClass = color === 'success' ? 'text-success' : color === 'warning' ? 'text-warning' : color === 'error' ? 'text-error' : 'text-heading';
  return (
    <Card>
      <CardContent className="pt-6">
        <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
        <p className="text-sm text-muted mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

