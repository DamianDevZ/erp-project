'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface Client {
  id: string;
  name: string;
  code?: string;
  status: string;
  area?: string;
}

interface ClientContextValue {
  /** All clients the user is assigned to */
  assignedClients: Client[];
  /** All clients in the organization (for admins) */
  allClients: Client[];
  /** Currently selected client IDs for filtering (empty = all clients) */
  selectedClientIds: string[];
  /** Whether to show all clients (admin mode) */
  showAllClients: boolean;
  /** Whether the user can see all clients (admin/manager role) */
  canViewAllClients: boolean;
  /** Loading state */
  loading: boolean;
  /** Set selected client IDs */
  setSelectedClientIds: (ids: string[]) => void;
  /** Toggle showing all clients */
  setShowAllClients: (show: boolean) => void;
  /** Get filter clause for queries (returns client IDs to filter by, or null for all) */
  getClientFilter: () => string[] | null;
  /** A key that changes when selection changes - use as dependency for re-fetching */
  filterKey: string;
  /** Refresh client assignments */
  refresh: () => Promise<void>;
}

const ClientContext = createContext<ClientContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface ClientProviderProps {
  children: ReactNode;
  /** User's role from user_profiles */
  userRole?: string;
  /** User's employee_id from user_profiles (if linked) */
  employeeId?: string | null;
  /** Organization ID */
  organizationId?: string;
}

export function ClientProvider({ 
  children, 
  userRole, 
  employeeId,
  organizationId 
}: ClientProviderProps) {
  const [assignedClients, setAssignedClients] = useState<Client[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [showAllClients, setShowAllClients] = useState(false);
  const [loading, setLoading] = useState(true);

  // Admins and managers can view all clients (case-insensitive check)
  const normalizedRole = userRole?.toLowerCase() || '';
  const canViewAllClients = ['admin', 'administrator', 'manager', 'super_admin', 'owner'].includes(normalizedRole);

  const fetchClients = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      // If user has an employee_id, fetch their client assignments
      if (employeeId) {
        const { data: assignments } = await supabase
          .from('client_assignments')
          .select(`
            client_id,
            client:clients(id, name, code, status, area)
          `)
          .eq('employee_id', employeeId)
          .eq('status', 'active');

        const clients = assignments
          ?.map(a => a.client as unknown as Client)
          .filter(Boolean) || [];
        
        setAssignedClients(clients);
      }

      // If user can view all, also fetch all active clients
      if (canViewAllClients) {
        const { data: clientsData, error: clientError } = await supabase
          .from('clients')
          .select('id, name, billing_rate_type, is_active, city')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('name');

        if (clientError) {
          console.error('Error fetching clients:', clientError);
        }

        // Map to Client interface
        const clients: Client[] = (clientsData || []).map(c => ({
          id: c.id,
          name: c.name,
          code: c.billing_rate_type,
          status: 'active',
          area: c.city || undefined,
        }));

        setAllClients(clients);
        
        // If no employee assignments AND no stored preference, default to showing all
        if (!employeeId && typeof window !== 'undefined') {
          const hasStoredPreference = localStorage.getItem('erp_show_all_clients') !== null;
          if (!hasStoredPreference) {
            setShowAllClients(true);
            localStorage.setItem('erp_show_all_clients', 'true');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  }, [employeeId, organizationId, canViewAllClients]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Restore selection from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedIds = localStorage.getItem('erp_selected_clients');
      const storedShowAll = localStorage.getItem('erp_show_all_clients');
      
      if (storedIds) {
        try {
          const ids = JSON.parse(storedIds);
          if (Array.isArray(ids)) {
            setSelectedClientIds(ids);
          }
        } catch {}
      }
      
      if (storedShowAll !== null) {
        setShowAllClients(storedShowAll === 'true');
      }
    }
  }, []);

  const handleSetSelectedClientIds = (ids: string[]) => {
    setSelectedClientIds(ids);
    if (typeof window !== 'undefined') {
      localStorage.setItem('erp_selected_clients', JSON.stringify(ids));
    }
  };
  
  const handleSetShowAllClients = (show: boolean) => {
    setShowAllClients(show);
    if (typeof window !== 'undefined') {
      localStorage.setItem('erp_show_all_clients', String(show));
    }
  };

  // Get the list of client IDs to filter by
  const getClientFilter = useCallback((): string[] | null => {
    // Explicitly showing all clients = no filter
    if (showAllClients) {
      return null;
    }

    // If specific clients selected, use those
    if (selectedClientIds.length > 0) {
      return selectedClientIds;
    }

    // No selection = return empty array (show nothing)
    // Users must explicitly select clients or choose "All Clients"
    return [];
  }, [showAllClients, selectedClientIds]);

  // Generate a key that changes when filter changes - use in query deps
  const filterKey = useMemo(() => {
    const filter = getClientFilter();
    return filter === null ? 'all' : filter.sort().join(',');
  }, [getClientFilter]);

  const value: ClientContextValue = {
    assignedClients,
    allClients,
    selectedClientIds,
    showAllClients,
    canViewAllClients,
    loading,
    setSelectedClientIds: handleSetSelectedClientIds,
    setShowAllClients: handleSetShowAllClients,
    getClientFilter,
    filterKey,
    refresh: fetchClients,
  };

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useClientContext() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClientContext must be used within a ClientProvider');
  }
  return context;
}

// Optional hook that doesn't throw (for components that may be outside provider)
export function useOptionalClientContext() {
  return useContext(ClientContext);
}
