'use client';

import { useQuery, useMutation, applyPagination } from '@/lib/supabase/hooks';
import type { PaginationParams, PaginatedResult } from '@/lib/supabase/hooks';
import type { Attendance, AttendanceStatus } from './types';

// ============================================================================
// ATTENDANCE HOOKS
// ============================================================================

export interface AttendanceFilters {
  employee_id?: string;
  platform_id?: string;
  status?: AttendanceStatus;
  date?: string;
  date_from?: string;
  date_to?: string;
  requires_approval?: boolean;
}

/**
 * Fetch attendance records with filters
 */
export function useAttendance(filters?: AttendanceFilters, pagination?: PaginationParams) {
  return useQuery<PaginatedResult<Attendance>>(
    async (supabase) => {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          employee:employees(id, full_name, employee_number),
          client:clients(id, name),
          shift:shifts(id, shift_date, start_time, end_time)
        `, { count: 'exact' });

      if (filters?.employee_id) {
        query = query.eq('employee_id', filters.employee_id);
      }
      if (filters?.platform_id) {
        query = query.eq('platform_id', filters.platform_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.date) {
        query = query.eq('attendance_date', filters.date);
      }
      if (filters?.date_from) {
        query = query.gte('attendance_date', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('attendance_date', filters.date_to);
      }
      if (filters?.requires_approval !== undefined) {
        query = query.eq('requires_approval', filters.requires_approval);
      }

      query = query.order('attendance_date', { ascending: false }).order('check_in_time', { ascending: false });

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
 * Fetch today's attendance
 */
export function useTodayAttendance() {
  const today = new Date().toISOString().split('T')[0];
  return useAttendance({ date: today });
}

/**
 * Fetch attendance pending approval
 */
export function usePendingApprovalAttendance() {
  return useAttendance({ requires_approval: true, status: 'checked_out' });
}

/**
 * Fetch employee's attendance history
 */
export function useEmployeeAttendance(employeeId: string | null, dateFrom?: string, dateTo?: string) {
  return useQuery<Attendance[]>(
    async (supabase) => {
      if (!employeeId) return { data: null, error: null };

      let query = supabase
        .from('attendance')
        .select(`
          *,
          client:clients(id, name)
        `)
        .eq('employee_id', employeeId);

      if (dateFrom) {
        query = query.gte('attendance_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('attendance_date', dateTo);
      }

      query = query.order('attendance_date', { ascending: false });

      const { data, error } = await query;
      return { data, error };
    },
    [employeeId, dateFrom, dateTo]
  );
}

/**
 * Fetch attendance summary for a date range
 */
export function useAttendanceSummary(dateFrom: string, dateTo: string) {
  return useQuery<{
    total_records: number;
    checked_in: number;
    checked_out: number;
    no_show: number;
    late: number;
    pending_approval: number;
  }>(
    async (supabase) => {
      const { data, error } = await supabase
        .from('attendance')
        .select('status, requires_approval, late_minutes')
        .gte('attendance_date', dateFrom)
        .lte('attendance_date', dateTo);

      if (error) return { data: null, error };

      const summary = {
        total_records: data?.length || 0,
        checked_in: data?.filter(a => a.status === 'checked_in').length || 0,
        checked_out: data?.filter(a => a.status === 'checked_out').length || 0,
        no_show: data?.filter(a => a.status === 'no_show').length || 0,
        late: data?.filter(a => (a.late_minutes || 0) > 0).length || 0,
        pending_approval: data?.filter(a => a.requires_approval).length || 0,
      };

      return { data: summary, error: null };
    },
    [dateFrom, dateTo]
  );
}

/**
 * Check if employee is currently checked in
 */
export function useIsCheckedIn(employeeId: string | null) {
  return useQuery<{ isCheckedIn: boolean; attendance: Attendance | null }>(
    async (supabase) => {
      if (!employeeId) return { data: { isCheckedIn: false, attendance: null }, error: null };

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('attendance_date', today)
        .eq('status', 'checked_in')
        .maybeSingle();

      return {
        data: {
          isCheckedIn: !!data,
          attendance: data,
        },
        error,
      };
    },
    [employeeId]
  );
}

// ============================================================================
// MUTATIONS
// ============================================================================

export interface CheckInInput {
  employee_id: string;
  shift_id?: string;
  platform_id?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
  check_in_method?: string;
}

/**
 * Check in an employee
 */
export function useCheckIn() {
  return useMutation<Attendance, CheckInInput>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          ...input,
          attendance_date: new Date().toISOString().split('T')[0],
          check_in_time: new Date().toISOString(),
          status: 'checked_in',
        })
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Check out an employee
 */
export function useCheckOut() {
  return useMutation<Attendance, {
    id: string;
    check_out_latitude?: number;
    check_out_longitude?: number;
  }>(
    async (supabase, { id, check_out_latitude, check_out_longitude }) => {
      // First get the check-in time to calculate hours
      const { data: attendance } = await supabase
        .from('attendance')
        .select('check_in_time')
        .eq('id', id)
        .single();

      const checkOutTime = new Date();
      const checkInTime = attendance?.check_in_time ? new Date(attendance.check_in_time) : checkOutTime;
      const workedHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      const { data, error } = await supabase
        .from('attendance')
        .update({
          status: 'checked_out',
          check_out_time: checkOutTime.toISOString(),
          check_out_latitude,
          check_out_longitude,
          worked_hours: Math.round(workedHours * 100) / 100,
          updated_at: checkOutTime.toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Approve attendance
 */
export function useApproveAttendance() {
  return useMutation<Attendance, { id: string; approved_by: string }>(
    async (supabase, { id, approved_by }) => {
      const { data, error } = await supabase
        .from('attendance')
        .update({
          status: 'approved',
          requires_approval: false,
          approved_by,
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
 * Mark as no-show
 */
export function useMarkNoShow() {
  return useMutation<Attendance, { employee_id: string; date: string; shift_id?: string }>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          employee_id: input.employee_id,
          attendance_date: input.date,
          shift_id: input.shift_id,
          status: 'no_show',
        })
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Dispute attendance
 */
export function useDisputeAttendance() {
  return useMutation<Attendance, { id: string; dispute_reason: string }>(
    async (supabase, { id, dispute_reason }) => {
      const { data, error } = await supabase
        .from('attendance')
        .update({
          status: 'disputed',
          requires_approval: true,
          notes: dispute_reason,
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
 * Bulk approve attendance
 */
export function useBulkApproveAttendance() {
  return useMutation<number, { ids: string[]; approved_by: string }>(
    async (supabase, { ids, approved_by }) => {
      const { error, count } = await supabase
        .from('attendance')
        .update({
          status: 'approved',
          requires_approval: false,
          approved_by,
          updated_at: new Date().toISOString(),
        })
        .in('id', ids);

      return { data: count || 0, error };
    }
  );
}
