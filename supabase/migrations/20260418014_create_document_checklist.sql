-- T-021: Document collection checklist
-- Required documents configuration and completion tracking

-- Document verification status
CREATE TYPE document_status AS ENUM (
  'pending_upload',
  'uploaded',
  'under_review',
  'approved',
  'rejected',
  'expired'
);

-- Required document types configuration
CREATE TABLE required_document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  document_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Who needs this document
  required_for_role TEXT[], -- Array of roles: ['rider', 'supervisor', etc]
  required_for_category rider_category[], -- Array of categories
  required_for_onboarding BOOLEAN DEFAULT true,
  
  -- Document properties
  has_expiry BOOLEAN DEFAULT false,
  expiry_warning_days INTEGER DEFAULT 30, -- Days before expiry to warn
  allows_multiple BOOLEAN DEFAULT false, -- Can have multiple of same type
  
  -- Validation
  accepted_file_types TEXT[] DEFAULT ARRAY['pdf', 'jpg', 'jpeg', 'png'],
  max_file_size_mb INTEGER DEFAULT 10,
  
  -- Priority/order
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id, document_type)
);

-- Add status and tracking to employee_documents
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS status document_status DEFAULT 'pending_upload';
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS required_document_type_id UUID REFERENCES required_document_types(id);
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES user_profiles(id);
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES user_profiles(id);
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- RLS for required_document_types
ALTER TABLE required_document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org doc types" ON required_document_types
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own org doc types" ON required_document_types
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Index for lookups
CREATE INDEX idx_required_docs_org ON required_document_types(organization_id, is_active);
CREATE INDEX idx_employee_docs_status ON employee_documents(employee_id, status);

-- Function to get document completion status for an employee
CREATE OR REPLACE FUNCTION get_employee_document_checklist(
  p_employee_id UUID
)
RETURNS TABLE (
  document_type TEXT,
  display_name TEXT,
  is_required BOOLEAN,
  status document_status,
  document_id UUID,
  file_name TEXT,
  expires_at DATE,
  is_expiring_soon BOOLEAN,
  is_expired BOOLEAN
) AS $$
DECLARE
  v_employee employees;
BEGIN
  -- Get employee info
  SELECT * INTO v_employee FROM employees WHERE id = p_employee_id;
  
  RETURN QUERY
  SELECT 
    rdt.document_type,
    rdt.display_name,
    true AS is_required,
    COALESCE(ed.status, 'pending_upload'::document_status) AS status,
    ed.id AS document_id,
    ed.file_name,
    ed.expires_at,
    CASE 
      WHEN ed.expires_at IS NOT NULL AND rdt.has_expiry 
      THEN ed.expires_at <= CURRENT_DATE + (rdt.expiry_warning_days || ' days')::INTERVAL
      ELSE false
    END AS is_expiring_soon,
    CASE 
      WHEN ed.expires_at IS NOT NULL 
      THEN ed.expires_at < CURRENT_DATE
      ELSE false
    END AS is_expired
  FROM required_document_types rdt
  LEFT JOIN employee_documents ed ON ed.employee_id = p_employee_id 
    AND ed.type = rdt.document_type
    AND ed.status IN ('uploaded', 'under_review', 'approved')
  WHERE rdt.organization_id = v_employee.organization_id
    AND rdt.is_active = true
    AND (
      -- Required for this role
      v_employee.role::TEXT = ANY(rdt.required_for_role)
      OR
      -- Required for this category
      v_employee.rider_category = ANY(rdt.required_for_category)
      OR
      -- Required for everyone
      (rdt.required_for_role IS NULL AND rdt.required_for_category IS NULL)
    )
  ORDER BY rdt.sort_order, rdt.display_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if employee has all required documents
CREATE OR REPLACE FUNCTION check_employee_documents_complete(
  p_employee_id UUID
)
RETURNS TABLE (
  total_required INTEGER,
  total_uploaded INTEGER,
  total_approved INTEGER,
  total_rejected INTEGER,
  total_expired INTEGER,
  is_complete BOOLEAN,
  missing_documents TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH checklist AS (
    SELECT * FROM get_employee_document_checklist(p_employee_id)
  )
  SELECT 
    COUNT(*)::INTEGER AS total_required,
    COUNT(*) FILTER (WHERE status IN ('uploaded', 'under_review', 'approved'))::INTEGER AS total_uploaded,
    COUNT(*) FILTER (WHERE status = 'approved')::INTEGER AS total_approved,
    COUNT(*) FILTER (WHERE status = 'rejected')::INTEGER AS total_rejected,
    COUNT(*) FILTER (WHERE is_expired)::INTEGER AS total_expired,
    (COUNT(*) FILTER (WHERE status = 'approved' AND NOT is_expired) = COUNT(*)) AS is_complete,
    ARRAY_AGG(display_name) FILTER (WHERE status NOT IN ('approved') OR is_expired) AS missing_documents
  FROM checklist;
END;
$$ LANGUAGE plpgsql STABLE;

-- Insert default document types (can be customized per org)
-- This is a template - actual insert would happen per-organization
COMMENT ON TABLE required_document_types IS 'Default document types for riders: cpr_id, passport, visa, driving_license, vehicle_registration (own-bike), vehicle_insurance (own-bike), profile_photo, bank_details';
