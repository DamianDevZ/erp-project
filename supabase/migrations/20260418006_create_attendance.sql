-- Migration: Create attendance table
-- Task: T-011 - Attendance tracking with GPS check-in/out

-- Attendance records for riders, linked to shifts.
-- Supports GPS-based check-in/out and manual approval.

CREATE TYPE attendance_status AS ENUM (
  'checked_in',   -- Currently working
  'checked_out',  -- Completed for the day
  'no_show',      -- Did not show up
  'late',         -- Arrived late
  'early_leave',  -- Left before shift end
  'approved',     -- Manually approved despite issues
  'disputed'      -- Under review
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Core links
  employee_id UUID NOT NULL REFERENCES employees(id),
  shift_id UUID REFERENCES shifts(id), -- Can be null for ad-hoc attendance
  
  -- Context
  platform_id UUID REFERENCES platforms(id), -- Which aggregator they worked for
  
  -- Date of attendance
  attendance_date DATE NOT NULL,
  
  -- Scheduled times (from shift or manual entry)
  scheduled_start_time TIME DEFAULT NULL,
  scheduled_end_time TIME DEFAULT NULL,
  
  -- Actual check-in
  check_in_time TIMESTAMPTZ DEFAULT NULL,
  check_in_latitude DECIMAL(10,7) DEFAULT NULL,
  check_in_longitude DECIMAL(10,7) DEFAULT NULL,
  check_in_location_name TEXT DEFAULT NULL, -- Resolved address/location
  check_in_method TEXT DEFAULT 'manual', -- manual, gps, qr_code, biometric
  
  -- Actual check-out
  check_out_time TIMESTAMPTZ DEFAULT NULL,
  check_out_latitude DECIMAL(10,7) DEFAULT NULL,
  check_out_longitude DECIMAL(10,7) DEFAULT NULL,
  check_out_location_name TEXT DEFAULT NULL,
  check_out_method TEXT DEFAULT 'manual',
  
  -- Break tracking
  break_start_time TIMESTAMPTZ DEFAULT NULL,
  break_end_time TIMESTAMPTZ DEFAULT NULL,
  break_duration_minutes INTEGER DEFAULT 0,
  
  -- Calculated hours
  scheduled_hours DECIMAL(5,2) DEFAULT NULL,
  worked_hours DECIMAL(5,2) DEFAULT NULL,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  
  -- Status
  status attendance_status DEFAULT 'checked_in',
  
  -- Late/early tracking
  late_minutes INTEGER DEFAULT 0,
  early_leave_minutes INTEGER DEFAULT 0,
  
  -- Approval workflow (T-028)
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ DEFAULT NULL,
  approval_notes TEXT DEFAULT NULL,
  
  -- Notes
  notes TEXT DEFAULT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_attendance_organization_id ON attendance(organization_id);
CREATE INDEX idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX idx_attendance_shift_id ON attendance(shift_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_attendance_requires_approval ON attendance(requires_approval) WHERE requires_approval = true;

-- Unique constraint: one attendance record per employee per date per shift
CREATE UNIQUE INDEX idx_attendance_unique ON attendance(organization_id, employee_id, attendance_date, shift_id);

-- RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendance_org_isolation ON attendance
  USING (organization_id = public.get_user_organization_id());

-- Comments
COMMENT ON TABLE attendance IS 'Rider attendance records with GPS check-in/out and approval workflow';
COMMENT ON COLUMN attendance.check_in_method IS 'How check-in was recorded: manual, gps (mobile app), qr_code, biometric';
COMMENT ON COLUMN attendance.late_minutes IS 'Minutes late arriving (auto-calculated if check_in_time > scheduled_start_time)';
