'use client';

import { useQuery, useMutation, applyPagination } from '@/lib/supabase/hooks';
import type { PaginationParams, PaginatedResult } from '@/lib/supabase/hooks';
import type { Order, OrderStatus, OrderImportBatch, OrderException } from './types';

// ============================================================================
// ORDER HOOKS
// ============================================================================

export interface OrderFilters {
  client_id?: string;
  clientIds?: string[] | null;
  employee_id?: string;
  status?: OrderStatus;
  date?: string;
  date_from?: string;
  date_to?: string;
  reconciliation_status?: string;
  payroll_processed?: boolean;
  invoice_processed?: boolean;
  search?: string;
}

/**
 * Fetch orders with filters
 */
export function useOrders(filters?: OrderFilters, pagination?: PaginationParams) {
  return useQuery<PaginatedResult<Order>>(
    async (supabase) => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          client:clients(id, name),
          employee:employees(id, full_name, employee_number),
          asset:assets(id, name, license_plate)
        `, { count: 'exact' });

      // Filter by client IDs (from header selector)
      if (filters?.clientIds && filters.clientIds.length > 0) {
        query = query.in('client_id', filters.clientIds);
      }
      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id);
      }
      if (filters?.employee_id) {
        query = query.eq('employee_id', filters.employee_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.date) {
        query = query.eq('order_date', filters.date);
      }
      if (filters?.date_from) {
        query = query.gte('order_date', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('order_date', filters.date_to);
      }
      if (filters?.reconciliation_status) {
        query = query.eq('reconciliation_status', filters.reconciliation_status);
      }
      if (filters?.payroll_processed !== undefined) {
        query = query.eq('payroll_processed', filters.payroll_processed);
      }
      if (filters?.invoice_processed !== undefined) {
        query = query.eq('invoice_processed', filters.invoice_processed);
      }
      if (filters?.search) {
        query = query.ilike('external_order_id', `%${filters.search}%`);
      }

      query = query.order('order_date', { ascending: false }).order('created_at', { ascending: false });

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
 * Fetch a single order
 */
export function useOrder(id: string | null) {
  return useQuery<Order>(
    async (supabase) => {
      if (!id) return { data: null, error: null };

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:clients(id, name),
          employee:employees(id, full_name, employee_number),
          asset:assets(id, name, license_plate),
          contract:contracts(id, contract_name)
        `)
        .eq('id', id)
        .single();

      return { data, error };
    },
    [id]
  );
}

/**
 * Fetch order stats for dashboard
 */
export function useOrderStats(dateFrom: string, dateTo: string, platformId?: string) {
  return useQuery<{
    total_orders: number;
    completed_orders: number;
    cancelled_orders: number;
    total_revenue: number;
    avg_order_value: number;
    top_riders: { employee_id: string; employee_name: string; order_count: number }[];
  }>(
    async (supabase) => {
      let query = supabase
        .from('orders')
        .select('status, total_revenue, employee_id, employees(full_name)')
        .gte('order_date', dateFrom)
        .lte('order_date', dateTo);

      if (platformId) {
        query = query.eq('platform_id', platformId);
      }

      const { data, error } = await query;

      if (error) return { data: null, error };

      const totalOrders = data?.length || 0;
      const completedOrders = data?.filter(o => o.status === 'completed').length || 0;
      const cancelledOrders = data?.filter(o => o.status === 'cancelled').length || 0;
      const totalRevenue = data?.reduce((sum, o) => sum + (o.total_revenue || 0), 0) || 0;

      // Count orders per rider
      const riderCounts: Record<string, { name: string; count: number }> = {};
      data?.forEach(o => {
        if (o.employee_id) {
          if (!riderCounts[o.employee_id]) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const employees = o.employees as any;
            const employeeName = employees?.full_name || 'Unknown';
            riderCounts[o.employee_id] = { 
              name: employeeName, 
              count: 0 
            };
          }
          riderCounts[o.employee_id].count++;
        }
      });

      const topRiders = Object.entries(riderCounts)
        .map(([id, { name, count }]) => ({ employee_id: id, employee_name: name, order_count: count }))
        .sort((a, b) => b.order_count - a.order_count)
        .slice(0, 5);

      return {
        data: {
          total_orders: totalOrders,
          completed_orders: completedOrders,
          cancelled_orders: cancelledOrders,
          total_revenue: totalRevenue,
          avg_order_value: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          top_riders: topRiders,
        },
        error: null,
      };
    },
    [dateFrom, dateTo, platformId]
  );
}

/**
 * Fetch unreconciled orders
 */
export function useUnreconciledOrders(platformId?: string) {
  return useQuery<Order[]>(
    async (supabase) => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          client:clients(id, name),
          employee:employees(id, full_name)
        `)
        .in('reconciliation_status', ['pending', 'mismatched']);

      if (platformId) {
        query = query.eq('platform_id', platformId);
      }

      query = query.order('order_date', { ascending: false });

      const { data, error } = await query;
      return { data, error };
    },
    [platformId]
  );
}

// ============================================================================
// IMPORT BATCH HOOKS
// ============================================================================

/**
 * Fetch import batches
 */
export function useOrderImportBatches(pagination?: PaginationParams) {
  return useQuery<PaginatedResult<OrderImportBatch>>(
    async (supabase) => {
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;

      let query = supabase
        .from('order_import_batches')
        .select(`
          *,
          client:clients(id, name),
          imported_by_user:user_profiles(id, full_name)
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

// ============================================================================
// EXCEPTION HOOKS
// ============================================================================

/**
 * Fetch order exceptions
 */
export function useOrderExceptions(filters?: { status?: string; exception_type?: string }) {
  return useQuery<OrderException[]>(
    async (supabase) => {
      let query = supabase
        .from('order_exceptions')
        .select(`
          *,
          order:orders(id, external_order_id, client:clients(name)),
          assigned_to_user:user_profiles(id, full_name)
        `);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.exception_type) {
        query = query.eq('exception_type', filters.exception_type);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      return { data, error };
    },
    [filters?.status, filters?.exception_type]
  );
}

/**
 * Fetch pending exceptions count
 */
export function usePendingExceptionsCount() {
  return useQuery<number>(
    async (supabase) => {
      const { count, error } = await supabase
        .from('order_exceptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return { data: count || 0, error };
    },
    []
  );
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create an order manually
 */
export function useCreateOrder() {
  return useMutation<Order, Omit<Order, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('orders')
        .insert(input)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Update order status
 */
export function useUpdateOrderStatus() {
  return useMutation<Order, { id: string; status: OrderStatus }>(
    async (supabase, { id, status }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Mark order as reconciled
 */
export function useReconcileOrder() {
  return useMutation<Order, { id: string; reconciliation_status: string }>(
    async (supabase, { id, reconciliation_status }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({
          reconciliation_status,
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
 * Bulk reconcile orders
 */
export function useBulkReconcileOrders() {
  return useMutation<number, { ids: string[]; reconciliation_status: string }>(
    async (supabase, { ids, reconciliation_status }) => {
      const { error, count } = await supabase
        .from('orders')
        .update({
          reconciliation_status,
          updated_at: new Date().toISOString(),
        })
        .in('id', ids);

      return { data: count || 0, error };
    }
  );
}

/**
 * Resolve an order exception
 */
export function useResolveOrderException() {
  return useMutation<OrderException, { id: string; resolution: string; resolved_by: string }>(
    async (supabase, { id, resolution, resolved_by }) => {
      const { data, error } = await supabase
        .from('order_exceptions')
        .update({
          status: 'resolved',
          resolution,
          resolved_by,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}
