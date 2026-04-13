import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CoachingForm } from '../../CoachingForm';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Edit coaching session page.
 */
export default async function EditCoachingPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: coaching, error } = await supabase
    .from('coachings')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !coaching) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link 
          href={`/dashboard/coaching/${id}`}
          className="inline-flex items-center text-sm text-muted hover:text-heading mb-2"
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Coaching Session
        </Link>
        <h1 className="text-2xl font-bold text-heading">Edit Coaching Session</h1>
        <p className="text-muted">Update the coaching session details</p>
      </div>

      <CoachingForm coaching={coaching} />
    </div>
  );
}
