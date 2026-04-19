/**
 * Incident types and interfaces.
 * Accidents, damage events, and incident tracking.
 */

export type IncidentType = 
  | 'accident'
  | 'theft'
  | 'vandalism'
  | 'breakdown'
  | 'damage_rider'
  | 'damage_third_party'
  | 'violation'
  | 'other';

export type IncidentSeverity = 'minor' | 'moderate' | 'major' | 'total';

export type ResponsibilityParty = 'rider' | 'third_party' | 'company' | 'unknown' | 'shared';

export type IncidentStatus = 'reported' | 'under_investigation' | 'resolved' | 'closed';

export type RecoveryStatus = 'pending' | 'partial' | 'recovered' | 'written_off' | 'not_applicable';

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  accident: 'Traffic Accident',
  theft: 'Theft',
  vandalism: 'Vandalism',
  breakdown: 'Breakdown',
  damage_rider: 'Damage by Rider',
  damage_third_party: 'Damage by Third Party',
  violation: 'Traffic Violation',
  other: 'Other',
};

export const INCIDENT_SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  minor: 'Minor',
  moderate: 'Moderate',
  major: 'Major',
  total: 'Total Loss',
};

export const RESPONSIBILITY_LABELS: Record<ResponsibilityParty, string> = {
  rider: 'Rider',
  third_party: 'Third Party',
  company: 'Company',
  unknown: 'Unknown',
  shared: 'Shared',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: 'Reported',
  under_investigation: 'Under Investigation',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const RECOVERY_STATUS_LABELS: Record<RecoveryStatus, string> = {
  not_applicable: 'N/A',
  pending: 'Pending',
  partial: 'Partial',
  recovered: 'Recovered',
  written_off: 'Written Off',
};

/**
 * Incident entity.
 */
export interface Incident {
  id: string;
  organization_id: string;
  incident_number: string | null;
  // What was involved
  asset_id: string | null;
  employee_id: string | null;
  // Details
  incident_type: IncidentType;
  severity: IncidentSeverity;
  incident_date: string;
  incident_time: string | null;
  // Location
  incident_location: string | null;
  incident_latitude: number | null;
  incident_longitude: number | null;
  // Description
  description: string;
  // Responsibility
  responsibility: ResponsibilityParty;
  responsibility_notes: string | null;
  // Evidence (T-083)
  photos_uploaded: boolean;
  photos_path: string | null;
  police_report_filed: boolean;
  police_report_number: string | null;
  police_report_path: string | null;
  rider_statement: string | null;
  witness_statements: string | null;
  other_party_info: string | null;
  // Insurance
  insurance_claim_filed: boolean;
  insurance_claim_number: string | null;
  insurance_claim_status: string | null;
  insurance_payout: number | null;
  // Costs
  estimated_repair_cost: number | null;
  actual_repair_cost: number | null;
  other_costs: number;
  total_cost: number | null;
  // Recovery
  recovery_from: string | null;
  recovery_amount: number;
  recovery_status: RecoveryStatus;
  deduction_from_payroll: boolean;
  deduction_amount: number;
  // Operational impact
  vehicle_downtime_days: number;
  rider_suspension_days: number;
  // Approval
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  // Status
  status: IncidentStatus;
  resolution_notes: string | null;
  // Links
  maintenance_event_id: string | null;
  notes: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Incident with related data.
 */
export interface IncidentWithRelations extends Incident {
  asset?: {
    id: string;
    name: string;
    license_plate: string | null;
  } | null;
  employee?: {
    id: string;
    full_name: string;
    employee_id: string | null;
  } | null;
  approver?: {
    id: string;
    full_name: string;
  } | null;
}

/**
 * Input for creating an incident.
 */
export interface CreateIncidentInput {
  asset_id?: string;
  employee_id?: string;
  incident_type: IncidentType;
  severity?: IncidentSeverity;
  incident_date: string;
  incident_time?: string;
  incident_location?: string;
  incident_latitude?: number;
  incident_longitude?: number;
  description: string;
  responsibility?: ResponsibilityParty;
  responsibility_notes?: string;
  rider_statement?: string;
  other_party_info?: string;
  notes?: string;
}

/**
 * Input for updating an incident.
 */
export interface UpdateIncidentInput extends Partial<CreateIncidentInput> {
  status?: IncidentStatus;
  photos_uploaded?: boolean;
  photos_path?: string;
  police_report_filed?: boolean;
  police_report_number?: string;
  police_report_path?: string;
  witness_statements?: string;
  insurance_claim_filed?: boolean;
  insurance_claim_number?: string;
  insurance_claim_status?: string;
  estimated_repair_cost?: number;
  actual_repair_cost?: number;
  other_costs?: number;
  recovery_from?: string;
  recovery_amount?: number;
  recovery_status?: RecoveryStatus;
  deduction_from_payroll?: boolean;
  deduction_amount?: number;
  resolution_notes?: string;
}

/**
 * Incident summary for dashboards.
 */
export interface IncidentSummary {
  total_incidents: number;
  open_incidents: number;
  by_type: Record<IncidentType, number>;
  by_severity: Record<IncidentSeverity, number>;
  total_cost: number;
  recovered_amount: number;
  pending_recovery: number;
  total_downtime_days: number;
}

// ============================================
// T-038: Breakdown Escalation Workflow
// ============================================

export type BreakdownType = 
  | 'flat_tire'
  | 'engine_failure'
  | 'battery_dead'
  | 'fuel_empty'
  | 'electrical'
  | 'brakes'
  | 'transmission'
  | 'overheating'
  | 'accident_damage'
  | 'other';

export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical';

export type EscalationStatus = 
  | 'none'
  | 'level_1'
  | 'level_2'
  | 'level_3'
  | 'resolved';

export const BREAKDOWN_TYPE_LABELS: Record<BreakdownType, string> = {
  flat_tire: 'Flat Tire',
  engine_failure: 'Engine Failure',
  battery_dead: 'Dead Battery',
  fuel_empty: 'Out of Fuel',
  electrical: 'Electrical Issue',
  brakes: 'Brake Failure',
  transmission: 'Transmission Issue',
  overheating: 'Overheating',
  accident_damage: 'Accident Damage',
  other: 'Other',
};

export const INCIDENT_PRIORITY_LABELS: Record<IncidentPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const ESCALATION_STATUS_LABELS: Record<EscalationStatus, string> = {
  none: 'Not Escalated',
  level_1: 'Level 1 - Supervisor',
  level_2: 'Level 2 - Manager',
  level_3: 'Level 3 - Director',
  resolved: 'Resolved',
};

/**
 * Extended incident fields for breakdown escalation workflow.
 */
export interface IncidentEscalationFields {
  priority: IncidentPriority | null;
  escalation_status: EscalationStatus | null;
  breakdown_type: BreakdownType | null;
  reported_at: string | null;
  assigned_to: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  response_time_minutes: number | null;
  operational_impact: string | null;
  affected_shift_id: string | null;
  spare_vehicle_dispatched: boolean;
  spare_vehicle_id: string | null;
  dispatched_at: string | null;
}

/**
 * Full incident with escalation fields.
 */
export interface IncidentWithEscalation extends Incident, IncidentEscalationFields {}

/**
 * Incident escalation history record.
 */
export interface IncidentEscalation {
  id: string;
  incident_id: string;
  escalation_level: number;
  escalated_at: string;
  escalated_to: string | null;
  escalated_by_system: boolean;
  reason: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  response_notes: string | null;
  created_at: string;
}

/**
 * Breakdown response tracking.
 */
export interface BreakdownResponse {
  id: string;
  incident_id: string;
  responder_id: string | null;
  response_type: 'acknowledgement' | 'dispatch' | 'arrival' | 'resolution' | 'note';
  responded_at: string;
  notes: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  created_at: string;
}

/**
 * Active breakdown view record.
 */
export interface ActiveBreakdown {
  id: string;
  organization_id: string;
  incident_number: string | null;
  incident_type: IncidentType;
  breakdown_type: BreakdownType | null;
  severity: IncidentSeverity;
  priority: IncidentPriority | null;
  escalation_status: EscalationStatus | null;
  status: IncidentStatus;
  description: string;
  incident_date: string;
  incident_time: string | null;
  reported_at: string | null;
  incident_location: string | null;
  incident_latitude: number | null;
  incident_longitude: number | null;
  // Related entities
  asset_id: string | null;
  employee_id: string | null;
  assigned_to: string | null;
  // Response tracking
  first_response_at: string | null;
  response_time_minutes: number | null;
  // Spare vehicle
  spare_vehicle_dispatched: boolean;
  spare_vehicle_id: string | null;
  dispatched_at: string | null;
  // Operational impact
  operational_impact: string | null;
  affected_shift_id: string | null;
}

/**
 * Breakdown response time statistics.
 */
export interface BreakdownResponseTimes {
  organization_id: string;
  incident_id: string;
  incident_number: string | null;
  incident_date: string;
  breakdown_type: BreakdownType | null;
  priority: IncidentPriority | null;
  time_to_acknowledge_minutes: number | null;
  time_to_dispatch_minutes: number | null;
  time_to_resolve_minutes: number | null;
  total_response_time_minutes: number | null;
}

/**
 * Input for reporting a breakdown.
 */
export interface ReportBreakdownInput {
  asset_id: string;
  employee_id?: string;
  breakdown_type: BreakdownType;
  description: string;
  incident_location?: string;
  incident_latitude?: number;
  incident_longitude?: number;
  priority?: IncidentPriority;
  affected_shift_id?: string;
}

/**
 * Input for acknowledging a breakdown.
 */
export interface AcknowledgeBreakdownInput {
  incident_id: string;
  assigned_to?: string;
  notes?: string;
}

/**
 * Input for resolving a breakdown.
 */
export interface ResolveBreakdownInput {
  incident_id: string;
  resolution_notes?: string;
}

/**
 * Breakdown dashboard summary.
 */
export interface BreakdownDashboardSummary {
  active_breakdowns: number;
  awaiting_acknowledgement: number;
  awaiting_dispatch: number;
  in_progress: number;
  resolved_today: number;
  avg_response_time_minutes: number | null;
  by_type: Record<BreakdownType, number>;
  by_priority: Record<IncidentPriority, number>;
}

// ============================================
// T-043: Accident/Incident Procedure
// ============================================

export type ProcedureStepStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'not_applicable';

export const PROCEDURE_STEP_STATUS_LABELS: Record<ProcedureStepStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  skipped: 'Skipped',
  not_applicable: 'N/A',
};

/**
 * Incident procedure template - defines standard steps for an incident type.
 */
export interface IncidentProcedureTemplate {
  id: string;
  organization_id: string;
  incident_type: IncidentType;
  step_order: number;
  step_name: string;
  step_description: string | null;
  is_required: boolean;
  requires_photo: boolean;
  requires_document: boolean;
  requires_signature: boolean;
  document_template_path: string | null;
  sla_hours: number | null;
  escalate_if_overdue: boolean;
  escalate_to_role: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Incident procedure step - actual step for a specific incident.
 */
export interface IncidentProcedureStep {
  id: string;
  incident_id: string;
  template_id: string | null;
  step_order: number;
  step_name: string;
  step_description: string | null;
  is_required: boolean;
  
  status: ProcedureStepStatus;
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  
  notes: string | null;
  photo_paths: string[] | null;
  document_paths: string[] | null;
  signature_path: string | null;
  
  sla_deadline: string | null;
  
  created_at: string;
  updated_at: string;
}

/**
 * Procedure completion status returned by check_incident_procedure_completion function.
 */
export interface ProcedureCompletionStatus {
  total_steps: number;
  required_steps: number;
  completed_steps: number;
  required_completed: number;
  overdue_steps: number;
  completion_percent: number;
  is_complete: boolean;
}

/**
 * Incident procedure progress from view.
 */
export interface IncidentProcedureProgress {
  incident_id: string;
  organization_id: string;
  incident_number: string | null;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  incident_status: IncidentStatus;
  incident_created: string;
  total_steps: number;
  completed_steps: number;
  in_progress_steps: number;
  pending_required_steps: number;
  overdue_steps: number;
  completion_percent: number;
  next_deadline: string | null;
}

/**
 * Overdue procedure step from view.
 */
export interface OverdueProcedureStep {
  step_id: string;
  incident_id: string;
  organization_id: string;
  incident_number: string | null;
  incident_type: IncidentType;
  rider_name: string | null;
  step_order: number;
  step_name: string;
  status: ProcedureStepStatus;
  sla_deadline: string;
  hours_overdue: number;
  escalate_to_role: string | null;
}

/**
 * Input for completing a procedure step.
 */
export interface CompleteProcedureStepInput {
  step_id: string;
  notes?: string;
  photo_paths?: string[];
  document_paths?: string[];
  signature_path?: string;
}

/**
 * Input for skipping a procedure step.
 */
export interface SkipProcedureStepInput {
  step_id: string;
  notes: string;  // Required when skipping
}

/**
 * Input for creating a procedure template.
 */
export interface CreateProcedureTemplateInput {
  incident_type: IncidentType;
  step_order: number;
  step_name: string;
  step_description?: string;
  is_required?: boolean;
  requires_photo?: boolean;
  requires_document?: boolean;
  requires_signature?: boolean;
  sla_hours?: number;
  escalate_if_overdue?: boolean;
  escalate_to_role?: string;
}

// ============================================
// T-044: Spare Vehicle Dispatch
// ============================================

export type SpareDispatchStatus = 
  | 'requested'
  | 'approved'
  | 'dispatched'
  | 'en_route'
  | 'arrived'
  | 'assigned'
  | 'returned'
  | 'cancelled';

export const SPARE_DISPATCH_STATUS_LABELS: Record<SpareDispatchStatus, string> = {
  requested: 'Requested',
  approved: 'Approved',
  dispatched: 'Dispatched',
  en_route: 'En Route',
  arrived: 'Arrived',
  assigned: 'Assigned to Rider',
  returned: 'Returned',
  cancelled: 'Cancelled',
};

/**
 * Spare vehicle dispatch record.
 */
export interface SpareVehicleDispatch {
  id: string;
  organization_id: string;
  dispatch_number: string;
  
  incident_id: string | null;
  original_vehicle_id: string | null;
  spare_vehicle_id: string;
  rider_id: string;
  
  requested_at: string;
  requested_by: string | null;
  request_reason: string | null;
  dispatch_location: string | null;
  dispatch_latitude: number | null;
  dispatch_longitude: number | null;
  
  requires_approval: boolean;
  approved_at: string | null;
  approved_by: string | null;
  
  dispatched_at: string | null;
  dispatched_by: string | null;
  driver_id: string | null;
  expected_arrival: string | null;
  
  arrived_at: string | null;
  handed_over_at: string | null;
  handover_odometer: number | null;
  handover_notes: string | null;
  handover_photos: string[] | null;
  
  return_requested_at: string | null;
  returned_at: string | null;
  return_odometer: number | null;
  return_condition: string | null;
  return_notes: string | null;
  
  status: SpareDispatchStatus;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Available spare vehicle for dispatch.
 */
export interface AvailableSpareVehicle {
  vehicle_id: string;
  name: string;
  license_plate: string | null;
  category: string | null;
  current_location_id: string | null;
  current_location_name: string | null;
  last_used_date: string | null;
  odometer_reading: number | null;
}

/**
 * Active spare dispatch with details from view.
 */
export interface ActiveSpareDispatch {
  id: string;
  organization_id: string;
  dispatch_number: string;
  incident_id: string | null;
  incident_number: string | null;
  incident_type: IncidentType | null;
  original_vehicle_id: string | null;
  original_vehicle_plate: string | null;
  spare_vehicle_id: string;
  spare_vehicle_plate: string | null;
  spare_vehicle_name: string;
  rider_id: string;
  rider_name: string;
  rider_phone: string | null;
  driver_id: string | null;
  driver_name: string | null;
  dispatch_location: string | null;
  status: SpareDispatchStatus;
  requested_at: string;
  dispatched_at: string | null;
  expected_arrival: string | null;
  arrived_at: string | null;
  handed_over_at: string | null;
  minutes_since_dispatch: number;
  is_overdue: boolean;
}

/**
 * Spare dispatch metrics.
 */
export interface SpareDispatchMetrics {
  organization_id: string;
  total_dispatches: number;
  active_dispatches: number;
  completed_dispatches: number;
  cancelled_dispatches: number;
  avg_arrival_minutes: number | null;
  avg_assignment_minutes: number | null;
  late_arrivals: number;
}

/**
 * Input for dispatching spare vehicle.
 */
export interface DispatchSpareVehicleInput {
  incident_id?: string;
  spare_vehicle_id: string;
  rider_id: string;
  driver_id?: string;
  expected_arrival_minutes?: number;
  dispatch_location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

/**
 * Input for marking spare arrival.
 */
export interface SpareVehicleArrivedInput {
  dispatch_id: string;
  handover_odometer?: number;
  notes?: string;
}

/**
 * Input for returning spare vehicle.
 */
export interface ReturnSpareVehicleInput {
  dispatch_id: string;
  return_odometer?: number;
  return_condition?: string;
  notes?: string;
}

// ============================================
// T-045: Partner/Rider-owned Vehicle Breakdown
// ============================================

export type PartnerMaintenanceResponsibility = 'rider' | 'company' | 'shared';

export type PartnerBreakdownCoverage = 'none' | 'basic' | 'full';

export type PartnerClaimStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'partially_approved'
  | 'rejected'
  | 'paid';

export const PARTNER_MAINTENANCE_LABELS: Record<PartnerMaintenanceResponsibility, string> = {
  rider: 'Rider Responsible',
  company: 'Company Responsible',
  shared: 'Shared Responsibility',
};

export const PARTNER_BREAKDOWN_COVERAGE_LABELS: Record<PartnerBreakdownCoverage, string> = {
  none: 'No Coverage',
  basic: 'Basic Coverage',
  full: 'Full Coverage',
};

export const PARTNER_CLAIM_STATUS_LABELS: Record<PartnerClaimStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  partially_approved: 'Partially Approved',
  rejected: 'Rejected',
  paid: 'Paid',
};

/**
 * Partner vehicle fields extending asset.
 */
export interface PartnerVehicleFields {
  is_partner_vehicle: boolean;
  partner_agreement_signed: boolean;
  partner_maintenance_responsibility: PartnerMaintenanceResponsibility | null;
  partner_breakdown_coverage: PartnerBreakdownCoverage | null;
}

/**
 * Partner breakdown coverage option.
 */
export interface PartnerBreakdownOption {
  id: string;
  organization_id: string;
  option_name: string;
  description: string | null;
  
  covers_towing: boolean;
  covers_roadside_repair: boolean;
  covers_spare_vehicle: boolean;
  covers_taxi_reimbursement: boolean;
  
  max_towing_km: number | null;
  max_roadside_cost: number | null;
  max_taxi_reimbursement: number | null;
  
  requires_photos: boolean;
  requires_receipt: boolean;
  requires_preapproval: boolean;
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Partner breakdown claim.
 */
export interface PartnerBreakdownClaim {
  id: string;
  organization_id: string;
  claim_number: string;
  
  incident_id: string | null;
  rider_id: string;
  vehicle_id: string | null;
  breakdown_option_id: string | null;
  
  breakdown_date: string;
  breakdown_time: string | null;
  breakdown_location: string | null;
  breakdown_type: BreakdownType | null;
  description: string | null;
  
  // Towing
  towing_requested: boolean;
  towing_distance_km: number | null;
  towing_cost: number | null;
  towing_receipt_path: string | null;
  
  // Roadside repair
  roadside_repair_requested: boolean;
  repair_description: string | null;
  repair_cost: number | null;
  repair_receipt_path: string | null;
  
  // Taxi
  taxi_requested: boolean;
  taxi_cost: number | null;
  taxi_receipt_path: string | null;
  
  // Other
  other_expenses: number;
  other_expenses_description: string | null;
  other_receipt_paths: string[] | null;
  
  // Totals
  total_claimed: number;
  
  // Evidence
  photo_paths: string[] | null;
  
  // Approval
  status: PartnerClaimStatus;
  approved_amount: number | null;
  rejection_reason: string | null;
  
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  
  approved_by: string | null;
  approved_at: string | null;
  
  // Payment
  paid_at: string | null;
  payment_reference: string | null;
  paid_in_payroll_id: string | null;
  
  // Shift impact
  shift_missed: boolean;
  hours_lost: number | null;
  
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Partner breakdown claim view with related data.
 */
export interface PartnerBreakdownClaimView {
  id: string;
  organization_id: string;
  claim_number: string;
  incident_id: string | null;
  incident_number: string | null;
  rider_id: string;
  rider_name: string;
  rider_code: string | null;
  vehicle_id: string | null;
  license_plate: string | null;
  vehicle_name: string | null;
  coverage_option: string | null;
  breakdown_date: string;
  breakdown_type: BreakdownType | null;
  description: string | null;
  breakdown_location: string | null;
  towing_cost: number | null;
  repair_cost: number | null;
  taxi_cost: number | null;
  other_expenses: number | null;
  total_claimed: number;
  approved_amount: number | null;
  status: PartnerClaimStatus;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  paid_at: string | null;
  shift_missed: boolean;
  hours_lost: number | null;
  created_at: string;
}

/**
 * Partner breakdown summary for dashboard.
 */
export interface PartnerBreakdownSummary {
  organization_id: string;
  total_claims: number;
  pending_claims: number;
  approved_claims: number;
  paid_claims: number;
  total_amount_claimed: number;
  total_amount_approved: number | null;
  avg_claim_amount: number | null;
  riders_with_claims: number;
  total_hours_lost: number | null;
}

/**
 * Input for submitting a partner breakdown claim.
 */
export interface SubmitPartnerBreakdownClaimInput {
  rider_id: string;
  vehicle_id: string;
  incident_id?: string;
  breakdown_date?: string;
  breakdown_type?: BreakdownType;
  description?: string;
  breakdown_location?: string;
}

/**
 * Input for adding expenses to a claim.
 */
export interface AddClaimExpenseInput {
  claim_id: string;
  towing_distance_km?: number;
  towing_cost?: number;
  towing_receipt_path?: string;
  repair_description?: string;
  repair_cost?: number;
  repair_receipt_path?: string;
  taxi_cost?: number;
  taxi_receipt_path?: string;
  other_expenses?: number;
  other_expenses_description?: string;
}

/**
 * Input for reviewing a claim.
 */
export interface ReviewPartnerClaimInput {
  claim_id: string;
  approved_amount?: number;
  rejection_reason?: string;
  review_notes?: string;
}

/**
 * Input for creating a breakdown option.
 */
export interface CreateBreakdownOptionInput {
  option_name: string;
  description?: string;
  covers_towing?: boolean;
  covers_roadside_repair?: boolean;
  covers_spare_vehicle?: boolean;
  covers_taxi_reimbursement?: boolean;
  max_towing_km?: number;
  max_roadside_cost?: number;
  max_taxi_reimbursement?: number;
  requires_photos?: boolean;
  requires_receipt?: boolean;
  requires_preapproval?: boolean;
}
