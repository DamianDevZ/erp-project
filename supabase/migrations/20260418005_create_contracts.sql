-- Migration: Create contracts table
-- Task: T-009 - Service contracts with clients/aggregators

-- Contracts define the commercial terms between us and clients/aggregators.
-- Includes rates, validity period, and billing terms.

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Contract parties
  platform_id UUID NOT NULL REFERENCES platforms(id), -- Client/aggregator
  
  -- Contract identification
  contract_number TEXT DEFAULT NULL,
  contract_name TEXT NOT NULL, -- e.g., "Talabat Manama Zone A - 2026"
  
  -- Validity period
  start_date DATE NOT NULL,
  end_date DATE DEFAULT NULL, -- NULL = open-ended / rolling
  
  -- Status
  status TEXT DEFAULT 'draft', -- draft, active, expired, terminated
  
  -- Revenue model
  billing_model TEXT NOT NULL, -- per_order, per_hour, per_shift, fixed_monthly, hybrid
  
  -- Rate structure (depends on billing_model)
  rate_per_order DECIMAL(10,2) DEFAULT NULL,
  rate_per_hour DECIMAL(10,2) DEFAULT NULL,
  rate_per_shift DECIMAL(10,2) DEFAULT NULL,
  fixed_monthly_amount DECIMAL(12,2) DEFAULT NULL,
  
  -- Incentive sharing
  incentive_share_percent DECIMAL(5,2) DEFAULT 100.00, -- % of platform incentives we keep
  
  -- Penalties and adjustments
  late_delivery_penalty DECIMAL(10,2) DEFAULT NULL,
  cancel_penalty DECIMAL(10,2) DEFAULT NULL,
  minimum_acceptance_rate DECIMAL(5,2) DEFAULT NULL,
  
  -- Volume commitments
  minimum_riders INTEGER DEFAULT NULL, -- Minimum riders we commit to provide
  minimum_orders_per_day INTEGER DEFAULT NULL,
  
  -- Billing terms (T-063)
  billing_frequency TEXT DEFAULT 'monthly', -- weekly, biweekly, monthly
  payment_due_days INTEGER DEFAULT 30, -- Days after invoice to pay
  currency TEXT DEFAULT 'BHD',
  
  -- Zone/region scope (if contract is regional)
  service_zones TEXT DEFAULT NULL, -- Comma-separated zone names
  
  -- Document storage
  contract_document_path TEXT DEFAULT NULL, -- Path in Supabase storage
  
  -- Notes and terms
  special_terms TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Indexes
CREATE INDEX idx_contracts_organization_id ON contracts(organization_id);
CREATE INDEX idx_contracts_platform_id ON contracts(platform_id);
CREATE INDEX idx_contracts_status ON contracts(status) WHERE status = 'active';
CREATE INDEX idx_contracts_dates ON contracts(start_date, end_date);

-- RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contracts_org_isolation ON contracts
  USING (organization_id = public.get_user_organization_id());

-- Comments
COMMENT ON TABLE contracts IS 'Service contracts defining commercial terms with clients/aggregators';
COMMENT ON COLUMN contracts.billing_model IS 'Revenue model: per_order, per_hour, per_shift, fixed_monthly, or hybrid';
COMMENT ON COLUMN contracts.incentive_share_percent IS 'Percentage of platform incentives/bonuses that we keep (vs pass to rider)';
