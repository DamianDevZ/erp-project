'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, Spinner } from '@/components/ui';
import {
  useDashboardMetrics,
  usePlatformPerformance,
  useOrdersTrend,
} from '@/features/analytics/queries';
import { useOptionalClientContext } from '@/contexts';
import { createClient } from '@/lib/supabase/client';

/**
 * Visual charts section for the Admin (main) dashboard.
 * Shows: 14-day orders trend, platform performance bar, fleet & rider donuts.
 */
export function AdminChartsSection() {
  const clientContext = useOptionalClientContext();
  const clientIds = clientContext?.getClientFilter() ?? null;

  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics(clientIds);
  const { data: platforms, isLoading: platformsLoading } = usePlatformPerformance(undefined, undefined, clientIds);
  const { data: ordersTrend, isLoading: trendLoading } = useOrdersTrend(14, clientIds);

  // Finance summary from invoices
  const [financeStats, setFinanceStats] = useState({
    paidRevenue: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    payrollCost: 0,
  });
  const [financeLoading, setFinanceLoading] = useState(true);

  useEffect(() => {
    async function fetchFinance() {
      const supabase = createClient();
      const [invoicesRes, payrollRes] = await Promise.all([
        supabase.from('invoices').select('total, status'),
        supabase.from('payroll_batches').select('total_net_pay, status'),
      ]);
      const invoices = invoicesRes.data ?? [];
      const payroll = payrollRes.data ?? [];

      const paid = invoices.filter(i => i.status === 'paid');
      const pending = invoices.filter(i => i.status === 'sent' || i.status === 'draft');
      const overdue = invoices.filter(i => i.status === 'overdue');
      const sum = (arr: { total: number | null }[]) => arr.reduce((s, i) => s + (i.total ?? 0), 0);

      const payrollCost = payroll
        .filter(p => p.status === 'paid' || p.status === 'approved')
        .reduce((s, p) => s + (p.total_net_pay ?? 0), 0);

      setFinanceStats({
        paidRevenue: sum(paid),
        pendingAmount: sum(pending),
        overdueAmount: sum(overdue),
        paidCount: paid.length,
        pendingCount: pending.length,
        overdueCount: overdue.length,
        payrollCost,
      });
      setFinanceLoading(false);
    }
    fetchFinance();
  }, []);

  const isLoading = metricsLoading || platformsLoading || trendLoading;

  const assignedVehicles = Math.max(0, (metrics?.total_vehicles ?? 0) - (metrics?.available_vehicles ?? 0));
  const fleetData = [
    { name: 'Assigned', value: assignedVehicles, color: '#22c55e' },
    { name: 'Available', value: metrics?.available_vehicles ?? 0, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const offDutyRiders = Math.max(0, (metrics?.total_employees ?? 0) - (metrics?.active_employees ?? 0));
  const riderData = [
    { name: 'On Shift', value: metrics?.active_employees ?? 0, color: '#22c55e' },
    { name: 'Off Duty', value: offDutyRiders, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  const platformBarData = (platforms ?? [])
    .sort((a, b) => b.total_orders - a.total_orders)
    .slice(0, 6)
    .map(p => ({
      name: p.platform_name.length > 14 ? p.platform_name.slice(0, 14) + '…' : p.platform_name,
      orders: p.total_orders,
    }));

  // Fill all 14 days so every date shows a tooltip (missing days = 0)
  const trendData = (() => {
    const byDate: Record<string, number> = {};
    (ordersTrend ?? []).forEach(d => { byDate[d.date] = d.value; });
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const key = d.toISOString().split('T')[0];
      return {
        date: d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
        orders: byDate[key] ?? 0,
      };
    });
  })();

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center h-48">
              <Spinner />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 14-day orders area chart */}
      <Card>
        <CardHeader>
          <CardTitle>Orders — Last 14 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#ordersGradient)"
                    dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted text-center py-16">No order history yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Platform performance bar chart */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Performance (All Time)</CardTitle>
        </CardHeader>
        <CardContent>
          {platformBarData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformBarData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="orders" name="Total Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={72} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted text-center py-16">No platform data yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Fleet + Riders donuts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Fleet Deployment</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-52 w-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fleetData} cx="50%" cy="50%" innerRadius={60} outerRadius={96} dataKey="value" stroke="transparent" paddingAngle={2}>
                      {fleetData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-heading">{metrics?.total_vehicles ?? 0}</span>
                  <span className="text-xs text-muted">vehicles</span>
                </div>
              </div>
              <div className="w-full grid grid-cols-2 gap-2">
                {fleetData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 p-3 rounded-lg bg-hover">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ background: d.color }} />
                    <div>
                      <p className="text-xs text-muted">{d.name}</p>
                      <p className="text-sm font-bold text-heading">{d.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Rider Deployment</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-52 w-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riderData} cx="50%" cy="50%" innerRadius={60} outerRadius={96} dataKey="value" stroke="transparent" paddingAngle={2}>
                      {riderData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-heading">{metrics?.total_employees ?? 0}</span>
                  <span className="text-xs text-muted">riders</span>
                </div>
              </div>
              <div className="w-full grid grid-cols-2 gap-2">
                {riderData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 p-3 rounded-lg bg-hover">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ background: d.color }} />
                    <div>
                      <p className="text-xs text-muted">{d.name}</p>
                      <p className="text-sm font-bold text-heading">{d.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Finance Overview */}
      {!financeLoading && (
        <Card>
          <CardHeader><CardTitle>Finance Overview</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Invoice Status donut */}
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm font-semibold text-muted self-start">Invoice Status</p>
                {(() => {
                  const invoiceData = [
                    { name: 'Paid', value: financeStats.paidCount, color: '#22c55e' },
                    { name: 'Pending', value: financeStats.pendingCount, color: '#3b82f6' },
                    { name: 'Overdue', value: financeStats.overdueCount, color: '#ef4444' },
                  ].filter(d => d.value > 0);
                  const total = financeStats.paidCount + financeStats.pendingCount + financeStats.overdueCount;
                  return invoiceData.length > 0 ? (
                    <>
                      <div className="relative h-52 w-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={invoiceData} cx="50%" cy="50%" innerRadius={60} outerRadius={96} dataKey="value" stroke="transparent" paddingAngle={2}>
                              {invoiceData.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-3xl font-bold text-heading">{total}</span>
                          <span className="text-xs text-muted">invoices</span>
                        </div>
                      </div>
                      <div className="w-full grid grid-cols-2 gap-2">
                        {invoiceData.map(d => (
                          <div key={d.name} className="flex items-center gap-2 p-3 rounded-lg bg-hover">
                            <div className="h-3 w-3 rounded-full shrink-0" style={{ background: d.color }} />
                            <div>
                              <p className="text-xs text-muted">{d.name}</p>
                              <p className="text-sm font-bold text-heading">{d.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <p className="text-muted text-sm">No invoices yet.</p>;
                })()}
              </div>

              {/* Revenue vs Payroll bar */}
              <div>
                <p className="text-sm font-semibold text-muted mb-3">Revenue vs Payroll Cost</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Paid Revenue', value: financeStats.paidRevenue, fill: '#22c55e' },
                        { name: 'Pending', value: financeStats.pendingAmount, fill: '#3b82f6' },
                        { name: 'Payroll Cost', value: financeStats.payrollCost, fill: '#ef4444' },
                      ]}
                      margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${(v/1000).toFixed(1)}k`} />
                      <Tooltip formatter={v => [`${Number(v).toFixed(3)} BHD`, '']} />
                      <Bar dataKey="value" radius={[4,4,0,0]} maxBarSize={72}>
                        {[{ fill:'#22c55e' },{ fill:'#3b82f6' },{ fill:'#ef4444' }].map((e,i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-hover">
                    <p className="text-xs font-bold text-success">{financeStats.paidRevenue.toFixed(3)}</p>
                    <p className="text-xs text-muted">Paid (BHD)</p>
                  </div>
                  <div className="p-2 rounded-lg bg-hover">
                    <p className="text-xs font-bold text-primary">{financeStats.pendingAmount.toFixed(3)}</p>
                    <p className="text-xs text-muted">Pending</p>
                  </div>
                  <div className="p-2 rounded-lg bg-hover">
                    <p className="text-xs font-bold text-error">{financeStats.payrollCost.toFixed(3)}</p>
                    <p className="text-xs text-muted">Payroll</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
