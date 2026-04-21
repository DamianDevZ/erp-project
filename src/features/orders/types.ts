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
  client_id: string;
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

// ============================================
// T-040: Manual Order Import
// ============================================

export type OrderDataSource = 'api' | 'manual_excel' | 'manual_csv' | 'manual_entry';
export type ImportBatchStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partially_completed';

export const ORDER_DATA_SOURCE_LABELS: Record<OrderDataSource, string> = {
  api: 'API Integration',
  manual_excel: 'Excel Upload',
  manual_csv: 'CSV Upload',
  manual_entry: 'Manual Entry',
};

export const IMPORT_BATCH_STATUS_LABELS: Record<ImportBatchStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  partially_completed: 'Partially Completed',
};

/**
 * Order import batch record.
 */
export interface OrderImportBatch {
  id: string;
  organization_id: string;
  batch_number: string;
  data_source: OrderDataSource;
  platform_id: string | null;
  
  // File info
  file_name: string | null;
  file_path: string | null;
  file_size_bytes: number | null;
  
  // Import stats
  total_rows: number;
  processed_rows: number;
  successful_rows: number;
  failed_rows: number;
  skipped_duplicates: number;
  
  // Date range
  order_date_from: string | null;
  order_date_to: string | null;
  
  // Status
  status: ImportBatchStatus;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  
  // User tracking
  imported_by: string | null;
  notes: string | null;
  
  created_at: string;
  updated_at: string;
}

/**
 * Import batch with calculated fields from view.
 */
export interface ImportBatchSummary extends OrderImportBatch {
  platform_name: string | null;
  success_rate: number;
  processing_seconds: number | null;
  imported_by_name: string | null;
}

/**
 * Import error record.
 */
export interface OrderImportError {
  id: string;
  batch_id: string;
  row_number: number | null;
  external_order_id: string | null;
  error_type: string;
  error_message: string;
  row_data: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Input for creating an import batch.
 */
export interface CreateImportBatchInput {
  platform_id?: string;
  data_source?: OrderDataSource;
  file_name?: string;
  notes?: string;
}

/**
 * Input for recording an import error.
 */
export interface RecordImportErrorInput {
  batch_id: string;
  row_number?: number;
  external_order_id?: string;
  error_type: string;
  error_message: string;
  row_data?: Record<string, unknown>;
}

/**
 * Input for completing an import batch.
 */
export interface CompleteImportBatchInput {
  batch_id: string;
  successful_rows: number;
  skipped_duplicates?: number;
  order_date_from?: string;
  order_date_to?: string;
}

/**
 * Excel column mapping for order import.
 */
export interface OrderImportColumnMapping {
  external_order_id: string;
  order_date: string;
  order_value?: string;
  delivery_fee?: string;
  base_payout?: string;
  incentive_payout?: string;
  tip_amount?: string;
  platform_commission?: string;
  distance_km?: string;
  pickup_location?: string;
  delivery_location?: string;
  pickup_time?: string;
  delivery_time?: string;
  status?: string;
}

/**
 * Filters for import batch queries.
 */
export interface ImportBatchFilters {
  platform_id?: string;
  data_source?: OrderDataSource;
  status?: ImportBatchStatus;
  date_from?: string;
  date_to?: string;
}

// ============================================
// T-041: Order Reconciliation
// ============================================

export type ReconciliationBatchStatus = 'pending' | 'in_progress' | 'completed' | 'reviewed';
export type ReconciliationType = 'daily' | 'weekly' | 'monthly' | 'ad_hoc';
export type DiscrepancyType = 'missing_order' | 'extra_order' | 'amount_mismatch' | 'status_mismatch';

export const RECONCILIATION_BATCH_STATUS_LABELS: Record<ReconciliationBatchStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  reviewed: 'Reviewed',
};

export const RECONCILIATION_TYPE_LABELS: Record<ReconciliationType, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  ad_hoc: 'Ad Hoc',
};

export const DISCREPANCY_TYPE_LABELS: Record<DiscrepancyType, string> = {
  missing_order: 'Missing Order',
  extra_order: 'Extra Order',
  amount_mismatch: 'Amount Mismatch',
  status_mismatch: 'Status Mismatch',
};

/**
 * Order reconciliation batch record.
 */
export interface OrderReconciliationBatch {
  id: string;
  organization_id: string;
  batch_number: string;
  reconciliation_type: ReconciliationType;
  platform_id: string | null;
  
  // Period
  period_start: string;
  period_end: string;
  
  // Expected values (from platform reports)
  expected_order_count: number | null;
  expected_total_revenue: number | null;
  expected_platform_commission: number | null;
  expected_net_payout: number | null;
  
  // Actual values (from imported orders)
  actual_order_count: number | null;
  actual_total_revenue: number | null;
  actual_platform_commission: number | null;
  actual_net_payout: number | null;
  
  // Variance (computed)
  order_count_variance: number | null;
  revenue_variance: number | null;
  commission_variance: number | null;
  payout_variance: number | null;
  
  // Status
  status: ReconciliationBatchStatus;
  reconciled_at: string | null;
  reconciled_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  
  // Notes
  notes: string | null;
  resolution_notes: string | null;
  
  created_at: string;
  updated_at: string;
}

/**
 * Order reconciliation discrepancy record.
 */
export interface OrderReconciliationDiscrepancy {
  id: string;
  reconciliation_batch_id: string;
  order_id: string | null;
  
  discrepancy_type: DiscrepancyType;
  external_order_id: string | null;
  
  expected_value: number | null;
  actual_value: number | null;
  variance: number | null;
  
  description: string | null;
  
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  
  created_at: string;
}

/**
 * Reconciliation summary by platform from view.
 */
export interface ReconciliationSummaryByPlatform {
  organization_id: string;
  platform_id: string;
  platform_name: string;
  total_batches: number;
  completed_batches: number;
  pending_batches: number;
  total_expected_orders: number;
  total_actual_orders: number;
  total_order_variance: number;
  total_expected_revenue: number;
  total_actual_revenue: number;
  total_revenue_variance: number;
  unresolved_discrepancies: number;
}

/**
 * Orders pending reconciliation from view.
 */
export interface OrdersPendingReconciliation {
  organization_id: string;
  platform_id: string;
  platform_name: string;
  order_date: string;
  order_count: number;
  total_revenue: number;
  total_commission: number;
  net_revenue: number;
}

/**
 * Input for creating a reconciliation batch.
 */
export interface CreateReconciliationBatchInput {
  platform_id: string;
  period_start: string;
  period_end: string;
  reconciliation_type?: ReconciliationType;
  expected_order_count?: number;
  expected_total_revenue?: number;
  expected_platform_commission?: number;
  expected_net_payout?: number;
  notes?: string;
}

/**
 * Input for recording a reconciliation discrepancy.
 */
export interface CreateReconciliationDiscrepancyInput {
  reconciliation_batch_id: string;
  order_id?: string;
  discrepancy_type: DiscrepancyType;
  external_order_id?: string;
  expected_value?: number;
  actual_value?: number;
  description?: string;
}

/**
 * Input for resolving a discrepancy.
 */
export interface ResolveDiscrepancyInput {
  discrepancy_id: string;
  resolution_notes?: string;
}

/**
 * Filters for reconciliation batch queries.
 */
export interface ReconciliationBatchFilters {
  platform_id?: string;
  status?: ReconciliationBatchStatus;
  reconciliation_type?: ReconciliationType;
  period_start_from?: string;
  period_start_to?: string;
}

// ============================================
// T-042: Order Exception Queue
// ============================================

export type OrderExceptionType = 
  | 'distance_mismatch'
  | 'time_mismatch'
  | 'amount_suspicious'
  | 'duplicate_suspected'
  | 'missing_rider'
  | 'late_delivery'
  | 'cancelled_after_pickup'
  | 'high_tip'
  | 'manual_review';

export type ExceptionSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ExceptionQueueStatus = 'pending' | 'in_review' | 'resolved' | 'dismissed' | 'escalated';

export const ORDER_EXCEPTION_TYPE_LABELS: Record<OrderExceptionType, string> = {
  distance_mismatch: 'Distance Mismatch',
  time_mismatch: 'Time/Speed Mismatch',
  amount_suspicious: 'Suspicious Amount',
  duplicate_suspected: 'Duplicate Suspected',
  missing_rider: 'Missing Rider',
  late_delivery: 'Late Delivery',
  cancelled_after_pickup: 'Post-Pickup Cancel',
  high_tip: 'High Tip Alert',
  manual_review: 'Manual Review',
};

export const EXCEPTION_SEVERITY_LABELS: Record<ExceptionSeverity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const EXCEPTION_STATUS_LABELS: Record<ExceptionQueueStatus, string> = {
  pending: 'Pending',
  in_review: 'In Review',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
  escalated: 'Escalated',
};

/**
 * Exception rule configuration.
 */
export interface OrderExceptionRule {
  id: string;
  organization_id: string;
  rule_name: string;
  exception_type: OrderExceptionType;
  is_active: boolean;
  rule_parameters: Record<string, unknown>;
  severity: ExceptionSeverity;
  auto_flag: boolean;
  auto_escalate: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Order exception record.
 */
export interface OrderException {
  id: string;
  organization_id: string;
  order_id: string;
  rule_id: string | null;
  
  exception_type: OrderExceptionType;
  severity: ExceptionSeverity;
  
  expected_value: number | null;
  actual_value: number | null;
  variance_percent: number | null;
  description: string;
  
  status: ExceptionQueueStatus;
  
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  
  escalated_to: string | null;
  escalated_at: string | null;
  escalation_reason: string | null;
  
  created_at: string;
  updated_at: string;
}

/**
 * Exception queue item with order details from view.
 */
export interface OrderExceptionQueueItem extends OrderException {
  external_order_id: string;
  order_date: string;
  platform_id: string;
  platform_name: string | null;
  employee_id: string | null;
  rider_name: string | null;
  reviewed_by_name: string | null;
  resolved_by_name: string | null;
  escalated_to_name: string | null;
  hours_pending: number;
}

/**
 * Exception summary by type.
 */
export interface ExceptionSummaryByType {
  organization_id: string;
  exception_type: OrderExceptionType;
  total_count: number;
  pending_count: number;
  in_review_count: number;
  resolved_count: number;
  dismissed_count: number;
  escalated_count: number;
  avg_resolution_hours: number | null;
}

/**
 * Input for creating an exception rule.
 */
export interface CreateExceptionRuleInput {
  rule_name: string;
  exception_type: OrderExceptionType;
  rule_parameters?: Record<string, unknown>;
  severity?: ExceptionSeverity;
  auto_flag?: boolean;
  auto_escalate?: boolean;
  description?: string;
}

/**
 * Input for resolving an exception.
 */
export interface ResolveExceptionInput {
  exception_id: string;
  resolution: string;
}

/**
 * Input for dismissing an exception.
 */
export interface DismissExceptionInput {
  exception_id: string;
  review_notes?: string;
}

/**
 * Input for escalating an exception.
 */
export interface EscalateExceptionInput {
  exception_id: string;
  escalated_to: string;
  escalation_reason?: string;
}

/**
 * Filters for exception queue queries.
 */
export interface ExceptionQueueFilters {
  exception_type?: OrderExceptionType;
  severity?: ExceptionSeverity;
  status?: ExceptionQueueStatus;
  platform_id?: string;
  employee_id?: string;
  date_from?: string;
  date_to?: string;
}
