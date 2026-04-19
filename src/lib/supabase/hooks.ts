'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface QueryState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
}

export interface MutationState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type SortDirection = 'asc' | 'desc';

export interface SortParams {
  column: string;
  direction: SortDirection;
}

// ============================================================================
// BASE HOOKS
// ============================================================================

/**
 * Get the Supabase client instance
 */
export function useSupabase(): SupabaseClient {
  return createClient();
}

/**
 * Get the current user's organization ID
 */
export function useOrganizationId() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useSupabase();

  useEffect(() => {
    async function fetchOrgId() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setOrganizationId(null);
          return;
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        setOrganizationId(profile?.organization_id || null);
      } catch {
        setOrganizationId(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrgId();
  }, [supabase]);

  return { organizationId, isLoading };
}

/**
 * Generic query hook for fetching data
 */
export function useQuery<T>(
  queryFn: (supabase: SupabaseClient) => Promise<{ data: T | null; error: Error | null }>,
  deps: unknown[] = []
): QueryState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    error: null,
    isLoading: true,
    isError: false,
  });
  const supabase = useSupabase();

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const { data, error } = await queryFn(supabase);
      if (error) throw error;
      setState({ data, error: null, isLoading: false, isError: false });
    } catch (error) {
      setState({
        data: null,
        error: error as Error,
        isLoading: false,
        isError: true,
      });
    }
  }, [supabase, ...deps]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, refetch: fetch };
}

/**
 * Generic mutation hook for creating/updating/deleting data
 */
export function useMutation<TData, TVariables>(
  mutationFn: (supabase: SupabaseClient, variables: TVariables) => Promise<{ data: TData | null; error: Error | null }>
): MutationState<TData> & {
  mutate: (variables: TVariables) => Promise<TData | null>;
  reset: () => void;
} {
  const [state, setState] = useState<MutationState<TData>>({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
  });
  const supabase = useSupabase();

  const mutate = useCallback(async (variables: TVariables) => {
    setState(prev => ({ ...prev, isLoading: true, isError: false, isSuccess: false }));
    try {
      const { data, error } = await mutationFn(supabase, variables);
      if (error) throw error;
      setState({ data, error: null, isLoading: false, isError: false, isSuccess: true });
      return data;
    } catch (error) {
      setState({
        data: null,
        error: error as Error,
        isLoading: false,
        isError: true,
        isSuccess: false,
      });
      return null;
    }
  }, [supabase, mutationFn]);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
    });
  }, []);

  return { ...state, mutate, reset };
}

/**
 * Hook for real-time subscriptions
 */
export function useRealtimeSubscription<T>(
  table: string,
  filter?: { column: string; value: string },
  onInsert?: (payload: T) => void,
  onUpdate?: (payload: T) => void,
  onDelete?: (payload: { old: T }) => void
) {
  const supabase = useSupabase();

  useEffect(() => {
    let channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter && { filter: `${filter.column}=eq.${filter.value}` }),
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && onInsert) {
            onInsert(payload.new as T);
          } else if (payload.eventType === 'UPDATE' && onUpdate) {
            onUpdate(payload.new as T);
          } else if (payload.eventType === 'DELETE' && onDelete) {
            onDelete({ old: payload.old as T });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, table, filter?.column, filter?.value, onInsert, onUpdate, onDelete]);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Build a paginated query
 */
export function applyPagination<T>(
  query: T,
  params?: PaginationParams
): T {
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // @ts-expect-error - query builder types
  return query.range(from, to);
}

/**
 * Build a sorted query
 */
export function applySort<T>(
  query: T,
  sort?: SortParams
): T {
  if (!sort) return query;

  // @ts-expect-error - query builder types
  return query.order(sort.column, { ascending: sort.direction === 'asc' });
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  count: number,
  page: number = 1,
  pageSize: number = 20
): { totalPages: number; hasNext: boolean; hasPrev: boolean } {
  const totalPages = Math.ceil(count / pageSize);
  return {
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
