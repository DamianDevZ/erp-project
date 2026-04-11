import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Error message to display below the input */
  error?: string;
}

/**
 * Text input component with error state support.
 * 
 * @example
 * // Basic usage
 * <Input placeholder="Enter driver name" />
 * 
 * @example
 * // With error
 * <Input error="Email is required" />
 * 
 * @example
 * // Controlled input
 * <Input value={email} onChange={(e) => setEmail(e.target.value)} />
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    const baseStyles = 'flex h-10 w-full rounded-md border bg-input px-3 py-2 text-sm text-heading placeholder:text-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
    const errorStyles = error ? 'border-error focus-visible:ring-error' : 'border-border';

    return (
      <div className="w-full">
        <input
          ref={ref}
          className={`${baseStyles} ${errorStyles} ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
