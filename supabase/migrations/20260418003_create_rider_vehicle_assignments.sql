-- Migration: Create rider_vehicle_assignments table
-- Task: T-006 - Track rider to vehicle assignment history

-- This table specifically tracks rider-to-vehicle assignments with:
-- - Which aggregator/client they're working for during this assignment
-- - Assignment/unassignment reasons
-- - Handover checklist data

CREATE TABLE IF NOT EXISTS rider_vehicle_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Core assignment data
  employee_id UUID NOT NULL REFERENCES employees(id),
  asset_id UUID NOT NULL REFERENCES assets(id),
  
  -- Context: what client/aggregator is this assignment for?
  platform_id UUID REFERENCES platforms(id), -- Can be null for general use
  
  -- Assignment period
  start_date DATE NOT NULL,
  end_date DATE DEFAULT NULL, -- NULL = still active
  
  -- Assignment metadata
  assignment_type TEXT DEFAULT 'primary', -- 'primary', 'temporary', 'replacement'
  assignment_reason TEXT DEFAULT NULL, -- Why assigned (new hire, replacement, transfer, etc.)
  unassignment_reason TEXT DEFAULT NULL, -- Why ended (vehicle issue, rider left, reassigned, etc.)
  
  -- Handover tracking (T-053)
  handover_condition TEXT DEFAULT NULL, -- Condition notes at assignment
  handover_odometer INTEGER DEFAULT NULL,
  handover_damages TEXT DEFAULT NULL, -- Pre-existing damage notes
  handover_accessories TEXT DEFAULT NULL, -- List of accessories provided
  handover_photos_path TEXT DEFAULT NULL, -- Path to handover photos in storage
  handover_confirmed_at TIMESTAMPTZ DEFAULT NULL,
  handover_confirmed_by UUID REFERENCES user_profiles(id),
  
  -- Return tracking
  return_condition TEXT DEFAULT NULL,
  return_odometer INTEGER DEFAULT NULL,
  return_damages TEXT DEFAULT NULL, -- New damages found
  return_confirmed_at TIMESTAMPTZ DEFAULT NULL,
  return_confirmed_by UUID REFERENCES user_profiles(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rva_organization_id ON rider_vehicle_assignments(organization_id);
CREATE INDEX idx_rva_employee_id ON rider_vehicle_assignments(employee_id);
CREATE INDEX idx_rva_asset_id ON rider_vehicle_assignments(asset_id);
CREATE INDEX idx_rva_platform_id ON rider_vehicle_assignments(platform_id);
CREATE INDEX idx_rva_active ON rider_vehicle_assignments(employee_id, end_date) WHERE end_date IS NULL;

-- RLS
ALTER TABLE rider_vehicle_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY rva_org_isolation ON rider_vehicle_assignments
  USING (organization_id = public.get_user_organization_id());

-- Comments
COMMENT ON TABLE rider_vehicle_assignments IS 'History of rider-to-vehicle assignments with handover/return tracking';
COMMENT ON COLUMN rider_vehicle_assignments.assignment_type IS 'primary = main assignment, temporary = short-term backup, replacement = permanent replacement';
