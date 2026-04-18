-- T-032: HR Dashboard Metrics
-- Aggregated views for HR dashboard displaying key workforce metrics

-- Employee headcount and status breakdown
CREATE OR REPLACE VIEW hr_headcount_metrics AS
SELECT 
  organization_id,
  COUNT(*) AS total_headcount,
  COUNT(*) FILTER (WHERE status = 'active') AS active_employees,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_employees,
  COUNT(*) FILTER (WHERE status = 'past') AS past_employees,
  COUNT(*) FILTER (WHERE role = 'rider') AS total_riders,
  COUNT(*) FILTER (WHERE role = 'rider' AND status = 'active') AS active_riders,
  COUNT(*) FILTER (WHERE role = 'supervisor') AS total_supervisors,
  COUNT(*) FILTER (WHERE role = 'manager') AS total_managers
FROM employees
GROUP BY organization_id;

-- Rider category breakdown
CREATE OR REPLACE VIEW hr_rider_category_metrics AS
SELECT 
  organization_id,
  rider_category,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'active') AS active,
  COUNT(*) FILTER (WHERE rider_category = 'own_vehicle_rider') AS own_bike,
  COUNT(*) FILTER (WHERE rider_category = 'company_vehicle_rider') AS company_bike
FROM employees
WHERE role = 'rider'
GROUP BY organization_id, rider_category;

-- Document compliance metrics
CREATE OR REPLACE VIEW hr_document_compliance_metrics AS
SELECT 
  e.organization_id,
  COUNT(DISTINCT e.id) FILTER (
    WHERE e.license_expiry < CURRENT_DATE
  ) AS expired_licenses,
  COUNT(DISTINCT e.id) FILTER (
    WHERE e.visa_expiry IS NOT NULL AND e.visa_expiry < CURRENT_DATE
  ) AS expired_visas,
  COUNT(DISTINCT e.id) FILTER (
    WHERE e.license_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  ) AS licenses_expiring_30d,
  COUNT(DISTINCT e.id) FILTER (
    WHERE e.visa_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  ) AS visas_expiring_30d,
  (
    SELECT COUNT(*)
    FROM compliance_alerts ca
    WHERE ca.organization_id = e.organization_id
      AND ca.is_resolved = false
      AND ca.alert_type IN ('license_expired', 'visa_expired', 'document_expired')
  ) AS total_expired_docs_alerts
FROM employees e
WHERE e.status = 'active'
GROUP BY e.organization_id;

-- Monthly churn metrics (last 12 months)
CREATE OR REPLACE VIEW hr_monthly_churn AS
SELECT 
  organization_id,
  DATE_TRUNC('month', termination_date) AS month,
  COUNT(*) AS terminations
FROM employees
WHERE termination_date IS NOT NULL
  AND termination_date >= CURRENT_DATE - INTERVAL '12 months'
  AND status = 'past'
GROUP BY organization_id, DATE_TRUNC('month', termination_date)
ORDER BY month DESC;

-- Churn rate calculation
CREATE OR REPLACE VIEW hr_churn_rate AS
WITH monthly_data AS (
  SELECT 
    organization_id,
    DATE_TRUNC('month', CURRENT_DATE) AS month,
    (
      SELECT COUNT(*) 
      FROM employees e2 
      WHERE e2.organization_id = e.organization_id 
        AND e2.status = 'active'
    ) AS current_headcount,
    (
      SELECT COUNT(*) 
      FROM employees e3 
      WHERE e3.organization_id = e.organization_id 
        AND e3.termination_date >= DATE_TRUNC('month', CURRENT_DATE)
        AND e3.termination_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    ) AS monthly_terminations
  FROM employees e
  GROUP BY organization_id
)
SELECT 
  organization_id,
  month,
  current_headcount,
  monthly_terminations,
  CASE 
    WHEN current_headcount > 0 
    THEN ROUND((monthly_terminations::DECIMAL / current_headcount) * 100, 2)
    ELSE 0 
  END AS churn_rate_percent
FROM monthly_data;

-- Payroll exceptions (attendance issues, pending approvals)
CREATE OR REPLACE VIEW hr_payroll_exceptions AS
SELECT 
  e.organization_id,
  COUNT(DISTINCT ae.id) FILTER (WHERE ae.resolution_status = 'pending') AS pending_attendance_exceptions,
  COUNT(DISTINCT da.id) FILTER (
    WHERE da.is_active = true 
    AND da.remaining_balance > 0
  ) AS active_deduction_agreements,
  COUNT(DISTINCT ed.id) FILTER (
    WHERE ed.status IN ('pending', 'partially_refunded')
  ) AS pending_deposits
FROM employees e
LEFT JOIN attendance_exceptions ae ON ae.organization_id = e.organization_id
LEFT JOIN deduction_agreements da ON da.organization_id = e.organization_id
LEFT JOIN employee_deposits ed ON ed.organization_id = e.organization_id
GROUP BY e.organization_id;

-- Onboarding metrics
CREATE OR REPLACE VIEW hr_onboarding_metrics AS
SELECT 
  organization_id,
  COUNT(*) AS total_in_onboarding,
  COUNT(*) FILTER (WHERE onboarding_step = 'application_submitted') AS at_application,
  COUNT(*) FILTER (WHERE onboarding_step IN ('documents_pending', 'documents_uploaded')) AS at_documents,
  COUNT(*) FILTER (WHERE onboarding_step = 'documents_review') AS at_review,
  COUNT(*) FILTER (WHERE onboarding_step = 'documents_approved') AS documents_approved,
  COUNT(*) FILTER (WHERE onboarding_step IN ('training_pending', 'training_completed')) AS at_training,
  COUNT(*) FILTER (WHERE onboarding_step = 'vehicle_assignment') AS at_vehicle_assignment,
  COUNT(*) FILTER (WHERE onboarding_step = 'final_approval') AS at_final_approval,
  COUNT(*) FILTER (WHERE onboarding_step = 'activated') AS activated,
  COUNT(*) FILTER (WHERE onboarding_step = 'rejected') AS rejected
FROM employees
WHERE is_onboarding = true OR onboarding_step IS NOT NULL
GROUP BY organization_id;

-- Offboarding metrics  
CREATE OR REPLACE VIEW hr_offboarding_metrics AS
SELECT 
  organization_id,
  COUNT(*) AS total_in_offboarding,
  COUNT(*) FILTER (WHERE status = 'initiated') AS initiated,
  COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
  COUNT(*) FILTER (WHERE status = 'pending_review') AS pending_review,
  COUNT(*) FILTER (WHERE final_pay_calculated = false) AS pending_final_pay,
  COUNT(*) FILTER (WHERE assets_returned = false) AS pending_asset_return,
  COUNT(*) FILTER (WHERE accounts_disabled = false) AS pending_account_disable
FROM offboarding_workflow
WHERE status NOT IN ('completed', 'cancelled')
GROUP BY organization_id;

-- Combined HR dashboard summary view
CREATE OR REPLACE VIEW hr_dashboard_summary AS
SELECT 
  o.id AS organization_id,
  o.name AS organization_name,
  
  -- Headcount
  COALESCE(hc.total_headcount, 0) AS total_headcount,
  COALESCE(hc.active_employees, 0) AS active_employees,
  COALESCE(hc.active_riders, 0) AS active_riders,
  
  -- Document compliance
  COALESCE(dc.expired_licenses, 0) AS expired_licenses,
  COALESCE(dc.expired_visas, 0) AS expired_visas,
  COALESCE(dc.licenses_expiring_30d, 0) AS licenses_expiring_30d,
  COALESCE(dc.visas_expiring_30d, 0) AS visas_expiring_30d,
  COALESCE(dc.expired_licenses, 0) + COALESCE(dc.expired_visas, 0) AS total_expired_docs,
  
  -- Churn
  COALESCE(cr.monthly_terminations, 0) AS monthly_terminations,
  COALESCE(cr.churn_rate_percent, 0) AS churn_rate_percent,
  
  -- Payroll exceptions
  COALESCE(pe.pending_attendance_exceptions, 0) AS pending_attendance_exceptions,
  COALESCE(pe.active_deduction_agreements, 0) AS active_deduction_agreements,
  COALESCE(pe.pending_deposits, 0) AS pending_deposits,
  
  -- Onboarding/Offboarding
  COALESCE(ob.total_in_onboarding, 0) AS employees_onboarding,
  COALESCE(off.total_in_offboarding, 0) AS employees_offboarding

FROM organizations o
LEFT JOIN hr_headcount_metrics hc ON hc.organization_id = o.id
LEFT JOIN hr_document_compliance_metrics dc ON dc.organization_id = o.id
LEFT JOIN hr_churn_rate cr ON cr.organization_id = o.id
LEFT JOIN hr_payroll_exceptions pe ON pe.organization_id = o.id
LEFT JOIN hr_onboarding_metrics ob ON ob.organization_id = o.id
LEFT JOIN hr_offboarding_metrics off ON off.organization_id = o.id;

COMMENT ON VIEW hr_headcount_metrics IS 'Employee headcount broken down by status and role';
COMMENT ON VIEW hr_rider_category_metrics IS 'Rider count by category and bike ownership';
COMMENT ON VIEW hr_document_compliance_metrics IS 'Count of expired and expiring licenses/visas';
COMMENT ON VIEW hr_monthly_churn IS 'Monthly termination counts for last 12 months';
COMMENT ON VIEW hr_churn_rate IS 'Current month churn rate calculation';
COMMENT ON VIEW hr_payroll_exceptions IS 'Pending attendance/leave/deduction items affecting payroll';
COMMENT ON VIEW hr_onboarding_metrics IS 'Employees in onboarding by step';
COMMENT ON VIEW hr_offboarding_metrics IS 'Employees in offboarding by status';
COMMENT ON VIEW hr_dashboard_summary IS 'Combined HR dashboard summary metrics';
