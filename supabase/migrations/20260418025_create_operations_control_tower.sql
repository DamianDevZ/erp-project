-- T-037: Live operations control tower view
-- Real-time rider status dashboard for operations team

-- Rider operational status (more granular than shift status)
CREATE TYPE rider_ops_status AS ENUM (
  'offline',          -- Not working
  'clocked_in',       -- Clocked in but not on shift
  'on_shift',         -- Active on shift
  'on_delivery',      -- Currently delivering
  'on_break',         -- On scheduled break
  'incident',         -- Dealing with incident/breakdown
  'returning'         -- Returning to base/area
);

-- View: Control tower - all riders operational status
CREATE OR REPLACE VIEW operations_control_tower AS
SELECT 
  e.id AS employee_id,
  e.organization_id,
  e.employee_id AS rider_code,
  e.full_name AS rider_name,
  e.phone,
  e.rider_category,
  
  -- Eligibility status
  re.eligibility_status,
  re.license_status,
  re.visa_status,
  
  -- Vehicle info
  re.assigned_vehicle_id,
  re.assigned_vehicle_plate,
  a.make || ' ' || a.model AS vehicle_name,
  a.vehicle_status,
  a.odometer_reading,
  
  -- Current shift
  s.id AS current_shift_id,
  s.status AS shift_status,
  s.shift_date,
  s.start_time AS shift_start,
  s.end_time AS shift_end,
  p.id AS platform_id,
  p.name AS platform_name,
  
  -- Attendance
  att.id AS attendance_id,
  att.check_in_time,
  att.check_out_time,
  att.status AS attendance_status,
  
  -- Operational status
  CASE 
    WHEN att.check_in_time IS NULL THEN 'offline'::rider_ops_status
    WHEN att.check_out_time IS NOT NULL THEN 'offline'::rider_ops_status
    WHEN s.id IS NULL THEN 'clocked_in'::rider_ops_status
    WHEN s.status = 'in_progress' THEN 'on_shift'::rider_ops_status
    WHEN s.status = 'scheduled' THEN 'clocked_in'::rider_ops_status
    ELSE 'on_shift'::rider_ops_status
  END AS ops_status,
  
  -- Time tracking
  EXTRACT(HOURS FROM NOW() - att.check_in_time) AS hours_worked_today,
  
  -- Timestamps
  att.check_in_time AS last_seen_at,
  e.updated_at AS profile_updated_at

FROM employees e
JOIN rider_eligibility re ON e.id = re.employee_id
LEFT JOIN assets a ON a.id = re.assigned_vehicle_id

-- Current shift (today's active or in-progress shift)
LEFT JOIN shifts s ON (
  s.employee_id = e.id
  AND s.shift_date = CURRENT_DATE
  AND s.status IN ('scheduled', 'in_progress')
)
LEFT JOIN platforms p ON s.platform_id = p.id

-- Today's attendance
LEFT JOIN attendance att ON (
  att.employee_id = e.id
  AND att.attendance_date = CURRENT_DATE
  AND att.check_out_time IS NULL  -- Still clocked in
)

WHERE e.role = 'rider'
  AND e.status = 'active'
  AND e.deleted_at IS NULL;

-- View: Platform-level operations summary
CREATE OR REPLACE VIEW platform_operations_summary AS
SELECT 
  oct.organization_id,
  oct.platform_id,
  oct.platform_name,
  COUNT(*) FILTER (WHERE oct.ops_status != 'offline') AS riders_online,
  COUNT(*) FILTER (WHERE oct.ops_status = 'on_shift') AS riders_on_shift,
  COUNT(*) FILTER (WHERE oct.ops_status = 'on_delivery') AS riders_delivering,
  COUNT(*) FILTER (WHERE oct.ops_status = 'on_break') AS riders_on_break,
  COUNT(*) FILTER (WHERE oct.ops_status = 'incident') AS riders_with_incidents,
  COUNT(*) FILTER (WHERE oct.eligibility_status = 'eligible') AS fully_eligible,
  COUNT(*) FILTER (WHERE oct.eligibility_status = 'conditional') AS conditionally_eligible,
  COUNT(*) AS total_assigned_riders
FROM operations_control_tower oct
WHERE oct.platform_id IS NOT NULL
GROUP BY oct.organization_id, oct.platform_id, oct.platform_name;

-- View: Fleet status summary
CREATE OR REPLACE VIEW fleet_operations_summary AS
SELECT 
  a.organization_id,
  COUNT(*) FILTER (WHERE a.vehicle_status = 'available') AS vehicles_available,
  COUNT(*) FILTER (WHERE a.vehicle_status = 'assigned') AS vehicles_assigned,
  COUNT(*) FILTER (WHERE a.vehicle_status = 'maintenance') AS vehicles_maintenance,
  COUNT(*) FILTER (WHERE a.vehicle_status = 'off_road') AS vehicles_off_road,
  COUNT(*) FILTER (WHERE a.is_spare = true AND a.vehicle_status = 'available') AS spare_vehicles_ready,
  COUNT(*) FILTER (WHERE a.compliance_status = 'compliant') AS vehicles_compliant,
  COUNT(*) FILTER (WHERE a.compliance_status = 'expiring_soon') AS vehicles_expiring_soon,
  COUNT(*) FILTER (WHERE a.compliance_status IN ('non_compliant', 'blocked')) AS vehicles_non_compliant,
  COUNT(*) AS total_vehicles
FROM assets a
WHERE a.type = 'vehicle'
  AND a.is_active = true
  AND a.deleted_at IS NULL
GROUP BY a.organization_id;

-- View: Today's shift roster with real-time status
CREATE OR REPLACE VIEW todays_shift_roster AS
SELECT 
  s.id AS shift_id,
  s.organization_id,
  s.employee_id,
  e.full_name AS rider_name,
  e.employee_id AS rider_code,
  e.phone AS rider_phone,
  s.platform_id,
  p.name AS platform_name,
  s.status AS shift_status,
  s.shift_date,
  s.start_time,
  s.end_time,
  EXTRACT(HOURS FROM s.end_time - s.start_time) AS scheduled_hours,
  
  -- Vehicle
  av.id AS vehicle_id,
  av.license_plate,
  av.vehicle_status,
  
  -- Attendance
  att.check_in_time,
  att.check_out_time,
  CASE 
    WHEN att.check_in_time IS NULL AND (s.shift_date + s.start_time) < NOW() THEN 'late'
    WHEN att.check_in_time IS NULL THEN 'not_started'
    WHEN att.check_out_time IS NOT NULL THEN 'completed'
    ELSE 'in_progress'
  END AS attendance_status,
  
  -- Time variance
  CASE WHEN att.check_in_time IS NOT NULL THEN
    EXTRACT(MINUTES FROM att.check_in_time - (s.shift_date + s.start_time))
  END AS clock_in_variance_minutes

FROM shifts s
JOIN employees e ON s.employee_id = e.id
LEFT JOIN platforms p ON s.platform_id = p.id
LEFT JOIN assets av ON s.vehicle_id = av.id OR av.assigned_employee_id = e.id
LEFT JOIN attendance att ON (
  att.employee_id = e.id 
  AND att.attendance_date = CURRENT_DATE
)
WHERE s.shift_date = CURRENT_DATE
  AND e.deleted_at IS NULL
ORDER BY s.start_time, s.platform_id;

-- View: Operations alerts
CREATE OR REPLACE VIEW operations_alerts AS
SELECT 
  'rider_late' AS alert_type,
  'warning' AS severity,
  e.organization_id,
  e.id AS entity_id,
  'employee' AS entity_type,
  e.full_name || ' is late for shift (scheduled: ' || to_char(s.start_time, 'HH24:MI') || ')' AS message,
  s.id AS related_shift_id,
  s.platform_id,
  NOW() AS created_at
FROM shifts s
JOIN employees e ON s.employee_id = e.id
LEFT JOIN attendance att ON (
  att.employee_id = e.id 
  AND att.attendance_date = CURRENT_DATE
)
WHERE s.shift_date = CURRENT_DATE
  AND (s.shift_date + s.start_time) < NOW()
  AND (s.shift_date + s.start_time) > NOW() - INTERVAL '4 hours'
  AND att.check_in_time IS NULL
  AND s.status = 'scheduled'
  AND e.deleted_at IS NULL

UNION ALL

SELECT 
  'vehicle_issue' AS alert_type,
  'critical' AS severity,
  a.organization_id,
  a.id AS entity_id,
  'vehicle' AS entity_type,
  a.license_plate || ' is ' || a.vehicle_status::text || ' - rider may need spare' AS message,
  va.id AS related_shift_id,
  NULL AS platform_id,
  NOW() AS created_at
FROM assets a
JOIN vehicle_assignments va ON va.vehicle_id = a.id AND va.status = 'active'
WHERE a.type = 'vehicle'
  AND a.vehicle_status IN ('maintenance', 'off_road')
  AND a.deleted_at IS NULL

UNION ALL

SELECT 
  'document_expiring' AS alert_type,
  'warning' AS severity,
  re.organization_id,
  re.employee_id AS entity_id,
  'employee' AS entity_type,
  re.full_name || ': ' || 
    CASE 
      WHEN re.license_status = 'expiring_soon' THEN 'License expiring soon'
      WHEN re.visa_status = 'expiring_soon' THEN 'Visa expiring soon'
    END AS message,
  NULL AS related_shift_id,
  NULL AS platform_id,
  NOW() AS created_at
FROM rider_eligibility re
WHERE re.eligibility_status = 'conditional'
  AND (re.license_status = 'expiring_soon' OR re.visa_status = 'expiring_soon');

-- Control tower summary for dashboard header
CREATE OR REPLACE VIEW operations_control_tower_summary AS
SELECT 
  organization_id,
  COUNT(*) FILTER (WHERE ops_status != 'offline') AS riders_online,
  COUNT(*) FILTER (WHERE ops_status = 'on_shift') AS riders_on_shift,
  COUNT(*) FILTER (WHERE ops_status = 'clocked_in') AS riders_clocked_in,
  COUNT(*) FILTER (WHERE ops_status = 'offline') AS riders_offline,
  COUNT(*) FILTER (WHERE eligibility_status = 'eligible') AS eligible_riders,
  COUNT(*) FILTER (WHERE eligibility_status = 'conditional') AS conditional_riders,
  COUNT(*) FILTER (WHERE eligibility_status = 'ineligible') AS ineligible_riders,
  COUNT(*) AS total_riders
FROM operations_control_tower
GROUP BY organization_id;

COMMENT ON VIEW operations_control_tower IS 'Real-time rider status for operations team';
COMMENT ON VIEW platform_operations_summary IS 'Platform-level operations metrics';
COMMENT ON VIEW fleet_operations_summary IS 'Fleet status overview';
COMMENT ON VIEW todays_shift_roster IS 'Today shift roster with attendance status';
COMMENT ON VIEW operations_alerts IS 'Active operations alerts requiring attention';
