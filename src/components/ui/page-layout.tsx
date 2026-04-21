import * as React from 'react';
import Link from 'next/link';

/**
 * Page Layout Components - Standardized patterns for consistent page structure.
 * 
 * @example
 * <PageHeader
 *   title="Employees"
 *   description="Manage your riders and staff"
 *   actions={<Button>Add Employee</Button>}
 *   breadcrumbs={[
 *     { label: 'Dashboard', href: '/dashboard' },
 *     { label: 'Employees' },
 *   ]}
 * />
 */

// ============================================================================
// PAGE HEADER
// ============================================================================

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Page description - can be string or JSX for badges/tags */
  description?: React.ReactNode;
  /** Action buttons */
  actions?: React.ReactNode;
  /** Breadcrumb navigation */
  breadcrumbs?: Breadcrumb[];
  /** Back button link */
  backHref?: string;
  /** Additional class name */
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  backHref,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.label}>
              {index > 0 && <ChevronIcon className="h-4 w-4 text-muted" />}
              {crumb.href ? (
                <Link href={crumb.href} className="text-muted hover:text-heading transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-heading font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {backHref && (
            <Link
              href={backHref}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border hover:bg-hover transition-colors"
            >
              <BackIcon className="h-5 w-5 text-muted" />
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-bold text-heading">{title}</h1>
            {description && <div className="text-muted mt-1">{description}</div>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

// ============================================================================
// PAGE CONTENT
// ============================================================================

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContent({ children, className = '' }: PageContentProps) {
  return <div className={`space-y-6 ${className}`}>{children}</div>;
}

// ============================================================================
// PAGE SECTION
// ============================================================================

interface PageSectionProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageSection({
  title,
  description,
  actions,
  children,
  className = '',
}: PageSectionProps) {
  return (
    <section className={`space-y-4 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between">
          <div>
            {title && <h2 className="text-lg font-semibold text-heading">{title}</h2>}
            {description && <p className="text-sm text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

// ============================================================================
// DETAIL PAGE LAYOUT
// ============================================================================

interface DetailLayoutProps {
  /** Main content area (left) */
  children: React.ReactNode;
  /** Sidebar content (right) */
  sidebar?: React.ReactNode;
  /** Reverse layout (sidebar on left) */
  reversed?: boolean;
}

export function DetailLayout({ children, sidebar, reversed = false }: DetailLayoutProps) {
  if (!sidebar) {
    return <div>{children}</div>;
  }

  return (
    <div className={`grid gap-6 lg:grid-cols-3 ${reversed ? 'lg:flex-row-reverse' : ''}`}>
      <div className="lg:col-span-2 space-y-6">{children}</div>
      <div className="space-y-6">{sidebar}</div>
    </div>
  );
}

// ============================================================================
// DETAIL CARD
// ============================================================================

interface DetailCardProps {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DetailCard({ title, actions, children, className = '' }: DetailCardProps) {
  return (
    <div className={`rounded-lg border border-border bg-card ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          {title && <h3 className="font-semibold text-heading">{title}</h3>}
          {actions}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

// ============================================================================
// DETAIL ROW (label/value pair)
// ============================================================================

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function DetailRow({ label, value, className = '' }: DetailRowProps) {
  return (
    <div className={`flex items-start justify-between py-2 ${className}`}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-heading text-right ml-4">{value || '—'}</dd>
    </div>
  );
}

// ============================================================================
// DETAIL GRID (for multiple label/value pairs)
// ============================================================================

interface DetailGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}

export function DetailGrid({ children, className = '', columns = 2 }: DetailGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  };

  return (
    <dl className={`grid gap-x-6 gap-y-4 ${gridCols[columns]} ${className}`}>
      {children}
    </dl>
  );
}

interface DetailItemProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function DetailItem({ label, value, className = '' }: DetailItemProps) {
  return (
    <div className={className}>
      <dt className="text-sm text-muted mb-1">{label}</dt>
      <dd className="text-heading font-medium">{value || '—'}</dd>
    </div>
  );
}

// ============================================================================
// STATS GRID
// ============================================================================

interface Stat {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

interface StatsGridProps {
  stats: Stat[];
  className?: string;
}

export function StatsGrid({ stats, className = '' }: StatsGridProps) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-border bg-card p-6"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted">{stat.label}</p>
            {stat.icon && <div className="text-muted">{stat.icon}</div>}
          </div>
          <p className="mt-2 text-2xl font-bold text-heading">{stat.value}</p>
          {stat.change && (
            <p className={`mt-1 text-sm ${
              stat.trend === 'up' ? 'text-success' :
              stat.trend === 'down' ? 'text-error' : 'text-muted'
            }`}>
              {stat.trend === 'up' && '↑ '}
              {stat.trend === 'down' && '↓ '}
              {stat.change}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// TABS
// ============================================================================

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`border-b border-border ${className}`}>
      <nav className="flex gap-4 -mb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              px-1 pb-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-heading hover:border-border'
              }
            `}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                activeTab === tab.id ? 'bg-primary/10' : 'bg-hover'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ============================================================================
// FILTER BAR
// ============================================================================

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className = '' }: FilterBarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {children}
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  className = '',
}: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-10 rounded-md border border-border bg-input px-3 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      aria-label={label}
    >
      <option value="">{label}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ============================================================================
// ICONS
// ============================================================================

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
