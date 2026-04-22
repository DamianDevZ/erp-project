# AI Scaffold Prompt — ERP Project

> **Purpose:** Paste this into an AI agent to scaffold the project from zero — installing dependencies, setting up config files, folder structure, and foundational boilerplate. Once scaffolded, hand the agent `PROJECT_HANDOFF.md` for all feature/database/business logic context.

> **How to use:**
> 1. Paste this prompt into your AI agent (Claude, Cursor, Copilot, etc.)
> 2. Let it scaffold the base project
> 3. Then follow up with the contents of `PROJECT_HANDOFF.md` for everything else

---

## PROMPT (paste this):

```
You are an expert full-stack developer. I need you to scaffold a brand-new web application from scratch. Do not invent features — just set up the project skeleton exactly as described below.

## What we are building

A multi-tenant delivery operations ERP system. A web app for companies that manage fleets of delivery riders (working for platforms like Uber Eats, Bolt, Deliveroo). We need the full project skeleton ready to build on — no actual features yet, just the foundation.

## Tech stack to set up

- **Next.js 16.2.3** — use App Router, enable Turbopack
- **TypeScript 5** — strict mode
- **Tailwind CSS v4** — do NOT use a tailwind.config.js for colors; all design tokens go in globals.css as CSS custom properties
- **Supabase** — `@supabase/ssr` and `@supabase/supabase-js`
- **React Hook Form** — `react-hook-form` + `@hookform/resolvers`
- **Zod** — for schema validation
- **xlsx** — for Excel/CSV import (devDependency)

## Step 1 — Create the project

```bash
npx create-next-app@16.2.3 erp-project \
  --typescript \
  --tailwind \
  --app \
  --turbopack \
  --no-src-dir
# Then move everything into src/ manually or use --src-dir if supported
```

Use `src/` directory layout. App Router only — no Pages Router.

## Step 2 — Install dependencies

```bash
npm install @supabase/ssr @supabase/supabase-js react-hook-form @hookform/resolvers zod
npm install --save-dev xlsx
```

## Step 3 — Environment variables

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_ENABLE_DEV_TOOLS=true
```

Add `.env.local` to `.gitignore`.

## Step 4 — Folder structure to create

Create this exact structure (empty files/folders for now):

```
src/
├── app/
│   ├── globals.css              ← design tokens go here (see Step 6)
│   ├── layout.tsx               ← root layout
│   ├── page.tsx                 ← root redirect to /dashboard
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx           ← authenticated layout (sidebar + header)
│   │   └── dashboard/
│   │       └── page.tsx         ← dashboard home
│   ├── (admin)/
│   │   ├── layout.tsx
│   │   └── admin/page.tsx
│   └── api/
│       └── .gitkeep
├── components/
│   ├── ui/
│   │   ├── index.ts             ← re-export all UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── spinner.tsx
│   │   ├── form.tsx
│   │   └── page-layout.tsx      ← PageHeader, PageContent, DetailCard, DetailGrid, DetailItem
│   └── layout/
│       ├── index.ts
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       ├── ClientSelector.tsx
│       └── GlobalSearch.tsx
├── contexts/
│   ├── index.ts
│   └── ClientContext.tsx
├── features/                    ← one folder per domain, each with types.ts + index.ts
│   ├── employees/
│   ├── clients/
│   ├── orders/
│   ├── shifts/
│   ├── assets/
│   ├── payroll/
│   ├── invoicing/
│   ├── finance/
│   ├── attendance/
│   ├── compliance/
│   ├── incidents/
│   ├── leaves/
│   ├── documents/
│   ├── coaching/
│   ├── performance/
│   ├── training/
│   ├── referrals/
│   ├── vendors/
│   ├── analytics/
│   ├── dashboard/
│   ├── auth/
│   ├── organizations/
│   └── settings/
├── lib/
│   └── supabase/
│       ├── client.ts            ← browser client
│       ├── server.ts            ← server client
│       └── hooks.ts             ← useQuery, useMutation, useSupabase, useOrganizationId
└── middleware.ts                ← auth guard
```

## Step 5 — Supabase client files

**`src/lib/supabase/client.ts`**
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
```

**`src/lib/supabase/server.ts`**
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
```

**`src/lib/supabase/hooks.ts`** — implement these hooks:
- `useSupabase()` — returns browser Supabase client
- `useOrganizationId()` — fetches org ID from `user_profiles` for current user
- `useQuery<T>(queryFn, deps)` — generic async query hook, returns `{ data, error, isLoading, isError, refetch }`
- `useMutation<TData, TVariables>(mutationFn)` — generic mutation hook, returns `{ mutate, isLoading, isError, isSuccess, reset }`

## Step 6 — Middleware (auth guard)

**`src/middleware.ts`**
- Protected routes: anything under `/dashboard` or `/admin`
- Auth routes: `/login`, `/forgot-password`, `/reset-password`
- If unauthenticated on a protected route → redirect to `/login`
- If authenticated on an auth route → redirect to `/dashboard`
- Use `createServerClient` from `@supabase/ssr` with cookie forwarding

```ts
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

## Step 7 — Design tokens in globals.css

All colors must be CSS custom properties on `:root`. No hardcoded colors in components ever. Define:

**Brand palette:** `--color-brand-{50,100,200,300,400,500,600,700,800,900}` — blue scale (e.g. brand-500 = #3b82f6)

**Neutral palette:** `--color-neutral-{50,100,200,300,400,500,600,700,800,900,950}` — zinc/gray scale

**Semantic colors:**
- success: `--color-success-{50,500,600,700}`
- warning: `--color-warning-{50,500,600,700}`
- error: `--color-error-{50,500,600,700}`

**Semantic UI tokens (reference the palette vars above):**
```css
/* Backgrounds */
--bg-page, --bg-card, --bg-input, --bg-hover, --bg-active

/* Text */
--text-heading, --text-body, --text-muted, --text-placeholder, --text-inverse, --text-link

/* Border */
--border-default, --border-strong, --border-focus

/* Brand action */
--color-primary, --color-primary-hover, --color-primary-text

/* Status */
--color-success, --color-warning, --color-error
```

Then register all tokens as Tailwind utilities using `@theme inline` so classes like `text-heading`, `bg-card`, `border-border`, `text-primary` work in JSX.

## Step 8 — UI component stubs

Create minimal working stubs for each UI component. They must:
- Use only the semantic token classes (no raw colors)
- Export a named TypeScript interface for props
- Be importable from `@/components/ui`

Key components:

**Button** — variants: `default | destructive | outline | ghost | link`  
**Badge** — variants: `default | success | warning | error | outline`  
**Input** — standard text input with border-border, focus:ring-primary  
**Label** — form label  
**Card** — white card with border-border, rounded, shadow  
**Spinner** — loading indicator  
**Dialog** — modal overlay with backdrop  
**Select** — styled select dropdown  
**Table** — thead/tbody/tr/th/td with proper token-based styling  
**page-layout.tsx** — export: `PageHeader`, `PageContent`, `DetailLayout`, `DetailCard`, `DetailGrid`, `DetailItem`

## Step 9 — Dashboard layout stub

**`src/app/(dashboard)/layout.tsx`** should:
1. Use `createClient()` from server to get the current user
2. If no user → redirect to `/login`
3. Fetch `user_profiles` for `full_name`, `role`, `organization_id`, `employee_id`, `is_super_admin`
4. If `is_super_admin` and no `organization_id` → redirect to `/admin`
5. Wrap children in `<ClientProvider>` + sidebar + header layout

## Step 10 — ClientContext stub

**`src/contexts/ClientContext.tsx`** — a React context that:
- Holds `selectedClientIds: string[]` (which delivery platform clients are selected for filtering)
- Exposes `getClientFilter(): string[] | null` (null = no filter, empty array = show nothing, array = filter to those IDs)
- Exposes `setSelectedClientIds`, `assignedClients`, `allClients`, `loading`, `canViewAllClients`
- On mount: fetches `client_assignments` for the current employee (if `employeeId` provided) and all `clients` if admin/manager

## Once scaffolded

Confirm the project runs with `npm run dev` and `npx tsc --noEmit` passes. Then I will provide the full project handoff document (`PROJECT_HANDOFF.md`) which describes all existing features, database tables, business logic, and what to build next.
```

---

> **After the scaffold is done:** paste the contents of `PROJECT_HANDOFF.md` as the next message to the AI.
