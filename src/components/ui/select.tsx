'use client';

import * as React from 'react';

/**
 * Select components for dropdown selection.
 * These are simplified versions - for production, consider using @radix-ui/react-select.
 * 
 * @example
 * <Select value={status} onValueChange={setStatus}>
 *   <SelectTrigger>
 *     <SelectValue placeholder="Select status" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="active">Active</SelectItem>
 *     <SelectItem value="inactive">Inactive</SelectItem>
 *     <SelectItem value="pending">Pending</SelectItem>
 *   </SelectContent>
 * </Select>
 */

interface SelectContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

export function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectTrigger must be used within Select');

  return (
    <button
      type="button"
      onClick={() => context.setOpen(!context.open)}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
    >
      {children}
      <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectValue must be used within Select');

  return <span>{context.value || placeholder}</span>;
}

export function SelectContent({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectContent must be used within Select');

  if (!context.open) return null;

  return (
    <div className={`absolute z-50 mt-1 w-full rounded-md border border-border bg-card py-1 shadow-lg ${className}`}>
      {children}
    </div>
  );
}

export function SelectItem({
  value,
  children,
  className = '',
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectItem must be used within Select');

  const isSelected = context.value === value;

  return (
    <button
      type="button"
      onClick={() => {
        context.onValueChange?.(value);
        context.setOpen(false);
      }}
      className={`flex w-full items-center px-3 py-2 text-sm text-body hover:bg-hover ${isSelected ? 'bg-primary/10 text-primary' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
