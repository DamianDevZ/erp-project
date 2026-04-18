-- T-044: Spare vehicle dispatch logic
-- Assign spare when breakdown reported

-- Spare dispatch status
CREATE TYPE spare_dispatch_status AS ENUM (
  'requested',
  'approved',
  'dispatched',
  'en_route',
  'arrived',
  'assigned',
  'returned',
  'cancelled'
);

-- Spare vehicle dispatches table
CREATE TABLE spare_vehicle_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  dispatch_number text NOT NULL,
  
  -- Related entities
  incident_id uuid REFERENCES incidents(id),
  original_vehicle_id uuid REFERENCES assets(id),
  spare_vehicle_id uuid NOT NULL REFERENCES assets(id),
  rider_id uuid NOT NULL REFERENCES employees(id),
  
  -- Request details
  requested_at timestamptz NOT NULL DEFAULT now(),
  requested_by uuid REFERENCES employees(id),
  request_reason text,
  dispatch_location text,
  dispatch_latitude numeric(10, 7),
  dispatch_longitude numeric(10, 7),
  
  -- Approval (if required)
  requires_approval boolean DEFAULT false,
  approved_at timestamptz,
  approved_by uuid REFERENCES employees(id),
  
  -- Dispatch tracking
  dispatched_at timestamptz,
  dispatched_by uuid REFERENCES employees(id),
  driver_id uuid REFERENCES employees(id),  -- Who is delivering the spare
  expected_arrival timestamptz,
  
  -- Arrival/Handover
  arrived_at timestamptz,
  handed_over_at timestamptz,
  handover_odometer integer,
  handover_notes text,
  handover_photos text[],
  
  -- Return tracking
  return_requested_at timestamptz,
  returned_at timestamptz,
  return_odometer integer,
  return_condition text,
  return_notes text,
  
  -- Status
  status spare_dispatch_status NOT NULL DEFAULT 'requested',
  cancelled_at timestamptz,
  cancellation_reason text,
  
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, dispatch_number)
);

-- Indexes
CREATE INDEX idx_spare_dispatches_org_status ON spare_vehicle_dispatches(organization_id, status);
CREATE INDEX idx_spare_dispatches_incident ON spare_vehicle_dispatches(incident_id);
CREATE INDEX idx_spare_dispatches_spare ON spare_vehicle_dispatches(spare_vehicle_id);
CREATE INDEX idx_spare_dispatches_rider ON spare_vehicle_dispatches(rider_id);
CREATE INDEX idx_spare_dispatches_active ON spare_vehicle_dispatches(status) 
  WHERE status NOT IN ('returned', 'cancelled');

-- Function to generate dispatch number
CREATE OR REPLACE FUNCTION generate_spare_dispatch_number(p_org_id uuid)
RETURNS text AS $$
DECLARE
  v_count integer;
  v_date text;
BEGIN
  v_date := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM spare_vehicle_dispatches
  WHERE organization_id = p_org_id
    AND created_at::date = CURRENT_DATE;
  
  RETURN 'SPR-' || v_date || '-' || LPAD(v_count::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to get available spare vehicles
CREATE OR REPLACE FUNCTION get_available_spare_vehicles(p_org_id uuid)
RETURNS TABLE (
  vehicle_id uuid,
  name text,
  license_plate text,
  category text,
  current_location_id uuid,
  current_location_name text,
  last_used_date date,
  odometer_reading integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id AS vehicle_id,
    a.name,
    a.license_plate,
    a.category::text,
    a.current_location_id,
    l.name AS current_location_name,
    (
      SELECT MAX(svd.returned_at)::date 
      FROM spare_vehicle_dispatches svd 
      WHERE svd.spare_vehicle_id = a.id AND svd.status = 'returned'
    ) AS last_used_date,
    a.odometer_reading
  FROM assets a
  LEFT JOIN locations l ON a.current_location_id = l.id
  WHERE a.organization_id = p_org_id
    AND a.type = 'vehicle'
    AND a.vehicle_status = 'available'
    AND a.is_active = true
    AND a.deleted_at IS NULL
    -- Not currently dispatched
    AND NOT EXISTS (
      SELECT 1 FROM spare_vehicle_dispatches svd
      WHERE svd.spare_vehicle_id = a.id
        AND svd.status NOT IN ('returned', 'cancelled')
    )
    -- Not assigned to anyone
    AND a.assigned_employee_id IS NULL
  ORDER BY a.name;
END;
$$ LANGUAGE plpgsql;

-- Function to dispatch spare vehicle
CREATE OR REPLACE FUNCTION dispatch_spare_vehicle(
  p_org_id uuid,
  p_incident_id uuid,
  p_spare_vehicle_id uuid,
  p_rider_id uuid,
  p_dispatched_by uuid,
  p_driver_id uuid DEFAULT NULL,
  p_expected_arrival_minutes integer DEFAULT 60,
  p_dispatch_location text DEFAULT NULL,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_dispatch_id uuid;
  v_dispatch_number text;
  v_original_vehicle_id uuid;
BEGIN
  -- Get original vehicle from incident
  SELECT asset_id INTO v_original_vehicle_id
  FROM incidents
  WHERE id = p_incident_id;
  
  -- Generate dispatch number
  v_dispatch_number := generate_spare_dispatch_number(p_org_id);
  
  -- Create dispatch record
  INSERT INTO spare_vehicle_dispatches (
    organization_id, dispatch_number, incident_id, original_vehicle_id,
    spare_vehicle_id, rider_id, requested_by, dispatched_at, dispatched_by,
    driver_id, expected_arrival, dispatch_location, dispatch_latitude,
    dispatch_longitude, status, notes
  ) VALUES (
    p_org_id, v_dispatch_number, p_incident_id, v_original_vehicle_id,
    p_spare_vehicle_id, p_rider_id, p_dispatched_by, now(), p_dispatched_by,
    p_driver_id, now() + (p_expected_arrival_minutes || ' minutes')::interval,
    p_dispatch_location, p_latitude, p_longitude, 'dispatched', p_notes
  )
  RETURNING id INTO v_dispatch_id;
  
  -- Update spare vehicle status
  UPDATE assets
  SET vehicle_status = 'assigned',
      updated_at = now()
  WHERE id = p_spare_vehicle_id;
  
  -- Update incident
  UPDATE incidents
  SET spare_vehicle_id = p_spare_vehicle_id,
      spare_dispatched_at = now(),
      updated_at = now()
  WHERE id = p_incident_id;
  
  RETURN v_dispatch_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark spare vehicle arrived
CREATE OR REPLACE FUNCTION spare_vehicle_arrived(
  p_dispatch_id uuid,
  p_handover_odometer integer DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE spare_vehicle_dispatches
  SET status = 'arrived',
      arrived_at = now(),
      handover_odometer = p_handover_odometer,
      handover_notes = COALESCE(p_notes, handover_notes),
      updated_at = now()
  WHERE id = p_dispatch_id;
  
  -- Update related incident
  UPDATE incidents i
  SET spare_arrived_at = now(),
      updated_at = now()
  FROM spare_vehicle_dispatches svd
  WHERE svd.id = p_dispatch_id
    AND i.id = svd.incident_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete handover
CREATE OR REPLACE FUNCTION complete_spare_handover(
  p_dispatch_id uuid,
  p_rider_id uuid
)
RETURNS void AS $$
DECLARE
  v_spare_id uuid;
BEGIN
  SELECT spare_vehicle_id INTO v_spare_id
  FROM spare_vehicle_dispatches
  WHERE id = p_dispatch_id;
  
  UPDATE spare_vehicle_dispatches
  SET status = 'assigned',
      handed_over_at = now(),
      updated_at = now()
  WHERE id = p_dispatch_id;
  
  -- Temporarily assign spare to rider
  UPDATE assets
  SET assigned_employee_id = p_rider_id,
      updated_at = now()
  WHERE id = v_spare_id;
END;
$$ LANGUAGE plpgsql;

-- Function to return spare vehicle
CREATE OR REPLACE FUNCTION return_spare_vehicle(
  p_dispatch_id uuid,
  p_return_odometer integer DEFAULT NULL,
  p_return_condition text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_spare_id uuid;
BEGIN
  SELECT spare_vehicle_id INTO v_spare_id
  FROM spare_vehicle_dispatches
  WHERE id = p_dispatch_id;
  
  UPDATE spare_vehicle_dispatches
  SET status = 'returned',
      returned_at = now(),
      return_odometer = p_return_odometer,
      return_condition = p_return_condition,
      return_notes = p_notes,
      updated_at = now()
  WHERE id = p_dispatch_id;
  
  -- Release spare vehicle
  UPDATE assets
  SET vehicle_status = 'available',
      assigned_employee_id = NULL,
      odometer_reading = COALESCE(p_return_odometer, odometer_reading),
      updated_at = now()
  WHERE id = v_spare_id;
END;
$$ LANGUAGE plpgsql;

-- View: Active spare dispatches
CREATE OR REPLACE VIEW active_spare_dispatches AS
SELECT 
  svd.id,
  svd.organization_id,
  svd.dispatch_number,
  svd.incident_id,
  i.incident_number,
  i.incident_type,
  svd.original_vehicle_id,
  ov.license_plate AS original_vehicle_plate,
  svd.spare_vehicle_id,
  sv.license_plate AS spare_vehicle_plate,
  sv.name AS spare_vehicle_name,
  svd.rider_id,
  r.full_name AS rider_name,
  r.phone AS rider_phone,
  svd.driver_id,
  d.full_name AS driver_name,
  svd.dispatch_location,
  svd.status,
  svd.requested_at,
  svd.dispatched_at,
  svd.expected_arrival,
  svd.arrived_at,
  svd.handed_over_at,
  EXTRACT(MINUTES FROM (now() - svd.dispatched_at)) AS minutes_since_dispatch,
  CASE 
    WHEN svd.status = 'dispatched' AND svd.expected_arrival < now() THEN true
    ELSE false
  END AS is_overdue
FROM spare_vehicle_dispatches svd
LEFT JOIN incidents i ON svd.incident_id = i.id
LEFT JOIN assets ov ON svd.original_vehicle_id = ov.id
JOIN assets sv ON svd.spare_vehicle_id = sv.id
JOIN employees r ON svd.rider_id = r.id
LEFT JOIN employees d ON svd.driver_id = d.id
WHERE svd.status NOT IN ('returned', 'cancelled');

-- View: Spare dispatch metrics
CREATE OR REPLACE VIEW spare_dispatch_metrics AS
SELECT 
  svd.organization_id,
  COUNT(*) AS total_dispatches,
  COUNT(*) FILTER (WHERE svd.status NOT IN ('returned', 'cancelled')) AS active_dispatches,
  COUNT(*) FILTER (WHERE svd.status = 'returned') AS completed_dispatches,
  COUNT(*) FILTER (WHERE svd.status = 'cancelled') AS cancelled_dispatches,
  AVG(EXTRACT(EPOCH FROM (svd.arrived_at - svd.dispatched_at)) / 60) 
    FILTER (WHERE svd.arrived_at IS NOT NULL) AS avg_arrival_minutes,
  AVG(EXTRACT(EPOCH FROM (svd.returned_at - svd.handed_over_at)) / 60) 
    FILTER (WHERE svd.returned_at IS NOT NULL) AS avg_assignment_minutes,
  COUNT(*) FILTER (WHERE svd.expected_arrival < svd.arrived_at) AS late_arrivals
FROM spare_vehicle_dispatches svd
GROUP BY svd.organization_id;

-- Enable RLS
ALTER TABLE spare_vehicle_dispatches ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY spare_dispatches_org_isolation ON spare_vehicle_dispatches
  FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_spare_dispatch_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_spare_vehicles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION dispatch_spare_vehicle(uuid, uuid, uuid, uuid, uuid, uuid, integer, text, numeric, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION spare_vehicle_arrived(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_spare_handover(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION return_spare_vehicle(uuid, integer, text, text) TO authenticated;
