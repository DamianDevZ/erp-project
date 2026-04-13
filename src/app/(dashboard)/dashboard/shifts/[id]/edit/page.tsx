'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui';
import { ShiftForm } from '../../ShiftForm';
import { Shift } from '@/features/shifts/types';

/**
 * Edit shift page.
 */
export default function EditShiftPage() {
  const params = useParams();
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShift() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .eq('id', params.id)
          .single();

        if (error) throw error;
        setShift(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load shift');
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchShift();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !shift) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || 'Shift not found'}</p>
        <Link href="/dashboard/shifts" className="text-primary hover:underline mt-4 inline-block">
          Back to Shifts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted mb-2">
          <Link href="/dashboard/shifts" className="hover:text-heading">
            Shifts
          </Link>
          <span>/</span>
          <span>Edit</span>
        </div>
        <h1 className="text-2xl font-bold text-heading">Edit Shift</h1>
        <p className="text-muted">Update the shift details.</p>
      </div>

      {/* Form */}
      <ShiftForm shift={shift} isEditing />
    </div>
  );
}
