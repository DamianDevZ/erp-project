import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LocationForm } from '../../LocationForm';
import Link from 'next/link';

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
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted">
        <Link href="/dashboard/locations" className="hover:text-heading">
          Locations
        </Link>
        <span>/</span>
        <span className="text-heading">Edit Location</span>
      </nav>

      {/* Header */}
      <div>
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
