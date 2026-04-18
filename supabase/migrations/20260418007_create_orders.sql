-- Migration: Create orders table
-- Task: T-012 - Delivery orders from aggregators

-- Orders imported from aggregators (Talabat, Jahez, Keeta).
-- Used for revenue calculation, payroll, and reconciliation.

CREATE TYPE order_status AS ENUM (
  'pending',      -- Imported but not verified
  'completed',    -- Delivered successfully
  'cancelled',    -- Cancelled before completion
  'returned',     -- Item returned
  'disputed'      -- Under dispute/review
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- External reference
  external_order_id TEXT NOT NULL, -- Order ID from aggregator
  platform_id UUID NOT NULL REFERENCES platforms(id), -- Which aggregator
  contract_id UUID REFERENCES contracts(id), -- Which contract rate applies
  
  -- Assignment
  employee_id UUID REFERENCES employees(id), -- Which rider completed it
  asset_id UUID REFERENCES assets(id), -- Which vehicle was used
  
  -- Order timing
  order_date DATE NOT NULL,
  pickup_time TIMESTAMPTZ DEFAULT NULL,
  delivery_time TIMESTAMPTZ DEFAULT NULL,
  
  -- Order details
  order_type TEXT DEFAULT 'delivery', -- delivery, pickup, express, scheduled
  pickup_location TEXT DEFAULT NULL,
  delivery_location TEXT DEFAULT NULL,
  distance_km DECIMAL(8,2) DEFAULT NULL,
  
  -- Financial data
  order_value DECIMAL(12,2) DEFAULT NULL, -- Total order value
  delivery_fee DECIMAL(10,2) DEFAULT NULL, -- Fee charged to customer
  
  -- Revenue (what we earn)
  base_payout DECIMAL(10,2) DEFAULT NULL, -- Base delivery fee we receive
  incentive_payout DECIMAL(10,2) DEFAULT 0, -- Bonus/incentive amount
  tip_amount DECIMAL(10,2) DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT NULL, -- base + incentive + tip
  
  -- Deductions
  platform_commission DECIMAL(10,2) DEFAULT 0,
  penalty_amount DECIMAL(10,2) DEFAULT 0, -- Late delivery, cancel penalty, etc.
  
  -- Net
  net_revenue DECIMAL(10,2) DEFAULT NULL, -- total_revenue - commission - penalties
  
  -- Status
  status order_status DEFAULT 'pending',
  cancellation_reason TEXT DEFAULT NULL,
  
  -- Reconciliation
  import_batch_id TEXT DEFAULT NULL, -- Which import batch this came from
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  reconciled_at TIMESTAMPTZ DEFAULT NULL,
  reconciliation_status TEXT DEFAULT 'pending', -- pending, matched, mismatched, resolved
  reconciliation_notes TEXT DEFAULT NULL,
  
  -- Linking for payroll
  payroll_id UUID DEFAULT NULL, -- Will reference payroll table when created
  payroll_processed BOOLEAN DEFAULT false,
  
  -- Linking for invoicing
  invoice_id UUID REFERENCES invoices(id),
  invoice_processed BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orders_organization_id ON orders(organization_id);
CREATE INDEX idx_orders_platform_id ON orders(platform_id);
CREATE INDEX idx_orders_employee_id ON orders(employee_id);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_external_id ON orders(organization_id, platform_id, external_order_id);
CREATE INDEX idx_orders_import_batch ON orders(import_batch_id);
CREATE INDEX idx_orders_reconciliation ON orders(reconciliation_status) WHERE reconciliation_status != 'matched';
CREATE INDEX idx_orders_not_payrolled ON orders(payroll_processed) WHERE payroll_processed = false;
CREATE INDEX idx_orders_not_invoiced ON orders(invoice_processed) WHERE invoice_processed = false;

-- Unique: one order per external_order_id per platform
CREATE UNIQUE INDEX idx_orders_unique_external ON orders(organization_id, platform_id, external_order_id);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_org_isolation ON orders
  USING (organization_id = public.get_user_organization_id());

-- Comments
COMMENT ON TABLE orders IS 'Delivery orders imported from aggregators for revenue tracking and payroll';
COMMENT ON COLUMN orders.external_order_id IS 'Order ID from the aggregator platform - unique per platform';
COMMENT ON COLUMN orders.reconciliation_status IS 'Whether this order matches aggregator records: pending, matched, mismatched, resolved';
