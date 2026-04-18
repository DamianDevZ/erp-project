-- T-019: Rider onboarding workflow
-- Multi-step: application → document upload → review → approval → activation

-- Onboarding step enum
CREATE TYPE onboarding_step AS ENUM (
  'application_submitted',
  'documents_pending',
  'documents_uploaded',
  'documents_review',
  'documents_approved',
  'training_pending',
  'training_completed',
  'vehicle_assignment',
  'final_approval',
  'activated',
  'rejected'
);

-- Onboarding checklist items table
CREATE TABLE onboarding_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  current_step onboarding_step NOT NULL DEFAULT 'application_submitted',
  
  -- Step completion timestamps
  application_submitted_at TIMESTAMPTZ DEFAULT now(),
  documents_requested_at TIMESTAMPTZ,
  documents_uploaded_at TIMESTAMPTZ,
  documents_reviewed_at TIMESTAMPTZ,
  documents_approved_at TIMESTAMPTZ,
  training_assigned_at TIMESTAMPTZ,
  training_completed_at TIMESTAMPTZ,
  vehicle_assigned_at TIMESTAMPTZ,
  final_approved_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  
  -- Users who performed actions
  documents_reviewed_by UUID REFERENCES user_profiles(id),
  documents_approved_by UUID REFERENCES user_profiles(id),
  final_approved_by UUID REFERENCES user_profiles(id),
  rejected_by UUID REFERENCES user_profiles(id),
  
  -- Notes and rejection reason
  review_notes TEXT,
  rejection_reason TEXT,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(employee_id)
);

-- Add onboarding_step to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS onboarding_step onboarding_step DEFAULT 'application_submitted';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_onboarding BOOLEAN DEFAULT true;

-- RLS policies
ALTER TABLE onboarding_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org onboarding" ON onboarding_checklists
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org onboarding" ON onboarding_checklists
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create onboarding for own org" ON onboarding_checklists
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Index for quick lookups
CREATE INDEX idx_onboarding_employee ON onboarding_checklists(employee_id);
CREATE INDEX idx_onboarding_step ON onboarding_checklists(current_step);
CREATE INDEX idx_employees_onboarding ON employees(onboarding_step) WHERE is_onboarding = true;

-- Function to advance onboarding step
CREATE OR REPLACE FUNCTION advance_onboarding_step(
  p_employee_id UUID,
  p_next_step onboarding_step,
  p_user_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS onboarding_checklists AS $$
DECLARE
  v_checklist onboarding_checklists;
BEGIN
  -- Update the checklist
  UPDATE onboarding_checklists
  SET 
    current_step = p_next_step,
    -- Set timestamp based on step
    documents_requested_at = CASE WHEN p_next_step = 'documents_pending' THEN now() ELSE documents_requested_at END,
    documents_uploaded_at = CASE WHEN p_next_step = 'documents_uploaded' THEN now() ELSE documents_uploaded_at END,
    documents_reviewed_at = CASE WHEN p_next_step = 'documents_review' THEN now() ELSE documents_reviewed_at END,
    documents_approved_at = CASE WHEN p_next_step = 'documents_approved' THEN now() ELSE documents_approved_at END,
    training_assigned_at = CASE WHEN p_next_step = 'training_pending' THEN now() ELSE training_assigned_at END,
    training_completed_at = CASE WHEN p_next_step = 'training_completed' THEN now() ELSE training_completed_at END,
    vehicle_assigned_at = CASE WHEN p_next_step = 'vehicle_assignment' THEN now() ELSE vehicle_assigned_at END,
    final_approved_at = CASE WHEN p_next_step = 'final_approval' THEN now() ELSE final_approved_at END,
    activated_at = CASE WHEN p_next_step = 'activated' THEN now() ELSE activated_at END,
    rejected_at = CASE WHEN p_next_step = 'rejected' THEN now() ELSE rejected_at END,
    -- Set user IDs
    documents_reviewed_by = CASE WHEN p_next_step = 'documents_review' THEN p_user_id ELSE documents_reviewed_by END,
    documents_approved_by = CASE WHEN p_next_step = 'documents_approved' THEN p_user_id ELSE documents_approved_by END,
    final_approved_by = CASE WHEN p_next_step = 'final_approval' THEN p_user_id ELSE final_approved_by END,
    rejected_by = CASE WHEN p_next_step = 'rejected' THEN p_user_id ELSE rejected_by END,
    review_notes = COALESCE(p_notes, review_notes),
    rejection_reason = CASE WHEN p_next_step = 'rejected' THEN p_notes ELSE rejection_reason END,
    updated_at = now()
  WHERE employee_id = p_employee_id
  RETURNING * INTO v_checklist;
  
  -- Also update employees table
  UPDATE employees
  SET 
    onboarding_step = p_next_step,
    is_onboarding = (p_next_step NOT IN ('activated', 'rejected')),
    activation_date = CASE WHEN p_next_step = 'activated' THEN CURRENT_DATE ELSE activation_date END,
    updated_at = now()
  WHERE id = p_employee_id;
  
  RETURN v_checklist;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create onboarding checklist when employee is created
CREATE OR REPLACE FUNCTION create_onboarding_checklist()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO onboarding_checklists (organization_id, employee_id, current_step)
  VALUES (NEW.organization_id, NEW.id, COALESCE(NEW.onboarding_step, 'application_submitted'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_onboarding_checklist
  AFTER INSERT ON employees
  FOR EACH ROW
  WHEN (NEW.is_onboarding = true)
  EXECUTE FUNCTION create_onboarding_checklist();
