/**
 * Performance & Discipline Module Types
 * 
 * Types for tracking incidents, warnings, performance issues,
 * and disciplinary actions.
 */

export type DisciplineType = 
  | 'verbal_warning'
  | 'written_warning'
  | 'final_warning'
  | 'suspension'
  | 'termination'
  | 'performance_improvement_plan'
  | 'incident_report'
  | 'commendation';

export type DisciplineStatus = 
  | 'open'
  | 'under_review'
  | 'resolved'
  | 'escalated'
  | 'closed';

export type SeverityLevel = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export interface PerformanceDiscipline {
  id: string;
  organization_id: string;
  employee_id: string;
  reporter_id: string | null;
  type: DisciplineType;
  status: DisciplineStatus;
  severity: SeverityLevel;
  
  // Vehicle-linked discipline
  vehicle_id: string | null;
  vehicle_misuse_type: VehicleMisuseType | null;
  
  // Details
  title: string;
  description: string | null;
  incident_date: string;
  location: string | null;
  witnesses: string[] | null;
  
  // Action taken
  action_taken: string | null;
  action_date: string | null;
  follow_up_date: string | null;
  
  // Employee acknowledgment
  employee_acknowledged: boolean;
  acknowledged_at: string | null;
  employee_response: string | null;
  
  // Outcome
  outcome: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  
  // Attachments/evidence
  attachment_urls: string[] | null;
  
  // Notes
  manager_notes: string | null;
  hr_notes: string | null;
  
  created_at: string;
  updated_at: string;
  
  // Joined fields
  employee?: {
    id: string;
    full_name: string;
    employee_id: string | null;
  };
  reporter?: {
    id: string;
    full_name: string;
  } | null;
}

export const DISCIPLINE_TYPE_LABELS: Record<DisciplineType, string> = {
  verbal_warning: 'Verbal Warning',
  written_warning: 'Written Warning',
  final_warning: 'Final Warning',
  suspension: 'Suspension',
  termination: 'Termination',
  performance_improvement_plan: 'Performance Improvement Plan (PIP)',
  incident_report: 'Incident Report',
  commendation: 'Commendation',
};

export const DISCIPLINE_TYPE_COLORS: Record<DisciplineType, string> = {
  verbal_warning: 'bg-yellow-100 text-yellow-800',
  written_warning: 'bg-orange-100 text-orange-800',
  final_warning: 'bg-red-100 text-red-800',
  suspension: 'bg-red-200 text-red-900',
  termination: 'bg-red-300 text-red-900',
  performance_improvement_plan: 'bg-blue-100 text-blue-800',
  incident_report: 'bg-gray-100 text-gray-800',
  commendation: 'bg-green-100 text-green-800',
};

export const DISCIPLINE_STATUS_LABELS: Record<DisciplineStatus, string> = {
  open: 'Open',
  under_review: 'Under Review',
  resolved: 'Resolved',
  escalated: 'Escalated',
  closed: 'Closed',
};

export const DISCIPLINE_STATUS_COLORS: Record<DisciplineStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  escalated: 'bg-red-100 text-red-800',
  closed: 'bg-gray-100 text-gray-800',
};

// Vehicle-linked discipline types
export type DisciplineTriggerType =
  | 'maintenance_delay'
  | 'unauthorized_use'
  | 'damage_report'
  | 'speeding'
  | 'harsh_driving'
  | 'accident'
  | 'fuel_theft';

export type VehicleMisuseType =
  | 'unauthorized_personal_use'
  | 'speeding'
  | 'reckless_driving'
  | 'parking_violation'
  | 'traffic_violation'
  | 'accident_at_fault'
  | 'damage_unreported'
  | 'fuel_misuse';

export interface VehicleDisciplineTrigger {
  id: string;
  organization_id: string;
  trigger_type: DisciplineTriggerType;
  severity_level: SeverityLevel;
  auto_create_record: boolean;
  default_discipline_type: DisciplineType;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const DISCIPLINE_TRIGGER_LABELS: Record<DisciplineTriggerType, string> = {
  maintenance_delay: 'Maintenance Delay',
  unauthorized_use: 'Unauthorized Use',
  damage_report: 'Damage Report',
  speeding: 'Speeding',
  harsh_driving: 'Harsh Driving',
  accident: 'Accident',
  fuel_theft: 'Fuel Theft',
};

export const VEHICLE_MISUSE_LABELS: Record<VehicleMisuseType, string> = {
  unauthorized_personal_use: 'Unauthorized Personal Use',
  speeding: 'Speeding',
  reckless_driving: 'Reckless Driving',
  parking_violation: 'Parking Violation',
  traffic_violation: 'Traffic Violation',
  accident_at_fault: 'Accident (At Fault)',
  damage_unreported: 'Damage Unreported',
  fuel_misuse: 'Fuel Misuse',
};

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};
