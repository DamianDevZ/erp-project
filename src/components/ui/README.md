# UI Components

Shared, reusable UI primitives. Import from `@/components/ui`.

## Usage

```tsx
import { Button, Input, Card, Badge, Table } from '@/components/ui';
```

## Available Components

| Component | Description | Example |
|-----------|-------------|---------|
| `Button` | Primary action buttons | `<Button variant="default">Save</Button>` |
| `Input` | Text input with error state | `<Input error="Required" />` |
| `Label` | Form field labels | `<Label required>Name</Label>` |
| `Card` | Container with header/content/footer | See below |
| `Badge` | Status indicators | `<Badge variant="success">Active</Badge>` |
| `Table` | Data tables | See below |
| `Select` | Dropdown selection | See below |
| `Spinner` | Loading indicator | `<Spinner size="lg" />` |

## Button Variants

```tsx
<Button variant="default">Primary Action</Button>
<Button variant="outline">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="ghost">Subtle</Button>
<Button variant="link">Link Style</Button>
```

## Card Composition

```tsx
<Card>
  <CardHeader>
    <CardTitle>Driver Details</CardTitle>
    <CardDescription>Manage driver information</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Form fields here...</p>
  </CardContent>
  <CardFooter>
    <Button>Save Changes</Button>
  </CardFooter>
</Card>
```

## Badge Variants

```tsx
<Badge variant="success">Active</Badge>    // Green
<Badge variant="warning">Pending</Badge>   // Yellow
<Badge variant="error">Inactive</Badge>    // Red
<Badge variant="outline">Label</Badge>     // Border only
```

## Table Structure

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell><Badge variant="success">Active</Badge></TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Adding New Components

1. Create the component file in `src/components/ui/`
2. Include JSDoc with `@example`
3. Export from `index.ts`
4. Update this README
