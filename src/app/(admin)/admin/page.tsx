import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

/**
 * Super-admin dashboard - overview of all organizations and users.
 */
export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Get counts
  const [orgsResult, usersResult] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
  ]);

  const orgCount = orgsResult.count || 0;
  const userCount = usersResult.count || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Super Admin Panel</h1>
        <p className="text-muted">Manage organizations and users across the platform.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">
              Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-heading">{orgCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">
              Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-heading">{userCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/admin/organizations">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>Manage Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted">Create, edit, and view all organizations.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/users">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>Manage Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted">Create users and assign them to organizations.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
