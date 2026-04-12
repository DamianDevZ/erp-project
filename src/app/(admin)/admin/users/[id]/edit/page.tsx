import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UserForm } from '../../UserForm';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Edit user page for super-admins.
 */
export default async function EditUserPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Edit User</h1>
        <p className="text-muted">Update user details.</p>
      </div>

      <UserForm user={user} />
    </div>
  );
}
