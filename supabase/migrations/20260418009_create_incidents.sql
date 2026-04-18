-- Migration: Create incidents table
-- Task: T-016 - Accidents, damage, and incidents

-- Tracks accidents, damage events, and other incidents.
-- Links to maintenance for repairs and payroll for deductions.

CREATE TYPE incident_type AS ENUM (
  'accident',           -- Traffic accident
  'theft',              -- Vehicle/equipment stolen
  'vandalism',          -- Intentional damage
  'breakdown',          -- Non-accident breakdown
  'damage_rider',       -- Damage caused by rider
  'damage_third_party', -- Damage caused by third party
  'violation',          -- Traffic/legal violation
  'other'
);

CREATE TYPE incident_severity AS ENUM (
  'minor',    -- Small scratch, minor repair
  'moderate', -- Significant damage, some downtime
  'major',    -- Major damage, extended downtime
  'total'     -- Write-off
);

CREATE TYPE responsibility_party AS ENUM (
  'rider',        -- Rider at fault
  'third_party',  -- Other party at fault
  'company',      -- Company equipment failure
  'unknown',      -- Cannot determine
  'shared'        -- Split responsibility
);

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Incident reference
  incident_number TEXT DEFAULT NULL, -- Auto-generated or manual reference
  
  -- What was involved
  asset_id UUID REFERENCES assets(id), -- Vehicle involved
  employee_id UUID REFERENCES employees(id), -- Rider involved
  
  -- Incident details (T-043)
  incident_type incident_type NOT NULL,
  severity incident_severity DEFAULT 'minor',
  incident_date DATE NOT NULL,
  incident_time TIME DEFAULT NULL,
  
  -- Location
  incident_location TEXT DEFAULT NULL,
  incident_latitude DECIMAL(10,7) DEFAULT NULL,
  incident_longitude DECIMAL(10,7) DEFAULT NULL,
  
  -- Description
  description TEXT NOT NULL,
  
  -- Responsibility determination (T-083, T-084)
  responsibility responsibility_party DEFAULT 'unknown',
  responsibility_notes TEXT DEFAULT NULL,
  
  -- Evidence checklist (T-083)
  photos_uploaded BOOLEAN DEFAULT false,
  photos_path TEXT DEFAULT NULL, -- Storage path
  police_report_filed BOOLEAN DEFAULT false,
  police_report_number TEXT DEFAULT NULL,
  police_report_path TEXT DEFAULT NULL,
  rider_statement TEXT DEFAULT NULL,
  witness_statements TEXT DEFAULT NULL,
  other_party_info TEXT DEFAULT NULL, -- Contact info of third party involved
  
  -- Insurance
  insurance_claim_filed BOOLEAN DEFAULT false,
  insurance_claim_number TEXT DEFAULT NULL,
  insurance_claim_status TEXT DEFAULT NULL, -- pending, approved, rejected, settled
  insurance_payout DECIMAL(12,2) DEFAULT NULL,
  
  -- Cost impact
  estimated_repair_cost DECIMAL(12,2) DEFAULT NULL,
  actual_repair_cost DECIMAL(12,2) DEFAULT NULL,
  other_costs DECIMAL(12,2) DEFAULT 0, -- Towing, rental, etc.
  total_cost DECIMAL(12,2) DEFAULT NULL,
  
  -- Cost recovery
  recovery_from TEXT DEFAULT NULL, -- rider, third_party, insurance
  recovery_amount DECIMAL(12,2) DEFAULT 0,
  recovery_status TEXT DEFAULT 'pending', -- pending, partial, recovered, written_off
  deduction_from_payroll BOOLEAN DEFAULT false,
  deduction_amount DECIMAL(12,2) DEFAULT 0,
  
  -- Operational impact (T-056)
  vehicle_downtime_days INTEGER DEFAULT 0,
  rider_suspension_days INTEGER DEFAULT 0,
  
  -- Approval workflow (T-084)
  requires_approval BOOLEAN DEFAULT true,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ DEFAULT NULL,
  approval_notes TEXT DEFAULT NULL,
  
  -- Status
  status TEXT DEFAULT 'reported', -- reported, under_investigation, resolved, closed
  resolution_notes TEXT DEFAULT NULL,
  
  -- Linked records
  maintenance_event_id UUID DEFAULT NULL, -- Will reference maintenance_events
  
  -- Notes
  notes TEXT DEFAULT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_incidents_organization_id ON incidents(organization_id);
CREATE INDEX idx_incidents_asset_id ON incidents(asset_id);
CREATE INDEX idx_incidents_employee_id ON incidents(employee_id);
CREATE INDEX idx_incidents_incident_type ON incidents(incident_type);
CREATE INDEX idx_incidents_incident_date ON incidents(incident_date);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_recovery ON incidents(recovery_status) WHERE recovery_status = 'pending';

-- RLS
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY incidents_org_isolation ON incidents
  USING (organization_id = public.get_user_organization_id());

-- Add foreign key from maintenance_events to incidents
ALTER TABLE maintenance_events 
  ADD CONSTRAINT fk_maintenance_incident 
  FOREIGN KEY (incident_id) REFERENCES incidents(id);

-- Comments
COMMENT ON TABLE incidents IS 'Accidents, damage events, and incidents with evidence tracking and cost recovery';
COMMENT ON COLUMN incidents.responsibility IS 'Who is responsible: rider, third_party, company, unknown, shared';
COMMENT ON COLUMN incidents.recovery_status IS 'Cost recovery status: pending, partial, recovered, written_off';
