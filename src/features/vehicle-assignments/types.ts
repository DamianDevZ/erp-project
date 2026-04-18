/**
 * Vehicle Assignment Types
 * T-036: Rider + vehicle pairing workflow
 * T-036-1: Replace vehicle of rider
 */

// Assignment status enum matching database
export type VehicleAssignmentStatus = 
  | 'pending'
  | 'active'
  | 'returning'
  | 'completed'
  | 'cancelled';

// Handover type enum
export type HandoverType = 'assignment' | 'replacement' | 'return' | 'transfer';

// Labels
export const assignmentStatusLabels: Record<VehicleAssignmentStatus, string> = {
  pending: 'Pending Handover',
  active: 'Active',
  returning: 'Returning',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

export const handoverTypeLabels: Record<HandoverType, string> = {
  assignment: 'New Assignment',
  replacement: 'Vehicle Replacement',
  return: 'Return',
  transfer: 'Transfer'
};

/**
 * Vehicle assignment record
 */
export interface VehicleAssignment {
  id: string;
  organization_id: string;
  vehicle_id: string;
  employee_id: string;
  status: VehicleAssignmentStatus;

  // Previous assignment (for replacements)
  previous_assignment_id: string | null;
  previous_vehicle_id: string | null;

  // Assignment period
  assigned_at: string | null;
  returned_at: string | null;
  expected_return_date: string | null;

  // Handover out (company to rider)
  handover_out_date: string | null;
  handover_out_type: HandoverType;
  handover_out_by: string | null;
  handover_out_odometer: number | null;
  handover_out_fuel_level: string | null;
  handover_out_condition: string | null;
  handover_out_photos: string[] | null;
  handover_out_notes: string | null;
  handover_out_checklist: Record<string, unknown> | null;

  // Handover in (rider to company)
  handover_in_date: string | null;
  handover_in_by: string | null;
  handover_in_odometer: number | null;
  handover_in_fuel_level: string | null;
  handover_in_condition: string | null;
  handover_in_photos: string[] | null;
  handover_in_notes: string | null;
  handover_in_checklist: Record<string, unknown> | null;

  // Damage tracking
  damages_found: VehicleDamage[] | null;
  damage_charges: number;
  deduction_agreement_id: string | null;

  // Deposit tracking
  deposit_amount: number | null;
  deposit_received: boolean;
  deposit_returned: boolean;
  deposit_deductions: number;

  // Metadata
  reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Vehicle damage record
 */
export interface VehicleDamage {
  location: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major';
  photos?: string[];
  estimated_cost?: number;
}

/**
 * Current vehicle assignment from view
 */
export interface CurrentVehicleAssignment {
  id: string;
  organization_id: string;
  vehicle_id: string;
  license_plate: string | null;
  make: string | null;
  model: string | null;
  asset_number: string | null;
  employee_id: string;
  rider_name: string;
  rider_code: string | null;
  status: VehicleAssignmentStatus;
  assigned_at: string | null;
  handover_out_date: string | null;
  handover_out_type: HandoverType;
  handover_out_odometer: number | null;
  expected_return_date: string | null;
  deposit_amount: number | null;
  deposit_received: boolean;
  days_assigned: number | null;
  vehicle_status: string;
  vehicle_compliance: string | null;
}

/**
 * Vehicle assignment history entry from view
 */
export interface VehicleAssignmentHistory {
  id: string;
  organization_id: string;
  vehicle_id: string;
  license_plate: string | null;
  vehicle_name: string;
  employee_id: string;
  rider_name: string;
  status: VehicleAssignmentStatus;
  handover_out_type: HandoverType;
  assigned_at: string | null;
  returned_at: string | null;
  handover_out_odometer: number | null;
  handover_in_odometer: number | null;
  km_driven: number;
  days_used: number | null;
  had_damages: boolean;
  damage_charges: number;
  notes: string | null;
}

/**
 * Available vehicle from view
 */
export interface AvailableVehicle {
  vehicle_id: string;
  organization_id: string;
  license_plate: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  asset_number: string | null;
  vehicle_status: string;
  compliance_status: string | null;
  is_spare: boolean;
  odometer_reading: number | null;
  next_service_date: string | null;
  registration_expiry: string | null;
  insurance_expiry: string | null;
  unavailable_reason: string | null;
}

/**
 * Handover checklist item
 */
export interface HandoverChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  notes?: string;
}

/**
 * Input for creating a new assignment
 */
export interface CreateVehicleAssignmentInput {
  vehicle_id: string;
  employee_id: string;
  handover_type?: HandoverType;
  deposit_amount?: number;
  expected_return_date?: string;
  notes?: string;
}

/**
 * Input for completing handover out
 */
export interface HandoverOutInput {
  assignment_id: string;
  odometer: number;
  fuel_level?: string;
  condition?: string;
  photos?: string[];
  notes?: string;
  checklist?: HandoverChecklistItem[];
}

/**
 * Input for completing handover in
 */
export interface HandoverInInput {
  assignment_id: string;
  odometer: number;
  fuel_level?: string;
  condition?: string;
  photos?: string[];
  notes?: string;
  checklist?: HandoverChecklistItem[];
  damages?: VehicleDamage[];
  damage_charges?: number;
}

/**
 * Input for replacing a rider's vehicle
 */
export interface ReplaceVehicleInput {
  employee_id: string;
  new_vehicle_id: string;
  reason?: string;
  return_odometer?: number;
}

/**
 * Filter options for assignment queries
 */
export interface VehicleAssignmentFilters {
  vehicle_id?: string;
  employee_id?: string;
  status?: VehicleAssignmentStatus;
  handover_type?: HandoverType;
  date_from?: string;
  date_to?: string;
}
