'use client';

/**
 * Vehicle Onboarding Checklist Service (T-047)
 * 
 * Manages the onboarding workflow for new vehicles:
 * - Registration verification
 * - Insurance validation
 * - Photo documentation
 * - VIN validation
 * - Readiness checks
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type VehicleOnboardingStatus = 
  | 'pending_documents'
  | 'documents_review'
  | 'pending_inspection'
  | 'inspection_scheduled'
  | 'inspection_complete'
  | 'pending_approval'
  | 'approved'
  | 'rejected';

export type VehicleChecklistItemStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'waived';

export type VehicleCategory = 'motorcycle' | 'scooter' | 'car' | 'van' | 'truck';

export interface VehicleOnboarding {
  id: string;
  vehicleId: string;
  licensePlate: string;
  category: VehicleCategory;
  make: string;
  model: string;
  year: number;
  vin: string;
  ownerType: 'company' | 'rider';
  ownerId: string | null;
  ownerName: string | null;
  status: VehicleOnboardingStatus;
  startedAt: string;
  completedAt: string | null;
  checklist: VehicleChecklistItem[];
  documents: VehicleDocument[];
  inspection: VehicleInspection | null;
}

export interface VehicleChecklistItem {
  id: string;
  category: 'documents' | 'inspection' | 'equipment' | 'compliance';
  title: string;
  description: string;
  status: VehicleChecklistItemStatus;
  required: boolean;
  completedBy: string | null;
  completedAt: string | null;
  notes: string | null;
  failureReason: string | null;
}

export interface VehicleDocument {
  id: string;
  documentType: 'registration' | 'insurance' | 'ownership' | 'inspection_cert' | 'photo';
  documentUrl: string;
  expiryDate: string | null;
  verified: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  uploadedAt: string;
}

export interface VehicleInspection {
  id: string;
  scheduledDate: string;
  inspectedAt: string | null;
  inspectorId: string | null;
  inspectorName: string | null;
  location: string;
  result: 'pending' | 'passed' | 'failed' | 'conditional';
  mileage: number | null;
  fuelLevel: number | null;
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor';
  exteriorNotes: string | null;
  interiorNotes: string | null;
  mechanicalNotes: string | null;
  photos: string[];
  defects: VehicleDefect[];
}

export interface VehicleDefect {
  id: string;
  category: 'exterior' | 'interior' | 'mechanical' | 'safety' | 'cosmetic';
  description: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  photoUrl: string | null;
  repairRequired: boolean;
  estimatedCost: number | null;
}

// ============================================================================
// LABELS
// ============================================================================

export const VEHICLE_ONBOARDING_STATUS_LABELS: Record<VehicleOnboardingStatus, string> = {
  pending_documents: 'Pending Documents',
  documents_review: 'Documents Under Review',
  pending_inspection: 'Pending Inspection',
  inspection_scheduled: 'Inspection Scheduled',
  inspection_complete: 'Inspection Complete',
  pending_approval: 'Pending Final Approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {
  motorcycle: 'Motorcycle',
  scooter: 'Scooter',
  car: 'Car',
  van: 'Van',
  truck: 'Truck',
};

// ============================================================================
// CHECKLIST TEMPLATES
// ============================================================================

const VEHICLE_CHECKLIST_TEMPLATE: Array<Omit<VehicleChecklistItem, 'id' | 'completedBy' | 'completedAt' | 'notes' | 'failureReason'>> = [
  // Documents
  { category: 'documents', title: 'Vehicle Registration', description: 'Valid government vehicle registration', status: 'pending', required: true },
  { category: 'documents', title: 'Insurance Certificate', description: 'Valid comprehensive insurance coverage', status: 'pending', required: true },
  { category: 'documents', title: 'Ownership Proof', description: 'Title or ownership transfer document', status: 'pending', required: true },
  { category: 'documents', title: 'Registration Photos', description: 'Clear photos of all license plates', status: 'pending', required: true },
  
  // Inspection
  { category: 'inspection', title: 'VIN Verification', description: 'VIN matches registration documents', status: 'pending', required: true },
  { category: 'inspection', title: 'Exterior Condition', description: 'Body, paint, lights, mirrors inspection', status: 'pending', required: true },
  { category: 'inspection', title: 'Interior Condition', description: 'Seats, dashboard, controls inspection', status: 'pending', required: true },
  { category: 'inspection', title: 'Mechanical Check', description: 'Engine, brakes, suspension, tires', status: 'pending', required: true },
  { category: 'inspection', title: 'Safety Features', description: 'Horn, lights, indicators, brakes test', status: 'pending', required: true },
  
  // Equipment
  { category: 'equipment', title: 'Delivery Box', description: 'Delivery box installed and secure (if applicable)', status: 'pending', required: false },
  { category: 'equipment', title: 'Phone Mount', description: 'Phone holder installed', status: 'pending', required: false },
  { category: 'equipment', title: 'GPS Tracker', description: 'GPS tracking device installed', status: 'pending', required: true },
  
  // Compliance
  { category: 'compliance', title: 'Platform Decals', description: 'Required platform branding applied', status: 'pending', required: false },
  { category: 'compliance', title: 'Road Tax', description: 'Road tax paid and valid', status: 'pending', required: true },
  { category: 'compliance', title: 'Emissions Compliance', description: 'Vehicle meets emissions standards', status: 'pending', required: true },
];

// ============================================================================
// ONBOARDING MANAGEMENT
// ============================================================================

/**
 * Start vehicle onboarding process.
 */
export async function startVehicleOnboarding(input: {
  licensePlate: string;
  category: VehicleCategory;
  make: string;
  model: string;
  year: number;
  vin: string;
  ownerType: 'company' | 'rider';
  ownerId?: string;
}): Promise<{ success: boolean; onboardingId?: string; vehicleId?: string; error?: string }> {
  const supabase = createClient();
  
  // Check for existing vehicle
  const { data: existingVehicle } = await supabase
    .from('assets')
    .select('id')
    .eq('license_plate', input.licensePlate)
    .single();
  
  if (existingVehicle) {
    return { success: false, error: 'Vehicle with this license plate already exists' };
  }
  
  // Create vehicle asset
  const { data: vehicle, error: vehicleError } = await supabase
    .from('assets')
    .insert({
      asset_name: `${input.make} ${input.model}`,
      asset_category: input.category,
      asset_type: 'vehicle',
      license_plate: input.licensePlate,
      vin: input.vin,
      make: input.make,
      model: input.model,
      year: input.year,
      owner_type: input.ownerType,
      owner_id: input.ownerId,
      status: 'onboarding',
    })
    .select('id')
    .single();
  
  if (vehicleError) {
    return { success: false, error: vehicleError.message };
  }
  
  // Create onboarding record
  const { data, error } = await supabase
    .from('vehicle_onboarding')
    .insert({
      vehicle_id: vehicle.id,
      status: 'pending_documents',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Create checklist items
  const checklistItems = VEHICLE_CHECKLIST_TEMPLATE.map(item => ({
    onboarding_id: data.id,
    ...item,
  }));
  
  await supabase.from('vehicle_checklist_items').insert(checklistItems);
  
  return { success: true, onboardingId: data.id, vehicleId: vehicle.id };
}

/**
 * Get vehicle onboarding details.
 */
export async function getVehicleOnboarding(onboardingId: string): Promise<VehicleOnboarding | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('vehicle_onboarding')
    .select(`
      *,
      vehicle:assets(*),
      owner:employees(full_name),
      checklist:vehicle_checklist_items(*),
      documents:vehicle_documents(*),
      inspection:vehicle_inspections(*)
    `)
    .eq('id', onboardingId)
    .single();
  
  if (!data) return null;
  
  const vehicle = data.vehicle as Record<string, unknown> | null;
  const owner = data.owner as unknown;
  const ownerData = (Array.isArray(owner) ? owner[0] : owner) as { full_name: string } | null;
  const inspectionArr = data.inspection as Array<Record<string, unknown>>;
  const inspection = inspectionArr?.[0];
  
  return {
    id: data.id,
    vehicleId: data.vehicle_id,
    licensePlate: vehicle?.license_plate as string || '',
    category: vehicle?.asset_category as VehicleCategory || 'motorcycle',
    make: vehicle?.make as string || '',
    model: vehicle?.model as string || '',
    year: vehicle?.year as number || 0,
    vin: vehicle?.vin as string || '',
    ownerType: vehicle?.owner_type as 'company' | 'rider' || 'company',
    ownerId: vehicle?.owner_id as string | null,
    ownerName: ownerData?.full_name || null,
    status: data.status,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    checklist: (data.checklist as Array<Record<string, unknown>> || []).map(mapChecklistItem),
    documents: (data.documents as Array<Record<string, unknown>> || []).map(mapDocument),
    inspection: inspection ? mapInspection(inspection) : null,
  };
}

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

/**
 * Upload a vehicle document.
 */
export async function uploadVehicleDocument(input: {
  onboardingId: string;
  documentType: VehicleDocument['documentType'];
  documentUrl: string;
  expiryDate?: string;
}): Promise<{ success: boolean; documentId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('vehicle_documents')
    .insert({
      onboarding_id: input.onboardingId,
      document_type: input.documentType,
      document_url: input.documentUrl,
      expiry_date: input.expiryDate,
      verified: false,
      uploaded_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update related checklist item
  const checklistTitleMap: Record<string, string> = {
    registration: 'Vehicle Registration',
    insurance: 'Insurance Certificate',
    ownership: 'Ownership Proof',
    photo: 'Registration Photos',
  };
  
  const checklistTitle = checklistTitleMap[input.documentType];
  if (checklistTitle) {
    await supabase
      .from('vehicle_checklist_items')
      .update({ status: 'in_progress' })
      .eq('onboarding_id', input.onboardingId)
      .eq('title', checklistTitle);
  }
  
  return { success: true, documentId: data.id };
}

/**
 * Verify a vehicle document.
 */
export async function verifyVehicleDocument(
  documentId: string,
  verified: boolean,
  verifiedBy: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: doc, error: fetchError } = await supabase
    .from('vehicle_documents')
    .select('onboarding_id, document_type')
    .eq('id', documentId)
    .single();
  
  if (fetchError || !doc) {
    return { success: false, error: 'Document not found' };
  }
  
  const { error } = await supabase
    .from('vehicle_documents')
    .update({
      verified,
      verified_by: verifiedBy,
      verified_at: new Date().toISOString(),
      verification_notes: notes,
    })
    .eq('id', documentId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update related checklist item
  const checklistTitleMap: Record<string, string> = {
    registration: 'Vehicle Registration',
    insurance: 'Insurance Certificate',
    ownership: 'Ownership Proof',
    photo: 'Registration Photos',
  };
  
  const checklistTitle = checklistTitleMap[doc.document_type];
  if (checklistTitle) {
    await supabase
      .from('vehicle_checklist_items')
      .update({ 
        status: verified ? 'passed' : 'failed',
        completed_by: verifiedBy,
        completed_at: new Date().toISOString(),
        failure_reason: verified ? null : notes,
      })
      .eq('onboarding_id', doc.onboarding_id)
      .eq('title', checklistTitle);
  }
  
  // Check if all documents are verified
  await updateOnboardingStatus(doc.onboarding_id);
  
  return { success: true };
}

// ============================================================================
// INSPECTION MANAGEMENT
// ============================================================================

/**
 * Schedule vehicle inspection.
 */
export async function scheduleVehicleInspection(input: {
  onboardingId: string;
  scheduledDate: string;
  location: string;
  inspectorId?: string;
}): Promise<{ success: boolean; inspectionId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('vehicle_inspections')
    .insert({
      onboarding_id: input.onboardingId,
      scheduled_date: input.scheduledDate,
      location: input.location,
      inspector_id: input.inspectorId,
      result: 'pending',
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update onboarding status
  await supabase
    .from('vehicle_onboarding')
    .update({ status: 'inspection_scheduled' })
    .eq('id', input.onboardingId);
  
  return { success: true, inspectionId: data.id };
}

/**
 * Complete vehicle inspection.
 */
export async function completeVehicleInspection(input: {
  inspectionId: string;
  inspectorId: string;
  mileage: number;
  fuelLevel: number;
  overallCondition: VehicleInspection['overallCondition'];
  exteriorNotes?: string;
  interiorNotes?: string;
  mechanicalNotes?: string;
  photos?: string[];
  defects?: Omit<VehicleDefect, 'id'>[];
  result: 'passed' | 'failed' | 'conditional';
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: inspection, error: fetchError } = await supabase
    .from('vehicle_inspections')
    .select('onboarding_id')
    .eq('id', input.inspectionId)
    .single();
  
  if (fetchError || !inspection) {
    return { success: false, error: 'Inspection not found' };
  }
  
  // Update inspection record
  const { error } = await supabase
    .from('vehicle_inspections')
    .update({
      inspected_at: new Date().toISOString(),
      inspector_id: input.inspectorId,
      mileage: input.mileage,
      fuel_level: input.fuelLevel,
      overall_condition: input.overallCondition,
      exterior_notes: input.exteriorNotes,
      interior_notes: input.interiorNotes,
      mechanical_notes: input.mechanicalNotes,
      photos: input.photos,
      result: input.result,
    })
    .eq('id', input.inspectionId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Record defects if any
  if (input.defects && input.defects.length > 0) {
    const defectsToInsert = input.defects.map(d => ({
      inspection_id: input.inspectionId,
      ...d,
    }));
    
    await supabase.from('vehicle_defects').insert(defectsToInsert);
  }
  
  // Update inspection checklist items
  const checklistUpdates = [
    { title: 'VIN Verification', status: input.result === 'passed' ? 'passed' : 'failed' },
    { title: 'Exterior Condition', status: input.result === 'passed' ? 'passed' : 'failed' },
    { title: 'Interior Condition', status: input.result === 'passed' ? 'passed' : 'failed' },
    { title: 'Mechanical Check', status: input.result === 'passed' ? 'passed' : 'failed' },
    { title: 'Safety Features', status: input.result === 'passed' ? 'passed' : 'failed' },
  ];
  
  for (const update of checklistUpdates) {
    await supabase
      .from('vehicle_checklist_items')
      .update({
        status: update.status,
        completed_by: input.inspectorId,
        completed_at: new Date().toISOString(),
      })
      .eq('onboarding_id', inspection.onboarding_id)
      .eq('title', update.title);
  }
  
  // Update onboarding status
  await supabase
    .from('vehicle_onboarding')
    .update({ status: 'inspection_complete' })
    .eq('id', inspection.onboarding_id);
  
  await updateOnboardingStatus(inspection.onboarding_id);
  
  return { success: true };
}

// ============================================================================
// CHECKLIST MANAGEMENT
// ============================================================================

/**
 * Update a checklist item.
 */
export async function updateChecklistItem(
  itemId: string,
  status: VehicleChecklistItemStatus,
  completedBy: string,
  notes?: string,
  failureReason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: item, error: fetchError } = await supabase
    .from('vehicle_checklist_items')
    .select('onboarding_id')
    .eq('id', itemId)
    .single();
  
  if (fetchError || !item) {
    return { success: false, error: 'Checklist item not found' };
  }
  
  const { error } = await supabase
    .from('vehicle_checklist_items')
    .update({
      status,
      completed_by: completedBy,
      completed_at: new Date().toISOString(),
      notes,
      failure_reason: failureReason,
    })
    .eq('id', itemId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  await updateOnboardingStatus(item.onboarding_id);
  
  return { success: true };
}

// ============================================================================
// STATUS MANAGEMENT
// ============================================================================

/**
 * Update onboarding status based on checklist completion.
 */
async function updateOnboardingStatus(onboardingId: string): Promise<void> {
  const supabase = createClient();
  
  const { data: items } = await supabase
    .from('vehicle_checklist_items')
    .select('category, status, required')
    .eq('onboarding_id', onboardingId);
  
  if (!items) return;
  
  const documentItems = items.filter(i => i.category === 'documents' && i.required);
  const inspectionItems = items.filter(i => i.category === 'inspection' && i.required);
  const allRequiredItems = items.filter(i => i.required);
  
  const documentsComplete = documentItems.every(i => i.status === 'passed' || i.status === 'waived');
  const inspectionComplete = inspectionItems.every(i => i.status === 'passed' || i.status === 'waived');
  const allComplete = allRequiredItems.every(i => i.status === 'passed' || i.status === 'waived');
  const anyFailed = allRequiredItems.some(i => i.status === 'failed');
  
  let newStatus: VehicleOnboardingStatus;
  
  if (anyFailed) {
    newStatus = 'rejected';
  } else if (allComplete) {
    newStatus = 'pending_approval';
  } else if (inspectionComplete) {
    newStatus = 'inspection_complete';
  } else if (documentsComplete) {
    newStatus = 'pending_inspection';
  } else {
    newStatus = 'documents_review';
  }
  
  await supabase
    .from('vehicle_onboarding')
    .update({ status: newStatus })
    .eq('id', onboardingId);
}

/**
 * Approve vehicle onboarding.
 */
export async function approveVehicleOnboarding(
  onboardingId: string,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: onboarding } = await supabase
    .from('vehicle_onboarding')
    .select('vehicle_id, status')
    .eq('id', onboardingId)
    .single();
  
  if (!onboarding) {
    return { success: false, error: 'Onboarding not found' };
  }
  
  if (onboarding.status !== 'pending_approval') {
    return { success: false, error: 'Onboarding is not ready for approval' };
  }
  
  // Update onboarding
  const { error } = await supabase
    .from('vehicle_onboarding')
    .update({
      status: 'approved',
      completed_at: new Date().toISOString(),
      approved_by: approvedBy,
    })
    .eq('id', onboardingId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update vehicle status
  await supabase
    .from('assets')
    .update({ status: 'available' })
    .eq('id', onboarding.vehicle_id);
  
  return { success: true };
}

/**
 * Reject vehicle onboarding.
 */
export async function rejectVehicleOnboarding(
  onboardingId: string,
  rejectedBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: onboarding } = await supabase
    .from('vehicle_onboarding')
    .select('vehicle_id')
    .eq('id', onboardingId)
    .single();
  
  if (!onboarding) {
    return { success: false, error: 'Onboarding not found' };
  }
  
  // Update onboarding
  const { error } = await supabase
    .from('vehicle_onboarding')
    .update({
      status: 'rejected',
      completed_at: new Date().toISOString(),
      rejected_by: rejectedBy,
      rejection_reason: reason,
    })
    .eq('id', onboardingId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update vehicle status
  await supabase
    .from('assets')
    .update({ status: 'rejected' })
    .eq('id', onboarding.vehicle_id);
  
  return { success: true };
}

// ============================================================================
// REPORTING
// ============================================================================

export interface VehicleOnboardingSummary {
  total: number;
  pendingDocuments: number;
  pendingInspection: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  avgCompletionDays: number;
  byCategory: Record<VehicleCategory, number>;
}

export async function getVehicleOnboardingSummary(): Promise<VehicleOnboardingSummary> {
  const supabase = createClient();
  
  const { data: onboardings } = await supabase
    .from('vehicle_onboarding')
    .select(`
      status,
      started_at,
      completed_at,
      vehicle:assets(asset_category)
    `);
  
  const byCategory: Record<VehicleCategory, number> = {
    motorcycle: 0,
    scooter: 0,
    car: 0,
    van: 0,
    truck: 0,
  };
  
  let totalCompletionDays = 0;
  let completedCount = 0;
  
  for (const onboarding of onboardings || []) {
    const vehicle = onboarding.vehicle as unknown;
    const vehicleData = (Array.isArray(vehicle) ? vehicle[0] : vehicle) as { asset_category: string } | null;
    const category = vehicleData?.asset_category as VehicleCategory;
    
    if (category && category in byCategory) {
      byCategory[category]++;
    }
    
    if (onboarding.completed_at) {
      const started = new Date(onboarding.started_at).getTime();
      const completed = new Date(onboarding.completed_at).getTime();
      totalCompletionDays += (completed - started) / (1000 * 60 * 60 * 24);
      completedCount++;
    }
  }
  
  return {
    total: onboardings?.length || 0,
    pendingDocuments: onboardings?.filter(o => o.status === 'pending_documents' || o.status === 'documents_review').length || 0,
    pendingInspection: onboardings?.filter(o => o.status === 'pending_inspection' || o.status === 'inspection_scheduled').length || 0,
    pendingApproval: onboardings?.filter(o => o.status === 'pending_approval').length || 0,
    approved: onboardings?.filter(o => o.status === 'approved').length || 0,
    rejected: onboardings?.filter(o => o.status === 'rejected').length || 0,
    avgCompletionDays: completedCount > 0 ? Math.round(totalCompletionDays / completedCount) : 0,
    byCategory,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function mapChecklistItem(row: Record<string, unknown>): VehicleChecklistItem {
  return {
    id: row.id as string,
    category: row.category as VehicleChecklistItem['category'],
    title: row.title as string,
    description: row.description as string,
    status: row.status as VehicleChecklistItemStatus,
    required: row.required as boolean,
    completedBy: row.completed_by as string | null,
    completedAt: row.completed_at as string | null,
    notes: row.notes as string | null,
    failureReason: row.failure_reason as string | null,
  };
}

function mapDocument(row: Record<string, unknown>): VehicleDocument {
  return {
    id: row.id as string,
    documentType: row.document_type as VehicleDocument['documentType'],
    documentUrl: row.document_url as string,
    expiryDate: row.expiry_date as string | null,
    verified: row.verified as boolean,
    verifiedBy: row.verified_by as string | null,
    verifiedAt: row.verified_at as string | null,
    uploadedAt: row.uploaded_at as string,
  };
}

function mapInspection(row: Record<string, unknown>): VehicleInspection {
  return {
    id: row.id as string,
    scheduledDate: row.scheduled_date as string,
    inspectedAt: row.inspected_at as string | null,
    inspectorId: row.inspector_id as string | null,
    inspectorName: row.inspector_name as string | null,
    location: row.location as string,
    result: row.result as VehicleInspection['result'],
    mileage: row.mileage as number | null,
    fuelLevel: row.fuel_level as number | null,
    overallCondition: row.overall_condition as VehicleInspection['overallCondition'],
    exteriorNotes: row.exterior_notes as string | null,
    interiorNotes: row.interior_notes as string | null,
    mechanicalNotes: row.mechanical_notes as string | null,
    photos: (row.photos as string[]) || [],
    defects: (row.defects as VehicleDefect[]) || [],
  };
}
