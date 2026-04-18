-- T-035: Rider allocation rules by aggregator
-- Tracks which riders can work for which platforms

-- Allocation status
CREATE TYPE rider_platform_allocation_status AS ENUM (
  'pending',       -- Awaiting approval or requirements
  'active',        -- Approved and can be assigned shifts
  'suspended',     -- Temporarily suspended from platform
  'revoked',       -- Permanently removed from platform
  'expired'        -- Allocation period ended
);

-- Allocation type
CREATE TYPE rider_allocation_type AS ENUM (
  'primary',       -- Main platform assignment
  'secondary',     -- Additional platform assignment
  'backup'         -- Only for surge/emergency
);

-- Rider platform allocations table
CREATE TABLE rider_platform_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  platform_id UUID NOT NULL REFERENCES platforms(id),
  
  allocation_type rider_allocation_type NOT NULL DEFAULT 'primary',
  status rider_platform_allocation_status NOT NULL DEFAULT 'pending',
  
  -- Requirements tracking
  platform_account_id TEXT,                -- Rider's account on the platform (if applicable)
  uniform_issued BOOLEAN DEFAULT false,
  bag_issued BOOLEAN DEFAULT false,
  app_installed BOOLEAN DEFAULT false,
  training_completed BOOLEAN DEFAULT false,
  
  -- Allocation period
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  
  -- Suspension/revocation details
  suspended_at TIMESTAMPTZ,
  suspended_reason TEXT,
  suspended_by UUID REFERENCES employees(id),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  revoked_by UUID REFERENCES employees(id),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES employees(id),

  CONSTRAINT unique_rider_platform UNIQUE (employee_id, platform_id),
  CONSTRAINT valid_date_range CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

-- Indexes
CREATE INDEX idx_rpa_org ON rider_platform_allocations(organization_id);
CREATE INDEX idx_rpa_employee ON rider_platform_allocations(employee_id);
CREATE INDEX idx_rpa_platform ON rider_platform_allocations(platform_id);
CREATE INDEX idx_rpa_status ON rider_platform_allocations(status);
CREATE INDEX idx_rpa_effective ON rider_platform_allocations(effective_from, effective_until);

-- Enable RLS
ALTER TABLE rider_platform_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rider_platform_allocations_org_isolation" ON rider_platform_allocations
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- Trigger for updated_at
CREATE TRIGGER rider_platform_allocations_updated_at
  BEFORE UPDATE ON rider_platform_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View: Active allocations with full details
CREATE OR REPLACE VIEW rider_platform_allocation_details AS
SELECT 
  rpa.id,
  rpa.organization_id,
  rpa.employee_id,
  e.full_name AS rider_name,
  e.employee_id AS rider_code,
  rpa.platform_id,
  p.name AS platform_name,
  rpa.allocation_type,
  rpa.status,
  rpa.platform_account_id,
  
  -- Requirements
  rpa.uniform_issued,
  rpa.bag_issued,
  rpa.app_installed,
  rpa.training_completed,
  p.requires_uniform,
  p.requires_bag,
  p.requires_phone_app,
  (
    (rpa.uniform_issued OR NOT COALESCE(p.requires_uniform, false)) AND
    (rpa.bag_issued OR NOT COALESCE(p.requires_bag, false)) AND
    (rpa.app_installed OR NOT COALESCE(p.requires_phone_app, false))
  ) AS requirements_met,
  
  ARRAY_REMOVE(ARRAY[
    CASE WHEN COALESCE(p.requires_uniform, false) AND NOT rpa.uniform_issued THEN 'Uniform not issued' END,
    CASE WHEN COALESCE(p.requires_bag, false) AND NOT rpa.bag_issued THEN 'Delivery bag not issued' END,
    CASE WHEN COALESCE(p.requires_phone_app, false) AND NOT rpa.app_installed THEN 'App not installed' END,
    CASE WHEN NOT rpa.training_completed THEN 'Training not completed' END
  ], NULL) AS missing_requirements,
  
  -- Dates
  rpa.effective_from,
  rpa.effective_until,
  rpa.suspended_at,
  rpa.suspended_reason,
  rpa.revoked_at,
  rpa.revoked_reason,
  
  -- Metadata
  rpa.notes,
  rpa.created_at,
  rpa.updated_at

FROM rider_platform_allocations rpa
JOIN employees e ON rpa.employee_id = e.id
JOIN platforms p ON rpa.platform_id = p.id
WHERE e.deleted_at IS NULL
  AND p.deleted_at IS NULL;

-- View: Available riders per platform
CREATE OR REPLACE VIEW platform_available_riders AS
SELECT 
  rpa.organization_id,
  rpa.platform_id,
  p.name AS platform_name,
  re.employee_id,
  re.full_name AS rider_name,
  re.employee_code,
  rpa.allocation_type,
  rpa.platform_account_id,
  re.eligibility_status,
  re.assigned_vehicle_id,
  re.assigned_vehicle_plate
FROM rider_platform_allocations rpa
JOIN platforms p ON rpa.platform_id = p.id
JOIN rider_eligibility re ON rpa.employee_id = re.employee_id
WHERE rpa.status = 'active'
  AND (rpa.effective_until IS NULL OR rpa.effective_until >= CURRENT_DATE)
  AND rpa.effective_from <= CURRENT_DATE
  AND p.is_active = true
  AND re.eligibility_status IN ('eligible', 'conditional');

-- View: Summary per platform
CREATE OR REPLACE VIEW platform_allocation_summary AS
SELECT 
  rpa.organization_id,
  rpa.platform_id,
  p.name AS platform_name,
  COUNT(*) FILTER (WHERE rpa.status = 'active') AS active_allocations,
  COUNT(*) FILTER (WHERE rpa.status = 'pending') AS pending_allocations,
  COUNT(*) FILTER (WHERE rpa.status = 'suspended') AS suspended_allocations,
  COUNT(*) AS total_allocations,
  COUNT(*) FILTER (
    WHERE rpa.status = 'active' 
    AND EXISTS (
      SELECT 1 FROM rider_eligibility re 
      WHERE re.employee_id = rpa.employee_id 
      AND re.eligibility_status IN ('eligible', 'conditional')
    )
  ) AS available_riders
FROM rider_platform_allocations rpa
JOIN platforms p ON rpa.platform_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY rpa.organization_id, rpa.platform_id, p.name;

-- Function to check if rider can work for platform
CREATE OR REPLACE FUNCTION can_rider_work_platform(
  p_employee_id UUID,
  p_platform_id UUID
)
RETURNS TABLE (
  can_work BOOLEAN,
  allocation_status rider_platform_allocation_status,
  eligibility_status eligibility_status,
  missing_requirements TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (rpa.status = 'active' AND re.eligibility_status IN ('eligible', 'conditional')) AS can_work,
    rpa.status,
    re.eligibility_status,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN COALESCE(p.requires_uniform, false) AND NOT rpa.uniform_issued THEN 'Uniform not issued' END,
      CASE WHEN COALESCE(p.requires_bag, false) AND NOT rpa.bag_issued THEN 'Delivery bag not issued' END,
      CASE WHEN COALESCE(p.requires_phone_app, false) AND NOT rpa.app_installed THEN 'App not installed' END,
      CASE WHEN NOT rpa.training_completed THEN 'Training not completed' END
    ], NULL)
  FROM rider_platform_allocations rpa
  JOIN platforms p ON rpa.platform_id = p.id
  JOIN rider_eligibility re ON rpa.employee_id = re.employee_id
  WHERE rpa.employee_id = p_employee_id
    AND rpa.platform_id = p_platform_id
    AND (rpa.effective_until IS NULL OR rpa.effective_until >= CURRENT_DATE)
    AND rpa.effective_from <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE rider_platform_allocations IS 'Tracks which riders can work for which platforms/aggregators';
COMMENT ON VIEW platform_available_riders IS 'Riders currently available to work for each platform';
COMMENT ON VIEW platform_allocation_summary IS 'Summary of rider allocations per platform';
