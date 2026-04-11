/**
 * Bootstrap script to create the first super-admin user.
 * 
 * Run with: npx tsx --env-file=.env.local scripts/bootstrap-superadmin.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Super-admin details
const SUPER_ADMIN_EMAIL = 'damjan.zdravkovski3@gmail.com';
const SUPER_ADMIN_PASSWORD = 'changeme123'; // CHANGE THIS!
const SUPER_ADMIN_NAME = 'Damjan Zdravkovski';

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing environment variables. Make sure .env.local is loaded.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('Creating super-admin user...');

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: SUPER_ADMIN_EMAIL,
    password: SUPER_ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (authError) {
    console.error('Failed to create auth user:', authError.message);
    process.exit(1);
  }

  console.log('Auth user created:', authData.user.id);

  // 2. Create user_profile with is_super_admin = true
  const { error: profileError } = await supabase.from('user_profiles').insert({
    id: authData.user.id,
    email: SUPER_ADMIN_EMAIL,
    full_name: SUPER_ADMIN_NAME,
    organization_id: null, // Super-admin doesn't belong to any org
    role: 'super_admin',
    is_super_admin: true,
  });

  if (profileError) {
    console.error('Failed to create user profile:', profileError.message);
    console.error('Note: Auth user was created. You may need to clean it up manually.');
    process.exit(1);
  }

  console.log('User profile created!');
  console.log('\n✅ Super-admin created successfully!');
  console.log(`   Email: ${SUPER_ADMIN_EMAIL}`);
  console.log(`   Password: ${SUPER_ADMIN_PASSWORD}`);
  console.log('\n⚠️  Please change the password after first login!');
}

main().catch(console.error);
