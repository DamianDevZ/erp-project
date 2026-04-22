'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useClientContext } from '@/contexts';

interface Shift {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  client?: { name: string };
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  platform?: { name: string };
}

interface Document {
  id: string;
  type: string;
  file_name: string;
  expires_at: string | null;
}

/**
 * Rider Dashboard
 * Shows the rider's upcoming shifts, recent orders, documents status, and earnings.
 */
export function RiderDashboard({ employeeId }: { employeeId?: string }) {
  const { getClientFilter } = useClientContext();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState({ todayOrders: 0, weekOrders: 0, monthEarnings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!employeeId) return;

      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const clientFilter = getClientFilter();

      // Fetch upcoming shifts
      let shiftsQuery = supabase
        .from('attendance')
        .select('id, date, check_in, check_out, status, shift:shifts(client:clients(name))')
        .eq('employee_id', employeeId)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(5);

      const { data: shiftsData } = await shiftsQuery;

      // Fetch recent orders
      let ordersQuery = supabase
        .from('orders')
        .select('id, order_number, status, created_at, client:clients(name)')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (clientFilter && clientFilter.length > 0) {
        ordersQuery = ordersQuery.in('client_id', clientFilter);
      } else if (clientFilter !== null) {
        // Empty array means no clients selected - show nothing
        setOrders([]);
        setStats({ todayOrders: 0, weekOrders: 0, monthEarnings: 0 });
        setShifts([]);
        setDocuments([]);
        setLoading(false);
        return;
      }

      const { data: ordersData } = await ordersQuery;

      // Fetch documents
      const { data: docsData } = await supabase
        .from('employee_documents')
        .select('id, type, file_name, expires_at')
        .eq('employee_id', employeeId)
        .order('expires_at', { ascending: true });

      // Calculate stats
      const todayOrders = ordersData?.filter(o => 
        o.created_at.startsWith(today)
      ).length || 0;

      const weekOrders = ordersData?.filter(o => 
        o.created_at >= weekAgo
      ).length || 0;

      setShifts(shiftsData?.map(s => ({
        id: s.id,
        date: s.date,
        start_time: s.check_in || '',
        end_time: s.check_out || '',
        status: s.status,
        client: (s.shift as unknown as { client: { name: string } | null } | null)?.client,
      })) || []);
      setOrders(ordersData || []);
      setDocuments(docsData || []);
      setStats({ todayOrders, weekOrders, monthEarnings: 0 });
      setLoading(false);
    }

    fetchData();
  }, [employeeId, getClientFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Check for expiring documents
  const expiringDocs = documents.filter(d => {
    if (!d.expires_at) return false;
    const daysUntil = Math.ceil((new Date(d.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil > 0;
  });

  const expiredDocs = documents.filter(d => {
    if (!d.expires_at) return false;
    return new Date(d.expires_at) < new Date();
  });

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-heading">My Dashboard</h1>
        <p className="text-muted">Welcome back! Here's your overview.</p>
      </div>

      {/* Alerts for expiring documents */}
      {(expiredDocs.length > 0 || expiringDocs.length > 0) && (
        <div className="rounded-lg border border-warning bg-warning/10 p-4">
          <h3 className="font-semibold text-warning">Document Alerts</h3>
          {expiredDocs.length > 0 && (
            <p className="text-sm text-error mt-1">
              {expiredDocs.length} document(s) have expired. Please renew immediately.
            </p>
          )}
          {expiringDocs.length > 0 && (
            <p className="text-sm text-warning mt-1">
              {expiringDocs.length} document(s) expiring within 30 days.
            </p>
          )}
          <Link href="/dashboard/documents" className="text-sm text-primary hover:underline mt-2 inline-block">
            View Documents →
          </Link>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-heading">{stats.todayOrders}</div>
            <p className="text-sm text-muted">Orders Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-heading">{stats.weekOrders}</div>
            <p className="text-sm text-muted">Orders This Week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-heading">{shifts.length}</div>
            <p className="text-sm text-muted">Upcoming Shifts</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming shifts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Shifts</CardTitle>
            <Link href="/dashboard/shifts">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {shifts.length > 0 ? (
              <div className="space-y-3">
                {shifts.map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium text-heading">
                        {new Date(shift.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-sm text-muted">{shift.client?.name || 'Unassigned'}</p>
                    </div>
                    <Badge variant={shift.status === 'confirmed' ? 'success' : 'outline'}>
                      {shift.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center py-8">No upcoming shifts scheduled.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Link href="/dashboard/orders">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {orders.length > 0 ? (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium text-heading">{order.order_number}</p>
                      <p className="text-sm text-muted">{order.platform?.name}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={order.status === 'completed' ? 'success' : order.status === 'cancelled' ? 'error' : 'default'}>
                        {order.status}
                      </Badge>
                      <p className="text-xs text-muted mt-1">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center py-8">No recent orders.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My Documents</CardTitle>
          <Link href="/dashboard/documents">
            <Button variant="outline" size="sm">Manage Documents</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {documents.map((doc) => {
                const isExpired = doc.expires_at && new Date(doc.expires_at) < new Date();
                const isExpiring = doc.expires_at && !isExpired && 
                  Math.ceil((new Date(doc.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 30;

                return (
                  <div key={doc.id} className="p-3 rounded-lg border border-border">
                    <p className="font-medium text-heading capitalize">{doc.type.replace(/_/g, ' ')}</p>
                    {doc.expires_at && (
                      <p className={`text-sm ${isExpired ? 'text-error' : isExpiring ? 'text-warning' : 'text-muted'}`}>
                        {isExpired ? 'Expired' : `Expires ${new Date(doc.expires_at).toLocaleDateString('en-GB')}`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted text-center py-8">No documents uploaded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
