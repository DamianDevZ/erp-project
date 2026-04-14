'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui';
import { ReferralForm } from '../../ReferralForm';
import { Referral } from '@/features/referrals/types';

/**
 * Edit referral page.
 */
export default function EditReferralPage() {
  const params = useParams();
  const [referral, setReferral] = useState<Referral | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReferral() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('referrals')
          .select('*')
          .eq('id', params.id)
          .single();

        if (error) throw error;
        setReferral(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load referral');
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchReferral();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !referral) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || 'Referral not found'}</p>
        <Link href="/dashboard/referrals" className="text-primary hover:underline mt-4 inline-block">
          Back to Referrals
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-heading">Edit Referral</h1>
        <p className="text-muted">Update the referral details.</p>
      </div>

      {/* Form */}
      <ReferralForm referral={referral} isEditing />
    </div>
  );
}
