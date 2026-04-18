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
