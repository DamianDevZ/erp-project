# Design System

> **IMPORTANT**: This is the single source of truth for all styling. **Never use inline styles or hardcoded colors.** All UI must use these tokens to ensure consistency and easy theming.

## Source Files

| File | Purpose |
|------|---------|
| `src/app/globals.css` | **All design tokens defined here** - colors, spacing, typography |
| `src/components/ui/` | Pre-built components using tokens |
| `docs/design-system.md` | This documentation |

## Quick Reference

### Text Colors (use in class names)
| Token | Usage | Example |
|-------|-------|---------|
| `text-heading` | Headings, important text, form values | `<h1 className="text-heading">` |
| `text-body` | Body text, paragraphs | `<p className="text-body">` |
| `text-muted` | Secondary text, hints, descriptions | `<span className="text-muted">` |
| `text-placeholder` | Input placeholders | Built into Input component |
| `text-primary` | Links, accents, brand color text | `<a className="text-primary">` |
| `text-error` | Error messages | `<span className="text-error">` |
| `text-success` | Success messages | `<span className="text-success">` |
| `text-warning` | Warning messages | `<span className="text-warning">` |

### Background Colors
| Token | Usage | Example |
|-------|-------|---------|
| `bg-background` | Page backgrounds | `<div className="bg-background">` |
| `bg-card` | Cards, modals, elevated surfaces | `<div className="bg-card">` |
| `bg-input` | Form inputs | Built into Input component |
| `bg-hover` | Hover states, zebra stripes | `hover:bg-hover` |
| `bg-primary` | Primary buttons | Built into Button component |
| `bg-primary-light` | Active nav items, selections | `bg-primary-light` |
| `bg-error` | Error buttons | `bg-error` |
| `bg-error-light` | Error backgrounds | `bg-error-light` |
| `bg-success-light` | Success backgrounds | `bg-success-light` |
| `bg-warning-light` | Warning backgrounds | `bg-warning-light` |

### Border Colors
| Token | Usage | Example |
|-------|-------|---------|
| `border-border` | Default borders | `border border-border` |
| `border-hover` | Hover state borders | `hover:border-hover` |

### Focus States
| Token | Usage | Example |
|-------|-------|---------|
| `ring-primary` | Focus rings | `focus:ring-2 focus:ring-primary` |

## Page Layout Patterns

### Page Header (consistent across all pages)
```tsx
<div className="space-y-6">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold text-heading">Page Title</h1>
      <p className="text-muted">Description of the page.</p>
    </div>
    <Button>Action</Button>
  </div>
  
  {/* Page content */}
</div>
```

### Detail Labels
```tsx
<div>
  <p className="text-sm text-muted">Label</p>
  <p className="font-medium text-heading">Value</p>
</div>
```

### Empty States
```tsx
<div className="p-6 text-center">
  <p className="text-muted">No items yet. Create your first item.</p>
  <Button className="mt-4">Create Item</Button>
</div>
```

## Usage Rules

### DO ✅
```tsx
// Use semantic tokens
<h1 className="text-heading">Title</h1>
<p className="text-muted">Description</p>
<div className="bg-card border border-border">

// Use UI components
import { Button, Input, Card } from '@/components/ui';
```

### DON'T ❌
```tsx
// Never use hardcoded gray/color values
<h1 className="text-gray-900">Title</h1>        // ❌ Use text-heading
<p className="text-gray-500">Description</p>    // ❌ Use text-muted
<div className="bg-white border-gray-200">      // ❌ Use bg-card border-border
<button className="bg-blue-600">               // ❌ Use bg-primary

// Never use inline styles
<div style={{ color: '#333' }}>                // ❌ Use className
```

## Available UI Components

All components in `src/components/ui/` are pre-styled. **Always import from here first:**

```tsx
import { 
  // Buttons & Forms
  Button,
  Input,
  Label,
  Spinner,
  
  // Layout
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  
  // Data Display
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge,
  
  // Selection (custom)
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui';
```

### Button Variants
```tsx
<Button>Primary (default)</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button loading>Loading...</Button>
```

### Badge Variants
```tsx
<Badge>Default</Badge>
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Inactive</Badge>
<Badge variant="info">Info</Badge>
```

## Native HTML Elements

### Select Dropdowns
For native `<select>` elements (not the custom Select component):

```tsx
<select className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary">
  <option value="">Select...</option>
  <option value="1">Option 1</option>
</select>
```

### Checkboxes
```tsx
<input
  type="checkbox"
  className="h-4 w-4 rounded border-border accent-primary"
/>
```

### Links
```tsx
<Link href="/path" className="text-primary hover:underline">
  Link text
</Link>

// Muted links (like "Back to login")
<Link href="/path" className="text-sm text-muted hover:underline">
  Secondary link
</Link>
```

## Feature-Specific Components

Each feature module may have its own styled components:

| Feature | Components | Location |
|---------|------------|----------|
| Employees | `EmployeeCard`, `EmployeeStatusBadge`, `EmployeeRoleBadge` | `src/features/employees/components/` |
| Assets | `AssetCard`, `AssetOwnershipBadge` | `src/features/assets/components/` |
| Platforms | `PlatformCard` | `src/features/platforms/components/` |
| Invoicing | `InvoiceCard`, `InvoiceStatusBadge` | `src/features/invoicing/components/` |

## Token Definitions

All tokens are defined in `src/app/globals.css` under the `:root` and `@theme inline` blocks.

### Color Palette Variables
```css
--color-brand-*     /* Blue - primary actions */
--color-neutral-*   /* Gray scale - text, borders, backgrounds */
--color-success-*   /* Green - success states */
--color-warning-*   /* Amber - warning states */
--color-error-*     /* Red - error states */
```

### How Tailwind Classes Map to Variables
```css
@theme inline {
  /* These create the Tailwind utility classes */
  --color-primary: var(--color-brand-600);     /* bg-primary, text-primary */
  --color-heading: var(--color-neutral-900);   /* text-heading */
  --color-muted: var(--color-neutral-500);     /* text-muted */
  --color-border: var(--color-neutral-200);    /* border-border */
  /* etc... */
}
```

### Modifying the Theme

To change the primary brand color for the **entire app**:

```css
/* In globals.css, update the brand palette */
:root {
  --color-brand-50: #your-lightest;
  --color-brand-100: #...;
  --color-brand-600: #your-primary;  /* Main brand color */
  --color-brand-700: #your-hover;
  /* ... */
}
```

All buttons, links, focus rings, and accents will automatically update.

## Checklist for New Features

When creating new pages or components:

1. ✅ Import UI components from `@/components/ui`
2. ✅ Use `text-heading` for titles and important values
3. ✅ Use `text-muted` for descriptions and secondary text
4. ✅ Use `text-body` for regular paragraphs
5. ✅ Use `bg-card` for cards, `bg-background` for pages
6. ✅ Use `border-border` for all borders
7. ✅ Use `focus:ring-primary` for focus states
8. ✅ Never hardcode colors like `gray-500`, `blue-600`, etc.
9. ✅ Never use inline `style={}` attributes
