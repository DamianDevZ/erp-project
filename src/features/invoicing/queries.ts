'use client';

import { useQuery, useMutation, applyPagination } from '@/lib/supabase/hooks';
import type { PaginationParams, PaginatedResult } from '@/lib/supabase/hooks';
import type { Invoice, InvoiceStatus, InvoiceLineItem } from './types';

// ============================================================================
// INVOICE HOOKS
// ============================================================================

export interface InvoiceFilters {
  client_id?: string;
  clientIds?: string[] | null;
  status?: InvoiceStatus;
  period_start?: string;
  period_end?: string;
  is_overdue?: boolean;
  search?: string;
}

/**
 * Fetch invoices with filters
 */
export function useInvoices(filters?: InvoiceFilters, pagination?: PaginationParams) {
  return useQuery<PaginatedResult<Invoice>>(
    async (supabase) => {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          client:clients(id, name)
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
      if (filters?.period_start) {
        query = query.gte('period_start', filters.period_start);
      }
      if (filters?.period_end) {
        query = query.lte('period_end', filters.period_end);
      }
      if (filters?.is_overdue) {
        const today = new Date().toISOString().split('T')[0];
        query = query.lt('due_at', today).in('status', ['sent', 'draft']);
      }
      if (filters?.search) {
        query = query.ilike('invoice_number', `%${filters.search}%`);
      }

      query = query.order('issued_at', { ascending: false });

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
 * Fetch a single invoice with line items
 */
export function useInvoice(id: string | null) {
  return useQuery<Invoice & { line_items: InvoiceLineItem[] }>(
    async (supabase) => {
      if (!id) return { data: null, error: null };

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          client:clients(id, name, contact_email),
          line_items:invoice_line_items(
            *,
            employee:employees(id, full_name)
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
 * Fetch overdue invoices
 */
export function useOverdueInvoices() {
  return useQuery<Invoice[]>(
    async (supabase) => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          platform:platforms(id, name)
        `)
        .lt('due_at', today)
        .in('status', ['sent', 'draft'])
        .order('due_at');

      return { data, error };
    },
    []
  );
}

/**
 * Fetch invoice summary stats
 */
export function useInvoiceSummary(dateFrom?: string, dateTo?: string) {
  return useQuery<{
    total_invoices: number;
    total_amount: number;
    paid_amount: number;
    pending_amount: number;
    overdue_amount: number;
    by_status: Record<InvoiceStatus, { count: number; amount: number }>;
  }>(
    async (supabase) => {
      let query = supabase
        .from('invoices')
        .select('status, total, due_at');

      if (dateFrom) {
        query = query.gte('issued_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('issued_at', dateTo);
      }

      const { data, error } = await query;

      if (error) return { data: null, error };

      const today = new Date().toISOString().split('T')[0];
      const byStatus: Record<string, { count: number; amount: number }> = {};

      let totalAmount = 0;
      let paidAmount = 0;
      let pendingAmount = 0;
      let overdueAmount = 0;

      data?.forEach(inv => {
        totalAmount += inv.total || 0;

        if (!byStatus[inv.status]) {
          byStatus[inv.status] = { count: 0, amount: 0 };
        }
        byStatus[inv.status].count++;
        byStatus[inv.status].amount += inv.total || 0;

        if (inv.status === 'paid') {
          paidAmount += inv.total || 0;
        } else if (inv.due_at && inv.due_at < today) {
          overdueAmount += inv.total || 0;
        } else {
          pendingAmount += inv.total || 0;
        }
      });

      return {
        data: {
          total_invoices: data?.length || 0,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          pending_amount: pendingAmount,
          overdue_amount: overdueAmount,
          by_status: byStatus as Record<InvoiceStatus, { count: number; amount: number }>,
        },
        error: null,
      };
    },
    [dateFrom, dateTo]
  );
}

/**
 * Fetch invoices for a platform
 */
export function usePlatformInvoices(platformId: string | null) {
  return useQuery<Invoice[]>(
    async (supabase) => {
      if (!platformId) return { data: null, error: null };

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('platform_id', platformId)
        .order('issued_at', { ascending: false });

      return { data, error };
    },
    [platformId]
  );
}

// ============================================================================
// MUTATIONS
// ============================================================================

export interface CreateInvoiceInput {
  platform_id: string;
  period_start: string;
  period_end: string;
  due_at?: string;
  tax_rate?: number;
  notes?: string;
}

/**
 * Create a new invoice
 */
export function useCreateInvoice() {
  return useMutation<Invoice, CreateInvoiceInput>(
    async (supabase, input) => {
      // Generate invoice number
      const { data: lastInvoice } = await supabase
        .from('invoices')
        .select('invoice_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let nextNumber = 1;
      if (lastInvoice?.invoice_number) {
        const match = lastInvoice.invoice_number.match(/\d+$/);
        if (match) {
          nextNumber = parseInt(match[0], 10) + 1;
        }
      }

      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(nextNumber).padStart(5, '0')}`;

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          ...input,
          invoice_number: invoiceNumber,
          status: 'draft',
          issued_at: new Date().toISOString().split('T')[0],
          subtotal: 0,
          tax_amount: 0,
          total: 0,
        })
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Add line item to invoice
 */
export function useAddInvoiceLineItem() {
  return useMutation<InvoiceLineItem, {
    invoice_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    type: string;
    employee_id?: string;
  }>(
    async (supabase, input) => {
      const amount = input.quantity * input.unit_price;

      const { data, error } = await supabase
        .from('invoice_line_items')
        .insert({ ...input, amount })
        .select()
        .single();

      // Update invoice totals
      if (!error && data) {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('subtotal, tax_rate')
          .eq('id', input.invoice_id)
          .single();

        if (invoice) {
          const newSubtotal = (invoice.subtotal || 0) + amount;
          const taxAmount = newSubtotal * ((invoice.tax_rate || 0) / 100);
          await supabase
            .from('invoices')
            .update({
              subtotal: newSubtotal,
              tax_amount: taxAmount,
              total: newSubtotal + taxAmount,
            })
            .eq('id', input.invoice_id);
        }
      }

      return { data, error };
    }
  );
}

/**
 * Remove line item from invoice
 */
export function useRemoveInvoiceLineItem() {
  return useMutation<null, { id: string; invoice_id: string; amount: number }>(
    async (supabase, { id, invoice_id, amount }) => {
      const { error } = await supabase
        .from('invoice_line_items')
        .delete()
        .eq('id', id);

      // Update invoice totals
      if (!error) {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('subtotal, tax_rate')
          .eq('id', invoice_id)
          .single();

        if (invoice) {
          const newSubtotal = (invoice.subtotal || 0) - amount;
          const taxAmount = newSubtotal * ((invoice.tax_rate || 0) / 100);
          await supabase
            .from('invoices')
            .update({
              subtotal: newSubtotal,
              tax_amount: taxAmount,
              total: newSubtotal + taxAmount,
            })
            .eq('id', invoice_id);
        }
      }

      return { data: null, error };
    }
  );
}

/**
 * Update invoice status
 */
export function useUpdateInvoiceStatus() {
  return useMutation<Invoice, { id: string; status: InvoiceStatus }>(
    async (supabase, { id, status }) => {
      const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'paid') {
        updates.paid_at = new Date().toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Send invoice (mark as sent)
 */
export function useSendInvoice() {
  return useMutation<Invoice, string>(
    async (supabase, id) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          status: 'sent',
          issued_at: new Date().toISOString().split('T')[0],
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
 * Mark invoice as paid
 */
export function useMarkInvoicePaid() {
  return useMutation<Invoice, { id: string; paid_at?: string; payment_reference?: string }>(
    async (supabase, { id, paid_at, payment_reference }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: paid_at || new Date().toISOString().split('T')[0],
          notes: payment_reference ? `Payment ref: ${payment_reference}` : undefined,
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
 * Cancel invoice
 */
export function useCancelInvoice() {
  return useMutation<Invoice, { id: string; reason?: string }>(
    async (supabase, { id, reason }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          status: 'cancelled',
          notes: reason,
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
 * Generate invoice from orders
 */
export function useGenerateInvoiceFromOrders() {
  return useMutation<Invoice, {
    platform_id: string;
    period_start: string;
    period_end: string;
  }>(
    async (supabase, input) => {
      // This would typically call a database function
      const { data, error } = await supabase.rpc('generate_invoice_from_orders', {
        p_platform_id: input.platform_id,
        p_period_start: input.period_start,
        p_period_end: input.period_end,
      });

      return { data, error };
    }
  );
}
