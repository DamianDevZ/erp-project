import * as React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Whether the associated field is required */
  required?: boolean;
}

/**
 * Label component for form fields.
 * 
 * @example
 * <Label htmlFor="email">Email Address</Label>
 * <Input id="email" type="email" />
 * 
 * @example
 * // Required field indicator
 * <Label htmlFor="name" required>Full Name</Label>
 */
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = '', required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`text-sm font-medium leading-none text-heading peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
        {...props}
      >
        {children}
        {required && <span className="ml-1 text-error">*</span>}
      </label>
    );
  }
);

Label.displayName = 'Label';
