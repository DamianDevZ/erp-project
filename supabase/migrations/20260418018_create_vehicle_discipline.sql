-- T-029: Disciplinary process for vehicle misuse
-- Add vehicle-linked triggers and auto-escalation

-- Add vehicle-related fields to performance_discipline
ALTER TABLE performance_discipline ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id);
ALTER TABLE performance_discipline ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES incidents(id);
ALTER TABLE performance_discipline ADD COLUMN IF NOT EXISTS vehicle_damage_cost DECIMAL(10,3);
ALTER TABLE performance_discipline ADD COLUMN IF NOT EXISTS recovery_agreement_id UUID REFERENCES deduction_agreements(id);

-- Discipline category for better filtering
CREATE TYPE discipline_category AS ENUM (
  'attendance',
  'performance',
  'vehicle_misuse',
  'vehicle_damage',
  'safety_violation',
  'policy_violation',
  'customer_complaint',
  'other'
);

ALTER TABLE performance_discipline ADD COLUMN IF NOT EXISTS category discipline_category DEFAULT 'other';

-- Vehicle misuse triggers table
CREATE TABLE vehicle_discipline_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Trigger definition
  trigger_name TEXT NOT NULL,
  description TEXT,
  category discipline_category NOT NULL DEFAULT 'vehicle_misuse',
  
  -- What triggers this
  incident_type incident_type, -- From incidents table
  incident_count_threshold INTEGER DEFAULT 1, -- How many incidents before trigger
  time_window_days INTEGER DEFAULT 30, -- Within how many days
  damage_cost_threshold DECIMAL(10,3), -- Cost threshold for damage-based trigger
  
  -- What action to take
  discipline_type TEXT NOT NULL, -- Maps to DisciplineType
  severity_level TEXT NOT NULL, -- Maps to SeverityLevel
  auto_create_deduction BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id, trigger_name)
);

-- RLS
ALTER TABLE vehicle_discipline_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org triggers" ON vehicle_discipline_triggers
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own org triggers" ON vehicle_discipline_triggers
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Index for lookups
CREATE INDEX idx_discipline_asset ON performance_discipline(asset_id) WHERE asset_id IS NOT NULL;
CREATE INDEX idx_discipline_incident ON performance_discipline(incident_id) WHERE incident_id IS NOT NULL;
CREATE INDEX idx_discipline_category ON performance_discipline(category);
CREATE INDEX idx_discipline_triggers_active ON vehicle_discipline_triggers(organization_id, is_active, incident_type);

-- Function to check and create discipline from incident
CREATE OR REPLACE FUNCTION check_vehicle_discipline_triggers(
  p_incident_id UUID
)
RETURNS UUID[] AS $$
DECLARE
  v_incident incidents;
  v_trigger vehicle_discipline_triggers;
  v_incident_count INTEGER;
  v_discipline_id UUID;
  v_created_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  -- Get incident
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id;
  IF NOT FOUND THEN RETURN v_created_ids; END IF;
  
  -- Check all active triggers for this incident type
  FOR v_trigger IN
    SELECT * FROM vehicle_discipline_triggers
    WHERE organization_id = v_incident.organization_id
      AND is_active = true
      AND incident_type = v_incident.incident_type
  LOOP
    -- Count incidents in time window
    SELECT COUNT(*) INTO v_incident_count
    FROM incidents
    WHERE organization_id = v_incident.organization_id
      AND employee_id = v_incident.employee_id
      AND incident_type = v_incident.incident_type
      AND incident_datetime >= (CURRENT_TIMESTAMP - (v_trigger.time_window_days || ' days')::INTERVAL);
    
    -- Check if threshold met
    IF v_incident_count >= v_trigger.incident_count_threshold 
       OR (v_trigger.damage_cost_threshold IS NOT NULL AND v_incident.damage_estimate >= v_trigger.damage_cost_threshold) THEN
      
      -- Check if discipline already exists for this incident
      IF NOT EXISTS (
        SELECT 1 FROM performance_discipline 
        WHERE incident_id = p_incident_id
      ) THEN
        -- Create discipline record
        INSERT INTO performance_discipline (
          organization_id, employee_id, asset_id, incident_id,
          type, status, severity, category,
          title, description, incident_date, location,
          vehicle_damage_cost
        ) VALUES (
          v_incident.organization_id,
          v_incident.employee_id,
          v_incident.asset_id,
          p_incident_id,
          v_trigger.discipline_type,
          'open',
          v_trigger.severity_level,
          v_trigger.category,
          v_trigger.trigger_name || ': ' || v_incident.incident_type,
          'Auto-generated from incident. ' || COALESCE(v_incident.description, ''),
          v_incident.incident_datetime::DATE,
          v_incident.location,
          v_incident.damage_estimate
        )
        RETURNING id INTO v_discipline_id;
        
        v_created_ids := array_append(v_created_ids, v_discipline_id);
        
        -- Auto-create deduction agreement if configured
        IF v_trigger.auto_create_deduction AND v_incident.damage_estimate > 0 AND v_incident.responsibility_party = 'rider' THEN
          INSERT INTO deduction_agreements (
            organization_id, employee_id, deduction_type, description,
            original_amount, recovery_method, start_date, incident_id, asset_id
          ) VALUES (
            v_incident.organization_id,
            v_incident.employee_id,
            'damage_recovery',
            'Damage recovery for incident: ' || v_trigger.trigger_name,
            v_incident.damage_estimate,
            'fixed_installment',
            CURRENT_DATE + INTERVAL '1 month',
            p_incident_id,
            v_incident.asset_id
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_created_ids;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-check discipline when incident is created
CREATE OR REPLACE FUNCTION trigger_check_discipline()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check for certain incident types
  IF NEW.incident_type IN ('accident', 'damage', 'theft', 'traffic_violation', 'reckless_driving') THEN
    PERFORM check_vehicle_discipline_triggers(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_incident_discipline
  AFTER INSERT ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_discipline();

-- View for vehicle-related discipline summary per employee
CREATE OR REPLACE VIEW employee_vehicle_discipline_summary AS
SELECT 
  e.id AS employee_id,
  e.organization_id,
  e.full_name,
  COUNT(*) FILTER (WHERE pd.category IN ('vehicle_misuse', 'vehicle_damage', 'safety_violation')) AS vehicle_issues_count,
  COUNT(*) FILTER (WHERE pd.type = 'verbal_warning') AS verbal_warnings,
  COUNT(*) FILTER (WHERE pd.type = 'written_warning') AS written_warnings,
  COUNT(*) FILTER (WHERE pd.type = 'final_warning') AS final_warnings,
  COUNT(*) FILTER (WHERE pd.type = 'suspension') AS suspensions,
  COALESCE(SUM(pd.vehicle_damage_cost), 0) AS total_damage_cost,
  COUNT(DISTINCT pd.asset_id) AS vehicles_involved
FROM employees e
LEFT JOIN performance_discipline pd ON pd.employee_id = e.id 
WHERE pd.category IN ('vehicle_misuse', 'vehicle_damage', 'safety_violation')
  OR pd.id IS NULL
GROUP BY e.id, e.organization_id, e.full_name;
