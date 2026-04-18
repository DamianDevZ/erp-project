-- T-028: Attendance approval flow
-- Handles missed check-ins, manual overrides, and supervisor approval

-- Attendance exception type
CREATE TYPE attendance_exception_type AS ENUM (
  'missed_checkin',
  'missed_checkout',
  'late_arrival',
  'early_departure',
  'manual_entry',
  'gps_mismatch',
  'overtime_unapproved'
);

-- Exception resolution status
CREATE TYPE exception_resolution_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'auto_resolved'
);

-- Add approval fields to attendance table (some may already exist)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS has_exception BOOLEAN DEFAULT false;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS exception_type attendance_exception_type;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS exception_notes TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN DEFAULT false;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS manual_entry_reason TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS approval_status exception_resolution_status DEFAULT 'pending';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES employees(id);

-- Attendance exceptions table (for detailed exception tracking)
CREATE TABLE attendance_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  attendance_id UUID NOT NULL REFERENCES attendance(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  
  -- Exception details
  exception_type attendance_exception_type NOT NULL,
  exception_date DATE NOT NULL,
  description TEXT NOT NULL,
  
  -- Expected vs actual
  expected_time TIME,
  actual_time TIME,
  variance_minutes INTEGER,
  
  -- GPS data (for location exceptions)
  expected_location_lat DECIMAL(10,7),
  expected_location_lng DECIMAL(10,7),
  actual_location_lat DECIMAL(10,7),
  actual_location_lng DECIMAL(10,7),
  distance_variance_meters INTEGER,
  
  -- Resolution
  resolution_status exception_resolution_status DEFAULT 'pending',
  resolved_by UUID REFERENCES user_profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Auto-detection
  is_auto_detected BOOLEAN DEFAULT false,
  detection_rule TEXT, -- Which rule triggered this
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE attendance_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org exceptions" ON attendance_exceptions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own org exceptions" ON attendance_exceptions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_has_exception ON attendance(employee_id, has_exception) WHERE has_exception = true;
CREATE INDEX IF NOT EXISTS idx_attendance_approval_status ON attendance(organization_id, requires_approval, approval_status) WHERE requires_approval = true;
CREATE INDEX idx_exceptions_pending ON attendance_exceptions(organization_id, resolution_status) WHERE resolution_status = 'pending';
CREATE INDEX idx_exceptions_employee ON attendance_exceptions(employee_id, exception_date);

-- Function to create manual attendance entry
CREATE OR REPLACE FUNCTION create_manual_attendance(
  p_organization_id UUID,
  p_employee_id UUID,
  p_attendance_date DATE,
  p_check_in_time TIMESTAMPTZ,
  p_check_out_time TIMESTAMPTZ,
  p_reason TEXT,
  p_created_by UUID
)
RETURNS attendance AS $$
DECLARE
  v_attendance attendance;
  v_hours_worked DECIMAL(5,2);
BEGIN
  -- Calculate hours worked
  v_hours_worked := EXTRACT(EPOCH FROM (p_check_out_time - p_check_in_time)) / 3600;
  
  -- Insert attendance record
  INSERT INTO attendance (
    organization_id, employee_id, attendance_date, 
    check_in_time, check_out_time, worked_hours, status, 
    is_manual_entry, manual_entry_reason,
    requires_approval, approval_status, supervisor_id
  ) VALUES (
    p_organization_id, p_employee_id, p_attendance_date, 
    p_check_in_time, p_check_out_time,
    v_hours_worked, 'approved', 
    true, p_reason,
    true, 'pending', p_created_by
  )
  RETURNING * INTO v_attendance;
  
  -- Create exception record
  INSERT INTO attendance_exceptions (
    organization_id, attendance_id, employee_id,
    exception_type, exception_date, description,
    is_auto_detected
  ) VALUES (
    p_organization_id, v_attendance.id, p_employee_id,
    'manual_entry', p_attendance_date, p_reason,
    false
  );
  
  RETURN v_attendance;
END;
$$ LANGUAGE plpgsql;

-- Function to approve/reject attendance exception
CREATE OR REPLACE FUNCTION resolve_attendance_exception(
  p_exception_id UUID,
  p_resolution exception_resolution_status,
  p_resolved_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS attendance_exceptions AS $$
DECLARE
  v_exception attendance_exceptions;
BEGIN
  -- Update the exception
  UPDATE attendance_exceptions
  SET 
    resolution_status = p_resolution,
    resolved_by = p_resolved_by,
    resolved_at = now(),
    resolution_notes = p_notes,
    updated_at = now()
  WHERE id = p_exception_id
  RETURNING * INTO v_exception;
  
  -- Update attendance record approval status
  UPDATE attendance
  SET 
    approval_status = p_resolution,
    approved_by = p_resolved_by,
    approved_at = CASE WHEN p_resolution = 'approved' THEN now() ELSE NULL END,
    rejection_reason = CASE WHEN p_resolution = 'rejected' THEN p_notes ELSE NULL END,
    updated_at = now()
  WHERE id = v_exception.attendance_id;
  
  RETURN v_exception;
END;
$$ LANGUAGE plpgsql;

-- View for pending attendance approvals
CREATE OR REPLACE VIEW pending_attendance_approvals AS
SELECT 
  a.id AS attendance_id,
  a.organization_id,
  a.employee_id,
  e.full_name AS employee_name,
  a.attendance_date,
  a.check_in_time,
  a.check_out_time,
  a.worked_hours,
  a.is_manual_entry,
  a.manual_entry_reason,
  ae.id AS exception_id,
  ae.exception_type,
  ae.description AS exception_description,
  ae.variance_minutes,
  ae.created_at AS exception_created_at
FROM attendance a
JOIN employees e ON a.employee_id = e.id
LEFT JOIN attendance_exceptions ae ON ae.attendance_id = a.id AND ae.resolution_status = 'pending'
WHERE a.requires_approval = true
  AND a.approval_status = 'pending'
ORDER BY a.attendance_date DESC, e.full_name;
