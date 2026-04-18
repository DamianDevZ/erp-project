-- Migration: Create payroll table
-- Task: T-014 - Pay periods and calculations

-- Payroll status enum
DO $$ BEGIN
  CREATE TYPE payroll_status AS ENUM ('draft', 'calculated', 'approved', 'processing', 'paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Payroll table - pay periods and calculations
CREATE TABLE IF NOT EXISTS payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Period
  payroll_number TEXT DEFAULT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_date DATE DEFAULT NULL,
  
  -- Employee
  employee_id UUID NOT NULL REFERENCES employees(id),
  rider_category rider_category DEFAULT NULL,
  
  -- Earnings
  base_salary DECIMAL(12,2) DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  order_earnings DECIMAL(12,2) DEFAULT 0,
  hours_worked DECIMAL(8,2) DEFAULT 0,
  hourly_earnings DECIMAL(12,2) DEFAULT 0,
  incentives DECIMAL(12,2) DEFAULT 0,
  tips DECIMAL(12,2) DEFAULT 0,
  overtime_hours DECIMAL(8,2) DEFAULT 0,
  overtime_pay DECIMAL(12,2) DEFAULT 0,
  
  -- Allowances (T-026: own-bike allowance)
  vehicle_allowance DECIMAL(12,2) DEFAULT 0,
  phone_allowance DECIMAL(12,2) DEFAULT 0,
  fuel_allowance DECIMAL(12,2) DEFAULT 0,
  other_allowances DECIMAL(12,2) DEFAULT 0,
  allowances_notes TEXT DEFAULT NULL,
  
  -- Gross
  gross_pay DECIMAL(12,2) DEFAULT 0,
  
  -- Deductions (T-027: company-bike deduction)
  vehicle_deduction DECIMAL(12,2) DEFAULT 0,
  uniform_deduction DECIMAL(12,2) DEFAULT 0,
  equipment_deduction DECIMAL(12,2) DEFAULT 0,
  damage_deduction DECIMAL(12,2) DEFAULT 0,
  advance_recovery DECIMAL(12,2) DEFAULT 0,
  absence_deduction DECIMAL(12,2) DEFAULT 0,
  other_deductions DECIMAL(12,2) DEFAULT 0,
  deductions_notes TEXT DEFAULT NULL,
  
  -- Total deductions
  total_deductions DECIMAL(12,2) DEFAULT 0,
  
  -- Net
  net_pay DECIMAL(12,2) DEFAULT 0,
  
  -- Status
  status payroll_status DEFAULT 'draft',
  
  -- Approval
  calculated_at TIMESTAMPTZ DEFAULT NULL,
  calculated_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ DEFAULT NULL,
  approved_by UUID REFERENCES user_profiles(id),
  paid_at TIMESTAMPTZ DEFAULT NULL,
  
  -- Payment details
  payment_method TEXT DEFAULT NULL,
  payment_reference TEXT DEFAULT NULL,
  
  -- Notes
  notes TEXT DEFAULT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payroll_organization_id ON payroll(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(status);
CREATE INDEX IF NOT EXISTS idx_payroll_payment_date ON payroll(payment_date);

-- Unique: one payroll per employee per period
CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_unique ON payroll(organization_id, employee_id, period_start, period_end);

-- RLS
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_org_isolation ON payroll
  USING (organization_id = public.get_user_organization_id());

-- Auto-set organization_id trigger
CREATE TRIGGER set_payroll_org_id
  BEFORE INSERT ON payroll
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

-- Add FK from orders to payroll
ALTER TABLE orders ADD CONSTRAINT fk_orders_payroll FOREIGN KEY (payroll_id) REFERENCES payroll(id);

-- Comments
COMMENT ON TABLE payroll IS 'Pay periods and calculations for riders';
COMMENT ON COLUMN payroll.rider_category IS 'Copied from employee at calculation time for historical accuracy';
COMMENT ON COLUMN payroll.vehicle_allowance IS 'Monthly allowance for own-vehicle riders (T-026)';
COMMENT ON COLUMN payroll.vehicle_deduction IS 'Monthly deduction for company-vehicle riders (T-027)';
