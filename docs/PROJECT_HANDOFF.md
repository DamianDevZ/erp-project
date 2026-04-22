# ERP Project — Full Handoff Document

> **Purpose:** Complete technical reference for a new developer or collaborator to understand, run, and continue this project from scratch.

---

## 1. What Is This Project?

A **multi-tenant ERP (Enterprise Resource Planning) system** built for **delivery operations companies** (think: a company that manages fleets of food delivery riders working for platforms like Uber Eats, Bolt, Deliveroo, etc.).

The system manages:
- Riders (employees) — their HR lifecycle, documents, shifts, and performance
- Vehicles (assets) — assignment to riders, maintenance, insurance
- Clients (delivery platforms) — Uber Eats, Bolt, Deliveroo etc. As a company, you send your riders to work for them
- Orders — delivery orders imported from those client platforms
- Payroll — calculating rider pay based on orders delivered
- Invoicing — billing the clients for the riders' work
- Finance — COD (cash on delivery) tracking, ledger, vendor management
- Compliance — tracking document expiry (driving licences, visas, insurance)

**Multi-tenant design:** Every table has an `organization_id` column. One Supabase project hosts potentially many organizations, each isolated by Row Level Security (RLS).

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16.2.3** (App Router, Turbopack) |
| Language | **TypeScript 5** |
| Styling | **Tailwind CSS v4** with a custom design token system |
| Database | **Supabase** (PostgreSQL + Auth + Storage + RLS) |
| Auth | Supabase Auth (email/password, magic link) |
| Forms | React Hook Form + Zod validation |
| Deployment | **Vercel** (connected to GitHub, auto-deploys `main`) |
| Package Manager | npm |

### Key npm dependencies
```json
{
  "@supabase/ssr": "^0.10.2",       // Server-side Supabase client
  "@supabase/supabase-js": "^2.x",  // Supabase JS client
  "next": "16.2.3",
  "react": "19.2.4",
  "react-hook-form": "^7.x",
  "zod": "^4.x",
  "xlsx": "^0.18.5"                 // Excel/CSV import
}
```

---

## 3. Environment Variables

Create `.env.local` at project root:

```env
# Supabase project URL (public)
NEXT_PUBLIC_SUPABASE_URL=https://plhisimsnaharzgpmfmg.supabase.co

# Supabase publishable (anon) key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_u9qCNV-sry7vuXImnFGLkA_XxJHpoQt

# Service role key — used ONLY in server-side API routes for admin operations
# Never expose this to the client/browser
SUPABASE_SERVICE_ROLE_KEY=<from Supabase Dashboard > Settings > API>

# Feature flag: show the dev role-switcher panel in production (set to "true" to enable)
NEXT_PUBLIC_ENABLE_DEV_TOOLS=true
```

These same vars must be set in **Vercel project settings** under Environment Variables.

---

## 4. Running the Project Locally

```bash
git clone https://github.com/DamianDevZ/erp-project
cd erp-project
npm install

# Create .env.local with values above
npm run dev      # runs at http://localhost:3000
npm run build    # production build (TypeScript checked)
npm run lint     # ESLint
npx tsc --noEmit # type-check without building
```

---

## 5. Project Folder Structure

```
erp-project/
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── globals.css              # ★ ALL design tokens defined here
│   │   ├── layout.tsx               # Root layout (fonts, metadata)
│   │   ├── page.tsx                 # Root redirect → /dashboard or /login
│   │   ├── (auth)/                  # Auth pages (no sidebar)
│   │   │   ├── login/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   ├── (dashboard)/             # All authenticated pages
│   │   │   ├── layout.tsx           # ★ Main layout: loads user profile, wraps with Sidebar+Header+ClientProvider
│   │   │   └── dashboard/
│   │   │       ├── page.tsx         # Dashboard home (role-routed)
│   │   │       ├── DashboardRouter.tsx  # Switches dashboard by role
│   │   │       ├── AdminDashboard.tsx
│   │   │       ├── employees/       # Employee listing + detail + new
│   │   │       ├── shifts/          # Shift management
│   │   │       ├── leaves/          # Leave requests
│   │   │       ├── orders/          # Order listing + detail
│   │   │       ├── assets/          # Vehicle/equipment management
│   │   │       ├── clients/         # Client (delivery platform) management
│   │   │       ├── invoices/        # Invoice creation + detail + PDF
│   │   │       ├── payroll/         # Payroll listing + detail
│   │   │       ├── finance/         # COD tracking, finance ledger
│   │   │       ├── finance-overview/ # Finance dashboard
│   │   │       ├── hr/              # HR dashboard
│   │   │       ├── operations/      # Operations dashboard
│   │   │       ├── incidents/       # Incident reporting
│   │   │       ├── compliance/      # Compliance alerts
│   │   │       ├── coaching/        # Coaching sessions
│   │   │       ├── performance/     # Discipline records
│   │   │       ├── documents/       # Employee documents
│   │   │       ├── training/        # Training records
│   │   │       ├── referrals/       # Employee referral program
│   │   │       ├── vendors/         # Supplier management
│   │   │       ├── kpis/            # KPI tracking
│   │   │       ├── locations/       # Asset location management
│   │   │       ├── reports/         # Report generation
│   │   │       ├── settings/        # Org settings
│   │   │       └── rider/           # Rider self-service dashboard
│   │   ├── (admin)/                 # Super-admin panel (no org context)
│   │   │   └── admin/
│   │   │       ├── page.tsx         # Super-admin home
│   │   │       ├── organizations/   # Manage all orgs
│   │   │       └── users/
│   │   └── api/                     # Next.js API Routes (server-side only)
│   │       ├── admin/               # Admin operations using service role key
│   │       └── employees/           # Employee-specific server actions
│   ├── components/
│   │   ├── ui/                      # ★ Reusable UI primitives
│   │   │   ├── badge.tsx            # Status badges
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── data-table.tsx       # Sortable, filterable table component
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── page-layout.tsx      # PageHeader, PageContent, DetailCard, etc.
│   │   │   ├── select.tsx
│   │   │   ├── spinner.tsx
│   │   │   └── table.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx          # Role-based navigation sidebar
│   │   │   ├── Header.tsx           # Top bar: search, user menu, client selector
│   │   │   ├── ClientSelector.tsx   # Dropdown to filter by delivery platform client
│   │   │   ├── GlobalSearch.tsx     # Full-text search overlay
│   │   │   └── AdminSidebar.tsx     # Sidebar for super-admin panel
│   │   └── dev/
│   │       └── RoleSwitcher.tsx     # Dev tool: switch role to test different dashboards
│   ├── contexts/
│   │   └── ClientContext.tsx        # ★ Global client-filter context (which "platform" is selected)
│   ├── features/                    # ★ Business logic (types, queries, services, components)
│   │   ├── analytics/               # Dashboard metrics + chart data hooks
│   │   ├── assets/                  # Vehicle/equipment
│   │   ├── attendance/              # Check-in/out
│   │   ├── auth/                    # Auth helpers
│   │   ├── clients/                 # Delivery platform clients
│   │   ├── coaching/                # Coaching sessions
│   │   ├── compliance/              # Document expiry alerts
│   │   ├── contracts/               # Client contracts
│   │   ├── dashboard/               # Role-specific dashboard views
│   │   ├── documents/               # Employee documents
│   │   ├── employees/               # Employee management
│   │   ├── finance/                 # Finance ledger, COD, commissions
│   │   ├── incidents/               # Incident reporting
│   │   ├── invoicing/               # Invoice generation
│   │   ├── leaves/                  # Leave requests
│   │   ├── notifications/           # In-app notifications
│   │   ├── offboarding/             # Offboarding workflows
│   │   ├── onboarding/              # Onboarding checklists
│   │   ├── operations/              # Operations-specific features
│   │   ├── orders/                  # Delivery orders
│   │   ├── organizations/           # Multi-tenancy management
│   │   ├── payroll/                 # Payroll calculation
│   │   ├── performance/             # Discipline records
│   │   ├── referrals/               # Employee referral program
│   │   ├── reporting/               # Analytics & report generation
│   │   ├── search/                  # Global search service
│   │   ├── settings/                # Organization settings
│   │   ├── shifts/                  # Shift scheduling
│   │   ├── training/                # Training management
│   │   ├── vendors/                 # Supplier/vendor management
│   │   └── ...                      # other utility feature modules
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts            # Browser Supabase client (createBrowserClient)
│   │       ├── server.ts            # Server Supabase client (createServerClient with cookies)
│   │       └── hooks.ts             # ★ Custom React hooks: useQuery, useMutation, useSupabase, useOrganizationId
│   └── middleware.ts                # Auth guard: redirects unauthenticated users, redirects logged-in away from /login
├── docs/
│   ├── design-system.md             # Design token usage guide
│   ├── database/schema.md           # Database schema documentation
│   └── PROJECT_HANDOFF.md           # This file
├── .env.local                       # Local environment variables (never commit)
├── .gitignore
├── next.config.ts
├── package.json
├── tailwind.config.ts               # Minimal — tokens defined in globals.css
└── tsconfig.json
```

---

## 6. Authentication & Authorization

### How it works

1. **Supabase Auth** handles email/password login, password reset
2. **Middleware** (`src/middleware.ts`) runs on every request:
   - If unauthenticated → redirect to `/login`
   - If authenticated and on `/login` → redirect to `/dashboard`
3. **Dashboard Layout** (`src/app/(dashboard)/layout.tsx`):
   - Fetches `user_profiles` for the logged-in user
   - Gets their `role`, `organization_id`, `employee_id`
   - Passes this into `ClientProvider`
4. **Super-admins** (`is_super_admin = true` in `user_profiles`) without an `organization_id` are redirected to `/admin`

### User roles (stored in `user_profiles.role`)
| Role | Access |
|---|---|
| `administrator` | Full access to all modules |
| `hr` | HR module, employees, leaves, documents, shifts |
| `operations` | Orders, shifts, assets, incidents, KPIs |
| `finance` | Clients, invoices, COD, vendors |
| `rider` | Self-service dashboard only (own shifts, documents) |

### Dev Role Switcher
During development (or when `NEXT_PUBLIC_ENABLE_DEV_TOOLS=true`), a panel appears that lets you switch between roles to test the different dashboard views. This uses `localStorage` and context — no actual auth change.

---

## 7. Database (Supabase)

**Project URL:** `https://plhisimsnaharzgpmfmg.supabase.co`

### Architecture principles
- Every table has `organization_id uuid` for multi-tenancy
- **Row Level Security (RLS)** is enabled on all tables — users only see their org's data
- Soft deletes where applicable: `deleted_at timestamptz`
- All primary keys are `uuid` with `gen_random_uuid()` default
- `created_at`/`updated_at` on all tables

### Core tables with data (actively used)

#### `organizations` (1 row)
The company that uses the ERP. Has `id`, `name`.

#### `user_profiles` (4 rows)
Links Supabase auth users to org accounts.
- `id` → matches `auth.users.id`
- `organization_id` → their org
- `role` → `administrator|hr|operations|finance|rider`
- `employee_id` → if they are also a rider, links to `employees.id`
- `is_super_admin` → bypasses org restrictions

#### `employees` (15 rows)
The riders and staff. Key fields:
- `full_name`, `employee_id` (internal code), `email`, `phone`
- `status`: `pending | active | past`
- `role`: `rider | supervisor | manager | hr`
- `rider_category`: `company_vehicle_rider | own_vehicle_rider`
- `compliance_status`: auto-computed from expiring documents
- `onboarding_step`: 11-step onboarding workflow
- `driving_licence_expiry`, `visa_expiry`, `id_expiry` — tracked for compliance alerts

#### `clients` (6 rows)
Delivery platform companies (Uber Eats, Bolt, Deliveroo, etc.).
- `name`, `contact_email`, `contact_phone`
- `billing_rate_type`: `per_delivery | hourly | fixed`
- `billing_rate`, `commission_rate`, `payment_terms`
- `requires_uniform`, `requires_bag`, `requires_phone_app`
- `integration_status`: for future API-based order import

#### `client_assignments` (20 rows)
Links employees to client platforms they work for.
- `employee_id`, `client_id`
- `status`: `active | ended | suspended`
- `start_date`, `end_date`
- **Critical:** used throughout to filter all metrics by selected client

#### `shifts` (15 rows)
Work shifts assigned to employees.
- `employee_id`, `client_id`, `vehicle_id`
- `shift_date`, `start_time`, `end_time`
- `status`: `scheduled | in_progress | completed | cancelled | no_show`
- `shift_type`: `regular | overtime | on_call | training | split`
- `actual_start_time`, `actual_end_time` — filled in by attendance check-in/out

#### `attendance` (9 rows)
GPS check-in/out records.
- `employee_id`, `shift_id`
- `check_in_time`, `check_out_time`
- `check_in_method`: `manual | gps | qr_code | biometric`
- `check_in_latitude`, `check_in_longitude`

#### `orders` (27 rows)
Delivery orders from client platforms.
- `external_order_id` — the order ID from Uber Eats/Bolt/etc.
- `client_id`, `employee_id`, `asset_id`
- `order_date`, `pickup_time`, `delivery_time`
- `status`: `pending | completed | cancelled | returned | disputed`
- `order_type`: `delivery | pickup | express | scheduled`
- `order_value`, `delivery_fee`, `total_revenue`
- `base_payout`, `incentive_payout`, `tip_amount`, `cod_amount`
- `platform_commission` — what the client takes
- `reconciliation_status`: `pending | matched | mismatched | resolved`
- `payroll_processed`, `invoice_processed` — tracking flags

#### `assets` (8 rows)
Vehicles and equipment.
- `asset_type`: `vehicle | equipment | other`
- `asset_category`: `vehicle | helmet | uniform | phone | bag | accessory | other`
- `ownership`: `company_owned | employee_owned | rental`
- `license_plate`, `make`, `model`, `year`, `color`
- `assigned_employee_id` — current rider
- `status`: `available | assigned | maintenance | retired`
- `registration_expiry`, `insurance_expiry` — tracked for compliance

#### `invoices` (8 rows)
Invoices sent to clients.
- `client_id`, `invoice_number`
- `period_start`, `period_end`
- `subtotal`, `tax_rate`, `tax_amount`, `total`
- `status`: `draft | sent | paid | overdue | cancelled`
- Currency: **BHD (Bahraini Dinar)** with 3 decimal places

#### `compliance_alerts` (5 rows)
Auto-generated alerts for expiring documents.
- `employee_id` or `asset_id`
- `alert_type`: `license_expiring|license_expired|visa_expiring|...`
- `severity`: `info | warning | critical | blocking`
- `expires_at`
- `status`: `open | acknowledged | resolved`

#### `incidents` (4 rows)
Accidents, damages, violations.
- `employee_id`, `asset_id`
- `incident_type`: `accident|theft|vandalism|breakdown|damage_rider|...`
- `severity`: `minor | moderate | major | total`
- `responsibility_party`: `rider | third_party | company | unknown | shared`
- `status`: `reported | under_investigation | resolved | closed`

#### `maintenance_events` (4 rows)
Vehicle maintenance/repair records.
- `asset_id`, `maintenance_type`, `description`
- `cost`, `scheduled_date`, `completed_date`

#### `leaves` (2 rows)
Employee leave requests.
- `employee_id`, `leave_type`: `annual|sick|unpaid|maternity|paternity|emergency|other`
- `start_date`, `end_date`, `days_count`
- `status`: `pending | approved | rejected | cancelled`

#### `onboarding_checklists` (12 rows)
Onboarding task checklists for new riders (11-step workflow).

#### `coachings` (3 rows)
1-on-1 coaching sessions between managers and riders.
- `coaching_type`: `corrective | goal_setting | performance_review | one_on_one | training | other`

#### `contracts` (0 rows — not yet used)
Contractual agreements with clients (billing terms).

### Fully empty tables (built but unused)
The following were created in anticipation of future features but have no data:
- `payroll` / `payroll_batches` / `payroll_line_items` — payroll calculation not yet populated
- `cod_collections` / `cod_remittances` — COD tracking schema exists, no data
- `finance_ledger` — financial ledger built, not populated
- `work_logs` — work log tracking
- `wps_files` — WPS (Wage Protection System) export files
- `vendors` / `vendor_services` — vendor management
- `conversations` / `messages` — internal messaging (not built)
- `notifications` — notification system (not built)
- `geofences` / `geofence_events` — geofencing (not built)
- `report_definitions` / `report_schedules` / `generated_reports` — scheduled reports
- `vehicle_assignments` / `rider_vehicle_assignments` — duplicate vehicle tracking tables
- Many others (see section 12 — Database Cleanup Notes)

---

## 8. How Frontend ↔ Backend Works

### Data fetching pattern

**Server Components** (pages) use the server Supabase client:
```ts
import { createClient } from '@/lib/supabase/server';

export default async function MyPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('employees').select('*');
  return <EmployeeList employees={data} />;
}
```

**Client Components** use the custom `useQuery` hook:
```ts
import { useQuery } from '@/lib/supabase/hooks';

function MyComponent() {
  const { data, isLoading, refetch } = useQuery(async (supabase) => {
    return supabase.from('orders').select('*').eq('status', 'completed');
  }, []);
}
```

**Mutations** use the `useMutation` hook:
```ts
const { mutate, isLoading } = useMutation(async (supabase, variables) => {
  return supabase.from('employees').insert(variables);
});
```

### Supabase join type casting (IMPORTANT)
Supabase infers joined relations as arrays. When accessing joined data in TypeScript, always cast:
```ts
// ✅ Correct
const name = (order.client as unknown as { name: string } | null)?.name;

// ❌ Wrong — TypeScript will error: 'client' inferred as '{ name: string }[]'
const name = order.client?.name;
```

### Client Context (global filter)
`ClientContext` provides a global "which delivery client are we viewing" filter. When admin selects "Uber Eats" in the header, all dashboards and metrics filter accordingly.

```ts
const { getClientFilter } = useClientContext();
const clientIds = getClientFilter(); // null = all, [] = empty, ['uuid'] = filtered

// Use in queries:
if (clientIds?.length) {
  query = query.in('client_id', clientIds);
}
```

---

## 9. UI System (Design Tokens)

All styling is via **Tailwind CSS** using **semantic tokens** defined in `src/app/globals.css`. Never use raw Tailwind color classes.

### Text tokens
| Token | Use |
|---|---|
| `text-heading` | Page titles, table headers |
| `text-body` | Regular content |
| `text-muted` | Secondary/helper text |
| `text-primary` | Links, accents |
| `text-inverse` | Text on dark backgrounds |

### Background tokens
| Token | Use |
|---|---|
| `bg-background` | Page background |
| `bg-card` | Cards, panels |
| `bg-hover` | Hover states |
| `bg-active` | Selected/active states |

### UI Components (always import from `@/components/ui`)
```ts
import { Button, Input, Label, Card, Badge, Table, Spinner, Dialog, Select, Form } from '@/components/ui';
```

**Badge variants:** `default | success | warning | error | outline`
**Button variants:** `default | destructive | outline | ghost | link`

### Page layout components
```tsx
import { PageHeader, PageContent, DetailLayout, DetailCard, DetailGrid, DetailItem } from '@/components/ui';

// Standard page structure:
<PageContent>
  <PageHeader title="Employees" breadcrumbs={[...]} actions={<Button>Add</Button>} />
  <DataTable columns={columns} data={data} />
</PageContent>
```

---

## 10. Role-Based Dashboards

The main dashboard (`/dashboard`) shows a different view per role:

| Role | Dashboard Component | Shows |
|---|---|---|
| `administrator` | `AdminDashboard` | All metrics, compliance alerts, recent activity |
| `hr` | `HRDashboard` | Employee stats, leaves, compliance |
| `operations` | `OperationsDashboard` | Orders, KPIs, shifts, assets |
| `finance` | `FinanceDashboard` | Revenue, invoices, COD |
| `rider` | `RiderDashboard` | Own shifts, own orders, own documents |

Routing is done in `DashboardRouter.tsx` based on `useDevRole()` (dev tools) or defaults to Admin.

---

## 11. Navigation Structure (Sidebar)

The sidebar nav is role-filtered. Administrator gets grouped sections:

**HR section:** HR Dashboard, Employees, Leaves, Shifts, Referrals, Documents, Discipline, Training  
**Operations section:** Ops Dashboard, KPIs, Orders, Shifts, Coaching, Assets, Locations, Incidents, Compliance  
**Finance section:** Finance Dashboard, Clients, Invoices, Payroll, COD Tracking, Vendors, Reports  
**Rider section:** Rider View, Shifts, Documents

---

## 12. Key Business Logic

### Compliance Alerts
Auto-generated when employee documents are expiring:
- **Info** — 30+ days remaining
- **Warning** — 14–30 days remaining
- **Critical** — 7–14 days remaining
- **Blocking** — already expired

Tracked fields: `driving_licence_expiry`, `visa_expiry`, `id_expiry` on employees; `registration_expiry`, `insurance_expiry` on assets.

### Employee → Client Assignment Flow
1. Employee is created with status `pending`
2. Goes through 11-step onboarding workflow
3. Gets assigned to client(s) via `client_assignments`
4. Works shifts (`shifts` table) for those clients
5. Orders completed are tracked in `orders`
6. Payroll calculated from orders + hours

### Rider Category Affects Pay
- **Company Vehicle Rider** — vehicle deductions apply
- **Own Vehicle Rider** — gets vehicle allowance, no vehicle deductions

### Invoice Generation
- Generated for a client for a period (e.g., weekly)
- Based on orders completed × billing rate or commission
- Status flow: `draft → sent → paid`
- Currency is always **BHD** (3 decimal places)

### Order Status Flow
`pending → completed | cancelled | returned | disputed`

---

## 13. Database Cleanup Notes (Technical Debt)

The following tables exist but are completely empty and may be candidates for removal or deprioritization:

**Duplicate vehicle tracking:**
- `vehicle_assignments` (39 cols) vs `rider_vehicle_assignments` — similar purpose, both empty
- Consider consolidating

**Unused advanced features:**
- `offboarding_workflow` (43 cols) — complex, never populated
- `partner_breakdown_claims` (44 cols) — never populated
- `executive_snapshots` — reporting snapshots, never populated
- `geofences` / `geofence_events` — GPS geofencing, not built on frontend

**Messaging system (schema only):**
- `conversations`, `conversation_participants`, `messages`, `message_read_receipts` — built but no frontend

**Previously replaced table:**
- `platforms` — this table WAS used but has since been renamed/replaced by `clients`. All references in code have been migrated to `clients`. The `platforms` table itself may still exist in the DB and can be dropped.

---

## 14. Known Issues / Current State

- **Build:** As of latest commit, `tsc --noEmit` passes with zero errors. Vercel build should succeed.
- **Payroll data:** The `payroll` table exists but is empty — payroll feature UI exists but no real data to show
- **COD tracking:** UI exists under `/dashboard/finance` but `cod_collections` table is empty
- **Middleware deprecation warning:** Next.js 16 renamed `middleware` convention to `proxy` — not breaking but will need update eventually
- **Dev role switcher:** Must be manually switched per session (stored in localStorage) — roles are not yet driven by actual `user_profiles.role` in a dynamic way on the frontend

---

## 15. Deployment

**Platform:** Vercel  
**Repo:** `github.com/DamianDevZ/erp-project`  
**Branch:** `main` → auto-deploys on push  
**Build Command:** `npm run build` (= `next build`)  
**Output:** Static + serverless functions

All environment variables from `.env.local` must also be set in Vercel dashboard under Project Settings → Environment Variables.

---

## 16. Where to Start as a New Developer

1. Clone repo, run `npm install`, create `.env.local`, run `npm run dev`
2. Log in at `http://localhost:3000/login` (ask for credentials)
3. Read `docs/design-system.md` before touching any UI
4. To add a new feature module:
   - Create `src/features/my-feature/types.ts` for TypeScript types
   - Create `src/features/my-feature/queries.ts` for data hooks
   - Create `src/features/my-feature/components/` for UI
   - Create `src/features/my-feature/index.ts` to export everything
   - Add a page at `src/app/(dashboard)/dashboard/my-feature/page.tsx`
   - Add nav link in `src/components/layout/Sidebar.tsx`
5. Always cast Supabase joined fields with `as unknown as T | null`
6. Always use semantic CSS tokens (never raw color classes)
7. Test TypeScript: `npx tsc --noEmit` must pass before pushing
