'use client';

/**
 * Deposits & Deductions Service (T-023)
 * 
 * Manages employee deposits (vehicle, uniform, equipment) and
 * scheduled deductions/recoveries from payroll.
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type DepositType = 'vehicle' | 'uniform' | 'equipment' | 'tools' | 'other';
export type DepositStatus = 'pending' | 'paid' | 'active' | 'recovering' | 'refunded' | 'forfeited';
export type DeductionType = 'deposit_recovery' | 'damage' | 'loan' | 'advance' | 'penalty' | 'other';
export type DeductionStatus = 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
export type RecoveryFrequency = 'one_time' | 'weekly' | 'bi_weekly' | 'monthly';

export interface Deposit {
  id: string;
  employeeId: string;
  depositType: DepositType;
  amount: number;
  paidAmount: number;
  status: DepositStatus;
  description: string | null;
  assetId: string | null;
  paidDate: string | null;
  refundedDate: string | null;
  refundedAmount: number | null;
  forfeitReason: string | null;
  createdAt: string;
}

export interface Deduction {
  id: string;
  employeeId: string;
  deductionType: DeductionType;
  description: string;
  totalAmount: number;
  remainingAmount: number;
  installmentAmount: number;
  frequency: RecoveryFrequency;
  status: DeductionStatus;
  startDate: string;
  endDate: string | null;
  depositId: string | null;
  incidentId: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface DeductionScheduleItem {
  payPeriod: string;
  amount: number;
  status: 'pending' | 'deducted' | 'skipped';
  deductedAt: string | null;
  payrollId: string | null;
}

// ============================================================================
// DEPOSIT LABELS
// ============================================================================

export const DEPOSIT_TYPE_LABELS: Record<DepositType, string> = {
  vehicle: 'Vehicle Deposit',
  uniform: 'Uniform Deposit',
  equipment: 'Equipment Deposit',
  tools: 'Tools Deposit',
  other: 'Other Deposit',
};

export const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  pending: 'Pending Payment',
  paid: 'Paid',
  active: 'Active',
  recovering: 'Recovery in Progress',
  refunded: 'Refunded',
  forfeited: 'Forfeited',
};

export const DEDUCTION_TYPE_LABELS: Record<DeductionType, string> = {
  deposit_recovery: 'Deposit Recovery',
  damage: 'Damage Recovery',
  loan: 'Loan Repayment',
  advance: 'Salary Advance',
  penalty: 'Penalty',
  other: 'Other Deduction',
};

// ============================================================================
// DEPOSIT MANAGEMENT
// ============================================================================

/**
 * Create a new deposit requirement for an employee.
 */
export async function createDeposit(input: {
  employeeId: string;
  depositType: DepositType;
  amount: number;
  description?: string;
  assetId?: string;
  createdBy?: string;
}): Promise<{ success: boolean; depositId?: string; error?: string }> {
  const supabase = createClient();
  
  // Check for existing active deposit of same type
  const { data: existing } = await supabase
    .from('deposits')
    .select('id')
    .eq('employee_id', input.employeeId)
    .eq('deposit_type', input.depositType)
    .in('status', ['pending', 'paid', 'active'])
    .single();
  
  if (existing) {
    return { success: false, error: `Active ${input.depositType} deposit already exists` };
  }
  
  const { data, error } = await supabase
    .from('deposits')
    .insert({
      employee_id: input.employeeId,
      deposit_type: input.depositType,
      amount: input.amount,
      paid_amount: 0,
      status: 'pending',
      description: input.description,
      asset_id: input.assetId,
      created_by: input.createdBy,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, depositId: data.id };
}

/**
 * Record deposit payment (full or partial).
 */
export async function recordDepositPayment(
  depositId: string,
  paymentAmount: number,
  paymentMethod: string,
  paymentReference?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Get current deposit
  const { data: deposit } = await supabase
    .from('deposits')
    .select('*')
    .eq('id', depositId)
    .single();
  
  if (!deposit) {
    return { success: false, error: 'Deposit not found' };
  }
  
  if (deposit.status === 'refunded' || deposit.status === 'forfeited') {
    return { success: false, error: `Cannot pay ${deposit.status} deposit` };
  }
  
  const newPaidAmount = deposit.paid_amount + paymentAmount;
  const newStatus = newPaidAmount >= deposit.amount ? 'active' : 'pending';
  
  const { error } = await supabase
    .from('deposits')
    .update({
      paid_amount: newPaidAmount,
      status: newStatus,
      paid_date: newStatus === 'active' ? new Date().toISOString() : deposit.paid_date,
      payment_method: paymentMethod,
      payment_reference: paymentReference,
    })
    .eq('id', depositId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Refund a deposit (on offboarding or asset return).
 */
export async function refundDeposit(
  depositId: string,
  refundAmount: number,
  reason: string,
  processedBy?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: deposit } = await supabase
    .from('deposits')
    .select('*')
    .eq('id', depositId)
    .single();
  
  if (!deposit) {
    return { success: false, error: 'Deposit not found' };
  }
  
  if (deposit.status !== 'active' && deposit.status !== 'paid') {
    return { success: false, error: 'Only active deposits can be refunded' };
  }
  
  if (refundAmount > deposit.paid_amount) {
    return { success: false, error: 'Refund amount exceeds paid amount' };
  }
  
  const { error } = await supabase
    .from('deposits')
    .update({
      status: 'refunded',
      refunded_date: new Date().toISOString(),
      refunded_amount: refundAmount,
      refund_reason: reason,
      refund_processed_by: processedBy,
    })
    .eq('id', depositId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Forfeit a deposit (e.g., due to damages or contract breach).
 */
export async function forfeitDeposit(
  depositId: string,
  reason: string,
  forfeitAmount?: number,
  approvedBy?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: deposit } = await supabase
    .from('deposits')
    .select('*')
    .eq('id', depositId)
    .single();
  
  if (!deposit) {
    return { success: false, error: 'Deposit not found' };
  }
  
  // Partial forfeit: refund the difference
  const actualForfeit = forfeitAmount ?? deposit.paid_amount;
  const refundAmount = deposit.paid_amount - actualForfeit;
  
  const { error } = await supabase
    .from('deposits')
    .update({
      status: 'forfeited',
      forfeit_reason: reason,
      forfeit_amount: actualForfeit,
      refunded_amount: refundAmount > 0 ? refundAmount : null,
      refunded_date: refundAmount > 0 ? new Date().toISOString() : null,
      forfeit_approved_by: approvedBy,
    })
    .eq('id', depositId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Get all deposits for an employee.
 */
export async function getEmployeeDeposits(employeeId: string): Promise<Deposit[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('deposits')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  
  return (data || []).map(d => ({
    id: d.id,
    employeeId: d.employee_id,
    depositType: d.deposit_type,
    amount: d.amount,
    paidAmount: d.paid_amount,
    status: d.status,
    description: d.description,
    assetId: d.asset_id,
    paidDate: d.paid_date,
    refundedDate: d.refunded_date,
    refundedAmount: d.refunded_amount,
    forfeitReason: d.forfeit_reason,
    createdAt: d.created_at,
  }));
}

// ============================================================================
// DEDUCTION MANAGEMENT
// ============================================================================

/**
 * Create a scheduled deduction for an employee.
 */
export async function createDeduction(input: {
  employeeId: string;
  deductionType: DeductionType;
  description: string;
  totalAmount: number;
  installmentAmount: number;
  frequency: RecoveryFrequency;
  startDate: string;
  depositId?: string;
  incidentId?: string;
  approvedBy?: string;
}): Promise<{ success: boolean; deductionId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('deductions')
    .insert({
      employee_id: input.employeeId,
      deduction_type: input.deductionType,
      description: input.description,
      total_amount: input.totalAmount,
      remaining_amount: input.totalAmount,
      installment_amount: input.installmentAmount,
      frequency: input.frequency,
      status: 'scheduled',
      start_date: input.startDate,
      deposit_id: input.depositId,
      incident_id: input.incidentId,
      approved_by: input.approvedBy,
      approved_at: input.approvedBy ? new Date().toISOString() : null,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // If linked to deposit, update deposit status
  if (input.depositId) {
    await supabase
      .from('deposits')
      .update({ status: 'recovering' })
      .eq('id', input.depositId);
  }
  
  return { success: true, deductionId: data.id };
}

/**
 * Process a deduction installment (called during payroll).
 */
export async function processDeductionInstallment(
  deductionId: string,
  amount: number,
  payrollId: string
): Promise<{ success: boolean; error?: string; completed?: boolean }> {
  const supabase = createClient();
  
  const { data: deduction } = await supabase
    .from('deductions')
    .select('*')
    .eq('id', deductionId)
    .single();
  
  if (!deduction) {
    return { success: false, error: 'Deduction not found' };
  }
  
  if (deduction.status !== 'active' && deduction.status !== 'scheduled') {
    return { success: false, error: `Cannot process ${deduction.status} deduction` };
  }
  
  const actualAmount = Math.min(amount, deduction.remaining_amount);
  const newRemaining = deduction.remaining_amount - actualAmount;
  const completed = newRemaining <= 0;
  
  const { error } = await supabase
    .from('deductions')
    .update({
      remaining_amount: newRemaining,
      status: completed ? 'completed' : 'active',
      end_date: completed ? new Date().toISOString() : null,
    })
    .eq('id', deductionId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Record the installment
  await supabase.from('deduction_installments').insert({
    deduction_id: deductionId,
    payroll_id: payrollId,
    amount: actualAmount,
    deducted_at: new Date().toISOString(),
  });
  
  return { success: true, completed };
}

/**
 * Pause a deduction (e.g., during leave).
 */
export async function pauseDeduction(
  deductionId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('deductions')
    .update({
      status: 'paused',
      pause_reason: reason,
      paused_at: new Date().toISOString(),
    })
    .eq('id', deductionId)
    .in('status', ['active', 'scheduled']);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Resume a paused deduction.
 */
export async function resumeDeduction(deductionId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('deductions')
    .update({
      status: 'active',
      pause_reason: null,
      paused_at: null,
    })
    .eq('id', deductionId)
    .eq('status', 'paused');
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Get active deductions for an employee (for payroll calculation).
 */
export async function getActiveDeductions(employeeId: string): Promise<Deduction[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('deductions')
    .select('*')
    .eq('employee_id', employeeId)
    .in('status', ['active', 'scheduled'])
    .lte('start_date', new Date().toISOString())
    .order('start_date', { ascending: true });
  
  return (data || []).map(mapDeductionRow);
}

/**
 * Get all deductions for an employee.
 */
export async function getEmployeeDeductions(employeeId: string): Promise<Deduction[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('deductions')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  
  return (data || []).map(mapDeductionRow);
}

function mapDeductionRow(row: Record<string, unknown>): Deduction {
  return {
    id: row.id as string,
    employeeId: row.employee_id as string,
    deductionType: row.deduction_type as DeductionType,
    description: row.description as string,
    totalAmount: row.total_amount as number,
    remainingAmount: row.remaining_amount as number,
    installmentAmount: row.installment_amount as number,
    frequency: row.frequency as RecoveryFrequency,
    status: row.status as DeductionStatus,
    startDate: row.start_date as string,
    endDate: row.end_date as string | null,
    depositId: row.deposit_id as string | null,
    incidentId: row.incident_id as string | null,
    approvedBy: row.approved_by as string | null,
    approvedAt: row.approved_at as string | null,
    createdAt: row.created_at as string,
  };
}

// ============================================================================
// PAYROLL INTEGRATION
// ============================================================================

/**
 * Calculate total deductions for payroll period.
 */
export async function calculatePayrollDeductions(
  employeeId: string,
  payPeriodStart: string,
  payPeriodEnd: string
): Promise<{ total: number; items: Array<{ deductionId: string; type: DeductionType; amount: number }> }> {
  const deductions = await getActiveDeductions(employeeId);
  const items: Array<{ deductionId: string; type: DeductionType; amount: number }> = [];
  let total = 0;
  
  for (const deduction of deductions) {
    // Check if deduction applies to this pay period
    if (deduction.startDate > payPeriodEnd) continue;
    
    // Calculate based on frequency
    let amount = 0;
    switch (deduction.frequency) {
      case 'one_time':
        amount = deduction.remainingAmount;
        break;
      case 'monthly':
        amount = Math.min(deduction.installmentAmount, deduction.remainingAmount);
        break;
      case 'bi_weekly':
        // Assuming monthly payroll, apply twice
        amount = Math.min(deduction.installmentAmount * 2, deduction.remainingAmount);
        break;
      case 'weekly':
        // Assuming monthly payroll, apply ~4 times
        amount = Math.min(deduction.installmentAmount * 4, deduction.remainingAmount);
        break;
    }
    
    if (amount > 0) {
      items.push({
        deductionId: deduction.id,
        type: deduction.deductionType,
        amount,
      });
      total += amount;
    }
  }
  
  return { total, items };
}

// ============================================================================
// REPORTS
// ============================================================================

export interface DepositSummary {
  totalDeposits: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  activeCount: number;
  activeAmount: number;
  refundedCount: number;
  refundedAmount: number;
  forfeitedCount: number;
  forfeitedAmount: number;
  byType: Record<DepositType, { count: number; amount: number }>;
}

export async function getDepositSummary(): Promise<DepositSummary> {
  const supabase = createClient();
  
  const { data: deposits } = await supabase
    .from('deposits')
    .select('*');
  
  const summary: DepositSummary = {
    totalDeposits: 0,
    totalAmount: 0,
    pendingCount: 0,
    pendingAmount: 0,
    activeCount: 0,
    activeAmount: 0,
    refundedCount: 0,
    refundedAmount: 0,
    forfeitedCount: 0,
    forfeitedAmount: 0,
    byType: {
      vehicle: { count: 0, amount: 0 },
      uniform: { count: 0, amount: 0 },
      equipment: { count: 0, amount: 0 },
      tools: { count: 0, amount: 0 },
      other: { count: 0, amount: 0 },
    },
  };
  
  for (const d of deposits || []) {
    summary.totalDeposits++;
    summary.totalAmount += d.amount;
    
    // By status
    switch (d.status) {
      case 'pending':
        summary.pendingCount++;
        summary.pendingAmount += d.amount - d.paid_amount;
        break;
      case 'active':
      case 'paid':
        summary.activeCount++;
        summary.activeAmount += d.paid_amount;
        break;
      case 'refunded':
        summary.refundedCount++;
        summary.refundedAmount += d.refunded_amount || 0;
        break;
      case 'forfeited':
        summary.forfeitedCount++;
        summary.forfeitedAmount += d.forfeit_amount || d.paid_amount;
        break;
    }
    
    // By type
    if (d.deposit_type in summary.byType) {
      summary.byType[d.deposit_type as DepositType].count++;
      summary.byType[d.deposit_type as DepositType].amount += d.paid_amount;
    }
  }
  
  return summary;
}
