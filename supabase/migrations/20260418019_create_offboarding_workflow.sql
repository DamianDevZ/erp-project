-- T-030: Offboarding checklist and workflow
-- Tracks employee offboarding process with configurable checklists

-- Offboarding status enum
CREATE TYPE offboarding_status AS ENUM (
  'initiated',
  'in_progress',
  'pending_review',
  'completed',
  'cancelled'
);

-- Offboarding step type enum
CREATE TYPE offboarding_step_type AS ENUM (
  'document_collection',
  'asset_return',
  'account_deactivation',
  'system_access_revocation',
  'final_pay_calculation',
  'exit_interview',
  'knowledge_transfer',
  'certificate_issuance',
  'clearance_approval'
);

-- Configurable offboarding checklist templates
CREATE TABLE offboarding_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  applies_to_role VARCHAR(50), -- null = all roles
  applies_to_category VARCHAR(50), -- null = all categories
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Checklist items within a template
CREATE TABLE offboarding_checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID NOT NULL REFERENCES offboarding_checklists(id) ON DELETE CASCADE,
  step_type offboarding_step_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_mandatory BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  approval_role VARCHAR(50), -- role required to approve
  sequence_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employee offboarding workflow tracking
CREATE TABLE offboarding_workflow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  checklist_id UUID REFERENCES offboarding_checklists(id) ON DELETE SET NULL,
  
  -- Offboarding status
  status offboarding_status NOT NULL DEFAULT 'initiated',
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  initiated_by UUID REFERENCES employees(id),
  
  -- Termination details
  termination_type VARCHAR(50), -- resignation, termination, contract_end, etc.
  termination_reason TEXT,
  last_working_day DATE,
  notice_period_days INT,
  
  -- Key milestone flags
  final_pay_calculated BOOLEAN DEFAULT false,
  final_pay_amount DECIMAL(12, 2),
  final_pay_notes TEXT,
  
  assets_returned BOOLEAN DEFAULT false,
  assets_return_date DATE,
  assets_return_notes TEXT,
  
  accounts_disabled BOOLEAN DEFAULT false,
  accounts_disabled_at TIMESTAMPTZ,
  accounts_disabled_by UUID REFERENCES employees(id),
  
  documents_archived BOOLEAN DEFAULT false,
  documents_archived_at TIMESTAMPTZ,
  
  -- Exit interview
  exit_interview_completed BOOLEAN DEFAULT false,
  exit_interview_date DATE,
  exit_interview_notes TEXT,
  exit_interview_feedback TEXT, -- structured feedback/survey
  
  -- Clearance
  hr_clearance BOOLEAN DEFAULT false,
  hr_clearance_by UUID REFERENCES employees(id),
  hr_clearance_at TIMESTAMPTZ,
  
  finance_clearance BOOLEAN DEFAULT false,
  finance_clearance_by UUID REFERENCES employees(id),
  finance_clearance_at TIMESTAMPTZ,
  
  it_clearance BOOLEAN DEFAULT false,
  it_clearance_by UUID REFERENCES employees(id),
  it_clearance_at TIMESTAMPTZ,
  
  manager_clearance BOOLEAN DEFAULT false,
  manager_clearance_by UUID REFERENCES employees(id),
  manager_clearance_at TIMESTAMPTZ,
  
  -- Completion
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES employees(id),
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(employee_id) -- One active offboarding per employee
);

-- Offboarding step progress tracking
CREATE TABLE offboarding_step_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES offboarding_workflow(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES offboarding_checklist_items(id) ON DELETE CASCADE,
  
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES employees(id),
  
  -- Approval tracking
  requires_approval BOOLEAN DEFAULT false,
  is_approved BOOLEAN,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES employees(id),
  approval_notes TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(workflow_id, checklist_item_id)
);

-- Asset return tracking for offboarding
CREATE TABLE offboarding_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES offboarding_workflow(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL, -- link to actual asset
  asset_type VARCHAR(100) NOT NULL, -- vehicle, phone, laptop, uniform, etc.
  asset_description TEXT,
  
  is_returned BOOLEAN DEFAULT false,
  return_date DATE,
  return_condition VARCHAR(50), -- good, damaged, missing
  condition_notes TEXT,
  deduction_amount DECIMAL(10, 2), -- if damaged/missing
  
  received_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_offboarding_checklists_org ON offboarding_checklists(organization_id);
CREATE INDEX idx_offboarding_workflow_org ON offboarding_workflow(organization_id);
CREATE INDEX idx_offboarding_workflow_employee ON offboarding_workflow(employee_id);
CREATE INDEX idx_offboarding_workflow_status ON offboarding_workflow(status);
CREATE INDEX idx_offboarding_step_progress_workflow ON offboarding_step_progress(workflow_id);
CREATE INDEX idx_offboarding_assets_workflow ON offboarding_assets(workflow_id);

-- View for pending offboardings
CREATE OR REPLACE VIEW pending_offboardings AS
SELECT 
  ow.id,
  ow.organization_id,
  ow.employee_id,
  e.full_name AS employee_name,
  e.employee_id AS employee_code,
  ow.status,
  ow.termination_type,
  ow.last_working_day,
  ow.final_pay_calculated,
  ow.assets_returned,
  ow.accounts_disabled,
  ow.documents_archived,
  ow.hr_clearance,
  ow.finance_clearance,
  ow.it_clearance,
  ow.manager_clearance,
  ow.initiated_at,
  CASE 
    WHEN ow.hr_clearance AND ow.finance_clearance AND ow.it_clearance AND ow.manager_clearance 
    THEN true ELSE false 
  END AS all_clearances_complete
FROM offboarding_workflow ow
JOIN employees e ON ow.employee_id = e.id
WHERE ow.status NOT IN ('completed', 'cancelled');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_offboarding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_offboarding_checklists_updated
  BEFORE UPDATE ON offboarding_checklists
  FOR EACH ROW EXECUTE FUNCTION update_offboarding_timestamp();

CREATE TRIGGER set_offboarding_workflow_updated
  BEFORE UPDATE ON offboarding_workflow
  FOR EACH ROW EXECUTE FUNCTION update_offboarding_timestamp();

CREATE TRIGGER set_offboarding_step_progress_updated
  BEFORE UPDATE ON offboarding_step_progress
  FOR EACH ROW EXECUTE FUNCTION update_offboarding_timestamp();

CREATE TRIGGER set_offboarding_assets_updated
  BEFORE UPDATE ON offboarding_assets
  FOR EACH ROW EXECUTE FUNCTION update_offboarding_timestamp();

-- RLS Policies
ALTER TABLE offboarding_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_step_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offboarding_checklists_org_isolation" ON offboarding_checklists
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::uuid);

CREATE POLICY "offboarding_checklist_items_org_isolation" ON offboarding_checklist_items
  FOR ALL USING (
    checklist_id IN (
      SELECT id FROM offboarding_checklists 
      WHERE organization_id = current_setting('app.current_organization_id')::uuid
    )
  );

CREATE POLICY "offboarding_workflow_org_isolation" ON offboarding_workflow
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::uuid);

CREATE POLICY "offboarding_step_progress_org_isolation" ON offboarding_step_progress
  FOR ALL USING (
    workflow_id IN (
      SELECT id FROM offboarding_workflow 
      WHERE organization_id = current_setting('app.current_organization_id')::uuid
    )
  );

CREATE POLICY "offboarding_assets_org_isolation" ON offboarding_assets
  FOR ALL USING (
    workflow_id IN (
      SELECT id FROM offboarding_workflow 
      WHERE organization_id = current_setting('app.current_organization_id')::uuid
    )
  );

COMMENT ON TABLE offboarding_checklists IS 'Configurable offboarding checklist templates';
COMMENT ON TABLE offboarding_checklist_items IS 'Individual items within offboarding checklists';
COMMENT ON TABLE offboarding_workflow IS 'Tracks employee offboarding process with clearances';
COMMENT ON TABLE offboarding_step_progress IS 'Progress on individual offboarding checklist items';
COMMENT ON TABLE offboarding_assets IS 'Tracks asset returns during offboarding';
