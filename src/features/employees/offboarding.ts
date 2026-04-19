'use client';

/**
 * Offboarding Checklist Service (T-030)
 * 
 * Manages the employee offboarding workflow:
 * - Final pay calculation
 * - Asset returns
 * - Account disabling
 * - Document archiving
 * - Deposit settlement
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type OffboardingReason = 
  | 'resignation'
  | 'termination'
  | 'contract_end'
  | 'retirement'
  | 'mutual_agreement'
  | 'absconding'
  | 'death';

export type OffboardingStep = 
  | 'initiated'
  | 'assets_pending'
  | 'assets_returned'
  | 'final_pay_pending'
  | 'final_pay_calculated'
  | 'deposits_settled'
  | 'accounts_disabled'
  | 'documents_archived'
  | 'completed';

export type OffboardingItemStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked';

export interface OffboardingChecklist {
  id: string;
  employeeId: string;
  employeeName: string;
  reason: OffboardingReason;
  lastWorkingDay: string;
  currentStep: OffboardingStep;
  initiatedBy: string;
  initiatedAt: string;
  completedAt: string | null;
  items: OffboardingItem[];
  notes: string | null;
}

export interface OffboardingItem {
  id: string;
  category: 'assets' | 'finance' | 'access' | 'documents' | 'compliance';
  title: string;
  description: string;
  status: OffboardingItemStatus;
  assignedTo: string | null;
  completedBy: string | null;
  completedAt: string | null;
  blockedReason: string | null;
  metadata: Record<string, unknown>;
}

export interface FinalPayCalculation {
  baseSalary: number;
  daysWorked: number;
  proRatedSalary: number;
  pendingAllowances: number;
  pendingExpenses: number;
  accrruedLeave: number;
  leaveEncashment: number;
  depositsRefundable: number;
  pendingDeductions: number;
  pendingRecoveries: number;
  damageCharges: number;
  grossFinalPay: number;
  totalDeductions: number;
  netFinalPay: number;
  breakdown: Array<{ description: string; amount: number; type: 'earning' | 'deduction' }>;
}

// ============================================================================
// LABELS
// ============================================================================

export const OFFBOARDING_REASON_LABELS: Record<OffboardingReason, string> = {
  resignation: 'Resignation',
  termination: 'Termination',
  contract_end: 'Contract End',
  retirement: 'Retirement',
  mutual_agreement: 'Mutual Agreement',
  absconding: 'Absconding',
  death: 'Death',
};

export const OFFBOARDING_STEP_LABELS: Record<OffboardingStep, string> = {
  initiated: 'Initiated',
  assets_pending: 'Assets Pending Return',
  assets_returned: 'Assets Returned',
  final_pay_pending: 'Final Pay Pending',
  final_pay_calculated: 'Final Pay Calculated',
  deposits_settled: 'Deposits Settled',
  accounts_disabled: 'Accounts Disabled',
  documents_archived: 'Documents Archived',
  completed: 'Completed',
};

// ============================================================================
// OFFBOARDING INITIATION
// ============================================================================

/**
 * Initiate offboarding process for an employee.
 */
export async function initiateOffboarding(input: {
  employeeId: string;
  reason: OffboardingReason;
  lastWorkingDay: string;
  notes?: string;
  initiatedBy: string;
}): Promise<{ success: boolean; offboardingId?: string; error?: string }> {
  const supabase = createClient();
  
  // Check if offboarding already exists
  const { data: existing } = await supabase
    .from('offboarding_checklists')
    .select('id')
    .eq('employee_id', input.employeeId)
    .not('status', 'eq', 'completed')
    .single();
  
  if (existing) {
    return { success: false, error: 'Offboarding already in progress' };
  }
  
  // Get employee details
  const { data: employee } = await supabase
    .from('employees')
    .select('full_name, status')
    .eq('id', input.employeeId)
    .single();
  
  if (!employee) {
    return { success: false, error: 'Employee not found' };
  }
  
  // Create offboarding record
  const { data, error } = await supabase
    .from('offboarding_checklists')
    .insert({
      employee_id: input.employeeId,
      reason: input.reason,
      last_working_day: input.lastWorkingDay,
      current_step: 'initiated',
      initiated_by: input.initiatedBy,
      initiated_at: new Date().toISOString(),
      notes: input.notes,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Generate checklist items
  const items = await generateChecklistItems(input.employeeId, data.id, input.reason);
  
  if (items.length > 0) {
    await supabase.from('offboarding_items').insert(items);
  }
  
  // Update employee status
  await supabase
    .from('employees')
    .update({ 
      status: 'offboarding',
      offboarding_started_at: new Date().toISOString(),
    })
    .eq('id', input.employeeId);
  
  return { success: true, offboardingId: data.id };
}

/**
 * Generate checklist items based on employee's assignments.
 */
async function generateChecklistItems(
  employeeId: string,
  offboardingId: string,
  reason: OffboardingReason
): Promise<Array<Record<string, unknown>>> {
  const supabase = createClient();
  const items: Array<Record<string, unknown>> = [];
  
  // Check for assigned vehicles
  const { data: vehicleAssignment } = await supabase
    .from('rider_vehicle_assignments')
    .select('id, asset:assets(id, license_plate, asset_name)')
    .eq('employee_id', employeeId)
    .is('end_date', null)
    .single();
  
  if (vehicleAssignment) {
    const assetData = vehicleAssignment.asset as unknown;
    const asset = (Array.isArray(assetData) ? assetData[0] : assetData) as { id: string; license_plate: string; asset_name: string } | null;
    items.push({
      offboarding_id: offboardingId,
      category: 'assets',
      title: 'Return Company Vehicle',
      description: `Return vehicle: ${asset?.license_plate || asset?.asset_name || 'Unknown'}`,
      status: 'pending',
      metadata: { asset_id: asset?.id, assignment_id: vehicleAssignment.id },
    });
  }
  
  // Check for other assigned assets
  const { data: equipmentAssignments } = await supabase
    .from('asset_assignments')
    .select('id, asset:assets(id, asset_name, asset_category)')
    .eq('employee_id', employeeId)
    .is('returned_at', null);
  
  for (const assignment of equipmentAssignments || []) {
    const assetData = assignment.asset as unknown;
    const asset = (Array.isArray(assetData) ? assetData[0] : assetData) as { id: string; asset_name: string; asset_category: string } | null;
    items.push({
      offboarding_id: offboardingId,
      category: 'assets',
      title: `Return ${asset?.asset_category || 'Equipment'}`,
      description: `Return: ${asset?.asset_name || 'Unknown'}`,
      status: 'pending',
      metadata: { asset_id: asset?.id, assignment_id: assignment.id },
    });
  }
  
  // Check for deposits
  const { data: deposits } = await supabase
    .from('deposits')
    .select('id, deposit_type, paid_amount')
    .eq('employee_id', employeeId)
    .in('status', ['active', 'paid']);
  
  for (const deposit of deposits || []) {
    items.push({
      offboarding_id: offboardingId,
      category: 'finance',
      title: `Settle ${deposit.deposit_type} Deposit`,
      description: `Deposit amount: ${deposit.paid_amount} BHD - determine refund or forfeit`,
      status: 'pending',
      metadata: { deposit_id: deposit.id },
    });
  }
  
  // Check for pending deductions
  const { data: deductions } = await supabase
    .from('deductions')
    .select('id, remaining_amount')
    .eq('employee_id', employeeId)
    .in('status', ['active', 'scheduled']);
  
  const totalDeductions = deductions?.reduce((sum, d) => sum + d.remaining_amount, 0) || 0;
  if (totalDeductions > 0) {
    items.push({
      offboarding_id: offboardingId,
      category: 'finance',
      title: 'Settle Pending Deductions',
      description: `Total outstanding: ${totalDeductions} BHD`,
      status: 'pending',
      metadata: { deduction_ids: deductions?.map(d => d.id) },
    });
  }
  
  // Standard items
  items.push(
    {
      offboarding_id: offboardingId,
      category: 'finance',
      title: 'Calculate Final Pay',
      description: 'Calculate pro-rated salary, leave encashment, and deductions',
      status: 'pending',
    },
    {
      offboarding_id: offboardingId,
      category: 'finance',
      title: 'Process Final Payment',
      description: 'Transfer final settlement to employee',
      status: 'pending',
    },
    {
      offboarding_id: offboardingId,
      category: 'access',
      title: 'Disable System Access',
      description: 'Disable all system accounts and access credentials',
      status: 'pending',
    },
    {
      offboarding_id: offboardingId,
      category: 'access',
      title: 'Remove Platform Access',
      description: 'Remove from aggregator platforms (Talabat, etc.)',
      status: 'pending',
    },
    {
      offboarding_id: offboardingId,
      category: 'documents',
      title: 'Archive Employee Documents',
      description: 'Archive all documents per retention policy',
      status: 'pending',
    },
    {
      offboarding_id: offboardingId,
      category: 'compliance',
      title: 'Generate Clearance Certificate',
      description: 'Issue experience letter and clearance',
      status: reason === 'absconding' || reason === 'termination' ? 'blocked' : 'pending',
      blocked_reason: reason === 'absconding' ? 'Clearance not issued for absconding' : 
                      reason === 'termination' ? 'Pending termination review' : null,
    }
  );
  
  return items;
}

// ============================================================================
// CHECKLIST MANAGEMENT
// ============================================================================

/**
 * Get offboarding checklist for an employee.
 */
export async function getOffboardingChecklist(employeeId: string): Promise<OffboardingChecklist | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('offboarding_checklists')
    .select(`
      *,
      employee:employees(full_name),
      items:offboarding_items(*)
    `)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!data) return null;
  
  const employeeData = data.employee as unknown;
  const employee = (Array.isArray(employeeData) ? employeeData[0] : employeeData) as { full_name: string } | null;
  
  return {
    id: data.id,
    employeeId: data.employee_id,
    employeeName: employee?.full_name || 'Unknown',
    reason: data.reason,
    lastWorkingDay: data.last_working_day,
    currentStep: data.current_step,
    initiatedBy: data.initiated_by,
    initiatedAt: data.initiated_at,
    completedAt: data.completed_at,
    items: (data.items || []).map(mapItemRow),
    notes: data.notes,
  };
}

/**
 * Update a checklist item status.
 */
export async function updateChecklistItem(
  itemId: string,
  status: OffboardingItemStatus,
  completedBy?: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const updates: Record<string, unknown> = { status };
  if (status === 'completed') {
    updates.completed_by = completedBy;
    updates.completed_at = new Date().toISOString();
  }
  if (notes) {
    updates.notes = notes;
  }
  
  const { error } = await supabase
    .from('offboarding_items')
    .update(updates)
    .eq('id', itemId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Check if we need to advance the offboarding step
  const { data: item } = await supabase
    .from('offboarding_items')
    .select('offboarding_id')
    .eq('id', itemId)
    .single();
  
  if (item) {
    await updateOffboardingProgress(item.offboarding_id);
  }
  
  return { success: true };
}

/**
 * Update offboarding progress based on completed items.
 */
async function updateOffboardingProgress(offboardingId: string): Promise<void> {
  const supabase = createClient();
  
  const { data: items } = await supabase
    .from('offboarding_items')
    .select('category, status')
    .eq('offboarding_id', offboardingId);
  
  if (!items) return;
  
  // Calculate completion by category
  const categories = ['assets', 'finance', 'access', 'documents', 'compliance'];
  const categoryStatus: Record<string, boolean> = {};
  
  for (const cat of categories) {
    const catItems = items.filter(i => i.category === cat);
    categoryStatus[cat] = catItems.length === 0 || 
      catItems.every(i => i.status === 'completed' || i.status === 'skipped');
  }
  
  // Determine current step
  let newStep: OffboardingStep = 'initiated';
  
  if (!categoryStatus.assets) {
    newStep = 'assets_pending';
  } else if (!categoryStatus.finance) {
    newStep = 'final_pay_pending';
  } else if (!categoryStatus.access) {
    newStep = 'accounts_disabled';
  } else if (!categoryStatus.documents) {
    newStep = 'documents_archived';
  } else if (Object.values(categoryStatus).every(v => v)) {
    newStep = 'completed';
  }
  
  // Update offboarding record
  const updates: Record<string, unknown> = { current_step: newStep };
  if (newStep === 'completed') {
    updates.completed_at = new Date().toISOString();
  }
  
  await supabase
    .from('offboarding_checklists')
    .update(updates)
    .eq('id', offboardingId);
  
  // If completed, update employee status
  if (newStep === 'completed') {
    const { data: offboarding } = await supabase
      .from('offboarding_checklists')
      .select('employee_id')
      .eq('id', offboardingId)
      .single();
    
    if (offboarding) {
      await supabase
        .from('employees')
        .update({ 
          status: 'terminated',
          terminated_at: new Date().toISOString(),
        })
        .eq('id', offboarding.employee_id);
    }
  }
}

// ============================================================================
// FINAL PAY CALCULATION
// ============================================================================

/**
 * Calculate final pay for offboarding employee.
 */
export async function calculateFinalPay(employeeId: string): Promise<FinalPayCalculation> {
  const supabase = createClient();
  const breakdown: FinalPayCalculation['breakdown'] = [];
  
  // Get employee and offboarding details
  const { data: employee } = await supabase
    .from('employees')
    .select('base_salary, hire_date')
    .eq('id', employeeId)
    .single();
  
  const { data: offboarding } = await supabase
    .from('offboarding_checklists')
    .select('last_working_day')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!employee || !offboarding) {
    return {
      baseSalary: 0,
      daysWorked: 0,
      proRatedSalary: 0,
      pendingAllowances: 0,
      pendingExpenses: 0,
      accrruedLeave: 0,
      leaveEncashment: 0,
      depositsRefundable: 0,
      pendingDeductions: 0,
      pendingRecoveries: 0,
      damageCharges: 0,
      grossFinalPay: 0,
      totalDeductions: 0,
      netFinalPay: 0,
      breakdown: [],
    };
  }
  
  const baseSalary = employee.base_salary || 0;
  const lastWorkingDay = new Date(offboarding.last_working_day);
  const monthStart = new Date(lastWorkingDay.getFullYear(), lastWorkingDay.getMonth(), 1);
  const daysInMonth = new Date(lastWorkingDay.getFullYear(), lastWorkingDay.getMonth() + 1, 0).getDate();
  const daysWorked = lastWorkingDay.getDate();
  
  // Pro-rated salary
  const proRatedSalary = Math.round((baseSalary / daysInMonth) * daysWorked * 100) / 100;
  breakdown.push({ description: `Salary (${daysWorked} days)`, amount: proRatedSalary, type: 'earning' });
  
  // Pending allowances (from current pay period)
  const pendingAllowances = 0; // Would query from payroll_allowances
  if (pendingAllowances > 0) {
    breakdown.push({ description: 'Pending Allowances', amount: pendingAllowances, type: 'earning' });
  }
  
  // Expense reimbursements
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('employee_id', employeeId)
    .eq('status', 'approved')
    .eq('reimbursed', false);
  
  const pendingExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
  if (pendingExpenses > 0) {
    breakdown.push({ description: 'Expense Reimbursement', amount: pendingExpenses, type: 'earning' });
  }
  
  // Leave encashment
  const { data: leaveBalance } = await supabase
    .from('leave_balances')
    .select('balance')
    .eq('employee_id', employeeId)
    .eq('leave_type', 'annual')
    .single();
  
  const accrruedLeave = leaveBalance?.balance || 0;
  const dailyRate = baseSalary / 30;
  const leaveEncashment = Math.round(accrruedLeave * dailyRate * 100) / 100;
  if (leaveEncashment > 0) {
    breakdown.push({ description: `Leave Encashment (${accrruedLeave} days)`, amount: leaveEncashment, type: 'earning' });
  }
  
  // Refundable deposits
  const { data: deposits } = await supabase
    .from('deposits')
    .select('paid_amount')
    .eq('employee_id', employeeId)
    .in('status', ['active', 'paid']);
  
  const depositsRefundable = deposits?.reduce((sum, d) => sum + d.paid_amount, 0) || 0;
  if (depositsRefundable > 0) {
    breakdown.push({ description: 'Deposit Refund', amount: depositsRefundable, type: 'earning' });
  }
  
  // Pending deductions
  const { data: deductions } = await supabase
    .from('deductions')
    .select('remaining_amount')
    .eq('employee_id', employeeId)
    .in('status', ['active', 'scheduled']);
  
  const pendingDeductions = deductions?.reduce((sum, d) => sum + d.remaining_amount, 0) || 0;
  if (pendingDeductions > 0) {
    breakdown.push({ description: 'Outstanding Deductions', amount: pendingDeductions, type: 'deduction' });
  }
  
  // Damage charges (from incidents)
  const { data: incidents } = await supabase
    .from('incidents')
    .select('recovery_amount')
    .eq('employee_id', employeeId)
    .eq('recovery_status', 'pending');
  
  const damageCharges = incidents?.reduce((sum, i) => sum + (i.recovery_amount || 0), 0) || 0;
  if (damageCharges > 0) {
    breakdown.push({ description: 'Damage Recovery', amount: damageCharges, type: 'deduction' });
  }
  
  // Calculate totals
  const grossFinalPay = proRatedSalary + pendingAllowances + pendingExpenses + leaveEncashment + depositsRefundable;
  const totalDeductions = pendingDeductions + damageCharges;
  const netFinalPay = grossFinalPay - totalDeductions;
  
  return {
    baseSalary,
    daysWorked,
    proRatedSalary,
    pendingAllowances,
    pendingExpenses,
    accrruedLeave,
    leaveEncashment,
    depositsRefundable,
    pendingDeductions,
    pendingRecoveries: 0,
    damageCharges,
    grossFinalPay,
    totalDeductions,
    netFinalPay,
    breakdown,
  };
}

// ============================================================================
// REPORTING
// ============================================================================

export interface OffboardingSummary {
  inProgress: number;
  completedThisMonth: number;
  byReason: Record<OffboardingReason, number>;
  avgCompletionDays: number;
  pendingAssetReturns: number;
  pendingSettlements: number;
}

export async function getOffboardingSummary(): Promise<OffboardingSummary> {
  const supabase = createClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  const { data: inProgressData } = await supabase
    .from('offboarding_checklists')
    .select('id')
    .neq('current_step', 'completed');
  
  const { data: completedData } = await supabase
    .from('offboarding_checklists')
    .select('id, reason, initiated_at, completed_at')
    .eq('current_step', 'completed')
    .gte('completed_at', monthStart);
  
  const { data: allData } = await supabase
    .from('offboarding_checklists')
    .select('reason')
    .gte('created_at', new Date(now.getFullYear(), 0, 1).toISOString());
  
  const byReason: Record<OffboardingReason, number> = {
    resignation: 0,
    termination: 0,
    contract_end: 0,
    retirement: 0,
    mutual_agreement: 0,
    absconding: 0,
    death: 0,
  };
  
  for (const item of allData || []) {
    if (item.reason in byReason) {
      byReason[item.reason as OffboardingReason]++;
    }
  }
  
  // Calculate average completion time
  let avgCompletionDays = 0;
  if (completedData && completedData.length > 0) {
    const totalDays = completedData.reduce((sum, item) => {
      const started = new Date(item.initiated_at).getTime();
      const completed = new Date(item.completed_at).getTime();
      return sum + (completed - started) / (1000 * 60 * 60 * 24);
    }, 0);
    avgCompletionDays = Math.round(totalDays / completedData.length);
  }
  
  // Count pending items
  const { data: pendingAssets } = await supabase
    .from('offboarding_items')
    .select('id')
    .eq('category', 'assets')
    .eq('status', 'pending');
  
  const { data: pendingFinance } = await supabase
    .from('offboarding_items')
    .select('id')
    .eq('category', 'finance')
    .eq('status', 'pending');
  
  return {
    inProgress: inProgressData?.length || 0,
    completedThisMonth: completedData?.length || 0,
    byReason,
    avgCompletionDays,
    pendingAssetReturns: pendingAssets?.length || 0,
    pendingSettlements: pendingFinance?.length || 0,
  };
}

function mapItemRow(row: Record<string, unknown>): OffboardingItem {
  return {
    id: row.id as string,
    category: row.category as OffboardingItem['category'],
    title: row.title as string,
    description: row.description as string,
    status: row.status as OffboardingItemStatus,
    assignedTo: row.assigned_to as string | null,
    completedBy: row.completed_by as string | null,
    completedAt: row.completed_at as string | null,
    blockedReason: row.blocked_reason as string | null,
    metadata: (row.metadata as Record<string, unknown>) || {},
  };
}
