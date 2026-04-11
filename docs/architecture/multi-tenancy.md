# Multi-Tenancy Architecture

This ERP is designed as a **multi-tenant SaaS** where multiple organizations (companies that manage drivers) share the same application and database.

## Tenant Isolation Strategy

We use **Row-Level Security (RLS)** with an `organization_id` column on all tenant-scoped tables.

### How It Works

1. **Every tenant table has `organization_id`**
   ```sql
   CREATE TABLE drivers (
     id UUID PRIMARY KEY,
     organization_id UUID NOT NULL REFERENCES organizations(id),
     name TEXT NOT NULL,
     -- ... other fields
   );
   ```

2. **Users belong to an organization**
   ```sql
   CREATE TABLE user_profiles (
     id UUID PRIMARY KEY REFERENCES auth.users(id),
     organization_id UUID NOT NULL REFERENCES organizations(id),
     role TEXT NOT NULL  -- 'admin', 'manager', 'viewer'
   );
   ```

3. **RLS policies enforce isolation**
   ```sql
   CREATE POLICY "Users can only view their organization's drivers"
     ON drivers FOR SELECT
     USING (
       organization_id = (
         SELECT organization_id FROM user_profiles 
         WHERE id = auth.uid()
       )
     );
   ```

## Tables Overview

### Global Tables (no tenant isolation)
- `organizations` — The tenants themselves

### Tenant-Scoped Tables (have `organization_id`)
- `user_profiles` — Users within an organization
- `drivers` — Drivers managed by the organization
- `assignments` — Driver assignments to platforms
- `payroll_records` — Payment records
- `documents` — Driver documents (licenses, contracts)

## Application-Level Enforcement

While RLS handles database-level security, we also:

1. **Include organization context in server actions**
   ```typescript
   // All queries automatically scope to the user's organization
   const { data } = await supabase
     .from('drivers')
     .select('*');  // RLS handles the WHERE clause
   ```

2. **Never trust client-provided organization_id**
   - Always derive it from the authenticated user's session
   - Supabase's `auth.uid()` in RLS policies ensures this

## Onboarding New Tenants

1. Create a new row in `organizations`
2. First user registers and is assigned as `admin` for that org
3. Admin invites other users who inherit the `organization_id`
