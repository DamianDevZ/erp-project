-- ============================================================================
-- SEED DATA: Organization & Core Setup
-- ============================================================================
-- Run this first to establish the organization and basic reference data

-- Create demo organization
INSERT INTO organizations (id, name, slug, timezone, currency, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'SwiftRiders LLC',
  'swiftriders',
  'Asia/Dubai',
  'AED',
  '{
    "business_type": "3pl_delivery",
    "country": "UAE",
    "vat_registration": "100123456789003",
    "address": {
      "line1": "Office 305, Business Bay Tower",
      "city": "Dubai",
      "country": "UAE"
    },
    "contact": {
      "phone": "+971 4 123 4567",
      "email": "info@swiftriders.ae"
    },
    "onboarding": {
      "required_documents": ["emirates_id", "visa", "passport", "driving_license"],
      "training_days": 3,
      "probation_days": 90
    },
    "payroll": {
      "cycle": "monthly",
      "cutoff_day": 25,
      "payment_day": 28
    }
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Create departments
INSERT INTO departments (id, organization_id, name, code, description) VALUES
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Operations', 'OPS', 'Delivery operations and rider management'),
  ('d0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Finance', 'FIN', 'Finance, payroll, and accounting'),
  ('d0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'HR', 'HR', 'Human resources and compliance'),
  ('d0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Fleet', 'FLEET', 'Vehicle and fleet management'),
  ('d0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Admin', 'ADMIN', 'Administration and support')
ON CONFLICT (id) DO NOTHING;

-- Create job titles
INSERT INTO job_titles (id, organization_id, name, department_id, level, base_salary_min, base_salary_max) VALUES
  ('j0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Delivery Rider', 'd0000000-0000-0000-0000-000000000001', 1, 2500, 4000),
  ('j0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Senior Rider', 'd0000000-0000-0000-0000-000000000001', 2, 3500, 5000),
  ('j0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Team Lead', 'd0000000-0000-0000-0000-000000000001', 3, 5000, 7000),
  ('j0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Operations Manager', 'd0000000-0000-0000-0000-000000000001', 4, 8000, 12000),
  ('j0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Fleet Coordinator', 'd0000000-0000-0000-0000-000000000004', 2, 4000, 6000),
  ('j0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'HR Officer', 'd0000000-0000-0000-0000-000000000003', 2, 5000, 7000),
  ('j0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Accountant', 'd0000000-0000-0000-0000-000000000002', 2, 6000, 8000),
  ('j0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'General Manager', 'd0000000-0000-0000-0000-000000000005', 5, 15000, 25000)
ON CONFLICT (id) DO NOTHING;

-- Create shift templates
INSERT INTO shift_templates (id, organization_id, name, start_time, end_time, days_of_week, break_duration_minutes) VALUES
  ('st000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Morning Shift', '06:00', '14:00', ARRAY[1,2,3,4,5,6], 30),
  ('st000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Afternoon Shift', '14:00', '22:00', ARRAY[1,2,3,4,5,6], 30),
  ('st000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Night Shift', '22:00', '06:00', ARRAY[1,2,3,4,5,6], 30),
  ('st000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Weekend Peak', '10:00', '22:00', ARRAY[5,6], 60),
  ('st000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Office Hours', '09:00', '18:00', ARRAY[0,1,2,3,4], 60)
ON CONFLICT (id) DO NOTHING;

-- Create zones/areas
INSERT INTO zones (id, organization_id, name, code, city, coordinates) VALUES
  ('z0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Downtown Dubai', 'DXB-DT', 'Dubai', '{"lat": 25.2048, "lng": 55.2708}'),
  ('z0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Business Bay', 'DXB-BB', 'Dubai', '{"lat": 25.1850, "lng": 55.2650}'),
  ('z0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Dubai Marina', 'DXB-MAR', 'Dubai', '{"lat": 25.0805, "lng": 55.1403}'),
  ('z0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'JBR', 'DXB-JBR', 'Dubai', '{"lat": 25.0750, "lng": 55.1350}'),
  ('z0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Deira', 'DXB-DEI', 'Dubai', '{"lat": 25.2697, "lng": 55.3094}'),
  ('z0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Bur Dubai', 'DXB-BUR', 'Dubai', '{"lat": 25.2532, "lng": 55.2945}'),
  ('z0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'JLT', 'DXB-JLT', 'Dubai', '{"lat": 25.0750, "lng": 55.1500}'),
  ('z0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Al Barsha', 'DXB-BAR', 'Dubai', '{"lat": 25.1025, "lng": 55.2024}')
ON CONFLICT (id) DO NOTHING;

-- Create document types
INSERT INTO document_types (id, organization_id, name, code, category, validity_days, is_mandatory, applies_to) VALUES
  ('dt000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Emirates ID', 'EID', 'identity', 730, true, 'employee'),
  ('dt000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Passport', 'PASSPORT', 'identity', 3650, true, 'employee'),
  ('dt000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'UAE Visa', 'VISA', 'work_permit', 730, true, 'employee'),
  ('dt000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Driving License', 'DL', 'license', 365, true, 'employee'),
  ('dt000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'RTA Permit', 'RTA', 'license', 365, false, 'employee'),
  ('dt000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Health Certificate', 'HEALTH', 'health', 365, false, 'employee'),
  ('dt000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Vehicle Registration', 'VREG', 'vehicle', 365, true, 'vehicle'),
  ('dt000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Vehicle Insurance', 'VINS', 'vehicle', 365, true, 'vehicle'),
  ('dt000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'MOI Fitness Certificate', 'VFIT', 'vehicle', 365, true, 'vehicle')
ON CONFLICT (id) DO NOTHING;

COMMIT;
