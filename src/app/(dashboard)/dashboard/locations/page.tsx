import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LocationList } from './LocationList';

export const dynamic = 'force-dynamic';

export default async function LocationsPage() {
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch locations
  const { data: locations, error } = await supabase
    .from('locations')
    .select('*')
    .order('name');

  if (error) {
    console.error('Failed to fetch locations:', error);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-heading">Locations</h1>
        <p className="text-muted">
          Manage storage locations for assets (warehouses, client sites, vendors, etc.)
        </p>
      </div>

      {/* Locations List */}
      <LocationList locations={locations || []} />
    </div>
  );
}
