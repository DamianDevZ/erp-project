'use client';

import { useQuery, useMutation, applyPagination } from '@/lib/supabase/hooks';
import type { PaginationParams, PaginatedResult } from '@/lib/supabase/hooks';
import type { Shift, ShiftAssignment, ShiftStatus } from './types';

// ============================================================================
// SHIFT HOOKS
// ============================================================================

export interface ShiftFilters {
  client_id?: string;
  clientIds?: string[] | null;
  status?: ShiftStatus;
  date?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Fetch shifts with filters
 */
export function useShifts(filters?: ShiftFilters, pagination?: PaginationParams) {
  return useQuery<PaginatedResult<Shift>>(
    async (supabase) => {
      let query = supabase
        .from('shifts')
        .select(`
          *,
          client:clients(id, name),
          created_by_user:user_profiles(id, full_name)
        `, { count: 'exact' });

      // Filter by client IDs (from header selector)
      if (filters?.clientIds && filters.clientIds.length > 0) {
        query = query.in('client_id', filters.clientIds);
      }
      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.date) {
        query = query.eq('shift_date', filters.date);
      }
      if (filters?.date_from) {
        query = query.gte('shift_date', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('shift_date', filters.date_to);
      }

      query = query.order('shift_date', { ascending: false }).order('start_time');

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
    [JSON.stringify(filters), pagination?.page, pagination?.pageSize]
  );
}

/**
 * Fetch today's shifts
 */
export function useTodayShifts() {
  const today = new Date().toISOString().split('T')[0];
  return useShifts({ date: today });
}

/**
 * Fetch a single shift
 */
export function useShift(id: string | null) {
  return useQuery<Shift>(
    async (supabase) => {
      if (!id) return { data: null, error: null };

      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          client:clients(id, name),
          assignments:shift_assignments(
            id,
            employee:employees(id, full_name, employee_number),
            status
          )
        `)
        .eq('id', id)
        .single();

      return { data, error };
    },
    [id]
  );
}

/**
 * Fetch shift assignments
 */
export function useShiftAssignments(shiftId: string | null) {
  return useQuery<ShiftAssignment[]>(
    async (supabase) => {
      if (!shiftId) return { data: null, error: null };

      const { data, error } = await supabase
        .from('shift_assignments')
        .select(`
          *,
          employee:employees(id, full_name, employee_number, phone),
          vehicle:assets(id, name, license_plate)
        `)
        .eq('shift_id', shiftId)
        .order('created_at');

      return { data, error };
    },
    [shiftId]
  );
}

/**
 * Fetch employee's shifts for a date range
 */
export function useEmployeeShifts(employeeId: string | null, dateFrom?: string, dateTo?: string) {
  return useQuery<ShiftAssignment[]>(
    async (supabase) => {
      if (!employeeId) return { data: null, error: null };

      let query = supabase
        .from('shift_assignments')
        .select(`
          *,
          shift:shifts(id, shift_date, start_time, end_time, platform:platforms(name))
        `)
        .eq('employee_id', employeeId);

      if (dateFrom) {
        query = query.gte('shift.shift_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('shift.shift_date', dateTo);
      }

      query = query.order('shift.shift_date', { ascending: false });

      const { data, error } = await query;
      return { data, error };
    },
    [employeeId, dateFrom, dateTo]
  );
}

// ============================================================================
// MUTATIONS
// ============================================================================

export interface CreateShiftInput {
  platform_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  required_riders?: number;
  zone?: string;
  notes?: string;
}

/**
 * Create a new shift
 */
export function useCreateShift() {
  return useMutation<Shift, CreateShiftInput>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('shifts')
        .insert({ ...input, status: 'draft' })
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Update a shift
 */
export function useUpdateShift() {
  return useMutation<Shift, Partial<CreateShiftInput> & { id: string }>(
    async (supabase, { id, ...input }) => {
      const { data, error } = await supabase
        .from('shifts')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Publish a shift (make it visible to riders)
 */
export function usePublishShift() {
  return useMutation<Shift, string>(
    async (supabase, id) => {
      const { data, error } = await supabase
        .from('shifts')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Assign employee to shift
 */
export function useAssignToShift() {
  return useMutation<ShiftAssignment, {
    shift_id: string;
    employee_id: string;
    vehicle_id?: string;
  }>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('shift_assignments')
        .insert({ ...input, status: 'assigned' })
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Remove employee from shift
 */
export function useRemoveFromShift() {
  return useMutation<null, string>(
    async (supabase, assignmentId) => {
      const { error } = await supabase
        .from('shift_assignments')
        .delete()
        .eq('id', assignmentId);

      return { data: null, error };
    }
  );
}

/**
 * Bulk assign employees to shift
 */
export function useBulkAssignToShift() {
  return useMutation<ShiftAssignment[], { shift_id: string; employee_ids: string[] }>(
    async (supabase, { shift_id, employee_ids }) => {
      const assignments = employee_ids.map(employee_id => ({
        shift_id,
        employee_id,
        status: 'assigned',
      }));

      const { data, error } = await supabase
        .from('shift_assignments')
        .insert(assignments)
        .select();

      return { data, error };
    }
  );
}

/**
 * Cancel a shift
 */
export function useCancelShift() {
  return useMutation<Shift, { id: string; reason?: string }>(
    async (supabase, { id, reason }) => {
      const { data, error } = await supabase
        .from('shifts')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}
