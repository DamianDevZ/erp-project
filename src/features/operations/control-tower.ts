'use client';

/**
 * Control Tower Dashboard Service (T-037)
 * 
 * Central operations dashboard aggregating data from all systems.
 * Provides real-time visibility into workforce, fleet, and operations.
 */

import { createClient } from '@/lib/supabase/client';
import { getEligibilitySummary } from '../employees/eligibility';
import { getExpiryDashboard, getUrgentExpiryItems } from '../employees/expiry-alerts';
import { getFleetHealthSummary, getActiveBreakdowns, getMaintenanceDueVehicles } from '../assets/fleet-breakdown';

// ============================================================================
// TYPES
// ============================================================================

export interface ControlTowerMetrics {
  timestamp: string;
  workforce: WorkforceMetrics;
  fleet: FleetMetrics;
  operations: OperationsMetrics;
  compliance: ComplianceMetrics;
  alerts: AlertItem[];
}

export interface WorkforceMetrics {
  totalEmployees: number;
  activeRiders: number;
  eligibleRiders: number;
  blockedRiders: number;
  onLeaveToday: number;
  pendingOnboarding: number;
  byStatus: Record<string, number>;
  byRole: Record<string, number>;
}

export interface FleetMetrics {
  totalVehicles: number;
  availableVehicles: number;
  assignedVehicles: number;
  inMaintenance: number;
  offRoad: number;
  activeBreakdowns: number;
  serviceDueSoon: number;
}

export interface OperationsMetrics {
  shiftsToday: number;
  ridersScheduledToday: number;
  missedCheckIns: number;
  activeIncidents: number;
  ordersInProgress: number;
  ordersCompletedToday: number;
}

export interface ComplianceMetrics {
  documentsExpired: number;
  documentsExpiring7Days: number;
  documentsExpiring30Days: number;
  vehicleComplianceIssues: number;
  ridersWithWarnings: number;
}

export type ControlTowerAlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertCategory = 'compliance' | 'fleet' | 'workforce' | 'operations';

export interface AlertItem {
  id: string;
  category: AlertCategory;
  severity: ControlTowerAlertSeverity;
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actionUrl?: string;
}

// ============================================================================
// MAIN DASHBOARD AGGREGATION
// ============================================================================

/**
 * Get complete control tower metrics.
 */
export async function getControlTowerMetrics(): Promise<ControlTowerMetrics> {
  const [
    workforce,
    fleet,
    operations,
    compliance,
    alerts,
  ] = await Promise.all([
    getWorkforceMetrics(),
    getFleetMetrics(),
    getOperationsMetrics(),
    getComplianceMetrics(),
    getAlerts(),
  ]);

  return {
    timestamp: new Date().toISOString(),
    workforce,
    fleet,
    operations,
    compliance,
    alerts,
  };
}

// ============================================================================
// WORKFORCE METRICS
// ============================================================================

async function getWorkforceMetrics(): Promise<WorkforceMetrics> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  // Get all employees with status breakdown
  const { data: employees } = await supabase
    .from('employees')
    .select('id, role, status, onboarding_step');

  const byStatus: Record<string, number> = {};
  const byRole: Record<string, number> = {};
  
  for (const emp of employees || []) {
    byStatus[emp.status] = (byStatus[emp.status] || 0) + 1;
    byRole[emp.role] = (byRole[emp.role] || 0) + 1;
  }

  const totalEmployees = employees?.length || 0;
  const activeRiders = employees?.filter(e => e.role === 'rider' && e.status === 'active').length || 0;
  const pendingOnboarding = employees?.filter(e => e.onboarding_step && e.onboarding_step !== 'activated').length || 0;

  // Get eligibility summary
  const eligibility = await getEligibilitySummary();

  // Get employees on leave today
  const { data: leaveToday } = await supabase
    .from('leaves')
    .select('id')
    .eq('status', 'approved')
    .lte('start_date', today)
    .gte('end_date', today);

  return {
    totalEmployees,
    activeRiders,
    eligibleRiders: eligibility.eligibleRiders,
    blockedRiders: eligibility.blockedRiders,
    onLeaveToday: leaveToday?.length || 0,
    pendingOnboarding,
    byStatus,
    byRole,
  };
}

// ============================================================================
// FLEET METRICS
// ============================================================================

async function getFleetMetrics(): Promise<FleetMetrics> {
  const supabase = createClient();

  // Get vehicle status counts
  const { data: vehicles } = await supabase
    .from('assets')
    .select('vehicle_status')
    .eq('asset_type', 'vehicle')
    .eq('is_active', true);

  const totalVehicles = vehicles?.length || 0;
  const availableVehicles = vehicles?.filter(v => v.vehicle_status === 'available').length || 0;
  const assignedVehicles = vehicles?.filter(v => v.vehicle_status === 'assigned').length || 0;
  const inMaintenance = vehicles?.filter(v => v.vehicle_status === 'maintenance').length || 0;
  const offRoad = vehicles?.filter(v => v.vehicle_status === 'off_road').length || 0;

  // Get active breakdowns
  const breakdowns = await getActiveBreakdowns();
  
  // Get vehicles due for service (next 14 days)
  const serviceDue = await getMaintenanceDueVehicles(14);

  return {
    totalVehicles,
    availableVehicles,
    assignedVehicles,
    inMaintenance,
    offRoad,
    activeBreakdowns: breakdowns.length,
    serviceDueSoon: serviceDue.length,
  };
}

// ============================================================================
// OPERATIONS METRICS
// ============================================================================

async function getOperationsMetrics(): Promise<OperationsMetrics> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  // Get today's shifts
  const { data: shiftsToday } = await supabase
    .from('shifts')
    .select('id')
    .eq('shift_date', today);

  // Get riders scheduled today
  const { data: assignmentsToday } = await supabase
    .from('shift_assignments')
    .select('employee_id, shift:shifts(shift_date)')
    .eq('status', 'assigned');

  const ridersScheduledToday = new Set(
    (assignmentsToday || [])
      .filter((a) => {
        // Shift relation may come as array from Supabase
        const shiftData = a.shift as unknown;
        const shift = (Array.isArray(shiftData) ? shiftData[0] : shiftData) as { shift_date: string } | null;
        return shift?.shift_date === today;
      })
      .map((a) => a.employee_id)
  ).size;

  // Get missed check-ins (shift started but no attendance)
  const now = new Date();
  const currentHour = now.getHours().toString().padStart(2, '0') + ':00:00';
  
  const { data: startedShifts } = await supabase
    .from('shifts')
    .select(`
      id,
      shift_assignments!inner(employee_id)
    `)
    .eq('shift_date', today)
    .lt('start_time', currentHour);

  // For simplicity, assume missed check-ins equals shifts started without attendance
  // In production, this would check actual check-in records
  const missedCheckIns = 0; // Placeholder - needs attendance check

  // Get active incidents
  const { data: incidents } = await supabase
    .from('incidents')
    .select('id')
    .in('status', ['reported', 'investigating', 'in_progress']);

  // Get orders (if order table exists)
  let ordersInProgress = 0;
  let ordersCompletedToday = 0;
  try {
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('id')
      .in('status', ['pending', 'assigned', 'in_transit']);
    ordersInProgress = activeOrders?.length || 0;

    const { data: completedOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'completed')
      .gte('completed_at', `${today}T00:00:00`);
    ordersCompletedToday = completedOrders?.length || 0;
  } catch {
    // Orders table may not exist
  }

  return {
    shiftsToday: shiftsToday?.length || 0,
    ridersScheduledToday,
    missedCheckIns,
    activeIncidents: incidents?.length || 0,
    ordersInProgress,
    ordersCompletedToday,
  };
}

// ============================================================================
// COMPLIANCE METRICS
// ============================================================================

async function getComplianceMetrics(): Promise<ComplianceMetrics> {
  const expiryDashboard = await getExpiryDashboard();
  const eligibility = await getEligibilitySummary();

  // Count vehicle compliance issues
  const supabase = createClient();
  const { data: nonCompliantVehicles } = await supabase
    .from('assets')
    .select('id')
    .eq('asset_type', 'vehicle')
    .eq('is_active', true)
    .in('compliance_status', ['non_compliant', 'blocked']);

  return {
    documentsExpired: expiryDashboard.summary.totalExpired,
    documentsExpiring7Days: expiryDashboard.summary.totalExpiringThisWeek,
    documentsExpiring30Days: expiryDashboard.summary.totalExpiringThisMonth,
    vehicleComplianceIssues: nonCompliantVehicles?.length || 0,
    ridersWithWarnings: eligibility.ridersWithWarnings,
  };
}

// ============================================================================
// ALERTS GENERATION
// ============================================================================

async function getAlerts(): Promise<AlertItem[]> {
  const alerts: AlertItem[] = [];
  const supabase = createClient();

  // Get urgent expiring items (expired + expiring within 7 days)
  const urgentExpiries = await getUrgentExpiryItems();
  for (const item of urgentExpiries.slice(0, 10)) { // Limit to top 10
    alerts.push({
      id: `expiry-${item.id}`,
      category: 'compliance',
      severity: item.daysUntilExpiry <= 0 ? 'critical' : item.daysUntilExpiry <= 3 ? 'high' : 'medium',
      title: item.status === 'expired' ? `${item.type.replace(/_/g, ' ')} Expired` : `${item.type.replace(/_/g, ' ')} Expiring`,
      description: `${item.entityName}: ${item.description}`,
      entityType: item.entityType,
      entityId: item.entityId,
      createdAt: new Date().toISOString(),
      actionUrl: item.entityType === 'employee' 
        ? `/dashboard/employees/${item.entityId}`
        : `/dashboard/fleet/${item.entityId}`,
    });
  }

  // Get critical breakdowns
  const breakdowns = await getActiveBreakdowns();
  for (const breakdown of breakdowns.filter(b => b.severity === 'critical').slice(0, 5)) {
    alerts.push({
      id: `breakdown-${breakdown.id}`,
      category: 'fleet',
      severity: 'critical',
      title: 'Critical Vehicle Breakdown',
      description: `${breakdown.vehiclePlate}: ${breakdown.description.substring(0, 100)}`,
      entityType: 'asset',
      entityId: breakdown.vehicleId,
      createdAt: breakdown.reportedAt,
      actionUrl: `/dashboard/fleet/breakdowns/${breakdown.id}`,
    });
  }

  // Get blocked riders
  const eligibility = await getEligibilitySummary();
  if (eligibility.blockedRiders > 0) {
    alerts.push({
      id: 'blocked-riders',
      category: 'workforce',
      severity: eligibility.blockedRiders > 5 ? 'high' : 'medium',
      title: 'Riders Blocked from Work',
      description: `${eligibility.blockedRiders} rider(s) currently ineligible due to compliance issues`,
      entityType: 'summary',
      entityId: 'blocked-riders',
      createdAt: new Date().toISOString(),
      actionUrl: '/dashboard/employees?filter=blocked',
    });
  }

  // Check for pending onboarding
  const { data: pendingOnboarding } = await supabase
    .from('employees')
    .select('id')
    .neq('onboarding_step', 'activated')
    .not('onboarding_step', 'is', null);

  if (pendingOnboarding && pendingOnboarding.length > 3) {
    alerts.push({
      id: 'pending-onboarding',
      category: 'workforce',
      severity: pendingOnboarding.length > 10 ? 'high' : 'medium',
      title: 'Pending Onboarding',
      description: `${pendingOnboarding.length} employee(s) have incomplete onboarding`,
      entityType: 'summary',
      entityId: 'pending-onboarding',
      createdAt: new Date().toISOString(),
      actionUrl: '/dashboard/onboarding',
    });
  }

  // Sort by severity
  const severityOrder: Record<ControlTowerAlertSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

// ============================================================================
// LIVE ACTIVITY STREAM
// ============================================================================

export interface ActivityItem {
  id: string;
  type: 'shift_start' | 'shift_end' | 'breakdown' | 'document_upload' | 'leave_request' | 'incident' | 'onboarding';
  title: string;
  description: string;
  employeeId?: string;
  employeeName?: string;
  timestamp: string;
}

/**
 * Get recent activity for live feed.
 */
export async function getRecentActivity(limit: number = 20): Promise<ActivityItem[]> {
  const supabase = createClient();
  const activities: ActivityItem[] = [];
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Get recent attendance (shift starts/ends)
  const { data: recentAttendance } = await supabase
    .from('attendance')
    .select(`
      id,
      check_in_time,
      check_out_time,
      employee:employees(id, full_name)
    `)
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false })
    .limit(10);

  for (const att of recentAttendance || []) {
    // Relations may come as arrays from Supabase
    const employeeData = att.employee as unknown;
    const employee = (Array.isArray(employeeData) ? employeeData[0] : employeeData) as { id: string; full_name: string } | null;
    if (att.check_in_time) {
      activities.push({
        id: `checkin-${att.id}`,
        type: 'shift_start',
        title: 'Shift Started',
        description: `${employee?.full_name || 'Unknown'} checked in`,
        employeeId: employee?.id,
        employeeName: employee?.full_name || undefined,
        timestamp: att.check_in_time,
      });
    }
    if (att.check_out_time) {
      activities.push({
        id: `checkout-${att.id}`,
        type: 'shift_end',
        title: 'Shift Ended',
        description: `${employee?.full_name || 'Unknown'} checked out`,
        employeeId: employee?.id,
        employeeName: employee?.full_name || undefined,
        timestamp: att.check_out_time,
      });
    }
  }

  // Get recent breakdowns
  const { data: recentBreakdowns } = await supabase
    .from('vehicle_breakdowns')
    .select(`
      id,
      description,
      reported_at,
      vehicle:assets(license_plate),
      rider:employees(id, full_name)
    `)
    .gte('reported_at', oneDayAgo)
    .order('reported_at', { ascending: false })
    .limit(5);

  for (const breakdown of recentBreakdowns || []) {
    // Relations may come as arrays from Supabase
    const vehicleData = breakdown.vehicle as unknown;
    const riderData = breakdown.rider as unknown;
    const vehicle = (Array.isArray(vehicleData) ? vehicleData[0] : vehicleData) as { license_plate: string } | null;
    const rider = (Array.isArray(riderData) ? riderData[0] : riderData) as { id: string; full_name: string } | null;
    activities.push({
      id: `breakdown-${breakdown.id}`,
      type: 'breakdown',
      title: 'Breakdown Reported',
      description: `${vehicle?.license_plate || 'Unknown'}: ${breakdown.description.substring(0, 50)}`,
      employeeId: rider?.id,
      employeeName: rider?.full_name || undefined,
      timestamp: breakdown.reported_at,
    });
  }

  // Get recent leave requests
  const { data: recentLeaves } = await supabase
    .from('leaves')
    .select(`
      id,
      leave_type,
      status,
      created_at,
      employee:employees(id, full_name)
    `)
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false })
    .limit(5);

  for (const leave of recentLeaves || []) {
    // Relations may come as arrays from Supabase
    const employeeData = leave.employee as unknown;
    const employee = (Array.isArray(employeeData) ? employeeData[0] : employeeData) as { id: string; full_name: string } | null;
    activities.push({
      id: `leave-${leave.id}`,
      type: 'leave_request',
      title: `Leave ${leave.status === 'pending' ? 'Request' : leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}`,
      description: `${employee?.full_name || 'Unknown'}: ${leave.leave_type} leave`,
      employeeId: employee?.id,
      employeeName: employee?.full_name || undefined,
      timestamp: leave.created_at,
    });
  }

  // Sort by timestamp and return
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

// ============================================================================
// QUICK STATS FOR DASHBOARD CARDS
// ============================================================================

export interface QuickStat {
  label: string;
  value: number | string;
  change?: number; // percentage change from yesterday
  trend?: 'up' | 'down' | 'neutral';
  color?: 'green' | 'red' | 'yellow' | 'blue';
}

export async function getQuickStats(): Promise<QuickStat[]> {
  const metrics = await getControlTowerMetrics();

  return [
    {
      label: 'Active Riders',
      value: metrics.workforce.activeRiders,
      color: 'blue',
    },
    {
      label: 'Eligible to Work',
      value: metrics.workforce.eligibleRiders,
      color: 'green',
    },
    {
      label: 'Blocked',
      value: metrics.workforce.blockedRiders,
      color: metrics.workforce.blockedRiders > 0 ? 'red' : 'green',
    },
    {
      label: 'On Leave',
      value: metrics.workforce.onLeaveToday,
      color: 'yellow',
    },
    {
      label: 'Available Vehicles',
      value: metrics.fleet.availableVehicles,
      color: 'green',
    },
    {
      label: 'In Maintenance',
      value: metrics.fleet.inMaintenance,
      color: metrics.fleet.inMaintenance > 0 ? 'yellow' : 'green',
    },
    {
      label: 'Active Breakdowns',
      value: metrics.fleet.activeBreakdowns,
      color: metrics.fleet.activeBreakdowns > 0 ? 'red' : 'green',
    },
    {
      label: 'Documents Expired',
      value: metrics.compliance.documentsExpired,
      color: metrics.compliance.documentsExpired > 0 ? 'red' : 'green',
    },
  ];
}
