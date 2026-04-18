/**
 * Deposits and deductions types (T-023).
 * Tracks employee deposits and recovery agreements.
 */

/** Deposit status */
export type DepositStatus =
  | 'pending'
  | 'received'
  | 'partially_refunded'
  | 'fully_refunded'
  | 'forfeited';

export const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  pending: 'Pending',
  received: 'Received',
  partially_refunded: 'Partially Refunded',
  fully_refunded: 'Fully Refunded',
  forfeited: 'Forfeited',
};

/** Deduction type */
export type DeductionType =
  | 'vehicle_deposit'
  | 'uniform_deposit'
  | 'equipment_deposit'
  | 'advance_salary'
  | 'damage_recovery'
  | 'fine'
  | 'loan'
  | 'other';

export const DEDUCTION_TYPE_LABELS: Record<DeductionType, string> = {
  vehicle_deposit: 'Vehicle Deposit',
  uniform_deposit: 'Uniform Deposit',
  equipment_deposit: 'Equipment Deposit',
  advance_salary: 'Advance Salary',
  damage_recovery: 'Damage Recovery',
  fine: 'Fine',
  loan: 'Loan',
  other: 'Other',
};

/** Recovery method */
export type RecoveryMethod =
  | 'lump_sum'
  | 'fixed_installment'
  | 'percentage_of_pay'
  | 'per_day_worked';

export const RECOVERY_METHOD_LABELS: Record<RecoveryMethod, string> = {
  lump_sum: 'Lump Sum',
  fixed_installment: 'Fixed Installment',
  percentage_of_pay: '% of Pay',
  per_day_worked: 'Per Day Worked',
};

/**
 * Employee deposit entity.
 */
export interface EmployeeDeposit {
  id: string;
  organization_id: string;
  employee_id: string;
  deposit_type: DeductionType;
  description: string | null;
  
  // Amount
  amount: number;
  currency: string;
  received_date: string | null;
  received_by: string | null;
  payment_method: string | null;
  receipt_number: string | null;
  
  // Status
  status: DepositStatus;
  
  // Refund
  refund_amount: number;
  refund_date: string | null;
  refund_reason: string | null;
  refund_processed_by: string | null;
  
  // Related
  asset_id: string | null;
  notes: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Deduction agreement entity.
 */
export interface DeductionAgreement {
  id: string;
  organization_id: string;
  employee_id: string;
  deduction_type: DeductionType;
  description: string;
  
  // Amount
  original_amount: number;
  currency: string;
  
  // Recovery schedule
  recovery_method: RecoveryMethod;
  installment_amount: number | null;
  percentage_rate: number | null;
  per_day_rate: number | null;
  
  // Schedule
  start_date: string;
  expected_end_date: string | null;
  max_recovery_per_period: number | null;
  
  // Progress
  total_recovered: number;
  remaining_balance: number;
  is_complete: boolean;
  completed_at: string | null;
  
  // Related
  incident_id: string | null;
  asset_id: string | null;
  
  // Approval
  approved_by: string | null;
  approved_at: string | null;
  employee_acknowledged: boolean;
  acknowledged_at: string | null;
  
  // Status
  is_active: boolean;
  paused_at: string | null;
  pause_reason: string | null;
  notes: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Deduction transaction entity.
 */
export interface DeductionTransaction {
  id: string;
  organization_id: string;
  deduction_agreement_id: string;
  amount: number;
  payroll_id: string | null;
  deducted_from: string;
  transaction_date: string;
  created_at: string;
}

/**
 * Employee financial summary (from get_employee_financial_summary function).
 */
export interface EmployeeFinancialSummary {
  employee_id: string;
  total_deposits: number;
  refundable_deposits: number;
  active_deductions: {
    id: string;
    type: DeductionType;
    description: string;
    original_amount: number;
    recovered: number;
    remaining: number;
    recovery_method: RecoveryMethod;
    installment_amount: number | null;
  }[] | null;
  total_outstanding: number;
}

/**
 * Period deduction calculation result.
 */
export interface PeriodDeduction {
  agreement_id: string;
  deduction_type: DeductionType;
  description: string;
  amount: number;
}

/**
 * Input for creating a deposit.
 */
export interface CreateDepositInput {
  employee_id: string;
  deposit_type: DeductionType;
  amount: number;
  description?: string;
  received_date?: string;
  payment_method?: string;
  receipt_number?: string;
  asset_id?: string;
  notes?: string;
}

/**
 * Input for creating a deduction agreement.
 */
export interface CreateDeductionAgreementInput {
  employee_id: string;
  deduction_type: DeductionType;
  description: string;
  original_amount: number;
  recovery_method: RecoveryMethod;
  installment_amount?: number;
  percentage_rate?: number;
  per_day_rate?: number;
  start_date: string;
  expected_end_date?: string;
  max_recovery_per_period?: number;
  incident_id?: string;
  asset_id?: string;
  notes?: string;
}
