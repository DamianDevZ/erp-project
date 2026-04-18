/**
 * Payroll types and interfaces.
 * Pay periods and calculations for riders.
 */

export type PayrollStatus = 'draft' | 'calculated' | 'approved' | 'processing' | 'paid' | 'cancelled';

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: 'Draft',
  calculated: 'Calculated',
  approved: 'Approved',
  processing: 'Processing',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

/**
 * Payroll entity.
 */
export interface Payroll {
  id: string;
  organization_id: string;
  // Period
  payroll_number: string | null;
  period_start: string;
  period_end: string;
  payment_date: string | null;
  // Employee
  employee_id: string;
  rider_category: 'company_vehicle_rider' | 'own_vehicle_rider' | null;
  // Earnings
  base_salary: number;
  orders_count: number;
  order_earnings: number;
  hours_worked: number;
  hourly_earnings: number;
  incentives: number;
  tips: number;
  overtime_hours: number;
  overtime_pay: number;
  // Allowances
  vehicle_allowance: number;
  phone_allowance: number;
  fuel_allowance: number;
  other_allowances: number;
  allowances_notes: string | null;
  // Gross
  gross_pay: number;
  // Deductions
  vehicle_deduction: number;
  uniform_deduction: number;
  equipment_deduction: number;
  damage_deduction: number;
  advance_recovery: number;
  absence_deduction: number;
  other_deductions: number;
  deductions_notes: string | null;
  total_deductions: number;
  // Net
  net_pay: number;
  // Status
  status: PayrollStatus;
  // Approval
  calculated_at: string | null;
  calculated_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  paid_at: string | null;
  // Payment
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Payroll with related data.
 */
export interface PayrollWithRelations extends Payroll {
  employee: {
    id: string;
    full_name: string;
    employee_id: string | null;
  };
  approver?: {
    id: string;
    full_name: string;
  } | null;
}

/**
 * Input for creating a payroll record.
 */
export interface CreatePayrollInput {
  employee_id: string;
  period_start: string;
  period_end: string;
  payment_date?: string;
  rider_category?: 'company_vehicle_rider' | 'own_vehicle_rider';
  base_salary?: number;
  notes?: string;
}

/**
 * Payroll calculation input.
 */
export interface CalculatePayrollInput {
  employee_id: string;
  period_start: string;
  period_end: string;
}

/**
 * Payroll summary for dashboards.
 */
export interface PayrollSummary {
  period_start: string;
  period_end: string;
  total_employees: number;
  total_gross_pay: number;
  total_deductions: number;
  total_net_pay: number;
  total_orders: number;
  avg_pay_per_employee: number;
  status_breakdown: Record<PayrollStatus, number>;
}

/**
 * Payroll by rider category summary.
 */
export interface PayrollByCategory {
  rider_category: 'company_vehicle_rider' | 'own_vehicle_rider';
  employee_count: number;
  total_gross_pay: number;
  total_allowances: number;
  total_deductions: number;
  total_net_pay: number;
  avg_net_pay: number;
}

// ============================================
// T-053 to T-058: Enhanced Payroll System
// ============================================

export type PayrollComponentType = 
  | 'base_salary'
  | 'order_earnings'
  | 'hourly_earnings'
  | 'overtime'
  | 'incentive'
  | 'tip'
  | 'allowance'
  | 'bonus'
  | 'deduction'
  | 'reimbursement';

export type DeductionSource = 
  | 'vehicle_rental'
  | 'vehicle_damage'
  | 'uniform'
  | 'equipment'
  | 'advance_recovery'
  | 'absence'
  | 'penalty'
  | 'incident'
  | 'loan'
  | 'tax'
  | 'insurance'
  | 'other';

export type WpsFileStatus = 
  | 'pending'
  | 'generated'
  | 'submitted'
  | 'processed'
  | 'failed'
  | 'rejected';

export type PayrollBatchStatus = 
  | 'draft'
  | 'calculating'
  | 'calculated'
  | 'approved'
  | 'processing'
  | 'paid'
  | 'cancelled';

export type PayrollDeductionStatus = 
  | 'pending'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'paused';

export const PAYROLL_COMPONENT_TYPE_LABELS: Record<PayrollComponentType, string> = {
  base_salary: 'Base Salary',
  order_earnings: 'Order Earnings',
  hourly_earnings: 'Hourly Earnings',
  overtime: 'Overtime',
  incentive: 'Incentive',
  tip: 'Tip',
  allowance: 'Allowance',
  bonus: 'Bonus',
  deduction: 'Deduction',
  reimbursement: 'Reimbursement',
};

export const DEDUCTION_SOURCE_LABELS: Record<DeductionSource, string> = {
  vehicle_rental: 'Vehicle Rental',
  vehicle_damage: 'Vehicle Damage',
  uniform: 'Uniform',
  equipment: 'Equipment',
  advance_recovery: 'Advance Recovery',
  absence: 'Absence',
  penalty: 'Penalty',
  incident: 'Incident',
  loan: 'Loan',
  tax: 'Tax',
  insurance: 'Insurance',
  other: 'Other',
};

export const WPS_FILE_STATUS_LABELS: Record<WpsFileStatus, string> = {
  pending: 'Pending',
  generated: 'Generated',
  submitted: 'Submitted',
  processed: 'Processed',
  failed: 'Failed',
  rejected: 'Rejected',
};

export const PAYROLL_BATCH_STATUS_LABELS: Record<PayrollBatchStatus, string> = {
  draft: 'Draft',
  calculating: 'Calculating',
  calculated: 'Calculated',
  approved: 'Approved',
  processing: 'Processing',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

/**
 * Payroll component configuration.
 */
export interface PayrollComponent {
  id: string;
  organization_id: string;
  component_name: string;
  component_type: PayrollComponentType;
  
  // Calculation rules
  is_taxable: boolean;
  is_fixed: boolean;
  fixed_amount: number | null;
  percentage_of_base: number | null;
  per_unit_rate: number | null;
  unit_type: string | null;
  
  // Applicability
  applies_to_categories: string[] | null;
  min_threshold: number | null;
  max_cap: number | null;
  
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Payroll batch for bulk processing.
 */
export interface PayrollBatch {
  id: string;
  organization_id: string;
  batch_number: string;
  
  period_start: string;
  period_end: string;
  payment_date: string | null;
  
  department: string | null;
  rider_category: string | null;
  
  total_employees: number;
  total_gross_pay: number;
  total_deductions: number;
  total_net_pay: number;
  
  status: PayrollBatchStatus;
  calculation_started_at: string | null;
  calculation_completed_at: string | null;
  calculation_errors: string | null;
  
  // Approval
  requires_approval: boolean;
  approval_threshold: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  
  // WPS
  wps_file_generated: boolean;
  wps_file_path: string | null;
  wps_generated_at: string | null;
  
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Payroll batch from view with related data.
 */
export interface PayrollBatchView extends PayrollBatch {
  created_by_name: string | null;
  calc_seconds: number | null;
}

/**
 * Payroll line item for detailed breakdown.
 */
export interface PayrollLineItem {
  id: string;
  organization_id: string;
  payroll_id: string;
  
  component_id: string | null;
  component_type: PayrollComponentType;
  description: string;
  
  quantity: number;
  unit_rate: number | null;
  amount: number;
  is_taxable: boolean;
  
  source_type: string | null;
  source_id: string | null;
  
  created_at: string;
}

/**
 * Payroll deduction schedule.
 */
export interface PayrollDeduction {
  id: string;
  organization_id: string;
  employee_id: string;
  
  deduction_source: DeductionSource;
  description: string;
  total_amount: number;
  
  installments: number;
  amount_per_installment: number | null;
  installments_remaining: number | null;
  amount_remaining: number | null;
  
  start_date: string;
  end_date: string | null;
  
  source_type: string | null;
  source_id: string | null;
  
  status: PayrollDeductionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Deduction recovery record.
 */
export interface PayrollDeductionRecord {
  id: string;
  organization_id: string;
  deduction_id: string;
  payroll_id: string;
  
  installment_number: number;
  amount_deducted: number;
  deducted_at: string;
}

/**
 * WPS file record.
 */
export interface WpsFile {
  id: string;
  organization_id: string;
  batch_id: string | null;
  
  file_name: string;
  file_path: string | null;
  file_format: string;
  
  mol_id: string | null;
  bank_code: string | null;
  routing_code: string | null;
  
  total_records: number;
  total_amount: number;
  
  status: WpsFileStatus;
  generated_at: string | null;
  submitted_at: string | null;
  processed_at: string | null;
  
  error_message: string | null;
  rejection_reason: string | null;
  
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Enhanced payroll with batch reference.
 */
export interface EnhancedPayroll extends Payroll {
  batch_id: string | null;
  wps_included: boolean;
  wps_reference: string | null;
}

/**
 * Employee payroll summary from view.
 */
export interface EmployeePayrollSummary {
  id: string;
  organization_id: string;
  payroll_number: string | null;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  rider_category: string | null;
  period_start: string;
  period_end: string;
  base_salary: number;
  orders_count: number;
  order_earnings: number;
  hours_worked: number;
  hourly_earnings: number;
  overtime_hours: number;
  overtime_pay: number;
  incentives: number;
  tips: number;
  total_allowances: number;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  status: PayrollStatus;
  batch_id: string | null;
  batch_number: string | null;
  wps_included: boolean;
  approved_at: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
}

/**
 * Active deduction from view.
 */
export interface ActiveEmployeeDeduction {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  deduction_source: DeductionSource;
  description: string;
  total_amount: number;
  installments: number;
  amount_per_installment: number | null;
  installments_remaining: number | null;
  amount_remaining: number | null;
  start_date: string;
  end_date: string | null;
  source_type: string | null;
  source_id: string | null;
  status: PayrollDeductionStatus;
  amount_deducted_so_far: number | null;
}

/**
 * Payroll metrics from view.
 */
export interface PayrollMetrics {
  organization_id: string;
  payroll_month: string;
  payroll_count: number;
  employees_paid: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  avg_net_pay: number;
  total_orders: number;
  total_hours: number;
}

/**
 * Input for running payroll batch.
 */
export interface RunPayrollBatchInput {
  period_start: string;
  period_end: string;
}

/**
 * Input for generating WPS file.
 */
export interface GenerateWpsFileInput {
  batch_id: string;
  mol_id: string;
  bank_code: string;
}

/**
 * Input for creating payroll component.
 */
export interface CreatePayrollComponentInput {
  component_name: string;
  component_type: PayrollComponentType;
  is_taxable?: boolean;
  is_fixed?: boolean;
  fixed_amount?: number;
  percentage_of_base?: number;
  per_unit_rate?: number;
  unit_type?: string;
  applies_to_categories?: string[];
  min_threshold?: number;
  max_cap?: number;
  frequency?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
}

/**
 * Input for creating payroll deduction.
 */
export interface CreatePayrollDeductionInput {
  employee_id: string;
  deduction_source: DeductionSource;
  description: string;
  total_amount: number;
  installments?: number;
  start_date: string;
  end_date?: string;
  source_type?: string;
  source_id?: string;
  notes?: string;
}

/**
 * Payroll dashboard data.
 */
export interface PayrollDashboardData {
  current_batch: PayrollBatch | null;
  recent_batches: PayrollBatchView[];
  metrics: PayrollMetrics | null;
  pending_deductions_count: number;
  pending_wps_count: number;
}
