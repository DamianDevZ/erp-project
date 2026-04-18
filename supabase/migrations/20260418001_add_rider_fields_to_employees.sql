-- Migration: Add rider-specific fields to employees
-- Tasks: T-001 (soft delete), T-002 (rider fields)

-- T-001: Add soft delete support to key tables
ALTER TABLE employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_employees_deleted_at ON employees(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_deleted_at ON assets(deleted_at) WHERE deleted_at IS NULL;

-- T-002: Add rider-specific fields to employees
-- License information
ALTER TABLE employees ADD COLUMN IF NOT EXISTS license_number TEXT DEFAULT NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS license_type TEXT DEFAULT NULL; -- e.g., 'motorcycle', 'car', 'both'
ALTER TABLE employees ADD COLUMN IF NOT EXISTS license_expiry DATE DEFAULT NULL;

-- Visa information (for foreign workers)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS visa_number TEXT DEFAULT NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS visa_type TEXT DEFAULT NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS visa_expiry DATE DEFAULT NULL;

-- Rider category (affects pay structure and deductions)
CREATE TYPE rider_category AS ENUM (
  'company_vehicle_rider',    -- Uses company-owned or rented vehicle
  'own_vehicle_rider'         -- Uses their own vehicle (gets allowance)
);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS rider_category rider_category DEFAULT NULL;

-- Compliance status (auto-calculated based on document expiries)
CREATE TYPE compliance_status AS ENUM (
  'compliant',      -- All required docs valid
  'expiring_soon',  -- Some docs expiring within 30 days
  'non_compliant',  -- Has expired or missing required docs
  'blocked'         -- Cannot work due to compliance issues
);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS compliance_status compliance_status DEFAULT 'compliant';

-- Work-related tracking
ALTER TABLE employees ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS activation_date DATE DEFAULT NULL; -- When they can start working
ALTER TABLE employees ADD COLUMN IF NOT EXISTS deactivation_date DATE DEFAULT NULL; -- When they stopped working

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_employees_compliance_status ON employees(compliance_status);
CREATE INDEX IF NOT EXISTS idx_employees_rider_category ON employees(rider_category) WHERE rider_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_license_expiry ON employees(license_expiry) WHERE license_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_visa_expiry ON employees(visa_expiry) WHERE visa_expiry IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN employees.rider_category IS 'Rider transport model: company_vehicle_rider (uses company/rented bike) or own_vehicle_rider (uses own bike, gets allowance)';
COMMENT ON COLUMN employees.compliance_status IS 'Auto-calculated: compliant, expiring_soon (30 days), non_compliant, or blocked';
