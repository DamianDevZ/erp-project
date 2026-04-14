'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Spinner,
} from '@/components/ui';
import { 
  Referral, 
  ReferralStatus,
  REFERRAL_STATUS_LABELS 
} from '@/features/referrals/types';

interface EmployeeOption {
  id: string;
  full_name: string;
  employee_id: string | null;
}

interface ReferralFormProps {
  referral?: Referral;
  isEditing?: boolean;
}

export function ReferralForm({ referral, isEditing = false }: ReferralFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // Form state
  const [referrerEmployeeId, setReferrerEmployeeId] = useState(referral?.referrer_employee_id || '');
  const [referredName, setReferredName] = useState(referral?.referred_name || '');
  const [referredPhone, setReferredPhone] = useState(referral?.referred_phone || '');
  const [referredEmail, setReferredEmail] = useState(referral?.referred_email || '');
  const [status, setStatus] = useState<ReferralStatus>(referral?.status || 'pending');
  const [bonusAmount, setBonusAmount] = useState(referral?.bonus_amount?.toString() || '');
  const [bonusPaid, setBonusPaid] = useState(!!referral?.bonus_paid_at);
  const [notes, setNotes] = useState(referral?.notes || '');

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      setLoadingEmployees(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, employee_id')
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!referrerEmployeeId || !referredName || !referredPhone) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const data: Record<string, unknown> = {
        referrer_employee_id: referrerEmployeeId,
        referred_name: referredName,
        referred_phone: referredPhone,
        referred_email: referredEmail || null,
        status,
        bonus_amount: bonusAmount ? parseFloat(bonusAmount) : null,
        notes: notes || null,
      };

      // Handle bonus_paid_at
      if (bonusPaid && !referral?.bonus_paid_at) {
        data.bonus_paid_at = new Date().toISOString();
      } else if (!bonusPaid) {
        data.bonus_paid_at = null;
      }

      if (isEditing && referral) {
        const { error } = await supabase
          .from('referrals')
          .update(data)
          .eq('id', referral.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('referrals')
          .insert([data]);

        if (error) throw error;
      }

      router.push('/dashboard/referrals');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save referral');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl">
      {/* Referring Employee */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-base">Referring Employee</CardTitle>
              <p className="text-sm text-muted">Who is making this referral?</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="referrer" required>Employee</Label>
            {loadingEmployees ? (
              <div className="flex items-center gap-2 py-2">
                <Spinner size="sm" />
                <span className="text-sm text-muted">Loading employees...</span>
              </div>
            ) : (
              <select
                id="referrer"
                value={referrerEmployeeId}
                onChange={(e) => setReferrerEmployeeId(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select an employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} {emp.employee_id && `(${emp.employee_id})`}
                  </option>
                ))}
              </select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Candidate Information */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-base">Candidate Information</CardTitle>
              <p className="text-sm text-muted">Details about the referred person</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="referredName" required>Full Name</Label>
              <Input
                id="referredName"
                value={referredName}
                onChange={(e) => setReferredName(e.target.value)}
                placeholder="Candidate's full name"
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="referredPhone" required>Phone Number</Label>
              <Input
                id="referredPhone"
                type="tel"
                value={referredPhone}
                onChange={(e) => setReferredPhone(e.target.value)}
                placeholder="+973 XXXX XXXX"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="referredEmail">Email</Label>
              <Input
                id="referredEmail"
                type="email"
                value={referredEmail}
                onChange={(e) => setReferredEmail(e.target.value)}
                placeholder="candidate@email.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status & Bonus */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-base">Status & Bonus</CardTitle>
              <p className="text-sm text-muted">Track progress and referral bonus</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ReferralStatus)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Object.entries(REFERRAL_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Bonus Amount */}
            <div className="space-y-2">
              <Label htmlFor="bonusAmount">Bonus Amount (BHD)</Label>
              <Input
                id="bonusAmount"
                type="number"
                step="0.001"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
                placeholder="0.000"
              />
            </div>

            {/* Bonus Paid */}
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <label className="flex items-center gap-3 cursor-pointer py-2">
                <input
                  type="checkbox"
                  checked={bonusPaid}
                  onChange={(e) => setBonusPaid(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-heading">Bonus has been paid</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-base">Notes</CardTitle>
              <p className="text-sm text-muted">Additional information about this referral</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes about this referral..."
            rows={4}
            className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-heading placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/referrals')}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              {isEditing ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            isEditing ? 'Save Changes' : 'Add Referral'
          )}
        </Button>
      </div>
    </form>
  );
}
