'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
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
  const [platformBreakdown, setPlatformBreakdown] = useState<{ name: string; orders: number; completed: number }[]>([]);

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
        .select('id, external_order_id, status, created_at, order_value, total_revenue, net_revenue, client:clients(name), employee:employees(full_name)')
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
          .select('id, name, vehicle_status, type, make, model, assigned_employee_id')
          .eq('type', 'vehicle')
          .neq('vehicle_status', 'disposed'),
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

      // Pending order revenue (stand-in for COD outstanding)
      const openCods = orders.filter(o => o.status === 'pending').length;
      const openCodAmount = orders
        .filter(o => o.status === 'pending')
        .reduce((sum: number, o: any) => sum + (o.total_revenue || o.order_value || 0), 0);

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
        type: v.type || 'vehicle',
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
      // Platform breakdown from all today's orders
      const platformMap: Record<string, { name: string; orders: number; completed: number }> = {};
      orders.forEach((o: any) => {
        const name = (o.client as any)?.name ?? 'Unknown';
        if (!platformMap[name]) platformMap[name] = { name, orders: 0, completed: 0 };
        platformMap[name].orders++;
        if (o.status === 'completed') platformMap[name].completed++;
      });
      setPlatformBreakdown(Object.values(platformMap).sort((a, b) => b.orders - a.orders).slice(0, 6));
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

  const orderChartData = [
    { name: 'Completed', value: stats.completedOrders, color: '#22c55e' },
    { name: 'Pending', value: stats.pendingOrders, color: '#f59e0b' },
    { name: 'Cancelled', value: stats.cancelledOrders, color: '#ef4444' },
    { name: 'Rejected', value: stats.rejectedOrders, color: '#f97316' },
  ].filter(d => d.value > 0);

  const fleetChartData = [
    { name: 'Assigned', value: stats.activeVehicles, color: '#22c55e' },
    { name: 'Available', value: stats.idleVehicles, color: '#3b82f6' },
    { name: 'Maintenance', value: stats.maintenanceVehicles, color: '#ef4444' },
    { name: 'Off Road', value: Math.max(0, stats.totalVehicles - stats.activeVehicles - stats.idleVehicles - stats.maintenanceVehicles), color: '#94a3b8' },
  ].filter(d => d.value > 0);

  const attendanceBarData = [
    { name: 'On Time', value: Math.max(0, stats.activeRiders - stats.lateLogins), color: '#22c55e' },
    { name: 'Late', value: stats.lateLogins, color: '#f59e0b' },
    { name: 'No Show', value: stats.noShows, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Operations Dashboard</h1>
          <p className="text-muted">Real-time operations overview • {clientLabel}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/kpis"><Button variant="outline">View KPIs</Button></Link>
          <Link href="/dashboard/orders"><Button>Manage Orders</Button></Link>
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
          <Link href="/dashboard/compliance" className="text-sm text-primary hover:underline mt-2 inline-block">View All Alerts →</Link>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Orders Today" value={stats.todayOrders} sub="deliveries processed" color="primary" />
        <KpiCard label="Completion Rate" value={`${stats.completionRate}%`} sub={`${stats.completedOrders} of ${stats.todayOrders} completed`} color={stats.completionRate >= 80 ? 'success' : stats.completionRate >= 60 ? 'warning' : 'error'} />
        <KpiCard label="Active Riders" value={stats.activeRiders} sub="currently on duty" color="success" />
        <KpiCard label="Pending Orders" value={`${stats.openCodAmount.toFixed(3)} BHD`} sub={`${stats.openCods} pending`} color={stats.openCods > 0 ? 'error' : 'success'} />
      </div>

      {/* Charts row: order status donut + orders by platform bar */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Order Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            {stats.todayOrders > 0 ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative h-52 w-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={orderChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={96} dataKey="value" stroke="transparent" paddingAngle={2}>
                        {orderChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${v} orders`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-heading">{stats.todayOrders}</span>
                    <span className="text-xs text-muted">total today</span>
                  </div>
                </div>
                <div className="w-full grid grid-cols-2 gap-2">
                  {orderChartData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 p-2 rounded-lg bg-hover">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ background: d.color }} />
                      <div>
                        <p className="text-xs text-muted">{d.name}</p>
                        <p className="text-sm font-bold text-heading">{d.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted text-center py-16">No orders today.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Orders by Platform</CardTitle></CardHeader>
          <CardContent>
            {platformBreakdown.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformBreakdown} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={90} />
                    <Tooltip />
                    <Bar dataKey="orders" name="Total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted text-center py-16">No order data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fleet + Attendance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Fleet Status</CardTitle></CardHeader>
          <CardContent>
            {stats.totalVehicles > 0 ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative h-52 w-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={fleetChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={96} dataKey="value" stroke="transparent" paddingAngle={2}>
                        {fleetChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-heading">{stats.totalVehicles}</span>
                    <span className="text-xs text-muted">vehicles</span>
                  </div>
                </div>
                <div className="w-full grid grid-cols-2 gap-2">
                  {fleetChartData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 p-2 rounded-lg bg-hover">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ background: d.color }} />
                      <div>
                        <p className="text-xs text-muted">{d.name}</p>
                        <p className="text-sm font-bold text-heading">{d.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted text-center py-16">No vehicles registered.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Today&#39;s Attendance</CardTitle></CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceBarData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Riders" radius={[4, 4, 0, 0]}>
                    {attendanceBarData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {attendanceBarData.map((d) => (
                <div key={d.name} className="text-center p-3 rounded-lg bg-hover">
                  <p className="text-2xl font-bold" style={{ color: d.color }}>{d.value}</p>
                  <p className="text-xs text-muted mt-0.5">{d.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance issues + CODs */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Attendance Issues</CardTitle>
            <Link href="/dashboard/shifts"><Button variant="outline" size="sm">View Shifts</Button></Link>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Live Orders</CardTitle>
            <Link href="/dashboard/orders"><Button variant="outline" size="sm">View All</Button></Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="space-y-2">
                {recentOrders.slice(0, 6).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <Link href={`/dashboard/orders/${order.id}`} className="font-medium text-primary hover:underline text-sm">
                        #{order.external_order_id}
                      </Link>
                      <p className="text-xs text-muted">
                        {(order.employee as unknown as { full_name: string } | null)?.full_name || 'Unassigned'} •{' '}
                        {(order.client as unknown as { name: string } | null)?.name}
                      </p>
                    </div>
                    <Badge variant={
                      order.status === 'completed' ? 'success' :
                      order.status === 'pending' ? 'warning' :
                      order.status === 'cancelled' || order.status === 'rejected' ? 'error' : 'default'
                    }>
                      {order.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center py-8">No orders today.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/shifts/new"><Button variant="outline">Create Shift</Button></Link>
            <Link href="/dashboard/coaching/new"><Button variant="outline">Log Coaching</Button></Link>
            <Link href="/dashboard/incidents/new"><Button variant="outline">Report Incident</Button></Link>
            <Link href="/dashboard/assets"><Button variant="outline">Manage Fleet</Button></Link>
            <Link href="/dashboard/finance"><Button variant="outline">COD Tracking</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: 'primary' | 'success' | 'warning' | 'error' }) {
  const colorClass = { primary: 'text-primary', success: 'text-success', warning: 'text-warning', error: 'text-error' }[color];
  const borderClass = { primary: 'border-l-primary', success: 'border-l-success', warning: 'border-l-warning', error: 'border-l-error' }[color];
  return (
    <div className={`rounded-lg border border-border border-l-4 ${borderClass} bg-card p-4`}>
      <p className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colorClass}`}>{value}</p>
      <p className="text-xs text-muted mt-1">{sub}</p>
    </div>
  );
}

function AttendanceCard({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold mt-1 text-heading">{value}</p>
      <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-xs text-muted mt-1">{pct}% of shifts</p>
    </div>
  );
}
