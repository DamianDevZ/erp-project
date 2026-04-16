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
  SortableTableHead,
  type SortDirection,
} from '@/components/ui';
import { 
  Referral, 
  ReferralStatus, 
  REFERRAL_STATUS_LABELS,
} from '@/features/referrals/types';

const STATUS_COLORS: Record<ReferralStatus, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  pending: 'warning',
  contacted: 'default',
  interviewed: 'default',
  hired: 'success',
  rejected: 'error',
  not_interested: 'outline',
};

/**
 * Client component that fetches and displays referrals.
 */
export function ReferralList() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReferralStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<string | null>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
    fetchReferrals();
  }, []);

  async function fetchReferrals() {
    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referrer:employees!referrals_referrer_employee_id_fkey(id, full_name, employee_id),
          referred_employee:employees!referrals_referred_employee_id_fkey(id, full_name, employee_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferrals(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(referralId: string, newStatus: ReferralStatus) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('referrals')
        .update({ status: newStatus })
        .eq('id', referralId);

      if (error) throw error;
      fetchReferrals();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  // Filter referrals based on search and status
  const filteredReferrals = referrals
    .filter((ref) => {
      const matchesSearch = 
        ref.referred_name?.toLowerCase().includes(search.toLowerCase()) ||
        ref.referrer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        ref.referred_phone?.includes(search);
      const matchesStatus = statusFilter === 'all' || ref.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (!sortKey || !sortDirection) return 0;
      
      let aVal: string | number | null | undefined;
      let bVal: string | number | null | undefined;
      
      if (sortKey === 'referrer') {
        aVal = a.referrer?.full_name;
        bVal = b.referrer?.full_name;
      } else {
        aVal = a[sortKey as keyof Referral] as string | number | null | undefined;
        bVal = b[sortKey as keyof Referral] as string | number | null | undefined;
      }
      
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

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
        <Button variant="outline" onClick={fetchReferrals} className="mt-4">
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
          placeholder="Search by name, phone, or position..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReferralStatus | 'all')}
          className="rounded-md border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending Review</option>
          <option value="contacted">Contacted</option>
          <option value="interviewed">Interviewed</option>
          <option value="hired">Hired</option>
          <option value="rejected">Rejected</option>
          <option value="not_interested">Not Interested</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted">Total Referrals</p>
          <p className="text-2xl font-bold text-heading">{referrals.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{referrals.filter(r => r.status === 'pending').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted">Hired</p>
          <p className="text-2xl font-bold text-green-600">{referrals.filter(r => r.status === 'hired').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted">Bonuses Pending</p>
          <p className="text-2xl font-bold text-blue-600">
            {referrals.filter(r => r.status === 'hired' && !r.bonus_paid_at && r.bonus_amount).length}
          </p>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead sortKey="referrer" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Referred By</SortableTableHead>
              <SortableTableHead sortKey="referred_name" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Candidate</SortableTableHead>
              <SortableTableHead sortKey="referred_phone" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Contact</SortableTableHead>
              <SortableTableHead sortKey="status" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Status</SortableTableHead>
              <SortableTableHead sortKey="bonus_amount" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Bonus</SortableTableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReferrals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted">
                  {search || statusFilter !== 'all'
                    ? 'No referrals match your filters.'
                    : 'No referrals yet. Add your first referral.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredReferrals.map((referral) => (
                <TableRow key={referral.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-heading">{referral.referrer?.full_name}</p>
                      <p className="text-xs text-muted">{referral.referrer?.employee_id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-heading">{referral.referred_name}</p>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{referral.referred_phone}</p>
                      {referral.referred_email && (
                        <p className="text-muted">{referral.referred_email}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLORS[referral.status]}>
                      {REFERRAL_STATUS_LABELS[referral.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {referral.bonus_amount ? (
                      <div className="text-sm">
                        <p className="font-medium">{referral.bonus_amount.toFixed(3)} BHD</p>
                        <p className={`text-xs ${referral.bonus_paid_at ? 'text-green-600' : 'text-yellow-600'}`}>
                          {referral.bonus_paid_at ? 'Paid' : 'Pending'}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {referral.status !== 'hired' && referral.status !== 'rejected' && (
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleStatusChange(referral.id, e.target.value as ReferralStatus);
                            }
                          }}
                          className="text-xs border border-border rounded px-2 py-1 bg-input text-heading"
                        >
                          <option value="">Update Status</option>
                          <option value="contacted">Mark Contacted</option>
                          <option value="interviewed">Mark Interviewed</option>
                          <option value="hired">Mark Hired</option>
                          <option value="rejected">Mark Rejected</option>
                          <option value="not_interested">Not Interested</option>
                        </select>
                      )}
                      <Link href={`/dashboard/referrals/${referral.id}/edit`}>
                        <Button size="sm" variant="ghost">
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
