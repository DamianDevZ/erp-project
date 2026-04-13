export type ShiftStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface Shift {
  id: string;
  organization_id: string;
  employee_id: string;
  platform_id: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  actual_start_time: string | null;
  actual_end_time: string | null;
  status: ShiftStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  employee?: {
    id: string;
    full_name: string;
    employee_id: string;
  };
  platform?: {
    id: string;
    name: string;
  };
}

export interface CreateShiftInput {
  employee_id: string;
  platform_id?: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes?: number;
  status?: ShiftStatus;
  notes?: string;
}

export interface UpdateShiftInput extends Partial<CreateShiftInput> {
  actual_start_time?: string;
  actual_end_time?: string;
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
