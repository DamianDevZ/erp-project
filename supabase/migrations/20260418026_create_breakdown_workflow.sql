-- T-038: Breakdown escalation workflow
-- Add escalation tracking and breakdown response workflow to existing incidents table

-- Add priority and escalation columns to incidents if not exist
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dispatched_by UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS dispatcher_notes TEXT,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS spare_vehicle_id UUID REFERENCES assets(id),
ADD COLUMN IF NOT EXISTS spare_dispatched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS spare_arrived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS follow_up_notes TEXT;

-- Breakdown type (for breakdown incidents)
CREATE TYPE breakdown_type AS ENUM (
  'flat_tire',
  'engine_failure',
  'battery_dead',
  'fuel_empty',
  'electrical',
  'brakes',
  'transmission',
  'overheating',
  'accident_damage',
  'other'
);

-- Add breakdown_type column
ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS breakdown_type breakdown_type;

-- Incidents table
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  incident_number SERIAL,
  
  -- Who reported
  reported_by UUID NOT NULL REFERENCES employees(id),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- What happened
  incident_type incident_type NOT NULL,
  breakdown_type breakdown_type,
  priority incident_priority NOT NULL DEFAULT 'medium',
  status incident_status NOT NULL DEFAULT 'reported',
  
  -- Description
  title TEXT NOT NULL,
  description TEXT,
  
  -- Related entities
  vehicle_id UUID REFERENCES assets(id),
  shift_id UUID REFERENCES shifts(id),
  platform_id UUID REFERENCES platforms(id),
  
  -- Location
  location_latitude NUMERIC(10,7),
  location_longitude NUMERIC(10,7),
  location_address TEXT,
  location_landmark TEXT,
  
  -- Evidence
  photos TEXT[],
  
  -- Response tracking
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES employees(id),
  dispatched_at TIMESTAMPTZ,
  dispatched_by UUID REFERENCES employees(id),
  dispatcher_notes TEXT,
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES employees(id),
  resolution_type TEXT,
  resolution_notes TEXT,
  
  -- Follow-up
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES employees(id),
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  
  -- Spare vehicle dispatch
  spare_vehicle_id UUID REFERENCES assets(id),
  spare_dispatched_at TIMESTAMPTZ,
  spare_arrived_at TIMESTAMPTZ,
  
  -- Cost tracking
  repair_cost NUMERIC(10,2),
  tow_cost NUMERIC(10,2),
  other_costs NUMERIC(10,2),
  cost_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint for unique incident number per org
  CONSTRAINT unique_incident_number_per_org UNIQUE (organization_id, incident_number)
);

-- Escalation history
CREATE TABLE incident_escalations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  escalation_level INTEGER NOT NULL DEFAULT 1,
  escalated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  escalated_to UUID REFERENCES employees(id),
  escalated_by_system BOOLEAN DEFAULT true,
  reason TEXT,
  acknowledged_at TIMESTAMPTZ,
  response_notes TEXT
);

-- Incident comments/updates
CREATE TABLE incident_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES employees(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_incidents_org ON incidents(organization_id);
CREATE INDEX idx_incidents_reported_by ON incidents(reported_by);
CREATE INDEX idx_incidents_vehicle ON incidents(vehicle_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_type ON incidents(incident_type);
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_reported_at ON incidents(reported_at);
CREATE INDEX idx_escalations_incident ON incident_escalations(incident_id);
CREATE INDEX idx_comments_incident ON incident_comments(incident_id);

-- Enable RLS
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incidents_org_isolation" ON incidents
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY "incident_escalations_org_isolation" ON incident_escalations
  USING (incident_id IN (SELECT id FROM incidents WHERE organization_id = current_setting('app.current_organization_id', true)::uuid));

CREATE POLICY "incident_comments_org_isolation" ON incident_comments
  USING (incident_id IN (SELECT id FROM incidents WHERE organization_id = current_setting('app.current_organization_id', true)::uuid));

-- Trigger for updated_at
CREATE TRIGGER incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View: Active incidents requiring attention
CREATE OR REPLACE VIEW active_incidents AS
SELECT 
  i.id,
  i.organization_id,
  i.incident_number,
  i.incident_type,
  i.breakdown_type,
  i.priority,
  i.status,
  i.title,
  i.description,
  i.reported_at,
  e.full_name AS reported_by_name,
  e.phone AS reporter_phone,
  i.vehicle_id,
  a.license_plate,
  i.location_address,
  i.location_latitude,
  i.location_longitude,
  
  -- Time since reported
  EXTRACT(MINUTES FROM NOW() - i.reported_at) AS minutes_open,
  
  -- Escalation info
  (SELECT MAX(escalation_level) FROM incident_escalations ie WHERE ie.incident_id = i.id) AS current_escalation_level,
  
  -- Response times
  EXTRACT(MINUTES FROM i.acknowledged_at - i.reported_at) AS response_time_minutes,
  EXTRACT(MINUTES FROM i.dispatched_at - i.reported_at) AS dispatch_time_minutes,
  
  -- Flags
  CASE 
    WHEN i.status = 'reported' AND i.reported_at < NOW() - INTERVAL '5 minutes' THEN true
    ELSE false
  END AS needs_acknowledgement,
  CASE 
    WHEN i.status IN ('reported', 'acknowledged') AND i.reported_at < NOW() - INTERVAL '15 minutes' THEN true
    ELSE false
  END AS overdue_dispatch,
  
  i.spare_vehicle_id IS NOT NULL AS spare_dispatched

FROM incidents i
JOIN employees e ON i.reported_by = e.id
LEFT JOIN assets a ON i.vehicle_id = a.id
WHERE i.status NOT IN ('resolved', 'closed', 'cancelled')
ORDER BY 
  CASE i.priority 
    WHEN 'critical' THEN 1 
    WHEN 'high' THEN 2 
    WHEN 'medium' THEN 3 
    WHEN 'low' THEN 4 
  END,
  i.reported_at;

-- View: Breakdown summary for dashboard
CREATE OR REPLACE VIEW breakdown_summary AS
SELECT 
  i.organization_id,
  COUNT(*) FILTER (WHERE i.status NOT IN ('resolved', 'closed', 'cancelled')) AS active_breakdowns,
  COUNT(*) FILTER (WHERE i.status = 'reported') AS awaiting_acknowledgement,
  COUNT(*) FILTER (WHERE i.status = 'acknowledged') AS awaiting_dispatch,
  COUNT(*) FILTER (WHERE i.status = 'dispatched' OR i.status = 'in_progress') AS in_progress,
  COUNT(*) FILTER (WHERE DATE(i.reported_at) = CURRENT_DATE AND i.status IN ('resolved', 'closed')) AS resolved_today,
  COUNT(*) FILTER (WHERE DATE(i.reported_at) = CURRENT_DATE) AS reported_today,
  AVG(EXTRACT(MINUTES FROM i.acknowledged_at - i.reported_at)) FILTER (WHERE i.acknowledged_at IS NOT NULL) AS avg_response_time_minutes,
  AVG(EXTRACT(MINUTES FROM i.resolved_at - i.reported_at)) FILTER (WHERE i.resolved_at IS NOT NULL) AS avg_resolution_time_minutes
FROM incidents i
WHERE i.incident_type = 'breakdown'
GROUP BY i.organization_id;

-- Function to report breakdown
CREATE OR REPLACE FUNCTION report_breakdown(
  p_reported_by UUID,
  p_vehicle_id UUID,
  p_breakdown_type breakdown_type,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_photos TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_incident_id UUID;
  v_org_id UUID;
BEGIN
  -- Get organization from employee
  SELECT organization_id INTO v_org_id FROM employees WHERE id = p_reported_by;
  
  INSERT INTO incidents (
    organization_id,
    reported_by,
    incident_type,
    breakdown_type,
    priority,
    title,
    description,
    vehicle_id,
    location_latitude,
    location_longitude,
    location_address,
    photos
  ) VALUES (
    v_org_id,
    p_reported_by,
    'breakdown',
    p_breakdown_type,
    CASE 
      WHEN p_breakdown_type IN ('accident_damage', 'engine_failure', 'brakes') THEN 'high'::incident_priority
      ELSE 'medium'::incident_priority
    END,
    p_title,
    p_description,
    p_vehicle_id,
    p_latitude,
    p_longitude,
    p_address,
    p_photos
  )
  RETURNING id INTO v_incident_id;
  
  -- Create initial escalation record
  INSERT INTO incident_escalations (incident_id, escalation_level, reason)
  VALUES (v_incident_id, 1, 'Initial report');
  
  RETURN v_incident_id;
END;
$$ LANGUAGE plpgsql;

-- Function to escalate incident
CREATE OR REPLACE FUNCTION escalate_incident(
  p_incident_id UUID,
  p_escalate_to UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_level INTEGER;
BEGIN
  -- Get current escalation level
  SELECT COALESCE(MAX(escalation_level), 0) INTO v_current_level
  FROM incident_escalations WHERE incident_id = p_incident_id;
  
  -- Create escalation
  INSERT INTO incident_escalations (
    incident_id,
    escalation_level,
    escalated_to,
    escalated_by_system,
    reason
  ) VALUES (
    p_incident_id,
    v_current_level + 1,
    p_escalate_to,
    p_escalate_to IS NULL,
    COALESCE(p_reason, 'Auto-escalated due to response time')
  );
  
  -- Update priority if escalating beyond level 2
  IF v_current_level >= 2 THEN
    UPDATE incidents SET priority = 'critical', updated_at = NOW()
    WHERE id = p_incident_id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to dispatch spare vehicle
CREATE OR REPLACE FUNCTION dispatch_spare_vehicle(
  p_incident_id UUID,
  p_spare_vehicle_id UUID,
  p_dispatcher_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE incidents SET
    status = 'dispatched',
    dispatched_at = NOW(),
    dispatched_by = p_dispatcher_id,
    dispatcher_notes = p_notes,
    spare_vehicle_id = p_spare_vehicle_id,
    spare_dispatched_at = NOW(),
    updated_at = NOW()
  WHERE id = p_incident_id;
  
  -- Mark spare vehicle as dispatched
  UPDATE assets SET
    vehicle_status = 'assigned',
    updated_at = NOW()
  WHERE id = p_spare_vehicle_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE incidents IS 'All operational incidents including breakdowns and accidents';
COMMENT ON TABLE incident_escalations IS 'Escalation history for incidents';
COMMENT ON VIEW active_incidents IS 'Currently active incidents requiring attention';
COMMENT ON FUNCTION report_breakdown IS 'Report a new vehicle breakdown';
COMMENT ON FUNCTION escalate_incident IS 'Escalate an incident to next level';
COMMENT ON FUNCTION dispatch_spare_vehicle IS 'Dispatch a spare vehicle to breakdown location';
