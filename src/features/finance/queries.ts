'use client';

import { useQuery, useMutation, applyPagination } from '@/lib/supabase/hooks';
import type { PaginationParams, PaginatedResult } from '@/lib/supabase/hooks';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CodCollection {
  id: string;
  organization_id: string;
  employee_id: string;
  order_id?: string;
  platform_id?: string;
  amount: number;
  collected_at: string;
  remitted_at?: string;
  status: 'pending' | 'remitted' | 'discrepancy';
  notes?: string;
  employee?: { id: string; full_name: string };
  platform?: { id: string; name: string };
}

export interface PettyCash {
  id: string;
  organization_id: string;
  type: 'withdrawal' | 'deposit';
  amount: number;
  category: string;
  description: string;
  recipient?: string;
  approved_by?: string;
  receipt_url?: string;
  transaction_date: string;
  created_at: string;
}

export interface EmployeeAdvance {
  id: string;
  organization_id: string;
  employee_id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'repaid' | 'partial';
  approved_by?: string;
  approved_at?: string;
  disbursed_at?: string;
  repayment_method?: 'salary_deduction' | 'cash' | 'bank_transfer';
  repayment_schedule?: string;
  amount_repaid: number;
  notes?: string;
  employee?: { id: string; full_name: string };
}

export interface FinancialTransaction {
  id: string;
  organization_id: string;
  type: string;
  category: string;
  amount: number;
  direction: 'inflow' | 'outflow';
  reference_type?: string;
  reference_id?: string;
  description: string;
  transaction_date: string;
  created_at: string;
}

// ============================================================================
// COD COLLECTION HOOKS
// ============================================================================

export interface CodFilters {
  employee_id?: string;
  platform_id?: string;
  status?: 'pending' | 'remitted' | 'discrepancy';
  date_from?: string;
  date_to?: string;
}

/**
 * Fetch COD collections with filters
 */
export function useCodCollections(filters?: CodFilters, pagination?: PaginationParams) {
  return useQuery<PaginatedResult<CodCollection>>(
    async (supabase) => {
      let query = supabase
        .from('cod_collections')
        .select(`
          *,
          employee:employees(id, full_name),
          client:clients(id, name)
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
      if (filters?.date_from) {
        query = query.gte('collected_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('collected_at', filters.date_to);
      }

      query = query.order('collected_at', { ascending: false });

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
 * Fetch pending COD remittances
 */
export function usePendingCodRemittances() {
  return useQuery<CodCollection[]>(
    async (supabase) => {
      const { data, error } = await supabase
        .from('cod_collections')
        .select(`
          *,
          employee:employees(id, full_name),
          client:clients(id, name)
        `)
        .eq('status', 'pending')
        .order('collected_at');

      return { data, error };
    },
    []
  );
}

/**
 * Fetch COD summary stats
 */
export function useCodSummary(dateFrom?: string, dateTo?: string) {
  return useQuery<{
    total_collected: number;
    total_remitted: number;
    pending_remittance: number;
    discrepancy_count: number;
    discrepancy_amount: number;
  }>(
    async (supabase) => {
      let query = supabase
        .from('cod_collections')
        .select('status, amount');

      if (dateFrom) {
        query = query.gte('collected_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('collected_at', dateTo);
      }

      const { data, error } = await query;

      if (error) return { data: null, error };

      let totalCollected = 0;
      let totalRemitted = 0;
      let pendingRemittance = 0;
      let discrepancyCount = 0;
      let discrepancyAmount = 0;

      data?.forEach(cod => {
        totalCollected += cod.amount || 0;
        if (cod.status === 'remitted') {
          totalRemitted += cod.amount || 0;
        } else if (cod.status === 'pending') {
          pendingRemittance += cod.amount || 0;
        } else if (cod.status === 'discrepancy') {
          discrepancyCount++;
          discrepancyAmount += cod.amount || 0;
        }
      });

      return {
        data: {
          total_collected: totalCollected,
          total_remitted: totalRemitted,
          pending_remittance: pendingRemittance,
          discrepancy_count: discrepancyCount,
          discrepancy_amount: discrepancyAmount,
        },
        error: null,
      };
    },
    [dateFrom, dateTo]
  );
}

/**
 * Fetch employee COD balance
 */
export function useEmployeeCodBalance(employeeId: string | null) {
  return useQuery<{ pending_amount: number; collections_count: number }>(
    async (supabase) => {
      if (!employeeId) return { data: null, error: null };

      const { data, error } = await supabase
        .from('cod_collections')
        .select('amount')
        .eq('employee_id', employeeId)
        .eq('status', 'pending');

      if (error) return { data: null, error };

      const pendingAmount = data?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      return {
        data: {
          pending_amount: pendingAmount,
          collections_count: data?.length || 0,
        },
        error: null,
      };
    },
    [employeeId]
  );
}

// ============================================================================
// COD MUTATIONS
// ============================================================================

/**
 * Record COD collection
 */
export function useRecordCodCollection() {
  return useMutation<CodCollection, {
    employee_id: string;
    amount: number;
    order_id?: string;
    platform_id?: string;
    notes?: string;
  }>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('cod_collections')
        .insert({
          ...input,
          status: 'pending',
          collected_at: new Date().toISOString(),
        })
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Mark COD as remitted
 */
export function useRemitCod() {
  return useMutation<CodCollection, { id: string; notes?: string }>(
    async (supabase, { id, notes }) => {
      const { data, error } = await supabase
        .from('cod_collections')
        .update({
          status: 'remitted',
          remitted_at: new Date().toISOString(),
          notes,
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Bulk remit COD collections
 */
export function useBulkRemitCod() {
  return useMutation<null, string[]>(
    async (supabase, ids) => {
      const { error } = await supabase
        .from('cod_collections')
        .update({
          status: 'remitted',
          remitted_at: new Date().toISOString(),
        })
        .in('id', ids);

      return { data: null, error };
    }
  );
}

/**
 * Flag COD discrepancy
 */
export function useFlagCodDiscrepancy() {
  return useMutation<CodCollection, { id: string; actual_amount: number; notes: string }>(
    async (supabase, { id, actual_amount, notes }) => {
      const { data, error } = await supabase
        .from('cod_collections')
        .update({
          status: 'discrepancy',
          amount: actual_amount,
          notes: `DISCREPANCY: ${notes}`,
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

// ============================================================================
// PETTY CASH HOOKS
// ============================================================================

export interface PettyCashFilters {
  type?: 'withdrawal' | 'deposit';
  category?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Fetch petty cash transactions
 */
export function usePettyCashTransactions(filters?: PettyCashFilters, pagination?: PaginationParams) {
  return useQuery<PaginatedResult<PettyCash>>(
    async (supabase) => {
      let query = supabase
        .from('petty_cash')
        .select('*', { count: 'exact' });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.date_from) {
        query = query.gte('transaction_date', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('transaction_date', filters.date_to);
      }

      query = query.order('transaction_date', { ascending: false });

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
 * Get petty cash balance
 */
export function usePettyCashBalance() {
  return useQuery<{ balance: number; deposits: number; withdrawals: number }>(
    async (supabase) => {
      const { data, error } = await supabase
        .from('petty_cash')
        .select('type, amount');

      if (error) return { data: null, error };

      let deposits = 0;
      let withdrawals = 0;

      data?.forEach(tx => {
        if (tx.type === 'deposit') {
          deposits += tx.amount || 0;
        } else {
          withdrawals += tx.amount || 0;
        }
      });

      return {
        data: {
          balance: deposits - withdrawals,
          deposits,
          withdrawals,
        },
        error: null,
      };
    },
    []
  );
}

/**
 * Record petty cash transaction
 */
export function useRecordPettyCash() {
  return useMutation<PettyCash, Omit<PettyCash, 'id' | 'organization_id' | 'created_at'>>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('petty_cash')
        .insert(input)
        .select()
        .single();

      return { data, error };
    }
  );
}

// ============================================================================
// EMPLOYEE ADVANCES HOOKS
// ============================================================================

export interface AdvanceFilters {
  employee_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Fetch employee advances
 */
export function useEmployeeAdvances(filters?: AdvanceFilters, pagination?: PaginationParams) {
  return useQuery<PaginatedResult<EmployeeAdvance>>(
    async (supabase) => {
      let query = supabase
        .from('employee_advances')
        .select(`
          *,
          employee:employees(id, full_name)
        `, { count: 'exact' });

      if (filters?.employee_id) {
        query = query.eq('employee_id', filters.employee_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      query = query.order('created_at', { ascending: false });

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
 * Fetch pending advance requests
 */
export function usePendingAdvanceRequests() {
  return useQuery<EmployeeAdvance[]>(
    async (supabase) => {
      const { data, error } = await supabase
        .from('employee_advances')
        .select(`
          *,
          employee:employees(id, full_name)
        `)
        .eq('status', 'pending')
        .order('created_at');

      return { data, error };
    },
    []
  );
}

/**
 * Fetch employee advance balance
 */
export function useEmployeeAdvanceBalance(employeeId: string | null) {
  return useQuery<{ total_advanced: number; total_repaid: number; outstanding: number }>(
    async (supabase) => {
      if (!employeeId) return { data: null, error: null };

      const { data, error } = await supabase
        .from('employee_advances')
        .select('amount, amount_repaid')
        .eq('employee_id', employeeId)
        .in('status', ['approved', 'partial']);

      if (error) return { data: null, error };

      let totalAdvanced = 0;
      let totalRepaid = 0;

      data?.forEach(adv => {
        totalAdvanced += adv.amount || 0;
        totalRepaid += adv.amount_repaid || 0;
      });

      return {
        data: {
          total_advanced: totalAdvanced,
          total_repaid: totalRepaid,
          outstanding: totalAdvanced - totalRepaid,
        },
        error: null,
      };
    },
    [employeeId]
  );
}

// ============================================================================
// ADVANCE MUTATIONS
// ============================================================================

/**
 * Request advance
 */
export function useRequestAdvance() {
  return useMutation<EmployeeAdvance, {
    employee_id: string;
    amount: number;
    reason: string;
  }>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('employee_advances')
        .insert({
          ...input,
          status: 'pending',
          amount_repaid: 0,
        })
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Approve advance request
 */
export function useApproveAdvance() {
  return useMutation<EmployeeAdvance, {
    id: string;
    approved_by: string;
    repayment_method?: 'salary_deduction' | 'cash' | 'bank_transfer';
    repayment_schedule?: string;
  }>(
    async (supabase, { id, ...input }) => {
      const { data, error } = await supabase
        .from('employee_advances')
        .update({
          ...input,
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Reject advance request
 */
export function useRejectAdvance() {
  return useMutation<EmployeeAdvance, { id: string; reason: string }>(
    async (supabase, { id, reason }) => {
      const { data, error } = await supabase
        .from('employee_advances')
        .update({
          status: 'rejected',
          notes: reason,
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Disburse approved advance
 */
export function useDisburseAdvance() {
  return useMutation<EmployeeAdvance, string>(
    async (supabase, id) => {
      const { data, error } = await supabase
        .from('employee_advances')
        .update({
          disbursed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Record advance repayment
 */
export function useRecordAdvanceRepayment() {
  return useMutation<EmployeeAdvance, { id: string; amount: number }>(
    async (supabase, { id, amount }) => {
      // Get current advance
      const { data: advance } = await supabase
        .from('employee_advances')
        .select('amount, amount_repaid')
        .eq('id', id)
        .single();

      if (!advance) return { data: null, error: new Error('Advance not found') };

      const newRepaid = (advance.amount_repaid || 0) + amount;
      const isFullyRepaid = newRepaid >= advance.amount;

      const { data, error } = await supabase
        .from('employee_advances')
        .update({
          amount_repaid: newRepaid,
          status: isFullyRepaid ? 'repaid' : 'partial',
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

// ============================================================================
// FINANCIAL TRANSACTIONS / LEDGER HOOKS
// ============================================================================

export interface TransactionFilters {
  type?: string;
  category?: string;
  direction?: 'inflow' | 'outflow';
  date_from?: string;
  date_to?: string;
}

/**
 * Fetch financial transactions
 */
export function useFinancialTransactions(filters?: TransactionFilters, pagination?: PaginationParams) {
  return useQuery<PaginatedResult<FinancialTransaction>>(
    async (supabase) => {
      let query = supabase
        .from('financial_transactions')
        .select('*', { count: 'exact' });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.direction) {
        query = query.eq('direction', filters.direction);
      }
      if (filters?.date_from) {
        query = query.gte('transaction_date', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('transaction_date', filters.date_to);
      }

      query = query.order('transaction_date', { ascending: false });

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
 * Get cash flow summary
 */
export function useCashFlowSummary(dateFrom?: string, dateTo?: string) {
  return useQuery<{
    total_inflow: number;
    total_outflow: number;
    net_flow: number;
    by_category: Record<string, { inflow: number; outflow: number }>;
  }>(
    async (supabase) => {
      let query = supabase
        .from('financial_transactions')
        .select('direction, category, amount');

      if (dateFrom) {
        query = query.gte('transaction_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('transaction_date', dateTo);
      }

      const { data, error } = await query;

      if (error) return { data: null, error };

      let totalInflow = 0;
      let totalOutflow = 0;
      const byCategory: Record<string, { inflow: number; outflow: number }> = {};

      data?.forEach(tx => {
        if (!byCategory[tx.category]) {
          byCategory[tx.category] = { inflow: 0, outflow: 0 };
        }

        if (tx.direction === 'inflow') {
          totalInflow += tx.amount || 0;
          byCategory[tx.category].inflow += tx.amount || 0;
        } else {
          totalOutflow += tx.amount || 0;
          byCategory[tx.category].outflow += tx.amount || 0;
        }
      });

      return {
        data: {
          total_inflow: totalInflow,
          total_outflow: totalOutflow,
          net_flow: totalInflow - totalOutflow,
          by_category: byCategory,
        },
        error: null,
      };
    },
    [dateFrom, dateTo]
  );
}

/**
 * Record financial transaction
 */
export function useRecordTransaction() {
  return useMutation<FinancialTransaction, Omit<FinancialTransaction, 'id' | 'organization_id' | 'created_at'>>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert(input)
        .select()
        .single();

      return { data, error };
    }
  );
}
