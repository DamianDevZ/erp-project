# Contributing

Guidelines for contributing to this codebase.

## Documentation Requirements

### 1. Every Feature Gets a README

When creating a new feature in `src/features/`, include a `README.md` with:
- **Purpose**: What business problem it solves
- **Data Model**: Link to relevant schema docs
- **Components**: Table of UI components
- **Server Actions**: Table of backend operations
- **Business Rules**: Important constraints and logic

### 2. JSDoc for Exports

All exported functions, types, and components must have JSDoc comments:

```typescript
/**
 * Creates a new driver in the organization.
 * 
 * @param data - Driver information
 * @returns The created driver or error
 * 
 * @example
 * const result = await createDriver({
 *   fullName: 'John Doe',
 *   email: 'john@example.com'
 * });
 */
export async function createDriver(data: CreateDriverInput): Promise<DriverResult> {
  // ...
}
```

### 3. Inline Comments Explain "Why"

Don't comment what code does (that should be clear). Comment *why*:

```typescript
// BAD: Increments counter by 1
counter += 1;

// GOOD: Offset by 1 because Supabase pagination is 0-indexed but UI shows 1-indexed
const page = supabasePage + 1;
```

### 4. Update Schema Docs

When modifying database tables:
1. Update `docs/database/schema.md`
2. Run `npm run db:types` to regenerate TypeScript types

## Code Organization

### Feature Structure

```
src/features/[feature-name]/
├── components/          # UI components specific to this feature
│   └── FeatureComponent.tsx
├── hooks/               # React hooks for this feature
│   └── useFeature.ts
├── actions/             # Server actions
│   └── feature-actions.ts
├── types.ts             # Feature-specific types
├── utils.ts             # Feature-specific utilities
└── README.md            # Feature documentation
```

### When to Lift to Shared

Move code to shared locations (`src/components/`, `src/lib/`) only when:
- Used by 2+ features
- Genuinely reusable (not a coincidence)

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `DriverCard.tsx` |
| Hooks | camelCase with `use` prefix | `useDrivers.ts` |
| Actions | camelCase verbs | `createDriver`, `getDriverById` |
| Types | PascalCase | `Driver`, `CreateDriverInput` |
| Files | kebab-case or PascalCase for components | `driver-actions.ts`, `DriverCard.tsx` |

## TypeScript

- **No `any`** — use `unknown` and narrow types
- **Prefer interfaces** for object shapes
- **Export types** from feature's `types.ts`
