import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PerformanceForm } from '../../PerformanceForm';
import type { PerformanceDiscipline } from '@/features/performance';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPerformanceRecordPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the record
  const { data: record, error } = await supabase
    .from('performance_discipline')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !record) {
    notFound();
  }

  // Fetch employees for the dropdown
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, employee_id')
    .order('full_name');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-heading">Edit Record</h1>
        <p className="text-muted">{record.title}</p>
      </div>

      {/* Form */}
      <PerformanceForm record={record as PerformanceDiscipline} employees={employees || []} />
    </div>
  );
}
