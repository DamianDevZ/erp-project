-- T-020: Rider category rules by transport model
-- Defines pay/deduction rules per rider category

-- Configuration table for rider category rules
CREATE TABLE rider_category_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  category rider_category NOT NULL,
  
  -- Pay structure
  base_salary_enabled BOOLEAN DEFAULT false,
  base_salary_amount DECIMAL(10,3) DEFAULT 0,
  per_order_rate DECIMAL(10,3) DEFAULT 0,
  per_km_rate DECIMAL(10,3) DEFAULT 0,
  hourly_rate DECIMAL(10,3) DEFAULT 0,
  
  -- Allowances (for own_vehicle_rider)
  vehicle_allowance_enabled BOOLEAN DEFAULT false,
  vehicle_allowance_type TEXT CHECK (vehicle_allowance_type IN ('daily', 'weekly', 'monthly', 'per_order')),
  vehicle_allowance_amount DECIMAL(10,3) DEFAULT 0,
  fuel_allowance_enabled BOOLEAN DEFAULT false,
  fuel_allowance_type TEXT CHECK (fuel_allowance_type IN ('daily', 'weekly', 'monthly', 'per_km')),
  fuel_allowance_amount DECIMAL(10,3) DEFAULT 0,
  maintenance_allowance_enabled BOOLEAN DEFAULT false,
  maintenance_allowance_amount DECIMAL(10,3) DEFAULT 0,
  
  -- Deductions (for company_vehicle_rider)
  vehicle_deduction_enabled BOOLEAN DEFAULT false,
  vehicle_deduction_type TEXT CHECK (vehicle_deduction_type IN ('daily', 'weekly', 'monthly')),
  vehicle_deduction_amount DECIMAL(10,3) DEFAULT 0,
  damage_deduction_cap DECIMAL(10,3), -- Max deduction per incident
  
  -- Incentive sharing
  platform_incentive_share DECIMAL(5,2) DEFAULT 100, -- % of platform incentives rider keeps
  tip_share DECIMAL(5,2) DEFAULT 100, -- % of tips rider keeps
  
  -- Requirements
  requires_own_vehicle BOOLEAN DEFAULT false,
  requires_company_vehicle BOOLEAN DEFAULT true,
  requires_uniform BOOLEAN DEFAULT true,
  requires_bag BOOLEAN DEFAULT true,
  
  -- Deposit requirements
  deposit_required BOOLEAN DEFAULT false,
  deposit_amount DECIMAL(10,3) DEFAULT 0,
  deposit_refundable BOOLEAN DEFAULT true,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Only one active rule per category per org
  UNIQUE(organization_id, category, effective_from)
);

-- RLS policies
ALTER TABLE rider_category_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org rules" ON rider_category_rules
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own org rules" ON rider_category_rules
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Index for lookups
CREATE INDEX idx_rider_category_rules_org ON rider_category_rules(organization_id, category, is_active);

-- Function to get current rules for a category
CREATE OR REPLACE FUNCTION get_rider_category_rules(
  p_organization_id UUID,
  p_category rider_category,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS rider_category_rules AS $$
DECLARE
  v_rules rider_category_rules;
BEGIN
  SELECT * INTO v_rules
  FROM rider_category_rules
  WHERE organization_id = p_organization_id
    AND category = p_category
    AND is_active = true
    AND effective_from <= p_as_of_date
    AND (effective_to IS NULL OR effective_to >= p_as_of_date)
  ORDER BY effective_from DESC
  LIMIT 1;
  
  RETURN v_rules;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate rider earnings
CREATE OR REPLACE FUNCTION calculate_rider_earnings(
  p_employee_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS JSON AS $$
DECLARE
  v_employee employees;
  v_rules rider_category_rules;
  v_orders_count INTEGER;
  v_order_earnings DECIMAL(10,3);
  v_incentives DECIMAL(10,3);
  v_tips DECIMAL(10,3);
  v_total_km DECIMAL(10,2);
  v_working_days INTEGER;
  v_result JSON;
BEGIN
  -- Get employee
  SELECT * INTO v_employee FROM employees WHERE id = p_employee_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Employee not found');
  END IF;
  
  -- Get applicable rules
  v_rules := get_rider_category_rules(v_employee.organization_id, v_employee.rider_category, p_period_end);
  IF v_rules.id IS NULL THEN
    RETURN json_build_object('error', 'No rules found for category');
  END IF;
  
  -- Get order stats
  SELECT 
    COUNT(*),
    COALESCE(SUM(earnings), 0),
    COALESCE(SUM(platform_incentive), 0),
    COALESCE(SUM(tip_amount), 0),
    COALESCE(SUM(distance_km), 0)
  INTO v_orders_count, v_order_earnings, v_incentives, v_tips, v_total_km
  FROM orders
  WHERE employee_id = p_employee_id
    AND order_date BETWEEN p_period_start AND p_period_end
    AND status IN ('completed', 'delivered');
  
  -- Get working days from attendance
  SELECT COUNT(DISTINCT work_date)
  INTO v_working_days
  FROM attendance
  WHERE employee_id = p_employee_id
    AND work_date BETWEEN p_period_start AND p_period_end
    AND status IN ('present', 'late', 'early_out');
  
  -- Build result
  v_result := json_build_object(
    'employee_id', p_employee_id,
    'rider_category', v_employee.rider_category,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'working_days', v_working_days,
    'orders_count', v_orders_count,
    'total_km', v_total_km,
    -- Earnings breakdown
    'base_salary', CASE WHEN v_rules.base_salary_enabled THEN v_rules.base_salary_amount ELSE 0 END,
    'order_earnings', v_order_earnings,
    'per_order_bonus', v_orders_count * COALESCE(v_rules.per_order_rate, 0),
    'km_bonus', v_total_km * COALESCE(v_rules.per_km_rate, 0),
    'incentives', v_incentives * COALESCE(v_rules.platform_incentive_share, 100) / 100,
    'tips', v_tips * COALESCE(v_rules.tip_share, 100) / 100,
    -- Allowances (for own_vehicle_rider)
    'vehicle_allowance', CASE 
      WHEN v_rules.vehicle_allowance_enabled THEN 
        CASE v_rules.vehicle_allowance_type
          WHEN 'daily' THEN v_working_days * v_rules.vehicle_allowance_amount
          WHEN 'per_order' THEN v_orders_count * v_rules.vehicle_allowance_amount
          ELSE v_rules.vehicle_allowance_amount
        END
      ELSE 0
    END,
    'fuel_allowance', CASE 
      WHEN v_rules.fuel_allowance_enabled THEN 
        CASE v_rules.fuel_allowance_type
          WHEN 'daily' THEN v_working_days * v_rules.fuel_allowance_amount
          WHEN 'per_km' THEN v_total_km * v_rules.fuel_allowance_amount
          ELSE v_rules.fuel_allowance_amount
        END
      ELSE 0
    END,
    -- Deductions (for company_vehicle_rider)
    'vehicle_deduction', CASE 
      WHEN v_rules.vehicle_deduction_enabled THEN 
        CASE v_rules.vehicle_deduction_type
          WHEN 'daily' THEN v_working_days * v_rules.vehicle_deduction_amount
          ELSE v_rules.vehicle_deduction_amount
        END
      ELSE 0
    END
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;
