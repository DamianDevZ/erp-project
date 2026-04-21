'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useClientContext } from '@/contexts';

/**
 * Operations Dashboard
 * Shows KPIs, orders, active riders, assets, and operational alerts.
 */
export function OperationsDashboard() {
  const { getClientFilter, selectedClientIds, showAllClients } = useClientContext();
  const [stats, setStats] = useState({
    todayOrders: 0,
    pendingOrders: 0,
    activeRiders: 0,
    availableVehicles: 0,
    avgDeliveryTime: 0,
    completionRate: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [activeShifts, setActiveShifts] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];
      const clientFilter = getClientFilter();

      // If no clients selected (empty array), show nothing
      if (clientFilter !== null && clientFilter.length === 0) {
        setStats({
          todayOrders: 0,
          pendingOrders: 0,
          activeRiders: 0,
          availableVehicles: 0,
          avgDeliveryTime: 0,
          completionRate: 0,
        });
        setRecentOrders([]);
        setActiveShifts([]);
        setAlerts([]);
        setLoading(false);
        return;
      }

      // Build queries with client filter
      let ordersQuery = supabase
        .from('orders')
        .select('id, external_order_id, status, created_at, client:clients(name), employee:employees(full_name)')
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: false });

      if (clientFilter && clientFilter.length > 0) {
        ordersQuery = ordersQuery.in('client_id', clientFilter);
      }

      const [ordersResult, shiftsResult, vehiclesResult, alertsResult] = await Promise.all([
        ordersQuery.limit(50),
        supabase
          .from('attendance')
          .select('id, employee:employees(id, full_name), status, check_in_time')
          .eq('attendance_date', today)
          .not('check_in_time', 'is', null)
          .limit(20),
        supabase
          .from('assets')
          .select('id, vehicle_status')
          .eq('type', 'vehicle'),
        supabase
          .from('compliance_alerts')
          .select('id, title, severity')
          .in('status', ['open', 'acknowledged'])
          .in('severity', ['critical', 'high'])
          .limit(5),
      ]);

      const orders = ordersResult.data || [];
      const shifts = shiftsResult.data || [];
      const vehicles = vehiclesResult.data || [];
      const alertsData = alertsResult.data || [];

      // Calculate stats
      const todayOrders = orders.length;
      const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'in_transit').length;
      const completedOrders = orders.filter(o => o.status === 'completed').length;
      const completionRate = todayOrders > 0 ? Math.round((completedOrders / todayOrders) * 100) : 0;
      const availableVehicles = vehicles.filter(v => v.vehicle_status === 'available').length;

      setStats({
        todayOrders,
        pendingOrders,
        activeRiders: shifts.length,
        availableVehicles,
        avgDeliveryTime: 25, // Would come from actual calculation
        completionRate,
      });
      setRecentOrders(orders.slice(0, 10));
      setActiveShifts(shifts);
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
              <li key={alert.id} className="text-sm text-body">
                • {alert.title}
              </li>
            ))}
          </ul>
          <Link href="/dashboard/compliance" className="text-sm text-primary hover:underline mt-2 inline-block">
            View All Alerts →
          </Link>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-heading">{stats.todayOrders}</div>
            <p className="text-sm text-muted">Orders Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-warning">{stats.pendingOrders}</div>
            <p className="text-sm text-muted">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-success">{stats.completionRate}%</div>
            <p className="text-sm text-muted">Completion Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-heading">{stats.activeRiders}</div>
            <p className="text-sm text-muted">Active Riders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-heading">{stats.availableVehicles}</div>
            <p className="text-sm text-muted">Available Vehicles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-heading">{stats.avgDeliveryTime}m</div>
            <p className="text-sm text-muted">Avg Delivery Time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Live orders */}
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
                        {order.external_order_id}
                      </Link>
                      <p className="text-sm text-muted">
                        {order.employee?.full_name || 'Unassigned'} • {order.client?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        order.status === 'completed' ? 'success' : 
                        order.status === 'in_transit' ? 'default' :
                        order.status === 'pending' ? 'warning' : 'outline'
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

        {/* Active riders */}
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
                        <p className="font-medium text-heading">{shift.employee?.full_name}</p>
                        <p className="text-sm text-muted">
                          Checked in {new Date(shift.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              <Button variant="outline">Manage Assets</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
