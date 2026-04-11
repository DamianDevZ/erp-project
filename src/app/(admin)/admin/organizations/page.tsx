import Link from 'next/link';
import { Button } from '@/components/ui';
import { OrganizationList } from './OrganizationList';

/**
 * Organizations list page for super-admins.
 */
export default function OrganizationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Organizations</h1>
          <p className="text-muted">Manage all organizations on the platform.</p>
        </div>
        <Link href="/admin/organizations/new">
          <Button>Create Organization</Button>
        </Link>
      </div>

      <OrganizationList />
    </div>
  );
}
