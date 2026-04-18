-- Migration: Add aggregator-specific fields to platforms
-- Task: T-008 - Platforms = Aggregators (Talabat, Jahez, Keeta)

-- The 'platforms' table serves as both clients and aggregators.
-- Adding fields specific to aggregator integrations.

-- Integration configuration
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS api_base_url TEXT DEFAULT NULL;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT DEFAULT NULL; -- Store encrypted
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS api_webhook_secret TEXT DEFAULT NULL;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS integration_status TEXT DEFAULT 'not_configured'; -- not_configured, configured, active, error

-- Commission and financial terms
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT NULL; -- Platform's commission %
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS incentive_share_rate DECIMAL(5,2) DEFAULT NULL; -- Our share of incentives
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT NULL; -- e.g., 'weekly', 'biweekly', 'monthly'
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS payment_delay_days INTEGER DEFAULT 0; -- Days after period end

-- Operational requirements
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS requires_uniform BOOLEAN DEFAULT false;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS requires_bag BOOLEAN DEFAULT false;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS requires_phone_app BOOLEAN DEFAULT true;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS min_acceptance_rate DECIMAL(5,2) DEFAULT NULL;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS max_cancel_rate DECIMAL(5,2) DEFAULT NULL;

-- Order import tracking
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS last_order_sync_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS orders_import_method TEXT DEFAULT 'manual'; -- manual, api, csv

-- Create index
CREATE INDEX IF NOT EXISTS idx_platforms_integration_status ON platforms(integration_status) WHERE integration_status = 'active';

-- Comments  
COMMENT ON COLUMN platforms.api_key_encrypted IS 'API key for order imports - must be encrypted before storage';
COMMENT ON COLUMN platforms.integration_status IS 'API integration status: not_configured, configured, active, error';
COMMENT ON COLUMN platforms.orders_import_method IS 'How orders are imported: manual (UI entry), api (automatic), csv (file upload)';
