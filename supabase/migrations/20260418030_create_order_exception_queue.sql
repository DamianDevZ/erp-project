-- T-042: Exception queue for mismatched orders
-- Flag orders where km/time doesn't match

-- Exception type enum
CREATE TYPE order_exception_type AS ENUM (
  'distance_mismatch',       -- Reported distance vs expected doesn't match
  'time_mismatch',           -- Delivery time impossibly fast/slow for distance
  'amount_suspicious',       -- Order value or payout unusual
  'duplicate_suspected',     -- Possible duplicate order
  'missing_rider',           -- Order has no rider assigned
  'late_delivery',           -- Delivered significantly late
  'cancelled_after_pickup',  -- Cancellation after pickup
  'high_tip',                -- Unusually high tip (possible fraud)
  'manual_review'            -- General manual review needed
);

-- Exception severity
CREATE TYPE exception_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Exception status
CREATE TYPE exception_status AS ENUM ('pending', 'in_review', 'resolved', 'dismissed', 'escalated');

-- Exception rules configuration table
CREATE TABLE order_exception_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  rule_name text NOT NULL,
  exception_type order_exception_type NOT NULL,
  is_active boolean DEFAULT true,
  
  -- Rule parameters (stored as JSONB for flexibility)
  -- e.g., {"max_speed_kmh": 60, "min_speed_kmh": 5}
  rule_parameters jsonb NOT NULL DEFAULT '{}',
  
  -- Severity assignment
  severity exception_severity NOT NULL DEFAULT 'medium',
  
  -- Auto-action
  auto_flag boolean DEFAULT true,  -- Auto-create exception
  auto_escalate boolean DEFAULT false,  -- Auto-escalate to manager
  
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, rule_name)
);

-- Order exceptions queue table
CREATE TABLE order_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  order_id uuid NOT NULL REFERENCES orders(id),
  rule_id uuid REFERENCES order_exception_rules(id),
  
  -- Exception details
  exception_type order_exception_type NOT NULL,
  severity exception_severity NOT NULL DEFAULT 'medium',
  
  -- What triggered it
  expected_value numeric,
  actual_value numeric,
  variance_percent numeric,
  description text NOT NULL,
  
  -- Status
  status exception_status NOT NULL DEFAULT 'pending',
  
  -- Review tracking
  reviewed_by uuid REFERENCES employees(id),
  reviewed_at timestamptz,
  review_notes text,
  
  -- Resolution
  resolution text,
  resolved_by uuid REFERENCES employees(id),
  resolved_at timestamptz,
  
  -- Escalation
  escalated_to uuid REFERENCES employees(id),
  escalated_at timestamptz,
  escalation_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_exception_rules_org ON order_exception_rules(organization_id, is_active);
CREATE INDEX idx_order_exceptions_org_status ON order_exceptions(organization_id, status);
CREATE INDEX idx_order_exceptions_order ON order_exceptions(order_id);
CREATE INDEX idx_order_exceptions_type ON order_exceptions(exception_type);
CREATE INDEX idx_order_exceptions_severity ON order_exceptions(severity);
CREATE INDEX idx_order_exceptions_created ON order_exceptions(created_at DESC);

-- Insert default exception rules
CREATE OR REPLACE FUNCTION insert_default_exception_rules(p_org_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO order_exception_rules (organization_id, rule_name, exception_type, rule_parameters, severity, description)
  VALUES 
    (p_org_id, 'Speed Too Fast', 'time_mismatch', 
     '{"max_speed_kmh": 80}', 'high',
     'Flags orders where implied speed exceeds 80 km/h'),
    (p_org_id, 'Speed Too Slow', 'time_mismatch',
     '{"min_speed_kmh": 5, "min_time_minutes": 10}', 'low',
     'Flags orders taking unusually long for distance'),
    (p_org_id, 'Distance Variance', 'distance_mismatch',
     '{"variance_percent": 50}', 'medium',
     'Flags orders where reported distance differs by more than 50%'),
    (p_org_id, 'High Tip Alert', 'high_tip',
     '{"tip_threshold": 50, "tip_percent_threshold": 25}', 'medium',
     'Flags orders with unusually high tips'),
    (p_org_id, 'Post-Pickup Cancel', 'cancelled_after_pickup',
     '{}', 'high',
     'Flags orders cancelled after pickup time'),
    (p_org_id, 'Unassigned Order', 'missing_rider',
     '{}', 'medium',
     'Flags completed orders without rider assignment')
  ON CONFLICT (organization_id, rule_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to check order against exception rules
CREATE OR REPLACE FUNCTION check_order_exceptions(p_order_id uuid)
RETURNS TABLE (
  exception_type order_exception_type,
  severity exception_severity,
  description text,
  expected_value numeric,
  actual_value numeric,
  variance_percent numeric
) AS $$
DECLARE
  v_order orders;
  v_rule record;
  v_speed numeric;
  v_time_diff_minutes numeric;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order.id IS NULL THEN
    RETURN;
  END IF;
  
  -- Loop through active rules for this org
  FOR v_rule IN 
    SELECT * FROM order_exception_rules 
    WHERE organization_id = v_order.organization_id 
      AND is_active = true
  LOOP
    -- Time/Speed checks
    IF v_rule.exception_type = 'time_mismatch' AND 
       v_order.distance_km IS NOT NULL AND 
       v_order.pickup_time IS NOT NULL AND 
       v_order.delivery_time IS NOT NULL THEN
      
      v_time_diff_minutes := EXTRACT(EPOCH FROM (v_order.delivery_time - v_order.pickup_time)) / 60;
      
      IF v_time_diff_minutes > 0 THEN
        v_speed := (v_order.distance_km / v_time_diff_minutes) * 60;  -- km/h
        
        -- Check max speed
        IF (v_rule.rule_parameters->>'max_speed_kmh')::numeric IS NOT NULL AND
           v_speed > (v_rule.rule_parameters->>'max_speed_kmh')::numeric THEN
          exception_type := v_rule.exception_type;
          severity := v_rule.severity;
          description := 'Implied speed of ' || ROUND(v_speed, 1) || ' km/h exceeds maximum';
          expected_value := (v_rule.rule_parameters->>'max_speed_kmh')::numeric;
          actual_value := v_speed;
          variance_percent := ((v_speed - expected_value) / expected_value) * 100;
          RETURN NEXT;
        END IF;
        
        -- Check min speed
        IF (v_rule.rule_parameters->>'min_speed_kmh')::numeric IS NOT NULL AND
           v_speed < (v_rule.rule_parameters->>'min_speed_kmh')::numeric THEN
          exception_type := v_rule.exception_type;
          severity := v_rule.severity;
          description := 'Implied speed of ' || ROUND(v_speed, 1) || ' km/h below minimum';
          expected_value := (v_rule.rule_parameters->>'min_speed_kmh')::numeric;
          actual_value := v_speed;
          variance_percent := ((expected_value - v_speed) / expected_value) * 100;
          RETURN NEXT;
        END IF;
      END IF;
    END IF;
    
    -- High tip check
    IF v_rule.exception_type = 'high_tip' AND v_order.tip_amount IS NOT NULL THEN
      IF (v_rule.rule_parameters->>'tip_threshold')::numeric IS NOT NULL AND
         v_order.tip_amount > (v_rule.rule_parameters->>'tip_threshold')::numeric THEN
        exception_type := v_rule.exception_type;
        severity := v_rule.severity;
        description := 'Tip amount of ' || v_order.tip_amount || ' exceeds threshold';
        expected_value := (v_rule.rule_parameters->>'tip_threshold')::numeric;
        actual_value := v_order.tip_amount;
        variance_percent := ((v_order.tip_amount - expected_value) / expected_value) * 100;
        RETURN NEXT;
      END IF;
    END IF;
    
    -- Missing rider check
    IF v_rule.exception_type = 'missing_rider' AND 
       v_order.status = 'completed' AND 
       v_order.employee_id IS NULL THEN
      exception_type := v_rule.exception_type;
      severity := v_rule.severity;
      description := 'Completed order has no rider assigned';
      expected_value := NULL;
      actual_value := NULL;
      variance_percent := NULL;
      RETURN NEXT;
    END IF;
    
    -- Cancelled after pickup
    IF v_rule.exception_type = 'cancelled_after_pickup' AND
       v_order.status = 'cancelled' AND
       v_order.pickup_time IS NOT NULL THEN
      exception_type := v_rule.exception_type;
      severity := v_rule.severity;
      description := 'Order cancelled after pickup at ' || v_order.pickup_time::text;
      expected_value := NULL;
      actual_value := NULL;
      variance_percent := NULL;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create exceptions for an order
CREATE OR REPLACE FUNCTION create_order_exceptions(p_order_id uuid)
RETURNS integer AS $$
DECLARE
  v_exception record;
  v_count integer := 0;
  v_org_id uuid;
  v_rule_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id FROM orders WHERE id = p_order_id;
  
  FOR v_exception IN SELECT * FROM check_order_exceptions(p_order_id)
  LOOP
    -- Find the rule_id
    SELECT id INTO v_rule_id
    FROM order_exception_rules
    WHERE organization_id = v_org_id
      AND exception_type = v_exception.exception_type
      AND is_active = true
    LIMIT 1;
    
    -- Insert exception if not already exists for this order/type
    INSERT INTO order_exceptions (
      organization_id, order_id, rule_id, exception_type, severity,
      expected_value, actual_value, variance_percent, description
    )
    SELECT v_org_id, p_order_id, v_rule_id, v_exception.exception_type, v_exception.severity,
           v_exception.expected_value, v_exception.actual_value, v_exception.variance_percent,
           v_exception.description
    WHERE NOT EXISTS (
      SELECT 1 FROM order_exceptions
      WHERE order_id = p_order_id
        AND exception_type = v_exception.exception_type
        AND status NOT IN ('resolved', 'dismissed')
    );
    
    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- View: Exception queue with order details
CREATE OR REPLACE VIEW order_exception_queue AS
SELECT 
  oe.id,
  oe.organization_id,
  oe.order_id,
  o.external_order_id,
  o.order_date,
  o.platform_id,
  p.name AS platform_name,
  o.employee_id,
  e.full_name AS rider_name,
  oe.exception_type,
  oe.severity,
  oe.description,
  oe.expected_value,
  oe.actual_value,
  oe.variance_percent,
  oe.status,
  oe.reviewed_by,
  rv.full_name AS reviewed_by_name,
  oe.reviewed_at,
  oe.review_notes,
  oe.resolution,
  oe.resolved_by,
  rs.full_name AS resolved_by_name,
  oe.resolved_at,
  oe.escalated_to,
  es.full_name AS escalated_to_name,
  oe.escalated_at,
  oe.created_at,
  -- Calculate age
  EXTRACT(EPOCH FROM (now() - oe.created_at)) / 3600 AS hours_pending
FROM order_exceptions oe
JOIN orders o ON oe.order_id = o.id
LEFT JOIN platforms p ON o.platform_id = p.id
LEFT JOIN employees e ON o.employee_id = e.id
LEFT JOIN employees rv ON oe.reviewed_by = rv.id
LEFT JOIN employees rs ON oe.resolved_by = rs.id
LEFT JOIN employees es ON oe.escalated_to = es.id;

-- View: Exception summary by type
CREATE OR REPLACE VIEW exception_summary_by_type AS
SELECT 
  oe.organization_id,
  oe.exception_type,
  COUNT(*) AS total_count,
  COUNT(*) FILTER (WHERE oe.status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE oe.status = 'in_review') AS in_review_count,
  COUNT(*) FILTER (WHERE oe.status = 'resolved') AS resolved_count,
  COUNT(*) FILTER (WHERE oe.status = 'dismissed') AS dismissed_count,
  COUNT(*) FILTER (WHERE oe.status = 'escalated') AS escalated_count,
  AVG(EXTRACT(EPOCH FROM (COALESCE(oe.resolved_at, now()) - oe.created_at)) / 3600) 
    FILTER (WHERE oe.status = 'resolved') AS avg_resolution_hours
FROM order_exceptions oe
GROUP BY oe.organization_id, oe.exception_type;

-- Enable RLS
ALTER TABLE order_exception_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_exceptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY exception_rules_org_isolation ON order_exception_rules
  FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY order_exceptions_org_isolation ON order_exceptions
  FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- Grant permissions
GRANT EXECUTE ON FUNCTION insert_default_exception_rules(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_order_exceptions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_order_exceptions(uuid) TO authenticated;
