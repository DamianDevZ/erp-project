import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin API for managing users.
 * Only accessible by super-admins.
 * 
 * Uses the service role key to create auth users.
 */

// Create admin client with service role
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Check if current user is super-admin
async function isSuperAdmin(): Promise<boolean> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single();
  
  return profile?.is_super_admin === true;
}

/**
 * POST /api/admin/users - Create a new user
 */
export async function POST(request: NextRequest) {
  // Check authorization
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, fullName, password, organizationId, role, isSuperAdmin: isSuper } = body;

    if (!email || !fullName || !password) {
      return NextResponse.json(
        { error: 'Email, full name, and password are required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 2. Create user_profile
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        organization_id: organizationId || null,
        role: role || 'owner',
        is_super_admin: isSuper || false,
      });

    if (profileError) {
      // Cleanup: delete the auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, userId: authData.user.id });
  } catch (err) {
    console.error('Error creating user:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users - Update an existing user
 */
export async function PUT(request: NextRequest) {
  // Check authorization
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, fullName, password, organizationId, role, isSuperAdmin: isSuper } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Update password if provided
    if (password) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(id, {
        password,
      });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    }

    // Update user_profile
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .update({
        full_name: fullName,
        organization_id: organizationId || null,
        role: role || 'owner',
        is_super_admin: isSuper || false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating user:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
