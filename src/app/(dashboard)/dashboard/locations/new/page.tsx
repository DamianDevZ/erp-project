import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LocationForm } from '../LocationForm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function NewLocationPage() {
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted">
        <Link href="/dashboard/locations" className="hover:text-heading">
          Locations
        </Link>
        <span>/</span>
        <span className="text-heading">New Location</span>
      </nav>

      {/* Header */}
      <div>
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
