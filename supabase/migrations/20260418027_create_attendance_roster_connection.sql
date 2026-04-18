-- T-039: Attendance to operations roster connection
-- Connects attendance records to shift status and operations roster

-- Function to get attendance status for a shift
CREATE OR REPLACE FUNCTION get_shift_attendance_status(p_shift_id uuid)
RETURNS TABLE (
  attendance_id uuid,
  check_in_time timestamptz,
  check_out_time timestamptz,
  actual_hours numeric,
  scheduled_hours numeric,
  variance_hours numeric,
  is_late boolean,
  late_minutes integer,
  left_early boolean,
  early_minutes integer,
  overtime_minutes integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    att.id,
    att.check_in_time,
    att.check_out_time,
    EXTRACT(hours FROM COALESCE(att.check_out_time, now()) - att.check_in_time)::numeric AS actual_hours,
    EXTRACT(hours FROM s.end_time - s.start_time)::numeric AS scheduled_hours,
    EXTRACT(hours FROM COALESCE(att.check_out_time, now()) - att.check_in_time)::numeric 
      - EXTRACT(hours FROM s.end_time - s.start_time)::numeric AS variance_hours,
    att.check_in_time > (s.shift_date + s.start_time + interval '5 minutes') AS is_late,
    GREATEST(0, EXTRACT(minutes FROM att.check_in_time - (s.shift_date + s.start_time)))::integer AS late_minutes,
    att.check_out_time IS NOT NULL 
      AND att.check_out_time < (s.shift_date + s.end_time - interval '5 minutes') AS left_early,
    GREATEST(0, EXTRACT(minutes FROM (s.shift_date + s.end_time) - att.check_out_time))::integer AS early_minutes,
    GREATEST(0, EXTRACT(minutes FROM COALESCE(att.check_out_time, now()) - (s.shift_date + s.end_time)))::integer AS overtime_minutes
  FROM shifts s
  LEFT JOIN attendance att ON att.employee_id = s.employee_id 
    AND att.attendance_date = s.shift_date
  WHERE s.id = p_shift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to start shift when rider clocks in
CREATE OR REPLACE FUNCTION start_shift_on_clock_in()
RETURNS TRIGGER AS $$
BEGIN
  -- When attendance is created (check-in), start any scheduled shift for today
  IF TG_OP = 'INSERT' AND NEW.check_in_time IS NOT NULL THEN
    UPDATE shifts 
    SET status = 'in_progress',
        actual_start_time = NEW.check_in_time,
        updated_at = now()
    WHERE employee_id = NEW.employee_id 
      AND shift_date = NEW.attendance_date
      AND status = 'scheduled';
  END IF;
  
  -- When check_out_time is set, complete the shift
  IF TG_OP = 'UPDATE' AND NEW.check_out_time IS NOT NULL AND OLD.check_out_time IS NULL THEN
    UPDATE shifts 
    SET status = 'completed',
        actual_end_time = NEW.check_out_time,
        updated_at = now()
    WHERE employee_id = NEW.employee_id 
      AND shift_date = NEW.attendance_date
      AND status = 'in_progress';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for attendance sync
DROP TRIGGER IF EXISTS attendance_shift_sync ON attendance;
CREATE TRIGGER attendance_shift_sync
  AFTER INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION start_shift_on_clock_in();

-- View: Detailed roster with attendance metrics
CREATE OR REPLACE VIEW roster_attendance_details AS
SELECT 
  s.id AS shift_id,
  s.organization_id,
  s.employee_id,
  e.full_name AS rider_name,
  e.employee_id AS rider_code,
  e.phone AS rider_phone,
  s.platform_id,
  p.name AS platform_name,
  s.shift_date,
  s.start_time AS scheduled_start,
  s.end_time AS scheduled_end,
  EXTRACT(hours FROM s.end_time - s.start_time) AS scheduled_hours,
  s.status AS shift_status,
  -- Attendance details
  att.id AS attendance_id,
  att.check_in_time AS actual_start,
  att.check_out_time AS actual_end,
  att.status AS attendance_record_status,
  -- Variance calculations
  CASE 
    WHEN att.check_in_time IS NULL THEN NULL
    ELSE EXTRACT(minutes FROM att.check_in_time - (s.shift_date + s.start_time)::timestamptz)::integer
  END AS clock_in_variance_minutes,
  CASE 
    WHEN att.check_out_time IS NULL THEN NULL
    ELSE EXTRACT(minutes FROM att.check_out_time - (s.shift_date + s.end_time)::timestamptz)::integer
  END AS clock_out_variance_minutes,
  -- Hours worked
  CASE
    WHEN att.check_in_time IS NULL THEN 0
    WHEN att.check_out_time IS NULL THEN EXTRACT(hours FROM now() - att.check_in_time)
    ELSE EXTRACT(hours FROM att.check_out_time - att.check_in_time)
  END AS hours_worked,
  -- Status flags
  att.check_in_time IS NOT NULL AND att.check_in_time > (s.shift_date + s.start_time + interval '5 minutes')::timestamptz AS is_late,
  att.check_out_time IS NOT NULL AND att.check_out_time < (s.shift_date + s.end_time - interval '5 minutes')::timestamptz AS left_early,
  -- Current status
  CASE
    WHEN att.check_in_time IS NULL AND (s.shift_date + s.start_time)::timestamptz > now() THEN 'scheduled'
    WHEN att.check_in_time IS NULL AND (s.shift_date + s.start_time)::timestamptz <= now() THEN 'absent'
    WHEN att.check_out_time IS NOT NULL THEN 'completed'
    ELSE 'working'
  END AS current_status,
  -- Vehicle info
  COALESCE(s.vehicle_id, av.id) AS vehicle_id,
  av.license_plate,
  av.vehicle_status
FROM shifts s
JOIN employees e ON s.employee_id = e.id
LEFT JOIN platforms p ON s.platform_id = p.id
LEFT JOIN attendance att ON att.employee_id = e.id AND att.attendance_date = s.shift_date
LEFT JOIN assets av ON av.id = s.vehicle_id OR av.assigned_employee_id = e.id
WHERE e.deleted_at IS NULL;

-- View: Attendance summary by shift/date for payroll
CREATE OR REPLACE VIEW shift_attendance_summary AS
SELECT
  s.organization_id,
  s.shift_date,
  s.platform_id,
  p.name AS platform_name,
  COUNT(DISTINCT s.id) AS total_shifts,
  COUNT(DISTINCT CASE WHEN att.check_in_time IS NOT NULL THEN s.id END) AS shifts_started,
  COUNT(DISTINCT CASE WHEN att.check_out_time IS NOT NULL THEN s.id END) AS shifts_completed,
  COUNT(DISTINCT CASE WHEN att.check_in_time IS NULL AND (s.shift_date + s.start_time)::timestamptz < now() THEN s.id END) AS no_shows,
  COUNT(DISTINCT CASE WHEN att.check_in_time > (s.shift_date + s.start_time + interval '5 minutes')::timestamptz THEN s.id END) AS late_arrivals,
  SUM(EXTRACT(hours FROM s.end_time - s.start_time)) AS total_scheduled_hours,
  SUM(
    CASE WHEN att.check_out_time IS NOT NULL THEN 
      EXTRACT(hours FROM att.check_out_time - att.check_in_time)
    WHEN att.check_in_time IS NOT NULL THEN
      EXTRACT(hours FROM now() - att.check_in_time)
    ELSE 0 END
  ) AS total_actual_hours
FROM shifts s
JOIN platforms p ON s.platform_id = p.id
LEFT JOIN attendance att ON att.employee_id = s.employee_id AND att.attendance_date = s.shift_date
GROUP BY s.organization_id, s.shift_date, s.platform_id, p.name;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_shift_attendance_status(uuid) TO authenticated;
