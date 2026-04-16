'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  Spinner,
  Badge,
  SortableTableHead,
  type SortDirection,
} from '@/components/ui';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_super_admin: boolean;
  organization_id: string | null;
  organization?: {
    name: string;
  };
  created_at: string;
}

/**
 * Client component that fetches and displays users.
 */
export function UserList() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string | null>('full_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc');
      if (sortDirection === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortKey || !sortDirection) return 0;
    
    let aVal: string | null | undefined;
    let bVal: string | null | undefined;
    
    if (sortKey === 'organization') {
      aVal = a.organization?.name;
      bVal = b.organization?.name;
    } else {
      aVal = a[sortKey as keyof UserProfile] as string | null | undefined;
      bVal = b[sortKey as keyof UserProfile] as string | null | undefined;
    }
    
    if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
    if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
    
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          organization:organizations(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-red-500">{error}</p>
        <Button variant="outline" onClick={fetchUsers} className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      {users.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-muted">No users yet. Create your first user.</p>
          <Link href="/admin/users/new">
            <Button className="mt-4">Create User</Button>
          </Link>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead sortKey="full_name" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Name</SortableTableHead>
              <SortableTableHead sortKey="email" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Email</SortableTableHead>
              <SortableTableHead sortKey="organization" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Organization</SortableTableHead>
              <SortableTableHead sortKey="role" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Role</SortableTableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.full_name}
                  {user.is_super_admin && (
                    <Badge variant="error" className="ml-2">Super Admin</Badge>
                  )}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.organization?.name || (
                    <span className="text-muted">No organization</span>
                  )}
                </TableCell>
                <TableCell className="text-muted">{user.role || '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Link href={`/admin/users/${user.id}/edit`}>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
