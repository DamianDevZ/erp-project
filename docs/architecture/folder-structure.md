# Folder Structure

This project uses **feature-based organization** — code is grouped by business domain, not by technical type.

## Source Structure

```
src/
├── app/                      # Next.js App Router (routing only)
│   ├── (auth)/               # Auth-related routes (login, register)
│   ├── (dashboard)/          # Protected dashboard routes
│   └── api/                  # API routes
│
├── features/                 # Business features (the core of the app)
│   ├── drivers/              # Driver management
│   │   ├── components/       # Driver-specific UI components
│   │   ├── hooks/            # Driver-specific React hooks
│   │   ├── actions/          # Server actions for drivers
│   │   ├── types.ts          # Driver types and interfaces
│   │   └── README.md         # Feature documentation
│   │
│   ├── assignments/          # Platform assignments
│   ├── payroll/              # Payroll and payments
│   └── organizations/        # Multi-tenant organization management
│
├── components/               # Shared UI components
│   ├── ui/                   # Base UI primitives (Button, Input, etc.)
│   └── layout/               # Layout components (Sidebar, Header)
│
├── lib/                      # Utilities and configurations
│   ├── supabase/             # Supabase client setup
│   └── utils/                # Helper functions
│
└── types/                    # Shared TypeScript types
    └── database.ts           # Generated Supabase types
```

## Principles

### 1. Feature Folders are Self-Contained
Each feature folder should contain everything needed for that feature. If a component is only used by drivers, it lives in `features/drivers/components/`.

### 2. Shared Code Goes Up
Only lift code to `components/` or `lib/` when it's actually used by multiple features.

### 3. Each Feature Has a README
Documents the purpose, data flow, and any business rules for that feature.

### 4. App Router is Thin
`app/` only handles routing and layout. Business logic lives in `features/`.
