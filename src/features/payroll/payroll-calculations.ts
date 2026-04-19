'use client';

/**
 * Payroll Calculations Service (T-064 to T-066)
 * 
 * Manages:
 * - Salary calculations
 * - Deductions processing
 * - Allowances and benefits
 * - Payroll runs
 * - Pay slip generation
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type PayrollStatus = 'draft' | 'processing' | 'approved' | 'paid' | 'cancelled';
export type PaymentMethod = 'bank_transfer' | 'cash' | 'wps' | 'cheque';
export type DeductionType = 
  | 'visa_cost'
  | 'equipment_deposit'
  | 'damage_recovery'
  | 'loan'
  | 'advance'
  | 'penalty'
  | 'absence'
  | 'late_arrival'
  | 'insurance'
  | 'other';

export type AllowanceType = 
  | 'transport'
  | 'food'
  | 'housing'
  | 'phone'
  | 'uniform'
  | 'overtime'
  | 'holiday'
  | 'bonus'
  | 'commission'
  | 'incentive'
  | 'other';

export interface PayrollPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  payDate: string;
  status: PayrollStatus;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  processedBy: string | null;
  processedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface PaySlip {
  id: string;
  payrollPeriodId: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  baseSalary: number;
  workingDays: number;
  actualDays: number;
  earnings: EarningsBreakdown;
  deductions: DeductionsBreakdown;
  grossPay: number;
  netPay: number;
  paymentMethod: PaymentMethod;
  bankName: string | null;
  accountNumber: string | null;
  status: PayrollStatus;
  paidAt: string | null;
  notes: string | null;
}

export interface EarningsBreakdown {
  baseSalary: number;
  proRatedSalary: number;
  allowances: AllowanceItem[];
  commissions: number;
  incentives: number;
  overtime: number;
  total: number;
}

export interface DeductionsBreakdown {
  items: DeductionItem[];
  total: number;
}

export interface AllowanceItem {
  type: AllowanceType;
  description: string;
  amount: number;
}

export interface DeductionItem {
  type: DeductionType;
  description: string;
  amount: number;
  referenceId: string | null;
}

export interface SalaryStructure {
  id: string;
  categoryId: string;
  baseSalary: number;
  allowances: AllowanceItem[];
  effectiveFrom: string;
  effectiveTo: string | null;
}

// ============================================================================
// LABELS
// ============================================================================

export const DEDUCTION_TYPE_LABELS: Record<DeductionType, string> = {
  visa_cost: 'Visa Cost',
  equipment_deposit: 'Equipment Deposit',
  damage_recovery: 'Damage Recovery',
  loan: 'Loan Repayment',
  advance: 'Salary Advance',
  penalty: 'Penalty',
  absence: 'Absence Deduction',
  late_arrival: 'Late Arrival',
  insurance: 'Insurance',
  other: 'Other',
};

export const ALLOWANCE_TYPE_LABELS: Record<AllowanceType, string> = {
  transport: 'Transport Allowance',
  food: 'Food Allowance',
  housing: 'Housing Allowance',
  phone: 'Phone Allowance',
  uniform: 'Uniform Allowance',
  overtime: 'Overtime Pay',
  holiday: 'Holiday Pay',
  bonus: 'Bonus',
  commission: 'Commission',
  incentive: 'Performance Incentive',
  other: 'Other Allowance',
};

// ============================================================================
// PAYROLL PERIOD MANAGEMENT
// ============================================================================

/**
 * Create a new payroll period.
 */
export async function createPayrollPeriod(input: {
  name: string;
  startDate: string;
  endDate: string;
  payDate: string;
}): Promise<{ success: boolean; periodId?: string; error?: string }> {
  const supabase = createClient();
  
  // Check for overlapping periods
  const { data: existing } = await supabase
    .from('payroll_periods')
    .select('id')
    .or(`and(start_date.lte.${input.endDate},end_date.gte.${input.startDate})`)
    .not('status', 'eq', 'cancelled')
    .limit(1);
  
  if (existing?.length) {
    return { success: false, error: 'Overlapping payroll period exists' };
  }
  
  const { data, error } = await supabase
    .from('payroll_periods')
    .insert({
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      pay_date: input.payDate,
      status: 'draft',
      total_employees: 0,
      total_gross: 0,
      total_deductions: 0,
      total_net: 0,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, periodId: data.id };
}

/**
 * Get payroll period by ID.
 */
export async function getPayrollPeriod(periodId: string): Promise<PayrollPeriod | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('id', periodId)
    .single();
  
  if (!data) return null;
  
  return {
    id: data.id,
    name: data.name,
    startDate: data.start_date,
    endDate: data.end_date,
    payDate: data.pay_date,
    status: data.status as PayrollStatus,
    totalEmployees: data.total_employees,
    totalGross: data.total_gross,
    totalDeductions: data.total_deductions,
    totalNet: data.total_net,
    processedBy: data.processed_by,
    processedAt: data.processed_at,
    approvedBy: data.approved_by,
    approvedAt: data.approved_at,
  };
}

// ============================================================================
// SALARY CALCULATION
// ============================================================================

/**
 * Calculate salary for an employee for a payroll period.
 */
export async function calculateEmployeeSalary(
  employeeId: string,
  periodId: string
): Promise<{
  earnings: EarningsBreakdown;
  deductions: DeductionsBreakdown;
  gross: number;
  net: number;
}> {
  const supabase = createClient();
  
  // Get period details
  const period = await getPayrollPeriod(periodId);
  if (!period) {
    throw new Error('Payroll period not found');
  }
  
  // Get employee details
  const { data: employee } = await supabase
    .from('employees')
    .select('base_salary, category_id')
    .eq('id', employeeId)
    .single();
  
  if (!employee) {
    throw new Error('Employee not found');
  }
  
  // Get salary structure for employee's category
  const { data: structure } = await supabase
    .from('salary_structures')
    .select('*')
    .eq('category_id', employee.category_id)
    .lte('effective_from', period.endDate)
    .or(`effective_to.is.null,effective_to.gte.${period.startDate}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();
  
  const baseSalary = structure?.base_salary || employee.base_salary || 0;
  const structureAllowances = (structure?.allowances || []) as AllowanceItem[];
  
  // Calculate working days in period
  const periodStart = new Date(period.startDate);
  const periodEnd = new Date(period.endDate);
  let workingDays = 0;
  const current = new Date(periodStart);
  
  while (current <= periodEnd) {
    const day = current.getDay();
    if (day !== 5) { // Friday is off
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  // Get actual attendance
  const { data: attendance } = await supabase
    .from('attendance')
    .select('status')
    .eq('employee_id', employeeId)
    .gte('date', period.startDate)
    .lte('date', period.endDate);
  
  const presentDays = attendance?.filter(a => 
    a.status === 'present' || a.status === 'late'
  ).length || 0;
  
  const absentDays = attendance?.filter(a => a.status === 'absent').length || 0;
  const lateDays = attendance?.filter(a => a.status === 'late').length || 0;
  
  // Pro-rate salary
  const dailyRate = baseSalary / workingDays;
  const proRatedSalary = Math.round(dailyRate * presentDays);
  
  // Calculate allowances
  const allowances: AllowanceItem[] = [...structureAllowances];
  
  // Get overtime hours
  const { data: overtime } = await supabase
    .from('overtime_records')
    .select('hours, rate_multiplier')
    .eq('employee_id', employeeId)
    .eq('status', 'approved')
    .gte('date', period.startDate)
    .lte('date', period.endDate);
  
  const hourlyRate = baseSalary / (workingDays * 8);
  const overtimePay = overtime?.reduce((sum, ot) => 
    sum + (ot.hours * hourlyRate * (ot.rate_multiplier || 1.25)), 0
  ) || 0;
  
  if (overtimePay > 0) {
    allowances.push({
      type: 'overtime',
      description: 'Overtime Pay',
      amount: Math.round(overtimePay),
    });
  }
  
  // Get commissions
  const { data: commissions } = await supabase
    .from('order_commissions')
    .select('amount')
    .eq('rider_id', employeeId)
    .eq('status', 'approved')
    .gte('created_at', period.startDate)
    .lte('created_at', period.endDate);
  
  const totalCommissions = commissions?.reduce((sum, c) => sum + c.amount, 0) || 0;
  
  // Get incentives
  const { data: incentives } = await supabase
    .from('incentives')
    .select('amount')
    .eq('employee_id', employeeId)
    .eq('status', 'approved')
    .gte('date', period.startDate)
    .lte('date', period.endDate);
  
  const totalIncentives = incentives?.reduce((sum, i) => sum + i.amount, 0) || 0;
  
  // Calculate deductions
  const deductions: DeductionItem[] = [];
  
  // Absence deductions
  if (absentDays > 0) {
    deductions.push({
      type: 'absence',
      description: `${absentDays} day(s) absent`,
      amount: Math.round(dailyRate * absentDays),
      referenceId: null,
    });
  }
  
  // Late arrival deductions (half a day per 3 lates)
  const lateDeduction = Math.floor(lateDays / 3) * (dailyRate / 2);
  if (lateDeduction > 0) {
    deductions.push({
      type: 'late_arrival',
      description: `${lateDays} late arrival(s)`,
      amount: Math.round(lateDeduction),
      referenceId: null,
    });
  }
  
  // Get active deductions (loans, advances, etc.)
  const { data: activeDeductions } = await supabase
    .from('deductions')
    .select('id, deduction_type, remaining_amount, installment_amount')
    .eq('employee_id', employeeId)
    .eq('status', 'active')
    .gt('remaining_amount', 0);
  
  for (const ded of activeDeductions || []) {
    const amount = Math.min(ded.remaining_amount, ded.installment_amount);
    deductions.push({
      type: ded.deduction_type as DeductionType,
      description: DEDUCTION_TYPE_LABELS[ded.deduction_type as DeductionType] || ded.deduction_type,
      amount,
      referenceId: ded.id,
    });
  }
  
  // Get penalties
  const { data: penalties } = await supabase
    .from('penalties')
    .select('id, amount, reason')
    .eq('employee_id', employeeId)
    .eq('status', 'approved')
    .eq('deducted', false)
    .gte('date', period.startDate)
    .lte('date', period.endDate);
  
  for (const pen of penalties || []) {
    deductions.push({
      type: 'penalty',
      description: pen.reason,
      amount: pen.amount,
      referenceId: pen.id,
    });
  }
  
  // Calculate totals
  const allowancesTotal = allowances.reduce((sum, a) => sum + a.amount, 0);
  const deductionsTotal = deductions.reduce((sum, d) => sum + d.amount, 0);
  
  const gross = proRatedSalary + allowancesTotal + totalCommissions + totalIncentives;
  const net = Math.max(0, gross - deductionsTotal);
  
  return {
    earnings: {
      baseSalary,
      proRatedSalary,
      allowances,
      commissions: totalCommissions,
      incentives: totalIncentives,
      overtime: overtimePay,
      total: gross,
    },
    deductions: {
      items: deductions,
      total: deductionsTotal,
    },
    gross,
    net,
  };
}

// ============================================================================
// PAYROLL PROCESSING
// ============================================================================

/**
 * Process payroll for all employees in a period.
 */
export async function processPayroll(
  periodId: string,
  processedBy: string
): Promise<{ success: boolean; processed: number; errors: number; error?: string }> {
  const supabase = createClient();
  
  // Get period
  const { data: period } = await supabase
    .from('payroll_periods')
    .select('status')
    .eq('id', periodId)
    .single();
  
  if (!period) {
    return { success: false, processed: 0, errors: 0, error: 'Period not found' };
  }
  
  if (period.status !== 'draft') {
    return { success: false, processed: 0, errors: 0, error: 'Period already processed' };
  }
  
  // Update status to processing
  await supabase
    .from('payroll_periods')
    .update({ status: 'processing', processed_by: processedBy, processed_at: new Date().toISOString() })
    .eq('id', periodId);
  
  // Get all active employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, employee_number, payment_method, bank_name, account_number')
    .eq('status', 'active');
  
  let processed = 0;
  let errors = 0;
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  
  for (const emp of employees || []) {
    try {
      const calculation = await calculateEmployeeSalary(emp.id, periodId);
      
      // Create pay slip
      await supabase
        .from('pay_slips')
        .insert({
          payroll_period_id: periodId,
          employee_id: emp.id,
          employee_name: emp.full_name,
          employee_number: emp.employee_number,
          base_salary: calculation.earnings.baseSalary,
          working_days: calculation.earnings.proRatedSalary / (calculation.earnings.baseSalary / 30),
          actual_days: Math.round(calculation.earnings.proRatedSalary / (calculation.earnings.baseSalary / 30)),
          earnings: calculation.earnings,
          deductions: calculation.deductions,
          gross_pay: calculation.gross,
          net_pay: calculation.net,
          payment_method: emp.payment_method || 'bank_transfer',
          bank_name: emp.bank_name,
          account_number: emp.account_number,
          status: 'draft',
        });
      
      totalGross += calculation.gross;
      totalDeductions += calculation.deductions.total;
      totalNet += calculation.net;
      processed++;
    } catch (err) {
      console.error(`Error processing payroll for employee ${emp.id}:`, err);
      errors++;
    }
  }
  
  // Update period totals
  await supabase
    .from('payroll_periods')
    .update({
      status: 'processing',
      total_employees: processed,
      total_gross: totalGross,
      total_deductions: totalDeductions,
      total_net: totalNet,
    })
    .eq('id', periodId);
  
  return { success: true, processed, errors };
}

/**
 * Approve payroll period.
 */
export async function approvePayroll(
  periodId: string,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: period } = await supabase
    .from('payroll_periods')
    .select('status')
    .eq('id', periodId)
    .single();
  
  if (!period) {
    return { success: false, error: 'Period not found' };
  }
  
  if (period.status !== 'processing') {
    return { success: false, error: 'Period must be in processing status to approve' };
  }
  
  const { error } = await supabase
    .from('payroll_periods')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', periodId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update all pay slips to approved
  await supabase
    .from('pay_slips')
    .update({ status: 'approved' })
    .eq('payroll_period_id', periodId);
  
  return { success: true };
}

/**
 * Mark payroll as paid.
 */
export async function markPayrollPaid(
  periodId: string,
  paidBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: period } = await supabase
    .from('payroll_periods')
    .select('status')
    .eq('id', periodId)
    .single();
  
  if (!period) {
    return { success: false, error: 'Period not found' };
  }
  
  if (period.status !== 'approved') {
    return { success: false, error: 'Period must be approved to mark as paid' };
  }
  
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('payroll_periods')
    .update({
      status: 'paid',
      paid_by: paidBy,
      paid_at: now,
    })
    .eq('id', periodId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update all pay slips to paid
  await supabase
    .from('pay_slips')
    .update({ status: 'paid', paid_at: now })
    .eq('payroll_period_id', periodId);
  
  // Update deductions (reduce remaining amounts)
  const { data: slips } = await supabase
    .from('pay_slips')
    .select('deductions')
    .eq('payroll_period_id', periodId);
  
  for (const slip of slips || []) {
    const deductions = slip.deductions as DeductionsBreakdown;
    for (const item of deductions?.items || []) {
      if (item.referenceId) {
        await supabase.rpc('reduce_deduction_balance', {
          deduction_id: item.referenceId,
          amount: item.amount,
        });
      }
    }
  }
  
  return { success: true };
}

// ============================================================================
// PAY SLIPS
// ============================================================================

/**
 * Get pay slip by ID.
 */
export async function getPaySlip(paySlipId: string): Promise<PaySlip | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('pay_slips')
    .select('*')
    .eq('id', paySlipId)
    .single();
  
  if (!data) return null;
  
  return mapPaySlip(data);
}

/**
 * Get pay slips for a payroll period.
 */
export async function getPaySlips(periodId: string): Promise<PaySlip[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('pay_slips')
    .select('*')
    .eq('payroll_period_id', periodId)
    .order('employee_name');
  
  return (data || []).map(mapPaySlip);
}

/**
 * Get employee's pay slip history.
 */
export async function getEmployeePaySlips(
  employeeId: string,
  limit = 12
): Promise<PaySlip[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('pay_slips')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return (data || []).map(mapPaySlip);
}

/**
 * Update pay slip manually (for corrections).
 */
export async function updatePaySlip(
  paySlipId: string,
  updates: {
    earnings?: Partial<EarningsBreakdown>;
    deductions?: DeductionItem[];
    notes?: string;
  },
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Get current pay slip
  const { data: current } = await supabase
    .from('pay_slips')
    .select('earnings, deductions, status')
    .eq('id', paySlipId)
    .single();
  
  if (!current) {
    return { success: false, error: 'Pay slip not found' };
  }
  
  if (current.status === 'paid') {
    return { success: false, error: 'Cannot modify paid pay slip' };
  }
  
  const earnings = { ...current.earnings, ...updates.earnings } as EarningsBreakdown;
  const deductions: DeductionsBreakdown = {
    items: updates.deductions || (current.deductions as DeductionsBreakdown).items,
    total: (updates.deductions || (current.deductions as DeductionsBreakdown).items)
      .reduce((sum, d) => sum + d.amount, 0),
  };
  
  const gross = earnings.proRatedSalary + 
    earnings.allowances.reduce((sum, a) => sum + a.amount, 0) +
    earnings.commissions + earnings.incentives;
  const net = Math.max(0, gross - deductions.total);
  
  const { error } = await supabase
    .from('pay_slips')
    .update({
      earnings,
      deductions,
      gross_pay: gross,
      net_pay: net,
      notes: updates.notes,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paySlipId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Recalculate period totals
  const { data: slip } = await supabase
    .from('pay_slips')
    .select('payroll_period_id')
    .eq('id', paySlipId)
    .single();
  
  if (slip) {
    await recalculatePeriodTotals(slip.payroll_period_id);
  }
  
  return { success: true };
}

// ============================================================================
// SALARY STRUCTURES
// ============================================================================

/**
 * Create salary structure for a category.
 */
export async function createSalaryStructure(input: {
  categoryId: string;
  baseSalary: number;
  allowances: AllowanceItem[];
  effectiveFrom: string;
}): Promise<{ success: boolean; structureId?: string; error?: string }> {
  const supabase = createClient();
  
  // Close existing structure
  await supabase
    .from('salary_structures')
    .update({ effective_to: input.effectiveFrom })
    .eq('category_id', input.categoryId)
    .is('effective_to', null);
  
  const { data, error } = await supabase
    .from('salary_structures')
    .insert({
      category_id: input.categoryId,
      base_salary: input.baseSalary,
      allowances: input.allowances,
      effective_from: input.effectiveFrom,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, structureId: data.id };
}

/**
 * Get salary structures.
 */
export async function getSalaryStructures(): Promise<SalaryStructure[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('salary_structures')
    .select('*')
    .is('effective_to', null)
    .order('created_at', { ascending: false });
  
  return (data || []).map(s => ({
    id: s.id,
    categoryId: s.category_id,
    baseSalary: s.base_salary,
    allowances: s.allowances as AllowanceItem[],
    effectiveFrom: s.effective_from,
    effectiveTo: s.effective_to,
  }));
}

// ============================================================================
// REPORTING
// ============================================================================

export interface PayrollSummary {
  currentPeriod: PayrollPeriod | null;
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  averageSalary: number;
  byDepartment: Array<{
    department: string;
    employees: number;
    total: number;
  }>;
  byPaymentMethod: Record<PaymentMethod, number>;
  pendingApproval: number;
  ytdGross: number;
  ytdDeductions: number;
  ytdNet: number;
}

export async function getPayrollSummary(): Promise<PayrollSummary> {
  const supabase = createClient();
  
  // Get current period
  const { data: currentPeriod } = await supabase
    .from('payroll_periods')
    .select('*')
    .in('status', ['draft', 'processing', 'approved'])
    .order('start_date', { ascending: false })
    .limit(1)
    .single();
  
  // Get YTD totals
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
  
  const { data: ytdPeriods } = await supabase
    .from('payroll_periods')
    .select('total_gross, total_deductions, total_net')
    .eq('status', 'paid')
    .gte('start_date', yearStart);
  
  const ytdGross = ytdPeriods?.reduce((sum, p) => sum + p.total_gross, 0) || 0;
  const ytdDeductions = ytdPeriods?.reduce((sum, p) => sum + p.total_deductions, 0) || 0;
  const ytdNet = ytdPeriods?.reduce((sum, p) => sum + p.total_net, 0) || 0;
  
  // Get pending approvals
  const { count: pendingApproval } = await supabase
    .from('payroll_periods')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'processing');
  
  // Get by payment method
  const { data: slips } = await supabase
    .from('pay_slips')
    .select('payment_method, net_pay')
    .eq('payroll_period_id', currentPeriod?.id);
  
  const byPaymentMethod: Record<PaymentMethod, number> = {
    bank_transfer: 0,
    cash: 0,
    wps: 0,
    cheque: 0,
  };
  
  for (const slip of slips || []) {
    byPaymentMethod[slip.payment_method as PaymentMethod] += slip.net_pay;
  }
  
  return {
    currentPeriod: currentPeriod ? {
      id: currentPeriod.id,
      name: currentPeriod.name,
      startDate: currentPeriod.start_date,
      endDate: currentPeriod.end_date,
      payDate: currentPeriod.pay_date,
      status: currentPeriod.status as PayrollStatus,
      totalEmployees: currentPeriod.total_employees,
      totalGross: currentPeriod.total_gross,
      totalDeductions: currentPeriod.total_deductions,
      totalNet: currentPeriod.total_net,
      processedBy: currentPeriod.processed_by,
      processedAt: currentPeriod.processed_at,
      approvedBy: currentPeriod.approved_by,
      approvedAt: currentPeriod.approved_at,
    } : null,
    totalEmployees: currentPeriod?.total_employees || 0,
    totalGrossPay: currentPeriod?.total_gross || 0,
    totalDeductions: currentPeriod?.total_deductions || 0,
    totalNetPay: currentPeriod?.total_net || 0,
    averageSalary: currentPeriod?.total_employees 
      ? Math.round(currentPeriod.total_net / currentPeriod.total_employees)
      : 0,
    byDepartment: [], // Would need department data
    byPaymentMethod,
    pendingApproval: pendingApproval || 0,
    ytdGross,
    ytdDeductions,
    ytdNet,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

async function recalculatePeriodTotals(periodId: string): Promise<void> {
  const supabase = createClient();
  
  const { data: slips } = await supabase
    .from('pay_slips')
    .select('gross_pay, net_pay, deductions')
    .eq('payroll_period_id', periodId);
  
  const totalGross = slips?.reduce((sum, s) => sum + s.gross_pay, 0) || 0;
  const totalNet = slips?.reduce((sum, s) => sum + s.net_pay, 0) || 0;
  const totalDeductions = slips?.reduce((sum, s) => {
    const ded = s.deductions as DeductionsBreakdown;
    return sum + (ded?.total || 0);
  }, 0) || 0;
  
  await supabase
    .from('payroll_periods')
    .update({
      total_employees: slips?.length || 0,
      total_gross: totalGross,
      total_deductions: totalDeductions,
      total_net: totalNet,
    })
    .eq('id', periodId);
}

function mapPaySlip(row: Record<string, unknown>): PaySlip {
  return {
    id: row.id as string,
    payrollPeriodId: row.payroll_period_id as string,
    employeeId: row.employee_id as string,
    employeeName: row.employee_name as string,
    employeeNumber: row.employee_number as string,
    baseSalary: row.base_salary as number,
    workingDays: row.working_days as number,
    actualDays: row.actual_days as number,
    earnings: row.earnings as EarningsBreakdown,
    deductions: row.deductions as DeductionsBreakdown,
    grossPay: row.gross_pay as number,
    netPay: row.net_pay as number,
    paymentMethod: row.payment_method as PaymentMethod,
    bankName: row.bank_name as string | null,
    accountNumber: row.account_number as string | null,
    status: row.status as PayrollStatus,
    paidAt: row.paid_at as string | null,
    notes: row.notes as string | null,
  };
}
