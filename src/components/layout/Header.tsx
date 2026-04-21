'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui';
import { GlobalSearch } from './GlobalSearch';
import { ClientSelector } from './ClientSelector';

interface HeaderProps {
  /** Current user's name or email */
  userName?: string;
  /** Current organization name */
  organizationName?: string;
  /** Whether this is the admin panel */
  isAdmin?: boolean;
}

/**
 * Top header bar for the dashboard.
 * Shows current context, global search, client selector, and user actions.
 */
export function Header({ userName, organizationName, isAdmin }: HeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      {/* Left side - Organization context */}
      <div>
        {isAdmin ? (
          <h1 className="text-lg font-semibold text-heading">Super Admin</h1>
        ) : organizationName ? (
          <h1 className="text-lg font-semibold text-heading">{organizationName}</h1>
        ) : null}
      </div>

      {/* Center - Global Search */}
      <div className="flex-1 flex justify-center mx-4">
        <GlobalSearch />
      </div>

      {/* Right side - Client selector + User menu */}
      <div className="flex items-center gap-4">
        {/* Client selector - shown for all users */}
        <ClientSelector />

        {/* Notifications placeholder */}
        <button className="rounded-lg p-2 text-muted hover:bg-hover hover:text-body">
          <BellIcon className="h-5 w-5" />
        </button>

        {/* User dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-hover text-sm font-medium text-body">
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-heading">{userName || 'User'}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}
