-- Migration: Add vehicle-specific fields to assets
-- Tasks: T-003 (vehicle fields), T-004 (vehicle_source_type - already exists as 'ownership')

-- Note: The existing 'ownership' column with values ('company_owned', 'employee_owned', 'rental')
-- already maps to the partner's vehicle_source_type concept:
--   company_owned  → OWNED_BY_COMPANY
--   rental         → RENTED_BY_COMPANY  
--   employee_owned → RIDER_OWNED

-- T-003: Add vehicle compliance/expiry fields
ALTER TABLE assets ADD COLUMN IF NOT EXISTS registration_number TEXT DEFAULT NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS registration_expiry DATE DEFAULT NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT DEFAULT NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS insurance_expiry DATE DEFAULT NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS inspection_date DATE DEFAULT NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS inspection_expiry DATE DEFAULT NULL;

-- Operational status
CREATE TYPE vehicle_status AS ENUM (
  'available',      -- Ready to be assigned
  'assigned',       -- Currently assigned to a rider
  'maintenance',    -- In for service/repair
  'off_road',       -- Cannot be used (accident, major issue)
  'disposed'        -- Written off / sold
);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS vehicle_status vehicle_status DEFAULT 'available';

-- Compliance (auto-calculated based on expiries)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS compliance_status compliance_status DEFAULT 'compliant';

-- Vehicle source details (for cost tracking)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS purchase_date DATE DEFAULT NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(12,2) DEFAULT NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS expected_life_years INTEGER DEFAULT NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS disposal_date DATE DEFAULT NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS disposal_value DECIMAL(12,2) DEFAULT NULL;

-- Current operational data
ALTER TABLE assets ADD COLUMN IF NOT EXISTS odometer_reading INTEGER DEFAULT NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS last_odometer_date DATE DEFAULT NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS next_service_km INTEGER DEFAULT NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS next_service_date DATE DEFAULT NULL;

-- Spare/standby pool flag
ALTER TABLE assets ADD COLUMN IF NOT EXISTS is_spare BOOLEAN DEFAULT false;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_assets_vehicle_status ON assets(vehicle_status) WHERE type = 'vehicle';
CREATE INDEX IF NOT EXISTS idx_assets_compliance_status ON assets(compliance_status) WHERE type = 'vehicle';
CREATE INDEX IF NOT EXISTS idx_assets_registration_expiry ON assets(registration_expiry) WHERE registration_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_insurance_expiry ON assets(insurance_expiry) WHERE insurance_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_is_spare ON assets(is_spare) WHERE is_spare = true;

-- Comments
COMMENT ON COLUMN assets.vehicle_status IS 'Operational status: available, assigned, maintenance, off_road, disposed';
COMMENT ON COLUMN assets.is_spare IS 'True if this vehicle is in the spare/standby pool for replacements';
