import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API for creating login credentials for employees.
 * Creates an auth user and links it to the employee.
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

/**
 * POST /api/employees/create-login - Create login credentials for an employee
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's organization
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 403 });
  }

  // Check if user has permission (admin, manager, or hr)
  if (!['owner', 'admin', 'manager', 'hr'].includes(profile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { employeeId, loginEmail, password, fullName } = body;

    if (!loginEmail || !password) {
      return NextResponse.json(
        { error: 'Login email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: loginEmail,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 2. Create user_profile for the employee
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: loginEmail,
        full_name: fullName,
        organization_id: profile.organization_id,
        role: 'viewer', // Employees get viewer role by default
      });

    if (profileError) {
      // Rollback: delete auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // 3. If employeeId provided, link user to employee
    if (employeeId) {
      const { error: linkError } = await adminClient
        .from('employees')
        .update({ user_id: authData.user.id })
        .eq('id', employeeId)
        .eq('organization_id', profile.organization_id);

      if (linkError) {
        console.error('Failed to link user to employee:', linkError);
        // Don't fail the request, user was still created
      }
    }

    return NextResponse.json({ 
      success: true, 
      userId: authData.user.id,
      message: 'Login credentials created successfully'
    });

  } catch (err) {
    console.error('Error creating employee login:', err);
    return NextResponse.json(
      { error: 'Failed to create login credentials' },
      { status: 500 }
    );
  }
}
