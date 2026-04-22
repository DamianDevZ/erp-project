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
        { name: 'HR Dashboard', href: '/dashboard/hr', icon: HomeIcon },
        { name: 'Employees', href: '/dashboard/employees', icon: UsersIcon },
        { name: 'Leaves', href: '/dashboard/leaves', icon: CalendarIcon },
        { name: 'Shifts', href: '/dashboard/shifts', icon: ClockIcon },
        { name: 'Referrals', href: '/dashboard/referrals', icon: UserGroupIcon },
        { name: 'Documents', href: '/dashboard/documents', icon: FolderIcon },
        { name: 'Performance Management', href: '/dashboard/performance', icon: ShieldIcon },
        { name: 'Coaching', href: '/dashboard/coaching', icon: ClipboardIcon },
        { name: 'Training', href: '/dashboard/training', icon: AcademicCapIcon },
      ],
    },
    {
      name: 'Operations',
      icon: TruckIcon,
      items: [
        { name: 'Ops Dashboard', href: '/dashboard/operations', icon: HomeIcon },
        { name: 'KPIs', href: '/dashboard/kpis', icon: ChartBarIcon },
        { name: 'Orders', href: '/dashboard/orders', icon: ClipboardListIcon },
        { name: 'Shifts', href: '/dashboard/shifts', icon: ClockIcon },
        { name: 'Coaching', href: '/dashboard/coaching', icon: ClipboardIcon },
        { name: 'Assets', href: '/dashboard/assets', icon: TruckIcon },
        { name: 'Locations', href: '/dashboard/locations', icon: MapPinIcon },
        { name: 'Incidents', href: '/dashboard/incidents', icon: ShieldIcon },
        { name: 'Compliance', href: '/dashboard/compliance', icon: ClipboardIcon },
      ],
    },
    {
      name: 'Finance',
      icon: DocumentIcon,
      items: [
        { name: 'Finance Dashboard', href: '/dashboard/finance-overview', icon: HomeIcon },
        { name: 'Clients', href: '/dashboard/clients', icon: BuildingIcon },
        { name: 'Invoices', href: '/dashboard/invoices', icon: DocumentIcon },
        { name: 'Payroll', href: '/dashboard/payroll', icon: DocumentIcon },
        { name: 'COD Tracking', href: '/dashboard/finance', icon: DocumentIcon },
        { name: 'Vendors', href: '/dashboard/vendors', icon: SupplierIcon },
        { name: 'Reports', href: '/dashboard/reports', icon: ChartBarIcon },
      ],
    },
    {
      name: 'Rider',
      icon: BikeIcon,
      items: [
        { name: 'Rider View', href: '/dashboard/rider', icon: HomeIcon },
        { name: 'Shifts', href: '/dashboard/shifts', icon: ClockIcon },
        { name: 'Documents', href: '/dashboard/documents', icon: FolderIcon },
      ],
    },
  ],
  hr: [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Employees', href: '/dashboard/employees', icon: UsersIcon },
    { name: 'Leaves', href: '/dashboard/leaves', icon: CalendarIcon },
    { name: 'Shifts', href: '/dashboard/shifts', icon: ClockIcon },
    { name: 'Referrals', href: '/dashboard/referrals', icon: UserGroupIcon },
    { name: 'Documents', href: '/dashboard/documents', icon: FolderIcon },
    { name: 'Performance Management', href: '/dashboard/performance', icon: ShieldIcon },
    { name: 'Coaching', href: '/dashboard/coaching', icon: ClipboardIcon },
    { name: 'Training', href: '/dashboard/training', icon: AcademicCapIcon },
  ],
  operations: [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'KPIs', href: '/dashboard/kpis', icon: ChartBarIcon },
    { name: 'Employees', href: '/dashboard/employees', icon: UsersIcon },
    { name: 'Leaves', href: '/dashboard/leaves', icon: CalendarIcon },
    { name: 'Shifts', href: '/dashboard/shifts', icon: ClockIcon },
    { name: 'Orders', href: '/dashboard/orders', icon: ClipboardListIcon },
    { name: 'Coaching', href: '/dashboard/coaching', icon: ClipboardIcon },
    { name: 'Assets', href: '/dashboard/assets', icon: TruckIcon },
    { name: 'Locations', href: '/dashboard/locations', icon: MapPinIcon },
  ],
  finance: [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Clients', href: '/dashboard/clients', icon: BuildingIcon },
    { name: 'Invoices', href: '/dashboard/invoices', icon: DocumentIcon },
    { name: 'Vendors', href: '/dashboard/vendors', icon: SupplierIcon },
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
  { name: 'KPIs', href: '/dashboard/kpis', icon: ChartBarIcon },
  { name: 'Employees', href: '/dashboard/employees', icon: UsersIcon },
  { name: 'Leaves', href: '/dashboard/leaves', icon: CalendarIcon },
  { name: 'Referrals', href: '/dashboard/referrals', icon: UserGroupIcon },
  { name: 'Shifts', href: '/dashboard/shifts', icon: ClockIcon },
  { name: 'Orders', href: '/dashboard/orders', icon: ClipboardListIcon },
  { name: 'Documents', href: '/dashboard/documents', icon: FolderIcon },
  { name: 'Coaching', href: '/dashboard/coaching', icon: ClipboardIcon },
  { name: 'Performance Management', href: '/dashboard/performance', icon: ShieldIcon },
  { name: 'Training', href: '/dashboard/training', icon: AcademicCapIcon },
  { name: 'Assets', href: '/dashboard/assets', icon: TruckIcon },
  { name: 'Locations', href: '/dashboard/locations', icon: MapPinIcon },
  { name: 'Clients', href: '/dashboard/clients', icon: BuildingIcon },
  { name: 'Invoices', href: '/dashboard/invoices', icon: DocumentIcon },
  { name: 'Vendors', href: '/dashboard/vendors', icon: SupplierIcon },
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
 * Supports collapse to icon-only mode (persisted in localStorage).
 */
export function Sidebar({ organizationName, organizationLogo }: SidebarProps) {
  const pathname = usePathname();
  const role = useDevRole();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Enable dev tools in development or when env var is set
  const devToolsEnabled = process.env.NODE_ENV === 'development' || 
    process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === 'true';

  // Get navigation based on role
  const navigation = devToolsEnabled && role
    ? roleNavigation[role] || defaultNavigation
    : defaultNavigation;

  // Load collapse state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') setIsCollapsed(true);
  }, []);

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

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('sidebar-collapsed', next.toString());
  };

  return (
    <aside className={`flex h-full flex-col border-r border-border bg-card transition-all duration-200 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo + collapse toggle */}
      <div className={`flex h-16 items-center border-b border-border ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        {!isCollapsed && (
          <div className="flex items-center min-w-0 flex-1 mr-2">
            {organizationLogo ? (
              <Image
                src={organizationLogo}
                alt={organizationName || 'Logo'}
                width={120}
                height={40}
                className="max-h-10 w-auto max-w-full object-contain"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white font-bold text-base">
                {organizationName?.charAt(0).toUpperCase() || 'E'}
              </div>
            )}
          </div>
        )}
        {isCollapsed && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white font-bold text-base">
            {organizationName?.charAt(0).toUpperCase() || 'E'}
          </div>
        )}
        <button
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-heading transition-colors ${isCollapsed ? 'mt-2 absolute top-4 right-[-16px] z-10 bg-card border border-border shadow-sm' : ''}`}
        >
          <ChevronDoubleLeftIcon className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {navigation.map((item) => {
          if (isNavSection(item)) {
            const isExpanded = expandedSections.includes(item.name);
            const hasActiveItem = item.items.some(
              navItem => pathname === navItem.href || pathname.startsWith(navItem.href + '/')
            );

            if (isCollapsed) {
              // Collapsed mode: show section icon only, still toggleable
              return (
                <div key={item.name}>
                  <button
                    onClick={() => toggleSection(item.name)}
                    title={item.name}
                    className={`w-full flex items-center justify-center rounded-lg p-2 transition-colors ${
                      hasActiveItem ? 'bg-primary-light text-primary' : 'text-body hover:bg-hover hover:text-heading'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                  </button>
                  {isExpanded && (
                    <div className="mt-1 space-y-1">
                      {item.items.map((subItem) => {
                        const isActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/');
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            title={subItem.name}
                            className={`flex items-center justify-center rounded-lg p-2 text-sm transition-colors ${
                              isActive ? 'bg-primary-light text-primary' : 'text-body hover:bg-hover hover:text-heading'
                            }`}
                          >
                            <subItem.icon className="h-4 w-4" />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

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

          if (isCollapsed) {
            return (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                className={`flex items-center justify-center rounded-lg p-2 transition-colors ${
                  isActive ? 'bg-primary-light text-primary' : 'text-body hover:bg-hover hover:text-heading'
                }`}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            );
          }

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
      <div className="border-t border-border p-2">
        <Link
          href="/dashboard/settings"
          title="Settings"
          className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium text-body hover:bg-hover ${
            isCollapsed ? 'justify-center px-2' : 'gap-3'
          }`}
        >
          <SettingsIcon className="h-5 w-5 shrink-0" />
          {!isCollapsed && 'Settings'}
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

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
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

function ChevronDoubleLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
    </svg>
  );
}

function SupplierIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
    </svg>
  );
}

function AcademicCapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  );
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function BikeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 18a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM18.5 18a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM5.5 14.5l4-7.5h5l2 4h2M9.5 7l2 4M12 14.5h3.5" />
    </svg>
  );
}

function ClipboardListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zm6.75 12l-3-3m0 0l-3 3m3-3v6" />
    </svg>
  );
}
