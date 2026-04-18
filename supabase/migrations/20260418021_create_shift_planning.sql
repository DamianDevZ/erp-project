-- T-033: Shift planning and roster structure
-- Add client_id, vehicle_id to shifts for complete assignment tracking

-- Create update_updated_at function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Client status enum
CREATE TYPE client_status AS ENUM (
  'active',
  'inactive',
  'onboarding',
  'suspended',
  'churned'
);

-- Client type enum (how they receive orders)
CREATE TYPE client_type AS ENUM (
  'aggregator_only',    -- Orders only via Talabat etc.
  'direct_only',        -- Orders directly from client
  'hybrid'              -- Both aggregator and direct orders
);

-- Clients table - businesses that contract delivery services
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Identity
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50), -- Short code (e.g., "MCD01" for McDonald's branch 1)
  client_type client_type NOT NULL DEFAULT 'aggregator_only',
  
  -- Contact
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  
  -- Location
  address TEXT,
  city VARCHAR(100),
  area VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Bahrain',
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  
  -- Business details
  business_type VARCHAR(100), -- restaurant, retail, pharmacy, etc.
  tax_id VARCHAR(100),
  
  -- Contract
  contract_start_date DATE,
  contract_end_date DATE,
  billing_frequency VARCHAR(50), -- weekly, bi-weekly, monthly
  payment_terms_days INT DEFAULT 30,
  
  -- Status
  status client_status NOT NULL DEFAULT 'onboarding',
  
  -- Associated platforms/aggregators (for aggregator_only or hybrid)
  -- This allows a client to have orders via multiple platforms
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- Client-Platform relationship (which platforms serve this client)
CREATE TABLE client_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  
  -- Client's identifier on that platform
  platform_client_id VARCHAR(255), -- How the aggregator identifies this client
  platform_client_name VARCHAR(255), -- Name on platform
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(client_id, platform_id)
);

-- Add client_id and vehicle_id to shifts
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS zone_id UUID; -- For zone-based scheduling

-- Shift type (added for clarity)
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS shift_type VARCHAR(50) DEFAULT 'regular';
-- Values: regular, overtime, on_call, training, split

-- Rider pairing validation
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS is_vehicle_assigned BOOLEAN DEFAULT false;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS vehicle_assigned_at TIMESTAMPTZ;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS vehicle_assigned_by UUID REFERENCES employees(id);

-- Indexes
CREATE INDEX idx_clients_org ON clients(organization_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_client_platforms_client ON client_platforms(client_id);
CREATE INDEX idx_client_platforms_platform ON client_platforms(platform_id);
CREATE INDEX idx_shifts_client ON shifts(client_id);
CREATE INDEX idx_shifts_vehicle ON shifts(vehicle_id);
CREATE INDEX idx_shifts_date_status ON shifts(shift_date, status);

-- Shift templates (for recurring schedules)
CREATE TABLE shift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Template schedule
  day_of_week INT, -- 0=Sunday, 1=Monday, etc. NULL for daily
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INT DEFAULT 0,
  
  -- Assignment
  platform_id UUID REFERENCES platforms(id),
  client_id UUID REFERENCES clients(id),
  zone_id UUID,
  
  -- Capacity
  required_riders INT DEFAULT 1,
  shift_type VARCHAR(50) DEFAULT 'regular',
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Roster planning view
CREATE OR REPLACE VIEW shift_roster AS
SELECT 
  s.id AS shift_id,
  s.organization_id,
  s.shift_date,
  s.start_time,
  s.end_time,
  s.status,
  s.shift_type,
  
  -- Employee
  s.employee_id,
  e.full_name AS employee_name,
  e.employee_id AS employee_code,
  e.compliance_status,
  
  -- Platform (aggregator)
  s.platform_id,
  p.name AS platform_name,
  
  -- Client
  s.client_id,
  c.name AS client_name,
  
  -- Vehicle
  s.vehicle_id,
  a.license_plate AS vehicle_plate,
  a.model AS vehicle_model,
  s.is_vehicle_assigned,
  
  -- Attendance linked
  att.id AS attendance_id,
  att.check_in_time,
  att.check_out_time,
  att.status AS attendance_status
  
FROM shifts s
LEFT JOIN employees e ON s.employee_id = e.id
LEFT JOIN platforms p ON s.platform_id = p.id
LEFT JOIN clients c ON s.client_id = c.id
LEFT JOIN assets a ON s.vehicle_id = a.id
LEFT JOIN attendance att ON (
  att.employee_id = s.employee_id 
  AND att.attendance_date = s.shift_date
);

-- RLS Policies
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_org_isolation" ON clients
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::uuid);

CREATE POLICY "client_platforms_org_isolation" ON client_platforms
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE organization_id = current_setting('app.current_organization_id')::uuid
    )
  );

CREATE POLICY "shift_templates_org_isolation" ON shift_templates
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- Trigger for updated_at
CREATE TRIGGER set_clients_updated
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_shift_templates_updated
  BEFORE UPDATE ON shift_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE clients IS 'Businesses that contract delivery services from the 3PL';
COMMENT ON TABLE client_platforms IS 'Links clients to platforms/aggregators they receive orders through';
COMMENT ON TABLE shift_templates IS 'Reusable shift templates for roster planning';
COMMENT ON COLUMN shifts.client_id IS 'Client assigned for this shift';
COMMENT ON COLUMN shifts.vehicle_id IS 'Vehicle assigned for this shift';
