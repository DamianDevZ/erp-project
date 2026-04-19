'use client';

/**
 * Attendance Approval Flow Service (T-028)
 * 
 * Handles attendance exceptions requiring manual intervention:
 * - Missed check-ins/check-outs
 * - Late arrivals
 * - Manual time corrections
 * - Supervisor approvals
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type AttendanceExceptionType = 
  | 'missed_checkin'
  | 'missed_checkout'
  | 'late_checkin'
  | 'early_checkout'
  | 'gps_mismatch'
  | 'time_correction'
  | 'manual_entry'
  | 'shift_swap';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved';

export interface AttendanceException {
  id: string;
  attendanceId: string | null;
  shiftId: string;
  employeeId: string;
  employeeName: string;
  exceptionType: AttendanceExceptionType;
  description: string;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  originalCheckIn: string | null;
  originalCheckOut: string | null;
  reason: string;
  evidenceUrls: string[];
  status: ApprovalStatus;
  supervisorId: string | null;
  supervisorName: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface AttendanceApprovalRequest {
  shiftId: string;
  employeeId: string;
  exceptionType: AttendanceExceptionType;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
  evidenceUrls?: string[];
}

export interface AttendanceApprovalStats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
  avgApprovalTime: number; // hours
  byType: Record<AttendanceExceptionType, number>;
}

// ============================================================================
// LABELS
// ============================================================================

export const EXCEPTION_TYPE_LABELS: Record<AttendanceExceptionType, string> = {
  missed_checkin: 'Missed Check-In',
  missed_checkout: 'Missed Check-Out',
  late_checkin: 'Late Check-In',
  early_checkout: 'Early Check-Out',
  gps_mismatch: 'GPS Mismatch',
  time_correction: 'Time Correction',
  manual_entry: 'Manual Entry',
  shift_swap: 'Shift Swap',
};

// ============================================================================
// EXCEPTION DETECTION
// ============================================================================

/**
 * Detect attendance exceptions for a shift (run after shift end).
 */
export async function detectShiftExceptions(shiftId: string): Promise<AttendanceException[]> {
  const supabase = createClient();
  const exceptions: AttendanceException[] = [];
  
  // Get shift details
  const { data: shift } = await supabase
    .from('shifts')
    .select('*')
    .eq('id', shiftId)
    .single();
  
  if (!shift) return [];
  
  // Get all assignments for this shift
  const { data: assignments } = await supabase
    .from('shift_assignments')
    .select(`
      employee_id,
      employee:employees(id, full_name)
    `)
    .eq('shift_id', shiftId)
    .eq('status', 'assigned');
  
  const shiftStart = new Date(`${shift.shift_date}T${shift.start_time}`);
  const shiftEnd = new Date(`${shift.shift_date}T${shift.end_time}`);
  const lateThresholdMs = 15 * 60 * 1000; // 15 minutes
  
  for (const assignment of assignments || []) {
    const employeeData = assignment.employee as unknown;
    const employee = (Array.isArray(employeeData) ? employeeData[0] : employeeData) as { id: string; full_name: string } | null;
    if (!employee) continue;
    
    // Get attendance record
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('shift_id', shiftId)
      .eq('employee_id', assignment.employee_id)
      .single();
    
    // No attendance record - missed check-in
    if (!attendance) {
      exceptions.push({
        id: `exc-${shiftId}-${assignment.employee_id}-missed`,
        attendanceId: null,
        shiftId,
        employeeId: assignment.employee_id,
        employeeName: employee.full_name,
        exceptionType: 'missed_checkin',
        description: 'No check-in recorded for shift',
        requestedCheckIn: null,
        requestedCheckOut: null,
        originalCheckIn: null,
        originalCheckOut: null,
        reason: '',
        evidenceUrls: [],
        status: 'pending',
        supervisorId: null,
        supervisorName: null,
        approvedAt: null,
        rejectionReason: null,
        createdAt: new Date().toISOString(),
      });
      continue;
    }
    
    // Check for late check-in
    if (attendance.check_in_time) {
      const checkIn = new Date(attendance.check_in_time);
      if (checkIn.getTime() - shiftStart.getTime() > lateThresholdMs) {
        const minutesLate = Math.round((checkIn.getTime() - shiftStart.getTime()) / 60000);
        exceptions.push({
          id: `exc-${attendance.id}-late`,
          attendanceId: attendance.id,
          shiftId,
          employeeId: assignment.employee_id,
          employeeName: employee.full_name,
          exceptionType: 'late_checkin',
          description: `Checked in ${minutesLate} minutes late`,
          requestedCheckIn: null,
          requestedCheckOut: null,
          originalCheckIn: attendance.check_in_time,
          originalCheckOut: attendance.check_out_time,
          reason: '',
          evidenceUrls: [],
          status: minutesLate <= 30 ? 'auto_approved' : 'pending', // Auto-approve minor delays
          supervisorId: null,
          supervisorName: null,
          approvedAt: minutesLate <= 30 ? new Date().toISOString() : null,
          rejectionReason: null,
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    // Check for missed check-out
    if (attendance.check_in_time && !attendance.check_out_time && new Date() > shiftEnd) {
      exceptions.push({
        id: `exc-${attendance.id}-no-checkout`,
        attendanceId: attendance.id,
        shiftId,
        employeeId: assignment.employee_id,
        employeeName: employee.full_name,
        exceptionType: 'missed_checkout',
        description: 'No check-out recorded after shift end',
        requestedCheckIn: null,
        requestedCheckOut: null,
        originalCheckIn: attendance.check_in_time,
        originalCheckOut: null,
        reason: '',
        evidenceUrls: [],
        status: 'pending',
        supervisorId: null,
        supervisorName: null,
        approvedAt: null,
        rejectionReason: null,
        createdAt: new Date().toISOString(),
      });
    }
    
    // Check for GPS mismatch (if applicable)
    if (attendance.gps_checkin_valid === false || attendance.gps_checkout_valid === false) {
      exceptions.push({
        id: `exc-${attendance.id}-gps`,
        attendanceId: attendance.id,
        shiftId,
        employeeId: assignment.employee_id,
        employeeName: employee.full_name,
        exceptionType: 'gps_mismatch',
        description: 'GPS location does not match expected work location',
        requestedCheckIn: null,
        requestedCheckOut: null,
        originalCheckIn: attendance.check_in_time,
        originalCheckOut: attendance.check_out_time,
        reason: '',
        evidenceUrls: [],
        status: 'pending',
        supervisorId: null,
        supervisorName: null,
        approvedAt: null,
        rejectionReason: null,
        createdAt: new Date().toISOString(),
      });
    }
  }
  
  // Save exceptions to database
  if (exceptions.length > 0) {
    const toInsert = exceptions.map(e => ({
      attendance_id: e.attendanceId,
      shift_id: e.shiftId,
      employee_id: e.employeeId,
      exception_type: e.exceptionType,
      description: e.description,
      original_check_in: e.originalCheckIn,
      original_check_out: e.originalCheckOut,
      status: e.status,
      approved_at: e.approvedAt,
    }));
    
    await supabase.from('attendance_exceptions').insert(toInsert);
  }
  
  return exceptions;
}

// ============================================================================
// APPROVAL REQUESTS
// ============================================================================

/**
 * Submit an attendance correction request.
 */
export async function submitAttendanceRequest(
  request: AttendanceApprovalRequest,
  requestedBy: string
): Promise<{ success: boolean; exceptionId?: string; error?: string }> {
  const supabase = createClient();
  
  // Get employee name
  const { data: employee } = await supabase
    .from('employees')
    .select('full_name, manager_id')
    .eq('id', request.employeeId)
    .single();
  
  if (!employee) {
    return { success: false, error: 'Employee not found' };
  }
  
  // Create exception record
  const { data, error } = await supabase
    .from('attendance_exceptions')
    .insert({
      shift_id: request.shiftId,
      employee_id: request.employeeId,
      exception_type: request.exceptionType,
      description: EXCEPTION_TYPE_LABELS[request.exceptionType],
      requested_check_in: request.requestedCheckIn,
      requested_check_out: request.requestedCheckOut,
      reason: request.reason,
      evidence_urls: request.evidenceUrls || [],
      status: 'pending',
      requested_by: requestedBy,
      supervisor_id: employee.manager_id,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Notify supervisor
  if (employee.manager_id) {
    await supabase.from('notifications').insert({
      type: 'attendance_approval_needed',
      title: 'Attendance Approval Required',
      message: `${employee.full_name} submitted a ${EXCEPTION_TYPE_LABELS[request.exceptionType]} request`,
      target_type: 'employee',
      target_id: request.employeeId,
      user_id: employee.manager_id,
      status: 'unread',
    });
  }
  
  return { success: true, exceptionId: data.id };
}

/**
 * Approve an attendance exception.
 */
export async function approveAttendanceException(
  exceptionId: string,
  approvedBy: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Get exception
  const { data: exception } = await supabase
    .from('attendance_exceptions')
    .select('*')
    .eq('id', exceptionId)
    .single();
  
  if (!exception) {
    return { success: false, error: 'Exception not found' };
  }
  
  if (exception.status !== 'pending') {
    return { success: false, error: 'Exception already processed' };
  }
  
  // Update exception
  const { error: updateError } = await supabase
    .from('attendance_exceptions')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      approval_notes: notes,
    })
    .eq('id', exceptionId);
  
  if (updateError) {
    return { success: false, error: updateError.message };
  }
  
  // Apply the correction to attendance record
  if (exception.attendance_id) {
    const updates: Record<string, unknown> = {};
    if (exception.requested_check_in) updates.check_in_time = exception.requested_check_in;
    if (exception.requested_check_out) updates.check_out_time = exception.requested_check_out;
    updates.manual_override = true;
    updates.override_by = approvedBy;
    updates.override_reason = exception.reason;
    
    await supabase
      .from('attendance')
      .update(updates)
      .eq('id', exception.attendance_id);
  } else if (exception.exception_type === 'missed_checkin' || exception.exception_type === 'manual_entry') {
    // Create new attendance record
    await supabase.from('attendance').insert({
      employee_id: exception.employee_id,
      shift_id: exception.shift_id,
      work_date: exception.shift_id ? undefined : new Date().toISOString().split('T')[0],
      check_in_time: exception.requested_check_in,
      check_out_time: exception.requested_check_out,
      status: 'present',
      manual_override: true,
      override_by: approvedBy,
      override_reason: exception.reason,
    });
  }
  
  // Notify employee
  await supabase.from('notifications').insert({
    type: 'attendance_approved',
    title: 'Attendance Request Approved',
    message: `Your ${EXCEPTION_TYPE_LABELS[exception.exception_type as AttendanceExceptionType]} request has been approved`,
    target_type: 'attendance',
    target_id: exceptionId,
    user_id: exception.employee_id,
    status: 'unread',
  });
  
  return { success: true };
}

/**
 * Reject an attendance exception.
 */
export async function rejectAttendanceException(
  exceptionId: string,
  rejectedBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('attendance_exceptions')
    .update({
      status: 'rejected',
      approved_by: rejectedBy,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', exceptionId)
    .eq('status', 'pending');
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Get exception for notification
  const { data: exception } = await supabase
    .from('attendance_exceptions')
    .select('employee_id, exception_type')
    .eq('id', exceptionId)
    .single();
  
  if (exception) {
    await supabase.from('notifications').insert({
      type: 'attendance_rejected',
      title: 'Attendance Request Rejected',
      message: `Your ${EXCEPTION_TYPE_LABELS[exception.exception_type as AttendanceExceptionType]} request was rejected: ${reason}`,
      target_type: 'attendance',
      target_id: exceptionId,
      user_id: exception.employee_id,
      status: 'unread',
    });
  }
  
  return { success: true };
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get pending exceptions for supervisor approval.
 */
export async function getPendingExceptions(supervisorId: string): Promise<AttendanceException[]> {
  const supabase = createClient();
  
  // Get employees reporting to this supervisor
  const { data: directReports } = await supabase
    .from('employees')
    .select('id')
    .eq('manager_id', supervisorId);
  
  const employeeIds = directReports?.map(e => e.id) || [];
  if (employeeIds.length === 0) return [];
  
  const { data } = await supabase
    .from('attendance_exceptions')
    .select(`
      *,
      employee:employees(full_name),
      shift:shifts(shift_date, start_time, end_time)
    `)
    .in('employee_id', employeeIds)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  
  return (data || []).map(mapExceptionRow);
}

/**
 * Get exception history for an employee.
 */
export async function getEmployeeExceptionHistory(
  employeeId: string,
  limit: number = 50
): Promise<AttendanceException[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('attendance_exceptions')
    .select(`
      *,
      employee:employees(full_name),
      supervisor:employees!attendance_exceptions_approved_by_fkey(full_name)
    `)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return (data || []).map(mapExceptionRow);
}

/**
 * Get approval statistics.
 */
export async function getApprovalStats(): Promise<AttendanceApprovalStats> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];
  
  const { data: pending } = await supabase
    .from('attendance_exceptions')
    .select('id')
    .eq('status', 'pending');
  
  const { data: approvedToday } = await supabase
    .from('attendance_exceptions')
    .select('id')
    .eq('status', 'approved')
    .gte('approved_at', `${today}T00:00:00`);
  
  const { data: rejectedToday } = await supabase
    .from('attendance_exceptions')
    .select('id')
    .eq('status', 'rejected')
    .gte('approved_at', `${today}T00:00:00`);
  
  const { data: byType } = await supabase
    .from('attendance_exceptions')
    .select('exception_type')
    .eq('status', 'pending');
  
  const typeCount: Record<AttendanceExceptionType, number> = {
    missed_checkin: 0,
    missed_checkout: 0,
    late_checkin: 0,
    early_checkout: 0,
    gps_mismatch: 0,
    time_correction: 0,
    manual_entry: 0,
    shift_swap: 0,
  };
  
  for (const item of byType || []) {
    if (item.exception_type in typeCount) {
      typeCount[item.exception_type as AttendanceExceptionType]++;
    }
  }
  
  // Calculate average approval time (in hours)
  const { data: resolved } = await supabase
    .from('attendance_exceptions')
    .select('created_at, approved_at')
    .in('status', ['approved', 'rejected'])
    .not('approved_at', 'is', null)
    .gte('approved_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  
  let avgApprovalTime = 0;
  if (resolved && resolved.length > 0) {
    const totalHours = resolved.reduce((sum, r) => {
      const created = new Date(r.created_at).getTime();
      const approved = new Date(r.approved_at).getTime();
      return sum + (approved - created) / (1000 * 60 * 60);
    }, 0);
    avgApprovalTime = Math.round(totalHours / resolved.length);
  }
  
  return {
    pending: pending?.length || 0,
    approvedToday: approvedToday?.length || 0,
    rejectedToday: rejectedToday?.length || 0,
    avgApprovalTime,
    byType: typeCount,
  };
}

function mapExceptionRow(row: Record<string, unknown>): AttendanceException {
  const employeeData = row.employee as unknown;
  const employee = (Array.isArray(employeeData) ? employeeData[0] : employeeData) as { full_name: string } | null;
  const supervisorData = row.supervisor as unknown;
  const supervisor = (Array.isArray(supervisorData) ? supervisorData[0] : supervisorData) as { full_name: string } | null;
  
  return {
    id: row.id as string,
    attendanceId: row.attendance_id as string | null,
    shiftId: row.shift_id as string,
    employeeId: row.employee_id as string,
    employeeName: employee?.full_name || 'Unknown',
    exceptionType: row.exception_type as AttendanceExceptionType,
    description: row.description as string,
    requestedCheckIn: row.requested_check_in as string | null,
    requestedCheckOut: row.requested_check_out as string | null,
    originalCheckIn: row.original_check_in as string | null,
    originalCheckOut: row.original_check_out as string | null,
    reason: row.reason as string || '',
    evidenceUrls: (row.evidence_urls as string[]) || [],
    status: row.status as ApprovalStatus,
    supervisorId: row.approved_by as string | null,
    supervisorName: supervisor?.full_name || null,
    approvedAt: row.approved_at as string | null,
    rejectionReason: row.rejection_reason as string | null,
    createdAt: row.created_at as string,
  };
}
