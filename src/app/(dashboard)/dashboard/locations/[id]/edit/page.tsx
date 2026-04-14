import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LocationForm } from '../../LocationForm';

export const dynamic = 'force-dynamic';

interface EditLocationPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLocationPage({ params }: EditLocationPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch location
  const { data: location, error } = await supabase
    .from('locations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !location) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-heading">Edit Location</h1>
        <p className="text-muted">
          Update location details
        </p>
      </div>

      {/* Form */}
      <LocationForm location={location} />
    </div>
  );
}
