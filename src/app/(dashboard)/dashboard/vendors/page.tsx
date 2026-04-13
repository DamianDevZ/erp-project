import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VendorList } from './VendorList';

export const dynamic = 'force-dynamic';

export default async function VendorsPage() {
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch vendors
  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('*')
    .order('name');

  if (error) {
    console.error('Failed to fetch vendors:', error);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-heading">Vendors & Suppliers</h1>
        <p className="text-muted">
          Manage suppliers for equipment, staffing, maintenance, and other services
        </p>
      </div>

      {/* Vendor List */}
      <VendorList vendors={vendors || []} />
    </div>
  );
}
