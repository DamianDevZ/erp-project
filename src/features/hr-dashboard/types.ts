// HR Dashboard metrics types

export interface HRHeadcountMetrics {
  organization_id: string;
  total_headcount: number;
  active_employees: number;
  pending_employees: number;
  past_employees: number;
  total_riders: number;
  active_riders: number;
  total_supervisors: number;
  total_managers: number;
}

export interface HRRiderCategoryMetrics {
  organization_id: string;
  rider_category: 'company_vehicle_rider' | 'own_vehicle_rider' | null;
  total: number;
  active: number;
  own_bike: number;
  company_bike: number;
}

export interface HRDocumentComplianceMetrics {
  organization_id: string;
  expired_licenses: number;
  expired_visas: number;
  licenses_expiring_30d: number;
  visas_expiring_30d: number;
  total_expired_docs_alerts: number;
}

export interface HRMonthlyChurn {
  organization_id: string;
  month: string;
  terminations: number;
}

export interface HRChurnRate {
  organization_id: string;
  month: string;
  current_headcount: number;
  monthly_terminations: number;
  churn_rate_percent: number;
}

export interface HRPayrollExceptions {
  organization_id: string;
  pending_attendance_exceptions: number;
  active_deduction_agreements: number;
  pending_deposits: number;
}

export interface HROnboardingMetrics {
  organization_id: string;
  total_in_onboarding: number;
  at_application: number;
  at_documents: number;
  at_review: number;
  documents_approved: number;
  at_training: number;
  at_vehicle_assignment: number;
  at_final_approval: number;
  activated: number;
  rejected: number;
}

export interface HROffboardingMetrics {
  organization_id: string;
  total_in_offboarding: number;
  initiated: number;
  in_progress: number;
  pending_review: number;
  pending_final_pay: number;
  pending_asset_return: number;
  pending_account_disable: number;
}

export interface HRDashboardSummary {
  organization_id: string;
  organization_name: string;
  
  // Headcount
  total_headcount: number;
  active_employees: number;
  active_riders: number;
  
  // Document compliance
  expired_licenses: number;
  expired_visas: number;
  licenses_expiring_30d: number;
  visas_expiring_30d: number;
  total_expired_docs: number;
  
  // Churn
  monthly_terminations: number;
  churn_rate_percent: number;
  
  // Payroll exceptions
  pending_attendance_exceptions: number;
  active_deduction_agreements: number;
  pending_deposits: number;
  
  // Onboarding/Offboarding
  employees_onboarding: number;
  employees_offboarding: number;
}
