'use client';

import { useState, useEffect } from 'react';

type DevRole = 'administrator' | 'operations' | 'finance' | 'hr' | 'rider';

const ROLES: { id: DevRole; label: string; color: string }[] = [
  { id: 'administrator', label: 'Administrator', color: 'bg-purple-500' },
  { id: 'operations', label: 'Operations', color: 'bg-blue-500' },
  { id: 'finance', label: 'Finance', color: 'bg-green-500' },
  { id: 'hr', label: 'HR', color: 'bg-orange-500' },
  { id: 'rider', label: 'Rider', color: 'bg-gray-500' },
];

/**
 * Development-only role switcher for testing different role views.
 * Appears as a floating toolbar in the bottom-right corner.
 */
export function RoleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<DevRole>('administrator');

  // Load saved role from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dev-role');
    if (saved && ROLES.some(r => r.id === saved)) {
      setCurrentRole(saved as DevRole);
    }
  }, []);

  // Save role to localStorage and trigger re-render
  const handleRoleChange = (role: DevRole) => {
    setCurrentRole(role);
    localStorage.setItem('dev-role', role);
    // Dispatch custom event for other components to react
    window.dispatchEvent(new CustomEvent('dev-role-change', { detail: role }));
    setIsOpen(false);
  };

  const currentRoleData = ROLES.find(r => r.id === currentRole)!;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Role selector dropdown */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-48 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border bg-background-subtle">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">
              Switch Role View
            </p>
          </div>
          <div className="p-1">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleChange(role.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  currentRole === role.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-heading hover:bg-hover'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${role.color}`} />
                {role.label}
                {currentRole === role.id && (
                  <svg className="ml-auto h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border border-border transition-all ${
          isOpen ? 'bg-primary text-white' : 'bg-card text-heading hover:bg-hover'
        }`}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${currentRoleData.color}`} />
        <span className="text-sm font-medium">{currentRoleData.label}</span>
        <svg 
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* DEV badge */}
      <div className="absolute -top-1 -left-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded">
        DEV
      </div>
    </div>
  );
}

/**
 * Hook to get & subscribe to the current dev role.
 */
export function useDevRole(): DevRole {
  const [role, setRole] = useState<DevRole>('administrator');

  useEffect(() => {
    // Load initial
    const saved = localStorage.getItem('dev-role');
    if (saved && ['administrator', 'operations', 'finance', 'hr', 'rider'].includes(saved)) {
      setRole(saved as DevRole);
    }

    // Listen for changes
    const handler = (e: CustomEvent<DevRole>) => setRole(e.detail);
    window.addEventListener('dev-role-change', handler as EventListener);
    return () => window.removeEventListener('dev-role-change', handler as EventListener);
  }, []);

  return role;
}
