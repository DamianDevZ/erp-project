-- Migration: Create maintenance_events table (enhanced)
-- Task: T-013 - Maintenance/service/repair/accident records

-- Note: We have asset_maintenance but this is more comprehensive for the 3PL use case.
-- Tracks: service type, who pays, cost recovery, downtime.

CREATE TYPE maintenance_type AS ENUM (
  'scheduled_service',  -- Regular maintenance (oil change, tire, etc.)
  'unscheduled_repair', -- Breakdown repair
  'accident_repair',    -- Accident damage repair
  'inspection',         -- Regulatory inspection
  'cleaning',           -- Cleaning/detailing
  'modification'        -- Upgrades/modifications
);

CREATE TYPE maintenance_paid_by AS ENUM (
  'company',            -- We pay
  'supplier',           -- Rental supplier pays
  'rider',              -- Rider pays (own vehicle or damage)
  'insurance',          -- Insurance covers
  'warranty',           -- Under warranty
  'pending'             -- Cost allocation pending
);

CREATE TABLE IF NOT EXISTS maintenance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Asset info
  asset_id UUID NOT NULL REFERENCES assets(id),
  
  -- Linked incident (if caused by accident)
  incident_id UUID DEFAULT NULL, -- Will reference incidents table
  
  -- Event details
  event_type maintenance_type NOT NULL,
  description TEXT NOT NULL,
  cause TEXT DEFAULT NULL, -- What caused the need for maintenance
  
  -- Provider (T-055: routing rules by source type)
  service_provider_type TEXT DEFAULT 'external', -- internal_workshop, external, supplier, rider_arranged
  vendor_id UUID REFERENCES vendors(id), -- If external
  service_location TEXT DEFAULT NULL,
  
  -- Timing
  reported_date DATE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  
  -- Downttime tracking (T-056)
  downtime_start TIMESTAMPTZ DEFAULT NULL,
  downtime_end TIMESTAMPTZ DEFAULT NULL,
  downtime_hours DECIMAL(8,2) DEFAULT NULL,
  replacement_needed BOOLEAN DEFAULT false,
  replacement_asset_id UUID REFERENCES assets(id),
  
  -- Cost tracking
  estimated_cost DECIMAL(12,2) DEFAULT NULL,
  actual_cost DECIMAL(12,2) DEFAULT NULL,
  parts_cost DECIMAL(12,2) DEFAULT 0,
  labor_cost DECIMAL(12,2) DEFAULT 0,
  
  -- Payment (who pays - varies by vehicle source type)
  paid_by maintenance_paid_by DEFAULT 'pending',
  recovered_from TEXT DEFAULT NULL, -- 'rider', 'insurance', 'supplier', 'other'
  recovery_amount DECIMAL(12,2) DEFAULT 0,
  recovery_status TEXT DEFAULT 'not_applicable', -- not_applicable, pending, partial, recovered
  
  -- Invoice tracking
  invoice_number TEXT DEFAULT NULL,
  invoice_date DATE DEFAULT NULL,
  payment_status TEXT DEFAULT 'pending', -- pending, paid, disputed
  
  -- Odometer at time of maintenance
  odometer_reading INTEGER DEFAULT NULL,
  
  -- Next scheduled maintenance
  next_due_km INTEGER DEFAULT NULL,
  next_due_date DATE DEFAULT NULL,
  
  -- Approval workflow
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ DEFAULT NULL,
  
  -- Status
  status TEXT DEFAULT 'reported', -- reported, in_progress, completed, cancelled
  
  -- Notes
  notes TEXT DEFAULT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_maintenance_organization_id ON maintenance_events(organization_id);
CREATE INDEX idx_maintenance_asset_id ON maintenance_events(asset_id);
CREATE INDEX idx_maintenance_event_type ON maintenance_events(event_type);
CREATE INDEX idx_maintenance_status ON maintenance_events(status);
CREATE INDEX idx_maintenance_reported_date ON maintenance_events(reported_date);
CREATE INDEX idx_maintenance_paid_by ON maintenance_events(paid_by);
CREATE INDEX idx_maintenance_recovery ON maintenance_events(recovery_status) WHERE recovery_status = 'pending';

-- RLS
ALTER TABLE maintenance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY maintenance_org_isolation ON maintenance_events
  USING (organization_id = public.get_user_organization_id());

-- Comments
COMMENT ON TABLE maintenance_events IS 'Vehicle maintenance, repair, and service records with cost tracking';
COMMENT ON COLUMN maintenance_events.paid_by IS 'Who pays: company (owned), supplier (rental), rider (damage/own-bike), insurance, warranty';
COMMENT ON COLUMN maintenance_events.downtime_hours IS 'Total hours vehicle was out of service';
