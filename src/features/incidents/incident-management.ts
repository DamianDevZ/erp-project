'use client';

/**
 * Incident Reporting & Tracking Service (T-058 to T-060)
 * 
 * Manages:
 * - Incident reporting (accidents, violations, complaints)
 * - Investigation workflow
 * - Resolution and recovery tracking
 * - Insurance claims
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type IncidentType = 
  | 'accident'
  | 'traffic_violation'
  | 'customer_complaint'
  | 'vehicle_damage'
  | 'theft'
  | 'misconduct'
  | 'policy_violation'
  | 'safety_incident'
  | 'equipment_loss';

export type IncidentSeverity = 'minor' | 'moderate' | 'major' | 'critical';
export type IncidentStatus = 
  | 'reported'
  | 'under_investigation'
  | 'pending_action'
  | 'resolved'
  | 'escalated'
  | 'closed';

export type RecoveryStatus = 'not_applicable' | 'pending' | 'partial' | 'complete' | 'waived';

export interface Incident {
  id: string;
  incidentNumber: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reportedBy: string;
  reportedByName: string;
  reportedAt: string;
  occurredAt: string;
  location: string | null;
  coordinates: { lat: number; lng: number } | null;
  riderId: string | null;
  riderName: string | null;
  vehicleId: string | null;
  vehiclePlate: string | null;
  platformId: string | null;
  platformName: string | null;
  orderId: string | null;
  title: string;
  description: string;
  injuries: boolean;
  policeReportNumber: string | null;
  witnesses: Witness[];
  photos: IncidentPhoto[];
  damages: IncidentDamage[];
  investigation: Investigation | null;
  resolution: Resolution | null;
  recovery: Recovery | null;
  insuranceClaim: InsuranceClaim | null;
}

export interface Witness {
  name: string;
  phone: string | null;
  email: string | null;
  statement: string | null;
}

export interface IncidentPhoto {
  id: string;
  url: string;
  caption: string | null;
  category: 'scene' | 'damage' | 'document' | 'evidence';
  takenAt: string;
}

export interface IncidentDamage {
  id: string;
  itemType: 'vehicle' | 'equipment' | 'property' | 'third_party';
  description: string;
  estimatedCost: number;
  actualCost: number | null;
  repaired: boolean;
  repairedAt: string | null;
}

export interface Investigation {
  id: string;
  investigatorId: string;
  investigatorName: string;
  startedAt: string;
  completedAt: string | null;
  findings: string | null;
  riderAtFault: boolean | null;
  faultPercentage: number | null;
  recommendedAction: string | null;
  evidence: string[];
}

export interface Resolution {
  id: string;
  resolvedBy: string;
  resolvedByName: string;
  resolvedAt: string;
  actionTaken: string;
  disciplinaryAction: 'none' | 'warning' | 'suspension' | 'termination' | 'training';
  suspensionDays: number | null;
  notes: string | null;
}

export interface Recovery {
  status: RecoveryStatus;
  totalAmount: number;
  recoveredAmount: number;
  waivedAmount: number;
  pendingAmount: number;
  deductionId: string | null;
  notes: string | null;
}

export interface InsuranceClaim {
  id: string;
  claimNumber: string;
  insurerName: string;
  filedAt: string;
  status: 'filed' | 'under_review' | 'approved' | 'rejected' | 'settled';
  claimAmount: number;
  approvedAmount: number | null;
  settledAt: string | null;
  documents: string[];
  notes: string | null;
}

// ============================================================================
// LABELS
// ============================================================================

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  accident: 'Traffic Accident',
  traffic_violation: 'Traffic Violation',
  customer_complaint: 'Customer Complaint',
  vehicle_damage: 'Vehicle Damage',
  theft: 'Theft',
  misconduct: 'Misconduct',
  policy_violation: 'Policy Violation',
  safety_incident: 'Safety Incident',
  equipment_loss: 'Equipment Loss',
};

export const INCIDENT_SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  minor: 'Minor',
  moderate: 'Moderate',
  major: 'Major',
  critical: 'Critical',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: 'Reported',
  under_investigation: 'Under Investigation',
  pending_action: 'Pending Action',
  resolved: 'Resolved',
  escalated: 'Escalated',
  closed: 'Closed',
};

// ============================================================================
// INCIDENT REPORTING
// ============================================================================

/**
 * Report a new incident.
 */
export async function reportIncident(input: {
  type: IncidentType;
  severity: IncidentSeverity;
  occurredAt: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
  riderId?: string;
  vehicleId?: string;
  platformId?: string;
  orderId?: string;
  title: string;
  description: string;
  injuries: boolean;
  policeReportNumber?: string;
  reportedBy: string;
}): Promise<{ success: boolean; incidentId?: string; incidentNumber?: string; error?: string }> {
  const supabase = createClient();
  
  // Generate incident number
  const now = new Date();
  const prefix = 'INC';
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  
  const { count } = await supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', now.toISOString().slice(0, 10));
  
  const incidentNumber = `${prefix}-${dateStr}-${String((count || 0) + 1).padStart(4, '0')}`;
  
  const { data, error } = await supabase
    .from('incidents')
    .insert({
      incident_number: incidentNumber,
      type: input.type,
      severity: input.severity,
      status: 'reported',
      reported_by: input.reportedBy,
      reported_at: now.toISOString(),
      occurred_at: input.occurredAt,
      location: input.location,
      coordinates: input.coordinates ? `POINT(${input.coordinates.lng} ${input.coordinates.lat})` : null,
      rider_id: input.riderId,
      vehicle_id: input.vehicleId,
      platform_id: input.platformId,
      order_id: input.orderId,
      title: input.title,
      description: input.description,
      injuries: input.injuries,
      police_report_number: input.policeReportNumber,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Auto-escalate critical incidents
  if (input.severity === 'critical' || input.injuries) {
    await supabase
      .from('incidents')
      .update({ status: 'escalated' })
      .eq('id', data.id);
  }
  
  return { success: true, incidentId: data.id, incidentNumber };
}

/**
 * Add photo to incident.
 */
export async function addIncidentPhoto(input: {
  incidentId: string;
  url: string;
  caption?: string;
  category: IncidentPhoto['category'];
}): Promise<{ success: boolean; photoId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('incident_photos')
    .insert({
      incident_id: input.incidentId,
      url: input.url,
      caption: input.caption,
      category: input.category,
      taken_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, photoId: data.id };
}

/**
 * Add witness to incident.
 */
export async function addWitness(input: {
  incidentId: string;
  name: string;
  phone?: string;
  email?: string;
  statement?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Get current witnesses
  const { data: incident } = await supabase
    .from('incidents')
    .select('witnesses')
    .eq('id', input.incidentId)
    .single();
  
  if (!incident) {
    return { success: false, error: 'Incident not found' };
  }
  
  const witnesses = [...(incident.witnesses || []), {
    name: input.name,
    phone: input.phone,
    email: input.email,
    statement: input.statement,
  }];
  
  const { error } = await supabase
    .from('incidents')
    .update({ witnesses })
    .eq('id', input.incidentId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Record incident damage.
 */
export async function recordDamage(input: {
  incidentId: string;
  itemType: IncidentDamage['itemType'];
  description: string;
  estimatedCost: number;
}): Promise<{ success: boolean; damageId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('incident_damages')
    .insert({
      incident_id: input.incidentId,
      item_type: input.itemType,
      description: input.description,
      estimated_cost: input.estimatedCost,
      repaired: false,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, damageId: data.id };
}

// ============================================================================
// INVESTIGATION
// ============================================================================

/**
 * Start investigation.
 */
export async function startInvestigation(
  incidentId: string,
  investigatorId: string
): Promise<{ success: boolean; investigationId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('incident_investigations')
    .insert({
      incident_id: incidentId,
      investigator_id: investigatorId,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  await supabase
    .from('incidents')
    .update({ status: 'under_investigation' })
    .eq('id', incidentId);
  
  return { success: true, investigationId: data.id };
}

/**
 * Complete investigation.
 */
export async function completeInvestigation(input: {
  investigationId: string;
  findings: string;
  riderAtFault: boolean;
  faultPercentage?: number;
  recommendedAction: string;
  evidence?: string[];
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: investigation } = await supabase
    .from('incident_investigations')
    .select('incident_id')
    .eq('id', input.investigationId)
    .single();
  
  if (!investigation) {
    return { success: false, error: 'Investigation not found' };
  }
  
  const { error } = await supabase
    .from('incident_investigations')
    .update({
      completed_at: new Date().toISOString(),
      findings: input.findings,
      rider_at_fault: input.riderAtFault,
      fault_percentage: input.faultPercentage,
      recommended_action: input.recommendedAction,
      evidence: input.evidence,
    })
    .eq('id', input.investigationId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  await supabase
    .from('incidents')
    .update({ status: 'pending_action' })
    .eq('id', investigation.incident_id);
  
  return { success: true };
}

// ============================================================================
// RESOLUTION
// ============================================================================

/**
 * Resolve incident.
 */
export async function resolveIncident(input: {
  incidentId: string;
  resolvedBy: string;
  actionTaken: string;
  disciplinaryAction: Resolution['disciplinaryAction'];
  suspensionDays?: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('incident_resolutions')
    .insert({
      incident_id: input.incidentId,
      resolved_by: input.resolvedBy,
      resolved_at: new Date().toISOString(),
      action_taken: input.actionTaken,
      disciplinary_action: input.disciplinaryAction,
      suspension_days: input.suspensionDays,
      notes: input.notes,
    });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update incident status
  await supabase
    .from('incidents')
    .update({ status: 'resolved' })
    .eq('id', input.incidentId);
  
  // Apply disciplinary action if needed
  if (input.disciplinaryAction === 'suspension' && input.suspensionDays) {
    const { data: incident } = await supabase
      .from('incidents')
      .select('rider_id')
      .eq('id', input.incidentId)
      .single();
    
    if (incident?.rider_id) {
      const suspensionEnd = new Date();
      suspensionEnd.setDate(suspensionEnd.getDate() + input.suspensionDays);
      
      await supabase
        .from('employees')
        .update({
          status: 'suspended',
          suspension_end_date: suspensionEnd.toISOString(),
        })
        .eq('id', incident.rider_id);
    }
  }
  
  return { success: true };
}

/**
 * Close incident.
 */
export async function closeIncident(
  incidentId: string,
  closedBy: string,
  closureNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('incidents')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: closedBy,
      closure_notes: closureNotes,
    })
    .eq('id', incidentId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// RECOVERY
// ============================================================================

/**
 * Set up cost recovery for incident.
 */
export async function setupRecovery(input: {
  incidentId: string;
  totalAmount: number;
  deductFromPayroll: boolean;
  installments?: number;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Get incident details
  const { data: incident } = await supabase
    .from('incidents')
    .select('rider_id')
    .eq('id', input.incidentId)
    .single();
  
  if (!incident?.rider_id) {
    return { success: false, error: 'No rider associated with this incident' };
  }
  
  let deductionId: string | null = null;
  
  if (input.deductFromPayroll) {
    // Create payroll deduction
    const { data: deduction } = await supabase
      .from('deductions')
      .insert({
        employee_id: incident.rider_id,
        deduction_type: 'damage_recovery',
        total_amount: input.totalAmount,
        remaining_amount: input.totalAmount,
        installments: input.installments || 1,
        installment_amount: Math.ceil(input.totalAmount / (input.installments || 1)),
        status: 'active',
        reference_type: 'incident',
        reference_id: input.incidentId,
      })
      .select('id')
      .single();
    
    deductionId = deduction?.id || null;
  }
  
  const { error } = await supabase
    .from('incidents')
    .update({
      recovery_status: 'pending',
      recovery_amount: input.totalAmount,
      recovery_deduction_id: deductionId,
    })
    .eq('id', input.incidentId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Waive recovery amount.
 */
export async function waiveRecovery(
  incidentId: string,
  amount: number,
  reason: string,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: incident } = await supabase
    .from('incidents')
    .select('recovery_amount, recovered_amount, waived_amount')
    .eq('id', incidentId)
    .single();
  
  if (!incident) {
    return { success: false, error: 'Incident not found' };
  }
  
  const newWaivedAmount = (incident.waived_amount || 0) + amount;
  const pending = incident.recovery_amount - (incident.recovered_amount || 0) - newWaivedAmount;
  
  const { error } = await supabase
    .from('incidents')
    .update({
      waived_amount: newWaivedAmount,
      recovery_status: pending <= 0 ? 'waived' : 'partial',
      waiver_reason: reason,
      waiver_approved_by: approvedBy,
    })
    .eq('id', incidentId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// INSURANCE CLAIMS
// ============================================================================

/**
 * File insurance claim.
 */
export async function fileInsuranceClaim(input: {
  incidentId: string;
  insurerName: string;
  claimAmount: number;
  documents?: string[];
  notes?: string;
}): Promise<{ success: boolean; claimId?: string; claimNumber?: string; error?: string }> {
  const supabase = createClient();
  
  // Generate claim number
  const now = new Date();
  const claimNumber = `CLM-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
  
  const { data, error } = await supabase
    .from('insurance_claims')
    .insert({
      incident_id: input.incidentId,
      claim_number: claimNumber,
      insurer_name: input.insurerName,
      filed_at: now.toISOString(),
      status: 'filed',
      claim_amount: input.claimAmount,
      documents: input.documents,
      notes: input.notes,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, claimId: data.id, claimNumber };
}

/**
 * Update insurance claim status.
 */
export async function updateClaimStatus(
  claimId: string,
  status: InsuranceClaim['status'],
  approvedAmount?: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const updates: Record<string, unknown> = { status };
  
  if (status === 'approved' && approvedAmount !== undefined) {
    updates.approved_amount = approvedAmount;
  }
  
  if (status === 'settled') {
    updates.settled_at = new Date().toISOString();
  }
  
  if (notes) {
    updates.notes = notes;
  }
  
  const { error } = await supabase
    .from('insurance_claims')
    .update(updates)
    .eq('id', claimId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get incident by ID.
 */
export async function getIncident(incidentId: string): Promise<Incident | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('incidents')
    .select(`
      *,
      reporter:employees!incidents_reported_by_fkey(full_name),
      rider:employees!incidents_rider_id_fkey(full_name),
      vehicle:assets(license_plate),
      client:clients(name),
      photos:incident_photos(*),
      damages:incident_damages(*),
      investigation:incident_investigations(*),
      resolution:incident_resolutions(*),
      insurance_claim:insurance_claims(*)
    `)
    .eq('id', incidentId)
    .single();
  
  if (!data) return null;
  
  return mapIncident(data);
}

/**
 * Get incidents list.
 */
export async function getIncidents(filters?: {
  type?: IncidentType;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  riderId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Incident[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('incidents')
    .select(`
      *,
      reporter:employees!incidents_reported_by_fkey(full_name),
      rider:employees!incidents_rider_id_fkey(full_name),
      vehicle:assets(license_plate),
      client:clients(name),
      photos:incident_photos(*),
      damages:incident_damages(*),
      investigation:incident_investigations(*),
      resolution:incident_resolutions(*)
    `)
    .order('reported_at', { ascending: false });
  
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.severity) {
    query = query.eq('severity', filters.severity);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.riderId) {
    query = query.eq('rider_id', filters.riderId);
  }
  if (filters?.startDate) {
    query = query.gte('occurred_at', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('occurred_at', filters.endDate);
  }
  
  const { data } = await query;
  
  return (data || []).map(mapIncident);
}

/**
 * Get rider's incident history.
 */
export async function getRiderIncidentHistory(riderId: string): Promise<Incident[]> {
  return getIncidents({ riderId });
}

// ============================================================================
// REPORTING
// ============================================================================

export interface IncidentSummary {
  total: number;
  byStatus: Record<IncidentStatus, number>;
  byType: Record<IncidentType, number>;
  bySeverity: Record<IncidentSeverity, number>;
  openIncidents: number;
  avgResolutionDays: number;
  totalDamages: number;
  totalRecovered: number;
  pendingRecovery: number;
  thisMonth: number;
  lastMonth: number;
  trend: number; // percentage change
}

export async function getIncidentSummary(): Promise<IncidentSummary> {
  const supabase = createClient();
  
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
  
  const { data: incidents } = await supabase
    .from('incidents')
    .select('status, type, severity, reported_at, recovery_amount, recovered_amount');
  
  const { data: resolutions } = await supabase
    .from('incident_resolutions')
    .select(`
      resolved_at,
      incident:incidents(reported_at)
    `);
  
  const { data: damages } = await supabase
    .from('incident_damages')
    .select('estimated_cost, actual_cost');
  
  const byStatus: Record<IncidentStatus, number> = {
    reported: 0,
    under_investigation: 0,
    pending_action: 0,
    resolved: 0,
    escalated: 0,
    closed: 0,
  };
  
  const byType: Record<IncidentType, number> = {
    accident: 0,
    traffic_violation: 0,
    customer_complaint: 0,
    vehicle_damage: 0,
    theft: 0,
    misconduct: 0,
    policy_violation: 0,
    safety_incident: 0,
    equipment_loss: 0,
  };
  
  const bySeverity: Record<IncidentSeverity, number> = {
    minor: 0,
    moderate: 0,
    major: 0,
    critical: 0,
  };
  
  let thisMonth = 0;
  let lastMonth = 0;
  let totalRecovered = 0;
  let pendingRecovery = 0;
  
  for (const inc of incidents || []) {
    byStatus[inc.status as IncidentStatus]++;
    byType[inc.type as IncidentType]++;
    bySeverity[inc.severity as IncidentSeverity]++;
    
    if (inc.reported_at >= thisMonthStart) thisMonth++;
    if (inc.reported_at >= lastMonthStart && inc.reported_at <= lastMonthEnd) lastMonth++;
    
    totalRecovered += inc.recovered_amount || 0;
    pendingRecovery += (inc.recovery_amount || 0) - (inc.recovered_amount || 0);
  }
  
  // Calculate average resolution time
  let totalResolutionDays = 0;
  let resolvedCount = 0;
  
  for (const res of resolutions || []) {
    const incidentRel = res.incident as unknown;
    const incident = (Array.isArray(incidentRel) ? incidentRel[0] : incidentRel) as { reported_at: string } | null;
    if (incident?.reported_at && res.resolved_at) {
      const reported = new Date(incident.reported_at).getTime();
      const resolved = new Date(res.resolved_at).getTime();
      totalResolutionDays += (resolved - reported) / (1000 * 60 * 60 * 24);
      resolvedCount++;
    }
  }
  
  const totalDamages = damages?.reduce((sum, d) => sum + (d.actual_cost || d.estimated_cost || 0), 0) || 0;
  
  const trend = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;
  
  return {
    total: incidents?.length || 0,
    byStatus,
    byType,
    bySeverity,
    openIncidents: byStatus.reported + byStatus.under_investigation + byStatus.pending_action + byStatus.escalated,
    avgResolutionDays: resolvedCount > 0 ? Math.round(totalResolutionDays / resolvedCount) : 0,
    totalDamages,
    totalRecovered,
    pendingRecovery: Math.max(0, pendingRecovery),
    thisMonth,
    lastMonth,
    trend,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function mapIncident(row: Record<string, unknown>): Incident {
  const reporter = row.reporter as unknown;
  const reporterData = (Array.isArray(reporter) ? reporter[0] : reporter) as { full_name: string } | null;
  const rider = row.rider as unknown;
  const riderData = (Array.isArray(rider) ? rider[0] : rider) as { full_name: string } | null;
  const vehicle = row.vehicle as unknown;
  const vehicleData = (Array.isArray(vehicle) ? vehicle[0] : vehicle) as { license_plate: string } | null;
  const platform = row.platform as unknown;
  const platformData = (Array.isArray(platform) ? platform[0] : platform) as { name: string } | null;
  const investigationArr = row.investigation as Array<Record<string, unknown>>;
  const investigation = investigationArr?.[0];
  const resolutionArr = row.resolution as Array<Record<string, unknown>>;
  const resolution = resolutionArr?.[0];
  const claimArr = row.insurance_claim as Array<Record<string, unknown>>;
  const claim = claimArr?.[0];
  
  return {
    id: row.id as string,
    incidentNumber: row.incident_number as string,
    type: row.type as IncidentType,
    severity: row.severity as IncidentSeverity,
    status: row.status as IncidentStatus,
    reportedBy: row.reported_by as string,
    reportedByName: reporterData?.full_name || 'Unknown',
    reportedAt: row.reported_at as string,
    occurredAt: row.occurred_at as string,
    location: row.location as string | null,
    coordinates: row.coordinates as { lat: number; lng: number } | null,
    riderId: row.rider_id as string | null,
    riderName: riderData?.full_name || null,
    vehicleId: row.vehicle_id as string | null,
    vehiclePlate: vehicleData?.license_plate || null,
    platformId: row.platform_id as string | null,
    platformName: platformData?.name || null,
    orderId: row.order_id as string | null,
    title: row.title as string,
    description: row.description as string,
    injuries: row.injuries as boolean,
    policeReportNumber: row.police_report_number as string | null,
    witnesses: (row.witnesses as Witness[]) || [],
    photos: ((row.photos as Array<Record<string, unknown>>) || []).map(p => ({
      id: p.id as string,
      url: p.url as string,
      caption: p.caption as string | null,
      category: p.category as IncidentPhoto['category'],
      takenAt: p.taken_at as string,
    })),
    damages: ((row.damages as Array<Record<string, unknown>>) || []).map(d => ({
      id: d.id as string,
      itemType: d.item_type as IncidentDamage['itemType'],
      description: d.description as string,
      estimatedCost: d.estimated_cost as number,
      actualCost: d.actual_cost as number | null,
      repaired: d.repaired as boolean,
      repairedAt: d.repaired_at as string | null,
    })),
    investigation: investigation ? {
      id: investigation.id as string,
      investigatorId: investigation.investigator_id as string,
      investigatorName: '', // Would need join
      startedAt: investigation.started_at as string,
      completedAt: investigation.completed_at as string | null,
      findings: investigation.findings as string | null,
      riderAtFault: investigation.rider_at_fault as boolean | null,
      faultPercentage: investigation.fault_percentage as number | null,
      recommendedAction: investigation.recommended_action as string | null,
      evidence: (investigation.evidence as string[]) || [],
    } : null,
    resolution: resolution ? {
      id: resolution.id as string,
      resolvedBy: resolution.resolved_by as string,
      resolvedByName: '', // Would need join
      resolvedAt: resolution.resolved_at as string,
      actionTaken: resolution.action_taken as string,
      disciplinaryAction: resolution.disciplinary_action as Resolution['disciplinaryAction'],
      suspensionDays: resolution.suspension_days as number | null,
      notes: resolution.notes as string | null,
    } : null,
    recovery: {
      status: row.recovery_status as RecoveryStatus || 'not_applicable',
      totalAmount: row.recovery_amount as number || 0,
      recoveredAmount: row.recovered_amount as number || 0,
      waivedAmount: row.waived_amount as number || 0,
      pendingAmount: (row.recovery_amount as number || 0) - (row.recovered_amount as number || 0) - (row.waived_amount as number || 0),
      deductionId: row.recovery_deduction_id as string | null,
      notes: null,
    },
    insuranceClaim: claim ? {
      id: claim.id as string,
      claimNumber: claim.claim_number as string,
      insurerName: claim.insurer_name as string,
      filedAt: claim.filed_at as string,
      status: claim.status as InsuranceClaim['status'],
      claimAmount: claim.claim_amount as number,
      approvedAmount: claim.approved_amount as number | null,
      settledAt: claim.settled_at as string | null,
      documents: (claim.documents as string[]) || [],
      notes: claim.notes as string | null,
    } : null,
  };
}
