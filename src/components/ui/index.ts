/**
 * Shared UI Components
 * 
 * This folder contains reusable UI primitives that are shared across features.
 * Import from '@/components/ui' for consistent styling.
 * 
 * @example
 * import { Button, Input, Card } from '@/components/ui';
 */

export { Button, type ButtonProps } from './button';
export { Input, type InputProps } from './input';
export { Label, type LabelProps } from './label';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
export { Badge, type BadgeProps } from './badge';
export { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell,
  SortableTableHead,
  type SortDirection,
} from './table';
export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './select';
export { Spinner } from './spinner';

// DataTable - Reusable table with sorting, filtering, pagination
export { 
  DataTable, 
  type Column, 
  type PaginationState, 
  type SortState 
} from './data-table';

// Form System - Type-safe forms with react-hook-form + zod
export {
  Form,
  FormField,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  FormRadioGroup,
  FormSection,
  FormActions,
  FormRow,
  useFormState,
} from './form';

// Dialog - Modal dialogs
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
} from './dialog';

// Page Layout - Standardized page structure patterns
export {
  PageHeader,
  PageContent,
  PageSection,
  DetailLayout,
  DetailCard,
  DetailRow,
  DetailGrid,
  DetailItem,
  StatsGrid,
  Tabs,
  FilterBar,
  FilterSelect,
} from './page-layout';
