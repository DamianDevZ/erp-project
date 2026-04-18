/**
 * Order types and interfaces.
 * Delivery orders imported from aggregators.
 */

export type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'returned' | 'disputed';
export type OrderType = 'delivery' | 'pickup' | 'express' | 'scheduled';
export type ReconciliationStatus = 'pending' | 'matched' | 'mismatched' | 'resolved';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  cancelled: 'Cancelled',
  returned: 'Returned',
  disputed: 'Disputed',
};

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  delivery: 'Delivery',
  pickup: 'Pickup',
  express: 'Express',
  scheduled: 'Scheduled',
};

export const RECONCILIATION_STATUS_LABELS: Record<ReconciliationStatus, string> = {
  pending: 'Pending',
  matched: 'Matched',
  mismatched: 'Mismatched',
  resolved: 'Resolved',
};

/**
 * Order entity.
 */
export interface Order {
  id: string;
  organization_id: string;
  // External reference
  external_order_id: string;
  platform_id: string;
  contract_id: string | null;
  // Assignment
  employee_id: string | null;
  asset_id: string | null;
  // Timing
  order_date: string;
  pickup_time: string | null;
  delivery_time: string | null;
  // Details
  order_type: OrderType;
  pickup_location: string | null;
  delivery_location: string | null;
  distance_km: number | null;
  // Financial - order value
  order_value: number | null;
  delivery_fee: number | null;
  // Financial - revenue
  base_payout: number | null;
  incentive_payout: number;
  tip_amount: number;
  total_revenue: number | null;
  // Deductions
  platform_commission: number;
  penalty_amount: number;
  // Net
  net_revenue: number | null;
  // Status
  status: OrderStatus;
  cancellation_reason: string | null;
  // Reconciliation
  import_batch_id: string | null;
  imported_at: string;
  reconciled_at: string | null;
  reconciliation_status: ReconciliationStatus;
  reconciliation_notes: string | null;
  // Linking
  payroll_id: string | null;
  payroll_processed: boolean;
  invoice_id: string | null;
  invoice_processed: boolean;
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Order with related data.
 */
export interface OrderWithRelations extends Order {
  platform: {
    id: string;
    name: string;
  };
  employee?: {
    id: string;
    full_name: string;
    employee_id: string | null;
  } | null;
  asset?: {
    id: string;
    name: string;
    license_plate: string | null;
  } | null;
  contract?: {
    id: string;
    contract_name: string;
  } | null;
}

/**
 * Input for importing orders (CSV or API).
 */
export interface ImportOrderInput {
  external_order_id: string;
  platform_id: string;
  employee_id?: string;
  order_date: string;
  pickup_time?: string;
  delivery_time?: string;
  order_type?: OrderType;
  pickup_location?: string;
  delivery_location?: string;
  distance_km?: number;
  order_value?: number;
  delivery_fee?: number;
  base_payout?: number;
  incentive_payout?: number;
  tip_amount?: number;
  platform_commission?: number;
  status?: OrderStatus;
}

/**
 * Order summary for dashboards.
 */
export interface OrderSummary {
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  total_commission: number;
  net_revenue: number;
  avg_order_value: number;
  total_distance_km: number;
}

/**
 * Order summary by employee.
 */
export interface OrdersByEmployee {
  employee_id: string;
  employee_name: string;
  orders_count: number;
  total_revenue: number;
  avg_per_order: number;
}

/**
 * Order summary by platform.
 */
export interface OrdersByPlatform {
  platform_id: string;
  platform_name: string;
  orders_count: number;
  total_revenue: number;
  total_commission: number;
  net_revenue: number;
}
