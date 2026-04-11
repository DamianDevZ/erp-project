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
  platform_id: string;
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
 * Invoice to a platform.
 */
export interface Invoice {
  id: string;
  organization_id: string;
  platform_id: string;
  invoice_number: string;
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
  platform: {
    id: string;
    name: string;
  };
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
  platform: {
    id: string;
    name: string;
  };
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
