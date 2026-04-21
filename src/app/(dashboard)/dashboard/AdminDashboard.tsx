'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import {
  DashboardMetricsGrid,
  PlatformPerformanceWidget,
  TopRidersWidget,
  ComplianceAlertsWidget,
  RecentActivityWidget,
} from '@/features/dashboard';

interface AdminDashboardProps {
  complianceAlerts?: Array<{
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    due_date: string;
    entity_type: 'employee' | 'vehicle';
  }>;
  activities?: Array<{
    id: string;
    type: 'order';
    action: string;
    subject: string;
    time: string;
  }>;
}

/**
 * Admin Dashboard
 * Shows comprehensive overview of all departments for administrators.
 */
export function AdminDashboard({ complianceAlerts = [], activities = [] }: AdminDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Dashboard</h1>
          <p className="text-muted">Welcome back! Here's an overview of your operations.</p>
        </div>
        <div className="flex gap-2">
          <QuickActionButton href="/dashboard/shifts" label="View Shifts" variant="secondary" />
          <QuickActionButton href="/dashboard/employees/new" label="Add Rider" />
        </div>
      </div>

      {/* Key metrics - client component with real-time data */}
      <DashboardMetricsGrid />

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Platform performance */}
          <PlatformPerformanceWidget />
          
          {/* Top riders */}
          <TopRidersWidget />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Compliance alerts */}
          <ComplianceAlertsWidget alerts={complianceAlerts} />

          {/* Recent activity */}
          <RecentActivityWidget activities={activities} />
          
          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <QuickAction href="/dashboard/employees/new" label="Add Employee" icon="user" />
              <QuickAction href="/dashboard/assets/new" label="Add Vehicle" icon="vehicle" />
              <QuickAction href="/dashboard/shifts/new" label="Create Shift" icon="calendar" />
              <QuickAction href="/dashboard/invoices/new" label="Create Invoice" icon="invoice" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function QuickActionButton({ 
  href, 
  label, 
  variant = 'primary' 
}: { 
  href: string; 
  label: string; 
  variant?: 'primary' | 'secondary';
}) {
  const baseStyles = "inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors";
  const variantStyles = variant === 'primary' 
    ? "bg-primary text-white hover:bg-primary/90" 
    : "border border-border text-body hover:bg-hover";
  
  return (
    <Link href={href} className={`${baseStyles} ${variantStyles}`}>
      {label}
    </Link>
  );
}

function QuickAction({ 
  href, 
  label, 
  icon 
}: { 
  href: string; 
  label: string; 
  icon: 'user' | 'vehicle' | 'calendar' | 'invoice';
}) {
  const icons = {
    user: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    vehicle: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    calendar: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    invoice: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  };

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm font-medium text-body transition-colors hover:bg-hover"
    >
      <span className="text-muted">{icons[icon]}</span>
      {label}
      <svg className="h-4 w-4 ml-auto text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
