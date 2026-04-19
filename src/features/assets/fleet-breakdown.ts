'use client';

/**
 * Fleet Breakdown & Maintenance Service (T-038)
 * 
 * Tracks vehicle breakdowns, maintenance requests, and repair status.
 * Provides fleet health monitoring and maintenance scheduling.
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type BreakdownType = 
  | 'mechanical'
  | 'electrical'
  | 'tire'
  | 'accident'
  | 'battery'
  | 'fuel'
  | 'other';

export type BreakdownSeverity = 'minor' | 'moderate' | 'major' | 'critical';

export type BreakdownStatus = 
  | 'reported'
  | 'acknowledged'
  | 'in_progress'
  | 'parts_ordered'
  | 'completed'
  | 'cancelled';

export const BREAKDOWN_TYPE_LABELS: Record<BreakdownType, string> = {
  mechanical: 'Mechanical Issue',
  electrical: 'Electrical Issue',
  tire: 'Tire/Puncture',
  accident: 'Accident',
  battery: 'Battery',
  fuel: 'Fuel Issue',
  other: 'Other',
};

export const BREAKDOWN_SEVERITY_LABELS: Record<BreakdownSeverity, string> = {
  minor: 'Minor',
  moderate: 'Moderate',
  major: 'Major',
  critical: 'Critical (Vehicle Immobilized)',
};

export const BREAKDOWN_STATUS_LABELS: Record<BreakdownStatus, string> = {
  reported: 'Reported',
  acknowledged: 'Acknowledged',
  in_progress: 'Repair In Progress',
  parts_ordered: 'Waiting for Parts',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export interface BreakdownReport {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  riderId: string | null;
  riderName: string | null;
  breakdownType: BreakdownType;
  severity: BreakdownSeverity;
  status: BreakdownStatus;
  location: string | null;
  description: string;
  reportedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  assignedTechnician: string | null;
  estimatedCost: number | null;
  actualCost: number | null;
  downtime: number | null; // hours
  repairNotes: string | null;
}

export interface BreakdownInput {
  vehicleId: string;
  riderId?: string;
  breakdownType: BreakdownType;
  severity: BreakdownSeverity;
  location?: string;
  description: string;
}

// ============================================================================
// BREAKDOWN REPORTING
// ============================================================================

/**
 * Report a vehicle breakdown.
 */
export async function reportBreakdown(
  input: BreakdownInput,
  reportedBy: string
): Promise<{ success: boolean; error?: string; breakdownId?: string }> {
  const supabase = createClient();

  // Get vehicle info
  const { data: vehicle } = await supabase
    .from('assets')
    .select('id, license_plate, vehicle_status')
    .eq('id', input.vehicleId)
    .single();

  if (!vehicle) {
    return { success: false, error: 'Vehicle not found' };
  }

  // Create breakdown record
  const { data: breakdown, error } = await supabase
    .from('vehicle_breakdowns')
    .insert({
      vehicle_id: input.vehicleId,
      rider_id: input.riderId,
      breakdown_type: input.breakdownType,
      severity: input.severity,
      location: input.location,
      description: input.description,
      status: 'reported',
      reported_at: new Date().toISOString(),
      reported_by: reportedBy,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Update vehicle status to maintenance if critical
  if (input.severity === 'critical' || input.severity === 'major') {
    await supabase
      .from('assets')
      .update({ vehicle_status: 'maintenance' })
      .eq('id', input.vehicleId);
  }

  // Create notification for fleet manager
  await supabase.from('notifications').insert({
    type: 'breakdown_reported',
    title: `Breakdown: ${vehicle.license_plate}`,
    message: `${BREAKDOWN_SEVERITY_LABELS[input.severity]} - ${BREAKDOWN_TYPE_LABELS[input.breakdownType]}`,
    target_type: 'asset',
    target_id: input.vehicleId,
    status: 'unread',
    created_by: reportedBy,
    priority: input.severity === 'critical' ? 'urgent' : 'normal',
  });

  return { success: true, breakdownId: breakdown.id };
}

/**
 * Acknowledge a breakdown report.
 */
export async function acknowledgeBreakdown(
  breakdownId: string,
  acknowledgedBy: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('vehicle_breakdowns')
    .update({
      status: 'acknowledged',
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: acknowledgedBy,
      notes: notes,
    })
    .eq('id', breakdownId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update breakdown status with repair progress.
 */
export async function updateBreakdownStatus(
  breakdownId: string,
  status: BreakdownStatus,
  updates: {
    assignedTechnician?: string;
    estimatedCost?: number;
    actualCost?: number;
    repairNotes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const updateData: Record<string, unknown> = { status };
  
  if (updates.assignedTechnician) updateData.assigned_technician = updates.assignedTechnician;
  if (updates.estimatedCost) updateData.estimated_cost = updates.estimatedCost;
  if (updates.actualCost) updateData.actual_cost = updates.actualCost;
  if (updates.repairNotes) updateData.repair_notes = updates.repairNotes;

  if (status === 'in_progress') {
    updateData.repair_started_at = new Date().toISOString();
  }

  if (status === 'completed') {
    updateData.resolved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('vehicle_breakdowns')
    .update(updateData)
    .eq('id', breakdownId);

  if (error) {
    return { success: false, error: error.message };
  }

  // If completed, update vehicle status back to available
  if (status === 'completed') {
    const { data: breakdown } = await supabase
      .from('vehicle_breakdowns')
      .select('vehicle_id')
      .eq('id', breakdownId)
      .single();

    if (breakdown) {
      // Check if there are other open breakdowns for this vehicle
      const { data: otherBreakdowns } = await supabase
        .from('vehicle_breakdowns')
        .select('id')
        .eq('vehicle_id', breakdown.vehicle_id)
        .neq('id', breakdownId)
        .in('status', ['reported', 'acknowledged', 'in_progress', 'parts_ordered']);

      if (!otherBreakdowns?.length) {
        await supabase
          .from('assets')
          .update({ vehicle_status: 'available' })
          .eq('id', breakdown.vehicle_id);
      }
    }
  }

  return { success: true };
}

// ============================================================================
// BREAKDOWN QUERIES
// ============================================================================

/**
 * Get active breakdowns (not completed/cancelled).
 */
export async function getActiveBreakdowns(): Promise<BreakdownReport[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from('vehicle_breakdowns')
    .select(`
      *,
      vehicle:assets(id, license_plate),
      rider:employees(id, full_name)
    `)
    .in('status', ['reported', 'acknowledged', 'in_progress', 'parts_ordered'])
    .order('reported_at', { ascending: false });

  return (data || []).map(mapBreakdownRow);
}

/**
 * Get breakdown history for a vehicle.
 */
export async function getVehicleBreakdownHistory(vehicleId: string): Promise<BreakdownReport[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from('vehicle_breakdowns')
    .select(`
      *,
      vehicle:assets(id, license_plate),
      rider:employees(id, full_name)
    `)
    .eq('vehicle_id', vehicleId)
    .order('reported_at', { ascending: false });

  return (data || []).map(mapBreakdownRow);
}

/**
 * Get breakdown by ID.
 */
export async function getBreakdown(breakdownId: string): Promise<BreakdownReport | null> {
  const supabase = createClient();

  const { data } = await supabase
    .from('vehicle_breakdowns')
    .select(`
      *,
      vehicle:assets(id, license_plate),
      rider:employees(id, full_name)
    `)
    .eq('id', breakdownId)
    .single();

  return data ? mapBreakdownRow(data) : null;
}

function mapBreakdownRow(row: Record<string, unknown>): BreakdownReport {
  const vehicle = row.vehicle as { id: string; license_plate: string } | null;
  const rider = row.rider as { id: string; full_name: string } | null;

  return {
    id: row.id as string,
    vehicleId: row.vehicle_id as string,
    vehiclePlate: vehicle?.license_plate || 'Unknown',
    riderId: rider?.id || null,
    riderName: rider?.full_name || null,
    breakdownType: row.breakdown_type as BreakdownType,
    severity: row.severity as BreakdownSeverity,
    status: row.status as BreakdownStatus,
    location: row.location as string | null,
    description: row.description as string,
    reportedAt: row.reported_at as string,
    acknowledgedAt: row.acknowledged_at as string | null,
    resolvedAt: row.resolved_at as string | null,
    assignedTechnician: row.assigned_technician as string | null,
    estimatedCost: row.estimated_cost as number | null,
    actualCost: row.actual_cost as number | null,
    downtime: calculateDowntime(row.reported_at as string, row.resolved_at as string | null),
    repairNotes: row.repair_notes as string | null,
  };
}

function calculateDowntime(reportedAt: string, resolvedAt: string | null): number | null {
  if (!resolvedAt) return null;
  const start = new Date(reportedAt);
  const end = new Date(resolvedAt);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
}

// ============================================================================
// FLEET HEALTH DASHBOARD
// ============================================================================

export interface FleetHealthSummary {
  totalVehicles: number;
  availableVehicles: number;
  inMaintenanceVehicles: number;
  activeBreakdowns: number;
  criticalBreakdowns: number;
  avgResolutionTime: number; // hours
  breakdownsByType: Record<BreakdownType, number>;
  monthlyBreakdownTrend: Array<{ month: string; count: number }>;
}

/**
 * Get fleet health summary for dashboard.
 */
export async function getFleetHealthSummary(): Promise<FleetHealthSummary> {
  const supabase = createClient();

  // Get vehicle counts
  const { data: vehicleCounts } = await supabase
    .from('assets')
    .select('vehicle_status')
    .eq('asset_type', 'vehicle')
    .eq('is_active', true);

  const totalVehicles = vehicleCounts?.length || 0;
  const availableVehicles = vehicleCounts?.filter(v => v.vehicle_status === 'available' || v.vehicle_status === 'assigned').length || 0;
  const inMaintenanceVehicles = vehicleCounts?.filter(v => v.vehicle_status === 'maintenance').length || 0;

  // Get active breakdown counts
  const { data: activeBreakdownsData } = await supabase
    .from('vehicle_breakdowns')
    .select('severity')
    .in('status', ['reported', 'acknowledged', 'in_progress', 'parts_ordered']);

  const activeBreakdowns = activeBreakdownsData?.length || 0;
  const criticalBreakdowns = activeBreakdownsData?.filter(b => b.severity === 'critical').length || 0;

  // Get average resolution time (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: resolvedBreakdowns } = await supabase
    .from('vehicle_breakdowns')
    .select('reported_at, resolved_at')
    .eq('status', 'completed')
    .gte('resolved_at', thirtyDaysAgo);

  let avgResolutionTime = 0;
  if (resolvedBreakdowns?.length) {
    const totalHours = resolvedBreakdowns.reduce((sum, b) => {
      const downtime = calculateDowntime(b.reported_at, b.resolved_at);
      return sum + (downtime || 0);
    }, 0);
    avgResolutionTime = Math.round(totalHours / resolvedBreakdowns.length);
  }

  // Get breakdowns by type (last 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: breakdownsByTypeData } = await supabase
    .from('vehicle_breakdowns')
    .select('breakdown_type')
    .gte('reported_at', ninetyDaysAgo);

  const breakdownsByType: Record<BreakdownType, number> = {
    mechanical: 0,
    electrical: 0,
    tire: 0,
    accident: 0,
    battery: 0,
    fuel: 0,
    other: 0,
  };

  for (const b of breakdownsByTypeData || []) {
    if (b.breakdown_type in breakdownsByType) {
      breakdownsByType[b.breakdown_type as BreakdownType]++;
    }
  }

  // Get monthly trend (last 6 months)
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const { data: trendData } = await supabase
    .from('vehicle_breakdowns')
    .select('reported_at')
    .gte('reported_at', sixMonthsAgo.toISOString());

  const monthlyMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap.set(key, 0);
  }

  for (const b of trendData || []) {
    const date = new Date(b.reported_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyMap.has(key)) {
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
    }
  }

  const monthlyBreakdownTrend = Array.from(monthlyMap.entries()).map(([month, count]) => ({
    month,
    count,
  }));

  return {
    totalVehicles,
    availableVehicles,
    inMaintenanceVehicles,
    activeBreakdowns,
    criticalBreakdowns,
    avgResolutionTime,
    breakdownsByType,
    monthlyBreakdownTrend,
  };
}

// ============================================================================
// MAINTENANCE SCHEDULING
// ============================================================================

export interface MaintenanceSchedule {
  vehicleId: string;
  vehiclePlate: string;
  nextServiceDate: string | null;
  lastServiceDate: string | null;
  currentMileage: number | null;
  nextServiceMileage: number | null;
  isOverdue: boolean;
  daysUntilService: number | null;
}

/**
 * Get vehicles due for scheduled maintenance.
 */
export async function getMaintenanceDueVehicles(
  daysAhead: number = 14
): Promise<MaintenanceSchedule[]> {
  const supabase = createClient();
  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const { data: vehicles } = await supabase
    .from('assets')
    .select('id, license_plate, next_service_date, last_service_date, current_mileage, next_service_mileage')
    .eq('asset_type', 'vehicle')
    .eq('is_active', true)
    .or(`next_service_date.lte.${cutoff.toISOString()},next_service_mileage.lte.current_mileage+500`)
    .order('next_service_date', { ascending: true });

  return (vehicles || []).map(v => {
    const nextServiceDate = v.next_service_date ? new Date(v.next_service_date) : null;
    const isOverdue = nextServiceDate ? nextServiceDate < now : false;
    const daysUntilService = nextServiceDate 
      ? Math.ceil((nextServiceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      vehicleId: v.id,
      vehiclePlate: v.license_plate,
      nextServiceDate: v.next_service_date,
      lastServiceDate: v.last_service_date,
      currentMileage: v.current_mileage,
      nextServiceMileage: v.next_service_mileage,
      isOverdue,
      daysUntilService,
    };
  });
}

/**
 * Record a completed maintenance service.
 */
export async function recordMaintenanceComplete(
  vehicleId: string,
  data: {
    serviceType: string;
    mileage: number;
    cost: number;
    nextServiceDate: string;
    nextServiceMileage?: number;
    notes?: string;
    performedBy: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // Update vehicle record
  const { error: updateError } = await supabase
    .from('assets')
    .update({
      last_service_date: new Date().toISOString(),
      last_service_mileage: data.mileage,
      current_mileage: data.mileage,
      next_service_date: data.nextServiceDate,
      next_service_mileage: data.nextServiceMileage,
      vehicle_status: 'available',
    })
    .eq('id', vehicleId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Create maintenance record
  const { error: insertError } = await supabase
    .from('maintenance_records')
    .insert({
      vehicle_id: vehicleId,
      service_type: data.serviceType,
      service_date: new Date().toISOString(),
      mileage: data.mileage,
      cost: data.cost,
      notes: data.notes,
      performed_by: data.performedBy,
    });

  if (insertError) {
    // Non-fatal - vehicle updated but history not recorded
    console.error('Failed to record maintenance history:', insertError);
  }

  return { success: true };
}
