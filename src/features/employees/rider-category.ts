'use client';

/**
 * Rider Category Rules Service (T-020)
 * 
 * Defines rules and calculations based on rider transport model:
 * - company_vehicle_rider: Uses company-owned or rented vehicle
 * - own_vehicle_rider: Uses their own vehicle with allowance
 * 
 * Affects: pay components, deductions, eligibility, compliance requirements
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type RiderCategory = 'company_vehicle_rider' | 'own_vehicle_rider';

export interface RiderCategoryConfig {
  category: RiderCategory;
  label: string;
  description: string;
  
  // Pay components
  hasVehicleAllowance: boolean;
  vehicleAllowanceAmount: number; // Monthly BHD
  hasMaintenanceAllowance: boolean;
  maintenanceAllowanceAmount: number; // Monthly BHD
  hasFuelAllowance: boolean;
  fuelAllowanceAmount: number; // Monthly BHD
  
  // Deductions
  hasVehicleDeduction: boolean;
  vehicleDeductionAmount: number; // Monthly BHD (for company vehicle)
  hasDepositRequired: boolean;
  depositAmount: number; // One-time BHD
  
  // Requirements
  requiresCompanyVehicle: boolean;
  requiresOwnVehicleApproval: boolean;
  requiresVehicleInsurance: boolean;
  requiresDrivingLicense: boolean;
  
  // Liability
  accidentLiabilityShare: number; // 0-100%
  maintenanceResponsibility: 'company' | 'rider' | 'shared';
}

export interface RiderCategoryAssignment {
  employeeId: string;
  category: RiderCategory;
  effectiveFrom: string;
  effectiveTo: string | null;
  vehicleId: string | null;
  allowanceOverride: number | null;
  deductionOverride: number | null;
  notes: string | null;
}

export interface RiderPayComponents {
  basePay: number;
  vehicleAllowance: number;
  maintenanceAllowance: number;
  fuelAllowance: number;
  totalAllowances: number;
  vehicleDeduction: number;
  depositDeduction: number;
  totalDeductions: number;
  netPay: number;
}

// ============================================================================
// CATEGORY CONFIGURATIONS
// ============================================================================

export const RIDER_CATEGORY_CONFIGS: Record<RiderCategory, RiderCategoryConfig> = {
  company_vehicle_rider: {
    category: 'company_vehicle_rider',
    label: 'Company Vehicle Rider',
    description: 'Rider uses company-owned or rented vehicle',
    
    // No allowances - vehicle provided
    hasVehicleAllowance: false,
    vehicleAllowanceAmount: 0,
    hasMaintenanceAllowance: false,
    maintenanceAllowanceAmount: 0,
    hasFuelAllowance: true,
    fuelAllowanceAmount: 50, // BHD/month
    
    // Deductions apply
    hasVehicleDeduction: true,
    vehicleDeductionAmount: 30, // BHD/month vehicle usage fee
    hasDepositRequired: true,
    depositAmount: 100, // BHD one-time deposit
    
    // Requirements
    requiresCompanyVehicle: true,
    requiresOwnVehicleApproval: false,
    requiresVehicleInsurance: false, // Company handles
    requiresDrivingLicense: true,
    
    // Liability
    accidentLiabilityShare: 20, // Rider pays 20% of damage
    maintenanceResponsibility: 'company',
  },
  
  own_vehicle_rider: {
    category: 'own_vehicle_rider',
    label: 'Own Vehicle Rider',
    description: 'Rider uses their own vehicle with allowance',
    
    // Allowances apply
    hasVehicleAllowance: true,
    vehicleAllowanceAmount: 80, // BHD/month
    hasMaintenanceAllowance: true,
    maintenanceAllowanceAmount: 30, // BHD/month
    hasFuelAllowance: true,
    fuelAllowanceAmount: 60, // BHD/month
    
    // No deductions
    hasVehicleDeduction: false,
    vehicleDeductionAmount: 0,
    hasDepositRequired: false,
    depositAmount: 0,
    
    // Requirements
    requiresCompanyVehicle: false,
    requiresOwnVehicleApproval: true,
    requiresVehicleInsurance: true, // Must have own insurance
    requiresDrivingLicense: true,
    
    // Liability
    accidentLiabilityShare: 100, // Rider fully responsible
    maintenanceResponsibility: 'rider',
  },
};

// ============================================================================
// CATEGORY ASSIGNMENT
// ============================================================================

/**
 * Get current category for a rider.
 */
export async function getRiderCategory(employeeId: string): Promise<RiderCategory | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('employees')
    .select('rider_category')
    .eq('id', employeeId)
    .single();
  
  return data?.rider_category as RiderCategory | null;
}

/**
 * Get category configuration for a rider.
 */
export async function getRiderCategoryConfig(employeeId: string): Promise<RiderCategoryConfig | null> {
  const category = await getRiderCategory(employeeId);
  return category ? RIDER_CATEGORY_CONFIGS[category] : null;
}

/**
 * Change rider's category with effective date.
 */
export async function changeRiderCategory(
  employeeId: string,
  newCategory: RiderCategory,
  effectiveDate: string,
  notes?: string,
  changedBy?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Get current category
  const currentCategory = await getRiderCategory(employeeId);
  
  if (currentCategory === newCategory) {
    return { success: false, error: 'Rider already in this category' };
  }
  
  // Validate transition
  const validation = await validateCategoryChange(employeeId, newCategory);
  if (!validation.isValid) {
    return { success: false, error: validation.errors.join(', ') };
  }
  
  // Update employee record
  const { error: updateError } = await supabase
    .from('employees')
    .update({
      rider_category: newCategory,
      category_changed_at: effectiveDate,
    })
    .eq('id', employeeId);
  
  if (updateError) {
    return { success: false, error: updateError.message };
  }
  
  // Log the change in audit trail
  await supabase.from('audit_logs').insert({
    table_name: 'employees',
    record_id: employeeId,
    action: 'category_change',
    old_values: { rider_category: currentCategory },
    new_values: { rider_category: newCategory },
    changed_by: changedBy,
    notes,
  });
  
  return { success: true };
}

/**
 * Validate if a category change is allowed.
 */
export async function validateCategoryChange(
  employeeId: string,
  targetCategory: RiderCategory
): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
  const supabase = createClient();
  const errors: string[] = [];
  const warnings: string[] = [];
  const config = RIDER_CATEGORY_CONFIGS[targetCategory];
  
  // Get employee data
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .single();
  
  if (!employee) {
    return { isValid: false, errors: ['Employee not found'], warnings: [] };
  }
  
  if (targetCategory === 'company_vehicle_rider') {
    // Check if company vehicle is available
    const { data: availableVehicle } = await supabase
      .from('assets')
      .select('id')
      .eq('asset_type', 'vehicle')
      .in('ownership', ['company_owned', 'rental'])
      .eq('vehicle_status', 'available')
      .eq('is_active', true)
      .limit(1)
      .single();
    
    if (!availableVehicle) {
      warnings.push('No company vehicles currently available - assignment will be pending');
    }
    
    // Check deposit
    if (config.hasDepositRequired) {
      const { data: deposit } = await supabase
        .from('deposits')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('deposit_type', 'vehicle')
        .in('status', ['active', 'paid'])
        .single();
      
      if (!deposit) {
        warnings.push(`Vehicle deposit of ${config.depositAmount} BHD will be required`);
      }
    }
  }
  
  if (targetCategory === 'own_vehicle_rider') {
    // Check if rider has approved own vehicle
    const { data: ownVehicle } = await supabase
      .from('assets')
      .select('*')
      .eq('owner_employee_id', employeeId)
      .eq('ownership', 'employee_owned')
      .eq('is_active', true)
      .single();
    
    if (!ownVehicle) {
      errors.push('Rider must register and get approval for their own vehicle first');
    } else {
      // Check vehicle compliance
      if (ownVehicle.compliance_status !== 'compliant') {
        errors.push('Own vehicle must be compliant (registration, insurance valid)');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// PAY CALCULATIONS
// ============================================================================

/**
 * Calculate pay components based on rider category.
 */
export async function calculateRiderPayComponents(
  employeeId: string,
  basePay: number,
  options?: {
    overrideAllowance?: number;
    overrideDeduction?: number;
    prorateDays?: number; // For partial month
    totalDays?: number;
  }
): Promise<RiderPayComponents> {
  const category = await getRiderCategory(employeeId);
  const config = category ? RIDER_CATEGORY_CONFIGS[category] : null;
  
  if (!config) {
    return {
      basePay,
      vehicleAllowance: 0,
      maintenanceAllowance: 0,
      fuelAllowance: 0,
      totalAllowances: 0,
      vehicleDeduction: 0,
      depositDeduction: 0,
      totalDeductions: 0,
      netPay: basePay,
    };
  }
  
  // Calculate proration factor
  const prorateFactor = options?.prorateDays && options?.totalDays
    ? options.prorateDays / options.totalDays
    : 1;
  
  // Allowances
  const vehicleAllowance = config.hasVehicleAllowance
    ? (options?.overrideAllowance ?? config.vehicleAllowanceAmount) * prorateFactor
    : 0;
  const maintenanceAllowance = config.hasMaintenanceAllowance
    ? config.maintenanceAllowanceAmount * prorateFactor
    : 0;
  const fuelAllowance = config.hasFuelAllowance
    ? config.fuelAllowanceAmount * prorateFactor
    : 0;
  const totalAllowances = vehicleAllowance + maintenanceAllowance + fuelAllowance;
  
  // Deductions
  const vehicleDeduction = config.hasVehicleDeduction
    ? (options?.overrideDeduction ?? config.vehicleDeductionAmount) * prorateFactor
    : 0;
  
  // Check for active deposit deduction
  let depositDeduction = 0;
  const supabase = createClient();
  const { data: activeDeposit } = await supabase
    .from('deposits')
    .select('monthly_deduction')
    .eq('employee_id', employeeId)
    .eq('status', 'recovering')
    .single();
  
  if (activeDeposit?.monthly_deduction) {
    depositDeduction = activeDeposit.monthly_deduction * prorateFactor;
  }
  
  const totalDeductions = vehicleDeduction + depositDeduction;
  const netPay = basePay + totalAllowances - totalDeductions;
  
  return {
    basePay,
    vehicleAllowance,
    maintenanceAllowance,
    fuelAllowance,
    totalAllowances,
    vehicleDeduction,
    depositDeduction,
    totalDeductions,
    netPay,
  };
}

// ============================================================================
// REQUIREMENTS CHECK
// ============================================================================

/**
 * Get missing requirements for a rider category.
 */
export async function getMissingCategoryRequirements(
  employeeId: string,
  category?: RiderCategory
): Promise<string[]> {
  const supabase = createClient();
  const missing: string[] = [];
  
  // Use provided category or get current
  const targetCategory = category || await getRiderCategory(employeeId);
  if (!targetCategory) {
    return ['Rider category not assigned'];
  }
  
  const config = RIDER_CATEGORY_CONFIGS[targetCategory];
  
  // Get employee data
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .single();
  
  if (!employee) {
    return ['Employee not found'];
  }
  
  // Check driving license
  if (config.requiresDrivingLicense) {
    if (!employee.license_expiry) {
      missing.push('Driving license not uploaded');
    } else if (new Date(employee.license_expiry) < new Date()) {
      missing.push('Driving license expired');
    }
  }
  
  // Check company vehicle assignment
  if (config.requiresCompanyVehicle) {
    const { data: assignment } = await supabase
      .from('rider_vehicle_assignments')
      .select('id')
      .eq('employee_id', employeeId)
      .is('end_date', null)
      .single();
    
    if (!assignment) {
      missing.push('No company vehicle assigned');
    }
  }
  
  // Check own vehicle approval
  if (config.requiresOwnVehicleApproval) {
    const { data: ownVehicle } = await supabase
      .from('assets')
      .select('compliance_status')
      .eq('owner_employee_id', employeeId)
      .eq('ownership', 'employee_owned')
      .eq('is_active', true)
      .single();
    
    if (!ownVehicle) {
      missing.push('Own vehicle not registered');
    } else if (ownVehicle.compliance_status !== 'compliant') {
      missing.push('Own vehicle not approved/compliant');
    }
  }
  
  // Check vehicle insurance (for own vehicle riders)
  if (config.requiresVehicleInsurance) {
    const { data: insurance } = await supabase
      .from('employee_documents')
      .select('expires_at')
      .eq('employee_id', employeeId)
      .eq('document_type', 'vehicle_insurance')
      .eq('status', 'approved')
      .single();
    
    if (!insurance) {
      missing.push('Vehicle insurance not uploaded');
    } else if (new Date(insurance.expires_at) < new Date()) {
      missing.push('Vehicle insurance expired');
    }
  }
  
  // Check deposit (for company vehicle riders)
  if (config.hasDepositRequired) {
    const { data: deposit } = await supabase
      .from('deposits')
      .select('status')
      .eq('employee_id', employeeId)
      .eq('deposit_type', 'vehicle')
      .single();
    
    if (!deposit || (deposit.status !== 'active' && deposit.status !== 'paid')) {
      missing.push(`Vehicle deposit (${config.depositAmount} BHD) not paid`);
    }
  }
  
  return missing;
}

// ============================================================================
// CATEGORY SUMMARY
// ============================================================================

export interface CategorySummary {
  category: RiderCategory;
  count: number;
  activeCount: number;
  eligibleCount: number;
  blockedCount: number;
  totalAllowances: number;
  totalDeductions: number;
}

/**
 * Get summary of riders by category.
 */
export async function getCategorySummary(): Promise<CategorySummary[]> {
  const supabase = createClient();
  
  const categories: RiderCategory[] = ['company_vehicle_rider', 'own_vehicle_rider'];
  const summaries: CategorySummary[] = [];
  
  for (const category of categories) {
    const config = RIDER_CATEGORY_CONFIGS[category];
    
    // Get counts
    const { data: employees } = await supabase
      .from('employees')
      .select('id, status')
      .eq('rider_category', category)
      .eq('role', 'rider');
    
    const count = employees?.length || 0;
    const activeCount = employees?.filter(e => e.status === 'active').length || 0;
    
    // Count eligible (no missing requirements)
    let eligibleCount = 0;
    for (const emp of employees || []) {
      const missing = await getMissingCategoryRequirements(emp.id, category);
      if (missing.length === 0) eligibleCount++;
    }
    
    summaries.push({
      category,
      count,
      activeCount,
      eligibleCount,
      blockedCount: activeCount - eligibleCount,
      totalAllowances: config.vehicleAllowanceAmount + config.maintenanceAllowanceAmount + config.fuelAllowanceAmount,
      totalDeductions: config.vehicleDeductionAmount,
    });
  }
  
  return summaries;
}
