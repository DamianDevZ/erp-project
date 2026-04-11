import * as React from 'react';

/**
 * Loading spinner component.
 * 
 * @example
 * // Default size
 * <Spinner />
 * 
 * @example
 * // Large spinner for page loading
 * <Spinner size="lg" />
 * 
 * @example
 * // Full page loading state
 * <div className="flex h-screen items-center justify-center">
 *   <Spinner size="lg" />
 * </div>
 */
export function Spinner({ 
  size = 'default',
  className = '' 
}: { 
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-10 w-10',
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 border-current border-t-transparent text-blue-600 ${sizes[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
