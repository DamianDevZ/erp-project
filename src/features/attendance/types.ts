/**
 * Attendance types and interfaces.
 * GPS-based check-in/out tracking for riders.
 */

export type AttendanceStatus = 
  | 'checked_in'
  | 'checked_out'
  | 'no_show'
  | 'late'
  | 'early_leave'
  | 'approved'
  | 'disputed';

export type CheckInMethod = 'manual' | 'gps' | 'qr_code' | 'biometric';

/** Attendance exception type (T-028) */
export type AttendanceExceptionType =
  | 'missed_checkin'
  | 'missed_checkout'
  | 'late_arrival'
  | 'early_departure'
  | 'manual_entry'
  | 'gps_mismatch'
  | 'overtime_unapproved';

/** Exception resolution status (T-028) */
export type ExceptionResolutionStatus = 'pending' | 'approved' | 'rejected' | 'auto_resolved';

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  no_show: 'No Show',
  late: 'Late',
  early_leave: 'Early Leave',
  approved: 'Approved',
  disputed: 'Disputed',
};

export const CHECK_IN_METHOD_LABELS: Record<CheckInMethod, string> = {
  manual: 'Manual Entry',
  gps: 'GPS (Mobile App)',
  qr_code: 'QR Code',
  biometric: 'Biometric',
};

export const EXCEPTION_TYPE_LABELS: Record<AttendanceExceptionType, string> = {
  missed_checkin: 'Missed Check-in',
  missed_checkout: 'Missed Check-out',
  late_arrival: 'Late Arrival',
  early_departure: 'Early Departure',
  manual_entry: 'Manual Entry',
  gps_mismatch: 'GPS Location Mismatch',
  overtime_unapproved: 'Unapproved Overtime',
};

export const RESOLUTION_STATUS_LABELS: Record<ExceptionResolutionStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  auto_resolved: 'Auto-Resolved',
};

/**
 * Attendance entity.
 */
export interface Attendance {
  id: string;
  organization_id: string;
  employee_id: string;
  shift_id: string | null;
  platform_id: string | null;
  attendance_date: string;
  // Scheduled times
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  // Check-in
  check_in_time: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_in_location_name: string | null;
  check_in_method: CheckInMethod;
  // Check-out
  check_out_time: string | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  check_out_location_name: string | null;
  check_out_method: CheckInMethod;
  // Break
  break_start_time: string | null;
  break_end_time: string | null;
  break_duration_minutes: number;
  // Hours
  scheduled_hours: number | null;
  worked_hours: number | null;
  overtime_hours: number;
  // Status
  status: AttendanceStatus;
  late_minutes: number;
  early_leave_minutes: number;
  // Approval
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  // T-028: Exception tracking
  has_exception: boolean;
  exception_type: AttendanceExceptionType | null;
  exception_notes: string | null;
  is_manual_entry: boolean;
  manual_entry_reason: string | null;
  approval_status: ExceptionResolutionStatus;
  rejection_reason: string | null;
  supervisor_id: string | null;
  notes: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Attendance with related data.
 */
export interface AttendanceWithRelations extends Attendance {
  employee: {
    id: string;
    full_name: string;
    employee_id: string | null;
  };
  shift?: {
    id: string;
    start_time: string;
    end_time: string;
  } | null;
  platform?: {
    id: string;
    name: string;
  } | null;
  approver?: {
    id: string;
    full_name: string;
  } | null;
}

/**
 * Input for creating attendance.
 */
export interface CreateAttendanceInput {
  employee_id: string;
  shift_id?: string;
  platform_id?: string;
  attendance_date: string;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  check_in_time?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
  check_in_location_name?: string;
  check_in_method?: CheckInMethod;
  notes?: string;
}

/**
 * Input for checking out.
 */
export interface CheckOutInput {
  check_out_time: string;
  check_out_latitude?: number;
  check_out_longitude?: number;
  check_out_location_name?: string;
  check_out_method?: CheckInMethod;
}

/**
 * Input for approving attendance.
 */
export interface ApproveAttendanceInput {
  approved_by: string;
  approval_notes?: string;
}

// ========================================
// T-028: Attendance Exception Tracking
// ========================================

/**
 * Attendance exception entity.
 */
export interface AttendanceException {
  id: string;
  organization_id: string;
  attendance_id: string;
  employee_id: string;
  
  // Exception details
  exception_type: AttendanceExceptionType;
  exception_date: string;
  description: string;
  
  // Expected vs actual
  expected_time: string | null;
  actual_time: string | null;
  variance_minutes: number | null;
  
  // GPS data
  expected_location_lat: number | null;
  expected_location_lng: number | null;
  actual_location_lat: number | null;
  actual_location_lng: number | null;
  distance_variance_meters: number | null;
  
  // Resolution
  resolution_status: ExceptionResolutionStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  
  // Auto-detection
  is_auto_detected: boolean;
  detection_rule: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Pending attendance approval view.
 */
export interface PendingAttendanceApproval {
  attendance_id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  worked_hours: number | null;
  is_manual_entry: boolean;
  manual_entry_reason: string | null;
  exception_id: string | null;
  exception_type: AttendanceExceptionType | null;
  exception_description: string | null;
  variance_minutes: number | null;
  exception_created_at: string | null;
}

/**
 * Input for resolving an attendance exception.
 */
export interface ResolveExceptionInput {
  resolution: 'approved' | 'rejected';
  notes?: string;
}

/**
 * Input for creating manual attendance.
 */
export interface CreateManualAttendanceInput {
  employee_id: string;
  attendance_date: string;
  check_in_time: string;
  check_out_time: string;
  reason: string;
}
