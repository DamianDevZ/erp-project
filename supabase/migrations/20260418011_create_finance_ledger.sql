-- Migration: Create finance_ledger table
-- Task: T-015 - Cost allocation and financial tracking

-- Transaction type enum
DO $$ BEGIN
  CREATE TYPE ledger_transaction_type AS ENUM (
    'revenue',          -- Income from clients/aggregators
    'payroll',          -- Pay to riders
    'vehicle_cost',     -- Vehicle-related costs
    'rent_expense',     -- Rental payments to suppliers
    'maintenance',      -- Repair/service costs
    'depreciation',     -- Asset depreciation
    'insurance',        -- Insurance costs
    'penalty',          -- Penalties paid
    'recovery',         -- Recovered amounts
    'adjustment',       -- Manual adjustments
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Finance ledger for cost allocation and tracking
CREATE TABLE IF NOT EXISTS finance_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Transaction details
  transaction_date DATE NOT NULL,
  transaction_type ledger_transaction_type NOT NULL,
  category TEXT DEFAULT NULL, -- Sub-category for reporting
  description TEXT NOT NULL,
  
  -- Amount (positive = expense/debit, negative = income/credit for proper P&L)
  amount DECIMAL(14,2) NOT NULL,
  currency TEXT DEFAULT 'BHD',
  
  -- Cost allocation dimensions
  platform_id UUID REFERENCES platforms(id),      -- Which client/aggregator
  contract_id UUID REFERENCES contracts(id),      -- Which contract
  employee_id UUID REFERENCES employees(id),      -- Which rider
  asset_id UUID REFERENCES assets(id),            -- Which vehicle
  vendor_id UUID REFERENCES vendors(id),          -- Which supplier
  
  -- Vehicle source type for profitability analysis (T-073)
  vehicle_source_type TEXT DEFAULT NULL, -- 'company_owned', 'rental', 'employee_owned'
  
  -- Reference to source record
  source_table TEXT DEFAULT NULL, -- orders, payroll, maintenance_events, etc.
  source_id UUID DEFAULT NULL,
  
  -- Accounting period
  accounting_period TEXT DEFAULT NULL, -- YYYY-MM format
  
  -- Status
  is_posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMPTZ DEFAULT NULL,
  posted_by UUID REFERENCES user_profiles(id),
  
  -- Notes
  notes TEXT DEFAULT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for reporting
CREATE INDEX IF NOT EXISTS idx_finance_ledger_organization_id ON finance_ledger(organization_id);
CREATE INDEX IF NOT EXISTS idx_finance_ledger_transaction_date ON finance_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_finance_ledger_transaction_type ON finance_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_finance_ledger_platform_id ON finance_ledger(platform_id);
CREATE INDEX IF NOT EXISTS idx_finance_ledger_employee_id ON finance_ledger(employee_id);
CREATE INDEX IF NOT EXISTS idx_finance_ledger_asset_id ON finance_ledger(asset_id);
CREATE INDEX IF NOT EXISTS idx_finance_ledger_vehicle_source ON finance_ledger(vehicle_source_type);
CREATE INDEX IF NOT EXISTS idx_finance_ledger_accounting_period ON finance_ledger(accounting_period);
CREATE INDEX IF NOT EXISTS idx_finance_ledger_source ON finance_ledger(source_table, source_id);

-- RLS
ALTER TABLE finance_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY finance_ledger_org_isolation ON finance_ledger
  USING (organization_id = public.get_user_organization_id());

-- Auto-set organization_id trigger
CREATE TRIGGER set_finance_ledger_org_id
  BEFORE INSERT ON finance_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

-- Comments
COMMENT ON TABLE finance_ledger IS 'Cost allocation and financial tracking for P&L analysis';
COMMENT ON COLUMN finance_ledger.vehicle_source_type IS 'For T-073 profit by source type: company_owned, rental, employee_owned';
COMMENT ON COLUMN finance_ledger.accounting_period IS 'YYYY-MM format for period reporting';
