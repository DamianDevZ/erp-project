'use client';

/**
 * Rider Allocation & Pairing Service (T-035/T-036)
 * 
 * Manages:
 * - Rider-to-aggregator platform assignment
 * - Rider-to-vehicle pairing for shifts
 * - Shift scheduling and availability
 * - Allocation optimization
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type AllocationStatus = 'active' | 'pending' | 'suspended' | 'terminated';
export type PairingStatus = 'active' | 'scheduled' | 'completed' | 'cancelled';
export type ShiftStatus = 'scheduled' | 'in_progress' | 'completed' | 'no_show' | 'cancelled';

export interface PlatformAllocation {
  id: string;
  riderId: string;
  riderName: string;
  platformId: string;
  platformName: string;
  platformAccountId: string;
  status: AllocationStatus;
  startDate: string;
  endDate: string | null;
  primaryPlatform: boolean;
  performanceScore: number | null;
  lastActiveAt: string | null;
}

export interface VehiclePairing {
  id: string;
  riderId: string;
  riderName: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleType: string;
  status: PairingStatus;
  startDate: string;
  endDate: string | null;
  shiftPattern: string | null;
  isPermanent: boolean;
}

export interface ShiftAssignment {
  id: string;
  riderId: string;
  riderName: string;
  vehicleId: string;
  vehiclePlate: string;
  platformId: string;
  platformName: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  ordersCompleted: number;
  hoursWorked: number | null;
}

export interface AllocationSlot {
  platformId: string;
  platformName: string;
  date: string;
  shift: 'morning' | 'afternoon' | 'evening' | 'night';
  requiredRiders: number;
  allocatedRiders: number;
  availableRiders: string[];
}

// ============================================================================
// PLATFORM ALLOCATION
// ============================================================================

/**
 * Allocate a rider to a platform.
 */
export async function allocateRiderToPlatform(input: {
  riderId: string;
  platformId: string;
  platformAccountId: string;
  startDate: string;
  primaryPlatform?: boolean;
}): Promise<{ success: boolean; allocationId?: string; error?: string }> {
  const supabase = createClient();
  
  // Check rider eligibility
  const { data: rider } = await supabase
    .from('employees')
    .select('id, status, is_eligible')
    .eq('id', input.riderId)
    .single();
  
  if (!rider) {
    return { success: false, error: 'Rider not found' };
  }
  
  if (rider.status !== 'active' || !rider.is_eligible) {
    return { success: false, error: 'Rider is not eligible for allocation' };
  }
  
  // Check for existing active allocation to same platform
  const { data: existing } = await supabase
    .from('platform_allocations')
    .select('id')
    .eq('rider_id', input.riderId)
    .eq('platform_id', input.platformId)
    .eq('status', 'active')
    .single();
  
  if (existing) {
    return { success: false, error: 'Rider already allocated to this platform' };
  }
  
  // If setting as primary, unset other primaries
  if (input.primaryPlatform) {
    await supabase
      .from('platform_allocations')
      .update({ primary_platform: false })
      .eq('rider_id', input.riderId)
      .eq('status', 'active');
  }
  
  // Create allocation
  const { data, error } = await supabase
    .from('platform_allocations')
    .insert({
      rider_id: input.riderId,
      platform_id: input.platformId,
      platform_account_id: input.platformAccountId,
      status: 'active',
      start_date: input.startDate,
      primary_platform: input.primaryPlatform || false,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, allocationId: data.id };
}

/**
 * Get rider's platform allocations.
 */
export async function getRiderAllocations(riderId: string): Promise<PlatformAllocation[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('platform_allocations')
    .select(`
      *,
      rider:employees(full_name),
      platform:platforms(name)
    `)
    .eq('rider_id', riderId)
    .order('primary_platform', { ascending: false });
  
  return (data || []).map(row => {
    const rider = row.rider as unknown;
    const riderData = (Array.isArray(rider) ? rider[0] : rider) as { full_name: string } | null;
    const platform = row.platform as unknown;
    const platformData = (Array.isArray(platform) ? platform[0] : platform) as { name: string } | null;
    
    return {
      id: row.id,
      riderId: row.rider_id,
      riderName: riderData?.full_name || 'Unknown',
      platformId: row.platform_id,
      platformName: platformData?.name || 'Unknown',
      platformAccountId: row.platform_account_id,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      primaryPlatform: row.primary_platform,
      performanceScore: row.performance_score,
      lastActiveAt: row.last_active_at,
    };
  });
}

/**
 * Suspend a platform allocation.
 */
export async function suspendAllocation(
  allocationId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('platform_allocations')
    .update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspension_reason: reason,
    })
    .eq('id', allocationId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Terminate a platform allocation.
 */
export async function terminateAllocation(
  allocationId: string,
  endDate: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('platform_allocations')
    .update({
      status: 'terminated',
      end_date: endDate,
    })
    .eq('id', allocationId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// VEHICLE PAIRING
// ============================================================================

/**
 * Pair a rider with a vehicle.
 */
export async function pairRiderWithVehicle(input: {
  riderId: string;
  vehicleId: string;
  startDate: string;
  endDate?: string;
  shiftPattern?: string;
  isPermanent?: boolean;
}): Promise<{ success: boolean; pairingId?: string; error?: string }> {
  const supabase = createClient();
  
  // Check vehicle availability
  const { data: vehicle } = await supabase
    .from('assets')
    .select('id, status, license_plate')
    .eq('id', input.vehicleId)
    .single();
  
  if (!vehicle) {
    return { success: false, error: 'Vehicle not found' };
  }
  
  if (vehicle.status !== 'available' && vehicle.status !== 'active') {
    return { success: false, error: 'Vehicle is not available' };
  }
  
  // Check for existing active pairing for this vehicle
  const { data: existingVehicle } = await supabase
    .from('rider_vehicle_pairings')
    .select('id')
    .eq('vehicle_id', input.vehicleId)
    .in('status', ['active', 'scheduled'])
    .is('end_date', null)
    .single();
  
  if (existingVehicle && input.isPermanent) {
    return { success: false, error: 'Vehicle is already paired with another rider' };
  }
  
  // Check for existing permanent pairing for this rider
  const { data: existingRider } = await supabase
    .from('rider_vehicle_pairings')
    .select('id')
    .eq('rider_id', input.riderId)
    .eq('is_permanent', true)
    .eq('status', 'active')
    .single();
  
  if (existingRider && input.isPermanent) {
    return { success: false, error: 'Rider already has a permanent vehicle pairing' };
  }
  
  // Create pairing
  const { data, error } = await supabase
    .from('rider_vehicle_pairings')
    .insert({
      rider_id: input.riderId,
      vehicle_id: input.vehicleId,
      status: 'active',
      start_date: input.startDate,
      end_date: input.endDate,
      shift_pattern: input.shiftPattern,
      is_permanent: input.isPermanent || false,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update vehicle status
  await supabase
    .from('assets')
    .update({ status: 'in_use' })
    .eq('id', input.vehicleId);
  
  return { success: true, pairingId: data.id };
}

/**
 * Get rider's vehicle pairings.
 */
export async function getRiderVehiclePairings(riderId: string): Promise<VehiclePairing[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('rider_vehicle_pairings')
    .select(`
      *,
      rider:employees(full_name),
      vehicle:assets(license_plate, asset_category)
    `)
    .eq('rider_id', riderId)
    .order('created_at', { ascending: false });
  
  return (data || []).map(row => {
    const rider = row.rider as unknown;
    const riderData = (Array.isArray(rider) ? rider[0] : rider) as { full_name: string } | null;
    const vehicle = row.vehicle as unknown;
    const vehicleData = (Array.isArray(vehicle) ? vehicle[0] : vehicle) as { license_plate: string; asset_category: string } | null;
    
    return {
      id: row.id,
      riderId: row.rider_id,
      riderName: riderData?.full_name || 'Unknown',
      vehicleId: row.vehicle_id,
      vehiclePlate: vehicleData?.license_plate || 'Unknown',
      vehicleType: vehicleData?.asset_category || 'Unknown',
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      shiftPattern: row.shift_pattern,
      isPermanent: row.is_permanent,
    };
  });
}

/**
 * End a vehicle pairing.
 */
export async function endVehiclePairing(
  pairingId: string,
  endDate: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Get pairing details
  const { data: pairing } = await supabase
    .from('rider_vehicle_pairings')
    .select('vehicle_id')
    .eq('id', pairingId)
    .single();
  
  if (!pairing) {
    return { success: false, error: 'Pairing not found' };
  }
  
  // Update pairing
  const { error } = await supabase
    .from('rider_vehicle_pairings')
    .update({
      status: 'completed',
      end_date: endDate,
    })
    .eq('id', pairingId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update vehicle status back to available
  await supabase
    .from('assets')
    .update({ status: 'available' })
    .eq('id', pairing.vehicle_id);
  
  return { success: true };
}

// ============================================================================
// SHIFT SCHEDULING
// ============================================================================

/**
 * Create a shift assignment.
 */
export async function createShiftAssignment(input: {
  riderId: string;
  vehicleId: string;
  platformId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
}): Promise<{ success: boolean; shiftId?: string; error?: string }> {
  const supabase = createClient();
  
  // Check for overlapping shifts
  const { data: existing } = await supabase
    .from('shift_assignments')
    .select('id')
    .eq('rider_id', input.riderId)
    .eq('shift_date', input.shiftDate)
    .neq('status', 'cancelled')
    .or(`start_time.lte.${input.endTime},end_time.gte.${input.startTime}`);
  
  if (existing && existing.length > 0) {
    return { success: false, error: 'Rider has overlapping shift' };
  }
  
  // Create shift
  const { data, error } = await supabase
    .from('shift_assignments')
    .insert({
      rider_id: input.riderId,
      vehicle_id: input.vehicleId,
      platform_id: input.platformId,
      shift_date: input.shiftDate,
      start_time: input.startTime,
      end_time: input.endTime,
      status: 'scheduled',
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, shiftId: data.id };
}

/**
 * Record shift check-in.
 */
export async function checkInToShift(
  shiftId: string,
  location?: { lat: number; lng: number }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('shift_assignments')
    .update({
      status: 'in_progress',
      check_in_time: new Date().toISOString(),
      check_in_location: location ? `POINT(${location.lng} ${location.lat})` : null,
    })
    .eq('id', shiftId)
    .eq('status', 'scheduled');
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Record shift check-out.
 */
export async function checkOutFromShift(
  shiftId: string,
  ordersCompleted: number,
  location?: { lat: number; lng: number }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Get shift details for hours calculation
  const { data: shift } = await supabase
    .from('shift_assignments')
    .select('check_in_time')
    .eq('id', shiftId)
    .single();
  
  if (!shift?.check_in_time) {
    return { success: false, error: 'Shift not checked in' };
  }
  
  const checkInTime = new Date(shift.check_in_time);
  const checkOutTime = new Date();
  const hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
  
  const { error } = await supabase
    .from('shift_assignments')
    .update({
      status: 'completed',
      check_out_time: checkOutTime.toISOString(),
      check_out_location: location ? `POINT(${location.lng} ${location.lat})` : null,
      orders_completed: ordersCompleted,
      hours_worked: Math.round(hoursWorked * 100) / 100,
    })
    .eq('id', shiftId)
    .eq('status', 'in_progress');
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Get shift assignments for a date range.
 */
export async function getShiftAssignments(
  startDate: string,
  endDate: string,
  filters?: {
    riderId?: string;
    platformId?: string;
    status?: ShiftStatus;
  }
): Promise<ShiftAssignment[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('shift_assignments')
    .select(`
      *,
      rider:employees(full_name),
      vehicle:assets(license_plate),
      platform:platforms(name)
    `)
    .gte('shift_date', startDate)
    .lte('shift_date', endDate)
    .order('shift_date')
    .order('start_time');
  
  if (filters?.riderId) {
    query = query.eq('rider_id', filters.riderId);
  }
  if (filters?.platformId) {
    query = query.eq('platform_id', filters.platformId);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  
  const { data } = await query;
  
  return (data || []).map(row => {
    const rider = row.rider as unknown;
    const riderData = (Array.isArray(rider) ? rider[0] : rider) as { full_name: string } | null;
    const vehicle = row.vehicle as unknown;
    const vehicleData = (Array.isArray(vehicle) ? vehicle[0] : vehicle) as { license_plate: string } | null;
    const platform = row.platform as unknown;
    const platformData = (Array.isArray(platform) ? platform[0] : platform) as { name: string } | null;
    
    return {
      id: row.id,
      riderId: row.rider_id,
      riderName: riderData?.full_name || 'Unknown',
      vehicleId: row.vehicle_id,
      vehiclePlate: vehicleData?.license_plate || 'Unknown',
      platformId: row.platform_id,
      platformName: platformData?.name || 'Unknown',
      shiftDate: row.shift_date,
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status,
      checkInTime: row.check_in_time,
      checkOutTime: row.check_out_time,
      ordersCompleted: row.orders_completed || 0,
      hoursWorked: row.hours_worked,
    };
  });
}

// ============================================================================
// ALLOCATION OPTIMIZATION
// ============================================================================

/**
 * Get available riders for a platform shift.
 */
export async function getAvailableRiders(
  platformId: string,
  shiftDate: string,
  startTime: string,
  endTime: string
): Promise<Array<{ riderId: string; riderName: string; performanceScore: number | null }>> {
  const supabase = createClient();
  
  // Get riders allocated to this platform
  const { data: allocations } = await supabase
    .from('platform_allocations')
    .select(`
      rider_id,
      performance_score,
      rider:employees(full_name, status)
    `)
    .eq('platform_id', platformId)
    .eq('status', 'active');
  
  if (!allocations) return [];
  
  // Filter out riders with conflicting shifts
  const { data: busyRiders } = await supabase
    .from('shift_assignments')
    .select('rider_id')
    .eq('shift_date', shiftDate)
    .neq('status', 'cancelled')
    .or(`start_time.lte.${endTime},end_time.gte.${startTime}`);
  
  const busyRiderIds = new Set((busyRiders || []).map(r => r.rider_id));
  
  // Filter out riders on leave
  const { data: onLeave } = await supabase
    .from('leave_requests')
    .select('employee_id')
    .eq('status', 'approved')
    .lte('start_date', shiftDate)
    .gte('end_date', shiftDate);
  
  const onLeaveIds = new Set((onLeave || []).map(l => l.employee_id));
  
  return allocations
    .filter(a => {
      const rider = a.rider as unknown;
      const riderData = (Array.isArray(rider) ? rider[0] : rider) as { full_name: string; status: string } | null;
      return riderData?.status === 'active' &&
        !busyRiderIds.has(a.rider_id) &&
        !onLeaveIds.has(a.rider_id);
    })
    .map(a => {
      const rider = a.rider as unknown;
      const riderData = (Array.isArray(rider) ? rider[0] : rider) as { full_name: string } | null;
      return {
        riderId: a.rider_id,
        riderName: riderData?.full_name || 'Unknown',
        performanceScore: a.performance_score,
      };
    })
    .sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0));
}

/**
 * Get allocation slots with coverage status.
 */
export async function getAllocationSlots(
  platformId: string,
  startDate: string,
  endDate: string
): Promise<AllocationSlot[]> {
  const supabase = createClient();
  const slots: AllocationSlot[] = [];
  
  // Get platform requirements (from platform config)
  const { data: platform } = await supabase
    .from('platforms')
    .select('name, rider_requirements')
    .eq('id', platformId)
    .single();
  
  if (!platform) return [];
  
  const requirements = (platform.rider_requirements as { shifts?: Record<string, number> }) || {};
  const shiftRequirements = requirements.shifts || {
    morning: 10,
    afternoon: 15,
    evening: 20,
    night: 8,
  };
  
  const shifts: Array<'morning' | 'afternoon' | 'evening' | 'night'> = ['morning', 'afternoon', 'evening', 'night'];
  const shiftTimes: Record<string, { start: string; end: string }> = {
    morning: { start: '06:00', end: '12:00' },
    afternoon: { start: '12:00', end: '18:00' },
    evening: { start: '18:00', end: '00:00' },
    night: { start: '00:00', end: '06:00' },
  };
  
  // Generate slots for each day
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    
    for (const shift of shifts) {
      const times = shiftTimes[shift];
      
      // Get allocated count
      const { data: assigned } = await supabase
        .from('shift_assignments')
        .select('id')
        .eq('platform_id', platformId)
        .eq('shift_date', dateStr)
        .gte('start_time', times.start)
        .lte('end_time', times.end)
        .neq('status', 'cancelled');
      
      // Get available riders
      const available = await getAvailableRiders(
        platformId,
        dateStr,
        times.start,
        times.end
      );
      
      slots.push({
        platformId,
        platformName: platform.name,
        date: dateStr,
        shift,
        requiredRiders: shiftRequirements[shift] || 10,
        allocatedRiders: assigned?.length || 0,
        availableRiders: available.map(r => r.riderId),
      });
    }
  }
  
  return slots;
}

// ============================================================================
// REPORTING
// ============================================================================

export interface AllocationSummary {
  totalAllocations: number;
  activeAllocations: number;
  suspendedAllocations: number;
  totalPairings: number;
  activePairings: number;
  shiftsToday: number;
  shiftsCompleted: number;
  averageOrdersPerShift: number;
  coverageByPlatform: Array<{
    platformId: string;
    platformName: string;
    required: number;
    allocated: number;
    coverage: number;
  }>;
}

export async function getAllocationSummary(): Promise<AllocationSummary> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];
  
  const { data: allocations } = await supabase
    .from('platform_allocations')
    .select('id, status');
  
  const { data: pairings } = await supabase
    .from('rider_vehicle_pairings')
    .select('id, status');
  
  const { data: todayShifts } = await supabase
    .from('shift_assignments')
    .select('id, status, orders_completed')
    .eq('shift_date', today);
  
  const { data: platforms } = await supabase
    .from('platforms')
    .select('id, name, rider_requirements');
  
  const coverageByPlatform: AllocationSummary['coverageByPlatform'] = [];
  
  for (const platform of platforms || []) {
    const { data: platformAllocations } = await supabase
      .from('platform_allocations')
      .select('id')
      .eq('platform_id', platform.id)
      .eq('status', 'active');
    
    const requirements = (platform.rider_requirements as { total?: number }) || {};
    const required = requirements.total || 50;
    const allocated = platformAllocations?.length || 0;
    
    coverageByPlatform.push({
      platformId: platform.id,
      platformName: platform.name,
      required,
      allocated,
      coverage: Math.round((allocated / required) * 100),
    });
  }
  
  const completedShifts = todayShifts?.filter(s => s.status === 'completed') || [];
  const totalOrders = completedShifts.reduce((sum, s) => sum + (s.orders_completed || 0), 0);
  
  return {
    totalAllocations: allocations?.length || 0,
    activeAllocations: allocations?.filter(a => a.status === 'active').length || 0,
    suspendedAllocations: allocations?.filter(a => a.status === 'suspended').length || 0,
    totalPairings: pairings?.length || 0,
    activePairings: pairings?.filter(p => p.status === 'active').length || 0,
    shiftsToday: todayShifts?.length || 0,
    shiftsCompleted: completedShifts.length,
    averageOrdersPerShift: completedShifts.length > 0 
      ? Math.round(totalOrders / completedShifts.length) 
      : 0,
    coverageByPlatform,
  };
}
