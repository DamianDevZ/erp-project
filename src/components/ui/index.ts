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
  TableCell 
} from './table';
export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './select';
export { Spinner } from './spinner';
