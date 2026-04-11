# Employee & Fleet Management ERP

A multi-tenant cloud ERP for managing employees (riders) who work with delivery platforms (Uber Eats, DoorDash, etc.), along with assets and invoicing.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Backend | Supabase (Postgres + Auth + Storage) |
| Hosting | Vercel |

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment (copy and fill in your Supabase keys)
cp .env.local.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/                      # Next.js routing (thin layer)
│   ├── (auth)/               # Public auth routes (login, register)
│   ├── (dashboard)/          # Protected dashboard routes
│   └── api/                  # API routes
│
├── features/                 # Business features (main code lives here)
│   ├── auth/                 # Authentication
│   ├── employees/            # Employee management (riders, supervisors) ⭐
│   ├── organizations/        # Multi-tenant orgs
│   ├── platforms/            # Delivery platforms (Uber Eats, etc.)
│   ├── assets/               # Vehicles & equipment
│   └── invoicing/            # Work logs & invoices
│
├── components/               # Shared UI components
│   ├── ui/                   # Primitives (Button, Input, Card...)
│   └── layout/               # App layout (Sidebar, Header)
│
├── lib/                      # Utilities
│   ├── supabase/             # Supabase client setup
│   └── utils/                # Helper functions
│
└── types/                    # Shared TypeScript types
```

## Feature Structure

Each feature is self-contained and follows this pattern:

```
features/[feature-name]/
├── components/               # Feature-specific UI
├── hooks/                    # React hooks
├── actions/                  # Server actions
├── types.ts                  # TypeScript types
├── index.ts                  # Public exports
└── README.md                 # Feature documentation
```

**Import anything from a feature via its index:**

```tsx
import { Employee, EmployeeCard } from '@/features/employees';
import { Asset, AssetCard } from '@/features/assets';
import { Invoice, InvoiceCard } from '@/features/invoicing';
```

## Documentation

| Document | Description |
|----------|-------------|
| [docs/architecture/folder-structure.md](docs/architecture/folder-structure.md) | Code organization |
| [docs/architecture/multi-tenancy.md](docs/architecture/multi-tenancy.md) | Tenant isolation design |
| [docs/database/schema.md](docs/database/schema.md) | Database tables |
| [src/components/ui/README.md](src/components/ui/README.md) | UI component library |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Coding standards |

## Quick Links

- **Manage employees**: `features/employees/`
- **Manage assets**: `features/assets/`
- **Invoicing**: `features/invoicing/`
- **UI components**: `components/ui/`
- **Supabase client**: `lib/supabase/`

## Scripts

```bash
npm run dev       # Development server
npm run build     # Production build
npm run lint      # Run ESLint
```
