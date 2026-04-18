/**
 * Rider Platform Allocation Types
 * T-035: Rider allocation rules by aggregator
 */

import type { EligibilityStatus } from '@/features/eligibility';

// Allocation status enum matching database
export type RiderPlatformAllocationStatus = 
  | 'pending'
  | 'active'
  | 'suspended'
  | 'revoked'
  | 'expired';

// Allocation type enum
export type RiderAllocationType = 'primary' | 'secondary' | 'backup';

// Labels
export const allocationStatusLabels: Record<RiderPlatformAllocationStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  suspended: 'Suspended',
  revoked: 'Revoked',
  expired: 'Expired'
};

export const allocationTypeLabels: Record<RiderAllocationType, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  backup: 'Backup'
};

/**
 * Rider platform allocation record
 */
export interface RiderPlatformAllocation {
  id: string;
  organization_id: string;
  employee_id: string;
  platform_id: string;
  allocation_type: RiderAllocationType;
  status: RiderPlatformAllocationStatus;

  // Requirements tracking
  platform_account_id: string | null;
  uniform_issued: boolean;
  bag_issued: boolean;
  app_installed: boolean;
  training_completed: boolean;

  // Allocation period
  effective_from: string;
  effective_until: string | null;

  // Suspension/revocation details
  suspended_at: string | null;
  suspended_reason: string | null;
  suspended_by: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  revoked_by: string | null;

  // Metadata
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Allocation with full details from rider_platform_allocation_details view
 */
export interface RiderPlatformAllocationDetails extends RiderPlatformAllocation {
  rider_name: string;
  rider_code: string | null;
  platform_name: string;

  // Platform requirements
  requires_uniform: boolean;
  requires_bag: boolean;
  requires_phone_app: boolean;

  // Computed
  requirements_met: boolean;
  missing_requirements: string[];
}

/**
 * Available rider for a platform from platform_available_riders view
 */
export interface PlatformAvailableRider {
  organization_id: string;
  platform_id: string;
  platform_name: string;
  employee_id: string;
  rider_name: string;
  employee_code: string | null;
  allocation_type: RiderAllocationType;
  platform_account_id: string | null;
  eligibility_status: EligibilityStatus;
  assigned_vehicle_id: string | null;
  assigned_vehicle_plate: string | null;
}

/**
 * Platform allocation summary from platform_allocation_summary view
 */
export interface PlatformAllocationSummary {
  organization_id: string;
  platform_id: string;
  platform_name: string;
  active_allocations: number;
  pending_allocations: number;
  suspended_allocations: number;
  total_allocations: number;
  available_riders: number;
}

/**
 * Result from can_rider_work_platform function
 */
export interface RiderPlatformWorkCheck {
  can_work: boolean;
  allocation_status: RiderPlatformAllocationStatus;
  eligibility_status: EligibilityStatus;
  missing_requirements: string[];
}

/**
 * Input for creating a new allocation
 */
export interface CreateRiderPlatformAllocationInput {
  employee_id: string;
  platform_id: string;
  allocation_type?: RiderAllocationType;
  platform_account_id?: string;
  uniform_issued?: boolean;
  bag_issued?: boolean;
  app_installed?: boolean;
  training_completed?: boolean;
  effective_from?: string;
  effective_until?: string;
  notes?: string;
}

/**
 * Input for updating an allocation
 */
export interface UpdateRiderPlatformAllocationInput {
  allocation_type?: RiderAllocationType;
  status?: RiderPlatformAllocationStatus;
  platform_account_id?: string;
  uniform_issued?: boolean;
  bag_issued?: boolean;
  app_installed?: boolean;
  training_completed?: boolean;
  effective_until?: string;
  notes?: string;
}

/**
 * Input for suspending an allocation
 */
export interface SuspendAllocationInput {
  reason: string;
}

/**
 * Input for revoking an allocation
 */
export interface RevokeAllocationInput {
  reason: string;
}

/**
 * Filter options for allocation queries
 */
export interface AllocationFilters {
  platform_id?: string;
  employee_id?: string;
  status?: RiderPlatformAllocationStatus;
  allocation_type?: RiderAllocationType;
  effective_date?: string;
}
