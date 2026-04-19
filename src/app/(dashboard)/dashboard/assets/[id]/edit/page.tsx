import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PageContent } from '@/components/ui';
import { AssetForm } from '../../AssetForm';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Edit asset page.
 */
export default async function EditAssetPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: asset, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !asset) {
    notFound();
  }

  return (
    <PageContent className="max-w-3xl mx-auto">
      <PageHeader
        title="Edit Asset"
        description="Update asset information."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Assets', href: '/dashboard/assets' },
          { label: asset.name, href: `/dashboard/assets/${id}` },
          { label: 'Edit' },
        ]}
      />
      <AssetForm asset={asset} />
    </PageContent>
  );
}
