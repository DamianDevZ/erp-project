import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API for resetting employee passwords.
 * Can either send a password reset email or set a new password directly.
 * 
 * Uses the service role key for admin operations.
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
 * POST /api/employees/reset-password
 * 
 * Body:
 * - userId: string (the auth user ID)
 * - action: 'send_email' | 'set_password'
 * - email?: string (required for send_email)
 * - newPassword?: string (required for set_password)
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's organization and role
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
    const { userId, action, email, newPassword } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'User ID and action are required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify the employee belongs to the same organization
    const { data: employee } = await adminClient
      .from('employees')
      .select('id, organization_id')
      .eq('user_id', userId)
      .single();

    if (!employee || employee.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (action === 'send_email') {
      if (!email) {
        return NextResponse.json(
          { error: 'Email is required to send reset link' },
          { status: 400 }
        );
      }

      // Send password reset email
      const { error } = await adminClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Password reset email sent successfully'
      });

    } else if (action === 'set_password') {
      if (!newPassword) {
        return NextResponse.json(
          { error: 'New password is required' },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }

      // Set new password directly
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Password updated successfully'
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "send_email" or "set_password"' },
        { status: 400 }
      );
    }

  } catch (err) {
    console.error('Error resetting password:', err);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
