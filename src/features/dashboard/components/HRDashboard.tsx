'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useClientContext } from '@/contexts';

/**
 * HR Dashboard
 * Shows employee stats, pending leaves, document compliance, and onboarding status.
 */
export function HRDashboard() {
  const { getClientFilter, selectedClientIds, showAllClients } = useClientContext();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingOnboarding: 0,
    pendingLeaves: 0,
    expiringDocuments: 0,
    nonCompliant: 0,
  });
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<any[]>([]);
  const [recentHires, setRecentHires] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const clientFilter = getClientFilter();

      // Build employee query with optional client filter
      let employeesQuery = supabase.from('employees').select('id, status, compliance_status, hire_date');
      
      if (clientFilter && clientFilter.length > 0) {
        // Get employees assigned to these clients
        const { data: assignments } = await supabase
          .from('client_assignments')
          .select('employee_id')
          .in('client_id', clientFilter)
          .eq('status', 'active');
        
        const employeeIds = assignments?.map(a => a.employee_id) || [];
        if (employeeIds.length > 0) {
          employeesQuery = employeesQuery.in('id', employeeIds);
        } else {
          // No employees for selected clients - set empty results
          setStats({
            totalEmployees: 0,
            activeEmployees: 0,
            pendingOnboarding: 0,
            pendingLeaves: 0,
            expiringDocuments: 0,
            nonCompliant: 0,
          });
          setPendingLeaves([]);
          setExpiringDocs([]);
          setRecentHires([]);
          setLoading(false);
          return;
        }
      } else if (clientFilter !== null) {
        // clientFilter is empty array (no clients selected) - show nothing
        setStats({
          totalEmployees: 0,
          activeEmployees: 0,
          pendingOnboarding: 0,
          pendingLeaves: 0,
          expiringDocuments: 0,
          nonCompliant: 0,
        });
        setPendingLeaves([]);
        setExpiringDocs([]);
        setRecentHires([]);
        setLoading(false);
        return;
      }
      // clientFilter === null means show all (no filter)

      const [employeesResult, leavesResult, docsResult] = await Promise.all([
        employeesQuery,
        supabase
          .from('leaves')
          .select('id, employee:employees(full_name), leave_type, start_date, end_date, status')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('employee_documents')
          .select('id, employee:employees(full_name), type, expires_at')
          .lte('expires_at', thirtyDaysFromNow)
          .gte('expires_at', today.toISOString().split('T')[0])
          .order('expires_at', { ascending: true })
          .limit(10),
      ]);

      const employees = employeesResult.data || [];
      const leaves = leavesResult.data || [];
      const docs = docsResult.data || [];

      // Calculate stats
      const totalEmployees = employees.length;
      const activeEmployees = employees.filter(e => e.status === 'active').length;
      const pendingOnboarding = employees.filter(e => e.status === 'pending').length;
      const nonCompliant = employees.filter(e => 
        e.compliance_status === 'non_compliant' || e.compliance_status === 'blocked'
      ).length;
      const recentHiresData = employees
        .filter(e => e.hire_date && e.hire_date >= thirtyDaysAgo)
        .slice(0, 5);

      setStats({
        totalEmployees,
        activeEmployees,
        pendingOnboarding,
        pendingLeaves: leaves.length,
        expiringDocuments: docs.length,
        nonCompliant,
      });
      setPendingLeaves(leaves);
      setExpiringDocs(docs);
      setRecentHires(recentHiresData);
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

  const inactive = stats.totalEmployees - stats.activeEmployees - stats.pendingOnboarding;
  const empChartData = [
    { name: 'Active', value: stats.activeEmployees, color: '#22c55e' },
    { name: 'Onboarding', value: stats.pendingOnboarding, color: '#3b82f6' },
    { name: 'Inactive', value: inactive > 0 ? inactive : 0, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  const complianceChartData = [
    { name: 'Compliant', value: stats.totalEmployees - stats.nonCompliant, color: '#22c55e' },
    { name: 'Non-Compliant', value: stats.nonCompliant, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">HR Dashboard</h1>
          <p className="text-muted">Employee management overview • {clientLabel}</p>
        </div>
        <Link href="/dashboard/employees/new"><Button>Add Employee</Button></Link>
      </div>

      {/* Alerts banner */}
      {(stats.nonCompliant > 0 || stats.pendingLeaves > 0 || stats.expiringDocuments > 0) && (
        <div className="rounded-lg border border-warning bg-warning/10 p-4">
          <h3 className="font-semibold text-warning">Requires Attention</h3>
          <div className="mt-2 flex flex-wrap gap-4">
            {stats.nonCompliant > 0 && <span className="text-sm text-body">⚠ {stats.nonCompliant} compliance issue(s)</span>}
            {stats.pendingLeaves > 0 && <span className="text-sm text-body">📋 {stats.pendingLeaves} leave request(s) pending</span>}
            {stats.expiringDocuments > 0 && <span className="text-sm text-body">📄 {stats.expiringDocuments} document(s) expiring soon</span>}
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border border-l-4 border-l-primary bg-card p-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Total Headcount</p>
          <p className="text-3xl font-bold mt-1 text-primary">{stats.totalEmployees}</p>
          <p className="text-xs text-muted mt-1">{stats.activeEmployees} active this month</p>
        </div>
        <div className="rounded-lg border border-border border-l-4 border-l-warning bg-card p-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Leave Requests</p>
          <p className="text-3xl font-bold mt-1 text-warning">{stats.pendingLeaves}</p>
          <p className="text-xs text-muted mt-1">pending approval</p>
        </div>
        <div className="rounded-lg border border-border border-l-4 border-l-error bg-card p-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Expiring Docs</p>
          <p className="text-3xl font-bold mt-1 text-error">{stats.expiringDocuments}</p>
          <p className="text-xs text-muted mt-1">within 30 days</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Employee status donut */}
        <Card>
          <CardHeader><CardTitle>Workforce Status</CardTitle></CardHeader>
          <CardContent>
            {stats.totalEmployees > 0 ? (
              <div className="flex items-center gap-6">
                <div className="relative h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={empChartData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} dataKey="value" strokeWidth={2} stroke="transparent">
                        {empChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-heading">{stats.totalEmployees}</span>
                    <span className="text-xs text-muted">total</span>
                  </div>
                </div>
                <div className="space-y-3 flex-1">
                  {empChartData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-sm text-body">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 rounded-full bg-border w-20 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(d.value / stats.totalEmployees) * 100}%`, background: d.color }} />
                        </div>
                        <span className="text-sm font-medium text-heading w-6 text-right">{d.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted text-center py-10">No employee data.</p>
            )}
          </CardContent>
        </Card>

        {/* Compliance donut */}
        <Card>
          <CardHeader><CardTitle>Document Compliance</CardTitle></CardHeader>
          <CardContent>
            {stats.totalEmployees > 0 ? (
              <div className="flex items-center gap-6">
                <div className="relative h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={complianceChartData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} dataKey="value" strokeWidth={2} stroke="transparent">
                        {complianceChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-heading">
                      {stats.totalEmployees > 0 ? Math.round(((stats.totalEmployees - stats.nonCompliant) / stats.totalEmployees) * 100) : 0}%
                    </span>
                    <span className="text-xs text-muted">compliant</span>
                  </div>
                </div>
                <div className="space-y-3 flex-1">
                  {complianceChartData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-sm text-body">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 rounded-full bg-border w-20 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(d.value / stats.totalEmployees) * 100}%`, background: d.color }} />
                        </div>
                        <span className="text-sm font-medium text-heading w-6 text-right">{d.value}</span>
                      </div>
                    </div>
                  ))}
                  {stats.expiringDocuments > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-warning">⚠ {stats.expiringDocuments} document(s) expiring within 30 days</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted text-center py-10">No compliance data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending leaves + Expiring docs */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pending Leave Requests</CardTitle>
            <Link href="/dashboard/leaves"><Button variant="outline" size="sm">View All</Button></Link>
          </CardHeader>
          <CardContent>
            {pendingLeaves.length > 0 ? (
              <div className="space-y-3">
                {pendingLeaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium text-heading">{(leave.employee as unknown as { full_name: string } | null)?.full_name}</p>
                      <p className="text-sm text-muted capitalize">
                        {leave.leave_type?.replace(/_/g, ' ')} • {new Date(leave.start_date).toLocaleDateString('en-GB')} – {new Date(leave.end_date).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center py-8">No pending leave requests.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Expiring Documents</CardTitle>
            <Link href="/dashboard/documents"><Button variant="outline" size="sm">View All</Button></Link>
          </CardHeader>
          <CardContent>
            {expiringDocs.length > 0 ? (
              <div className="space-y-3">
                {expiringDocs.map((doc) => {
                  const daysUntil = Math.ceil((new Date(doc.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <p className="font-medium text-heading">{(doc.employee as unknown as { full_name: string } | null)?.full_name}</p>
                        <p className="text-sm text-muted capitalize">{doc.type?.replace(/_/g, ' ')}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={daysUntil <= 7 ? 'error' : 'warning'}>{daysUntil}d</Badge>
                        <p className="text-xs text-muted mt-0.5">{new Date(doc.expires_at).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted text-center py-8">No documents expiring soon.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/employees/new"><Button variant="outline">Add Employee</Button></Link>
            <Link href="/dashboard/leaves"><Button variant="outline">Manage Leaves</Button></Link>
            <Link href="/dashboard/documents"><Button variant="outline">Document Center</Button></Link>
            <Link href="/dashboard/training"><Button variant="outline">Training</Button></Link>
            <Link href="/dashboard/referrals"><Button variant="outline">Referrals</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
