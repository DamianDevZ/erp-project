-- T-034: Rider eligibility check before shift activation
-- Validates rider can be assigned to shifts

-- Eligibility check result type
CREATE TYPE eligibility_status AS ENUM (
  'eligible',
  'ineligible',
  'conditional'  -- Eligible with warnings
);

-- Rider eligibility view
CREATE OR REPLACE VIEW rider_eligibility AS
SELECT 
  e.id AS employee_id,
  e.organization_id,
  e.full_name,
  e.employee_id AS employee_code,
  e.status AS employment_status,
  e.compliance_status,
  e.rider_category,
  e.onboarding_step,
  e.is_onboarding,
  
  -- License checks
  e.license_number IS NOT NULL AS has_license,
  e.license_expiry,
  e.license_expiry >= CURRENT_DATE AS license_valid,
  CASE 
    WHEN e.license_expiry IS NULL THEN 'missing'
    WHEN e.license_expiry < CURRENT_DATE THEN 'expired'
    WHEN e.license_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END AS license_status,
  
  -- Visa checks
  e.visa_expiry,
  (e.visa_expiry IS NULL OR e.visa_expiry >= CURRENT_DATE) AS visa_valid,
  CASE 
    WHEN e.visa_expiry IS NULL THEN 'not_required'
    WHEN e.visa_expiry < CURRENT_DATE THEN 'expired'
    WHEN e.visa_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END AS visa_status,
  
  -- Vehicle assignment check
  a.id AS assigned_vehicle_id,
  a.license_plate AS assigned_vehicle_plate,
  a.compliance_status AS vehicle_compliance_status,
  a.id IS NOT NULL AS has_vehicle,
  CASE 
    WHEN a.id IS NULL AND e.rider_category = 'company_vehicle_rider' THEN false
    ELSE true
  END AS vehicle_requirement_met,
  
  -- Overall eligibility
  CASE
    -- Must be active employee
    WHEN e.status != 'active' THEN 'ineligible'::eligibility_status
    -- Must not be blocked
    WHEN e.compliance_status = 'blocked' THEN 'ineligible'::eligibility_status
    -- Must not be in onboarding
    WHEN e.is_onboarding = true THEN 'ineligible'::eligibility_status
    -- License must be valid
    WHEN e.license_expiry IS NOT NULL AND e.license_expiry < CURRENT_DATE THEN 'ineligible'::eligibility_status
    -- Visa must be valid (if exists)
    WHEN e.visa_expiry IS NOT NULL AND e.visa_expiry < CURRENT_DATE THEN 'ineligible'::eligibility_status
    -- Company bike riders need vehicle
    WHEN e.rider_category = 'company_vehicle_rider' AND a.id IS NULL THEN 'ineligible'::eligibility_status
    -- Vehicle must be compliant if assigned
    WHEN a.id IS NOT NULL AND a.compliance_status = 'blocked' THEN 'ineligible'::eligibility_status
    -- Warnings for expiring docs
    WHEN e.license_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 'conditional'::eligibility_status
    WHEN e.visa_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 'conditional'::eligibility_status
    WHEN e.compliance_status IN ('expiring_soon', 'non_compliant') THEN 'conditional'::eligibility_status
    ELSE 'eligible'::eligibility_status
  END AS eligibility_status,
  
  -- Detailed eligibility reasons
  ARRAY_REMOVE(ARRAY[
    CASE WHEN e.status != 'active' THEN 'Employee not active' END,
    CASE WHEN e.compliance_status = 'blocked' THEN 'Employee blocked' END,
    CASE WHEN e.is_onboarding = true THEN 'Still onboarding' END,
    CASE WHEN e.license_expiry IS NOT NULL AND e.license_expiry < CURRENT_DATE THEN 'License expired' END,
    CASE WHEN e.visa_expiry IS NOT NULL AND e.visa_expiry < CURRENT_DATE THEN 'Visa expired' END,
    CASE WHEN e.rider_category = 'company_vehicle_rider' AND a.id IS NULL THEN 'No vehicle assigned' END,
    CASE WHEN a.id IS NOT NULL AND a.compliance_status = 'blocked' THEN 'Vehicle blocked/non-compliant' END
  ], NULL) AS ineligibility_reasons,
  
  ARRAY_REMOVE(ARRAY[
    CASE WHEN e.license_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 'License expiring in 30 days' END,
    CASE WHEN e.visa_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 'Visa expiring in 30 days' END,
    CASE WHEN e.compliance_status = 'expiring_soon' THEN 'Documents expiring soon' END,
    CASE WHEN e.compliance_status = 'non_compliant' THEN 'Missing required documents' END
  ], NULL) AS warning_reasons

FROM employees e
LEFT JOIN assets a ON (
  a.assigned_employee_id = e.id 
  AND a.type = 'vehicle'
  AND a.is_active = true
  AND a.deleted_at IS NULL
)
WHERE e.role = 'rider'
  AND e.deleted_at IS NULL;

-- Function to check individual rider eligibility
CREATE OR REPLACE FUNCTION check_rider_eligibility(p_employee_id UUID)
RETURNS TABLE (
  is_eligible BOOLEAN,
  eligibility_status eligibility_status,
  ineligibility_reasons TEXT[],
  warning_reasons TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    re.eligibility_status = 'eligible' OR re.eligibility_status = 'conditional',
    re.eligibility_status,
    re.ineligibility_reasons,
    re.warning_reasons
  FROM rider_eligibility re
  WHERE re.employee_id = p_employee_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate shift assignment
CREATE OR REPLACE FUNCTION validate_shift_assignment(
  p_employee_id UUID,
  p_vehicle_id UUID DEFAULT NULL,
  p_platform_id UUID DEFAULT NULL
)
RETURNS TABLE (
  can_assign BOOLEAN,
  validation_status eligibility_status,
  validation_errors TEXT[],
  validation_warnings TEXT[]
) AS $$
DECLARE
  v_rider_eligibility RECORD;
  v_vehicle RECORD;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_warnings TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check rider eligibility
  SELECT * INTO v_rider_eligibility
  FROM rider_eligibility
  WHERE employee_id = p_employee_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ineligible'::eligibility_status, 
      ARRAY['Rider not found']::TEXT[], ARRAY[]::TEXT[];
    RETURN;
  END IF;
  
  -- Add rider ineligibility reasons
  v_errors := v_rider_eligibility.ineligibility_reasons;
  v_warnings := v_rider_eligibility.warning_reasons;
  
  -- Check vehicle if provided
  IF p_vehicle_id IS NOT NULL THEN
    SELECT * INTO v_vehicle
    FROM assets
    WHERE id = p_vehicle_id AND type = 'vehicle';
    
    IF NOT FOUND THEN
      v_errors := array_append(v_errors, 'Vehicle not found');
    ELSIF v_vehicle.is_active = false THEN
      v_errors := array_append(v_errors, 'Vehicle is not active');
    ELSIF v_vehicle.compliance_status = 'blocked' THEN
      v_errors := array_append(v_errors, 'Vehicle is blocked');
    ELSIF v_vehicle.vehicle_status IN ('maintenance', 'damaged', 'off_road') THEN
      v_errors := array_append(v_errors, 'Vehicle not available: ' || v_vehicle.vehicle_status);
    ELSIF v_vehicle.compliance_status IN ('expiring_soon', 'non_compliant') THEN
      v_warnings := array_append(v_warnings, 'Vehicle compliance issues');
    END IF;
  END IF;
  
  -- Return validation result
  IF array_length(v_errors, 1) > 0 THEN
    RETURN QUERY SELECT false, 'ineligible'::eligibility_status, v_errors, v_warnings;
  ELSIF array_length(v_warnings, 1) > 0 THEN
    RETURN QUERY SELECT true, 'conditional'::eligibility_status, v_errors, v_warnings;
  ELSE
    RETURN QUERY SELECT true, 'eligible'::eligibility_status, v_errors, v_warnings;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Eligible riders summary for quick lookup
CREATE OR REPLACE VIEW eligible_riders_summary AS
SELECT
  organization_id,
  COUNT(*) FILTER (WHERE eligibility_status = 'eligible') AS fully_eligible,
  COUNT(*) FILTER (WHERE eligibility_status = 'conditional') AS conditionally_eligible,
  COUNT(*) FILTER (WHERE eligibility_status = 'ineligible') AS ineligible,
  COUNT(*) AS total_riders
FROM rider_eligibility
GROUP BY organization_id;

COMMENT ON VIEW rider_eligibility IS 'Real-time rider eligibility status for shift assignment';
COMMENT ON FUNCTION check_rider_eligibility IS 'Check if a specific rider is eligible for shifts';
COMMENT ON FUNCTION validate_shift_assignment IS 'Validate a complete shift assignment including vehicle';
