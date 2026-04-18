// Offboarding workflow types

export type OffboardingStatus =
  | 'initiated'
  | 'in_progress'
  | 'pending_review'
  | 'completed'
  | 'cancelled';

export type OffboardingStepType =
  | 'document_collection'
  | 'asset_return'
  | 'account_deactivation'
  | 'system_access_revocation'
  | 'final_pay_calculation'
  | 'exit_interview'
  | 'knowledge_transfer'
  | 'certificate_issuance'
  | 'clearance_approval';

export type AssetReturnCondition = 'good' | 'damaged' | 'missing';

export type TerminationType =
  | 'resignation'
  | 'termination'
  | 'contract_end'
  | 'retirement'
  | 'mutual_agreement'
  | 'redundancy'
  | 'death';

export interface OffboardingChecklist {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  applies_to_role: string | null;
  applies_to_category: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items?: OffboardingChecklistItem[];
}

export interface OffboardingChecklistItem {
  id: string;
  checklist_id: string;
  step_type: OffboardingStepType;
  title: string;
  description: string | null;
  is_mandatory: boolean;
  requires_approval: boolean;
  approval_role: string | null;
  sequence_order: number;
  created_at: string;
}

export interface OffboardingWorkflow {
  id: string;
  organization_id: string;
  employee_id: string;
  checklist_id: string | null;
  
  // Status
  status: OffboardingStatus;
  initiated_at: string;
  initiated_by: string | null;
  
  // Termination details
  termination_type: TerminationType | null;
  termination_reason: string | null;
  last_working_day: string | null;
  notice_period_days: number | null;
  
  // Key milestone flags
  final_pay_calculated: boolean;
  final_pay_amount: number | null;
  final_pay_notes: string | null;
  
  assets_returned: boolean;
  assets_return_date: string | null;
  assets_return_notes: string | null;
  
  accounts_disabled: boolean;
  accounts_disabled_at: string | null;
  accounts_disabled_by: string | null;
  
  documents_archived: boolean;
  documents_archived_at: string | null;
  
  // Exit interview
  exit_interview_completed: boolean;
  exit_interview_date: string | null;
  exit_interview_notes: string | null;
  exit_interview_feedback: string | null;
  
  // Clearances
  hr_clearance: boolean;
  hr_clearance_by: string | null;
  hr_clearance_at: string | null;
  
  finance_clearance: boolean;
  finance_clearance_by: string | null;
  finance_clearance_at: string | null;
  
  it_clearance: boolean;
  it_clearance_by: string | null;
  it_clearance_at: string | null;
  
  manager_clearance: boolean;
  manager_clearance_by: string | null;
  manager_clearance_at: string | null;
  
  // Completion
  completed_at: string | null;
  completed_by: string | null;
  
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  employee?: {
    id: string;
    full_name: string;
    employee_id: string | null;
  };
  checklist?: OffboardingChecklist;
}

export interface OffboardingStepProgress {
  id: string;
  workflow_id: string;
  checklist_item_id: string;
  
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  
  requires_approval: boolean;
  is_approved: boolean | null;
  approved_at: string | null;
  approved_by: string | null;
  approval_notes: string | null;
  
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  checklist_item?: OffboardingChecklistItem;
}

export interface OffboardingAsset {
  id: string;
  workflow_id: string;
  asset_id: string | null;
  asset_type: string;
  asset_description: string | null;
  
  is_returned: boolean;
  return_date: string | null;
  return_condition: AssetReturnCondition | null;
  condition_notes: string | null;
  deduction_amount: number | null;
  
  received_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PendingOffboarding {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  status: OffboardingStatus;
  termination_type: TerminationType | null;
  last_working_day: string | null;
  final_pay_calculated: boolean;
  assets_returned: boolean;
  accounts_disabled: boolean;
  documents_archived: boolean;
  hr_clearance: boolean;
  finance_clearance: boolean;
  it_clearance: boolean;
  manager_clearance: boolean;
  initiated_at: string;
  all_clearances_complete: boolean;
}

// Label mappings
export const OFFBOARDING_STATUS_LABELS: Record<OffboardingStatus, string> = {
  initiated: 'Initiated',
  in_progress: 'In Progress',
  pending_review: 'Pending Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const OFFBOARDING_STEP_LABELS: Record<OffboardingStepType, string> = {
  document_collection: 'Document Collection',
  asset_return: 'Asset Return',
  account_deactivation: 'Account Deactivation',
  system_access_revocation: 'System Access Revocation',
  final_pay_calculation: 'Final Pay Calculation',
  exit_interview: 'Exit Interview',
  knowledge_transfer: 'Knowledge Transfer',
  certificate_issuance: 'Certificate Issuance',
  clearance_approval: 'Clearance Approval',
};

export const TERMINATION_TYPE_LABELS: Record<TerminationType, string> = {
  resignation: 'Resignation',
  termination: 'Termination',
  contract_end: 'Contract End',
  retirement: 'Retirement',
  mutual_agreement: 'Mutual Agreement',
  redundancy: 'Redundancy',
  death: 'Death',
};

export const ASSET_CONDITION_LABELS: Record<AssetReturnCondition, string> = {
  good: 'Good Condition',
  damaged: 'Damaged',
  missing: 'Missing',
};
