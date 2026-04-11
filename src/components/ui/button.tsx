import * as React from 'react';

/**
 * Button variants for different use cases.
 * - `default`: Primary action button
 * - `destructive`: Dangerous actions (delete, remove)
 * - `outline`: Secondary actions
 * - `ghost`: Subtle actions, often in toolbars
 * - `link`: Looks like a link
 */
type ButtonVariant = 'default' | 'destructive' | 'outline' | 'ghost' | 'link';

/**
 * Button sizes.
 * - `sm`: Compact buttons for dense UIs
 * - `default`: Standard size
 * - `lg`: Large CTAs
 * - `icon`: Square button for icons only
 */
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Show loading spinner and disable interactions */
  loading?: boolean;
}

/**
 * Primary button component for user actions.
 * 
 * @example
 * // Primary action
 * <Button onClick={handleSave}>Save Driver</Button>
 * 
 * @example
 * // Destructive action
 * <Button variant="destructive" onClick={handleDelete}>Delete</Button>
 * 
 * @example
 * // Loading state
 * <Button loading>Saving...</Button>
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', loading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    
    const variants: Record<ButtonVariant, string> = {
      default: 'bg-primary text-white hover:bg-primary-hover',
      destructive: 'bg-error text-white hover:opacity-90',
      outline: 'border border-border bg-transparent text-heading hover:bg-hover',
      ghost: 'text-body hover:bg-hover hover:text-heading',
      link: 'text-primary underline-offset-4 hover:underline',
    };

    const sizes: Record<ButtonSize, string> = {
      default: 'h-10 px-4 py-2',
      sm: 'h-8 px-3 text-sm',
      lg: 'h-12 px-6 text-lg',
      icon: 'h-10 w-10',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
