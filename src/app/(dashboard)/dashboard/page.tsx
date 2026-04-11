import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

/**
 * Dashboard home page.
 * Shows overview stats and quick actions.
 */
export default function DashboardPage() {
  // TODO: Fetch real stats from database
  const stats = [
    { label: 'Total Employees', value: '0', change: null },
    { label: 'Active Riders', value: '0', change: null },
    { label: 'Assets', value: '0', change: null },
    { label: 'Pending Invoices', value: '0', change: null },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-heading">Dashboard</h1>
        <p className="text-muted">Welcome back! Here's an overview of your organization.</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-heading">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickAction href="/dashboard/employees/new" label="Add Employee" />
            <QuickAction href="/dashboard/assets/new" label="Add Asset" />
            <QuickAction href="/dashboard/invoices/new" label="Create Invoice" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">No recent activity</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-medium text-body transition-colors hover:bg-hover"
    >
      {label}
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </a>
  );
}
