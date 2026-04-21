'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">HR Dashboard</h1>
          <p className="text-muted">Employee management overview • {clientLabel}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/employees/new">
            <Button>Add Employee</Button>
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {(stats.nonCompliant > 0 || stats.pendingLeaves > 0) && (
        <div className="rounded-lg border border-warning bg-warning/10 p-4">
          <h3 className="font-semibold text-warning">Requires Attention</h3>
          <ul className="mt-2 space-y-1 text-sm text-body">
            {stats.nonCompliant > 0 && (
              <li>• {stats.nonCompliant} employee(s) have compliance issues</li>
            )}
            {stats.pendingLeaves > 0 && (
              <li>• {stats.pendingLeaves} leave request(s) pending approval</li>
            )}
            {stats.expiringDocuments > 0 && (
              <li>• {stats.expiringDocuments} document(s) expiring within 30 days</li>
            )}
          </ul>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-heading">{stats.totalEmployees}</div>
            <p className="text-sm text-muted">Total Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-success">{stats.activeEmployees}</div>
            <p className="text-sm text-muted">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-warning">{stats.pendingOnboarding}</div>
            <p className="text-sm text-muted">Onboarding</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-warning">{stats.pendingLeaves}</div>
            <p className="text-sm text-muted">Pending Leaves</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-warning">{stats.expiringDocuments}</div>
            <p className="text-sm text-muted">Expiring Docs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-error">{stats.nonCompliant}</div>
            <p className="text-sm text-muted">Non-Compliant</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending leave requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pending Leave Requests</CardTitle>
            <Link href="/dashboard/leaves">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {pendingLeaves.length > 0 ? (
              <div className="space-y-3">
                {pendingLeaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium text-heading">{leave.employee?.full_name}</p>
                      <p className="text-sm text-muted">
                        {leave.leave_type} • {new Date(leave.start_date).toLocaleDateString('en-GB')} - {new Date(leave.end_date).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Review</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center py-8">No pending leave requests.</p>
            )}
          </CardContent>
        </Card>

        {/* Expiring documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Expiring Documents</CardTitle>
            <Link href="/dashboard/documents">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {expiringDocs.length > 0 ? (
              <div className="space-y-3">
                {expiringDocs.map((doc) => {
                  const daysUntil = Math.ceil(
                    (new Date(doc.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <p className="font-medium text-heading">{doc.employee?.full_name}</p>
                        <p className="text-sm text-muted capitalize">{doc.type.replace(/_/g, ' ')}</p>
                      </div>
                      <Badge variant={daysUntil <= 7 ? 'error' : 'warning'}>
                        {daysUntil} days
                      </Badge>
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
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/employees/new">
              <Button variant="outline">Add Employee</Button>
            </Link>
            <Link href="/dashboard/leaves">
              <Button variant="outline">Manage Leaves</Button>
            </Link>
            <Link href="/dashboard/documents">
              <Button variant="outline">Document Center</Button>
            </Link>
            <Link href="/dashboard/training">
              <Button variant="outline">Training</Button>
            </Link>
            <Link href="/dashboard/referrals">
              <Button variant="outline">Referrals</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
