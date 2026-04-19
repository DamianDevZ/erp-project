'use client';

/**
 * Leave Balance Calculation Service (T-032)
 * 
 * Calculates leave balances based on entitlements and used leaves.
 * Handles accrual, carry-over, and balance checking for leave requests.
 */

import { createClient } from '@/lib/supabase/client';
import { LeaveType } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface LeavePolicy {
  leaveType: LeaveType;
  annualEntitlement: number;
  maxCarryOver: number;
  accrualType: 'annual' | 'monthly';
  canBeNegative: boolean;
  requiresApproval: boolean;
  maxConsecutiveDays?: number;
  minNoticeDays?: number;
}

export interface LeaveBalance {
  leaveType: LeaveType;
  label: string;
  entitlement: number;
  carryOver: number;
  accrued: number;
  used: number;
  pending: number;
  available: number;
  year: number;
}

export interface LeaveBalanceSummary {
  employeeId: string;
  employeeName: string;
  year: number;
  balances: LeaveBalance[];
  totalUsed: number;
  totalAvailable: number;
}

export interface LeaveRequestValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  balanceAfterRequest: number;
}

// ============================================================================
// DEFAULT LEAVE POLICIES
// ============================================================================

const DEFAULT_LEAVE_POLICIES: LeavePolicy[] = [
  {
    leaveType: 'annual',
    annualEntitlement: 30, // Bahrain labor law
    maxCarryOver: 5,
    accrualType: 'monthly',
    canBeNegative: false,
    requiresApproval: true,
    maxConsecutiveDays: 15,
    minNoticeDays: 7,
  },
  {
    leaveType: 'sick',
    annualEntitlement: 30,
    maxCarryOver: 0,
    accrualType: 'annual',
    canBeNegative: false,
    requiresApproval: true,
    maxConsecutiveDays: 5, // After 5 days need medical certificate
  },
  {
    leaveType: 'unpaid',
    annualEntitlement: 365, // Unlimited but tracked
    maxCarryOver: 0,
    accrualType: 'annual',
    canBeNegative: false,
    requiresApproval: true,
  },
  {
    leaveType: 'maternity',
    annualEntitlement: 60,
    maxCarryOver: 0,
    accrualType: 'annual',
    canBeNegative: false,
    requiresApproval: true,
  },
  {
    leaveType: 'paternity',
    annualEntitlement: 3,
    maxCarryOver: 0,
    accrualType: 'annual',
    canBeNegative: false,
    requiresApproval: true,
  },
  {
    leaveType: 'emergency',
    annualEntitlement: 5,
    maxCarryOver: 0,
    accrualType: 'annual',
    canBeNegative: false,
    requiresApproval: true,
    minNoticeDays: 0,
  },
  {
    leaveType: 'other',
    annualEntitlement: 5,
    maxCarryOver: 0,
    accrualType: 'annual',
    canBeNegative: false,
    requiresApproval: true,
  },
];

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  unpaid: 'Unpaid Leave',
  maternity: 'Maternity Leave',
  paternity: 'Paternity Leave',
  emergency: 'Emergency Leave',
  other: 'Other',
};

// ============================================================================
// BALANCE CALCULATIONS
// ============================================================================

/**
 * Calculate accrued days based on hire date and policy.
 */
function calculateAccrued(
  hireDate: string,
  policy: LeavePolicy,
  year: number
): number {
  const hire = new Date(hireDate);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const now = new Date();
  const effectiveEnd = now < yearEnd ? now : yearEnd;

  // If hired after this year, no entitlement
  if (hire > yearEnd) return 0;

  // Calculate months worked in this year
  const startMonth = hire > yearStart ? hire.getMonth() : 0;
  const endMonth = effectiveEnd.getMonth();
  const monthsWorked = endMonth - startMonth + 1;

  if (policy.accrualType === 'monthly') {
    // Monthly accrual: entitlement / 12 * months worked
    return Math.floor((policy.annualEntitlement / 12) * monthsWorked);
  } else {
    // Annual accrual: full entitlement at start of year (or hire)
    return policy.annualEntitlement;
  }
}

/**
 * Get leave balance for a single employee and leave type.
 */
export async function getLeaveBalance(
  employeeId: string,
  leaveType: LeaveType,
  year: number = new Date().getFullYear()
): Promise<LeaveBalance> {
  const supabase = createClient();

  // Get employee hire date
  const { data: employee } = await supabase
    .from('employees')
    .select('hire_date')
    .eq('id', employeeId)
    .single();

  // Get approved/used leaves for the year
  const { data: usedLeaves } = await supabase
    .from('leaves')
    .select('days_count')
    .eq('employee_id', employeeId)
    .eq('leave_type', leaveType)
    .eq('status', 'approved')
    .gte('start_date', `${year}-01-01`)
    .lte('start_date', `${year}-12-31`);

  // Get pending leaves for the year
  const { data: pendingLeaves } = await supabase
    .from('leaves')
    .select('days_count')
    .eq('employee_id', employeeId)
    .eq('leave_type', leaveType)
    .eq('status', 'pending')
    .gte('start_date', `${year}-01-01`)
    .lte('start_date', `${year}-12-31`);

  // Get carry-over from previous year (unused annual leave)
  let carryOver = 0;
  if (leaveType === 'annual' && year > 2020) {
    const prevYearBalance = await calculatePreviousYearUnused(employeeId, year - 1);
    const policy = DEFAULT_LEAVE_POLICIES.find(p => p.leaveType === leaveType)!;
    carryOver = Math.min(prevYearBalance, policy.maxCarryOver);
  }

  const policy = DEFAULT_LEAVE_POLICIES.find(p => p.leaveType === leaveType)!;
  const entitlement = policy.annualEntitlement;
  const accrued = employee?.hire_date 
    ? calculateAccrued(employee.hire_date, policy, year)
    : entitlement;
  const used = usedLeaves?.reduce((sum, l) => sum + l.days_count, 0) || 0;
  const pending = pendingLeaves?.reduce((sum, l) => sum + l.days_count, 0) || 0;
  const available = accrued + carryOver - used - pending;

  return {
    leaveType,
    label: LEAVE_TYPE_LABELS[leaveType],
    entitlement,
    carryOver,
    accrued,
    used,
    pending,
    available,
    year,
  };
}

/**
 * Calculate unused annual leave from previous year.
 */
async function calculatePreviousYearUnused(employeeId: string, year: number): Promise<number> {
  const supabase = createClient();

  const { data: employee } = await supabase
    .from('employees')
    .select('hire_date')
    .eq('id', employeeId)
    .single();

  if (!employee?.hire_date) return 0;

  const policy = DEFAULT_LEAVE_POLICIES.find(p => p.leaveType === 'annual')!;
  const accrued = calculateAccrued(employee.hire_date, policy, year);

  const { data: usedLeaves } = await supabase
    .from('leaves')
    .select('days_count')
    .eq('employee_id', employeeId)
    .eq('leave_type', 'annual')
    .eq('status', 'approved')
    .gte('start_date', `${year}-01-01`)
    .lte('start_date', `${year}-12-31`);

  const used = usedLeaves?.reduce((sum, l) => sum + l.days_count, 0) || 0;
  return Math.max(0, accrued - used);
}

/**
 * Get all leave balances for an employee.
 */
export async function getEmployeeLeaveBalances(
  employeeId: string,
  year: number = new Date().getFullYear()
): Promise<LeaveBalanceSummary> {
  const supabase = createClient();

  const { data: employee } = await supabase
    .from('employees')
    .select('id, full_name')
    .eq('id', employeeId)
    .single();

  const leaveTypes: LeaveType[] = ['annual', 'sick', 'unpaid', 'maternity', 'paternity', 'emergency', 'other'];
  
  const balances = await Promise.all(
    leaveTypes.map(type => getLeaveBalance(employeeId, type, year))
  );

  const totalUsed = balances.reduce((sum, b) => sum + b.used, 0);
  const totalAvailable = balances.reduce((sum, b) => sum + b.available, 0);

  return {
    employeeId,
    employeeName: employee?.full_name || 'Unknown',
    year,
    balances,
    totalUsed,
    totalAvailable,
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a leave request against balance and policy.
 */
export async function validateLeaveRequest(
  employeeId: string,
  leaveType: LeaveType,
  startDate: string,
  endDate: string,
  daysRequested: number
): Promise<LeaveRequestValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const year = new Date(startDate).getFullYear();

  const balance = await getLeaveBalance(employeeId, leaveType, year);
  const policy = DEFAULT_LEAVE_POLICIES.find(p => p.leaveType === leaveType);

  if (!policy) {
    return {
      isValid: false,
      errors: ['Invalid leave type'],
      warnings: [],
      balanceAfterRequest: balance.available,
    };
  }

  // Check sufficient balance
  if (!policy.canBeNegative && daysRequested > balance.available) {
    errors.push(
      `Insufficient balance. Available: ${balance.available} days, Requested: ${daysRequested} days`
    );
  }

  // Check consecutive days limit
  if (policy.maxConsecutiveDays && daysRequested > policy.maxConsecutiveDays) {
    warnings.push(
      `Request exceeds ${policy.maxConsecutiveDays} consecutive days limit. Additional approval may be required.`
    );
  }

  // Check minimum notice period
  if (policy.minNoticeDays) {
    const requestDate = new Date();
    const start = new Date(startDate);
    const daysNotice = Math.ceil((start.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysNotice < policy.minNoticeDays) {
      warnings.push(
        `Less than ${policy.minNoticeDays} days notice provided (${daysNotice} days). May require manager override.`
      );
    }
  }

  // Check for overlapping leaves
  const supabase = createClient();
  const { data: overlappingLeaves } = await supabase
    .from('leaves')
    .select('*')
    .eq('employee_id', employeeId)
    .in('status', ['pending', 'approved'])
    .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

  const hasOverlap = overlappingLeaves?.some(leave => {
    return leave.start_date <= endDate && leave.end_date >= startDate;
  });

  if (hasOverlap) {
    errors.push('Leave request overlaps with existing leave');
  }

  // Check if sick leave needs medical certificate
  if (leaveType === 'sick' && daysRequested > 3) {
    warnings.push('Medical certificate required for sick leave exceeding 3 days');
  }

  const balanceAfterRequest = balance.available - daysRequested;

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    balanceAfterRequest,
  };
}

// ============================================================================
// TEAM / MANAGER VIEWS
// ============================================================================

/**
 * Get leave balances for all team members.
 */
export async function getTeamLeaveBalances(
  managerId: string,
  year: number = new Date().getFullYear()
): Promise<LeaveBalanceSummary[]> {
  const supabase = createClient();

  // Get all direct reports
  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .eq('manager_id', managerId)
    .eq('status', 'active');

  if (!employees?.length) return [];

  return Promise.all(
    employees.map(emp => getEmployeeLeaveBalances(emp.id, year))
  );
}

/**
 * Get low balance alerts for team.
 */
export async function getLowBalanceAlerts(
  managerId: string,
  threshold: number = 5
): Promise<Array<{ employee: string; leaveType: LeaveType; available: number }>> {
  const teamBalances = await getTeamLeaveBalances(managerId);
  const alerts: Array<{ employee: string; leaveType: LeaveType; available: number }> = [];

  for (const summary of teamBalances) {
    for (const balance of summary.balances) {
      // Only alert for annual/sick leave
      if (
        (balance.leaveType === 'annual' || balance.leaveType === 'sick') &&
        balance.available <= threshold &&
        balance.available >= 0
      ) {
        alerts.push({
          employee: summary.employeeName,
          leaveType: balance.leaveType,
          available: balance.available,
        });
      }
    }
  }

  return alerts.sort((a, b) => a.available - b.available);
}

// ============================================================================
// REPORTS
// ============================================================================

/**
 * Get leave utilization report.
 */
export interface LeaveUtilizationReport {
  year: number;
  byType: Record<LeaveType, {
    totalEntitled: number;
    totalUsed: number;
    totalPending: number;
    utilizationRate: number;
  }>;
  byDepartment: Array<{
    department: string;
    totalEmployees: number;
    averageUtilization: number;
  }>;
}

export async function getLeaveUtilizationReport(
  year: number = new Date().getFullYear()
): Promise<LeaveUtilizationReport> {
  const supabase = createClient();

  // Get all active employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, department')
    .eq('status', 'active');

  if (!employees?.length) {
    return {
      year,
      byType: {} as LeaveUtilizationReport['byType'],
      byDepartment: [],
    };
  }

  // Calculate totals by type
  const byType: LeaveUtilizationReport['byType'] = {} as LeaveUtilizationReport['byType'];
  const leaveTypes: LeaveType[] = ['annual', 'sick', 'unpaid', 'maternity', 'paternity', 'emergency', 'other'];

  for (const type of leaveTypes) {
    let totalEntitled = 0;
    let totalUsed = 0;
    let totalPending = 0;

    for (const emp of employees) {
      const balance = await getLeaveBalance(emp.id, type, year);
      totalEntitled += balance.accrued + balance.carryOver;
      totalUsed += balance.used;
      totalPending += balance.pending;
    }

    byType[type] = {
      totalEntitled,
      totalUsed,
      totalPending,
      utilizationRate: totalEntitled > 0 ? (totalUsed / totalEntitled) * 100 : 0,
    };
  }

  // Calculate by department
  const deptMap = new Map<string, { employees: number; totalUsed: number; totalEntitled: number }>();

  for (const emp of employees) {
    const dept = emp.department || 'Unassigned';
    const balance = await getLeaveBalance(emp.id, 'annual', year);
    
    const current = deptMap.get(dept) || { employees: 0, totalUsed: 0, totalEntitled: 0 };
    current.employees++;
    current.totalUsed += balance.used;
    current.totalEntitled += balance.accrued + balance.carryOver;
    deptMap.set(dept, current);
  }

  const byDepartment = Array.from(deptMap.entries()).map(([dept, data]) => ({
    department: dept,
    totalEmployees: data.employees,
    averageUtilization: data.totalEntitled > 0 ? (data.totalUsed / data.totalEntitled) * 100 : 0,
  }));

  return { year, byType, byDepartment };
}
