'use client';

/**
 * Rider-Owned Vehicle Approval Service (T-051)
 * 
 * Handles the approval workflow for rider-owned vehicles:
 * - Ownership proof verification
 * - Vehicle inspection
 * - Insurance verification
 * - Eligibility assessment
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type RiderVehicleApprovalStatus = 
  | 'submitted'
  | 'documents_pending'
  | 'documents_review'
  | 'inspection_pending'
  | 'inspection_scheduled'
  | 'inspection_complete'
  | 'approved'
  | 'rejected'
  | 'expired';

export type DocumentVerificationStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export interface RiderVehicleApplication {
  id: string;
  riderId: string;
  riderName: string;
  vehicleId: string;
  licensePlate: string;
  category: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  status: RiderVehicleApprovalStatus;
  submittedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  expiryDate: string | null;
  documents: RiderVehicleDocument[];
  inspection: RiderVehicleInspectionResult | null;
}

export interface RiderVehicleDocument {
  id: string;
  documentType: 'ownership' | 'registration' | 'insurance' | 'driving_license' | 'photo';
  documentUrl: string;
  expiryDate: string | null;
  status: DocumentVerificationStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
}

export interface RiderVehicleInspectionResult {
  id: string;
  inspectedAt: string;
  inspectorId: string;
  inspectorName: string;
  mileage: number;
  overallCondition: 'excellent' | 'good' | 'acceptable' | 'poor';
  passed: boolean;
  notes: string | null;
  expiryDate: string;
  checkpoints: InspectionCheckpoint[];
}

export interface InspectionCheckpoint {
  name: string;
  passed: boolean;
  notes: string | null;
}

export interface VehicleEligibilityResult {
  eligible: boolean;
  requirements: Array<{
    requirement: string;
    met: boolean;
    details: string | null;
  }>;
  blockers: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VEHICLE_REQUIREMENTS = {
  maxAge: 10, // Maximum vehicle age in years
  minInsuranceDays: 30, // Minimum remaining insurance validity
  requiredDocuments: ['ownership', 'registration', 'insurance', 'photo'] as const,
  inspectionValidityMonths: 12,
};

const INSPECTION_CHECKPOINTS = [
  'Engine condition',
  'Brakes functionality',
  'Tires condition',
  'Lights and indicators',
  'Horn functionality',
  'Steering responsiveness',
  'Suspension',
  'Exhaust emissions',
  'Body condition',
  'Safety equipment',
];

// ============================================================================
// APPLICATION MANAGEMENT
// ============================================================================

/**
 * Submit a rider-owned vehicle for approval.
 */
export async function submitRiderVehicle(input: {
  riderId: string;
  licensePlate: string;
  category: string;
  make: string;
  model: string;
  year: number;
  vin: string;
}): Promise<{ success: boolean; applicationId?: string; vehicleId?: string; error?: string }> {
  const supabase = createClient();
  
  // Check rider eligibility
  const { data: rider } = await supabase
    .from('employees')
    .select('id, status, rider_category')
    .eq('id', input.riderId)
    .single();
  
  if (!rider) {
    return { success: false, error: 'Rider not found' };
  }
  
  if (rider.status !== 'active') {
    return { success: false, error: 'Rider must be active to submit a vehicle' };
  }
  
  // Check for existing pending application
  const { data: existingApp } = await supabase
    .from('rider_vehicle_applications')
    .select('id')
    .eq('rider_id', input.riderId)
    .in('status', ['submitted', 'documents_pending', 'documents_review', 'inspection_pending', 'inspection_scheduled'])
    .single();
  
  if (existingApp) {
    return { success: false, error: 'You already have a pending vehicle application' };
  }
  
  // Validate vehicle age
  const currentYear = new Date().getFullYear();
  if (currentYear - input.year > VEHICLE_REQUIREMENTS.maxAge) {
    return { success: false, error: `Vehicle must be less than ${VEHICLE_REQUIREMENTS.maxAge} years old` };
  }
  
  // Check for duplicate license plate
  const { data: existingVehicle } = await supabase
    .from('assets')
    .select('id')
    .eq('license_plate', input.licensePlate)
    .single();
  
  if (existingVehicle) {
    return { success: false, error: 'Vehicle with this license plate already registered' };
  }
  
  // Create vehicle record
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
      owner_type: 'rider',
      owner_id: input.riderId,
      status: 'pending_approval',
    })
    .select('id')
    .single();
  
  if (vehicleError) {
    return { success: false, error: vehicleError.message };
  }
  
  // Create application
  const { data, error } = await supabase
    .from('rider_vehicle_applications')
    .insert({
      rider_id: input.riderId,
      vehicle_id: vehicle.id,
      status: 'documents_pending',
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, applicationId: data.id, vehicleId: vehicle.id };
}

/**
 * Get rider vehicle application.
 */
export async function getRiderVehicleApplication(applicationId: string): Promise<RiderVehicleApplication | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('rider_vehicle_applications')
    .select(`
      *,
      rider:employees(full_name),
      vehicle:assets(*),
      documents:rider_vehicle_documents(*),
      inspection:rider_vehicle_inspections(*)
    `)
    .eq('id', applicationId)
    .single();
  
  if (!data) return null;
  
  const rider = data.rider as unknown;
  const riderData = (Array.isArray(rider) ? rider[0] : rider) as { full_name: string } | null;
  const vehicle = data.vehicle as Record<string, unknown> | null;
  const inspectionArr = data.inspection as Array<Record<string, unknown>>;
  const inspection = inspectionArr?.[0];
  
  return {
    id: data.id,
    riderId: data.rider_id,
    riderName: riderData?.full_name || 'Unknown',
    vehicleId: data.vehicle_id,
    licensePlate: vehicle?.license_plate as string || '',
    category: vehicle?.asset_category as string || '',
    make: vehicle?.make as string || '',
    model: vehicle?.model as string || '',
    year: vehicle?.year as number || 0,
    vin: vehicle?.vin as string || '',
    status: data.status,
    submittedAt: data.submitted_at,
    approvedAt: data.approved_at,
    rejectedAt: data.rejected_at,
    rejectionReason: data.rejection_reason,
    expiryDate: data.expiry_date,
    documents: (data.documents as Array<Record<string, unknown>> || []).map(mapDocument),
    inspection: inspection ? mapInspection(inspection) : null,
  };
}

/**
 * Get rider's vehicle applications.
 */
export async function getRiderApplications(riderId: string): Promise<RiderVehicleApplication[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('rider_vehicle_applications')
    .select(`
      *,
      rider:employees(full_name),
      vehicle:assets(*),
      documents:rider_vehicle_documents(*),
      inspection:rider_vehicle_inspections(*)
    `)
    .eq('rider_id', riderId)
    .order('submitted_at', { ascending: false });
  
  return (data || []).map(row => {
    const rider = row.rider as unknown;
    const riderData = (Array.isArray(rider) ? rider[0] : rider) as { full_name: string } | null;
    const vehicle = row.vehicle as Record<string, unknown> | null;
    const inspectionArr = row.inspection as Array<Record<string, unknown>>;
    const inspection = inspectionArr?.[0];
    
    return {
      id: row.id,
      riderId: row.rider_id,
      riderName: riderData?.full_name || 'Unknown',
      vehicleId: row.vehicle_id,
      licensePlate: vehicle?.license_plate as string || '',
      category: vehicle?.asset_category as string || '',
      make: vehicle?.make as string || '',
      model: vehicle?.model as string || '',
      year: vehicle?.year as number || 0,
      vin: vehicle?.vin as string || '',
      status: row.status,
      submittedAt: row.submitted_at,
      approvedAt: row.approved_at,
      rejectedAt: row.rejected_at,
      rejectionReason: row.rejection_reason,
      expiryDate: row.expiry_date,
      documents: (row.documents as Array<Record<string, unknown>> || []).map(mapDocument),
      inspection: inspection ? mapInspection(inspection) : null,
    };
  });
}

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

/**
 * Upload a document for rider vehicle application.
 */
export async function uploadRiderVehicleDocument(input: {
  applicationId: string;
  documentType: RiderVehicleDocument['documentType'];
  documentUrl: string;
  expiryDate?: string;
}): Promise<{ success: boolean; documentId?: string; error?: string }> {
  const supabase = createClient();
  
  // Check for existing document of same type
  const { data: existing } = await supabase
    .from('rider_vehicle_documents')
    .select('id')
    .eq('application_id', input.applicationId)
    .eq('document_type', input.documentType)
    .single();
  
  if (existing) {
    // Update existing document
    const { error } = await supabase
      .from('rider_vehicle_documents')
      .update({
        document_url: input.documentUrl,
        expiry_date: input.expiryDate,
        status: 'pending',
        verified_by: null,
        verified_at: null,
        rejection_reason: null,
      })
      .eq('id', existing.id);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, documentId: existing.id };
  }
  
  // Create new document
  const { data, error } = await supabase
    .from('rider_vehicle_documents')
    .insert({
      application_id: input.applicationId,
      document_type: input.documentType,
      document_url: input.documentUrl,
      expiry_date: input.expiryDate,
      status: 'pending',
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Check if all required documents are now uploaded
  await checkDocumentCompletion(input.applicationId);
  
  return { success: true, documentId: data.id };
}

/**
 * Verify a rider vehicle document.
 */
export async function verifyRiderVehicleDocument(
  documentId: string,
  verified: boolean,
  verifiedBy: string,
  rejectionReason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: doc } = await supabase
    .from('rider_vehicle_documents')
    .select('application_id, document_type, expiry_date')
    .eq('id', documentId)
    .single();
  
  if (!doc) {
    return { success: false, error: 'Document not found' };
  }
  
  // Check insurance expiry
  if (doc.document_type === 'insurance' && doc.expiry_date) {
    const expiryDate = new Date(doc.expiry_date);
    const minValidDate = new Date();
    minValidDate.setDate(minValidDate.getDate() + VEHICLE_REQUIREMENTS.minInsuranceDays);
    
    if (expiryDate < minValidDate && verified) {
      return { 
        success: false, 
        error: `Insurance must be valid for at least ${VEHICLE_REQUIREMENTS.minInsuranceDays} days` 
      };
    }
  }
  
  const { error } = await supabase
    .from('rider_vehicle_documents')
    .update({
      status: verified ? 'verified' : 'rejected',
      verified_by: verifiedBy,
      verified_at: new Date().toISOString(),
      rejection_reason: verified ? null : rejectionReason,
    })
    .eq('id', documentId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update application status
  await updateApplicationStatus(doc.application_id);
  
  return { success: true };
}

/**
 * Check if all required documents are uploaded.
 */
async function checkDocumentCompletion(applicationId: string): Promise<void> {
  const supabase = createClient();
  
  const { data: docs } = await supabase
    .from('rider_vehicle_documents')
    .select('document_type')
    .eq('application_id', applicationId);
  
  const uploadedTypes = new Set((docs || []).map(d => d.document_type));
  const allUploaded = VEHICLE_REQUIREMENTS.requiredDocuments.every(t => uploadedTypes.has(t));
  
  if (allUploaded) {
    await supabase
      .from('rider_vehicle_applications')
      .update({ status: 'documents_review' })
      .eq('id', applicationId)
      .eq('status', 'documents_pending');
  }
}

// ============================================================================
// INSPECTION
// ============================================================================

/**
 * Schedule inspection for rider vehicle.
 */
export async function scheduleRiderVehicleInspection(input: {
  applicationId: string;
  scheduledDate: string;
  location: string;
  inspectorId?: string;
}): Promise<{ success: boolean; inspectionId?: string; error?: string }> {
  const supabase = createClient();
  
  // Check that documents are verified
  const { data: docs } = await supabase
    .from('rider_vehicle_documents')
    .select('document_type, status')
    .eq('application_id', input.applicationId);
  
  const verifiedTypes = new Set(
    (docs || []).filter(d => d.status === 'verified').map(d => d.document_type)
  );
  
  const allVerified = VEHICLE_REQUIREMENTS.requiredDocuments.every(t => verifiedTypes.has(t));
  
  if (!allVerified) {
    return { success: false, error: 'All required documents must be verified before scheduling inspection' };
  }
  
  const { data, error } = await supabase
    .from('rider_vehicle_inspections')
    .insert({
      application_id: input.applicationId,
      scheduled_date: input.scheduledDate,
      location: input.location,
      inspector_id: input.inspectorId,
      status: 'scheduled',
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  await supabase
    .from('rider_vehicle_applications')
    .update({ status: 'inspection_scheduled' })
    .eq('id', input.applicationId);
  
  return { success: true, inspectionId: data.id };
}

/**
 * Complete rider vehicle inspection.
 */
export async function completeRiderVehicleInspection(input: {
  inspectionId: string;
  inspectorId: string;
  mileage: number;
  overallCondition: RiderVehicleInspectionResult['overallCondition'];
  checkpoints: InspectionCheckpoint[];
  notes?: string;
}): Promise<{ success: boolean; passed: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: inspection } = await supabase
    .from('rider_vehicle_inspections')
    .select('application_id')
    .eq('id', input.inspectionId)
    .single();
  
  if (!inspection) {
    return { success: false, passed: false, error: 'Inspection not found' };
  }
  
  // Determine pass/fail
  const passed = input.checkpoints.every(c => c.passed) && 
    (input.overallCondition === 'excellent' || input.overallCondition === 'good' || input.overallCondition === 'acceptable');
  
  // Calculate expiry date
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + VEHICLE_REQUIREMENTS.inspectionValidityMonths);
  
  const { error } = await supabase
    .from('rider_vehicle_inspections')
    .update({
      inspected_at: new Date().toISOString(),
      inspector_id: input.inspectorId,
      mileage: input.mileage,
      overall_condition: input.overallCondition,
      checkpoints: input.checkpoints,
      notes: input.notes,
      passed,
      status: 'completed',
      expiry_date: expiryDate.toISOString(),
    })
    .eq('id', input.inspectionId);
  
  if (error) {
    return { success: false, passed: false, error: error.message };
  }
  
  // Update application status
  await supabase
    .from('rider_vehicle_applications')
    .update({ status: 'inspection_complete' })
    .eq('id', inspection.application_id);
  
  await updateApplicationStatus(inspection.application_id);
  
  return { success: true, passed };
}

// ============================================================================
// APPROVAL WORKFLOW
// ============================================================================

/**
 * Update application status based on documents and inspection.
 */
async function updateApplicationStatus(applicationId: string): Promise<void> {
  const supabase = createClient();
  
  const { data: app } = await supabase
    .from('rider_vehicle_applications')
    .select(`
      status,
      documents:rider_vehicle_documents(status),
      inspection:rider_vehicle_inspections(passed, status)
    `)
    .eq('id', applicationId)
    .single();
  
  if (!app) return;
  
  const docs = app.documents as Array<{ status: string }>;
  const inspections = app.inspection as Array<{ passed: boolean; status: string }>;
  const inspection = inspections?.[0];
  
  // Check for any rejected documents
  const hasRejectedDocs = docs?.some(d => d.status === 'rejected');
  if (hasRejectedDocs) {
    await supabase
      .from('rider_vehicle_applications')
      .update({ 
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: 'One or more documents were rejected',
      })
      .eq('id', applicationId);
    return;
  }
  
  // Check inspection result
  if (inspection?.status === 'completed' && !inspection.passed) {
    await supabase
      .from('rider_vehicle_applications')
      .update({ 
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: 'Vehicle failed inspection',
      })
      .eq('id', applicationId);
    return;
  }
  
  // If all checks pass, ready for approval
  const allDocsVerified = docs?.every(d => d.status === 'verified');
  const inspectionPassed = inspection?.passed;
  
  if (allDocsVerified && inspectionPassed) {
    // Auto-approve if all requirements met
    await approveRiderVehicle(applicationId, 'system');
  }
}

/**
 * Approve rider vehicle application.
 */
export async function approveRiderVehicle(
  applicationId: string,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: app } = await supabase
    .from('rider_vehicle_applications')
    .select('vehicle_id, rider_id')
    .eq('id', applicationId)
    .single();
  
  if (!app) {
    return { success: false, error: 'Application not found' };
  }
  
  // Get inspection expiry
  const { data: inspection } = await supabase
    .from('rider_vehicle_inspections')
    .select('expiry_date')
    .eq('application_id', applicationId)
    .single();
  
  // Update application
  const { error } = await supabase
    .from('rider_vehicle_applications')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approvedBy,
      expiry_date: inspection?.expiry_date,
    })
    .eq('id', applicationId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update vehicle status
  await supabase
    .from('assets')
    .update({ status: 'available' })
    .eq('id', app.vehicle_id);
  
  // Update rider category to own_vehicle_rider
  await supabase
    .from('employees')
    .update({ rider_category: 'own_vehicle_rider' })
    .eq('id', app.rider_id);
  
  return { success: true };
}

/**
 * Reject rider vehicle application.
 */
export async function rejectRiderVehicle(
  applicationId: string,
  rejectedBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: app } = await supabase
    .from('rider_vehicle_applications')
    .select('vehicle_id')
    .eq('id', applicationId)
    .single();
  
  if (!app) {
    return { success: false, error: 'Application not found' };
  }
  
  const { error } = await supabase
    .from('rider_vehicle_applications')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejected_by: rejectedBy,
      rejection_reason: reason,
    })
    .eq('id', applicationId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update vehicle status
  await supabase
    .from('assets')
    .update({ status: 'rejected' })
    .eq('id', app.vehicle_id);
  
  return { success: true };
}

// ============================================================================
// ELIGIBILITY CHECK
// ============================================================================

/**
 * Check vehicle eligibility for rider use.
 */
export async function checkVehicleEligibility(input: {
  year: number;
  category: string;
  insuranceExpiryDate?: string;
  hasValidRegistration?: boolean;
}): Promise<VehicleEligibilityResult> {
  const requirements: VehicleEligibilityResult['requirements'] = [];
  const blockers: string[] = [];
  
  // Age check
  const currentYear = new Date().getFullYear();
  const vehicleAge = currentYear - input.year;
  const ageMet = vehicleAge <= VEHICLE_REQUIREMENTS.maxAge;
  
  requirements.push({
    requirement: `Vehicle must be less than ${VEHICLE_REQUIREMENTS.maxAge} years old`,
    met: ageMet,
    details: `Vehicle is ${vehicleAge} years old`,
  });
  
  if (!ageMet) {
    blockers.push(`Vehicle is too old (${vehicleAge} years)`);
  }
  
  // Category check
  const allowedCategories = ['motorcycle', 'scooter', 'car'];
  const categoryMet = allowedCategories.includes(input.category);
  
  requirements.push({
    requirement: 'Vehicle must be a motorcycle, scooter, or car',
    met: categoryMet,
    details: `Category: ${input.category}`,
  });
  
  if (!categoryMet) {
    blockers.push(`Vehicle category "${input.category}" not allowed for delivery`);
  }
  
  // Insurance check
  if (input.insuranceExpiryDate) {
    const expiryDate = new Date(input.insuranceExpiryDate);
    const minValidDate = new Date();
    minValidDate.setDate(minValidDate.getDate() + VEHICLE_REQUIREMENTS.minInsuranceDays);
    const insuranceMet = expiryDate >= minValidDate;
    
    requirements.push({
      requirement: `Insurance must be valid for at least ${VEHICLE_REQUIREMENTS.minInsuranceDays} days`,
      met: insuranceMet,
      details: `Expires: ${input.insuranceExpiryDate}`,
    });
    
    if (!insuranceMet) {
      blockers.push('Insurance expiring too soon');
    }
  } else {
    requirements.push({
      requirement: 'Valid insurance required',
      met: false,
      details: 'Insurance proof not provided',
    });
    blockers.push('Insurance proof required');
  }
  
  // Registration check
  requirements.push({
    requirement: 'Valid vehicle registration required',
    met: input.hasValidRegistration || false,
    details: input.hasValidRegistration ? 'Registration verified' : 'Registration not verified',
  });
  
  if (!input.hasValidRegistration) {
    blockers.push('Valid registration required');
  }
  
  return {
    eligible: blockers.length === 0,
    requirements,
    blockers,
  };
}

// ============================================================================
// RENEWAL & EXPIRY
// ============================================================================

/**
 * Get applications expiring soon.
 */
export async function getExpiringApprovals(daysAhead: number = 30): Promise<RiderVehicleApplication[]> {
  const supabase = createClient();
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  const { data } = await supabase
    .from('rider_vehicle_applications')
    .select(`
      *,
      rider:employees(full_name),
      vehicle:assets(*)
    `)
    .eq('status', 'approved')
    .lte('expiry_date', futureDate.toISOString())
    .order('expiry_date');
  
  return (data || []).map(row => {
    const rider = row.rider as unknown;
    const riderData = (Array.isArray(rider) ? rider[0] : rider) as { full_name: string } | null;
    const vehicle = row.vehicle as Record<string, unknown> | null;
    
    return {
      id: row.id,
      riderId: row.rider_id,
      riderName: riderData?.full_name || 'Unknown',
      vehicleId: row.vehicle_id,
      licensePlate: vehicle?.license_plate as string || '',
      category: vehicle?.asset_category as string || '',
      make: vehicle?.make as string || '',
      model: vehicle?.model as string || '',
      year: vehicle?.year as number || 0,
      vin: vehicle?.vin as string || '',
      status: row.status,
      submittedAt: row.submitted_at,
      approvedAt: row.approved_at,
      rejectedAt: row.rejected_at,
      rejectionReason: row.rejection_reason,
      expiryDate: row.expiry_date,
      documents: [],
      inspection: null,
    };
  });
}

/**
 * Initiate renewal for expiring approval.
 */
export async function initiateRenewal(
  applicationId: string
): Promise<{ success: boolean; renewalId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data: original } = await supabase
    .from('rider_vehicle_applications')
    .select('rider_id, vehicle_id')
    .eq('id', applicationId)
    .single();
  
  if (!original) {
    return { success: false, error: 'Application not found' };
  }
  
  // Create renewal application
  const { data, error } = await supabase
    .from('rider_vehicle_applications')
    .insert({
      rider_id: original.rider_id,
      vehicle_id: original.vehicle_id,
      status: 'documents_pending',
      submitted_at: new Date().toISOString(),
      parent_application_id: applicationId,
      is_renewal: true,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, renewalId: data.id };
}

// ============================================================================
// REPORTING
// ============================================================================

export interface RiderVehicleApprovalSummary {
  totalApplications: number;
  pending: number;
  approved: number;
  rejected: number;
  expiringSoon: number;
  avgApprovalDays: number;
  byCategory: Record<string, number>;
}

export async function getRiderVehicleApprovalSummary(): Promise<RiderVehicleApprovalSummary> {
  const supabase = createClient();
  
  const { data: applications } = await supabase
    .from('rider_vehicle_applications')
    .select(`
      status,
      submitted_at,
      approved_at,
      expiry_date,
      vehicle:assets(asset_category)
    `);
  
  const byCategory: Record<string, number> = {};
  let totalApprovalDays = 0;
  let approvedCount = 0;
  
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  let expiringSoon = 0;
  
  for (const app of applications || []) {
    const vehicle = app.vehicle as unknown;
    const vehicleData = (Array.isArray(vehicle) ? vehicle[0] : vehicle) as { asset_category: string } | null;
    const category = vehicleData?.asset_category || 'unknown';
    
    byCategory[category] = (byCategory[category] || 0) + 1;
    
    if (app.approved_at) {
      const submitted = new Date(app.submitted_at).getTime();
      const approved = new Date(app.approved_at).getTime();
      totalApprovalDays += (approved - submitted) / (1000 * 60 * 60 * 24);
      approvedCount++;
    }
    
    if (app.status === 'approved' && app.expiry_date) {
      const expiry = new Date(app.expiry_date);
      if (expiry <= thirtyDaysFromNow && expiry >= now) {
        expiringSoon++;
      }
    }
  }
  
  const pending = applications?.filter(a => 
    ['documents_pending', 'documents_review', 'inspection_pending', 'inspection_scheduled', 'inspection_complete'].includes(a.status)
  ).length || 0;
  
  return {
    totalApplications: applications?.length || 0,
    pending,
    approved: applications?.filter(a => a.status === 'approved').length || 0,
    rejected: applications?.filter(a => a.status === 'rejected').length || 0,
    expiringSoon,
    avgApprovalDays: approvedCount > 0 ? Math.round(totalApprovalDays / approvedCount) : 0,
    byCategory,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function mapDocument(row: Record<string, unknown>): RiderVehicleDocument {
  return {
    id: row.id as string,
    documentType: row.document_type as RiderVehicleDocument['documentType'],
    documentUrl: row.document_url as string,
    expiryDate: row.expiry_date as string | null,
    status: row.status as DocumentVerificationStatus,
    verifiedBy: row.verified_by as string | null,
    verifiedAt: row.verified_at as string | null,
    rejectionReason: row.rejection_reason as string | null,
  };
}

function mapInspection(row: Record<string, unknown>): RiderVehicleInspectionResult {
  return {
    id: row.id as string,
    inspectedAt: row.inspected_at as string,
    inspectorId: row.inspector_id as string,
    inspectorName: row.inspector_name as string,
    mileage: row.mileage as number,
    overallCondition: row.overall_condition as RiderVehicleInspectionResult['overallCondition'],
    passed: row.passed as boolean,
    notes: row.notes as string | null,
    expiryDate: row.expiry_date as string,
    checkpoints: (row.checkpoints as InspectionCheckpoint[]) || [],
  };
}
