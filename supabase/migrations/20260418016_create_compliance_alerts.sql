-- T-024: Visa and license expiry alerts
-- Track expiring documents and auto-block non-compliant riders

-- Alert type
CREATE TYPE alert_type AS ENUM (
  'license_expiring',
  'license_expired',
  'visa_expiring',
  'visa_expired',
  'document_expiring',
  'document_expired',
  'registration_expiring',
  'registration_expired',
  'insurance_expiring',
  'insurance_expired'
);

-- Alert severity
CREATE TYPE alert_severity AS ENUM (
  'info',        -- 30+ days
  'warning',     -- 14-30 days
  'critical',    -- 7-14 days
  'blocking'     -- <7 days or expired
);

-- Compliance alerts table
CREATE TABLE compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Target
  employee_id UUID REFERENCES employees(id),
  asset_id UUID REFERENCES assets(id),
  document_id UUID REFERENCES employee_documents(id),
  
  -- Alert details
  alert_type alert_type NOT NULL,
  severity alert_severity NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  expires_at DATE NOT NULL,
  days_until_expiry INTEGER,
  
  -- Resolution
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES user_profiles(id),
  resolution_notes TEXT,
  
  -- Auto-generated tracking
  is_auto_blocked BOOLEAN DEFAULT false,
  blocked_at TIMESTAMPTZ,
  
  -- Notification tracking
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org alerts" ON compliance_alerts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own org alerts" ON compliance_alerts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_alerts_employee ON compliance_alerts(employee_id, is_resolved);
CREATE INDEX idx_alerts_asset ON compliance_alerts(asset_id, is_resolved);
CREATE INDEX idx_alerts_severity ON compliance_alerts(organization_id, severity, is_resolved);
CREATE INDEX idx_alerts_expiry ON compliance_alerts(expires_at) WHERE NOT is_resolved;

-- Function to calculate severity based on days until expiry
CREATE OR REPLACE FUNCTION calculate_alert_severity(p_days_until_expiry INTEGER)
RETURNS alert_severity AS $$
BEGIN
  IF p_days_until_expiry < 0 THEN
    RETURN 'blocking';
  ELSIF p_days_until_expiry <= 7 THEN
    RETURN 'critical';
  ELSIF p_days_until_expiry <= 14 THEN
    RETURN 'warning';
  ELSE
    RETURN 'info';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate alerts for expiring employee documents
CREATE OR REPLACE FUNCTION generate_employee_expiry_alerts(
  p_organization_id UUID,
  p_warning_days INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  v_alert_count INTEGER := 0;
  v_emp RECORD;
BEGIN
  -- Check license expiry
  FOR v_emp IN 
    SELECT 
      e.id, 
      e.organization_id,
      e.full_name,
      e.license_expiry,
      (e.license_expiry - CURRENT_DATE) AS days_until
    FROM employees e
    WHERE e.organization_id = p_organization_id
      AND e.license_expiry IS NOT NULL
      AND (e.license_expiry - CURRENT_DATE) <= p_warning_days
      AND e.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM compliance_alerts ca 
        WHERE ca.employee_id = e.id 
          AND ca.alert_type IN ('license_expiring', 'license_expired')
          AND NOT ca.is_resolved
      )
  LOOP
    INSERT INTO compliance_alerts (
      organization_id, employee_id, alert_type, severity, title, description,
      expires_at, days_until_expiry
    ) VALUES (
      v_emp.organization_id,
      v_emp.id,
      CASE WHEN v_emp.days_until < 0 THEN 'license_expired' ELSE 'license_expiring' END,
      calculate_alert_severity(v_emp.days_until),
      CASE WHEN v_emp.days_until < 0 
        THEN v_emp.full_name || '''s license has EXPIRED'
        ELSE v_emp.full_name || '''s license expiring in ' || v_emp.days_until || ' days'
      END,
      'License expires on ' || v_emp.license_expiry,
      v_emp.license_expiry,
      v_emp.days_until
    );
    v_alert_count := v_alert_count + 1;
  END LOOP;
  
  -- Check visa expiry
  FOR v_emp IN 
    SELECT 
      e.id, 
      e.organization_id,
      e.full_name,
      e.visa_expiry,
      (e.visa_expiry - CURRENT_DATE) AS days_until
    FROM employees e
    WHERE e.organization_id = p_organization_id
      AND e.visa_expiry IS NOT NULL
      AND (e.visa_expiry - CURRENT_DATE) <= p_warning_days
      AND e.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM compliance_alerts ca 
        WHERE ca.employee_id = e.id 
          AND ca.alert_type IN ('visa_expiring', 'visa_expired')
          AND NOT ca.is_resolved
      )
  LOOP
    INSERT INTO compliance_alerts (
      organization_id, employee_id, alert_type, severity, title, description,
      expires_at, days_until_expiry
    ) VALUES (
      v_emp.organization_id,
      v_emp.id,
      CASE WHEN v_emp.days_until < 0 THEN 'visa_expired' ELSE 'visa_expiring' END,
      calculate_alert_severity(v_emp.days_until),
      CASE WHEN v_emp.days_until < 0 
        THEN v_emp.full_name || '''s visa has EXPIRED'
        ELSE v_emp.full_name || '''s visa expiring in ' || v_emp.days_until || ' days'
      END,
      'Visa expires on ' || v_emp.visa_expiry,
      v_emp.visa_expiry,
      v_emp.days_until
    );
    v_alert_count := v_alert_count + 1;
  END LOOP;
  
  RETURN v_alert_count;
END;
$$ LANGUAGE plpgsql;

-- Function to generate alerts for expiring vehicle documents
CREATE OR REPLACE FUNCTION generate_vehicle_expiry_alerts(
  p_organization_id UUID,
  p_warning_days INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  v_alert_count INTEGER := 0;
  v_asset RECORD;
BEGIN
  -- Check registration expiry
  FOR v_asset IN 
    SELECT 
      a.id, 
      a.organization_id,
      a.name,
      a.registration_expiry,
      (a.registration_expiry - CURRENT_DATE) AS days_until
    FROM assets a
    WHERE a.organization_id = p_organization_id
      AND a.registration_expiry IS NOT NULL
      AND (a.registration_expiry - CURRENT_DATE) <= p_warning_days
      AND a.vehicle_status IN ('available', 'assigned', 'maintenance')
      AND a.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM compliance_alerts ca 
        WHERE ca.asset_id = a.id 
          AND ca.alert_type IN ('registration_expiring', 'registration_expired')
          AND NOT ca.is_resolved
      )
  LOOP
    INSERT INTO compliance_alerts (
      organization_id, asset_id, alert_type, severity, title, description,
      expires_at, days_until_expiry
    ) VALUES (
      v_asset.organization_id,
      v_asset.id,
      CASE WHEN v_asset.days_until < 0 THEN 'registration_expired' ELSE 'registration_expiring' END,
      calculate_alert_severity(v_asset.days_until),
      CASE WHEN v_asset.days_until < 0 
        THEN v_asset.name || ' registration has EXPIRED'
        ELSE v_asset.name || ' registration expiring in ' || v_asset.days_until || ' days'
      END,
      'Registration expires on ' || v_asset.registration_expiry,
      v_asset.registration_expiry,
      v_asset.days_until
    );
    v_alert_count := v_alert_count + 1;
  END LOOP;
  
  -- Check insurance expiry
  FOR v_asset IN 
    SELECT 
      a.id, 
      a.organization_id,
      a.name,
      a.insurance_expiry,
      (a.insurance_expiry - CURRENT_DATE) AS days_until
    FROM assets a
    WHERE a.organization_id = p_organization_id
      AND a.insurance_expiry IS NOT NULL
      AND (a.insurance_expiry - CURRENT_DATE) <= p_warning_days
      AND a.vehicle_status IN ('available', 'assigned', 'maintenance')
      AND a.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM compliance_alerts ca 
        WHERE ca.asset_id = a.id 
          AND ca.alert_type IN ('insurance_expiring', 'insurance_expired')
          AND NOT ca.is_resolved
      )
  LOOP
    INSERT INTO compliance_alerts (
      organization_id, asset_id, alert_type, severity, title, description,
      expires_at, days_until_expiry
    ) VALUES (
      v_asset.organization_id,
      v_asset.id,
      CASE WHEN v_asset.days_until < 0 THEN 'insurance_expired' ELSE 'insurance_expiring' END,
      calculate_alert_severity(v_asset.days_until),
      CASE WHEN v_asset.days_until < 0 
        THEN v_asset.name || ' insurance has EXPIRED'
        ELSE v_asset.name || ' insurance expiring in ' || v_asset.days_until || ' days'
      END,
      'Insurance expires on ' || v_asset.insurance_expiry,
      v_asset.insurance_expiry,
      v_asset.days_until
    );
    v_alert_count := v_alert_count + 1;
  END LOOP;
  
  RETURN v_alert_count;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-block employees with expired critical documents
CREATE OR REPLACE FUNCTION auto_block_expired_employees(
  p_organization_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_block_count INTEGER := 0;
BEGIN
  -- Block employees with expired license or visa
  UPDATE employees e
  SET 
    compliance_status = 'blocked',
    updated_at = now()
  WHERE e.organization_id = p_organization_id
    AND e.status = 'active'
    AND e.compliance_status != 'blocked'
    AND (
      (e.license_expiry IS NOT NULL AND e.license_expiry < CURRENT_DATE)
      OR
      (e.visa_expiry IS NOT NULL AND e.visa_expiry < CURRENT_DATE)
    );
  
  GET DIAGNOSTICS v_block_count = ROW_COUNT;
  
  -- Update alerts to mark as auto-blocked
  UPDATE compliance_alerts ca
  SET 
    is_auto_blocked = true,
    blocked_at = now(),
    updated_at = now()
  FROM employees e
  WHERE ca.employee_id = e.id
    AND e.organization_id = p_organization_id
    AND ca.severity = 'blocking'
    AND NOT ca.is_resolved
    AND NOT ca.is_auto_blocked;
  
  RETURN v_block_count;
END;
$$ LANGUAGE plpgsql;

-- View for compliance dashboard
CREATE OR REPLACE VIEW compliance_dashboard AS
SELECT 
  e.organization_id,
  COUNT(*) FILTER (WHERE e.compliance_status = 'compliant') AS compliant_count,
  COUNT(*) FILTER (WHERE e.compliance_status = 'expiring_soon') AS expiring_soon_count,
  COUNT(*) FILTER (WHERE e.compliance_status = 'non_compliant') AS non_compliant_count,
  COUNT(*) FILTER (WHERE e.compliance_status = 'blocked') AS blocked_count,
  COUNT(*) AS total_active_employees
FROM employees e
WHERE e.status = 'active'
GROUP BY e.organization_id;

-- Update employee compliance_status based on expiry dates
CREATE OR REPLACE FUNCTION update_employee_compliance_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate compliance status based on license and visa expiry
  NEW.compliance_status := CASE
    -- Blocked if either is expired
    WHEN (NEW.license_expiry IS NOT NULL AND NEW.license_expiry < CURRENT_DATE)
      OR (NEW.visa_expiry IS NOT NULL AND NEW.visa_expiry < CURRENT_DATE)
    THEN 'blocked'
    -- Non-compliant if either expires within 7 days
    WHEN (NEW.license_expiry IS NOT NULL AND NEW.license_expiry <= CURRENT_DATE + INTERVAL '7 days')
      OR (NEW.visa_expiry IS NOT NULL AND NEW.visa_expiry <= CURRENT_DATE + INTERVAL '7 days')
    THEN 'non_compliant'
    -- Expiring soon if either expires within 30 days
    WHEN (NEW.license_expiry IS NOT NULL AND NEW.license_expiry <= CURRENT_DATE + INTERVAL '30 days')
      OR (NEW.visa_expiry IS NOT NULL AND NEW.visa_expiry <= CURRENT_DATE + INTERVAL '30 days')
    THEN 'expiring_soon'
    -- Otherwise compliant
    ELSE 'compliant'
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_compliance_status
  BEFORE INSERT OR UPDATE OF license_expiry, visa_expiry ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_compliance_status();
