'use client';

import { useQuery, useMutation, applyPagination } from '@/lib/supabase/hooks';
import type { PaginationParams, PaginatedResult } from '@/lib/supabase/hooks';
import type { Payroll, PayrollStatus, PayrollBatch, PayrollDeduction } from './types';

// ============================================================================
// PAYROLL HOOKS
// ============================================================================

export interface PayrollFilters {
  employee_id?: string;
  status?: PayrollStatus;
  period_start?: string;
  period_end?: string;
  batch_id?: string;
}

/**
 * Fetch payroll records with filters
 */
export function usePayrolls(filters?: PayrollFilters, pagination?: PaginationParams) {
  return useQuery<PaginatedResult<Payroll>>(
    async (supabase) => {
      let query = supabase
        .from('payroll')
        .select(`
          *,
          employee:employees(id, full_name, employee_number, rider_category)
        `, { count: 'exact' });

      if (filters?.employee_id) {
        query = query.eq('employee_id', filters.employee_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.period_start) {
        query = query.gte('period_start', filters.period_start);
      }
      if (filters?.period_end) {
        query = query.lte('period_end', filters.period_end);
      }
      if (filters?.batch_id) {
        query = query.eq('batch_id', filters.batch_id);
      }

      query = query.order('period_start', { ascending: false });

      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 50;
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
 * Fetch a single payroll record
 */
export function usePayroll(id: string | null) {
  return useQuery<Payroll>(
    async (supabase) => {
      if (!id) return { data: null, error: null };

      const { data, error } = await supabase
        .from('payroll')
        .select(`
          *,
          employee:employees(id, full_name, employee_number, rider_category, bank_name, bank_account_number),
          deductions:payroll_deductions(*)
        `)
        .eq('id', id)
        .single();

      return { data, error };
    },
    [id]
  );
}

/**
 * Fetch employee's payroll history
 */
export function useEmployeePayrolls(employeeId: string | null) {
  return useQuery<Payroll[]>(
    async (supabase) => {
      if (!employeeId) return { data: null, error: null };

      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .eq('employee_id', employeeId)
        .order('period_start', { ascending: false });

      return { data, error };
    },
    [employeeId]
  );
}

/**
 * Fetch payroll summary for a period
 */
export function usePayrollSummary(periodStart: string, periodEnd: string) {
  return useQuery<{
    total_employees: number;
    total_gross: number;
    total_deductions: number;
    total_net: number;
    by_status: Record<PayrollStatus, number>;
    by_category: Record<string, { count: number; total: number }>;
  }>(
    async (supabase) => {
      const { data, error } = await supabase
        .from('payroll')
        .select('status, rider_category, gross_pay, total_deductions, net_pay')
        .gte('period_start', periodStart)
        .lte('period_end', periodEnd);

      if (error) return { data: null, error };

      const byStatus: Record<string, number> = {};
      const byCategory: Record<string, { count: number; total: number }> = {};

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      data?.forEach(p => {
        totalGross += p.gross_pay || 0;
        totalDeductions += p.total_deductions || 0;
        totalNet += p.net_pay || 0;

        byStatus[p.status] = (byStatus[p.status] || 0) + 1;

        if (p.rider_category) {
          if (!byCategory[p.rider_category]) {
            byCategory[p.rider_category] = { count: 0, total: 0 };
          }
          byCategory[p.rider_category].count++;
          byCategory[p.rider_category].total += p.net_pay || 0;
        }
      });

      return {
        data: {
          total_employees: data?.length || 0,
          total_gross: totalGross,
          total_deductions: totalDeductions,
          total_net: totalNet,
          by_status: byStatus as Record<PayrollStatus, number>,
          by_category: byCategory,
        },
        error: null,
      };
    },
    [periodStart, periodEnd]
  );
}

// ============================================================================
// BATCH HOOKS
// ============================================================================

/**
 * Fetch payroll batches
 */
export function usePayrollBatches(pagination?: PaginationParams) {
  return useQuery<PaginatedResult<PayrollBatch>>(
    async (supabase) => {
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;

      let query = supabase
        .from('payroll_batches')
        .select(`
          *,
          created_by_user:user_profiles!payroll_batches_created_by_fkey(id, full_name),
          approved_by_user:user_profiles!payroll_batches_approved_by_fkey(id, full_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

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
    [pagination?.page, pagination?.pageSize]
  );
}

/**
 * Fetch a single batch with payrolls
 */
export function usePayrollBatch(id: string | null) {
  return useQuery<PayrollBatch>(
    async (supabase) => {
      if (!id) return { data: null, error: null };

      const { data, error } = await supabase
        .from('payroll_batches')
        .select(`
          *,
          payrolls:payroll(
            id,
            employee:employees(id, full_name, employee_number),
            gross_pay,
            total_deductions,
            net_pay,
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

// ============================================================================
// DEDUCTION HOOKS
// ============================================================================

/**
 * Fetch deductions for a payroll
 */
export function usePayrollDeductions(payrollId: string | null) {
  return useQuery<PayrollDeduction[]>(
    async (supabase) => {
      if (!payrollId) return { data: null, error: null };

      const { data, error } = await supabase
        .from('payroll_deductions')
        .select('*')
        .eq('payroll_id', payrollId)
        .order('created_at');

      return { data, error };
    },
    [payrollId]
  );
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a payroll batch
 */
export function useCreatePayrollBatch() {
  return useMutation<PayrollBatch, {
    batch_name: string;
    period_start: string;
    period_end: string;
    payment_date: string;
  }>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('payroll_batches')
        .insert({ ...input, status: 'draft' })
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Calculate payroll for employees
 */
export function useCalculatePayroll() {
  return useMutation<Payroll[], {
    batch_id: string;
    employee_ids: string[];
    period_start: string;
    period_end: string;
  }>(
    async (supabase, { batch_id, employee_ids, period_start, period_end }) => {
      // This would typically call a database function
      const { data, error } = await supabase.rpc('calculate_payroll_batch', {
        p_batch_id: batch_id,
        p_employee_ids: employee_ids,
        p_period_start: period_start,
        p_period_end: period_end,
      });

      return { data, error };
    }
  );
}

/**
 * Update payroll status
 */
export function useUpdatePayrollStatus() {
  return useMutation<Payroll, { id: string; status: PayrollStatus }>(
    async (supabase, { id, status }) => {
      const { data, error } = await supabase
        .from('payroll')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Approve payroll batch
 */
export function useApprovePayrollBatch() {
  return useMutation<PayrollBatch, { id: string; approved_by: string }>(
    async (supabase, { id, approved_by }) => {
      const { data, error } = await supabase
        .from('payroll_batches')
        .update({
          status: 'approved',
          approved_by,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      // Also update all payrolls in batch
      if (!error) {
        await supabase
          .from('payroll')
          .update({ status: 'approved' })
          .eq('batch_id', id);
      }

      return { data, error };
    }
  );
}

/**
 * Add deduction to payroll
 */
export function useAddPayrollDeduction() {
  return useMutation<PayrollDeduction, {
    payroll_id: string;
    deduction_type: string;
    amount: number;
    description?: string;
  }>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('payroll_deductions')
        .insert(input)
        .select()
        .single();

      // Update total deductions on payroll
      if (!error && data) {
        const { data: payroll } = await supabase
          .from('payroll')
          .select('total_deductions, gross_pay')
          .eq('id', input.payroll_id)
          .single();

        if (payroll) {
          const newTotal = (payroll.total_deductions || 0) + input.amount;
          await supabase
            .from('payroll')
            .update({
              total_deductions: newTotal,
              net_pay: (payroll.gross_pay || 0) - newTotal,
            })
            .eq('id', input.payroll_id);
        }
      }

      return { data, error };
    }
  );
}

/**
 * Generate WPS file
 */
export function useGenerateWPSFile() {
  return useMutation<{ file_url: string }, string>(
    async (supabase, batchId) => {
      const { data, error } = await supabase.rpc('generate_wps_file', {
        p_batch_id: batchId,
      });

      return { data, error };
    }
  );
}

/**
 * Mark batch as paid
 */
export function useMarkBatchPaid() {
  return useMutation<PayrollBatch, { id: string; payment_reference?: string }>(
    async (supabase, { id, payment_reference }) => {
      const { data, error } = await supabase
        .from('payroll_batches')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_reference,
        })
        .eq('id', id)
        .select()
        .single();

      // Also update all payrolls in batch
      if (!error) {
        await supabase
          .from('payroll')
          .update({ status: 'paid' })
          .eq('batch_id', id);
      }

      return { data, error };
    }
  );
}
