-- T-041: Order reconciliation process
-- Match actual vs promised per aggregator

-- Reconciliation batch status
CREATE TYPE reconciliation_batch_status AS ENUM ('pending', 'in_progress', 'completed', 'reviewed');

-- Reconciliation type
CREATE TYPE reconciliation_type AS ENUM ('daily', 'weekly', 'monthly', 'ad_hoc');

-- Reconciliation batches table
CREATE TABLE order_reconciliation_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  batch_number text NOT NULL,
  reconciliation_type reconciliation_type NOT NULL DEFAULT 'daily',
  platform_id uuid REFERENCES platforms(id),
  
  -- Period being reconciled
  period_start date NOT NULL,
  period_end date NOT NULL,
  
  -- Expected values (from platform reports)
  expected_order_count integer,
  expected_total_revenue numeric(12,2),
  expected_platform_commission numeric(12,2),
  expected_net_payout numeric(12,2),
  
  -- Actual values (from imported orders)
  actual_order_count integer,
  actual_total_revenue numeric(12,2),
  actual_platform_commission numeric(12,2),
  actual_net_payout numeric(12,2),
  
  -- Variance
  order_count_variance integer GENERATED ALWAYS AS (actual_order_count - expected_order_count) STORED,
  revenue_variance numeric(12,2) GENERATED ALWAYS AS (actual_total_revenue - expected_total_revenue) STORED,
  commission_variance numeric(12,2) GENERATED ALWAYS AS (actual_platform_commission - expected_platform_commission) STORED,
  payout_variance numeric(12,2) GENERATED ALWAYS AS (actual_net_payout - expected_net_payout) STORED,
  
  -- Status
  status reconciliation_batch_status NOT NULL DEFAULT 'pending',
  reconciled_at timestamptz,
  reconciled_by uuid REFERENCES employees(id),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES employees(id),
  
  -- Notes and resolution
  notes text,
  resolution_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, batch_number)
);

-- Reconciliation discrepancies table for individual order issues
CREATE TABLE order_reconciliation_discrepancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_batch_id uuid NOT NULL REFERENCES order_reconciliation_batches(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id),
  
  -- Discrepancy details
  discrepancy_type text NOT NULL,  -- missing_order, extra_order, amount_mismatch, status_mismatch
  external_order_id text,
  
  -- Expected vs actual
  expected_value numeric(12,2),
  actual_value numeric(12,2),
  variance numeric(12,2),
  
  -- Description
  description text,
  
  -- Resolution
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES employees(id),
  resolution_notes text,
  
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_reconciliation_batches_org ON order_reconciliation_batches(organization_id, status);
CREATE INDEX idx_reconciliation_batches_platform ON order_reconciliation_batches(platform_id);
CREATE INDEX idx_reconciliation_batches_period ON order_reconciliation_batches(period_start, period_end);
CREATE INDEX idx_reconciliation_discrepancies_batch ON order_reconciliation_discrepancies(reconciliation_batch_id);
CREATE INDEX idx_reconciliation_discrepancies_order ON order_reconciliation_discrepancies(order_id);

-- Function to generate reconciliation batch number
CREATE OR REPLACE FUNCTION generate_reconciliation_batch_number(p_org_id uuid)
RETURNS text AS $$
DECLARE
  v_count integer;
  v_date text;
BEGIN
  v_date := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM order_reconciliation_batches
  WHERE organization_id = p_org_id
    AND created_at::date = CURRENT_DATE;
  
  RETURN 'REC-' || v_date || '-' || LPAD(v_count::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to create reconciliation batch with actual values calculated
CREATE OR REPLACE FUNCTION create_reconciliation_batch(
  p_org_id uuid,
  p_platform_id uuid,
  p_period_start date,
  p_period_end date,
  p_reconciliation_type reconciliation_type DEFAULT 'daily',
  p_expected_order_count integer DEFAULT NULL,
  p_expected_total_revenue numeric DEFAULT NULL,
  p_expected_platform_commission numeric DEFAULT NULL,
  p_expected_net_payout numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_batch_id uuid;
  v_batch_number text;
  v_actual_count integer;
  v_actual_revenue numeric;
  v_actual_commission numeric;
  v_actual_net numeric;
BEGIN
  -- Calculate actual values from orders
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_revenue), 0),
    COALESCE(SUM(platform_commission), 0),
    COALESCE(SUM(net_revenue), 0)
  INTO v_actual_count, v_actual_revenue, v_actual_commission, v_actual_net
  FROM orders
  WHERE organization_id = p_org_id
    AND platform_id = p_platform_id
    AND order_date BETWEEN p_period_start AND p_period_end
    AND status NOT IN ('cancelled', 'returned');
  
  v_batch_number := generate_reconciliation_batch_number(p_org_id);
  
  INSERT INTO order_reconciliation_batches (
    organization_id, batch_number, reconciliation_type, platform_id,
    period_start, period_end,
    expected_order_count, expected_total_revenue, expected_platform_commission, expected_net_payout,
    actual_order_count, actual_total_revenue, actual_platform_commission, actual_net_payout,
    notes
  ) VALUES (
    p_org_id, v_batch_number, p_reconciliation_type, p_platform_id,
    p_period_start, p_period_end,
    p_expected_order_count, p_expected_total_revenue, p_expected_platform_commission, p_expected_net_payout,
    v_actual_count, v_actual_revenue, v_actual_commission, v_actual_net,
    p_notes
  )
  RETURNING id INTO v_batch_id;
  
  RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark orders as reconciled
CREATE OR REPLACE FUNCTION reconcile_orders(
  p_batch_id uuid,
  p_reconciled_by uuid
)
RETURNS integer AS $$
DECLARE
  v_batch order_reconciliation_batches;
  v_count integer;
BEGIN
  SELECT * INTO v_batch
  FROM order_reconciliation_batches
  WHERE id = p_batch_id;
  
  IF v_batch.id IS NULL THEN
    RAISE EXCEPTION 'Reconciliation batch not found';
  END IF;
  
  -- Mark all orders in period as reconciled
  UPDATE orders
  SET reconciled_at = now(),
      reconciliation_status = 'matched',
      updated_at = now()
  WHERE organization_id = v_batch.organization_id
    AND platform_id = v_batch.platform_id
    AND order_date BETWEEN v_batch.period_start AND v_batch.period_end
    AND reconciliation_status = 'pending';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Update batch status
  UPDATE order_reconciliation_batches
  SET status = 'completed',
      reconciled_at = now(),
      reconciled_by = p_reconciled_by,
      updated_at = now()
  WHERE id = p_batch_id;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- View: Reconciliation summary by platform
CREATE OR REPLACE VIEW reconciliation_summary_by_platform AS
SELECT 
  rb.organization_id,
  rb.platform_id,
  p.name AS platform_name,
  COUNT(rb.id) AS total_batches,
  SUM(CASE WHEN rb.status = 'completed' THEN 1 ELSE 0 END) AS completed_batches,
  SUM(CASE WHEN rb.status = 'pending' THEN 1 ELSE 0 END) AS pending_batches,
  SUM(rb.expected_order_count) AS total_expected_orders,
  SUM(rb.actual_order_count) AS total_actual_orders,
  SUM(rb.order_count_variance) AS total_order_variance,
  SUM(rb.expected_total_revenue) AS total_expected_revenue,
  SUM(rb.actual_total_revenue) AS total_actual_revenue,
  SUM(rb.revenue_variance) AS total_revenue_variance,
  COUNT(DISTINCT d.id) FILTER (WHERE d.is_resolved = false) AS unresolved_discrepancies
FROM order_reconciliation_batches rb
JOIN platforms p ON rb.platform_id = p.id
LEFT JOIN order_reconciliation_discrepancies d ON rb.id = d.reconciliation_batch_id
GROUP BY rb.organization_id, rb.platform_id, p.name;

-- View: Pending orders for reconciliation
CREATE OR REPLACE VIEW orders_pending_reconciliation AS
SELECT 
  o.organization_id,
  o.platform_id,
  p.name AS platform_name,
  o.order_date,
  COUNT(*) AS order_count,
  SUM(o.total_revenue) AS total_revenue,
  SUM(o.platform_commission) AS total_commission,
  SUM(o.net_revenue) AS net_revenue
FROM orders o
JOIN platforms p ON o.platform_id = p.id
WHERE o.reconciliation_status = 'pending'
  AND o.status NOT IN ('cancelled', 'returned')
GROUP BY o.organization_id, o.platform_id, p.name, o.order_date
ORDER BY o.order_date DESC;

-- Enable RLS
ALTER TABLE order_reconciliation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_reconciliation_discrepancies ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY reconciliation_batches_org_isolation ON order_reconciliation_batches
  FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY reconciliation_discrepancies_batch_access ON order_reconciliation_discrepancies
  FOR ALL USING (
    reconciliation_batch_id IN (
      SELECT id FROM order_reconciliation_batches 
      WHERE organization_id = current_setting('app.current_organization_id', true)::uuid
    )
  );

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_reconciliation_batch_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_reconciliation_batch(uuid, uuid, date, date, reconciliation_type, integer, numeric, numeric, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION reconcile_orders(uuid, uuid) TO authenticated;
