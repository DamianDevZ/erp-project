import { notFound } from 'next/navigation';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { ClientForm } from '../../ClientForm';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Edit client page.
 */
export default async function EditClientPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseClient();

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !client) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-heading">Edit Client</h1>
        <p className="text-muted">Update client information.</p>
      </div>

      <ClientForm client={client} />
    </div>
  );
}
