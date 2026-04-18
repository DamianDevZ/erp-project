/**
 * Rider category rules types (T-020).
 * Configuration for pay structure and deductions by rider category.
 */

import type { RiderCategory } from '../employees/types';

/** Allowance/deduction calculation period */
export type RatePeriod = 'daily' | 'weekly' | 'monthly' | 'per_order' | 'per_km';

/**
 * Rider category rules as stored in the database.
 */
export interface RiderCategoryRule {
  id: string;
  organization_id: string;
  category: RiderCategory;
  
  // Pay structure
  base_salary_enabled: boolean;
  base_salary_amount: number;
  per_order_rate: number;
  per_km_rate: number;
  hourly_rate: number;
  
  // Allowances (for own_vehicle_rider)
  vehicle_allowance_enabled: boolean;
  vehicle_allowance_type: RatePeriod | null;
  vehicle_allowance_amount: number;
  fuel_allowance_enabled: boolean;
  fuel_allowance_type: RatePeriod | null;
  fuel_allowance_amount: number;
  maintenance_allowance_enabled: boolean;
  maintenance_allowance_amount: number;
  
  // Deductions (for company_vehicle_rider)
  vehicle_deduction_enabled: boolean;
  vehicle_deduction_type: RatePeriod | null;
  vehicle_deduction_amount: number;
  damage_deduction_cap: number | null;
  
  // Incentive sharing
  platform_incentive_share: number;
  tip_share: number;
  
  // Requirements
  requires_own_vehicle: boolean;
  requires_company_vehicle: boolean;
  requires_uniform: boolean;
  requires_bag: boolean;
  
  // Deposit requirements
  deposit_required: boolean;
  deposit_amount: number;
  deposit_refundable: boolean;
  
  // Status
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Default rules for each rider category.
 */
export const DEFAULT_CATEGORY_RULES: Record<RiderCategory, Partial<RiderCategoryRule>> = {
  company_vehicle_rider: {
    requires_company_vehicle: true,
    requires_own_vehicle: false,
    vehicle_deduction_enabled: true,
    vehicle_deduction_type: 'daily',
    vehicle_allowance_enabled: false,
    fuel_allowance_enabled: false,
    requires_uniform: true,
    requires_bag: true,
    deposit_required: true,
  },
  own_vehicle_rider: {
    requires_company_vehicle: false,
    requires_own_vehicle: true,
    vehicle_deduction_enabled: false,
    vehicle_allowance_enabled: true,
    vehicle_allowance_type: 'daily',
    fuel_allowance_enabled: true,
    fuel_allowance_type: 'per_km',
    requires_uniform: true,
    requires_bag: true,
    deposit_required: false,
  },
};

/**
 * Earnings calculation result from the database function.
 */
export interface RiderEarningsCalculation {
  employee_id: string;
  rider_category: RiderCategory;
  period_start: string;
  period_end: string;
  working_days: number;
  orders_count: number;
  total_km: number;
  // Earnings
  base_salary: number;
  order_earnings: number;
  per_order_bonus: number;
  km_bonus: number;
  incentives: number;
  tips: number;
  // Allowances
  vehicle_allowance: number;
  fuel_allowance: number;
  // Deductions
  vehicle_deduction: number;
  // Error if any
  error?: string;
}

/**
 * Input for creating/updating category rules.
 */
export interface CreateRiderCategoryRuleInput {
  category: RiderCategory;
  base_salary_enabled?: boolean;
  base_salary_amount?: number;
  per_order_rate?: number;
  per_km_rate?: number;
  hourly_rate?: number;
  vehicle_allowance_enabled?: boolean;
  vehicle_allowance_type?: RatePeriod;
  vehicle_allowance_amount?: number;
  fuel_allowance_enabled?: boolean;
  fuel_allowance_type?: RatePeriod;
  fuel_allowance_amount?: number;
  maintenance_allowance_enabled?: boolean;
  maintenance_allowance_amount?: number;
  vehicle_deduction_enabled?: boolean;
  vehicle_deduction_type?: RatePeriod;
  vehicle_deduction_amount?: number;
  damage_deduction_cap?: number;
  platform_incentive_share?: number;
  tip_share?: number;
  requires_own_vehicle?: boolean;
  requires_company_vehicle?: boolean;
  requires_uniform?: boolean;
  requires_bag?: boolean;
  deposit_required?: boolean;
  deposit_amount?: number;
  deposit_refundable?: boolean;
  effective_from?: string;
  effective_to?: string;
}
