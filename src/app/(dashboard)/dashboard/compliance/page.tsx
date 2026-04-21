import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';

/**
 * Compliance dashboard page.
 * Shows expiring documents, alerts, and compliance status.
 */
export default async function CompliancePage() {
  const supabase = await createClient();

  const [alertsResult, documentsResult, employeesResult] = await Promise.all([
    supabase
      .from('compliance_alerts')
      .select(`
        *,
        employee:employees(id, full_name),
        asset:assets(id, name, license_plate)
      `)
      .in('status', ['open', 'acknowledged'])
      .order('severity', { ascending: true })
      .order('expires_at', { ascending: true }),
    supabase
      .from('employee_documents')
      .select(`
        *,
        employee:employees(id, full_name)
      `)
      .not('expires_at', 'is', null)
      .lte('expires_at', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Next 30 days
      .order('expires_at', { ascending: true }),
    supabase
      .from('employees')
      .select('id, full_name, status')
      .eq('status', 'active'),
  ]);

  const { data: alerts } = alertsResult;
  const { data: expiringDocs } = documentsResult;
  const { data: employees } = employeesResult;

  // Stats
  const criticalAlerts = alerts?.filter(a => a.severity === 'critical').length || 0;
  const warningAlerts = alerts?.filter(a => a.severity === 'warning').length || 0;
  const expiredDocs = expiringDocs?.filter(d => new Date(d.expires_at) < new Date()).length || 0;
  const expiringSoon = expiringDocs?.filter(d => {
    const exp = new Date(d.expires_at);
    const now = new Date();
    return exp >= now && exp <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }).length || 0;

  // Calculate compliance score
  const totalEmployees = employees?.length || 1;
  const employeesWithIssues = new Set([
    ...(alerts?.map(a => a.employee_id).filter(Boolean) || []),
    ...(expiringDocs?.filter(d => new Date(d.expires_at) < new Date()).map(d => d.employee_id).filter(Boolean) || []),
  ]).size;
  const complianceScore = Math.round(((totalEmployees - employeesWithIssues) / totalEmployees) * 100);

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
      info: 'outline',
      warning: 'warning',
      critical: 'error',
      blocking: 'error',
    };
    return <Badge variant={variants[severity] || 'outline'}>{severity}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
      open: 'error',
      acknowledged: 'warning',
      resolved: 'success',
      dismissed: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return <span className="text-error font-medium">Expired {Math.abs(diff)} days ago</span>;
    if (diff === 0) return <span className="text-error font-medium">Expires today</span>;
    if (diff <= 7) return <span className="text-warning font-medium">{diff} days left</span>;
    return <span className="text-muted">{diff} days left</span>;
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Compliance</h1>
          <p className="text-muted">Monitor document expiry, alerts, and compliance status.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className={`text-3xl font-bold ${complianceScore >= 90 ? 'text-success' : complianceScore >= 70 ? 'text-warning' : 'text-error'}`}>
              {complianceScore}%
            </div>
            <p className="text-sm text-muted">Compliance Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-error">{criticalAlerts}</div>
            <p className="text-sm text-muted">Critical Alerts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">{warningAlerts}</div>
            <p className="text-sm text-muted">Warning Alerts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-error">{expiredDocs}</div>
            <p className="text-sm text-muted">Expired Documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">{expiringSoon}</div>
            <p className="text-sm text-muted">Expiring in 7 Days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active Alerts</CardTitle>
            <Badge variant="outline">{alerts?.length || 0} total</Badge>
          </CardHeader>
          <CardContent>
            {alerts && alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.slice(0, 10).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-hover"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(alert.severity)}
                        <span className="font-medium text-heading">{alert.title}</span>
                      </div>
                      <p className="text-sm text-muted">
                        {alert.employee?.full_name || alert.asset?.license_plate}
                      </p>
                      {alert.expires_at && (
                        <p className="text-xs">{getDaysUntil(alert.expires_at)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(alert.status || 'open')}
                      <Button size="sm" variant="outline">
                        {alert.status === 'open' ? 'Acknowledge' : alert.status === 'acknowledged' ? 'Resolve' : 'Resolved'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted">
                <svg className="h-10 w-10 mx-auto mb-2 text-success opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No active alerts</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Expiring Documents</CardTitle>
            <Link href="/dashboard/documents">
              <Button size="sm" variant="outline">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {expiringDocs && expiringDocs.length > 0 ? (
              <div className="space-y-3">
                {expiringDocs.slice(0, 10).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-hover"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-heading">{doc.type || 'Document'}</p>
                      <p className="text-sm text-muted">
                        {doc.employee?.full_name || 'Unknown Employee'}
                      </p>
                    </div>
                    <div className="text-right">
                      {getDaysUntil(doc.expires_at)}
                      <p className="text-xs text-muted">
                        {new Date(doc.expires_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted">
                <svg className="h-10 w-10 mx-auto mb-2 text-success opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No documents expiring soon</p>
              </div>
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
            <Link href="/dashboard/documents/upload">
              <Button variant="outline">Upload Document</Button>
            </Link>
            <Button variant="outline">Send Renewal Reminders</Button>
            <Button variant="outline">Export Compliance Report</Button>
            <Button variant="outline">Dismiss All Resolved</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
