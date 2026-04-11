<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ERP Project Guidelines

## Design System (MANDATORY)

**Read `docs/design-system.md` before creating any UI.**

All styling MUST use centralized design tokens from `src/app/globals.css`. Never use:
- Hardcoded colors (`text-gray-500`, `bg-blue-600`, `border-gray-200`)
- Inline styles (`style={{ color: '#333' }}`)

Use semantic tokens instead:
- `text-heading`, `text-body`, `text-muted` for text
- `bg-card`, `bg-background`, `bg-hover` for backgrounds  
- `border-border` for borders
- `focus:ring-primary` for focus states

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── globals.css         # ⭐ ALL design tokens defined here
│   ├── (auth)/             # Auth pages (login, forgot-password, etc.)
│   ├── (dashboard)/        # Regular user dashboard
│   └── (admin)/            # Super-admin panel
├── components/
│   ├── ui/                 # ⭐ Reusable UI components (always import from here)
│   └── layout/             # Layout components (Sidebar, Header)
├── features/               # Feature modules (employees, assets, platforms, invoicing)
│   └── [feature]/
│       ├── components/     # Feature-specific components
│       ├── types.ts        # TypeScript types
│       └── index.ts        # Public exports
├── lib/
│   └── supabase/           # Supabase client utilities
└── docs/
    └── design-system.md    # ⭐ Complete styling documentation
```

## UI Components

Always import from `@/components/ui`:
```tsx
import { Button, Input, Label, Card, Badge, Table } from '@/components/ui';
```

## Database

- Supabase Postgres with Row Level Security (RLS)
- Schema documented in `docs/database/schema.md`
- Multi-tenant via `organization_id` on all tables
