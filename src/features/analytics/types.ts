// Analytics & Dashboard Types (T-078 to T-088)

// === Enums ===

export type WidgetType = 
  | 'counter'
  | 'chart_line'
  | 'chart_bar'
  | 'chart_pie'
  | 'chart_donut'
  | 'table'
  | 'list'
  | 'map'
  | 'gauge'
  | 'heatmap'
  | 'sparkline'
  | 'progress';

export type ReportFrequency = 
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'on_demand';

export type ReportStatus = 
  | 'draft'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'archived';

export type KpiCategory = 
  | 'operations'
  | 'finance'
  | 'fleet'
  | 'hr'
  | 'compliance'
  | 'customer';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';

export type TargetDirection = 'higher_better' | 'lower_better' | 'target';

export type KpiStatus = 'on_target' | 'below_target' | 'above_target' | 'warning' | 'critical';

export type DisplayFormat = 'number' | 'currency' | 'percent' | 'duration';

// === KPI Definitions (T-078) ===

export interface KpiDefinition {
  id: string;
  organization_id: string;
  
  kpi_code: string;
  kpi_name: string;
  category: KpiCategory;
  
  description?: string;
  calculation_formula?: string;
  
  target_value?: number;
  target_unit?: string;
  target_direction?: TargetDirection;
  
  warning_threshold_low?: number;
  warning_threshold_high?: number;
  critical_threshold_low?: number;
  critical_threshold_high?: number;
  
  display_format: DisplayFormat;
  decimal_places: number;
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KpiValue {
  id: string;
  organization_id: string;
  kpi_id: string;
  
  period_type: string;
  period_date: string;
  
  actual_value?: number;
  target_value?: number;
  previous_value?: number;
  
  variance_amount?: number;
  variance_percent?: number;
  
  status?: KpiStatus;
  
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface KpiDashboardView {
  kpi_id: string;
  organization_id: string;
  kpi_code: string;
  kpi_name: string;
  category: KpiCategory;
  target_direction?: TargetDirection;
  display_format: DisplayFormat;
  
  period_date?: string;
  actual_value?: number;
  target_value?: number;
  previous_value?: number;
  variance_percent?: number;
  status?: KpiStatus;
}

export interface CreateKpiDefinitionInput {
  kpi_code: string;
  kpi_name: string;
  category: KpiCategory;
  description?: string;
  calculation_formula?: string;
  target_value?: number;
  target_unit?: string;
  target_direction?: TargetDirection;
  warning_threshold_low?: number;
  warning_threshold_high?: number;
  critical_threshold_low?: number;
  critical_threshold_high?: number;
  display_format?: DisplayFormat;
  decimal_places?: number;
}

// === Dashboards (T-079) ===

export interface Dashboard {
  id: string;
  organization_id: string;
  
  dashboard_code: string;
  dashboard_name: string;
  description?: string;
  
  layout_type: 'grid' | 'flex' | 'masonry';
  layout_columns: number;
  
  is_public: boolean;
  is_default: boolean;
  created_by?: string;
  
  default_filters?: Record<string, unknown>;
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  id: string;
  dashboard_id: string;
  
  widget_code: string;
  widget_title: string;
  widget_type: WidgetType;
  
  data_source: string;
  data_query?: Record<string, unknown>;
  
  grid_x: number;
  grid_y: number;
  grid_width: number;
  grid_height: number;
  
  chart_config?: ChartConfig;
  
  refresh_interval_seconds?: number;
  auto_refresh: boolean;
  
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChartConfig {
  type?: string;
  colors?: string[];
  xAxis?: { field: string; label?: string };
  yAxis?: { field: string; label?: string };
  series?: Array<{ field: string; name: string; color?: string }>;
  legend?: boolean;
  tooltip?: boolean;
  animation?: boolean;
}

export interface DashboardWithWidgets extends Dashboard {
  widgets: DashboardWidget[];
}

export interface CreateDashboardInput {
  dashboard_code: string;
  dashboard_name: string;
  description?: string;
  layout_type?: 'grid' | 'flex' | 'masonry';
  layout_columns?: number;
  is_public?: boolean;
  is_default?: boolean;
  default_filters?: Record<string, unknown>;
}

export interface CreateWidgetInput {
  dashboard_id: string;
  widget_code: string;
  widget_title: string;
  widget_type: WidgetType;
  data_source: string;
  data_query?: Record<string, unknown>;
  grid_x?: number;
  grid_y?: number;
  grid_width?: number;
  grid_height?: number;
  chart_config?: ChartConfig;
  refresh_interval_seconds?: number;
  auto_refresh?: boolean;
}

// === Reports (T-080) ===

export interface ReportDefinition {
  id: string;
  organization_id: string;
  
  report_code: string;
  report_name: string;
  description?: string;
  category?: string;
  
  report_type: 'pdf' | 'excel' | 'csv';
  template_path?: string;
  query_definition: Record<string, unknown>;
  
  parameters?: ReportParameter[];
  
  frequency: ReportFrequency;
  schedule_config?: ScheduleConfig;
  next_run_at?: string;
  
  email_recipients?: string[];
  auto_send: boolean;
  
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportParameter {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'daterange' | 'select' | 'multiselect';
  required: boolean;
  default_value?: unknown;
  options?: Array<{ value: unknown; label: string }>;
}

export interface ScheduleConfig {
  time?: string;
  day_of_week?: number;
  day_of_month?: number;
  timezone?: string;
}

export interface GeneratedReport {
  id: string;
  organization_id: string;
  report_definition_id: string;
  
  report_name: string;
  report_date: string;
  
  parameters_used?: Record<string, unknown>;
  
  status: ReportStatus;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  
  file_path?: string;
  file_size_bytes?: number;
  format?: string;
  
  generated_by?: string;
  created_at: string;
}

export interface CreateReportDefinitionInput {
  report_code: string;
  report_name: string;
  description?: string;
  category?: string;
  report_type: 'pdf' | 'excel' | 'csv';
  template_path?: string;
  query_definition: Record<string, unknown>;
  parameters?: ReportParameter[];
  frequency?: ReportFrequency;
  schedule_config?: ScheduleConfig;
  email_recipients?: string[];
  auto_send?: boolean;
}

export interface GenerateReportInput {
  report_definition_id: string;
  parameters?: Record<string, unknown>;
  format?: 'pdf' | 'excel' | 'csv';
}

// === Business Alerts (T-081) ===

export interface BusinessAlert {
  id: string;
  organization_id: string;
  
  alert_code: string;
  alert_title: string;
  alert_message: string;
  
  category?: string;
  severity: AlertSeverity;
  
  source_type?: string;
  source_id?: string;
  source_reference?: string;
  
  status: AlertStatus;
  triggered_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  
  escalation_level: number;
  last_escalated_at?: string;
  
  notification_sent: boolean;
  notification_channels?: string[];
  
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface AlertSummary {
  organization_id: string;
  critical_active: number;
  warning_active: number;
  info_active: number;
  total_active: number;
  acknowledged: number;
  triggered_today?: number;
}

export interface AcknowledgeAlertInput {
  alert_id: string;
  acknowledged_by: string;
}

export interface ResolveAlertInput {
  alert_id: string;
  resolved_by: string;
  resolution_notes?: string;
}

export interface AlertFilters {
  organization_id: string;
  severity?: AlertSeverity | AlertSeverity[];
  status?: AlertStatus | AlertStatus[];
  category?: string;
  source_type?: string;
  date_from?: string;
  date_to?: string;
}

// === Executive Snapshots (T-082) ===

export interface ExecutiveSnapshot {
  id: string;
  organization_id: string;
  
  snapshot_date: string;
  snapshot_type: 'daily' | 'weekly' | 'monthly';
  
  // Operations
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  completion_rate?: number;
  avg_delivery_time_minutes?: number;
  
  // Financial
  total_revenue: number;
  total_costs: number;
  gross_profit: number;
  margin_percent?: number;
  
  // Fleet
  total_vehicles: number;
  active_vehicles: number;
  fleet_utilization_percent?: number;
  
  // Workforce
  total_employees: number;
  active_riders: number;
  avg_orders_per_rider?: number;
  
  // Compliance
  compliance_score?: number;
  overdue_items: number;
  
  // Comparisons
  revenue_vs_previous?: number;
  orders_vs_previous?: number;
  
  notes?: string;
  created_at: string;
}

export interface ExecutiveSummaryFilters {
  organization_id: string;
  snapshot_type?: 'daily' | 'weekly' | 'monthly';
  date_from?: string;
  date_to?: string;
}

// === Dashboard Data Types ===

export interface CounterWidgetData {
  value: number;
  label: string;
  change?: number;
  change_direction?: 'up' | 'down' | 'flat';
  comparison_label?: string;
}

export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
}

export interface ChartWidgetData {
  series: ChartSeries[];
  categories?: string[];
  total?: number;
}

export interface TableWidgetData {
  columns: Array<{ key: string; label: string; type?: string }>;
  rows: Array<Record<string, unknown>>;
  total_count?: number;
}

export interface GaugeWidgetData {
  value: number;
  min: number;
  max: number;
  target?: number;
  zones?: Array<{ from: number; to: number; color: string }>;
}

// === Report Types ===

export interface ReportFilters {
  organization_id: string;
  category?: string;
  frequency?: ReportFrequency;
  is_active?: boolean;
}

export interface GeneratedReportFilters {
  organization_id: string;
  report_definition_id?: string;
  status?: ReportStatus;
  date_from?: string;
  date_to?: string;
}
