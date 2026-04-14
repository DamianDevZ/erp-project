import { createClient } from '@/lib/supabase/server';
import { PerformanceForm } from '../PerformanceForm';

export default async function NewPerformanceRecordPage() {
  const supabase = await createClient();

  // Fetch employees for the dropdown
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, employee_id')
    .order('full_name');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-heading">New Record</h1>
        <p className="text-muted">Create a performance or disciplinary record</p>
      </div>

      {/* Form */}
      <PerformanceForm employees={employees || []} />
    </div>
  );
}
