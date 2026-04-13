/**
 * Platform types and interfaces.
 */

export type BillingRateType = 'per_delivery' | 'hourly' | 'fixed';
export type AssignmentStatus = 'active' | 'ended' | 'suspended';

/**
 * Platform entity (clients like Uber Eats).
 */
export interface Platform {
  id: string;
  organization_id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  vat_id: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  is_active: boolean;
  billing_rate_type: BillingRateType | null;
  billing_rate: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Platform assignment (employee → platform).
 */
export interface PlatformAssignment {
  id: string;
  organization_id: string;
  employee_id: string;
  platform_id: string;
  start_date: string;
  end_date: string | null;
  status: AssignmentStatus;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Platform with stats.
 */
export interface PlatformWithStats extends Platform {
  active_employees_count?: number;
  total_deliveries?: number;
}

/**
 * Assignment with related data.
 */
export interface AssignmentWithRelations extends PlatformAssignment {
  employee: {
    id: string;
    full_name: string;
  };
  platform: {
    id: string;
    name: string;
  };
}

/**
 * Input for creating a platform.
 */
export interface CreatePlatformInput {
  name: string;
  contact_email?: string;
  contact_phone?: string;
  billing_rate_type?: BillingRateType;
  billing_rate?: number;
}

/**
 * Input for creating an assignment.
 */
export interface CreateAssignmentInput {
  employee_id: string;
  platform_id: string;
  start_date: string;
  end_date?: string;
  external_id?: string;
}
