import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PlatformForm } from '../../PlatformForm';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Edit platform page.
 */
export default async function EditPlatformPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: platform, error } = await supabase
    .from('platforms')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !platform) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-heading">Edit Client</h1>
        <p className="text-muted">Update client information.</p>
      </div>

      <PlatformForm platform={platform} />
    </div>
  );
}
