/**
 * Rider Eligibility Types
 * T-034: Rider eligibility check before shift activation
 */

// Eligibility status enum matching database
export type EligibilityStatus = 'eligible' | 'ineligible' | 'conditional';

// Document status for licenses and visas
export type DocumentStatus = 'valid' | 'expiring_soon' | 'expired' | 'missing' | 'not_required';

// Rider eligibility labels
export const eligibilityStatusLabels: Record<EligibilityStatus, string> = {
  eligible: 'Eligible',
  ineligible: 'Not Eligible',
  conditional: 'Eligible with Warnings'
};

export const documentStatusLabels: Record<DocumentStatus, string> = {
  valid: 'Valid',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  missing: 'Missing',
  not_required: 'Not Required'
};

/**
 * Rider eligibility view row
 * Maps to rider_eligibility view in database
 */
export interface RiderEligibility {
  employee_id: string;
  organization_id: string;
  full_name: string;
  employee_code: string | null;
  employment_status: string;
  compliance_status: string | null;
  rider_category: string | null;
  onboarding_step: string | null;
  is_onboarding: boolean;

  // License info
  has_license: boolean;
  license_expiry: string | null;
  license_valid: boolean | null;
  license_status: DocumentStatus;

  // Visa info
  visa_expiry: string | null;
  visa_valid: boolean;
  visa_status: DocumentStatus;

  // Vehicle info
  assigned_vehicle_id: string | null;
  assigned_vehicle_plate: string | null;
  vehicle_compliance_status: string | null;
  has_vehicle: boolean;
  vehicle_requirement_met: boolean;

  // Eligibility result
  eligibility_status: EligibilityStatus;
  ineligibility_reasons: string[];
  warning_reasons: string[];
}

/**
 * Result from check_rider_eligibility function
 */
export interface EligibilityCheckResult {
  is_eligible: boolean;
  eligibility_status: EligibilityStatus;
  ineligibility_reasons: string[];
  warning_reasons: string[];
}

/**
 * Result from validate_shift_assignment function
 */
export interface ShiftAssignmentValidation {
  can_assign: boolean;
  validation_status: EligibilityStatus;
  validation_errors: string[];
  validation_warnings: string[];
}

/**
 * Eligible riders summary by organization
 * Maps to eligible_riders_summary view
 */
export interface EligibleRidersSummary {
  organization_id: string;
  fully_eligible: number;
  conditionally_eligible: number;
  ineligible: number;
  total_riders: number;
}

/**
 * Common ineligibility reasons
 */
export const IneligibilityReasons = {
  EMPLOYEE_NOT_ACTIVE: 'Employee not active',
  EMPLOYEE_BLOCKED: 'Employee blocked',
  STILL_ONBOARDING: 'Still onboarding',
  LICENSE_EXPIRED: 'License expired',
  VISA_EXPIRED: 'Visa expired',
  NO_VEHICLE_ASSIGNED: 'No vehicle assigned',
  VEHICLE_BLOCKED: 'Vehicle blocked/non-compliant',
  VEHICLE_NOT_FOUND: 'Vehicle not found',
  VEHICLE_NOT_ACTIVE: 'Vehicle is not active',
  RIDER_NOT_FOUND: 'Rider not found'
} as const;

/**
 * Common warning reasons
 */
export const WarningReasons = {
  LICENSE_EXPIRING: 'License expiring in 30 days',
  VISA_EXPIRING: 'Visa expiring in 30 days',
  DOCS_EXPIRING: 'Documents expiring soon',
  MISSING_DOCS: 'Missing required documents',
  VEHICLE_COMPLIANCE: 'Vehicle compliance issues'
} as const;

/**
 * Eligibility filter options for UI
 */
export interface EligibilityFilters {
  eligibility_status?: EligibilityStatus;
  has_vehicle?: boolean;
  license_status?: DocumentStatus;
  visa_status?: DocumentStatus;
  rider_category?: string;
}
