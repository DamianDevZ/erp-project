/**
 * Invoicing types and interfaces.
 */

export type WorkLogStatus = 'pending' | 'verified' | 'invoiced';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type LineItemType = 'service' | 'deliveries' | 'hours' | 'bonus' | 'adjustment' | 'other';

/**
 * Daily work log entry.
 */
export interface WorkLog {
  id: string;
  organization_id: string;
  employee_id: string;
  client_id: string;
  work_date: string;
  deliveries_count: number;
  hours_worked: number;
  gross_earnings: number;
  tips: number;
  bonuses: number;
  status: WorkLogStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Invoice to a client.
 */
export interface Invoice {
  id: string;
  organization_id: string;
  client_id: string;
  invoice_number: string;
  title: string | null;
  period_start: string;
  period_end: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: InvoiceStatus;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Invoice attachment for images/files.
 */
export interface InvoiceAttachment {
  id: string;
  organization_id: string;
  invoice_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

/**
 * Invoice line item.
 */
export interface InvoiceLineItem {
  id: string;
  organization_id: string;
  invoice_id: string;
  description: string;
  employee_id: string | null;
  quantity: number;
  unit_price: number;
  amount: number;
  type: LineItemType;
  created_at: string;
}

/**
 * Invoice with related data.
 */
export interface InvoiceWithRelations extends Invoice {
  platform?: {
    id: string;
    name: string;
  } | null;
  client?: {
    id: string;
    name: string;
  } | null;
  line_items: InvoiceLineItem[];
}

/**
 * Work log with related data.
 */
export interface WorkLogWithRelations extends WorkLog {
  employee: {
    id: string;
    full_name: string;
  };
  platform?: {
    id: string;
    name: string;
  } | null;
  client?: {
    id: string;
    name: string;
  } | null;
}

/**
 * Input for creating a work log.
 */
export interface CreateWorkLogInput {
  employee_id: string;
  platform_id: string;
  work_date: string;
  deliveries_count?: number;
  hours_worked?: number;
  gross_earnings?: number;
  tips?: number;
  bonuses?: number;
  notes?: string;
}

/**
 * Input for generating an invoice.
 */
export interface GenerateInvoiceInput {
  platform_id: string;
  period_start: string;
  period_end: string;
  tax_rate?: number;
  notes?: string;
}

// ============================================
// T-047 to T-052: Enhanced Invoicing System
// ============================================

export type InvoiceGenerationType = 'manual' | 'order_batch' | 'recurring' | 'adjustment';

export type InvoiceLineItemType = 
  | 'delivery_fee'
  | 'platform_commission'
  | 'tip'
  | 'bonus'
  | 'penalty'
  | 'adjustment'
  | 'reimbursement'
  | 'other';

export type InvoiceApprovalStatus = 
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'auto_approved';

export type InvoicePaymentStatus = 'paid' | 'overdue' | 'due_soon' | 'upcoming';

export type InvoiceBatchStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export const INVOICE_GENERATION_TYPE_LABELS: Record<InvoiceGenerationType, string> = {
  manual: 'Manual',
  order_batch: 'Order Batch',
  recurring: 'Recurring',
  adjustment: 'Adjustment',
};

export const INVOICE_LINE_ITEM_TYPE_LABELS: Record<InvoiceLineItemType, string> = {
  delivery_fee: 'Delivery Fee',
  platform_commission: 'Platform Commission',
  tip: 'Tip',
  bonus: 'Bonus',
  penalty: 'Penalty',
  adjustment: 'Adjustment',
  reimbursement: 'Reimbursement',
  other: 'Other',
};

export const INVOICE_APPROVAL_STATUS_LABELS: Record<InvoiceApprovalStatus, string> = {
  pending: 'Pending Review',
  in_review: 'In Review',
  approved: 'Approved',
  rejected: 'Rejected',
  auto_approved: 'Auto-Approved',
};

export const INVOICE_PAYMENT_STATUS_LABELS: Record<InvoicePaymentStatus, string> = {
  paid: 'Paid',
  overdue: 'Overdue',
  due_soon: 'Due Soon',
  upcoming: 'Upcoming',
};

/**
 * Extended invoice with order-based generation fields.
 */
export interface EnhancedInvoice extends Invoice {
  generation_type: InvoiceGenerationType;
  client_id: string | null;
  contract_id: string | null;
  currency: string;
  
  // Payment terms
  payment_terms_days: number;
  early_payment_discount_percent: number;
  early_payment_days: number | null;
  late_payment_penalty_percent: number;
  
  // Order linkage
  orders_count: number;
  orders_period_start: string | null;
  orders_period_end: string | null;
  
  // Approval workflow
  approval_status: InvoiceApprovalStatus;
  approval_required: boolean;
  approval_threshold: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  
  // Batch reference
  batch_id: string | null;
}

/**
 * Enhanced invoice line item with order linkage.
 */
export interface EnhancedInvoiceLineItem extends InvoiceLineItem {
  line_type: InvoiceLineItemType;
  order_id: string | null;
  order_date: string | null;
  platform_id: string | null;
  is_taxable: boolean;
  tax_rate: number;
  tax_amount: number;
}

/**
 * Invoice order link record.
 */
export interface InvoiceOrderLink {
  id: string;
  organization_id: string;
  invoice_id: string;
  order_id: string;
  delivery_fee: number;
  platform_commission: number;
  tip_amount: number;
  bonus_amount: number;
  penalty_amount: number;
  total_amount: number;
  created_at: string;
}

/**
 * Invoice batch for bulk generation.
 */
export interface InvoiceBatch {
  id: string;
  organization_id: string;
  batch_number: string;
  generation_type: InvoiceGenerationType;
  period_start: string;
  period_end: string;
  platform_id: string | null;
  client_id: string | null;
  invoices_generated: number;
  total_orders_processed: number;
  total_amount: number;
  status: InvoiceBatchStatus;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Invoice batch from view with related data.
 */
export interface InvoiceBatchView extends InvoiceBatch {
  platform_name: string | null;
  created_by_name: string | null;
  processing_seconds: number | null;
}

/**
 * Payment term template.
 */
export interface PaymentTermTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  payment_days: number;
  early_discount_percent: number;
  early_discount_days: number | null;
  late_penalty_percent: number;
  late_penalty_after_days: number | null;
  apply_to_all_clients: boolean;
  min_invoice_amount: number | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Invoice approval rule.
 */
export interface InvoiceApprovalRule {
  id: string;
  organization_id: string;
  rule_name: string;
  min_amount: number | null;
  max_amount: number | null;
  requires_review: boolean;
  reviewer_role: string | null;
  requires_approval: boolean;
  approver_role: string | null;
  auto_approve_below: number | null;
  auto_approve_recurring: boolean;
  priority: number;
  is_active: boolean;
  created_at: string;
}

/**
 * Invoice summary from view.
 */
export interface InvoiceOrderSummary {
  invoice_id: string;
  organization_id: string;
  invoice_number: string;
  platform_id: string | null;
  platform_name: string | null;
  client_id: string | null;
  client_name: string | null;
  generation_type: InvoiceGenerationType;
  period_start: string;
  period_end: string;
  orders_count: number;
  linked_orders: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: InvoiceStatus;
  approval_status: InvoiceApprovalStatus;
  approval_required: boolean;
  payment_terms_days: number;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  payment_status: InvoicePaymentStatus;
  created_at: string;
}

/**
 * Revenue by period summary.
 */
export interface RevenueByPeriod {
  organization_id: string;
  period_month: string;
  platform_id: string | null;
  platform_name: string | null;
  invoice_count: number;
  total_orders: number;
  gross_revenue: number;
  total_tax: number;
  total_revenue: number;
  collected_revenue: number;
  outstanding_revenue: number;
  avg_invoice_amount: number;
}

/**
 * Revenue metrics dashboard data.
 */
export interface RevenueMetricsDashboard {
  organization_id: string;
  revenue_this_month: number | null;
  collected_this_month: number | null;
  invoices_this_month: number;
  revenue_last_month: number | null;
  revenue_change_percent: number | null;
  total_outstanding: number | null;
  total_overdue: number | null;
  overdue_count: number;
  avg_invoice_amount: number | null;
  avg_days_to_payment: number | null;
  pending_approval: number;
}

/**
 * Input for creating invoice from orders.
 */
export interface CreateInvoiceFromOrdersInput {
  platform_id: string;
  period_start: string;
  period_end: string;
  client_id?: string;
}

/**
 * Input for running invoice batch.
 */
export interface RunInvoiceBatchInput {
  period_start: string;
  period_end: string;
  platform_id?: string;
}

/**
 * Input for creating payment term template.
 */
export interface CreatePaymentTermTemplateInput {
  name: string;
  description?: string;
  payment_days: number;
  early_discount_percent?: number;
  early_discount_days?: number;
  late_penalty_percent?: number;
  late_penalty_after_days?: number;
  apply_to_all_clients?: boolean;
  min_invoice_amount?: number;
  is_default?: boolean;
}

/**
 * Input for creating approval rule.
 */
export interface CreateApprovalRuleInput {
  rule_name: string;
  min_amount?: number;
  max_amount?: number;
  requires_review?: boolean;
  reviewer_role?: string;
  requires_approval?: boolean;
  approver_role?: string;
  auto_approve_below?: number;
  auto_approve_recurring?: boolean;
  priority?: number;
}

/**
 * Input for approving/rejecting invoice.
 */
export interface InvoiceApprovalInput {
  invoice_id: string;
  action: 'approve' | 'reject';
  rejection_reason?: string;
  notes?: string;
}

/**
 * Dashboard card for revenue summary.
 */
export interface RevenueCard {
  title: string;
  value: number;
  formatted_value: string;
  change?: number;
  change_direction?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

/**
 * Revenue dashboard data structure.
 */
export interface RevenueDashboardData {
  metrics: RevenueMetricsDashboard;
  by_period: RevenueByPeriod[];
  pending_invoices: InvoiceOrderSummary[];
  recent_batches: InvoiceBatchView[];
}
