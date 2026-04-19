'use client';

/**
 * SIM & Device Management Service (T-073 to T-075)
 * 
 * Manages:
 * - SIM card tracking and assignments
 * - Device (phones, tablets) management
 * - Usage monitoring
 * - Billing and subscriptions
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type SimStatus = 'available' | 'assigned' | 'suspended' | 'lost' | 'damaged' | 'deactivated';
export type DeviceStatus = 'available' | 'assigned' | 'maintenance' | 'lost' | 'damaged' | 'retired';
export type DeviceType = 'phone' | 'tablet' | 'gps_tracker' | 'other';

export interface SimCard {
  id: string;
  simNumber: string;
  phoneNumber: string;
  iccId: string;
  carrierId: string;
  carrierName: string;
  planId: string | null;
  planName: string | null;
  status: SimStatus;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  dataLimit: number | null; // MB
  dataUsed: number;
  lastUsageSync: string | null;
  notes: string | null;
}

export interface Device {
  id: string;
  deviceType: DeviceType;
  brand: string;
  model: string;
  serialNumber: string;
  imei: string | null;
  status: DeviceStatus;
  purchaseDate: string | null;
  purchasePrice: number | null;
  warrantyExpiry: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  simCardId: string | null;
  simNumber: string | null;
  condition: 'new' | 'good' | 'fair' | 'poor';
  notes: string | null;
}

export interface Carrier {
  id: string;
  name: string;
  country: string;
  supportPhone: string | null;
  supportEmail: string | null;
  portalUrl: string | null;
  isActive: boolean;
}

export interface DataPlan {
  id: string;
  carrierId: string;
  carrierName: string;
  name: string;
  dataLimitMb: number;
  voiceMinutes: number;
  smsCount: number;
  monthlyPrice: number;
  isActive: boolean;
}

export interface UsageRecord {
  id: string;
  simCardId: string;
  simNumber: string;
  date: string;
  dataUsedMb: number;
  voiceMinutes: number;
  smsCount: number;
  cost: number | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const SIM_STATUS_LABELS: Record<SimStatus, string> = {
  available: 'Available',
  assigned: 'Assigned',
  suspended: 'Suspended',
  lost: 'Lost',
  damaged: 'Damaged',
  deactivated: 'Deactivated',
};

export const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  available: 'Available',
  assigned: 'Assigned',
  maintenance: 'Maintenance',
  lost: 'Lost',
  damaged: 'Damaged',
  retired: 'Retired',
};

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  phone: 'Phone',
  tablet: 'Tablet',
  gps_tracker: 'GPS Tracker',
  other: 'Other',
};

// ============================================================================
// SIM CARD MANAGEMENT
// ============================================================================

/**
 * Register a new SIM card.
 */
export async function registerSimCard(input: {
  simNumber: string;
  phoneNumber: string;
  iccId: string;
  carrierId: string;
  planId?: string;
  dataLimit?: number;
  notes?: string;
}): Promise<{ success: boolean; simId?: string; error?: string }> {
  const supabase = createClient();
  
  // Check for duplicates
  const { data: existing } = await supabase
    .from('sim_cards')
    .select('id')
    .or(`sim_number.eq.${input.simNumber},phone_number.eq.${input.phoneNumber},icc_id.eq.${input.iccId}`)
    .limit(1);
  
  if (existing?.length) {
    return { success: false, error: 'SIM card with this number already exists' };
  }
  
  const { data, error } = await supabase
    .from('sim_cards')
    .insert({
      sim_number: input.simNumber,
      phone_number: input.phoneNumber,
      icc_id: input.iccId,
      carrier_id: input.carrierId,
      plan_id: input.planId,
      status: 'available',
      data_limit: input.dataLimit,
      data_used: 0,
      notes: input.notes,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, simId: data.id };
}

/**
 * Get SIM card by ID.
 */
export async function getSimCard(simId: string): Promise<SimCard | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('sim_cards')
    .select(`
      *,
      carrier:carriers(name),
      plan:data_plans(name),
      assigned:employees(full_name)
    `)
    .eq('id', simId)
    .single();
  
  if (!data) return null;
  
  return mapSimCard(data);
}

/**
 * Get all SIM cards.
 */
export async function getSimCards(filters?: {
  status?: SimStatus;
  carrierId?: string;
  assignedTo?: string;
}): Promise<SimCard[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('sim_cards')
    .select(`
      *,
      carrier:carriers(name),
      plan:data_plans(name),
      assigned:employees(full_name)
    `)
    .order('created_at', { ascending: false });
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.carrierId) {
    query = query.eq('carrier_id', filters.carrierId);
  }
  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }
  
  const { data } = await query;
  
  return (data || []).map(mapSimCard);
}

/**
 * Assign SIM card to employee.
 */
export async function assignSimCard(
  simId: string,
  employeeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Check SIM availability
  const { data: sim } = await supabase
    .from('sim_cards')
    .select('status')
    .eq('id', simId)
    .single();
  
  if (!sim || sim.status !== 'available') {
    return { success: false, error: 'SIM card not available' };
  }
  
  // Check if employee already has a SIM
  const { data: existing } = await supabase
    .from('sim_cards')
    .select('id')
    .eq('assigned_to', employeeId)
    .eq('status', 'assigned')
    .limit(1);
  
  if (existing?.length) {
    return { success: false, error: 'Employee already has an assigned SIM card' };
  }
  
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('sim_cards')
    .update({
      status: 'assigned',
      assigned_to: employeeId,
      assigned_at: now,
      activated_at: now,
    })
    .eq('id', simId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Log assignment
  await supabase
    .from('sim_assignment_history')
    .insert({
      sim_id: simId,
      employee_id: employeeId,
      action: 'assigned',
      performed_at: now,
    });
  
  return { success: true };
}

/**
 * Return SIM card from employee.
 */
export async function returnSimCard(
  simId: string,
  condition: 'good' | 'damaged' | 'lost',
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: sim } = await supabase
    .from('sim_cards')
    .select('assigned_to')
    .eq('id', simId)
    .single();
  
  if (!sim) {
    return { success: false, error: 'SIM card not found' };
  }
  
  const newStatus: SimStatus = 
    condition === 'lost' ? 'lost' :
    condition === 'damaged' ? 'damaged' : 'available';
  
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('sim_cards')
    .update({
      status: newStatus,
      assigned_to: null,
      assigned_at: null,
      notes: notes || null,
    })
    .eq('id', simId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Log return
  await supabase
    .from('sim_assignment_history')
    .insert({
      sim_id: simId,
      employee_id: sim.assigned_to,
      action: 'returned',
      condition,
      notes,
      performed_at: now,
    });
  
  return { success: true };
}

/**
 * Suspend SIM card.
 */
export async function suspendSimCard(
  simId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('sim_cards')
    .update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspension_reason: reason,
    })
    .eq('id', simId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Update SIM card usage.
 */
export async function recordUsage(
  simId: string,
  date: string,
  dataMb: number,
  voiceMinutes: number,
  smsCount: number,
  cost?: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Insert usage record
  const { error: usageError } = await supabase
    .from('sim_usage_records')
    .insert({
      sim_id: simId,
      date,
      data_used_mb: dataMb,
      voice_minutes: voiceMinutes,
      sms_count: smsCount,
      cost,
    });
  
  if (usageError) {
    return { success: false, error: usageError.message };
  }
  
  // Update cumulative usage
  const { data: sim } = await supabase
    .from('sim_cards')
    .select('data_used')
    .eq('id', simId)
    .single();
  
  await supabase
    .from('sim_cards')
    .update({
      data_used: (sim?.data_used || 0) + dataMb,
      last_usage_sync: new Date().toISOString(),
    })
    .eq('id', simId);
  
  return { success: true };
}

// ============================================================================
// DEVICE MANAGEMENT
// ============================================================================

/**
 * Register a new device.
 */
export async function registerDevice(input: {
  deviceType: DeviceType;
  brand: string;
  model: string;
  serialNumber: string;
  imei?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyExpiry?: string;
  notes?: string;
}): Promise<{ success: boolean; deviceId?: string; error?: string }> {
  const supabase = createClient();
  
  // Check for duplicates
  const { data: existing } = await supabase
    .from('devices')
    .select('id')
    .or(`serial_number.eq.${input.serialNumber}${input.imei ? `,imei.eq.${input.imei}` : ''}`)
    .limit(1);
  
  if (existing?.length) {
    return { success: false, error: 'Device with this serial/IMEI already exists' };
  }
  
  const { data, error } = await supabase
    .from('devices')
    .insert({
      device_type: input.deviceType,
      brand: input.brand,
      model: input.model,
      serial_number: input.serialNumber,
      imei: input.imei,
      status: 'available',
      purchase_date: input.purchaseDate,
      purchase_price: input.purchasePrice,
      warranty_expiry: input.warrantyExpiry,
      condition: 'new',
      notes: input.notes,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, deviceId: data.id };
}

/**
 * Get device by ID.
 */
export async function getDevice(deviceId: string): Promise<Device | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('devices')
    .select(`
      *,
      assigned:employees(full_name),
      sim:sim_cards(sim_number)
    `)
    .eq('id', deviceId)
    .single();
  
  if (!data) return null;
  
  return mapDevice(data);
}

/**
 * Get all devices.
 */
export async function getDevices(filters?: {
  status?: DeviceStatus;
  deviceType?: DeviceType;
  assignedTo?: string;
}): Promise<Device[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('devices')
    .select(`
      *,
      assigned:employees(full_name),
      sim:sim_cards(sim_number)
    `)
    .order('created_at', { ascending: false });
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.deviceType) {
    query = query.eq('device_type', filters.deviceType);
  }
  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }
  
  const { data } = await query;
  
  return (data || []).map(mapDevice);
}

/**
 * Assign device to employee.
 */
export async function assignDevice(
  deviceId: string,
  employeeId: string,
  simCardId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Check device availability
  const { data: device } = await supabase
    .from('devices')
    .select('status')
    .eq('id', deviceId)
    .single();
  
  if (!device || device.status !== 'available') {
    return { success: false, error: 'Device not available' };
  }
  
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('devices')
    .update({
      status: 'assigned',
      assigned_to: employeeId,
      assigned_at: now,
      sim_card_id: simCardId,
    })
    .eq('id', deviceId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Log assignment
  await supabase
    .from('device_assignment_history')
    .insert({
      device_id: deviceId,
      employee_id: employeeId,
      action: 'assigned',
      performed_at: now,
    });
  
  return { success: true };
}

/**
 * Return device from employee.
 */
export async function returnDevice(
  deviceId: string,
  condition: Device['condition'],
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: device } = await supabase
    .from('devices')
    .select('assigned_to')
    .eq('id', deviceId)
    .single();
  
  if (!device) {
    return { success: false, error: 'Device not found' };
  }
  
  const newStatus: DeviceStatus = 
    condition === 'poor' ? 'maintenance' : 'available';
  
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('devices')
    .update({
      status: newStatus,
      assigned_to: null,
      assigned_at: null,
      sim_card_id: null,
      condition,
      notes: notes || null,
    })
    .eq('id', deviceId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Log return
  await supabase
    .from('device_assignment_history')
    .insert({
      device_id: deviceId,
      employee_id: device.assigned_to,
      action: 'returned',
      condition,
      notes,
      performed_at: now,
    });
  
  return { success: true };
}

/**
 * Send device for maintenance.
 */
export async function sendToMaintenance(
  deviceId: string,
  issue: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('devices')
    .update({
      status: 'maintenance',
      maintenance_issue: issue,
      maintenance_started_at: new Date().toISOString(),
    })
    .eq('id', deviceId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Complete device maintenance.
 */
export async function completeMaintenance(
  deviceId: string,
  repairNotes: string,
  repairCost?: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('devices')
    .update({
      status: 'available',
      condition: 'good',
      maintenance_issue: null,
      maintenance_started_at: null,
      maintenance_completed_at: new Date().toISOString(),
      last_repair_notes: repairNotes,
      last_repair_cost: repairCost,
    })
    .eq('id', deviceId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// CARRIERS & PLANS
// ============================================================================

/**
 * Get all carriers.
 */
export async function getCarriers(): Promise<Carrier[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('carriers')
    .select('*')
    .eq('is_active', true)
    .order('name');
  
  return (data || []).map(c => ({
    id: c.id,
    name: c.name,
    country: c.country,
    supportPhone: c.support_phone,
    supportEmail: c.support_email,
    portalUrl: c.portal_url,
    isActive: c.is_active,
  }));
}

/**
 * Get data plans for a carrier.
 */
export async function getDataPlans(carrierId?: string): Promise<DataPlan[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('data_plans')
    .select(`
      *,
      carrier:carriers(name)
    `)
    .eq('is_active', true)
    .order('monthly_price');
  
  if (carrierId) {
    query = query.eq('carrier_id', carrierId);
  }
  
  const { data } = await query;
  
  return (data || []).map(p => {
    const carrier = p.carrier as unknown;
    const carrierData = (Array.isArray(carrier) ? carrier[0] : carrier) as { name: string } | null;
    
    return {
      id: p.id,
      carrierId: p.carrier_id,
      carrierName: carrierData?.name || 'Unknown',
      name: p.name,
      dataLimitMb: p.data_limit_mb,
      voiceMinutes: p.voice_minutes,
      smsCount: p.sms_count,
      monthlyPrice: p.monthly_price,
      isActive: p.is_active,
    };
  });
}

// ============================================================================
// REPORTING
// ============================================================================

export interface SimDeviceSummary {
  simCards: {
    total: number;
    available: number;
    assigned: number;
    suspended: number;
    lost: number;
  };
  devices: {
    total: number;
    available: number;
    assigned: number;
    maintenance: number;
    lost: number;
  };
  usageThisMonth: {
    totalDataGb: number;
    totalCost: number;
    avgDataPerSim: number;
  };
  expiringWarranties: number;
  overDataLimit: number;
  byCarrier: Array<{
    carrierId: string;
    carrierName: string;
    simCount: number;
    totalCost: number;
  }>;
}

export async function getSimDeviceSummary(): Promise<SimDeviceSummary> {
  const supabase = createClient();
  
  // SIM stats
  const { data: sims } = await supabase
    .from('sim_cards')
    .select('status, carrier_id, data_used, data_limit');
  
  const simStats = {
    total: sims?.length || 0,
    available: sims?.filter(s => s.status === 'available').length || 0,
    assigned: sims?.filter(s => s.status === 'assigned').length || 0,
    suspended: sims?.filter(s => s.status === 'suspended').length || 0,
    lost: sims?.filter(s => s.status === 'lost').length || 0,
  };
  
  const overDataLimit = sims?.filter(s => 
    s.data_limit && s.data_used > s.data_limit
  ).length || 0;
  
  // Device stats
  const { data: devices } = await supabase
    .from('devices')
    .select('status, warranty_expiry');
  
  const deviceStats = {
    total: devices?.length || 0,
    available: devices?.filter(d => d.status === 'available').length || 0,
    assigned: devices?.filter(d => d.status === 'assigned').length || 0,
    maintenance: devices?.filter(d => d.status === 'maintenance').length || 0,
    lost: devices?.filter(d => d.status === 'lost').length || 0,
  };
  
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  const expiringWarranties = devices?.filter(d => 
    d.warranty_expiry && new Date(d.warranty_expiry) <= thirtyDaysFromNow
  ).length || 0;
  
  // Usage stats
  const monthStart = new Date();
  monthStart.setDate(1);
  
  const { data: usage } = await supabase
    .from('sim_usage_records')
    .select('data_used_mb, cost')
    .gte('date', monthStart.toISOString().slice(0, 10));
  
  const totalDataMb = usage?.reduce((sum, u) => sum + u.data_used_mb, 0) || 0;
  const totalCost = usage?.reduce((sum, u) => sum + (u.cost || 0), 0) || 0;
  
  // By carrier
  const { data: carriers } = await supabase
    .from('carriers')
    .select('id, name');
  
  const carrierMap = new Map(carriers?.map(c => [c.id, c.name]));
  const byCarrierMap = new Map<string, { name: string; count: number; cost: number }>();
  
  for (const sim of sims || []) {
    const existing = byCarrierMap.get(sim.carrier_id) || { 
      name: carrierMap.get(sim.carrier_id) || 'Unknown', 
      count: 0, 
      cost: 0 
    };
    existing.count++;
    byCarrierMap.set(sim.carrier_id, existing);
  }
  
  const byCarrier = Array.from(byCarrierMap.entries()).map(([id, data]) => ({
    carrierId: id,
    carrierName: data.name,
    simCount: data.count,
    totalCost: 0, // Would need to calculate from usage
  }));
  
  return {
    simCards: simStats,
    devices: deviceStats,
    usageThisMonth: {
      totalDataGb: Math.round(totalDataMb / 1024 * 10) / 10,
      totalCost,
      avgDataPerSim: simStats.assigned > 0 
        ? Math.round((totalDataMb / simStats.assigned) * 10) / 10
        : 0,
    },
    expiringWarranties,
    overDataLimit,
    byCarrier,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function mapSimCard(row: Record<string, unknown>): SimCard {
  const carrier = row.carrier as unknown;
  const carrierData = (Array.isArray(carrier) ? carrier[0] : carrier) as { name: string } | null;
  const plan = row.plan as unknown;
  const planData = (Array.isArray(plan) ? plan[0] : plan) as { name: string } | null;
  const assigned = row.assigned as unknown;
  const assignedData = (Array.isArray(assigned) ? assigned[0] : assigned) as { full_name: string } | null;
  
  return {
    id: row.id as string,
    simNumber: row.sim_number as string,
    phoneNumber: row.phone_number as string,
    iccId: row.icc_id as string,
    carrierId: row.carrier_id as string,
    carrierName: carrierData?.name || 'Unknown',
    planId: row.plan_id as string | null,
    planName: planData?.name || null,
    status: row.status as SimStatus,
    assignedTo: row.assigned_to as string | null,
    assignedToName: assignedData?.full_name || null,
    assignedAt: row.assigned_at as string | null,
    activatedAt: row.activated_at as string | null,
    expiresAt: row.expires_at as string | null,
    dataLimit: row.data_limit as number | null,
    dataUsed: row.data_used as number,
    lastUsageSync: row.last_usage_sync as string | null,
    notes: row.notes as string | null,
  };
}

function mapDevice(row: Record<string, unknown>): Device {
  const assigned = row.assigned as unknown;
  const assignedData = (Array.isArray(assigned) ? assigned[0] : assigned) as { full_name: string } | null;
  const sim = row.sim as unknown;
  const simData = (Array.isArray(sim) ? sim[0] : sim) as { sim_number: string } | null;
  
  return {
    id: row.id as string,
    deviceType: row.device_type as DeviceType,
    brand: row.brand as string,
    model: row.model as string,
    serialNumber: row.serial_number as string,
    imei: row.imei as string | null,
    status: row.status as DeviceStatus,
    purchaseDate: row.purchase_date as string | null,
    purchasePrice: row.purchase_price as number | null,
    warrantyExpiry: row.warranty_expiry as string | null,
    assignedTo: row.assigned_to as string | null,
    assignedToName: assignedData?.full_name || null,
    assignedAt: row.assigned_at as string | null,
    simCardId: row.sim_card_id as string | null,
    simNumber: simData?.sim_number || null,
    condition: row.condition as Device['condition'],
    notes: row.notes as string | null,
  };
}
