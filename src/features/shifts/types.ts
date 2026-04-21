export type ShiftStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export type ShiftType = 'regular' | 'overtime' | 'on_call' | 'training' | 'split';

export interface Shift {
  id: string;
  organization_id: string;
  employee_id: string;
  client_id: string | null;
  vehicle_id: string | null;
  zone_id: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  actual_start_time: string | null;
  actual_end_time: string | null;
  status: ShiftStatus;
  shift_type: ShiftType;
  
  // Vehicle assignment
  is_vehicle_assigned: boolean;
  vehicle_assigned_at: string | null;
  vehicle_assigned_by: string | null;
  
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  employee?: {
    id: string;
    full_name: string;
    employee_id: string;
    compliance_status?: string;
  };
  client?: {
    id: string;
    name: string;
  };
  vehicle?: {
    id: string;
    license_plate: string;
    model: string;
  };
}

/**
 * Shift assignment entity - links employees to shifts.
 */
export interface ShiftAssignment {
  id: string;
  organization_id: string;
  shift_id: string;
  employee_id: string;
  vehicle_id: string | null;
  assigned_by: string | null;
  status: 'assigned' | 'confirmed' | 'declined' | 'no_show' | 'completed';
  check_in_time: string | null;
  check_out_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Related data from joins
  employee?: {
    id: string;
    full_name: string;
    employee_number: string | null;
    phone: string | null;
  };
  vehicle?: {
    id: string;
    name: string;
    license_plate: string | null;
  };
  shift?: Shift;
}

export interface ShiftTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  break_minutes: number;
  platform_id: string | null;
  client_id: string | null;
  zone_id: string | null;
  required_riders: number;
  shift_type: ShiftType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftRoster {
  shift_id: string;
  organization_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: ShiftStatus;
  shift_type: ShiftType;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  compliance_status: string | null;
  platform_id: string | null;
  platform_name: string | null;
  client_id: string | null;
  client_name: string | null;
  vehicle_id: string | null;
  vehicle_plate: string | null;
  vehicle_model: string | null;
  is_vehicle_assigned: boolean;
  attendance_id: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  attendance_status: string | null;
}

export interface CreateShiftInput {
  employee_id: string;
  platform_id?: string;
  client_id?: string;
  vehicle_id?: string;
  zone_id?: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes?: number;
  status?: ShiftStatus;
  shift_type?: ShiftType;
  notes?: string;
}

export interface UpdateShiftInput extends Partial<CreateShiftInput> {
  actual_start_time?: string;
  actual_end_time?: string;
  is_vehicle_assigned?: boolean;
}

export const SHIFT_STATUS_LABELS: Record<ShiftStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

// Helper to calculate shift duration in hours
export function calculateShiftHours(startTime: string, endTime: string, breakMinutes: number = 0): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // Overnight shift
  
  totalMinutes -= breakMinutes;
  return Math.max(0, totalMinutes / 60);
}
