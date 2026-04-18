/**
 * Employee types and interfaces.
 */

/** Employee status — their current employment state */
export type EmployeeStatus = 'pending' | 'active' | 'past';

/** Employee role — what they do in the field */
export type EmployeeRole = 'rider' | 'supervisor' | 'manager' | 'hr';

/** Salary payment type */
export type SalaryType = 'hourly' | 'daily' | 'weekly' | 'monthly';

/** Rider category — affects pay structure and deductions */
export type RiderCategory = 'company_vehicle_rider' | 'own_vehicle_rider';

/** Compliance status — auto-calculated based on document expiries */
export type ComplianceStatus = 'compliant' | 'expiring_soon' | 'non_compliant' | 'blocked';

export const RIDER_CATEGORY_LABELS: Record<RiderCategory, string> = {
  company_vehicle_rider: 'Company Vehicle Rider',
  own_vehicle_rider: 'Own Vehicle Rider',
};

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = {
  compliant: 'Compliant',
  expiring_soon: 'Expiring Soon',
  non_compliant: 'Non-Compliant',
  blocked: 'Blocked',
};

/**
 * Employee entity as stored in the database.
 */
export interface Employee {
  id: string;
  organization_id: string;
  employee_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: EmployeeRole;
  status: EmployeeStatus;
  hire_date: string | null;
  termination_date: string | null;
  user_id: string | null;
  // Job details
  job_title: string | null;
  job_description: string | null;
  department: string | null;
  reports_to: string | null;
  // Personal details
  date_of_birth: string | null;
  nationality: string | null;
  cpr_number: string | null;
  passport_number: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  // Emergency contact
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  // Bank details
  bank_name: string | null;
  bank_account_number: string | null;
  iban: string | null;
  // Compensation
  salary: number | null;
  salary_type: SalaryType | null;
  // Rider-specific fields (T-002)
  license_number: string | null;
  license_type: string | null;
  license_expiry: string | null;
  visa_number: string | null;
  visa_type: string | null;
  visa_expiry: string | null;
  rider_category: RiderCategory | null;
  compliance_status: ComplianceStatus;
  // Rider lifecycle
  onboarding_completed_at: string | null;
  activation_date: string | null;
  deactivation_date: string | null;
  // Notes
  notes: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Input for creating a new employee.
 */
export interface CreateEmployeeInput {
  full_name: string;
  employee_id?: string;
  email?: string;
  phone?: string;
  role?: EmployeeRole;
  hire_date?: string;
  // Job details
  job_title?: string;
  job_description?: string;
  department?: string;
  reports_to?: string;
  // Personal details
  date_of_birth?: string;
  nationality?: string;
  cpr_number?: string;
  passport_number?: string;
  address?: string;
  city?: string;
  country?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  bank_name?: string;
  bank_account_number?: string;
  iban?: string;
  salary?: number;
  salary_type?: SalaryType;
  // Rider-specific fields
  license_number?: string;
  license_type?: string;
  license_expiry?: string;
  visa_number?: string;
  visa_type?: string;
  visa_expiry?: string;
  rider_category?: RiderCategory;
  notes?: string;
}

/**
 * Input for updating an existing employee.
 */
export interface UpdateEmployeeInput extends Partial<CreateEmployeeInput> {
  status?: EmployeeStatus;
  termination_date?: string;
}

/**
 * Employee with related counts/data.
 */
export interface EmployeeWithRelations extends Employee {
  assignments_count?: number;
  documents_count?: number;
  assigned_asset?: {
    id: string;
    name: string;
  } | null;
}
