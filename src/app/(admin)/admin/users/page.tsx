import Link from 'next/link';
import { Button } from '@/components/ui';
import { UserList } from './UserList';

/**
 * Users list page for super-admins.
 */
export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Users</h1>
          <p className="text-muted">Manage all users and their organization assignments.</p>
        </div>
        <Link href="/admin/users/new">
          <Button>Create User</Button>
        </Link>
      </div>

      <UserList />
    </div>
  );
}
