'use client';

import { useState, useRef, useEffect } from 'react';
import { useOptionalClientContext } from '@/contexts';

/**
 * Client selector dropdown for the header.
 * Allows users to filter the dashboard by their assigned clients.
 * Admins can see and filter by all clients in the organization.
 */
export function ClientSelector() {
  const context = useOptionalClientContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // If no context, don't show
  if (!context) {
    return null;
  }

  // Show loading state
  if (context.loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-muted">
        <BuildingIcon className="h-4 w-4 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  const { 
    assignedClients,
    allClients,
    selectedClientIds, 
    setSelectedClientIds,
    showAllClients,
    setShowAllClients,
    canViewAllClients 
  } = context;

  // Available clients to select from - admins see all, others see assigned
  const availableClients = canViewAllClients ? allClients : assignedClients;

  // If not admin and only one or no clients, don't show selector
  if (!canViewAllClients && assignedClients.length <= 1) {
    return null;
  }

  // Display text
  const getDisplayText = () => {
    if (showAllClients) {
      return 'All Clients';
    }
    if (selectedClientIds.length === 0) {
      return 'No Selection';
    }
    if (selectedClientIds.length === 1) {
      const client = availableClients.find(c => c.id === selectedClientIds[0]);
      return client?.name || 'Client';
    }
    return `${selectedClientIds.length} Selected`;
  };

  const handleToggleClient = (clientId: string) => {
    setShowAllClients(false);
    if (selectedClientIds.includes(clientId)) {
      setSelectedClientIds(selectedClientIds.filter(id => id !== clientId));
    } else {
      setSelectedClientIds([...selectedClientIds, clientId]);
    }
  };

  const handleSelectAll = () => {
    setShowAllClients(true);
    setSelectedClientIds([]);
  };

  const handleSelectNone = () => {
    setShowAllClients(false);
    setSelectedClientIds([]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-border bg-input px-3 py-1.5 text-sm hover:bg-hover transition-colors"
      >
        <BuildingIcon className="h-4 w-4 text-muted" />
        <span className="max-w-[150px] truncate text-heading">{getDisplayText()}</span>
        <ChevronDownIcon className={`h-4 w-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border border-border bg-card shadow-lg">
          <div className="p-2">
            <p className="px-2 py-1 text-xs font-medium text-muted uppercase tracking-wider">
              Filter by Client
            </p>
          </div>

          <div className="border-t border-border max-h-80 overflow-y-auto">
            {/* All Clients option for admins */}
            {canViewAllClients && (
              <button
                onClick={handleSelectAll}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover transition-colors ${
                  showAllClients ? 'bg-primary/10 text-primary' : 'text-body'
                }`}
              >
                <span className={`h-4 w-4 rounded border flex items-center justify-center ${
                  showAllClients ? 'bg-primary border-primary text-white' : 'border-border'
                }`}>
                  {showAllClients && <CheckIcon className="h-3 w-3" />}
                </span>
                <span className="font-medium">All Clients ({availableClients.length})</span>
              </button>
            )}

            {/* Divider */}
            {canViewAllClients && availableClients.length > 0 && (
              <div className="border-t border-border my-1" />
            )}

            {/* Individual clients */}
            {availableClients.map((client) => {
              const isSelected = selectedClientIds.includes(client.id);
              return (
                <button
                  key={client.id}
                  onClick={() => handleToggleClient(client.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover transition-colors ${
                    isSelected ? 'bg-primary/10 text-primary' : 'text-body'
                  }`}
                >
                  <span className={`h-4 w-4 rounded border flex items-center justify-center ${
                    isSelected ? 'bg-primary border-primary text-white' : 'border-border'
                  }`}>
                    {isSelected && <CheckIcon className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{client.name}</span>
                  {client.area && (
                    <span className="text-xs text-muted ml-auto">{client.area}</span>
                  )}
                </button>
              );
            })}

            {availableClients.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted text-center">
                No clients available
              </p>
            )}
          </div>

          {/* Footer actions */}
          <div className="border-t border-border p-2">
            {selectedClientIds.length > 0 && !showAllClients ? (
              <button
                onClick={handleSelectNone}
                className="w-full px-3 py-1.5 text-sm text-muted hover:text-body transition-colors"
              >
                Clear selection
              </button>
            ) : !showAllClients && selectedClientIds.length === 0 ? (
              <p className="px-3 py-1.5 text-xs text-muted text-center">
                Select clients to filter data
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
