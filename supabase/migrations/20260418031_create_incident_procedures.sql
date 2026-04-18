-- T-043: Accident/incident procedure
-- Steps when accident happens

-- Procedure step status
CREATE TYPE procedure_step_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped', 'not_applicable');

-- Procedure template table (defines steps for each incident type)
CREATE TABLE incident_procedure_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  incident_type incident_type NOT NULL,
  step_order integer NOT NULL,
  step_name text NOT NULL,
  step_description text,
  is_required boolean DEFAULT true,
  requires_photo boolean DEFAULT false,
  requires_document boolean DEFAULT false,
  requires_signature boolean DEFAULT false,
  document_template_path text,
  
  -- SLA settings
  sla_hours integer,  -- Time to complete this step
  escalate_if_overdue boolean DEFAULT false,
  escalate_to_role text,  -- e.g., 'operations_manager'
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, incident_type, step_order)
);

-- Incident procedure steps (actual steps for each incident)
CREATE TABLE incident_procedure_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  template_id uuid REFERENCES incident_procedure_templates(id),
  
  step_order integer NOT NULL,
  step_name text NOT NULL,
  step_description text,
  is_required boolean DEFAULT true,
  
  -- Status tracking
  status procedure_step_status NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  completed_by uuid REFERENCES employees(id),
  
  -- Evidence/data
  notes text,
  photo_paths text[],
  document_paths text[],
  signature_path text,
  
  -- SLA tracking
  sla_deadline timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(incident_id, step_order)
);

-- Indexes
CREATE INDEX idx_procedure_templates_org_type ON incident_procedure_templates(organization_id, incident_type);
CREATE INDEX idx_procedure_steps_incident ON incident_procedure_steps(incident_id);
CREATE INDEX idx_procedure_steps_status ON incident_procedure_steps(status);
CREATE INDEX idx_procedure_steps_sla ON incident_procedure_steps(sla_deadline) 
  WHERE status NOT IN ('completed', 'skipped', 'not_applicable');

-- Function to check if a step is overdue
CREATE OR REPLACE FUNCTION is_step_overdue(p_status procedure_step_status, p_sla_deadline timestamptz)
RETURNS boolean AS $$
BEGIN
  RETURN p_status NOT IN ('completed', 'skipped', 'not_applicable') 
    AND p_sla_deadline IS NOT NULL 
    AND now() > p_sla_deadline;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Insert default accident procedure steps
CREATE OR REPLACE FUNCTION insert_default_accident_procedure(p_org_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO incident_procedure_templates (
    organization_id, incident_type, step_order, step_name, step_description,
    is_required, requires_photo, sla_hours, escalate_if_overdue
  ) VALUES
    -- Accident procedure steps
    (p_org_id, 'accident', 1, 'Initial Report', 
     'Rider reports accident with basic details: location, time, parties involved',
     true, false, 1, true),
    (p_org_id, 'accident', 2, 'Photo Documentation', 
     'Capture photos of vehicle damage, scene, other vehicles, injuries if any',
     true, true, 2, false),
    (p_org_id, 'accident', 3, 'Police Report', 
     'File police report if required (injury, significant damage, or third party)',
     true, false, 24, true),
    (p_org_id, 'accident', 4, 'Rider Statement', 
     'Get detailed written statement from rider about what happened',
     true, false, 4, false),
    (p_org_id, 'accident', 5, 'Witness Information', 
     'Collect contact info and statements from any witnesses',
     false, false, 24, false),
    (p_org_id, 'accident', 6, 'Other Party Details', 
     'Collect insurance info, license, contact details of other party',
     false, false, 2, false),
    (p_org_id, 'accident', 7, 'Medical Assessment', 
     'Arrange medical check if rider or others injured',
     false, false, 4, true),
    (p_org_id, 'accident', 8, 'Vehicle Assessment', 
     'Assess damage and determine if vehicle is drivable',
     true, true, 4, false),
    (p_org_id, 'accident', 9, 'Insurance Notification', 
     'Notify insurance company and file claim if applicable',
     true, false, 48, true),
    (p_org_id, 'accident', 10, 'Responsibility Determination', 
     'Review evidence and determine fault/responsibility',
     true, false, 72, false),
    (p_org_id, 'accident', 11, 'Vehicle Repair Coordination', 
     'Arrange repair or towing if needed',
     false, false, 24, false),
    (p_org_id, 'accident', 12, 'Final Report & Closure', 
     'Complete final incident report and close case',
     true, false, 168, true)
  ON CONFLICT (organization_id, incident_type, step_order) DO NOTHING;
  
  -- Breakdown procedure (simpler)
  INSERT INTO incident_procedure_templates (
    organization_id, incident_type, step_order, step_name, step_description,
    is_required, requires_photo, sla_hours, escalate_if_overdue
  ) VALUES
    (p_org_id, 'breakdown', 1, 'Report Received', 
     'Breakdown reported with location and nature of issue',
     true, false, 1, true),
    (p_org_id, 'breakdown', 2, 'Dispatcher Acknowledgement', 
     'Operations acknowledges and assigns response',
     true, false, 1, true),
    (p_org_id, 'breakdown', 3, 'Spare Vehicle Dispatch', 
     'If available, dispatch spare vehicle to rider',
     false, false, 2, false),
    (p_org_id, 'breakdown', 4, 'Roadside Assistance', 
     'Coordinate towing or roadside repair',
     false, false, 4, false),
    (p_org_id, 'breakdown', 5, 'Resolution & Documentation', 
     'Document what was done and close breakdown',
     true, false, 8, false)
  ON CONFLICT (organization_id, incident_type, step_order) DO NOTHING;
  
  -- Theft procedure
  INSERT INTO incident_procedure_templates (
    organization_id, incident_type, step_order, step_name, step_description,
    is_required, requires_photo, sla_hours, escalate_if_overdue
  ) VALUES
    (p_org_id, 'theft', 1, 'Police Report Filed', 
     'File police report immediately',
     true, false, 4, true),
    (p_org_id, 'theft', 2, 'Insurance Claim', 
     'File insurance claim for theft',
     true, false, 24, true),
    (p_org_id, 'theft', 3, 'GPS Tracking Check', 
     'Check GPS tracking system for vehicle location',
     true, false, 1, false),
    (p_org_id, 'theft', 4, 'Final Resolution', 
     'Close case with outcome (recovered/written off)',
     true, false, null, false)
  ON CONFLICT (organization_id, incident_type, step_order) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize procedure steps when incident is created
CREATE OR REPLACE FUNCTION initialize_incident_procedure()
RETURNS TRIGGER AS $$
DECLARE
  v_template record;
BEGIN
  -- Create procedure steps from templates
  FOR v_template IN 
    SELECT * FROM incident_procedure_templates 
    WHERE organization_id = NEW.organization_id 
      AND incident_type = NEW.incident_type
      AND is_active = true
    ORDER BY step_order
  LOOP
    INSERT INTO incident_procedure_steps (
      incident_id, template_id, step_order, step_name, step_description,
      is_required, sla_deadline
    ) VALUES (
      NEW.id, v_template.id, v_template.step_order, v_template.step_name,
      v_template.step_description, v_template.is_required,
      CASE WHEN v_template.sla_hours IS NOT NULL 
        THEN NEW.created_at + (v_template.sla_hours || ' hours')::interval 
        ELSE NULL 
      END
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to initialize procedure on incident creation
DROP TRIGGER IF EXISTS incident_procedure_init ON incidents;
CREATE TRIGGER incident_procedure_init
  AFTER INSERT ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION initialize_incident_procedure();

-- Function to check procedure completion
CREATE OR REPLACE FUNCTION check_incident_procedure_completion(p_incident_id uuid)
RETURNS TABLE (
  total_steps integer,
  required_steps integer,
  completed_steps integer,
  required_completed integer,
  overdue_steps integer,
  completion_percent numeric,
  is_complete boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::integer AS total_steps,
    COUNT(*) FILTER (WHERE ips.is_required)::integer AS required_steps,
    COUNT(*) FILTER (WHERE ips.status IN ('completed', 'skipped', 'not_applicable'))::integer AS completed_steps,
    COUNT(*) FILTER (WHERE ips.is_required AND ips.status IN ('completed', 'not_applicable'))::integer AS required_completed,
    COUNT(*) FILTER (WHERE is_step_overdue(ips.status, ips.sla_deadline))::integer AS overdue_steps,
    CASE WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE ips.status IN ('completed', 'skipped', 'not_applicable'))::numeric / COUNT(*)) * 100, 1)
      ELSE 0 
    END AS completion_percent,
    (COUNT(*) FILTER (WHERE ips.is_required AND ips.status NOT IN ('completed', 'not_applicable')) = 0) AS is_complete
  FROM incident_procedure_steps ips
  WHERE ips.incident_id = p_incident_id;
END;
$$ LANGUAGE plpgsql;

-- View: Incident procedure progress
CREATE OR REPLACE VIEW incident_procedure_progress AS
SELECT 
  i.id AS incident_id,
  i.organization_id,
  i.incident_number,
  i.incident_type,
  i.severity,
  i.status AS incident_status,
  i.created_at AS incident_created,
  COUNT(ips.id) AS total_steps,
  COUNT(ips.id) FILTER (WHERE ips.status = 'completed') AS completed_steps,
  COUNT(ips.id) FILTER (WHERE ips.status = 'in_progress') AS in_progress_steps,
  COUNT(ips.id) FILTER (WHERE ips.status = 'pending' AND ips.is_required) AS pending_required_steps,
  COUNT(ips.id) FILTER (WHERE is_step_overdue(ips.status, ips.sla_deadline)) AS overdue_steps,
  ROUND((COUNT(ips.id) FILTER (WHERE ips.status IN ('completed', 'skipped', 'not_applicable'))::numeric / NULLIF(COUNT(ips.id), 0)) * 100, 1) AS completion_percent,
  MIN(ips.sla_deadline) FILTER (WHERE ips.status = 'pending') AS next_deadline
FROM incidents i
LEFT JOIN incident_procedure_steps ips ON i.id = ips.incident_id
GROUP BY i.id;

-- View: Overdue procedure steps
CREATE OR REPLACE VIEW overdue_procedure_steps AS
SELECT 
  ips.id AS step_id,
  ips.incident_id,
  i.organization_id,
  i.incident_number,
  i.incident_type,
  e.full_name AS rider_name,
  ips.step_order,
  ips.step_name,
  ips.status,
  ips.sla_deadline,
  EXTRACT(HOURS FROM (now() - ips.sla_deadline)) AS hours_overdue,
  pt.escalate_to_role
FROM incident_procedure_steps ips
JOIN incidents i ON ips.incident_id = i.id
LEFT JOIN employees e ON i.employee_id = e.id
LEFT JOIN incident_procedure_templates pt ON ips.template_id = pt.id
WHERE is_step_overdue(ips.status, ips.sla_deadline)
ORDER BY EXTRACT(HOURS FROM (now() - ips.sla_deadline)) DESC;

-- Enable RLS
ALTER TABLE incident_procedure_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_procedure_steps ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY procedure_templates_org_isolation ON incident_procedure_templates
  FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY procedure_steps_access ON incident_procedure_steps
  FOR ALL USING (
    incident_id IN (
      SELECT id FROM incidents 
      WHERE organization_id = current_setting('app.current_organization_id', true)::uuid
    )
  );

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_step_overdue(procedure_step_status, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_default_accident_procedure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_incident_procedure_completion(uuid) TO authenticated;
