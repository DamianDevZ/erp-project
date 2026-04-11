'use client';

import { useState } from 'react';
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
} from '@/components/ui';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface OrganizationFormProps {
  organization?: Organization;
}

/**
 * Form for creating or editing an organization.
 */
export function OrganizationForm({ organization }: OrganizationFormProps) {
  const router = useRouter();
  const isEdit = !!organization;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(organization?.name || '');
  const [slug, setSlug] = useState(organization?.slug || '');

  // Auto-generate slug from name
  function handleNameChange(value: string) {
    setName(value);
    if (!isEdit) {
      const newSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(newSlug);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const data = {
        name,
        slug,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('organizations')
          .update(data)
          .eq('id', organization.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organizations')
          .insert(data);

        if (error) throw error;
      }

      router.push('/admin/organizations');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save organization');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Organization' : 'Organization Details'}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" required>Organization Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Delivery Co."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" required>Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="acme-delivery-co"
              required
              pattern="[a-z0-9-]+"
              title="Only lowercase letters, numbers, and hyphens"
            />
            <p className="text-xs text-muted">
              URL-friendly identifier. Only lowercase letters, numbers, and hyphens.
            </p>
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
            {isEdit ? 'Save Changes' : 'Create Organization'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
