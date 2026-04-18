/**
 * Operations Control Tower Types
 * T-037: Live operations control tower view
 */

import type { EligibilityStatus, DocumentStatus } from '@/features/eligibility';

// Rider operational status enum matching database
export type RiderOpsStatus = 
  | 'offline'
  | 'clocked_in'
  | 'on_shift'
  | 'on_delivery'
  | 'on_break'
  | 'incident'
  | 'returning';

// Alert types
export type OperationsAlertType = 
  | 'rider_late'
  | 'vehicle_issue'
  | 'document_expiring'
  | 'incident_reported'
  | 'breakdown';

export type AlertSeverity = 'info' | 'warning' | 'critical';

// Labels
export const riderOpsStatusLabels: Record<RiderOpsStatus, string> = {
  offline: 'Offline',
  clocked_in: 'Clocked In',
  on_shift: 'On Shift',
  on_delivery: 'Delivering',
  on_break: 'On Break',
  incident: 'Incident',
  returning: 'Returning'
};

export const alertTypeLabels: Record<OperationsAlertType, string> = {
  rider_late: 'Late for Shift',
  vehicle_issue: 'Vehicle Issue',
  document_expiring: 'Document Expiring',
  incident_reported: 'Incident Reported',
  breakdown: 'Breakdown'
};

export const alertSeverityLabels: Record<AlertSeverity, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical'
};

/**
 * Rider row from operations_control_tower view
 */
export interface OperationsControlTowerRider {
  employee_id: string;
  organization_id: string;
  rider_code: string | null;
  rider_name: string;
  phone: string | null;
  rider_category: string | null;

  // Eligibility
  eligibility_status: EligibilityStatus;
  license_status: DocumentStatus;
  visa_status: DocumentStatus;

  // Vehicle
  assigned_vehicle_id: string | null;
  assigned_vehicle_plate: string | null;
  vehicle_name: string | null;
  vehicle_status: string | null;
  odometer_reading: number | null;

  // Current shift
  current_shift_id: string | null;
  shift_status: string | null;
  shift_date: string | null;
  shift_start: string | null;
  shift_end: string | null;
  platform_id: string | null;
  platform_name: string | null;

  // Attendance
  attendance_id: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  attendance_status: string | null;

  // Operational status
  ops_status: RiderOpsStatus;
  hours_worked_today: number | null;

  // Timestamps
  last_seen_at: string | null;
  profile_updated_at: string;
}

/**
 * Platform operations summary from view
 */
export interface PlatformOperationsSummary {
  organization_id: string;
  platform_id: string;
  platform_name: string;
  riders_online: number;
  riders_on_shift: number;
  riders_delivering: number;
  riders_on_break: number;
  riders_with_incidents: number;
  fully_eligible: number;
  conditionally_eligible: number;
  total_assigned_riders: number;
}

/**
 * Fleet operations summary from view
 */
export interface FleetOperationsSummary {
  organization_id: string;
  vehicles_available: number;
  vehicles_assigned: number;
  vehicles_maintenance: number;
  vehicles_off_road: number;
  spare_vehicles_ready: number;
  vehicles_compliant: number;
  vehicles_expiring_soon: number;
  vehicles_non_compliant: number;
  total_vehicles: number;
}

/**
 * Today's shift roster entry from view
 */
export interface TodaysShiftRosterEntry {
  shift_id: string;
  organization_id: string;
  employee_id: string;
  rider_name: string;
  rider_code: string | null;
  rider_phone: string | null;
  platform_id: string | null;
  platform_name: string | null;
  shift_status: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  scheduled_hours: number | null;
  vehicle_id: string | null;
  license_plate: string | null;
  vehicle_status: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  attendance_status: 'late' | 'not_started' | 'completed' | 'in_progress';
  clock_in_variance_minutes: number | null;
}

/**
 * Operations alert from view
 */
export interface OperationsAlert {
  alert_type: OperationsAlertType;
  severity: AlertSeverity;
  organization_id: string;
  entity_id: string;
  entity_type: 'employee' | 'vehicle';
  message: string;
  related_shift_id: string | null;
  platform_id: string | null;
  created_at: string;
}

/**
 * Control tower summary from view
 */
export interface OperationsControlTowerSummary {
  organization_id: string;
  riders_online: number;
  riders_on_shift: number;
  riders_clocked_in: number;
  riders_offline: number;
  eligible_riders: number;
  conditional_riders: number;
  ineligible_riders: number;
  total_riders: number;
}

/**
 * Filter options for control tower
 */
export interface ControlTowerFilters {
  platform_id?: string;
  ops_status?: RiderOpsStatus;
  eligibility_status?: EligibilityStatus;
  has_vehicle?: boolean;
}

/**
 * Sort options for control tower
 */
export type ControlTowerSortField = 
  | 'rider_name'
  | 'platform_name'
  | 'ops_status'
  | 'shift_start'
  | 'hours_worked_today';

// ============================================
// T-039: Attendance to Roster Connection
// ============================================

/**
 * Roster attendance status derived from shift and attendance records
 */
export type RosterAttendanceStatus = 
  | 'scheduled'   // Shift scheduled, clock-in not yet expected
  | 'absent'      // Past scheduled start, no clock-in
  | 'working'     // Clocked in, not checked out
  | 'completed';  // Clocked in and out

/**
 * Detailed roster entry with attendance metrics from roster_attendance_details view
 */
export interface RosterAttendanceDetails {
  shift_id: string;
  organization_id: string;
  employee_id: string;
  rider_name: string;
  rider_code: string | null;
  rider_phone: string | null;
  platform_id: string | null;
  platform_name: string | null;
  shift_date: string;
  scheduled_start: string;
  scheduled_end: string;
  scheduled_hours: number;
  shift_status: string;
  
  // Attendance details
  attendance_id: string | null;
  actual_start: string | null;
  actual_end: string | null;
  attendance_record_status: string | null;
  
  // Variance calculations
  clock_in_variance_minutes: number | null;
  clock_out_variance_minutes: number | null;
  hours_worked: number;
  
  // Status flags
  is_late: boolean;
  left_early: boolean;
  current_status: RosterAttendanceStatus;
  
  // Vehicle info
  vehicle_id: string | null;
  license_plate: string | null;
  vehicle_status: string | null;
}

/**
 * Shift attendance status result from get_shift_attendance_status function
 */
export interface ShiftAttendanceStatus {
  attendance_id: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  actual_hours: number | null;
  scheduled_hours: number | null;
  variance_hours: number | null;
  is_late: boolean;
  late_minutes: number;
  left_early: boolean;
  early_minutes: number;
  overtime_minutes: number;
}

/**
 * Shift attendance summary for reporting from shift_attendance_summary view
 */
export interface ShiftAttendanceSummary {
  organization_id: string;
  shift_date: string;
  platform_id: string;
  platform_name: string;
  total_shifts: number;
  shifts_started: number;
  shifts_completed: number;
  no_shows: number;
  late_arrivals: number;
  total_scheduled_hours: number;
  total_actual_hours: number;
}

/**
 * Filter options for roster attendance
 */
export interface RosterAttendanceFilters {
  shift_date?: string;
  platform_id?: string;
  current_status?: RosterAttendanceStatus;
  is_late?: boolean;
  left_early?: boolean;
}

// ============================================
// T-046: Operations Dashboard Metrics
// ============================================

/**
 * Daily operations metrics for historical tracking
 */
export interface OperationsDailyMetrics {
  id: string;
  organization_id: string;
  platform_id: string | null;
  metrics_date: string;
  
  // Order metrics
  total_orders: number;
  orders_completed: number;
  orders_cancelled: number;
  orders_returned: number;
  orders_disputed: number;
  completion_rate: number;
  
  // Revenue metrics
  total_order_value: number;
  total_delivery_fees: number;
  total_tips: number;
  total_revenue: number;
  
  // Rider metrics
  scheduled_riders: number;
  active_riders: number;
  riders_with_orders: number;
  
  // Vehicle metrics
  available_vehicles: number;
  deployed_vehicles: number;
  vehicle_utilization: number;
  
  // Shift metrics
  total_scheduled_hours: number;
  total_worked_hours: number;
  
  // Performance
  avg_orders_per_rider: number | null;
  
  // Incident metrics
  new_incidents: number;
  breakdowns: number;
  accidents: number;
  
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Live operations metrics returned by get_live_operations_metrics function
 */
export interface LiveOperationsMetrics {
  // Orders
  total_orders: number;
  orders_completed: number;
  orders_pending: number;
  orders_cancelled: number;
  completion_rate: number;
  
  // Revenue
  total_order_value: number;
  total_delivery_fees: number;
  total_tips: number;
  
  // Riders
  scheduled_riders: number;
  active_riders: number;
  riders_with_orders: number;
  
  // Vehicles
  available_vehicles: number;
  assigned_vehicles: number;
  vehicle_utilization: number;
  
  // Incidents
  active_breakdowns: number;
  active_incidents: number;
}

/**
 * Live overview from operations_live_overview view
 */
export interface OperationsLiveOverview {
  organization_id: string;
  platform_id: string | null;
  platform_name: string | null;
  
  // Today
  orders_today: number;
  completed_today: number;
  pending_today: number;
  completion_rate: number;
  
  // Revenue
  order_value_today: number;
  delivery_fees_today: number;
  tips_today: number;
  revenue_today: number;
  
  // This week
  orders_this_week: number;
  completed_this_week: number;
}

/**
 * Hourly trend from operations_hourly_trend view
 */
export interface OperationsHourlyTrend {
  organization_id: string;
  platform_id: string | null;
  hour: number;
  total_orders: number;
  completed: number;
  avg_delivery_fee: number | null;
  tips: number;
}

/**
 * Rider performance today from rider_performance_today view
 */
export interface RiderPerformanceToday {
  organization_id: string;
  employee_id: string;
  rider_name: string;
  rider_code: string | null;
  shift_status: string | null;
  
  // Shift timing
  planned_start: string | null;
  planned_end: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  
  // Orders
  orders_assigned: number;
  orders_completed: number;
  orders_pending: number;
  
  // Revenue
  tips_collected: number;
  total_revenue: number;
  
  // Performance
  orders_per_hour: number | null;
}

/**
 * Metrics comparison from operations_metrics_comparison view
 */
export interface OperationsMetricsComparison {
  organization_id: string;
  platform_id: string | null;
  
  // Today
  orders_today: number | null;
  completed_today: number | null;
  revenue_today: number | null;
  
  // Yesterday
  orders_yesterday: number | null;
  completed_yesterday: number | null;
  revenue_yesterday: number | null;
  
  // This week averages
  avg_orders_this_week: number | null;
  avg_completed_this_week: number | null;
  
  // Last week same day
  orders_last_week_same_day: number | null;
  completed_last_week_same_day: number | null;
  
  // Change percentage
  orders_change_vs_yesterday: number | null;
}

/**
 * Dashboard summary card data
 */
export interface DashboardSummaryCard {
  title: string;
  value: number | string;
  change?: number;  // Percentage change
  changeDirection?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

/**
 * Operations dashboard data structure
 */
export interface OperationsDashboardData {
  live_metrics: LiveOperationsMetrics;
  overview: OperationsLiveOverview[];
  hourly_trend: OperationsHourlyTrend[];
  rider_performance: RiderPerformanceToday[];
  comparison: OperationsMetricsComparison | null;
}

/**
 * Dashboard filter options
 */
export interface DashboardFilters {
  platform_id?: string;
  date_range?: 'today' | 'week' | 'month';
}
