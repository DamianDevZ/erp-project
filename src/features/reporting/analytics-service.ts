'use client';

/**
 * Reporting & Analytics Service (T-079 to T-081)
 * 
 * Manages:
 * - Dashboard reports
 * - Data exports
 * - Analytics and metrics
 * - Scheduled reports
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type ReportType = 
  | 'operations'
  | 'financial'
  | 'workforce'
  | 'assets'
  | 'performance'
  | 'compliance';

export type ReportPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

export interface ReportDefinition {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  parameters: ReportParameter[];
  createdBy: string;
  isSystem: boolean;
  isActive: boolean;
}

export interface ReportParameter {
  name: string;
  label: string;
  type: 'date' | 'daterange' | 'select' | 'multiselect' | 'text' | 'number';
  required: boolean;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: unknown;
}

export interface ScheduledReport {
  id: string;
  reportId: string;
  reportName: string;
  schedule: 'daily' | 'weekly' | 'monthly';
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  recipients: string[];
  format: ExportFormat;
  parameters: Record<string, unknown>;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
}

export interface DashboardMetric {
  key: string;
  label: string;
  value: number;
  previousValue: number | null;
  change: number | null;
  changeType: 'increase' | 'decrease' | 'neutral';
  unit?: string;
  format?: 'number' | 'currency' | 'percentage';
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
  }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  operations: 'Operations',
  financial: 'Financial',
  workforce: 'Workforce',
  assets: 'Assets',
  performance: 'Performance',
  compliance: 'Compliance',
};

// ============================================================================
// DASHBOARD METRICS
// ============================================================================

/**
 * Get operations dashboard metrics.
 */
export async function getOperationsDashboard(): Promise<{
  metrics: DashboardMetric[];
  charts: Record<string, ChartData>;
}> {
  const supabase = createClient();
  
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
  
  // Orders today
  const { count: ordersToday } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today);
  
  const { count: ordersYesterday } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', yesterday)
    .lt('created_at', today);
  
  // Active riders
  const { count: activeRiders } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'rider')
    .eq('status', 'active');
  
  // Riders on duty
  const { count: ridersOnDuty } = await supabase
    .from('shift_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('date', today)
    .not('actual_start', 'is', null)
    .is('actual_end', null);
  
  // Vehicles available
  const { count: vehiclesAvailable } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('category', 'vehicle')
    .eq('status', 'available');
  
  const { count: totalVehicles } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('category', 'vehicle')
    .neq('status', 'retired');
  
  // Open incidents
  const { count: openIncidents } = await supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true })
    .in('status', ['reported', 'under_investigation', 'pending_action']);
  
  // Revenue this month
  const { data: monthRevenue } = await supabase
    .from('orders')
    .select('order_value')
    .eq('status', 'completed')
    .gte('completed_at', monthStart);
  
  const revenueThisMonth = monthRevenue?.reduce((sum, o) => sum + (o.order_value || 0), 0) || 0;
  
  const { data: lastMonthRevenue } = await supabase
    .from('orders')
    .select('order_value')
    .eq('status', 'completed')
    .gte('completed_at', lastMonthStart)
    .lte('completed_at', lastMonthEnd);
  
  const revenueLastMonth = lastMonthRevenue?.reduce((sum, o) => sum + (o.order_value || 0), 0) || 0;
  
  const metrics: DashboardMetric[] = [
    {
      key: 'orders_today',
      label: 'Orders Today',
      value: ordersToday || 0,
      previousValue: ordersYesterday || 0,
      change: ordersYesterday ? Math.round(((ordersToday || 0) - ordersYesterday) / ordersYesterday * 100) : null,
      changeType: (ordersToday || 0) >= (ordersYesterday || 0) ? 'increase' : 'decrease',
      format: 'number',
    },
    {
      key: 'active_riders',
      label: 'Active Riders',
      value: activeRiders || 0,
      previousValue: null,
      change: null,
      changeType: 'neutral',
      format: 'number',
    },
    {
      key: 'riders_on_duty',
      label: 'Riders On Duty',
      value: ridersOnDuty || 0,
      previousValue: activeRiders || 0,
      change: activeRiders ? Math.round(((ridersOnDuty || 0) / activeRiders) * 100) : null,
      changeType: 'neutral',
      format: 'percentage',
    },
    {
      key: 'fleet_availability',
      label: 'Fleet Availability',
      value: totalVehicles ? Math.round(((vehiclesAvailable || 0) / totalVehicles) * 100) : 0,
      previousValue: null,
      change: null,
      changeType: 'neutral',
      unit: '%',
      format: 'percentage',
    },
    {
      key: 'open_incidents',
      label: 'Open Incidents',
      value: openIncidents || 0,
      previousValue: null,
      change: null,
      changeType: (openIncidents || 0) > 5 ? 'decrease' : 'neutral',
      format: 'number',
    },
    {
      key: 'revenue_mtd',
      label: 'Revenue MTD',
      value: revenueThisMonth,
      previousValue: revenueLastMonth,
      change: revenueLastMonth ? Math.round((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100) : null,
      changeType: revenueThisMonth >= revenueLastMonth ? 'increase' : 'decrease',
      unit: 'AED',
      format: 'currency',
    },
  ];
  
  // Orders by day (last 7 days)
  const { data: ordersByDay } = await supabase
    .from('orders')
    .select('created_at')
    .gte('created_at', weekAgo);
  
  const dayLabels: string[] = [];
  const dailyOrders: number[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().slice(0, 10);
    dayLabels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    dailyOrders.push(ordersByDay?.filter(o => o.created_at.slice(0, 10) === dateStr).length || 0);
  }
  
  const charts: Record<string, ChartData> = {
    ordersTrend: {
      labels: dayLabels,
      datasets: [
        { label: 'Orders', data: dailyOrders, color: '#4F46E5' },
      ],
    },
  };
  
  return { metrics, charts };
}

/**
 * Get financial dashboard metrics.
 */
export async function getFinancialDashboard(): Promise<{
  metrics: DashboardMetric[];
  charts: Record<string, ChartData>;
}> {
  const supabase = createClient();
  
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
  
  // Revenue this month
  const { data: orders } = await supabase
    .from('orders')
    .select('order_value')
    .eq('status', 'completed')
    .gte('completed_at', monthStart);
  
  const revenueThisMonth = orders?.reduce((sum, o) => sum + (o.order_value || 0), 0) || 0;
  
  // Commissions paid
  const { data: commissions } = await supabase
    .from('order_commissions')
    .select('commission_amount')
    .eq('status', 'paid')
    .gte('created_at', monthStart);
  
  const commissionsPaid = commissions?.reduce((sum, c) => sum + c.commission_amount, 0) || 0;
  
  // Outstanding invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('amount_due')
    .in('status', ['sent', 'partial', 'overdue']);
  
  const outstandingInvoices = invoices?.reduce((sum, i) => sum + i.amount_due, 0) || 0;
  
  // Payroll this month
  const { data: payroll } = await supabase
    .from('payroll_periods')
    .select('total_net')
    .gte('start_date', monthStart)
    .eq('status', 'paid');
  
  const payrollThisMonth = payroll?.reduce((sum, p) => sum + p.total_net, 0) || 0;
  
  const metrics: DashboardMetric[] = [
    {
      key: 'revenue_mtd',
      label: 'Revenue MTD',
      value: revenueThisMonth,
      previousValue: null,
      change: null,
      changeType: 'neutral',
      unit: 'AED',
      format: 'currency',
    },
    {
      key: 'commissions_paid',
      label: 'Commissions Paid',
      value: commissionsPaid,
      previousValue: null,
      change: null,
      changeType: 'neutral',
      unit: 'AED',
      format: 'currency',
    },
    {
      key: 'outstanding_invoices',
      label: 'Outstanding Invoices',
      value: outstandingInvoices,
      previousValue: null,
      change: null,
      changeType: outstandingInvoices > 50000 ? 'decrease' : 'neutral',
      unit: 'AED',
      format: 'currency',
    },
    {
      key: 'payroll_mtd',
      label: 'Payroll MTD',
      value: payrollThisMonth,
      previousValue: null,
      change: null,
      changeType: 'neutral',
      unit: 'AED',
      format: 'currency',
    },
  ];
  
  // Revenue by month (YTD)
  const { data: yearOrders } = await supabase
    .from('orders')
    .select('completed_at, order_value')
    .eq('status', 'completed')
    .gte('completed_at', yearStart);
  
  const monthlyRevenue: number[] = new Array(12).fill(0);
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  for (const order of yearOrders || []) {
    const month = new Date(order.completed_at).getMonth();
    monthlyRevenue[month] += order.order_value || 0;
  }
  
  const charts: Record<string, ChartData> = {
    revenueTrend: {
      labels: monthLabels.slice(0, now.getMonth() + 1),
      datasets: [
        { label: 'Revenue', data: monthlyRevenue.slice(0, now.getMonth() + 1), color: '#10B981' },
      ],
    },
  };
  
  return { metrics, charts };
}

/**
 * Get workforce dashboard metrics.
 */
export async function getWorkforceDashboard(): Promise<{
  metrics: DashboardMetric[];
  charts: Record<string, ChartData>;
}> {
  const supabase = createClient();
  
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  
  // Total employees
  const { count: totalEmployees } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  
  // By role
  const { data: byRole } = await supabase
    .from('employees')
    .select('role')
    .eq('status', 'active');
  
  const riderCount = byRole?.filter(e => e.role === 'rider').length || 0;
  const adminCount = byRole?.filter(e => e.role === 'admin').length || 0;
  
  // Attendance today
  const { data: attendance } = await supabase
    .from('attendance')
    .select('status')
    .eq('date', today);
  
  const presentToday = attendance?.filter(a => a.status === 'present').length || 0;
  const attendanceRate = totalEmployees 
    ? Math.round((presentToday / (totalEmployees || 1)) * 100)
    : 0;
  
  // Leave requests pending
  const { count: pendingLeaves } = await supabase
    .from('leave_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  // New hires this month
  const { count: newHires } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .gte('hired_at', monthStart);
  
  const metrics: DashboardMetric[] = [
    {
      key: 'total_employees',
      label: 'Total Employees',
      value: totalEmployees || 0,
      previousValue: null,
      change: null,
      changeType: 'neutral',
      format: 'number',
    },
    {
      key: 'riders',
      label: 'Active Riders',
      value: riderCount,
      previousValue: null,
      change: null,
      changeType: 'neutral',
      format: 'number',
    },
    {
      key: 'attendance_rate',
      label: 'Attendance Today',
      value: attendanceRate,
      previousValue: null,
      change: null,
      changeType: attendanceRate > 90 ? 'increase' : 'decrease',
      unit: '%',
      format: 'percentage',
    },
    {
      key: 'pending_leaves',
      label: 'Pending Leave Requests',
      value: pendingLeaves || 0,
      previousValue: null,
      change: null,
      changeType: (pendingLeaves || 0) > 10 ? 'decrease' : 'neutral',
      format: 'number',
    },
    {
      key: 'new_hires',
      label: 'New Hires This Month',
      value: newHires || 0,
      previousValue: null,
      change: null,
      changeType: 'neutral',
      format: 'number',
    },
  ];
  
  const charts: Record<string, ChartData> = {
    employeesByRole: {
      labels: ['Riders', 'Admins', 'Other'],
      datasets: [
        { label: 'Count', data: [riderCount, adminCount, (totalEmployees || 0) - riderCount - adminCount], color: '#6366F1' },
      ],
    },
  };
  
  return { metrics, charts };
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Generate a report.
 */
export async function generateReport(
  reportId: string,
  parameters: Record<string, unknown>
): Promise<{ data: Record<string, unknown>[]; metadata: Record<string, unknown> }> {
  const supabase = createClient();
  
  // Get report definition
  const { data: report } = await supabase
    .from('report_definitions')
    .select('*')
    .eq('id', reportId)
    .single();
  
  if (!report) {
    throw new Error('Report not found');
  }
  
  // Generate based on report type
  let data: Record<string, unknown>[] = [];
  
  switch (report.name) {
    case 'orders_by_platform':
      data = await generateOrdersByPlatformReport(parameters);
      break;
    case 'rider_performance':
      data = await generateRiderPerformanceReport(parameters);
      break;
    case 'payroll_summary':
      data = await generatePayrollSummaryReport(parameters);
      break;
    case 'fleet_utilization':
      data = await generateFleetUtilizationReport(parameters);
      break;
    case 'compliance_status':
      data = await generateComplianceStatusReport(parameters);
      break;
    default:
      throw new Error('Unknown report');
  }
  
  return {
    data,
    metadata: {
      reportName: report.name,
      generatedAt: new Date().toISOString(),
      parameters,
      rowCount: data.length,
    },
  };
}

async function generateOrdersByPlatformReport(
  params: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const supabase = createClient();
  
  const startDate = params.startDate as string || new Date().toISOString().slice(0, 10);
  const endDate = params.endDate as string || new Date().toISOString().slice(0, 10);
  
  const { data } = await supabase
    .from('orders')
    .select(`
      platform_id,
      platform:platforms(name),
      status,
      order_value
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  // Group by platform
  const platformMap = new Map<string, { name: string; total: number; completed: number; value: number }>();
  
  for (const order of data || []) {
    const platform = order.platform as unknown;
    const platformData = (Array.isArray(platform) ? platform[0] : platform) as { name: string } | null;
    const existing = platformMap.get(order.platform_id) || { 
      name: platformData?.name || 'Unknown', 
      total: 0, 
      completed: 0, 
      value: 0 
    };
    existing.total++;
    if (order.status === 'completed') {
      existing.completed++;
      existing.value += order.order_value || 0;
    }
    platformMap.set(order.platform_id, existing);
  }
  
  return Array.from(platformMap.entries()).map(([id, data]) => ({
    platformId: id,
    platformName: data.name,
    totalOrders: data.total,
    completedOrders: data.completed,
    completionRate: (data.completed / data.total * 100).toFixed(1),
    totalValue: data.value,
  }));
}

async function generateRiderPerformanceReport(
  params: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const supabase = createClient();
  
  const startDate = params.startDate as string;
  const endDate = params.endDate as string;
  
  const { data: riders } = await supabase
    .from('employees')
    .select('id, full_name, employee_number')
    .eq('role', 'rider')
    .eq('status', 'active');
  
  const results: Record<string, unknown>[] = [];
  
  for (const rider of riders || []) {
    const { count: orders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('rider_id', rider.id)
      .eq('status', 'completed')
      .gte('completed_at', startDate)
      .lte('completed_at', endDate);
    
    const { data: ratings } = await supabase
      .from('order_ratings')
      .select('rating')
      .eq('rider_id', rider.id)
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    const avgRating = ratings?.length 
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(2)
      : 'N/A';
    
    const { count: incidents } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .eq('rider_id', rider.id)
      .gte('occurred_at', startDate)
      .lte('occurred_at', endDate);
    
    results.push({
      riderId: rider.id,
      riderName: rider.full_name,
      employeeNumber: rider.employee_number,
      ordersCompleted: orders || 0,
      averageRating: avgRating,
      incidents: incidents || 0,
    });
  }
  
  return results.sort((a, b) => (b.ordersCompleted as number) - (a.ordersCompleted as number));
}

async function generatePayrollSummaryReport(
  params: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const supabase = createClient();
  
  const periodId = params.periodId as string;
  
  const { data } = await supabase
    .from('pay_slips')
    .select('*')
    .eq('payroll_period_id', periodId);
  
  return (data || []).map(slip => ({
    employeeName: slip.employee_name,
    employeeNumber: slip.employee_number,
    baseSalary: slip.base_salary,
    grossPay: slip.gross_pay,
    totalDeductions: (slip.deductions as { total: number })?.total || 0,
    netPay: slip.net_pay,
    paymentMethod: slip.payment_method,
    status: slip.status,
  }));
}

async function generateFleetUtilizationReport(
  params: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const supabase = createClient();
  
  const { data: vehicles } = await supabase
    .from('assets')
    .select(`
      id,
      name,
      license_plate,
      status,
      assigned_to,
      assigned:employees(full_name)
    `)
    .eq('category', 'vehicle');
  
  return (vehicles || []).map(v => {
    const assigned = v.assigned as unknown;
    const assignedData = (Array.isArray(assigned) ? assigned[0] : assigned) as { full_name: string } | null;
    
    return {
      vehicleId: v.id,
      vehicleName: v.name,
      licensePlate: v.license_plate,
      status: v.status,
      assignedTo: assignedData?.full_name || 'Unassigned',
      isUtilized: v.status === 'in_use' ? 'Yes' : 'No',
    };
  });
}

async function generateComplianceStatusReport(
  _params: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const supabase = createClient();
  
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: documents } = await supabase
    .from('documents')
    .select(`
      id,
      document_type,
      employee_id,
      expires_at,
      employee:employees(full_name)
    `)
    .lte('expires_at', thirtyDays)
    .order('expires_at');
  
  return (documents || []).map(doc => {
    const employee = doc.employee as unknown;
    const employeeData = (Array.isArray(employee) ? employee[0] : employee) as { full_name: string } | null;
    const expiresAt = new Date(doc.expires_at);
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      documentId: doc.id,
      documentType: doc.document_type,
      employeeName: employeeData?.full_name || 'Unknown',
      expiresAt: doc.expires_at,
      daysUntilExpiry,
      status: daysUntilExpiry <= 0 ? 'Expired' : daysUntilExpiry <= 7 ? 'Critical' : 'Warning',
    };
  });
}

// ============================================================================
// EXPORT
// ============================================================================

/**
 * Export report data.
 */
export async function exportReport(
  data: Record<string, unknown>[],
  format: ExportFormat,
  filename: string
): Promise<{ url: string; expiresAt: string }> {
  // Implementation would generate actual file
  // For now, return placeholder
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  return {
    url: `/api/exports/${filename}.${format}`,
    expiresAt,
  };
}

// ============================================================================
// SCHEDULED REPORTS
// ============================================================================

/**
 * Create scheduled report.
 */
export async function createScheduledReport(input: {
  reportId: string;
  schedule: ScheduledReport['schedule'];
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  recipients: string[];
  format: ExportFormat;
  parameters: Record<string, unknown>;
}): Promise<{ success: boolean; scheduleId?: string; error?: string }> {
  const supabase = createClient();
  
  const nextRunAt = calculateNextRun(input.schedule, input.time, input.dayOfWeek, input.dayOfMonth);
  
  const { data, error } = await supabase
    .from('scheduled_reports')
    .insert({
      report_id: input.reportId,
      schedule: input.schedule,
      time: input.time,
      day_of_week: input.dayOfWeek,
      day_of_month: input.dayOfMonth,
      recipients: input.recipients,
      format: input.format,
      parameters: input.parameters,
      is_active: true,
      next_run_at: nextRunAt,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, scheduleId: data.id };
}

/**
 * Get scheduled reports.
 */
export async function getScheduledReports(): Promise<ScheduledReport[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('scheduled_reports')
    .select(`
      *,
      report:report_definitions(name)
    `)
    .eq('is_active', true)
    .order('next_run_at');
  
  return (data || []).map(sr => {
    const report = sr.report as unknown;
    const reportData = (Array.isArray(report) ? report[0] : report) as { name: string } | null;
    
    return {
      id: sr.id,
      reportId: sr.report_id,
      reportName: reportData?.name || 'Unknown',
      schedule: sr.schedule as ScheduledReport['schedule'],
      time: sr.time,
      dayOfWeek: sr.day_of_week,
      dayOfMonth: sr.day_of_month,
      recipients: sr.recipients,
      format: sr.format as ExportFormat,
      parameters: sr.parameters,
      isActive: sr.is_active,
      lastRunAt: sr.last_run_at,
      nextRunAt: sr.next_run_at,
    };
  });
}

function calculateNextRun(
  schedule: ScheduledReport['schedule'],
  time: string,
  dayOfWeek?: number,
  dayOfMonth?: number
): string {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  
  let next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  
  switch (schedule) {
    case 'weekly':
      while (next.getDay() !== (dayOfWeek || 1)) {
        next.setDate(next.getDate() + 1);
      }
      break;
    case 'monthly':
      next.setDate(dayOfMonth || 1);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      break;
  }
  
  return next.toISOString();
}

// ============================================================================
// REPORT DEFINITIONS
// ============================================================================

/**
 * Get available report definitions.
 */
export async function getReportDefinitions(
  type?: ReportType
): Promise<ReportDefinition[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('report_definitions')
    .select('*')
    .eq('is_active', true)
    .order('name');
  
  if (type) {
    query = query.eq('type', type);
  }
  
  const { data } = await query;
  
  return (data || []).map(r => ({
    id: r.id,
    name: r.name,
    type: r.type as ReportType,
    description: r.description,
    parameters: r.parameters as ReportParameter[],
    createdBy: r.created_by,
    isSystem: r.is_system,
    isActive: r.is_active,
  }));
}
