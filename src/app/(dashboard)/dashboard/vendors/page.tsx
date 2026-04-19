import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PageContent } from '@/components/ui';
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
    <PageContent>
      <PageHeader
        title="Vendors & Suppliers"
        description="Manage suppliers for equipment, staffing, maintenance, and other services"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Vendors' },
        ]}
      />
      <VendorList vendors={vendors || []} />
    </PageContent>
  );
}
