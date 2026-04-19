'use client';

/**
 * Vehicle Handover Checklist Service (T-053)
 * 
 * Manages vehicle handover workflows:
 * - Condition documentation
 * - Accessory tracking
 * - Damage recording
 * - Digital signatures
 * - Photo evidence
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type HandoverType = 'assignment' | 'return' | 'transfer' | 'maintenance' | 'inspection';
export type HandoverStatus = 'pending' | 'in_progress' | 'completed' | 'disputed' | 'cancelled';
export type ConditionRating = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';

export interface VehicleHandover {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleName: string;
  handoverType: HandoverType;
  fromRiderId: string | null;
  fromRiderName: string | null;
  toRiderId: string | null;
  toRiderName: string | null;
  handoverDate: string;
  scheduledTime: string | null;
  completedAt: string | null;
  status: HandoverStatus;
  location: string;
  conductedBy: string;
  conductedByName: string;
  currentMileage: number;
  fuelLevel: number;
  overallCondition: ConditionRating;
  conditionNotes: string | null;
  accessories: HandoverAccessory[];
  damages: HandoverDamage[];
  photos: HandoverPhoto[];
  fromSignature: string | null;
  toSignature: string | null;
  conductorSignature: string | null;
  disputeReason: string | null;
}

export interface HandoverAccessory {
  id: string;
  name: string;
  quantity: number;
  condition: ConditionRating;
  present: boolean;
  notes: string | null;
}

export interface HandoverDamage {
  id: string;
  location: 'front' | 'rear' | 'left' | 'right' | 'top' | 'interior' | 'mechanical';
  description: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  preExisting: boolean;
  photoUrls: string[];
  estimatedCost: number | null;
  chargeToRider: boolean;
}

export interface HandoverPhoto {
  id: string;
  category: 'exterior_front' | 'exterior_rear' | 'exterior_left' | 'exterior_right' | 'interior' | 'mileage' | 'damage' | 'accessories';
  url: string;
  caption: string | null;
  takenAt: string;
}

export interface HandoverComparison {
  previousHandover: VehicleHandover | null;
  currentHandover: VehicleHandover;
  mileageDelta: number;
  newDamages: HandoverDamage[];
  missingAccessories: HandoverAccessory[];
  conditionChange: {
    previous: ConditionRating | null;
    current: ConditionRating;
    improved: boolean;
  };
}

// ============================================================================
// LABELS
// ============================================================================

export const HANDOVER_TYPE_LABELS: Record<HandoverType, string> = {
  assignment: 'Assignment to Rider',
  return: 'Return from Rider',
  transfer: 'Transfer Between Riders',
  maintenance: 'Handover for Maintenance',
  inspection: 'Inspection Handover',
};

export const CONDITION_RATING_LABELS: Record<ConditionRating, string> = {
  excellent: 'Excellent - Like New',
  good: 'Good - Minor Wear',
  fair: 'Fair - Normal Wear',
  poor: 'Poor - Needs Attention',
  damaged: 'Damaged - Requires Repair',
};

// ============================================================================
// STANDARD ACCESSORIES LIST
// ============================================================================

const STANDARD_ACCESSORIES = [
  { name: 'Vehicle Key', quantity: 1 },
  { name: 'Spare Key', quantity: 1 },
  { name: 'Delivery Box', quantity: 1 },
  { name: 'Phone Mount', quantity: 1 },
  { name: 'Helmet', quantity: 1 },
  { name: 'Rain Cover', quantity: 1 },
  { name: 'Tool Kit', quantity: 1 },
  { name: 'First Aid Kit', quantity: 1 },
  { name: 'Fire Extinguisher', quantity: 1 },
  { name: 'Reflective Vest', quantity: 1 },
];

// ============================================================================
// HANDOVER CREATION
// ============================================================================

/**
 * Create a new vehicle handover.
 */
export async function createHandover(input: {
  vehicleId: string;
  handoverType: HandoverType;
  fromRiderId?: string;
  toRiderId?: string;
  handoverDate: string;
  scheduledTime?: string;
  location: string;
  conductedBy: string;
}): Promise<{ success: boolean; handoverId?: string; error?: string }> {
  const supabase = createClient();
  
  // Validate vehicle exists
  const { data: vehicle } = await supabase
    .from('assets')
    .select('id, license_plate, asset_name')
    .eq('id', input.vehicleId)
    .single();
  
  if (!vehicle) {
    return { success: false, error: 'Vehicle not found' };
  }
  
  // Validate riders if specified
  if (input.fromRiderId) {
    const { data: fromRider } = await supabase
      .from('employees')
      .select('id')
      .eq('id', input.fromRiderId)
      .single();
    
    if (!fromRider) {
      return { success: false, error: 'From rider not found' };
    }
  }
  
  if (input.toRiderId) {
    const { data: toRider } = await supabase
      .from('employees')
      .select('id')
      .eq('id', input.toRiderId)
      .single();
    
    if (!toRider) {
      return { success: false, error: 'To rider not found' };
    }
  }
  
  // Create handover
  const { data, error } = await supabase
    .from('vehicle_handovers')
    .insert({
      vehicle_id: input.vehicleId,
      handover_type: input.handoverType,
      from_rider_id: input.fromRiderId,
      to_rider_id: input.toRiderId,
      handover_date: input.handoverDate,
      scheduled_time: input.scheduledTime,
      location: input.location,
      conducted_by: input.conductedBy,
      status: 'pending',
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Initialize standard accessories
  const accessories = STANDARD_ACCESSORIES.map(acc => ({
    handover_id: data.id,
    name: acc.name,
    quantity: acc.quantity,
    condition: 'good' as ConditionRating,
    present: true,
  }));
  
  await supabase.from('handover_accessories').insert(accessories);
  
  return { success: true, handoverId: data.id };
}

/**
 * Get handover details.
 */
export async function getHandover(handoverId: string): Promise<VehicleHandover | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('vehicle_handovers')
    .select(`
      *,
      vehicle:assets(license_plate, asset_name),
      from_rider:employees!vehicle_handovers_from_rider_id_fkey(full_name),
      to_rider:employees!vehicle_handovers_to_rider_id_fkey(full_name),
      conductor:employees!vehicle_handovers_conducted_by_fkey(full_name),
      accessories:handover_accessories(*),
      damages:handover_damages(*),
      photos:handover_photos(*)
    `)
    .eq('id', handoverId)
    .single();
  
  if (!data) return null;
  
  return mapHandover(data);
}

/**
 * Get vehicle's handover history.
 */
export async function getVehicleHandoverHistory(
  vehicleId: string,
  limit?: number
): Promise<VehicleHandover[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('vehicle_handovers')
    .select(`
      *,
      vehicle:assets(license_plate, asset_name),
      from_rider:employees!vehicle_handovers_from_rider_id_fkey(full_name),
      to_rider:employees!vehicle_handovers_to_rider_id_fkey(full_name),
      conductor:employees!vehicle_handovers_conducted_by_fkey(full_name),
      accessories:handover_accessories(*),
      damages:handover_damages(*),
      photos:handover_photos(*)
    `)
    .eq('vehicle_id', vehicleId)
    .order('handover_date', { ascending: false });
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data } = await query;
  
  return (data || []).map(mapHandover);
}

// ============================================================================
// HANDOVER PROCESS
// ============================================================================

/**
 * Start handover process.
 */
export async function startHandover(handoverId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('vehicle_handovers')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
    })
    .eq('id', handoverId)
    .eq('status', 'pending');
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Record vehicle condition.
 */
export async function recordCondition(
  handoverId: string,
  input: {
    currentMileage: number;
    fuelLevel: number;
    overallCondition: ConditionRating;
    conditionNotes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('vehicle_handovers')
    .update({
      current_mileage: input.currentMileage,
      fuel_level: input.fuelLevel,
      overall_condition: input.overallCondition,
      condition_notes: input.conditionNotes,
    })
    .eq('id', handoverId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Update accessory status.
 */
export async function updateAccessory(
  accessoryId: string,
  input: {
    present: boolean;
    condition: ConditionRating;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('handover_accessories')
    .update({
      present: input.present,
      condition: input.condition,
      notes: input.notes,
    })
    .eq('id', accessoryId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Record damage.
 */
export async function recordDamage(
  handoverId: string,
  input: {
    location: HandoverDamage['location'];
    description: string;
    severity: HandoverDamage['severity'];
    preExisting: boolean;
    estimatedCost?: number;
    chargeToRider?: boolean;
  }
): Promise<{ success: boolean; damageId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('handover_damages')
    .insert({
      handover_id: handoverId,
      location: input.location,
      description: input.description,
      severity: input.severity,
      pre_existing: input.preExisting,
      estimated_cost: input.estimatedCost,
      charge_to_rider: input.chargeToRider || false,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, damageId: data.id };
}

/**
 * Add photo to damage record.
 */
export async function addDamagePhoto(
  damageId: string,
  photoUrl: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Get current photos
  const { data: damage } = await supabase
    .from('handover_damages')
    .select('photo_urls')
    .eq('id', damageId)
    .single();
  
  if (!damage) {
    return { success: false, error: 'Damage record not found' };
  }
  
  const photoUrls = [...(damage.photo_urls || []), photoUrl];
  
  const { error } = await supabase
    .from('handover_damages')
    .update({ photo_urls: photoUrls })
    .eq('id', damageId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Add handover photo.
 */
export async function addHandoverPhoto(
  handoverId: string,
  input: {
    category: HandoverPhoto['category'];
    url: string;
    caption?: string;
  }
): Promise<{ success: boolean; photoId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('handover_photos')
    .insert({
      handover_id: handoverId,
      category: input.category,
      url: input.url,
      caption: input.caption,
      taken_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, photoId: data.id };
}

// ============================================================================
// SIGNATURES
// ============================================================================

/**
 * Add signature to handover.
 */
export async function addSignature(
  handoverId: string,
  signatureType: 'from' | 'to' | 'conductor',
  signatureData: string // Base64 encoded signature image
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const updateField = {
    from: 'from_signature',
    to: 'to_signature',
    conductor: 'conductor_signature',
  }[signatureType];
  
  const { error } = await supabase
    .from('vehicle_handovers')
    .update({ [updateField]: signatureData })
    .eq('id', handoverId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// COMPLETION
// ============================================================================

/**
 * Complete handover.
 */
export async function completeHandover(handoverId: string): Promise<{ 
  success: boolean; 
  validation?: { valid: boolean; errors: string[] }; 
  error?: string 
}> {
  const supabase = createClient();
  
  // Validate all required fields
  const handover = await getHandover(handoverId);
  
  if (!handover) {
    return { success: false, error: 'Handover not found' };
  }
  
  const validationErrors: string[] = [];
  
  if (!handover.currentMileage) {
    validationErrors.push('Mileage not recorded');
  }
  
  if (!handover.overallCondition) {
    validationErrors.push('Overall condition not recorded');
  }
  
  // Check required photos
  const requiredPhotoCategories = ['exterior_front', 'exterior_rear', 'mileage'];
  const photoCategories = new Set(handover.photos.map(p => p.category));
  
  for (const category of requiredPhotoCategories) {
    if (!photoCategories.has(category as HandoverPhoto['category'])) {
      validationErrors.push(`Missing ${category.replace('_', ' ')} photo`);
    }
  }
  
  // Check signatures based on handover type
  if (handover.handoverType === 'assignment' && !handover.toSignature) {
    validationErrors.push('Receiving rider signature required');
  }
  
  if (handover.handoverType === 'return' && !handover.fromSignature) {
    validationErrors.push('Returning rider signature required');
  }
  
  if (!handover.conductorSignature) {
    validationErrors.push('Conductor signature required');
  }
  
  if (validationErrors.length > 0) {
    return { 
      success: false, 
      validation: { valid: false, errors: validationErrors },
    };
  }
  
  // Complete the handover
  const { error } = await supabase
    .from('vehicle_handovers')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', handoverId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update vehicle assignment if applicable
  if (handover.handoverType === 'assignment' && handover.toRiderId) {
    await supabase
      .from('rider_vehicle_assignments')
      .insert({
        employee_id: handover.toRiderId,
        asset_id: handover.vehicleId,
        start_date: new Date().toISOString(),
        handover_id: handoverId,
      });
    
    await supabase
      .from('assets')
      .update({ 
        status: 'in_use',
        current_rider_id: handover.toRiderId,
      })
      .eq('id', handover.vehicleId);
  }
  
  if (handover.handoverType === 'return' && handover.fromRiderId) {
    await supabase
      .from('rider_vehicle_assignments')
      .update({ end_date: new Date().toISOString() })
      .eq('employee_id', handover.fromRiderId)
      .eq('asset_id', handover.vehicleId)
      .is('end_date', null);
    
    await supabase
      .from('assets')
      .update({ 
        status: 'available',
        current_rider_id: null,
      })
      .eq('id', handover.vehicleId);
  }
  
  // Process damage charges if any
  const chargeableDamages = handover.damages.filter(d => d.chargeToRider && !d.preExisting);
  for (const damage of chargeableDamages) {
    const riderId = handover.fromRiderId || handover.toRiderId;
    if (riderId && damage.estimatedCost) {
      await supabase.from('damage_charges').insert({
        employee_id: riderId,
        vehicle_id: handover.vehicleId,
        handover_id: handoverId,
        damage_id: damage.id,
        amount: damage.estimatedCost,
        status: 'pending',
      });
    }
  }
  
  return { success: true, validation: { valid: true, errors: [] } };
}

/**
 * Dispute handover.
 */
export async function disputeHandover(
  handoverId: string,
  reason: string,
  disputedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('vehicle_handovers')
    .update({
      status: 'disputed',
      dispute_reason: reason,
      disputed_by: disputedBy,
      disputed_at: new Date().toISOString(),
    })
    .eq('id', handoverId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// COMPARISON
// ============================================================================

/**
 * Compare current handover with previous one.
 */
export async function compareHandovers(handoverId: string): Promise<HandoverComparison | null> {
  const supabase = createClient();
  
  const current = await getHandover(handoverId);
  if (!current) return null;
  
  // Get previous handover for this vehicle
  const { data: previousData } = await supabase
    .from('vehicle_handovers')
    .select(`
      *,
      vehicle:assets(license_plate, asset_name),
      from_rider:employees!vehicle_handovers_from_rider_id_fkey(full_name),
      to_rider:employees!vehicle_handovers_to_rider_id_fkey(full_name),
      conductor:employees!vehicle_handovers_conducted_by_fkey(full_name),
      accessories:handover_accessories(*),
      damages:handover_damages(*),
      photos:handover_photos(*)
    `)
    .eq('vehicle_id', current.vehicleId)
    .eq('status', 'completed')
    .lt('completed_at', current.completedAt || new Date().toISOString())
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();
  
  const previous = previousData ? mapHandover(previousData) : null;
  
  // Calculate differences
  const mileageDelta = previous ? current.currentMileage - previous.currentMileage : current.currentMileage;
  
  // Find new damages (not marked as pre-existing)
  const newDamages = current.damages.filter(d => !d.preExisting);
  
  // Find missing accessories
  const previousAccessoryNames = new Set(
    previous?.accessories.filter(a => a.present).map(a => a.name) || []
  );
  const missingAccessories = current.accessories.filter(
    a => !a.present && previousAccessoryNames.has(a.name)
  );
  
  // Condition change
  const conditionOrder: ConditionRating[] = ['excellent', 'good', 'fair', 'poor', 'damaged'];
  const previousIndex = previous ? conditionOrder.indexOf(previous.overallCondition) : -1;
  const currentIndex = conditionOrder.indexOf(current.overallCondition);
  
  return {
    previousHandover: previous,
    currentHandover: current,
    mileageDelta,
    newDamages,
    missingAccessories,
    conditionChange: {
      previous: previous?.overallCondition || null,
      current: current.overallCondition,
      improved: previousIndex > currentIndex,
    },
  };
}

// ============================================================================
// REPORTING
// ============================================================================

export interface HandoverSummary {
  totalHandovers: number;
  completedThisMonth: number;
  pendingHandovers: number;
  disputedHandovers: number;
  avgCompletionTime: number; // minutes
  totalDamagesReported: number;
  totalDamageCharges: number;
  byType: Record<HandoverType, number>;
}

export async function getHandoverSummary(): Promise<HandoverSummary> {
  const supabase = createClient();
  
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  const { data: handovers } = await supabase
    .from('vehicle_handovers')
    .select('status, handover_type, started_at, completed_at');
  
  const { data: damages } = await supabase
    .from('handover_damages')
    .select('estimated_cost, charge_to_rider, pre_existing');
  
  const byType: Record<HandoverType, number> = {
    assignment: 0,
    return: 0,
    transfer: 0,
    maintenance: 0,
    inspection: 0,
  };
  
  let totalCompletionTime = 0;
  let completedCount = 0;
  let completedThisMonth = 0;
  
  for (const h of handovers || []) {
    byType[h.handover_type as HandoverType]++;
    
    if (h.status === 'completed' && h.started_at && h.completed_at) {
      const started = new Date(h.started_at).getTime();
      const completed = new Date(h.completed_at).getTime();
      totalCompletionTime += (completed - started) / (1000 * 60); // minutes
      completedCount++;
      
      if (h.completed_at >= monthStart) {
        completedThisMonth++;
      }
    }
  }
  
  const totalDamagesReported = damages?.filter(d => !d.pre_existing).length || 0;
  const totalDamageCharges = damages
    ?.filter(d => d.charge_to_rider && !d.pre_existing)
    .reduce((sum, d) => sum + (d.estimated_cost || 0), 0) || 0;
  
  return {
    totalHandovers: handovers?.length || 0,
    completedThisMonth,
    pendingHandovers: handovers?.filter(h => h.status === 'pending' || h.status === 'in_progress').length || 0,
    disputedHandovers: handovers?.filter(h => h.status === 'disputed').length || 0,
    avgCompletionTime: completedCount > 0 ? Math.round(totalCompletionTime / completedCount) : 0,
    totalDamagesReported,
    totalDamageCharges,
    byType,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function mapHandover(row: Record<string, unknown>): VehicleHandover {
  const vehicle = row.vehicle as Record<string, unknown> | null;
  const fromRider = row.from_rider as unknown;
  const fromRiderData = (Array.isArray(fromRider) ? fromRider[0] : fromRider) as { full_name: string } | null;
  const toRider = row.to_rider as unknown;
  const toRiderData = (Array.isArray(toRider) ? toRider[0] : toRider) as { full_name: string } | null;
  const conductor = row.conductor as unknown;
  const conductorData = (Array.isArray(conductor) ? conductor[0] : conductor) as { full_name: string } | null;
  
  return {
    id: row.id as string,
    vehicleId: row.vehicle_id as string,
    vehiclePlate: vehicle?.license_plate as string || '',
    vehicleName: vehicle?.asset_name as string || '',
    handoverType: row.handover_type as HandoverType,
    fromRiderId: row.from_rider_id as string | null,
    fromRiderName: fromRiderData?.full_name || null,
    toRiderId: row.to_rider_id as string | null,
    toRiderName: toRiderData?.full_name || null,
    handoverDate: row.handover_date as string,
    scheduledTime: row.scheduled_time as string | null,
    completedAt: row.completed_at as string | null,
    status: row.status as HandoverStatus,
    location: row.location as string,
    conductedBy: row.conducted_by as string,
    conductedByName: conductorData?.full_name || '',
    currentMileage: row.current_mileage as number || 0,
    fuelLevel: row.fuel_level as number || 0,
    overallCondition: row.overall_condition as ConditionRating || 'good',
    conditionNotes: row.condition_notes as string | null,
    accessories: (row.accessories as Array<Record<string, unknown>> || []).map(mapAccessory),
    damages: (row.damages as Array<Record<string, unknown>> || []).map(mapDamage),
    photos: (row.photos as Array<Record<string, unknown>> || []).map(mapPhoto),
    fromSignature: row.from_signature as string | null,
    toSignature: row.to_signature as string | null,
    conductorSignature: row.conductor_signature as string | null,
    disputeReason: row.dispute_reason as string | null,
  };
}

function mapAccessory(row: Record<string, unknown>): HandoverAccessory {
  return {
    id: row.id as string,
    name: row.name as string,
    quantity: row.quantity as number,
    condition: row.condition as ConditionRating,
    present: row.present as boolean,
    notes: row.notes as string | null,
  };
}

function mapDamage(row: Record<string, unknown>): HandoverDamage {
  return {
    id: row.id as string,
    location: row.location as HandoverDamage['location'],
    description: row.description as string,
    severity: row.severity as HandoverDamage['severity'],
    preExisting: row.pre_existing as boolean,
    photoUrls: (row.photo_urls as string[]) || [],
    estimatedCost: row.estimated_cost as number | null,
    chargeToRider: row.charge_to_rider as boolean,
  };
}

function mapPhoto(row: Record<string, unknown>): HandoverPhoto {
  return {
    id: row.id as string,
    category: row.category as HandoverPhoto['category'],
    url: row.url as string,
    caption: row.caption as string | null,
    takenAt: row.taken_at as string,
  };
}
