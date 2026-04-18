-- T-036: Rider + vehicle pairing workflow
-- T-036-1: Replace vehicle of rider
-- Tracks vehicle assignments and handovers

-- Assignment status
CREATE TYPE vehicle_assignment_status AS ENUM (
  'pending',          -- Assignment requested, awaiting handover
  'active',           -- Vehicle currently assigned
  'returning',        -- Return initiated
  'completed',        -- Assignment ended
  'cancelled'         -- Assignment cancelled before handover
);

-- Handover type
CREATE TYPE handover_type AS ENUM (
  'assignment',       -- New assignment
  'replacement',      -- Vehicle replacement
  'return',           -- Return to company
  'transfer'          -- Transfer between riders
);

-- Vehicle assignment history table
CREATE TABLE vehicle_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Assignment details
  vehicle_id UUID NOT NULL REFERENCES assets(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  status vehicle_assignment_status NOT NULL DEFAULT 'pending',
  
  -- Previous assignment (for replacements/transfers)
  previous_assignment_id UUID REFERENCES vehicle_assignments(id),
  previous_vehicle_id UUID REFERENCES assets(id),
  
  -- Assignment period
  assigned_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  expected_return_date DATE,
  
  -- Handover out (company to rider)
  handover_out_date TIMESTAMPTZ,
  handover_out_type handover_type NOT NULL DEFAULT 'assignment',
  handover_out_by UUID REFERENCES employees(id),
  handover_out_odometer INTEGER,
  handover_out_fuel_level TEXT,
  handover_out_condition TEXT,
  handover_out_photos TEXT[],
  handover_out_notes TEXT,
  handover_out_checklist JSONB,
  
  -- Handover in (rider to company)
  handover_in_date TIMESTAMPTZ,
  handover_in_by UUID REFERENCES employees(id),
  handover_in_odometer INTEGER,
  handover_in_fuel_level TEXT,
  handover_in_condition TEXT,
  handover_in_photos TEXT[],
  handover_in_notes TEXT,
  handover_in_checklist JSONB,
  
  -- Damage/issues tracking
  damages_found JSONB,
  damage_charges NUMERIC(10,2) DEFAULT 0,
  deduction_agreement_id UUID,
  
  -- Deposit tracking
  deposit_amount NUMERIC(10,2),
  deposit_received BOOLEAN DEFAULT false,
  deposit_returned BOOLEAN DEFAULT false,
  deposit_deductions NUMERIC(10,2) DEFAULT 0,
  
  -- Metadata
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES employees(id),
  
  -- Ensure only one active assignment per vehicle
  CONSTRAINT one_active_assignment_per_vehicle EXCLUDE USING btree (
    vehicle_id WITH =
  ) WHERE (status IN ('pending', 'active', 'returning'))
);

-- Indexes
CREATE INDEX idx_va_org ON vehicle_assignments(organization_id);
CREATE INDEX idx_va_vehicle ON vehicle_assignments(vehicle_id);
CREATE INDEX idx_va_employee ON vehicle_assignments(employee_id);
CREATE INDEX idx_va_status ON vehicle_assignments(status);
CREATE INDEX idx_va_assigned_at ON vehicle_assignments(assigned_at);
CREATE INDEX idx_va_returned_at ON vehicle_assignments(returned_at);

-- Enable RLS
ALTER TABLE vehicle_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicle_assignments_org_isolation" ON vehicle_assignments
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- Trigger for updated_at
CREATE TRIGGER vehicle_assignments_updated_at
  BEFORE UPDATE ON vehicle_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View: Current vehicle assignments
CREATE OR REPLACE VIEW current_vehicle_assignments AS
SELECT 
  va.id,
  va.organization_id,
  va.vehicle_id,
  a.license_plate,
  a.make,
  a.model,
  a.asset_number,
  va.employee_id,
  e.full_name AS rider_name,
  e.employee_id AS rider_code,
  va.status,
  va.assigned_at,
  va.handover_out_date,
  va.handover_out_type,
  va.handover_out_odometer,
  va.expected_return_date,
  va.deposit_amount,
  va.deposit_received,
  EXTRACT(DAYS FROM NOW() - va.assigned_at) AS days_assigned,
  a.vehicle_status,
  a.compliance_status AS vehicle_compliance
FROM vehicle_assignments va
JOIN assets a ON va.vehicle_id = a.id
JOIN employees e ON va.employee_id = e.id
WHERE va.status IN ('pending', 'active', 'returning')
  AND a.deleted_at IS NULL
  AND e.deleted_at IS NULL;

-- View: Assignment history with details
CREATE OR REPLACE VIEW vehicle_assignment_history AS
SELECT 
  va.id,
  va.organization_id,
  va.vehicle_id,
  a.license_plate,
  a.make || ' ' || a.model AS vehicle_name,
  va.employee_id,
  e.full_name AS rider_name,
  va.status,
  va.handover_out_type,
  va.assigned_at,
  va.returned_at,
  va.handover_out_odometer,
  va.handover_in_odometer,
  COALESCE(va.handover_in_odometer - va.handover_out_odometer, 0) AS km_driven,
  EXTRACT(DAYS FROM COALESCE(va.returned_at, NOW()) - va.assigned_at) AS days_used,
  va.damages_found IS NOT NULL AND jsonb_array_length(COALESCE(va.damages_found, '[]'::jsonb)) > 0 AS had_damages,
  va.damage_charges,
  va.notes
FROM vehicle_assignments va
JOIN assets a ON va.vehicle_id = a.id
JOIN employees e ON va.employee_id = e.id
WHERE a.deleted_at IS NULL
  AND e.deleted_at IS NULL
ORDER BY va.created_at DESC;

-- View: Vehicles available for assignment
CREATE OR REPLACE VIEW available_vehicles AS
SELECT 
  a.id AS vehicle_id,
  a.organization_id,
  a.license_plate,
  a.make,
  a.model,
  a.year,
  a.asset_number,
  a.vehicle_status,
  a.compliance_status,
  a.is_spare,
  a.odometer_reading,
  a.next_service_date,
  a.registration_expiry,
  a.insurance_expiry,
  CASE 
    WHEN a.compliance_status = 'blocked' THEN 'Compliance blocked'
    WHEN a.vehicle_status IN ('maintenance', 'off_road', 'disposed') THEN 'Not operational: ' || a.vehicle_status::text
    WHEN a.registration_expiry < CURRENT_DATE THEN 'Registration expired'
    WHEN a.insurance_expiry < CURRENT_DATE THEN 'Insurance expired'
    ELSE NULL
  END AS unavailable_reason
FROM assets a
WHERE a.type = 'vehicle'
  AND a.is_active = true
  AND a.deleted_at IS NULL
  AND a.assigned_employee_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM vehicle_assignments va 
    WHERE va.vehicle_id = a.id 
    AND va.status IN ('pending', 'active', 'returning')
  );

-- Function to assign vehicle to rider
CREATE OR REPLACE FUNCTION assign_vehicle_to_rider(
  p_vehicle_id UUID,
  p_employee_id UUID,
  p_handover_type handover_type DEFAULT 'assignment',
  p_deposit_amount NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_assignment_id UUID;
  v_org_id UUID;
  v_prev_assignment_id UUID;
BEGIN
  -- Get organization from vehicle
  SELECT organization_id INTO v_org_id FROM assets WHERE id = p_vehicle_id;
  
  -- Check for existing active assignment on this vehicle
  SELECT id INTO v_prev_assignment_id
  FROM vehicle_assignments
  WHERE vehicle_id = p_vehicle_id AND status = 'active'
  LIMIT 1;
  
  IF v_prev_assignment_id IS NOT NULL THEN
    -- Mark existing assignment as returning/completed if this is a replacement
    UPDATE vehicle_assignments 
    SET status = 'returning', 
        returned_at = NOW(),
        updated_at = NOW()
    WHERE id = v_prev_assignment_id;
  END IF;
  
  -- Create new assignment
  INSERT INTO vehicle_assignments (
    organization_id,
    vehicle_id,
    employee_id,
    status,
    handover_out_type,
    previous_assignment_id,
    deposit_amount,
    notes,
    created_by
  ) VALUES (
    v_org_id,
    p_vehicle_id,
    p_employee_id,
    'pending',
    p_handover_type,
    v_prev_assignment_id,
    p_deposit_amount,
    p_notes,
    p_created_by
  )
  RETURNING id INTO v_assignment_id;
  
  RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete handover out (vehicle issued to rider)
CREATE OR REPLACE FUNCTION complete_handover_out(
  p_assignment_id UUID,
  p_odometer INTEGER,
  p_fuel_level TEXT DEFAULT NULL,
  p_condition TEXT DEFAULT NULL,
  p_photos TEXT[] DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_checklist JSONB DEFAULT NULL,
  p_handed_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_vehicle_id UUID;
  v_employee_id UUID;
BEGIN
  -- Get assignment details
  SELECT vehicle_id, employee_id INTO v_vehicle_id, v_employee_id
  FROM vehicle_assignments WHERE id = p_assignment_id;
  
  -- Update assignment
  UPDATE vehicle_assignments SET
    status = 'active',
    assigned_at = NOW(),
    handover_out_date = NOW(),
    handover_out_by = p_handed_by,
    handover_out_odometer = p_odometer,
    handover_out_fuel_level = p_fuel_level,
    handover_out_condition = p_condition,
    handover_out_photos = p_photos,
    handover_out_notes = p_notes,
    handover_out_checklist = p_checklist,
    deposit_received = (deposit_amount IS NOT NULL),
    updated_at = NOW()
  WHERE id = p_assignment_id;
  
  -- Update asset assigned_employee_id
  UPDATE assets SET
    assigned_employee_id = v_employee_id,
    odometer_reading = p_odometer,
    last_odometer_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = v_vehicle_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to complete handover in (vehicle returned)
CREATE OR REPLACE FUNCTION complete_handover_in(
  p_assignment_id UUID,
  p_odometer INTEGER,
  p_fuel_level TEXT DEFAULT NULL,
  p_condition TEXT DEFAULT NULL,
  p_photos TEXT[] DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_checklist JSONB DEFAULT NULL,
  p_damages JSONB DEFAULT NULL,
  p_damage_charges NUMERIC DEFAULT 0,
  p_received_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_vehicle_id UUID;
BEGIN
  -- Get vehicle id
  SELECT vehicle_id INTO v_vehicle_id
  FROM vehicle_assignments WHERE id = p_assignment_id;
  
  -- Update assignment
  UPDATE vehicle_assignments SET
    status = 'completed',
    returned_at = NOW(),
    handover_in_date = NOW(),
    handover_in_by = p_received_by,
    handover_in_odometer = p_odometer,
    handover_in_fuel_level = p_fuel_level,
    handover_in_condition = p_condition,
    handover_in_photos = p_photos,
    handover_in_notes = p_notes,
    handover_in_checklist = p_checklist,
    damages_found = p_damages,
    damage_charges = p_damage_charges,
    deposit_returned = (deposit_amount IS NOT NULL AND p_damage_charges = 0),
    deposit_deductions = p_damage_charges,
    updated_at = NOW()
  WHERE id = p_assignment_id;
  
  -- Clear asset assignment
  UPDATE assets SET
    assigned_employee_id = NULL,
    odometer_reading = p_odometer,
    last_odometer_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = v_vehicle_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to replace rider's vehicle
CREATE OR REPLACE FUNCTION replace_rider_vehicle(
  p_employee_id UUID,
  p_new_vehicle_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_return_odometer INTEGER DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_old_assignment_id UUID;
  v_new_assignment_id UUID;
  v_old_vehicle_id UUID;
BEGIN
  -- Find current active assignment for this rider
  SELECT id, vehicle_id INTO v_old_assignment_id, v_old_vehicle_id
  FROM vehicle_assignments
  WHERE employee_id = p_employee_id AND status = 'active'
  ORDER BY assigned_at DESC
  LIMIT 1;
  
  IF v_old_assignment_id IS NOT NULL THEN
    -- Complete the old assignment
    PERFORM complete_handover_in(
      v_old_assignment_id,
      COALESCE(p_return_odometer, (SELECT odometer_reading FROM assets WHERE id = v_old_vehicle_id)),
      NULL, -- fuel level
      NULL, -- condition
      NULL, -- photos
      p_reason -- notes
    );
  END IF;
  
  -- Create new assignment as replacement
  v_new_assignment_id := assign_vehicle_to_rider(
    p_new_vehicle_id,
    p_employee_id,
    'replacement'::handover_type,
    NULL, -- deposit
    p_reason,
    p_created_by
  );
  
  -- Link to previous assignment
  UPDATE vehicle_assignments 
  SET previous_vehicle_id = v_old_vehicle_id
  WHERE id = v_new_assignment_id;
  
  RETURN v_new_assignment_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE vehicle_assignments IS 'Tracks all vehicle assignments with full handover workflow';
COMMENT ON FUNCTION assign_vehicle_to_rider IS 'Create a new vehicle assignment';
COMMENT ON FUNCTION complete_handover_out IS 'Complete the handover of a vehicle to a rider';
COMMENT ON FUNCTION complete_handover_in IS 'Complete the return of a vehicle from a rider';
COMMENT ON FUNCTION replace_rider_vehicle IS 'Replace riders current vehicle with a new one';
