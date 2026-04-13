'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui';
import { LeaveForm } from '../../LeaveForm';
import { Leave } from '@/features/leaves/types';

/**
 * Edit leave request page.
 */
export default function EditLeavePage() {
  const params = useParams();
  const [leave, setLeave] = useState<Leave | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeave() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('leaves')
          .select('*')
          .eq('id', params.id)
          .single();

        if (error) throw error;
        setLeave(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leave request');
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchLeave();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !leave) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || 'Leave request not found'}</p>
        <Link href="/dashboard/leaves" className="text-primary hover:underline mt-4 inline-block">
          Back to Leaves
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted mb-2">
          <Link href="/dashboard/leaves" className="hover:text-heading">
            Leaves
          </Link>
          <span>/</span>
          <span>Edit</span>
        </div>
        <h1 className="text-2xl font-bold text-heading">Edit Leave Request</h1>
        <p className="text-muted">Update the leave request details.</p>
      </div>

      {/* Form */}
      <LeaveForm leave={leave} isEditing />
    </div>
  );
}
