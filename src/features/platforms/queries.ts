'use client';

import { useQuery, useMutation, applyPagination, applySort } from '@/lib/supabase/hooks';
import type { PaginationParams, SortParams, PaginatedResult } from '@/lib/supabase/hooks';
import type { Platform, PlatformAssignment } from './types';

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface PlatformFilters {
  is_active?: boolean;
  integration_status?: string;
  search?: string;
}

/**
 * Fetch paginated list of platforms with filters
 */
export function usePlatforms(
  filters?: PlatformFilters,
  pagination?: PaginationParams,
  sort?: SortParams
) {
  return useQuery<PaginatedResult<Platform>>(
    async (supabase) => {
      let query = supabase
        .from('platforms')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters?.integration_status) {
        query = query.eq('integration_status', filters.integration_status);
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      // Apply sorting
      query = applySort(query, sort || { column: 'name', direction: 'asc' });

      // Apply pagination
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      query = applyPagination(query, pagination);

      const { data, error, count } = await query;

      if (error) return { data: null, error };

      return {
        data: {
          data: data || [],
          count: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize),
        },
        error: null,
      };
    },
    [JSON.stringify(filters), pagination?.page, pagination?.pageSize, sort?.column, sort?.direction]
  );
}

/**
 * Fetch a single platform by ID
 */
export function usePlatform(id: string | null) {
  return useQuery<Platform>(
    async (supabase) => {
      if (!id) return { data: null, error: null };

      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .eq('id', id)
        .single();

      return { data, error };
    },
    [id]
  );
}

/**
 * Fetch active platforms for dropdown
 */
export function usePlatformOptions() {
  return useQuery<{ id: string; name: string }[]>(
    async (supabase) => {
      const { data, error } = await supabase
        .from('platforms')
        .select('id, name')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');

      return { data, error };
    },
    []
  );
}

// ============================================================================
// ASSIGNMENT HOOKS
// ============================================================================

/**
 * Fetch assignments for a platform
 */
export function usePlatformAssignments(platformId: string | null) {
  return useQuery<PlatformAssignment[]>(
    async (supabase) => {
      if (!platformId) return { data: null, error: null };

      const { data, error } = await supabase
        .from('platform_assignments')
        .select(`
          *,
          employee:employees(id, full_name, employee_number)
        `)
        .eq('platform_id', platformId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      return { data, error };
    },
    [platformId]
  );
}

/**
 * Fetch assignments for an employee
 */
export function useEmployeePlatformAssignments(employeeId: string | null) {
  return useQuery<PlatformAssignment[]>(
    async (supabase) => {
      if (!employeeId) return { data: null, error: null };

      const { data, error } = await supabase
        .from('platform_assignments')
        .select(`
          *,
          platform:platforms(id, name)
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      return { data, error };
    },
    [employeeId]
  );
}

/**
 * Fetch platform stats
 */
export function usePlatformStats(platformId: string | null) {
  return useQuery<{
    active_riders: number;
    total_orders_this_month: number;
    revenue_this_month: number;
  }>(
    async (supabase) => {
      if (!platformId) return { data: null, error: null };

      // Get active rider count
      const { count: activeRiders } = await supabase
        .from('platform_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('platform_id', platformId)
        .eq('status', 'active');

      // Get orders this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_revenue')
        .eq('platform_id', platformId)
        .gte('order_date', startOfMonth.toISOString().split('T')[0]);

      const totalOrders = ordersData?.length || 0;
      const totalRevenue = ordersData?.reduce((sum, o) => sum + (o.total_revenue || 0), 0) || 0;

      return {
        data: {
          active_riders: activeRiders || 0,
          total_orders_this_month: totalOrders,
          revenue_this_month: totalRevenue,
        },
        error: null,
      };
    },
    [platformId]
  );
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export interface CreatePlatformInput {
  name: string;
  contact_email?: string;
  contact_phone?: string;
  billing_rate_type?: string;
  billing_rate?: number;
  commission_rate?: number;
  payment_terms?: string;
}

export interface UpdatePlatformInput extends Partial<CreatePlatformInput> {
  id: string;
}

/**
 * Create a new platform
 */
export function useCreatePlatform() {
  return useMutation<Platform, CreatePlatformInput>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('platforms')
        .insert({ ...input, is_active: true })
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Update an existing platform
 */
export function useUpdatePlatform() {
  return useMutation<Platform, UpdatePlatformInput>(
    async (supabase, { id, ...input }) => {
      const { data, error } = await supabase
        .from('platforms')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Assign employee to platform
 */
export function useAssignToPlatform() {
  return useMutation<PlatformAssignment, {
    employee_id: string;
    platform_id: string;
    external_id?: string;
    start_date?: string;
  }>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('platform_assignments')
        .insert({
          ...input,
          status: 'active',
          start_date: input.start_date || new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * End platform assignment
 */
export function useEndPlatformAssignment() {
  return useMutation<PlatformAssignment, { id: string; end_date?: string }>(
    async (supabase, { id, end_date }) => {
      const { data, error } = await supabase
        .from('platform_assignments')
        .update({
          status: 'ended',
          end_date: end_date || new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Deactivate platform
 */
export function useDeactivatePlatform() {
  return useMutation<Platform, string>(
    async (supabase, id) => {
      const { data, error } = await supabase
        .from('platforms')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}
