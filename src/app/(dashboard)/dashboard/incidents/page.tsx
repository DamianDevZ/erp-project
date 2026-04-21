import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';

/**
 * Incidents list page.
 * Shows all incidents/accidents and breakdowns.
 */
export default async function IncidentsPage() {
  const supabase = await createClient();

  const { data: incidents } = await supabase
    .from('incidents')
    .select(`
      *,
      employee:employees(id, full_name),
      asset:assets(id, name, license_plate)
    `)
    .order('incident_date', { ascending: false })
    .limit(50);

  // Stats
  const openCount = incidents?.filter(i => i.status === 'open' || i.status === 'investigating').length || 0;
  const thisMonth = incidents?.filter(i => {
    const date = new Date(i.incident_date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length || 0;

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-BH', { style: 'currency', currency: 'BHD' }).format(amount);
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
      minor: 'outline',
      moderate: 'warning',
      major: 'error',
      total: 'error',
    };
    return <Badge variant={variants[severity] || 'outline'}>{severity}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
      open: 'error',
      investigating: 'warning',
      pending_review: 'warning',
      resolved: 'success',
      closed: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      accident: 'Accident',
      theft: 'Theft',
      vandalism: 'Vandalism',
      breakdown: 'Breakdown',
      damage_rider: 'Rider Damage',
      damage_third_party: '3rd Party Damage',
      violation: 'Violation',
      other: 'Other',
    };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Incidents</h1>
          <p className="text-muted">Track accidents, breakdowns, and other incidents.</p>
        </div>
        <Link href="/dashboard/incidents/new">
          <Button>Report Incident</Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-error">{openCount}</div>
            <p className="text-sm text-muted">Open Incidents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-heading">{thisMonth}</div>
            <p className="text-sm text-muted">This Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-heading">
              {incidents?.filter(i => i.incident_type === 'accident').length || 0}
            </div>
            <p className="text-sm text-muted">Total Accidents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-heading">
              {formatCurrency(incidents?.reduce((sum, i) => sum + (i.total_cost || 0), 0) || 0)}
            </div>
            <p className="text-sm text-muted">Total Cost</p>
          </CardContent>
        </Card>
      </div>

      {/* Incidents list */}
      <Card>
        <CardHeader>
          <CardTitle>All Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents && incidents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Incident #</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Severity</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Employee</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Vehicle</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Location</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident) => (
                    <tr key={incident.id} className="border-b border-border hover:bg-hover">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/incidents/${incident.id}`} className="font-medium text-primary hover:underline">
                          {incident.incident_number || `INC-${incident.id.slice(0, 8)}`}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-body">
                        {new Date(incident.incident_date).toLocaleDateString()}
                        {incident.incident_time && ` ${incident.incident_time.slice(0, 5)}`}
                      </td>
                      <td className="px-4 py-3">{getTypeBadge(incident.incident_type)}</td>
                      <td className="px-4 py-3">{getSeverityBadge(incident.severity)}</td>
                      <td className="px-4 py-3 text-sm text-body">
                        {incident.employee?.full_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-body">
                        {incident.asset?.license_plate || incident.asset?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-body max-w-[150px] truncate">
                        {incident.incident_location || '-'}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(incident.status)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/incidents/${incident.id}`}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="h-12 w-12 mx-auto text-muted opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-heading">No incidents recorded</h3>
              <p className="mt-1 text-sm text-muted">Report an incident when one occurs.</p>
              <Link href="/dashboard/incidents/new">
                <Button className="mt-4">Report Incident</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}