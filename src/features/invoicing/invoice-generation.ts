'use client';

/**
 * Invoice Generation Service (T-070 to T-072)
 * 
 * Manages:
 * - Client invoicing
 * - Billing cycles
 * - Invoice items and line items
 * - Payment tracking
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type InvoiceStatus = 'draft' | 'pending' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded';
export type BillingCycle = 'weekly' | 'biweekly' | 'monthly' | 'custom';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  clientAddress: string | null;
  platformId: string | null;
  platformName: string | null;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  notes: string | null;
  terms: string | null;
  createdBy: string;
  payments: InvoicePayment[];
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  category: 'service' | 'orders' | 'hours' | 'equipment' | 'fee' | 'other';
  metadata?: Record<string, unknown>;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  paymentMethod: string;
  reference: string | null;
  paidAt: string;
  notes: string | null;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  billingCycle: BillingCycle;
  paymentTermsDays: number;
  taxNumber: string | null;
  defaultTaxRate: number;
  notes: string | null;
  isActive: boolean;
}

export interface BillingRate {
  id: string;
  clientId: string;
  platformId: string | null;
  rateType: 'per_order' | 'per_hour' | 'fixed' | 'percentage';
  rate: number;
  minOrderValue: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  sent: 'Sent',
  paid: 'Paid',
  partial: 'Partially Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  custom: 'Custom',
};

// ============================================================================
// CLIENT MANAGEMENT
// ============================================================================

/**
 * Create a new billing client.
 */
export async function createBillingClient(input: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  billingCycle?: BillingCycle;
  paymentTermsDays?: number;
  taxNumber?: string;
  defaultTaxRate?: number;
  notes?: string;
}): Promise<{ success: boolean; clientId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      billing_cycle: input.billingCycle || 'monthly',
      payment_terms_days: input.paymentTermsDays || 30,
      tax_number: input.taxNumber,
      default_tax_rate: input.defaultTaxRate || 5,
      notes: input.notes,
      is_active: true,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, clientId: data.id };
}

/**
 * Get client by ID.
 */
export async function getClient(clientId: string): Promise<Client | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();
  
  if (!data) return null;
  
  return mapClient(data);
}

/**
 * Get all clients.
 */
export async function getClients(activeOnly = true): Promise<Client[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('clients')
    .select('*')
    .order('name');
  
  if (activeOnly) {
    query = query.eq('is_active', true);
  }
  
  const { data } = await query;
  
  return (data || []).map(mapClient);
}

// ============================================================================
// BILLING RATES
// ============================================================================

/**
 * Set billing rate for a client.
 */
export async function setBillingRate(input: {
  clientId: string;
  platformId?: string;
  rateType: BillingRate['rateType'];
  rate: number;
  minOrderValue?: number;
  effectiveFrom: string;
}): Promise<{ success: boolean; rateId?: string; error?: string }> {
  const supabase = createClient();
  
  // Close existing rate
  await supabase
    .from('billing_rates')
    .update({ effective_to: input.effectiveFrom })
    .eq('client_id', input.clientId)
    .eq('platform_id', input.platformId || null)
    .is('effective_to', null);
  
  const { data, error } = await supabase
    .from('billing_rates')
    .insert({
      client_id: input.clientId,
      platform_id: input.platformId,
      rate_type: input.rateType,
      rate: input.rate,
      min_order_value: input.minOrderValue,
      effective_from: input.effectiveFrom,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, rateId: data.id };
}

/**
 * Get billing rates for a client.
 */
export async function getClientBillingRates(clientId: string): Promise<BillingRate[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('billing_rates')
    .select('*')
    .eq('client_id', clientId)
    .is('effective_to', null);
  
  return (data || []).map(r => ({
    id: r.id,
    clientId: r.client_id,
    platformId: r.platform_id,
    rateType: r.rate_type as BillingRate['rateType'],
    rate: r.rate,
    minOrderValue: r.min_order_value,
    effectiveFrom: r.effective_from,
    effectiveTo: r.effective_to,
  }));
}

// ============================================================================
// INVOICE GENERATION
// ============================================================================

/**
 * Generate invoice number.
 */
async function generateInvoiceNumber(): Promise<string> {
  const supabase = createClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${year}-${month}-01`);
  
  return `INV-${year}${month}-${String((count || 0) + 1).padStart(4, '0')}`;
}

/**
 * Create a new invoice.
 */
export async function createInvoice(input: {
  clientId: string;
  platformId?: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  lineItems: Omit<InvoiceLineItem, 'id'>[];
  taxRate?: number;
  discount?: number;
  notes?: string;
  terms?: string;
  createdBy: string;
}): Promise<{ success: boolean; invoiceId?: string; invoiceNumber?: string; error?: string }> {
  const supabase = createClient();
  
  // Get client
  const client = await getClient(input.clientId);
  if (!client) {
    return { success: false, error: 'Client not found' };
  }
  
  const invoiceNumber = await generateInvoiceNumber();
  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + client.paymentTermsDays);
  
  // Calculate totals
  const lineItems = input.lineItems.map(item => ({
    ...item,
    id: crypto.randomUUID(),
    amount: item.quantity * item.unitPrice,
  }));
  
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxRate = input.taxRate ?? client.defaultTaxRate;
  const taxAmount = Math.round((subtotal * taxRate) / 100);
  const discount = input.discount || 0;
  const total = subtotal + taxAmount - discount;
  
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      client_id: input.clientId,
      platform_id: input.platformId,
      billing_period_start: input.billingPeriodStart,
      billing_period_end: input.billingPeriodEnd,
      issue_date: now.toISOString(),
      due_date: dueDate.toISOString(),
      status: 'draft',
      line_items: lineItems,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      discount,
      total,
      amount_paid: 0,
      amount_due: total,
      currency: 'BHD',
      notes: input.notes,
      terms: input.terms,
      created_by: input.createdBy,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, invoiceId: data.id, invoiceNumber };
}

/**
 * Auto-generate invoice from orders.
 */
export async function generateInvoiceFromOrders(
  clientId: string,
  platformId: string,
  startDate: string,
  endDate: string,
  createdBy: string
): Promise<{ success: boolean; invoiceId?: string; orderCount?: number; error?: string }> {
  const supabase = createClient();
  
  // Get billing rate
  const rates = await getClientBillingRates(clientId);
  const rate = rates.find(r => r.platformId === platformId) || rates.find(r => !r.platformId);
  
  if (!rate) {
    return { success: false, error: 'No billing rate configured for this client' };
  }
  
  // Get orders
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_value, completed_at')
    .eq('platform_id', platformId)
    .eq('status', 'completed')
    .gte('completed_at', startDate)
    .lte('completed_at', endDate);
  
  if (!orders?.length) {
    return { success: false, error: 'No orders found for the specified period' };
  }
  
  // Calculate line items
  const lineItems: Omit<InvoiceLineItem, 'id'>[] = [];
  
  switch (rate.rateType) {
    case 'per_order':
      lineItems.push({
        description: `Order fulfillment services (${orders.length} orders)`,
        quantity: orders.length,
        unitPrice: rate.rate,
        amount: orders.length * rate.rate,
        category: 'orders',
      });
      break;
    
    case 'percentage':
      const totalOrderValue = orders.reduce((sum, o) => sum + (o.order_value || 0), 0);
      const amount = Math.round((totalOrderValue * rate.rate) / 100);
      lineItems.push({
        description: `Commission on ${orders.length} orders (${rate.rate}%)`,
        quantity: 1,
        unitPrice: amount,
        amount,
        category: 'service',
        metadata: { totalOrderValue },
      });
      break;
    
    case 'fixed':
      lineItems.push({
        description: 'Monthly service fee',
        quantity: 1,
        unitPrice: rate.rate,
        amount: rate.rate,
        category: 'service',
      });
      break;
  }
  
  const result = await createInvoice({
    clientId,
    platformId,
    billingPeriodStart: startDate,
    billingPeriodEnd: endDate,
    lineItems,
    createdBy,
  });
  
  if (result.success) {
    return { ...result, orderCount: orders.length };
  }
  
  return result;
}

// ============================================================================
// INVOICE OPERATIONS
// ============================================================================

/**
 * Get invoice by ID.
 */
export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('invoices')
    .select(`
      *,
      client:clients(name, email, address),
      platform:platforms(name),
      payments:invoice_payments(*)
    `)
    .eq('id', invoiceId)
    .single();
  
  if (!data) return null;
  
  return mapInvoice(data);
}

/**
 * Get invoices list.
 */
export async function getInvoices(filters?: {
  clientId?: string;
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
}): Promise<Invoice[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('invoices')
    .select(`
      *,
      client:clients(name, email, address),
      platform:platforms(name),
      payments:invoice_payments(*)
    `)
    .order('issue_date', { ascending: false });
  
  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.startDate) {
    query = query.gte('issue_date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('issue_date', filters.endDate);
  }
  
  const { data } = await query;
  
  return (data || []).map(mapInvoice);
}

/**
 * Update invoice status.
 */
export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('invoices')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', invoiceId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Send invoice.
 */
export async function sendInvoice(
  invoiceId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Get invoice
  const invoice = await getInvoice(invoiceId);
  if (!invoice) {
    return { success: false, error: 'Invoice not found' };
  }
  
  if (invoice.status !== 'draft' && invoice.status !== 'pending') {
    return { success: false, error: 'Invoice already sent' };
  }
  
  // Update status
  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // TODO: Send email notification to client
  
  return { success: true };
}

/**
 * Add line item to invoice.
 */
export async function addLineItem(
  invoiceId: string,
  item: Omit<InvoiceLineItem, 'id'>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const invoice = await getInvoice(invoiceId);
  if (!invoice) {
    return { success: false, error: 'Invoice not found' };
  }
  
  if (invoice.status !== 'draft') {
    return { success: false, error: 'Cannot modify non-draft invoice' };
  }
  
  const newItem: InvoiceLineItem = {
    ...item,
    id: crypto.randomUUID(),
    amount: item.quantity * item.unitPrice,
  };
  
  const lineItems = [...invoice.lineItems, newItem];
  const subtotal = lineItems.reduce((sum, i) => sum + i.amount, 0);
  const taxAmount = Math.round((subtotal * invoice.taxRate) / 100);
  const total = subtotal + taxAmount - invoice.discount;
  
  const { error } = await supabase
    .from('invoices')
    .update({
      line_items: lineItems,
      subtotal,
      tax_amount: taxAmount,
      total,
      amount_due: total - invoice.amountPaid,
    })
    .eq('id', invoiceId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// PAYMENTS
// ============================================================================

/**
 * Record payment for invoice.
 */
export async function recordPayment(input: {
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
}): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  const supabase = createClient();
  
  const invoice = await getInvoice(input.invoiceId);
  if (!invoice) {
    return { success: false, error: 'Invoice not found' };
  }
  
  if (input.amount > invoice.amountDue) {
    return { success: false, error: 'Payment amount exceeds amount due' };
  }
  
  const { data, error } = await supabase
    .from('invoice_payments')
    .insert({
      invoice_id: input.invoiceId,
      amount: input.amount,
      payment_method: input.paymentMethod,
      reference: input.reference,
      paid_at: new Date().toISOString(),
      notes: input.notes,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update invoice
  const newAmountPaid = invoice.amountPaid + input.amount;
  const newAmountDue = invoice.total - newAmountPaid;
  const newStatus: InvoiceStatus = newAmountDue <= 0 ? 'paid' : 'partial';
  
  await supabase
    .from('invoices')
    .update({
      amount_paid: newAmountPaid,
      amount_due: Math.max(0, newAmountDue),
      status: newStatus,
      paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
    })
    .eq('id', input.invoiceId);
  
  return { success: true, paymentId: data.id };
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Generate invoices for all clients based on billing cycle.
 */
export async function generateBillingCycleInvoices(
  billingCycle: BillingCycle,
  createdBy: string
): Promise<{ success: boolean; generated: number; errors: number }> {
  const supabase = createClient();
  
  // Get clients with matching billing cycle
  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .eq('billing_cycle', billingCycle)
    .eq('is_active', true);
  
  const now = new Date();
  let startDate: Date;
  let endDate = new Date(now);
  endDate.setDate(endDate.getDate() - 1);
  
  switch (billingCycle) {
    case 'weekly':
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      break;
    case 'biweekly':
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 13);
      break;
    default: // monthly
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
  }
  
  let generated = 0;
  let errors = 0;
  
  for (const client of clients || []) {
    // Get platforms associated with this client
    const { data: associations } = await supabase
      .from('client_platforms')
      .select('platform_id')
      .eq('client_id', client.id);
    
    for (const assoc of associations || []) {
      const result = await generateInvoiceFromOrders(
        client.id,
        assoc.platform_id,
        startDate.toISOString(),
        endDate.toISOString(),
        createdBy
      );
      
      if (result.success) {
        generated++;
      } else {
        errors++;
      }
    }
  }
  
  return { success: true, generated, errors };
}

/**
 * Mark overdue invoices.
 */
export async function markOverdueInvoices(): Promise<{ success: boolean; updated: number }> {
  const supabase = createClient();
  
  const now = new Date().toISOString();
  
  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('id')
    .in('status', ['sent', 'partial'])
    .lt('due_date', now);
  
  if (overdueInvoices?.length) {
    await supabase
      .from('invoices')
      .update({ status: 'overdue' })
      .in('id', overdueInvoices.map(i => i.id));
  }
  
  return { success: true, updated: overdueInvoices?.length || 0 };
}

// ============================================================================
// REPORTING
// ============================================================================

export interface InvoiceSummary {
  totalOutstanding: number;
  totalOverdue: number;
  totalPaidThisMonth: number;
  invoiceCount: number;
  byStatus: Record<InvoiceStatus, number>;
  byClient: Array<{
    clientId: string;
    clientName: string;
    outstanding: number;
    overdue: number;
  }>;
  recentPayments: InvoicePayment[];
  aging: {
    current: number;
    days30: number;
    days60: number;
    days90Plus: number;
  };
}

export async function getInvoiceSummary(): Promise<InvoiceSummary> {
  const supabase = createClient();
  
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id,
      status,
      total,
      amount_due,
      due_date,
      client_id,
      client:clients(name)
    `);
  
  const { data: payments } = await supabase
    .from('invoice_payments')
    .select('*')
    .gte('paid_at', monthStart)
    .order('paid_at', { ascending: false })
    .limit(10);
  
  const byStatus: Record<InvoiceStatus, number> = {
    draft: 0,
    pending: 0,
    sent: 0,
    paid: 0,
    partial: 0,
    overdue: 0,
    cancelled: 0,
  };
  
  let totalOutstanding = 0;
  let totalOverdue = 0;
  const clientMap = new Map<string, { name: string; outstanding: number; overdue: number }>();
  
  const aging = { current: 0, days30: 0, days60: 0, days90Plus: 0 };
  
  for (const inv of invoices || []) {
    byStatus[inv.status as InvoiceStatus]++;
    
    if (inv.status !== 'paid' && inv.status !== 'cancelled') {
      totalOutstanding += inv.amount_due;
      
      const client = inv.client as unknown;
      const clientData = (Array.isArray(client) ? client[0] : client) as { name: string } | null;
      const existing = clientMap.get(inv.client_id) || { name: clientData?.name || 'Unknown', outstanding: 0, overdue: 0 };
      existing.outstanding += inv.amount_due;
      
      if (inv.status === 'overdue') {
        totalOverdue += inv.amount_due;
        existing.overdue += inv.amount_due;
      }
      
      clientMap.set(inv.client_id, existing);
      
      // Aging
      const dueDate = new Date(inv.due_date);
      const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysPastDue <= 0) {
        aging.current += inv.amount_due;
      } else if (daysPastDue <= 30) {
        aging.days30 += inv.amount_due;
      } else if (daysPastDue <= 60) {
        aging.days60 += inv.amount_due;
      } else {
        aging.days90Plus += inv.amount_due;
      }
    }
  }
  
  const totalPaidThisMonth = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  
  const byClient = Array.from(clientMap.entries())
    .map(([clientId, data]) => ({ clientId, clientName: data.name, ...data }))
    .sort((a, b) => b.outstanding - a.outstanding);
  
  return {
    totalOutstanding,
    totalOverdue,
    totalPaidThisMonth,
    invoiceCount: invoices?.length || 0,
    byStatus,
    byClient,
    recentPayments: (payments || []).map(p => ({
      id: p.id,
      amount: p.amount,
      paymentMethod: p.payment_method,
      reference: p.reference,
      paidAt: p.paid_at,
      notes: p.notes,
    })),
    aging,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function mapClient(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string | null,
    phone: row.phone as string | null,
    address: row.address as string | null,
    billingCycle: row.billing_cycle as BillingCycle,
    paymentTermsDays: row.payment_terms_days as number,
    taxNumber: row.tax_number as string | null,
    defaultTaxRate: row.default_tax_rate as number,
    notes: row.notes as string | null,
    isActive: row.is_active as boolean,
  };
}

function mapInvoice(row: Record<string, unknown>): Invoice {
  const client = row.client as unknown;
  const clientData = (Array.isArray(client) ? client[0] : client) as { name: string; email: string | null; address: string | null } | null;
  const platform = row.platform as unknown;
  const platformData = (Array.isArray(platform) ? platform[0] : platform) as { name: string } | null;
  
  return {
    id: row.id as string,
    invoiceNumber: row.invoice_number as string,
    clientId: row.client_id as string,
    clientName: clientData?.name || 'Unknown',
    clientEmail: clientData?.email || null,
    clientAddress: clientData?.address || null,
    platformId: row.platform_id as string | null,
    platformName: platformData?.name || null,
    billingPeriodStart: row.billing_period_start as string,
    billingPeriodEnd: row.billing_period_end as string,
    issueDate: row.issue_date as string,
    dueDate: row.due_date as string,
    status: row.status as InvoiceStatus,
    lineItems: (row.line_items as InvoiceLineItem[]) || [],
    subtotal: row.subtotal as number,
    taxRate: row.tax_rate as number,
    taxAmount: row.tax_amount as number,
    discount: row.discount as number,
    total: row.total as number,
    amountPaid: row.amount_paid as number,
    amountDue: row.amount_due as number,
    currency: row.currency as string,
    notes: row.notes as string | null,
    terms: row.terms as string | null,
    createdBy: row.created_by as string,
    payments: ((row.payments as Array<Record<string, unknown>>) || []).map(p => ({
      id: p.id as string,
      amount: p.amount as number,
      paymentMethod: p.payment_method as string,
      reference: p.reference as string | null,
      paidAt: p.paid_at as string,
      notes: p.notes as string | null,
    })),
  };
}