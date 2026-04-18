-- T-040: Manual order import fallback
-- Upload Excel if API fails - track import batches and data sources

-- Data source enum
CREATE TYPE order_data_source AS ENUM ('api', 'manual_excel', 'manual_csv', 'manual_entry');

-- Import batch status enum
CREATE TYPE import_batch_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'partially_completed');

-- Import batches table
CREATE TABLE order_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  batch_number text NOT NULL,
  data_source order_data_source NOT NULL DEFAULT 'manual_excel',
  platform_id uuid REFERENCES platforms(id),
  
  -- File info
  file_name text,
  file_path text,
  file_size_bytes integer,
  
  -- Import stats
  total_rows integer DEFAULT 0,
  processed_rows integer DEFAULT 0,
  successful_rows integer DEFAULT 0,
  failed_rows integer DEFAULT 0,
  skipped_duplicates integer DEFAULT 0,
  
  -- Date range of imported data
  order_date_from date,
  order_date_to date,
  
  -- Status
  status import_batch_status NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  
  -- User tracking
  imported_by uuid REFERENCES employees(id),
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, batch_number)
);

-- Import errors table for detailed error tracking
CREATE TABLE order_import_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES order_import_batches(id) ON DELETE CASCADE,
  row_number integer,
  external_order_id text,
  error_type text NOT NULL,
  error_message text NOT NULL,
  row_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add data_source column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS data_source order_data_source DEFAULT 'api';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS import_errors text[];

-- Index for batch lookups
CREATE INDEX idx_import_batches_org_status ON order_import_batches(organization_id, status);
CREATE INDEX idx_import_batches_platform ON order_import_batches(platform_id);
CREATE INDEX idx_import_errors_batch ON order_import_errors(batch_id);
CREATE INDEX idx_orders_batch ON orders(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX idx_orders_data_source ON orders(data_source);

-- Function to generate batch number
CREATE OR REPLACE FUNCTION generate_import_batch_number(p_org_id uuid)
RETURNS text AS $$
DECLARE
  v_count integer;
  v_date text;
BEGIN
  v_date := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM order_import_batches
  WHERE organization_id = p_org_id
    AND created_at::date = CURRENT_DATE;
  
  RETURN 'IMP-' || v_date || '-' || LPAD(v_count::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to create an import batch
CREATE OR REPLACE FUNCTION create_order_import_batch(
  p_org_id uuid,
  p_platform_id uuid DEFAULT NULL,
  p_data_source order_data_source DEFAULT 'manual_excel',
  p_file_name text DEFAULT NULL,
  p_imported_by uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_batch_id uuid;
  v_batch_number text;
BEGIN
  v_batch_number := generate_import_batch_number(p_org_id);
  
  INSERT INTO order_import_batches (
    organization_id, batch_number, data_source, platform_id,
    file_name, imported_by, notes, status
  ) VALUES (
    p_org_id, v_batch_number, p_data_source, p_platform_id,
    p_file_name, p_imported_by, p_notes, 'pending'
  )
  RETURNING id INTO v_batch_id;
  
  RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql;

-- Function to start processing a batch
CREATE OR REPLACE FUNCTION start_import_batch_processing(p_batch_id uuid, p_total_rows integer)
RETURNS void AS $$
BEGIN
  UPDATE order_import_batches
  SET status = 'processing',
      started_at = now(),
      total_rows = p_total_rows,
      updated_at = now()
  WHERE id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record import error
CREATE OR REPLACE FUNCTION record_import_error(
  p_batch_id uuid,
  p_row_number integer,
  p_external_order_id text,
  p_error_type text,
  p_error_message text,
  p_row_data jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO order_import_errors (
    batch_id, row_number, external_order_id, error_type, error_message, row_data
  ) VALUES (
    p_batch_id, p_row_number, p_external_order_id, p_error_type, p_error_message, p_row_data
  );
  
  UPDATE order_import_batches
  SET failed_rows = COALESCE(failed_rows, 0) + 1,
      processed_rows = COALESCE(processed_rows, 0) + 1,
      updated_at = now()
  WHERE id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete a batch
CREATE OR REPLACE FUNCTION complete_import_batch(
  p_batch_id uuid,
  p_successful_rows integer,
  p_skipped_duplicates integer DEFAULT 0,
  p_order_date_from date DEFAULT NULL,
  p_order_date_to date DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_failed integer;
  v_status import_batch_status;
BEGIN
  SELECT failed_rows INTO v_failed
  FROM order_import_batches
  WHERE id = p_batch_id;
  
  -- Determine final status
  IF v_failed = 0 AND p_successful_rows > 0 THEN
    v_status := 'completed';
  ELSIF p_successful_rows > 0 AND v_failed > 0 THEN
    v_status := 'partially_completed';
  ELSE
    v_status := 'failed';
  END IF;
  
  UPDATE order_import_batches
  SET status = v_status,
      completed_at = now(),
      successful_rows = p_successful_rows,
      skipped_duplicates = p_skipped_duplicates,
      processed_rows = p_successful_rows + COALESCE(failed_rows, 0) + p_skipped_duplicates,
      order_date_from = p_order_date_from,
      order_date_to = p_order_date_to,
      updated_at = now()
  WHERE id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

-- View for import batch summary
CREATE OR REPLACE VIEW import_batch_summary AS
SELECT 
  ib.id,
  ib.organization_id,
  ib.batch_number,
  ib.data_source,
  ib.platform_id,
  p.name AS platform_name,
  ib.file_name,
  ib.total_rows,
  ib.processed_rows,
  ib.successful_rows,
  ib.failed_rows,
  ib.skipped_duplicates,
  CASE WHEN ib.total_rows > 0 
    THEN ROUND((ib.successful_rows::numeric / ib.total_rows) * 100, 1)
    ELSE 0 
  END AS success_rate,
  ib.order_date_from,
  ib.order_date_to,
  ib.status,
  ib.started_at,
  ib.completed_at,
  EXTRACT(EPOCH FROM (ib.completed_at - ib.started_at)) AS processing_seconds,
  ib.imported_by,
  e.full_name AS imported_by_name,
  ib.error_message,
  ib.notes,
  ib.created_at
FROM order_import_batches ib
LEFT JOIN platforms p ON ib.platform_id = p.id
LEFT JOIN employees e ON ib.imported_by = e.id;

-- Enable RLS
ALTER TABLE order_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_import_errors ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY order_import_batches_org_isolation ON order_import_batches
  FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY order_import_errors_batch_access ON order_import_errors
  FOR ALL USING (
    batch_id IN (
      SELECT id FROM order_import_batches 
      WHERE organization_id = current_setting('app.current_organization_id', true)::uuid
    )
  );

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_import_batch_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_order_import_batch(uuid, uuid, order_data_source, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION start_import_batch_processing(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION record_import_error(uuid, integer, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_import_batch(uuid, integer, integer, date, date) TO authenticated;
