import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VendorForm } from '../../VendorForm';
import type { Vendor } from '@/features/vendors';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditVendorPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: vendor, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !vendor) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-heading">Edit Vendor</h1>
        <p className="text-muted">{vendor.name}</p>
      </div>

      {/* Form */}
      <VendorForm vendor={vendor as Vendor} />
    </div>
  );
}
