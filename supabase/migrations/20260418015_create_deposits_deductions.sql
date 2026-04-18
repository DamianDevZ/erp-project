-- T-023: Capture deposit/deduction agreements
-- Tracks deposits received and deduction agreements per employee

-- Deposit status
CREATE TYPE deposit_status AS ENUM (
  'pending',
  'received',
  'partially_refunded',
  'fully_refunded',
  'forfeited'
);

-- Deduction type
CREATE TYPE deduction_type AS ENUM (
  'vehicle_deposit',
  'uniform_deposit',
  'equipment_deposit',
  'advance_salary',
  'damage_recovery',
  'fine',
  'loan',
  'other'
);

-- Recovery method
CREATE TYPE recovery_method AS ENUM (
  'lump_sum',
  'fixed_installment',
  'percentage_of_pay',
  'per_day_worked'
);

-- Employee deposits table
CREATE TABLE employee_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  
  deposit_type deduction_type NOT NULL,
  description TEXT,
  
  -- Amount tracking
  amount DECIMAL(10,3) NOT NULL,
  currency TEXT DEFAULT 'BHD',
  received_date DATE,
  received_by UUID REFERENCES user_profiles(id),
  payment_method TEXT, -- cash, bank_transfer, payroll_deduction
  receipt_number TEXT,
  
  -- Status
  status deposit_status DEFAULT 'pending',
  
  -- Refund tracking
  refund_amount DECIMAL(10,3) DEFAULT 0,
  refund_date DATE,
  refund_reason TEXT,
  refund_processed_by UUID REFERENCES user_profiles(id),
  
  -- Related entity
  asset_id UUID REFERENCES assets(id), -- For vehicle/equipment deposits
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Deduction agreements table (for recoveries over time)
CREATE TABLE deduction_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  
  deduction_type deduction_type NOT NULL,
  description TEXT NOT NULL,
  
  -- Original amount
  original_amount DECIMAL(10,3) NOT NULL,
  currency TEXT DEFAULT 'BHD',
  
  -- Recovery schedule
  recovery_method recovery_method NOT NULL,
  installment_amount DECIMAL(10,3), -- For fixed_installment
  percentage_rate DECIMAL(5,2), -- For percentage_of_pay
  per_day_rate DECIMAL(10,3), -- For per_day_worked
  
  -- Schedule
  start_date DATE NOT NULL,
  expected_end_date DATE,
  max_recovery_per_period DECIMAL(10,3), -- Cap per pay period
  
  -- Progress tracking
  total_recovered DECIMAL(10,3) DEFAULT 0,
  remaining_balance DECIMAL(10,3),
  is_complete BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  -- Related entities
  incident_id UUID REFERENCES incidents(id), -- For damage recovery
  asset_id UUID REFERENCES assets(id), -- For equipment-related deductions
  
  -- Approval
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  employee_acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  paused_at TIMESTAMPTZ,
  pause_reason TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Deduction transactions (actual deductions taken)
CREATE TABLE deduction_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  deduction_agreement_id UUID NOT NULL REFERENCES deduction_agreements(id),
  
  -- Amount
  amount DECIMAL(10,3) NOT NULL,
  
  -- Source
  payroll_id UUID REFERENCES payroll(id),
  deducted_from TEXT, -- 'payroll', 'manual', 'deposit_forfeit'
  
  -- Timestamps
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE employee_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE deduction_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE deduction_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org deposits" ON employee_deposits
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own org deposits" ON employee_deposits
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view own org deductions" ON deduction_agreements
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own org deductions" ON deduction_agreements
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view own org deduction transactions" ON deduction_transactions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own org deduction transactions" ON deduction_transactions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_deposits_employee ON employee_deposits(employee_id, status);
CREATE INDEX idx_deduction_agreements_employee ON deduction_agreements(employee_id, is_active);
CREATE INDEX idx_deduction_transactions_agreement ON deduction_transactions(deduction_agreement_id);

-- Function to get employee deposit/deduction summary
CREATE OR REPLACE FUNCTION get_employee_financial_summary(
  p_employee_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'employee_id', p_employee_id,
    -- Deposits
    'total_deposits', COALESCE((
      SELECT SUM(amount) FROM employee_deposits 
      WHERE employee_id = p_employee_id AND status = 'received'
    ), 0),
    'refundable_deposits', COALESCE((
      SELECT SUM(amount - refund_amount) FROM employee_deposits 
      WHERE employee_id = p_employee_id AND status IN ('received', 'partially_refunded')
    ), 0),
    -- Active deductions
    'active_deductions', (
      SELECT json_agg(json_build_object(
        'id', id,
        'type', deduction_type,
        'description', description,
        'original_amount', original_amount,
        'recovered', total_recovered,
        'remaining', remaining_balance,
        'recovery_method', recovery_method,
        'installment_amount', installment_amount
      ))
      FROM deduction_agreements
      WHERE employee_id = p_employee_id AND is_active = true AND NOT is_complete
    ),
    'total_outstanding', COALESCE((
      SELECT SUM(remaining_balance) FROM deduction_agreements
      WHERE employee_id = p_employee_id AND is_active = true AND NOT is_complete
    ), 0)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate period deductions for payroll
CREATE OR REPLACE FUNCTION calculate_period_deductions(
  p_employee_id UUID,
  p_gross_pay DECIMAL(10,3)
)
RETURNS TABLE (
  agreement_id UUID,
  deduction_type deduction_type,
  description TEXT,
  amount DECIMAL(10,3)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    da.id AS agreement_id,
    da.deduction_type,
    da.description,
    LEAST(
      -- Calculate based on method
      CASE da.recovery_method
        WHEN 'fixed_installment' THEN da.installment_amount
        WHEN 'percentage_of_pay' THEN p_gross_pay * da.percentage_rate / 100
        WHEN 'lump_sum' THEN da.remaining_balance
        ELSE da.installment_amount
      END,
      -- Don't exceed remaining balance
      da.remaining_balance,
      -- Don't exceed max per period if set
      COALESCE(da.max_recovery_per_period, da.remaining_balance)
    ) AS amount
  FROM deduction_agreements da
  WHERE da.employee_id = p_employee_id
    AND da.is_active = true
    AND NOT da.is_complete
    AND da.start_date <= CURRENT_DATE
    AND da.remaining_balance > 0;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger to update remaining balance when transaction is created
CREATE OR REPLACE FUNCTION update_deduction_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE deduction_agreements
  SET 
    total_recovered = total_recovered + NEW.amount,
    remaining_balance = remaining_balance - NEW.amount,
    is_complete = (remaining_balance - NEW.amount <= 0),
    completed_at = CASE WHEN (remaining_balance - NEW.amount <= 0) THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = NEW.deduction_agreement_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deduction_balance
  AFTER INSERT ON deduction_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_deduction_balance();

-- Set initial remaining_balance on agreement creation
CREATE OR REPLACE FUNCTION set_initial_remaining_balance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.remaining_balance := NEW.original_amount;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_initial_balance
  BEFORE INSERT ON deduction_agreements
  FOR EACH ROW
  EXECUTE FUNCTION set_initial_remaining_balance();
