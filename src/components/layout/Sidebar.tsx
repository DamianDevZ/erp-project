'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useDevRole } from '@/components/dev/RoleSwitcher';

type DevRole = 'administrator' | 'hr' | 'operations' | 'finance' | 'rider';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

// Define navigation for each role
const roleNavigation: Record<DevRole, (NavItem | NavSection)[]> = {
  administrator: [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    {
      name: 'HR',
      icon: UsersIcon,
      items: [
        { name: 'Employees', href: '/dashboard/employees', icon: UsersIcon },
        { name: 'Leaves', href: '/dashboard/leaves', icon: CalendarIcon },
        { name: 'Referrals', href: '/dashboard/referrals', icon: UserGroupIcon },
        { name: 'Documents', href: '/dashboard/documents', icon: FolderIcon },
      ],
    },
    {
      name: 'Operations',
      icon: TruckIcon,
      items: [
        { name: 'Shifts', href: '/dashboard/shifts', icon: ClockIcon },
        { name: 'Coaching', href: '/dashboard/coaching', icon: ClipboardIcon },
        { name: 'Assets', href: '/dashboard/assets', icon: TruckIcon },
      ],
    },
    {
      name: 'Finance',
      icon: DocumentIcon,
      items: [
        { name: 'Clients', href: '/dashboard/platforms', icon: BuildingIcon },
        { name: 'Invoices', href: '/dashboard/invoices', icon: DocumentIcon },
      ],
    },
  ],
  hr: [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Employees', href: '/dashboard/employees', icon: UsersIcon },
    { name: 'Leaves', href: '/dashboard/leaves', icon: CalendarIcon },
    { name: 'Referrals', href: '/dashboard/referrals', icon: UserGroupIcon },
    { name: 'Documents', href: '/dashboard/documents', icon: FolderIcon },
  ],
  operations: [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Employees', href: '/dashboard/employees', icon: UsersIcon },
    { name: 'Shifts', href: '/dashboard/shifts', icon: ClockIcon },
    { name: 'Coaching', href: '/dashboard/coaching', icon: ClipboardIcon },
    { name: 'Assets', href: '/dashboard/assets', icon: TruckIcon },
  ],
  finance: [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Clients', href: '/dashboard/platforms', icon: BuildingIcon },
    { name: 'Invoices', href: '/dashboard/invoices', icon: DocumentIcon },
  ],
  rider: [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'My Shifts', href: '/dashboard/shifts', icon: ClockIcon },
    { name: 'My Documents', href: '/dashboard/documents', icon: FolderIcon },
  ],
};

// Fallback navigation for non-development environments
const defaultNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Employees', href: '/dashboard/employees', icon: UsersIcon },
  { name: 'Leaves', href: '/dashboard/leaves', icon: CalendarIcon },
  { name: 'Referrals', href: '/dashboard/referrals', icon: UserGroupIcon },
  { name: 'Shifts', href: '/dashboard/shifts', icon: ClockIcon },
  { name: 'Documents', href: '/dashboard/documents', icon: FolderIcon },
  { name: 'Coaching', href: '/dashboard/coaching', icon: ClipboardIcon },
  { name: 'Assets', href: '/dashboard/assets', icon: TruckIcon },
  { name: 'Clients', href: '/dashboard/platforms', icon: BuildingIcon },
  { name: 'Invoices', href: '/dashboard/invoices', icon: DocumentIcon },
];

interface SidebarProps {
  organizationName?: string;
  organizationLogo?: string | null;
}

function isNavSection(item: NavItem | NavSection): item is NavSection {
  return 'items' in item;
}

/**
 * Sidebar navigation component.
 * Displays the main navigation for the dashboard.
 * Supports role-based navigation with expandable sections for administrators.
 */
export function Sidebar({ organizationName, organizationLogo }: SidebarProps) {
  const pathname = usePathname();
  const role = useDevRole();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Get navigation based on role
  const navigation = process.env.NODE_ENV === 'development' && role
    ? roleNavigation[role] || defaultNavigation
    : defaultNavigation;

  // Auto-expand sections based on current path
  useEffect(() => {
    if (role === 'administrator') {
      const newExpanded: string[] = [];
      roleNavigation.administrator.forEach((item) => {
        if (isNavSection(item)) {
          const hasActiveItem = item.items.some(
            navItem => pathname === navItem.href || pathname.startsWith(navItem.href + '/')
          );
          if (hasActiveItem) {
            newExpanded.push(item.name);
          }
        }
      });
      if (newExpanded.length > 0) {
        setExpandedSections(prev => [...new Set([...prev, ...newExpanded])]);
      }
    }
  }, [pathname, role]);

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionName)
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    );
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-24 items-center justify-start border-b border-border p-4">
        {organizationLogo ? (
          <Image
            src={organizationLogo}
            alt={organizationName || 'Logo'}
            width={160}
            height={64}
            className="max-h-16 w-auto max-w-full object-contain"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-white font-bold text-xl">
            {organizationName?.charAt(0).toUpperCase() || 'E'}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          if (isNavSection(item)) {
            const isExpanded = expandedSections.includes(item.name);
            const hasActiveItem = item.items.some(
              navItem => pathname === navItem.href || pathname.startsWith(navItem.href + '/')
            );
            
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleSection(item.name)}
                  className={`
                    w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors
                    ${hasActiveItem 
                      ? 'bg-primary-light text-primary' 
                      : 'text-body hover:bg-hover hover:text-heading'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </div>
                  <ChevronIcon 
                    className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                  />
                </button>
                {isExpanded && (
                  <div className="mt-1 ml-4 space-y-1 border-l border-border pl-3">
                    {item.items.map((subItem) => {
                      const isActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/');
                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={`
                            flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors
                            ${isActive 
                              ? 'bg-primary-light text-primary font-medium' 
                              : 'text-body hover:bg-hover hover:text-heading'
                            }
                          `}
                        >
                          <subItem.icon className="h-4 w-4" />
                          {subItem.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          
          // Regular nav item
          const isActive = item.href === '/dashboard' 
            ? pathname === '/dashboard'
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                ${isActive 
                  ? 'bg-primary-light text-primary' 
                  : 'text-body hover:bg-hover hover:text-heading'
                }
              `}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-body hover:bg-hover"
        >
          <SettingsIcon className="h-5 w-5" />
          Settings
        </Link>
      </div>
    </aside>
  );
}

// Simple icon components (inline SVGs for simplicity)
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
    </svg>
  );
}

function UserGroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
