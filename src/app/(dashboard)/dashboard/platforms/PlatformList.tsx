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
  Input,
  Badge,
} from '@/components/ui';
import type { Platform } from '@/features/platforms';

/**
 * Client component that fetches and displays platforms.
 */
export function PlatformList() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPlatforms();
  }, []);

  async function fetchPlatforms() {
    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setPlatforms(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load platforms');
    } finally {
      setLoading(false);
    }
  }

  // Filter platforms based on search
  const filteredPlatforms = platforms.filter((platform) =>
    platform.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatRate = (platform: Platform) => {
    if (!platform.billing_rate) return '—';
    const rate = `$${platform.billing_rate}`;
    switch (platform.billing_rate_type) {
      case 'per_delivery': return `${rate}/delivery`;
      case 'hourly': return `${rate}/hour`;
      case 'fixed': return `${rate}/period`;
      default: return rate;
    }
  };

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
        <p className="text-error">{error}</p>
        <Button variant="outline" onClick={fetchPlatforms} className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <Card>
        {filteredPlatforms.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted">
              {platforms.length === 0 
                ? 'No clients yet. Add your first client to get started.'
                : 'No clients match your search.'
              }
            </p>
            {platforms.length === 0 && (
              <Link href="/dashboard/platforms/new">
                <Button className="mt-4">Add Client</Button>
              </Link>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact Email</TableHead>
                <TableHead>Contact Phone</TableHead>
                <TableHead>Billing Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlatforms.map((platform) => (
                <TableRow key={platform.id}>
                  <TableCell className="font-medium">{platform.name}</TableCell>
                  <TableCell>{platform.contact_email || '—'}</TableCell>
                  <TableCell>{platform.contact_phone || '—'}</TableCell>
                  <TableCell className="text-muted">{formatRate(platform)}</TableCell>
                  <TableCell>
                    <Badge variant={platform.is_active ? 'success' : 'error'}>
                      {platform.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/platforms/${platform.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                      <Link href={`/dashboard/platforms/${platform.id}/edit`}>
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
    </div>
  );
}
