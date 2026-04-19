-- ============================================================================
-- MASTER SEED FILE - Run all seed data in order
-- ============================================================================
-- This file loads all seed data for the SwiftRiders LLC demo organization
-- 
-- Usage:
--   psql -d your_database -f supabase/seed/seed-all.sql
-- 
-- Or run each file individually in order:
--   01-organization.sql   - Organization, departments, zones, document types
--   02-platforms.sql      - Delivery platforms and rate cards
--   03-employees.sql      - All employees (managers + riders)
--   04-vehicles.sql       - Fleet vehicles and maintenance records
--   05-platform-assignments.sql - Rider-to-platform mapping
--   06-shifts-attendance.sql    - Shifts, assignments, attendance
--   07-orders.sql         - Orders and COD collections
--   08-finance.sql        - Invoices, payroll, advances, petty cash, violations
--   09-compliance.sql     - Documents, compliance alerts, onboarding
-- ============================================================================

\echo 'Loading seed data for SwiftRiders LLC...'
\echo ''

\echo '==> 01-organization.sql'
\i 01-organization.sql

\echo '==> 02-platforms.sql'
\i 02-platforms.sql

\echo '==> 03-employees.sql'
\i 03-employees.sql

\echo '==> 04-vehicles.sql'
\i 04-vehicles.sql

\echo '==> 05-platform-assignments.sql'
\i 05-platform-assignments.sql

\echo '==> 06-shifts-attendance.sql'
\i 06-shifts-attendance.sql

\echo '==> 07-orders.sql'
\i 07-orders.sql

\echo '==> 08-finance.sql'
\i 08-finance.sql

\echo '==> 09-compliance.sql'
\i 09-compliance.sql

\echo ''
\echo '✅ All seed data loaded successfully!'
\echo ''
\echo 'Summary:'
\echo '  - 1 organization (SwiftRiders LLC)'
\echo '  - 5 departments, 8 job titles'
\echo '  - 8 delivery zones'
\echo '  - 7 platforms with rate cards'
\echo '  - 37 employees (5 office + 32 field staff)'
\echo '  - 32 vehicles'
\echo '  - 28 platform assignments'
\echo '  - 26 shifts, 13+ attendance records'
\echo '  - 23+ orders, COD collections'
\echo '  - Invoices, payroll, advances, petty cash'
\echo '  - Documents, compliance alerts, onboarding'
