'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
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
  SortableTableHead,
  type SortDirection,
} from '@/components/ui';
import type { Client } from '@/features/clients';

/**
 * Client component that fetches and displays clients (delivery services).
 */
export function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>('name');
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

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      setLoading(true);
      const supabase = createSupabaseClient();
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }

  // Filter clients based on search
  const filteredClients = clients
    .filter((client) =>
      client.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortKey || !sortDirection) return 0;
      
      let aVal = a[sortKey as keyof Client];
      let bVal = b[sortKey as keyof Client];
      
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const formatRate = (client: Client) => {
    if (!client.billing_rate) return '—';
    const rate = `$${client.billing_rate}`;
    switch (client.billing_rate_type) {
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
        <Button variant="outline" onClick={fetchClients} className="mt-4">
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
        {filteredClients.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted">
              {clients.length === 0 
                ? 'No clients yet. Add your first client to get started.'
                : 'No clients match your search.'
              }
            </p>
            {clients.length === 0 && (
              <Link href="/dashboard/clients/new">
                <Button className="mt-4">Add Client</Button>
              </Link>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="name" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Name</SortableTableHead>
                <SortableTableHead sortKey="contact_email" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Contact Email</SortableTableHead>
                <SortableTableHead sortKey="contact_phone" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Contact Phone</SortableTableHead>
                <SortableTableHead sortKey="billing_rate" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Billing Rate</SortableTableHead>
                <SortableTableHead sortKey="is_active" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Status</SortableTableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.contact_email || '—'}</TableCell>
                  <TableCell>{client.contact_phone || '—'}</TableCell>
                  <TableCell className="text-muted">{formatRate(client)}</TableCell>
                  <TableCell>
                    <Badge variant={client.is_active ? 'success' : 'error'}>
                      {client.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/clients/${client.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                      <Link href={`/dashboard/clients/${client.id}/edit`}>
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

// Keep old export for backwards compatibility
export { ClientList as PlatformList };
