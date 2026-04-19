'use client';

/**
 * Vehicle Maintenance & Compliance Service (T-054 to T-057)
 * 
 * Manages:
 * - Service scheduling (T-054)
 * - Maintenance records (T-055)
 * - Compliance tracking (T-056)
 * - Expiry alerts (T-057)
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type MaintenanceType = 
  | 'scheduled_service'
  | 'oil_change'
  | 'tire_replacement'
  | 'brake_service'
  | 'battery_replacement'
  | 'repair'
  | 'inspection'
  | 'accident_repair'
  | 'warranty_service';

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
export type ComplianceType = 'registration' | 'insurance' | 'road_tax' | 'inspection' | 'emissions' | 'permit';
export type ComplianceStatus = 'valid' | 'expiring_soon' | 'expired' | 'renewed' | 'not_applicable';
export type ServicePriority = 'low' | 'medium' | 'high' | 'critical';

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleName: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  priority: ServicePriority;
  scheduledDate: string;
  completedDate: string | null;
  mileageAtService: number | null;
  nextServiceMileage: number | null;
  nextServiceDate: string | null;
  serviceProvider: string | null;
  technician: string | null;
  description: string;
  workPerformed: string | null;
  partsReplaced: MaintenancePart[];
  laborHours: number | null;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  invoiceNumber: string | null;
  invoiceUrl: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export interface MaintenancePart {
  name: string;
  partNumber: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface ComplianceItem {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  type: ComplianceType;
  status: ComplianceStatus;
  documentNumber: string | null;
  issueDate: string;
  expiryDate: string;
  renewalDate: string | null;
  reminderSent: boolean;
  reminderDate: string | null;
  documentUrl: string | null;
  cost: number | null;
  notes: string | null;
}

export interface ServiceSchedule {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  serviceType: MaintenanceType;
  intervalMileage: number | null;
  intervalDays: number | null;
  lastServiceDate: string | null;
  lastServiceMileage: number | null;
  nextDueDate: string;
  nextDueMileage: number | null;
  isOverdue: boolean;
}

export interface MaintenanceAlert {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  alertType: 'maintenance_due' | 'compliance_expiring' | 'overdue_service';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  dueDate: string;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
}

// ============================================================================
// LABELS
// ============================================================================

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  scheduled_service: 'Scheduled Service',
  oil_change: 'Oil Change',
  tire_replacement: 'Tire Replacement',
  brake_service: 'Brake Service',
  battery_replacement: 'Battery Replacement',
  repair: 'Repair',
  inspection: 'Inspection',
  accident_repair: 'Accident Repair',
  warranty_service: 'Warranty Service',
};

export const COMPLIANCE_TYPE_LABELS: Record<ComplianceType, string> = {
  registration: 'Vehicle Registration',
  insurance: 'Insurance',
  road_tax: 'Road Tax',
  inspection: 'Vehicle Inspection',
  emissions: 'Emissions Certificate',
  permit: 'Operating Permit',
};

// ============================================================================
// SERVICE INTERVALS
// ============================================================================

const DEFAULT_SERVICE_INTERVALS: Record<MaintenanceType, { mileage?: number; days?: number }> = {
  scheduled_service: { mileage: 5000, days: 90 },
  oil_change: { mileage: 3000, days: 90 },
  tire_replacement: { mileage: 20000 },
  brake_service: { mileage: 15000 },
  battery_replacement: { days: 730 }, // 2 years
  repair: {},
  inspection: { days: 365 },
  accident_repair: {},
  warranty_service: {},
};

// ============================================================================
// MAINTENANCE SCHEDULING
// ============================================================================

/**
 * Schedule a maintenance service.
 */
export async function scheduleMaintenanceService(input: {
  vehicleId: string;
  type: MaintenanceType;
  scheduledDate: string;
  priority: ServicePriority;
  description: string;
  serviceProvider?: string;
  estimatedCost?: number;
  createdBy: string;
}): Promise<{ success: boolean; maintenanceId?: string; error?: string }> {
  const supabase = createClient();
  
  // Check vehicle exists
  const { data: vehicle } = await supabase
    .from('assets')
    .select('id, status')
    .eq('id', input.vehicleId)
    .single();
  
  if (!vehicle) {
    return { success: false, error: 'Vehicle not found' };
  }
  
  const { data, error } = await supabase
    .from('maintenance_records')
    .insert({
      vehicle_id: input.vehicleId,
      type: input.type,
      status: 'scheduled',
      priority: input.priority,
      scheduled_date: input.scheduledDate,
      description: input.description,
      service_provider: input.serviceProvider,
      estimated_cost: input.estimatedCost,
      created_by: input.createdBy,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, maintenanceId: data.id };
}

/**
 * Start a maintenance service.
 */
export async function startMaintenanceService(
  maintenanceId: string,
  technician: string,
  currentMileage: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: record } = await supabase
    .from('maintenance_records')
    .select('vehicle_id')
    .eq('id', maintenanceId)
    .single();
  
  if (!record) {
    return { success: false, error: 'Maintenance record not found' };
  }
  
  const { error } = await supabase
    .from('maintenance_records')
    .update({
      status: 'in_progress',
      technician,
      mileage_at_service: currentMileage,
      started_at: new Date().toISOString(),
    })
    .eq('id', maintenanceId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update vehicle status
  await supabase
    .from('assets')
    .update({ status: 'maintenance' })
    .eq('id', record.vehicle_id);
  
  return { success: true };
}

/**
 * Complete a maintenance service.
 */
export async function completeMaintenanceService(input: {
  maintenanceId: string;
  workPerformed: string;
  partsReplaced?: MaintenancePart[];
  laborHours: number;
  laborCost: number;
  partsCost: number;
  invoiceNumber?: string;
  invoiceUrl?: string;
  notes?: string;
  nextServiceMileage?: number;
  nextServiceDate?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: record } = await supabase
    .from('maintenance_records')
    .select('vehicle_id, type')
    .eq('id', input.maintenanceId)
    .single();
  
  if (!record) {
    return { success: false, error: 'Maintenance record not found' };
  }
  
  const totalCost = input.laborCost + input.partsCost;
  
  const { error } = await supabase
    .from('maintenance_records')
    .update({
      status: 'completed',
      completed_date: new Date().toISOString(),
      work_performed: input.workPerformed,
      parts_replaced: input.partsReplaced,
      labor_hours: input.laborHours,
      labor_cost: input.laborCost,
      parts_cost: input.partsCost,
      total_cost: totalCost,
      invoice_number: input.invoiceNumber,
      invoice_url: input.invoiceUrl,
      notes: input.notes,
      next_service_mileage: input.nextServiceMileage,
      next_service_date: input.nextServiceDate,
    })
    .eq('id', input.maintenanceId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update vehicle status back to available
  await supabase
    .from('assets')
    .update({ 
      status: 'available',
      last_service_date: new Date().toISOString(),
    })
    .eq('id', record.vehicle_id);
  
  // Update service schedule
  await updateServiceSchedule(record.vehicle_id, record.type);
  
  return { success: true };
}

/**
 * Update service schedule after completion.
 */
async function updateServiceSchedule(vehicleId: string, serviceType: MaintenanceType): Promise<void> {
  const supabase = createClient();
  
  const intervals = DEFAULT_SERVICE_INTERVALS[serviceType];
  if (!intervals.mileage && !intervals.days) return;
  
  const { data: record } = await supabase
    .from('maintenance_records')
    .select('mileage_at_service, completed_date')
    .eq('vehicle_id', vehicleId)
    .eq('type', serviceType)
    .eq('status', 'completed')
    .order('completed_date', { ascending: false })
    .limit(1)
    .single();
  
  if (!record) return;
  
  let nextDueDate: string | null = null;
  let nextDueMileage: number | null = null;
  
  if (intervals.days && record.completed_date) {
    const completedDate = new Date(record.completed_date);
    completedDate.setDate(completedDate.getDate() + intervals.days);
    nextDueDate = completedDate.toISOString();
  }
  
  if (intervals.mileage && record.mileage_at_service) {
    nextDueMileage = record.mileage_at_service + intervals.mileage;
  }
  
  // Upsert service schedule
  const { data: existingSchedule } = await supabase
    .from('service_schedules')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .eq('service_type', serviceType)
    .single();
  
  if (existingSchedule) {
    await supabase
      .from('service_schedules')
      .update({
        last_service_date: record.completed_date,
        last_service_mileage: record.mileage_at_service,
        next_due_date: nextDueDate,
        next_due_mileage: nextDueMileage,
      })
      .eq('id', existingSchedule.id);
  } else {
    await supabase.from('service_schedules').insert({
      vehicle_id: vehicleId,
      service_type: serviceType,
      interval_mileage: intervals.mileage,
      interval_days: intervals.days,
      last_service_date: record.completed_date,
      last_service_mileage: record.mileage_at_service,
      next_due_date: nextDueDate,
      next_due_mileage: nextDueMileage,
    });
  }
}

// ============================================================================
// MAINTENANCE QUERIES
// ============================================================================

/**
 * Get maintenance records for a vehicle.
 */
export async function getVehicleMaintenanceHistory(
  vehicleId: string,
  limit?: number
): Promise<MaintenanceRecord[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('maintenance_records')
    .select(`
      *,
      vehicle:assets(license_plate, asset_name)
    `)
    .eq('vehicle_id', vehicleId)
    .order('scheduled_date', { ascending: false });
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data } = await query;
  
  return (data || []).map(mapMaintenanceRecord);
}

/**
 * Get upcoming maintenance services.
 */
export async function getUpcomingMaintenance(
  daysAhead: number = 14
): Promise<MaintenanceRecord[]> {
  const supabase = createClient();
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  const { data } = await supabase
    .from('maintenance_records')
    .select(`
      *,
      vehicle:assets(license_plate, asset_name)
    `)
    .eq('status', 'scheduled')
    .lte('scheduled_date', futureDate.toISOString())
    .order('scheduled_date');
  
  return (data || []).map(mapMaintenanceRecord);
}

/**
 * Get overdue maintenance services.
 */
export async function getOverdueMaintenance(): Promise<MaintenanceRecord[]> {
  const supabase = createClient();
  
  const now = new Date().toISOString();
  
  const { data } = await supabase
    .from('maintenance_records')
    .select(`
      *,
      vehicle:assets(license_plate, asset_name)
    `)
    .eq('status', 'scheduled')
    .lt('scheduled_date', now)
    .order('scheduled_date');
  
  // Update status to overdue
  if (data && data.length > 0) {
    await supabase
      .from('maintenance_records')
      .update({ status: 'overdue' })
      .in('id', data.map(d => d.id));
  }
  
  return (data || []).map(mapMaintenanceRecord);
}

// ============================================================================
// COMPLIANCE TRACKING
// ============================================================================

/**
 * Add compliance item for a vehicle.
 */
export async function addComplianceItem(input: {
  vehicleId: string;
  type: ComplianceType;
  documentNumber?: string;
  issueDate: string;
  expiryDate: string;
  documentUrl?: string;
  cost?: number;
  notes?: string;
}): Promise<{ success: boolean; complianceId?: string; error?: string }> {
  const supabase = createClient();
  
  // Calculate initial status
  const expiryDate = new Date(input.expiryDate);
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  let status: ComplianceStatus = 'valid';
  if (expiryDate < now) {
    status = 'expired';
  } else if (expiryDate <= thirtyDaysFromNow) {
    status = 'expiring_soon';
  }
  
  const { data, error } = await supabase
    .from('compliance_items')
    .insert({
      vehicle_id: input.vehicleId,
      type: input.type,
      status,
      document_number: input.documentNumber,
      issue_date: input.issueDate,
      expiry_date: input.expiryDate,
      document_url: input.documentUrl,
      cost: input.cost,
      notes: input.notes,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, complianceId: data.id };
}

/**
 * Renew compliance item.
 */
export async function renewComplianceItem(
  complianceId: string,
  input: {
    newExpiryDate: string;
    documentNumber?: string;
    documentUrl?: string;
    cost?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('compliance_items')
    .update({
      status: 'renewed',
      renewal_date: new Date().toISOString(),
      expiry_date: input.newExpiryDate,
      document_number: input.documentNumber,
      document_url: input.documentUrl,
      cost: input.cost,
      reminder_sent: false,
    })
    .eq('id', complianceId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Create new record for the renewed period
  const { data: old } = await supabase
    .from('compliance_items')
    .select('vehicle_id, type')
    .eq('id', complianceId)
    .single();
  
  if (old) {
    await supabase.from('compliance_items').insert({
      vehicle_id: old.vehicle_id,
      type: old.type,
      status: 'valid',
      document_number: input.documentNumber,
      issue_date: new Date().toISOString(),
      expiry_date: input.newExpiryDate,
      document_url: input.documentUrl,
      cost: input.cost,
    });
  }
  
  return { success: true };
}

/**
 * Get compliance items for a vehicle.
 */
export async function getVehicleCompliance(vehicleId: string): Promise<ComplianceItem[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('compliance_items')
    .select(`
      *,
      vehicle:assets(license_plate)
    `)
    .eq('vehicle_id', vehicleId)
    .neq('status', 'renewed')
    .order('expiry_date');
  
  return (data || []).map(mapComplianceItem);
}

/**
 * Get expiring compliance items.
 */
export async function getExpiringCompliance(daysAhead: number = 30): Promise<ComplianceItem[]> {
  const supabase = createClient();
  
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  const { data } = await supabase
    .from('compliance_items')
    .select(`
      *,
      vehicle:assets(license_plate)
    `)
    .in('status', ['valid', 'expiring_soon'])
    .gte('expiry_date', now.toISOString())
    .lte('expiry_date', futureDate.toISOString())
    .order('expiry_date');
  
  return (data || []).map(mapComplianceItem);
}

/**
 * Get expired compliance items.
 */
export async function getExpiredCompliance(): Promise<ComplianceItem[]> {
  const supabase = createClient();
  
  const now = new Date().toISOString();
  
  const { data } = await supabase
    .from('compliance_items')
    .select(`
      *,
      vehicle:assets(license_plate)
    `)
    .in('status', ['valid', 'expiring_soon'])
    .lt('expiry_date', now)
    .order('expiry_date');
  
  // Update status to expired
  if (data && data.length > 0) {
    await supabase
      .from('compliance_items')
      .update({ status: 'expired' })
      .in('id', data.map(d => d.id));
  }
  
  return (data || []).map(mapComplianceItem);
}

// ============================================================================
// ALERTS
// ============================================================================

/**
 * Generate maintenance and compliance alerts.
 */
export async function generateAlerts(): Promise<MaintenanceAlert[]> {
  const supabase = createClient();
  const alerts: MaintenanceAlert[] = [];
  
  // Get overdue maintenance
  const overdue = await getOverdueMaintenance();
  for (const record of overdue) {
    alerts.push({
      id: `maintenance-${record.id}`,
      vehicleId: record.vehicleId,
      vehiclePlate: record.vehiclePlate,
      alertType: 'overdue_service',
      severity: record.priority === 'critical' ? 'critical' : 'warning',
      title: `Overdue: ${MAINTENANCE_TYPE_LABELS[record.type]}`,
      description: `${record.vehiclePlate} - ${record.description}`,
      dueDate: record.scheduledDate,
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
    });
  }
  
  // Get upcoming maintenance
  const upcoming = await getUpcomingMaintenance(7);
  for (const record of upcoming) {
    alerts.push({
      id: `maintenance-${record.id}`,
      vehicleId: record.vehicleId,
      vehiclePlate: record.vehiclePlate,
      alertType: 'maintenance_due',
      severity: record.priority === 'high' || record.priority === 'critical' ? 'warning' : 'info',
      title: `Due Soon: ${MAINTENANCE_TYPE_LABELS[record.type]}`,
      description: `${record.vehiclePlate} - Scheduled for ${new Date(record.scheduledDate).toLocaleDateString()}`,
      dueDate: record.scheduledDate,
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
    });
  }
  
  // Get expiring compliance
  const expiringCompliance = await getExpiringCompliance(14);
  for (const item of expiringCompliance) {
    const daysUntilExpiry = Math.ceil(
      (new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    alerts.push({
      id: `compliance-${item.id}`,
      vehicleId: item.vehicleId,
      vehiclePlate: item.vehiclePlate,
      alertType: 'compliance_expiring',
      severity: daysUntilExpiry <= 7 ? 'warning' : 'info',
      title: `Expiring: ${COMPLIANCE_TYPE_LABELS[item.type]}`,
      description: `${item.vehiclePlate} - Expires in ${daysUntilExpiry} days`,
      dueDate: item.expiryDate,
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
    });
  }
  
  // Get expired compliance
  const expired = await getExpiredCompliance();
  for (const item of expired) {
    alerts.push({
      id: `compliance-${item.id}`,
      vehicleId: item.vehicleId,
      vehiclePlate: item.vehiclePlate,
      alertType: 'compliance_expiring',
      severity: 'critical',
      title: `EXPIRED: ${COMPLIANCE_TYPE_LABELS[item.type]}`,
      description: `${item.vehiclePlate} - Expired on ${new Date(item.expiryDate).toLocaleDateString()}`,
      dueDate: item.expiryDate,
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
    });
  }
  
  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Acknowledge an alert.
 */
export async function acknowledgeAlert(
  alertId: string,
  acknowledgedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const [type, id] = alertId.split('-');
  
  if (type === 'maintenance') {
    await supabase
      .from('maintenance_records')
      .update({
        alert_acknowledged: true,
        alert_acknowledged_by: acknowledgedBy,
        alert_acknowledged_at: new Date().toISOString(),
      })
      .eq('id', id);
  } else if (type === 'compliance') {
    await supabase
      .from('compliance_items')
      .update({
        reminder_sent: true,
        reminder_date: new Date().toISOString(),
      })
      .eq('id', id);
  }
  
  return { success: true };
}

// ============================================================================
// REPORTING
// ============================================================================

export interface MaintenanceSummary {
  totalRecords: number;
  completedThisMonth: number;
  scheduled: number;
  inProgress: number;
  overdue: number;
  totalCostThisMonth: number;
  avgCostPerService: number;
  byType: Record<MaintenanceType, number>;
  complianceStatus: {
    valid: number;
    expiringSoon: number;
    expired: number;
  };
}

export async function getMaintenanceSummary(): Promise<MaintenanceSummary> {
  const supabase = createClient();
  
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  const { data: records } = await supabase
    .from('maintenance_records')
    .select('status, type, total_cost, completed_date');
  
  const { data: compliance } = await supabase
    .from('compliance_items')
    .select('status');
  
  const byType: Record<MaintenanceType, number> = {
    scheduled_service: 0,
    oil_change: 0,
    tire_replacement: 0,
    brake_service: 0,
    battery_replacement: 0,
    repair: 0,
    inspection: 0,
    accident_repair: 0,
    warranty_service: 0,
  };
  
  let totalCostThisMonth = 0;
  let completedThisMonth = 0;
  
  for (const r of records || []) {
    byType[r.type as MaintenanceType]++;
    
    if (r.status === 'completed' && r.completed_date >= monthStart) {
      completedThisMonth++;
      totalCostThisMonth += r.total_cost || 0;
    }
  }
  
  const completed = records?.filter(r => r.status === 'completed') || [];
  const avgCost = completed.length > 0
    ? completed.reduce((sum, r) => sum + (r.total_cost || 0), 0) / completed.length
    : 0;
  
  return {
    totalRecords: records?.length || 0,
    completedThisMonth,
    scheduled: records?.filter(r => r.status === 'scheduled').length || 0,
    inProgress: records?.filter(r => r.status === 'in_progress').length || 0,
    overdue: records?.filter(r => r.status === 'overdue').length || 0,
    totalCostThisMonth,
    avgCostPerService: Math.round(avgCost * 100) / 100,
    byType,
    complianceStatus: {
      valid: compliance?.filter(c => c.status === 'valid').length || 0,
      expiringSoon: compliance?.filter(c => c.status === 'expiring_soon').length || 0,
      expired: compliance?.filter(c => c.status === 'expired').length || 0,
    },
  };
}

/**
 * Get vehicle maintenance cost report.
 */
export async function getVehicleMaintenanceCostReport(
  vehicleId: string,
  startDate: string,
  endDate: string
): Promise<{
  totalCost: number;
  laborCost: number;
  partsCost: number;
  serviceCount: number;
  costByType: Record<MaintenanceType, number>;
}> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('maintenance_records')
    .select('type, labor_cost, parts_cost, total_cost')
    .eq('vehicle_id', vehicleId)
    .eq('status', 'completed')
    .gte('completed_date', startDate)
    .lte('completed_date', endDate);
  
  const costByType: Record<MaintenanceType, number> = {
    scheduled_service: 0,
    oil_change: 0,
    tire_replacement: 0,
    brake_service: 0,
    battery_replacement: 0,
    repair: 0,
    inspection: 0,
    accident_repair: 0,
    warranty_service: 0,
  };
  
  let totalCost = 0;
  let laborCost = 0;
  let partsCost = 0;
  
  for (const r of data || []) {
    totalCost += r.total_cost || 0;
    laborCost += r.labor_cost || 0;
    partsCost += r.parts_cost || 0;
    costByType[r.type as MaintenanceType] += r.total_cost || 0;
  }
  
  return {
    totalCost,
    laborCost,
    partsCost,
    serviceCount: data?.length || 0,
    costByType,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function mapMaintenanceRecord(row: Record<string, unknown>): MaintenanceRecord {
  const vehicle = row.vehicle as Record<string, unknown> | null;
  
  return {
    id: row.id as string,
    vehicleId: row.vehicle_id as string,
    vehiclePlate: vehicle?.license_plate as string || '',
    vehicleName: vehicle?.asset_name as string || '',
    type: row.type as MaintenanceType,
    status: row.status as MaintenanceStatus,
    priority: row.priority as ServicePriority,
    scheduledDate: row.scheduled_date as string,
    completedDate: row.completed_date as string | null,
    mileageAtService: row.mileage_at_service as number | null,
    nextServiceMileage: row.next_service_mileage as number | null,
    nextServiceDate: row.next_service_date as string | null,
    serviceProvider: row.service_provider as string | null,
    technician: row.technician as string | null,
    description: row.description as string,
    workPerformed: row.work_performed as string | null,
    partsReplaced: (row.parts_replaced as MaintenancePart[]) || [],
    laborHours: row.labor_hours as number | null,
    laborCost: row.labor_cost as number || 0,
    partsCost: row.parts_cost as number || 0,
    totalCost: row.total_cost as number || 0,
    invoiceNumber: row.invoice_number as string | null,
    invoiceUrl: row.invoice_url as string | null,
    notes: row.notes as string | null,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  };
}

function mapComplianceItem(row: Record<string, unknown>): ComplianceItem {
  const vehicle = row.vehicle as Record<string, unknown> | null;
  
  return {
    id: row.id as string,
    vehicleId: row.vehicle_id as string,
    vehiclePlate: vehicle?.license_plate as string || '',
    type: row.type as ComplianceType,
    status: row.status as ComplianceStatus,
    documentNumber: row.document_number as string | null,
    issueDate: row.issue_date as string,
    expiryDate: row.expiry_date as string,
    renewalDate: row.renewal_date as string | null,
    reminderSent: row.reminder_sent as boolean,
    reminderDate: row.reminder_date as string | null,
    documentUrl: row.document_url as string | null,
    cost: row.cost as number | null,
    notes: row.notes as string | null,
  };
}
