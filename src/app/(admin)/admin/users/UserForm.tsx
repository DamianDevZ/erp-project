'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  Input,
  Label,
  Spinner,
} from '@/components/ui';

interface Organization {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_super_admin: boolean;
  organization_id: string | null;
}

interface UserFormProps {
  user?: UserProfile;
}

/**
 * Form for creating or editing a user.
 * 
 * Creating a user:
 * 1. Creates a Supabase Auth user (via admin API call on server)
 * 2. Creates a user_profile linked to an organization
 * 
 * Note: For security, actual user creation should happen server-side.
 * This form will call a server action.
 */
export function UserForm({ user }: UserFormProps) {
  const router = useRouter();
  const isEdit = !!user;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  const [email, setEmail] = useState(user?.email || '');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [password, setPassword] = useState('');
  const [organizationId, setOrganizationId] = useState(user?.organization_id || '');
  const [role, setRole] = useState(user?.role || 'owner');
  const [isSuperAdmin, setIsSuperAdmin] = useState(user?.is_super_admin || false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  async function fetchOrganizations() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      setLoadingOrgs(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Call server action to create/update user
      const response = await fetch('/api/admin/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user?.id,
          email,
          fullName,
          password: password || undefined,
          organizationId: organizationId || null,
          role,
          isSuperAdmin,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save user');
      }

      router.push('/admin/users');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit User' : 'User Details'}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" required>Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              disabled={isEdit}
            />
            {isEdit && (
              <p className="text-xs text-muted">Email cannot be changed.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName" required>Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" required={!isEdit}>
              {isEdit ? 'New Password (leave blank to keep current)' : 'Password'}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required={!isEdit}
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organizationId">Organization</Label>
            {loadingOrgs ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span className="text-sm text-muted">Loading organizations...</span>
              </div>
            ) : (
              <select
                id="organizationId"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">No organization (Super admin only)</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}
            {organizations.length === 0 && !loadingOrgs && (
              <p className="text-xs text-amber-600">
                No organizations exist. Create an organization first.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role in Organization</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isSuperAdmin"
              type="checkbox"
              checked={isSuperAdmin}
              onChange={(e) => setIsSuperAdmin(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <Label htmlFor="isSuperAdmin">
              Super Admin (can access this panel)
            </Label>
          </div>
        </CardContent>

        <CardFooter className="justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
