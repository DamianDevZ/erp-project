import { createClient } from '@/lib/supabase/server';
import { CoachingList } from './CoachingList';

/**
 * Coaching sessions list page.
 */
export default async function CoachingPage() {
  const supabase = await createClient();

  const { data: coachings } = await supabase
    .from('coachings')
    .select(`
      *,
      employee:employees(id, full_name, employee_id)
    `)
    .order('coaching_date', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Coaching</h1>
        <p className="text-muted">Track and manage employee coaching sessions</p>
      </div>

      <CoachingList coachings={coachings || []} />
    </div>
  );
}
