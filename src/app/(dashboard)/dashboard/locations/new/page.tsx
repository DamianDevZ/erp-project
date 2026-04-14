import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LocationForm } from '../LocationForm';

export const dynamic = 'force-dynamic';

export default async function NewLocationPage() {
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-heading">Add Location</h1>
        <p className="text-muted">
          Create a new storage location for assets
        </p>
      </div>

      {/* Form */}
      <LocationForm />
    </div>
  );
}
