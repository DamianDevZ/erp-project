import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-heading">Edit Asset</h1>
        <p className="text-muted">Update asset information.</p>
      </div>

      <AssetForm asset={asset} />
    </div>
  );
}
