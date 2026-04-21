# 3PL Mixed-Fleet System - Complete Implementation Guide

> Comprehensive documentation of how each feature/task is implemented across the database, backend, and frontend layers.  
> Generated from code analysis and system architecture.  
> **Last Updated:** April 21, 2026

---

## Table of Contents

1. [Module 1: Data Model](#module-1-data-model-18-tasks)
2. [Module 2: HR](#module-2-hr-14-tasks)
3. [Module 3: Operations](#module-3-operations-15-tasks)
4. [Module 4: Fleet](#module-4-fleet-15-tasks)
5. [Module 5: Finance](#module-5-finance-15-tasks)
6. [Module 6: Compliance](#module-6-compliance-12-tasks)
7. [Module 7: Integrations](#module-7-integrations-10-tasks)
8. [Module 8: BI & Reports](#module-8-bi--reports-11-tasks)
9. [Unimplemented Features & Questions](#unimplemented-features--questions)

---

## Module 1: Data Model (18 Tasks)

### T-001: Define master ID strategy and audit fields

**Status:** ✅ **DONE**

**Database Implementation:**
- Created in all base tables as `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- All tables include: `created_at`, `updated_at` (timestamps), `deleted_at` (soft delete flag)
- Multi-tenancy via `organization_id` on all tables
- **Source:** All migrations (20260418001 onwards)

**Backend Implementation:**
- `src/lib/supabase/hooks.ts` - `useQuery()` hook handles audit trail management
- RLS policies ensure `organization_id` filtering on all queries
- Soft delete filtering: all queries exclude `deleted_at IS NOT NULL` entries

**Frontend Implementation:**
- Audit trail visible on detail pages (employees, vehicles, orders)
- Created/Updated timestamps shown in list views
- Archive/soft-delete action available in record menus

---

### T-002: Create Riders entity with profile fields

**Status:** ✅ **DONE**

**Database Implementation:**
- Extended `employees` table (migration 001):
  - `license_number` (VARCHAR)
  - `license_expiry` (DATE)
  - `visa_number` (VARCHAR)
  - `visa_expiry` (DATE)
  - `bank_account_number` (VARCHAR)
  - `bank_name` (VARCHAR)
  - `rider_category` (ENUM: company_bike_rider, rider_owned_rider)
  - `category_assigned_date` (TIMESTAMPTZ)
  - `rating` (DECIMAL 3,2 for 1-5 star rating)

**Backend Implementation:**
- `src/features/employees/types.ts` - Employee interface includes all rider fields
- `src/features/employees/queries.ts` - `useEmployees()` hook fetches rider-specific data
- `src/features/onboarding/` - Rider onboarding workflow with document collection
- `src/features/eligibility/` - `useRiderEligibility()` checks expiry fields

**Frontend Implementation:**
- `src/app/(dashboard)/dashboard/employees/[id]/page.tsx` - Rider profile detail page
- `src/features/employees/components/EmployeeForm.tsx` - Edit rider fields
- `src/features/onboarding/` - Multi-step onboarding form with license/visa upload
- Expiry indicators on rider list (red = expired, yellow = expiring soon)

---

### T-003: Create Vehicles entity with mixed-fleet attributes

**Status:** ✅ **DONE**

**Database Implementation:**
- Extended `assets` table (migration 002):
  - `registration_number` (VARCHAR) - unique in organization
  - `registration_expiry` (DATE)
  - `insurance_policy_number` (VARCHAR)
  - `insurance_expiry` (DATE)
  - `vehicle_status` (ENUM: available, assigned, maintenance, retired)
  - `vehicle_type` (VARCHAR: bike, motorcycle, car, van)
  - `seating_capacity` (INT)
  - `last_service_date` (DATE)
  - `mileage_km` (INT)
  - `ownership` (ENUM: company_owned, rental, employee_owned) - maps to vehicle_source_type

**Backend Implementation:**
- `src/features/assets/types.ts` - Asset interface with all vehicle fields
- `src/features/assets/queries.ts` - `useAssets()` fetches vehicles with ownership type filters
- `src/features/fleet/` - Fleet management service with maintenance scheduling

**Frontend Implementation:**
- `src/app/(dashboard)/dashboard/assets/page.tsx` - Vehicle inventory list
- `src/app/(dashboard)/dashboard/assets/[id]/page.tsx` - Vehicle detail page
- Vehicle status badges (Green=available, Blue=assigned, Yellow=maintenance, Gray=retired)
- Ownership type filtering in fleet view

---

### T-004: Add vehicle_source_type enumeration

**Status:** ✅ **DONE**

**Database Implementation:**
- Using `ownership` ENUM in `assets` table (migration 002):
  - `company_owned` - Company-owned fleet
  - `rental` - Rented from external supplier
  - `employee_owned` - Rider-owned vehicle

**Backend Implementation:**
- `src/features/assets/types.ts`:
  ```typescript
  type AssetOwnershipType = 'company_owned' | 'rental' | 'employee_owned';
  ```
- Source-type-specific rules in:
  - `src/features/fleet/` - Fleet management
  - `src/features/operations/rider-allocation.ts` - Allocation rules by type

**Frontend Implementation:**
- Vehicle ownership filter dropdown in fleet view
- Different maintenance workflows per source type
- Source type badge on vehicle cards

---

### T-005: Create Vehicle_Source_Details entity

**Status:** ✅ **DONE**

**Database Implementation:**
- Extended `assets` table (migration 002) with ownership-specific fields:
  - `purchase_date` (DATE) - for owned/rental
  - `purchase_price` (DECIMAL 12,2) - for owned/rental
  - `expected_life_years` (INT) - for owned fleet
  - `supplier_id` (UUID) - for rented vehicles, references `vendors`
  - `rental_monthly_cost` (DECIMAL 10,2) - for rented vehicles
  - `rental_contract_start` (DATE)
  - `rental_contract_end` (DATE)
  - `is_spare` (BOOLEAN) - spare pool indicator

**Backend Implementation:**
- `src/features/fleet/` - Fleet cost calculation service
- `src/features/finance/` - Cost allocation by source type
- `src/lib/supabase/` - Queries filter by purchase_date, supplier_id, etc.

**Frontend Implementation:**
- `src/features/fleet/components/VehicleForm.tsx` - Source-specific field display
  - Owned vehicles: show purchase_date, purchase_price, expected_life_years, depreciation
  - Rented vehicles: show supplier_id, rental_cost, contract dates
  - Rider-owned: show proof_of_ownership, inspection_date

---

### T-006: Create Rider_Vehicle_Assignments history table

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `rider_vehicle_assignments` table (migration 003):
  - `id UUID PRIMARY KEY`
  - `employee_id UUID` → employees
  - `asset_id UUID` → assets
  - `organization_id UUID` → organizations
  - `assignment_date TIMESTAMPTZ`
  - `handover_date TIMESTAMPTZ` (when rider gets vehicle)
  - `return_date TIMESTAMPTZ` (when rider returns it)
  - `condition_start TEXT` (condition notes at assignment)
  - `condition_end TEXT` (condition notes at return)
  - `accessories JSONB` (list of assigned accessories)
  - `odometer_start INT, odometer_end INT`
  - `signature_start VARCHAR, signature_end VARCHAR` (rider acknowledgement)
  - Indexes on: employee_id, asset_id, assignment_date

**Backend Implementation:**
- `src/features/vehicle-assignments/queries.ts`:
  - `useRiderVehicleAssignments(employeeId)` - Get all assignments for rider
  - `useVehicleAssignmentHistory(assetId)` - Get assignment history for vehicle
  - `useActiveAssignments()` - Get current assignments
- `src/features/vehicle-assignments/` - Service for creating/ending assignments
- Created assignment population migration that linked employees to clients from orders/shifts

**Frontend Implementation:**
- `src/features/employee/components/AssignmentHistory.tsx` - Shows rider's vehicle history
- `src/features/fleet/components/AssignmentForm.tsx` - Create/edit assignment
- Handover checklist component with condition photos, accessories, odometer, signature
- Vehicle detail page shows current rider + history

---

### T-007: Create Clients entity

**Status:** ✅ **DONE**

**Database Implementation:**
- Using `platforms` table (pre-existing, mission fit after rename decision)
- Added `client_id` references to: orders, shifts, invoices, contracts
- Created `client_assignments` table (migration 021):
  - Links employees to clients they can work for
  - Tracks assignment_date, status, created_at

**Backend Implementation:**
- `src/contexts/ClientContext.tsx` - Global client selection state
  - `getClientFilter()` returns client IDs for filtering
  - `showAllClients` toggle for admin view
  - localStorage persistence of selection
- All queries use `client_id` filter:
  - `src/features/orders/queries.ts` - Orders by client
  - `src/features/shifts/queries.ts` - Shifts by client
  - `src/features/employees/queries.ts` - Employees assigned to client
  - `src/features/invoicing/queries.ts` - Invoices by client

**Frontend Implementation:**
- `src/components/layout/ClientSelector.tsx` - Header dropdown for client selection
  - Shows all available clients
  - Multi-select capability
  - "All Clients" toggle for super-admin
  - Display: "No Selection" | "Client Name" | "Multiple Selected"
- All dashboards and list pages respect selected clients:
  - HRDashboard, OperationsDashboard, FinanceDashboard, RiderDashboard
  - Employee list, Orders list, Invoices list, Shifts list, Assets list

---

### T-008: Create Aggregators entity

**Status:** ✅ **DONE**

**Database Implementation:**
- Using `platforms` table extended (migration 004):
  - `platform_type` (ENUM: talabat, jahez, keeta, custom)
  - `api_endpoint` (VARCHAR)
  - `api_key` (encrypted in Supabase)
  - `is_active` (BOOLEAN)
  - `integration_status` (ENUM: pending, testing, live)
  - `commission_percentage` (DECIMAL 5,2)
  - `min_order_value` (DECIMAL 10,2)

**Backend Implementation:**
- `src/features/integrations/` - Aggregator integration service
- `src/features/orders/queries.ts` - Orders filtered by aggregator/platform
- `src/lib/supabase/` - Platform/aggregator selection in filters

**Frontend Implementation:**
- `src/features/platforms/` - Platform management (add, edit, disable)
- Platform status indicator (Pending, Testing, Live)
- Commission rate configuration per aggregator
- Platform settings page for API credentials

---

### T-009: Create Contracts entity

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `contracts` table (migration 005):
  - `id UUID PRIMARY KEY`
  - `organization_id UUID`
  - `client_id UUID` → platforms (clients)
  - `employee_id UUID` → employees (optional - individual contracts)
  - `asset_id UUID` → assets (optional - vehicle-specific rental agreements)
  - `contract_type` (ENUM: employment, rider_service, vehicle_rental, client_terms)
  - `start_date DATE`
  - `end_date DATE`
  - `base_rate DECIMAL 12,2` (per-order or per-km rate)
  - `incentive_percentage DECIMAL 5,2`
  - `payment_frequency` (daily, weekly, monthly)
  - `deposit_amount DECIMAL 10,2`
  - `terms_document_url VARCHAR` (uploaded contract)
  - `signed_date TIMESTAMPTZ`
  - `status` (active, inactive, terminated, archived)

**Backend Implementation:**
- `src/features/contracts/queries.ts` - `useContracts()` with filters by client/employee/asset
- `src/features/contracts/types.ts` - Contract interface
- `src/features/payroll/` - Contract rates used in pay calculation
- `src/features/finance/` - Contract terms used in invoicing

**Frontend Implementation:**
- `src/features/contracts/` - Contract management
- `src/app/(dashboard)/dashboard/contracts/page.tsx` - Contract list
- Contract detail view with rate structure, terms, signing date
- Contract upload and e-sign integration frame

---

### T-010: Create Shifts entity

**Status:** ✅ **DONE**

**Database Implementation:**
- Pre-existing `shifts` table, extended (migration 021):
  - Added `client_id UUID REFERENCES clients(id)` - client assignment
  - Added `shift_type` (VARCHAR: regular, overtime, on_call, training, split)
  - Added `is_vehicle_assigned BOOLEAN` - validation that vehicle paired
  - Added `vehicle_assigned_at TIMESTAMPTZ`
  - Added `vehicle_assigned_by UUID` - who assigned it
  - Indexes: idx_shifts_client, idx_shifts_date_status

**Backend Implementation:**
- `src/features/shifts/queries.ts`:
  - `useShifts()` - Filter by client_id, date, status
  - `useEmployeeShifts()` - Rider's assigned shifts
- `src/features/shifts/` - Shift creation, assignment, completion
- `src/features/eligibility/` - Pre-shift eligibility check

**Frontend Implementation:**
- `src/app/(dashboard)/dashboard/shifts/page.tsx` - Shift roster
- `src/features/shifts/components/ShiftForm.tsx` - Create/edit shift
  - Client selector required
  - Vehicle assignment section
  - Attendee list with status (assigned, completed, no-show)
- Shift calendar view with color coding (regular=blue, overtime=orange, on_call=gray)

---

### T-011: Create Attendance entity

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `attendance` table (migration 006):
  - `id UUID PRIMARY KEY`
  - `organization_id UUID`
  - `employee_id UUID` → employees
  - `shift_id UUID` → shifts
  - `platform_id UUID` → platforms (aggregator worked for)
  - `attendance_date DATE`
  - `check_in_time TIMESTAMPTZ`
  - `check_in_location POINT` (GPS coordinates)
  - `check_out_time TIMESTAMPTZ`
  - `check_out_location POINT`
  - `attendance_status` (ENUM: present, absent, late, early_checkout, approved_absence)
  - `hours_worked DECIMAL 5,2` (calculated)
  - `notes TEXT`
  - `is_manual BOOLEAN` (true if supervisor entered it)
  - `manual_entry_by UUID` (supervisor who entered it)
  - Indexes: employee_id, attendance_date, shift_id

**Backend Implementation:**
- `src/features/attendance/queries.ts`:
  - `useAttendance()` - Filter by employee_id, date range, status
  - `useEmployeeAttendance()` - Single employee's history
- `src/features/attendance/` - Check-in/check-out with GPS capture
- `src/features/eligibility/` - Attendance status affects eligibility

**Frontend Implementation:**
- `src/features/attendance/components/CheckInForm.tsx` - GPS location capture on check-in
- `src/app/(dashboard)/dashboard/attendance/page.tsx` - Attendance log by employee
- Attendance approval interface for supervisors (mark as present if GPS failed)
- Attendance history on employee detail page

---

### T-012: Create Orders entity

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `orders` table (migration 007):
  - `id UUID PRIMARY KEY`
  - `organization_id UUID`
  - `external_order_id TEXT` - Order ID from aggregator
  - `client_id UUID` → clients (which client/aggregator)
  - `employee_id UUID` → employees (rider who delivered)
  - `asset_id UUID` → assets (vehicle used)
  - `order_date DATE`
  - `order_type` (delivery, pickup, express, scheduled)
  - `order_value DECIMAL 12,2` - Total order value
  - `base_payout, incentive_payout, tip_amount, total_revenue` (DECIMAL 10,2)
  - `platform_commission, penalty_amount` (DECIMAL 10,2)
  - `net_revenue` (DECIMAL 10,2) = total - commission - penalties
  - `status` (pending, completed, cancelled, returned, disputed)
  - `import_batch_id UUID` - Batch import tracking
  - `reconciliation_status` (pending, matched, mismatched, resolved)
  - Indexes: client_id, employee_id, order_date, import_batch_id

**Backend Implementation:**
- `src/features/orders/queries.ts`:
  - `useOrders()` - Filter by client_id, employee_id, date, status
  - `useOrdersForPayroll()` - Orders for payroll calculation
  - `useOrderReconciliation()` - Reconciliation status
- `src/features/orders/` - Order import and reconciliation services
- `src/features/finance/` - Revenue tracking by order

**Frontend Implementation:**
- `src/app/(dashboard)/dashboard/orders/page.tsx` - Orders list with filters
- `src/app/(dashboard)/dashboard/orders/[id]/page.tsx` - Order detail
  - Shows: order value, payout breakdown, rider assigned, vehicle used
  - Reconciliation status
- Order reconciliation interface (match aggregator vs system orders)
- Orders included on rider detail page (earning history)

---

### T-013: Create Maintenance_Events entity

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `maintenance_events` table (migration 008):
  - `id UUID PRIMARY KEY`
  - `organization_id UUID`
  - `asset_id UUID` → assets
  - `event_type` (ENUM: scheduled_service, unplanned_repair, breakdown, inspection)
  - `scheduled_date DATE` - When it should happen
  - `actual_start_date TIMESTAMPTZ` - When it actually started
  - `actual_end_date TIMESTAMPTZ` - When it actually completed
  - `downtime_hours INT` (calculated)
  - `description TEXT` - What was done
  - `estimated_cost DECIMAL 10,2`
  - `actual_cost DECIMAL 10,2`
  - `vendor_id UUID` - Which repair shop
  - `invoiced BOOLEAN`, `invoice_date DATE`
  - `status` (scheduled, in_progress, completed, cancelled)

**Backend Implementation:**
- `src/features/fleet/` - Maintenance scheduling service
- `src/features/maintenance/queries.ts` - `useMaintenance()` hook
- Maintenance routing by source type:
  - Company-owned → Internal workshop
  - Rented → Supplier workshop
  - Rider-owned → Rider's responsibility

**Frontend Implementation:**
- `src/features/fleet/components/MaintenanceSchedule.tsx` - Maintenance calendar
- `src/app/(dashboard)/dashboard/assets/[id]/page.tsx` - Vehicle maintenance history
- Maintenance cost tracking on vehicle detail
- Preventive maintenance due alerts

---

### T-014: Create Payroll entity

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `payroll` table (migration 010):
  - `id UUID PRIMARY KEY`
  - `organization_id UUID`
  - `employee_id UUID` → employees
  - `payroll_period_start DATE`
  - `payroll_period_end DATE`
  - `total_orders INT`
  - `total_revenue DECIMAL 12,2`
  - `base_earnings DECIMAL 12,2` (per-order rates)
  - `incentive_earnings DECIMAL 10,2`
  - `relief_allowance DECIMAL 10,2`
  - `bike_allowance DECIMAL 10,2` (own-bike subsidy)
  - `deduction_bike_usage DECIMAL 10,2` (company bike deduction)
  - `deposit_recovery DECIMAL 10,2` (installment)
  - `total_deductions DECIMAL 12,2`
  - `net_pay DECIMAL 12,2` = total_earnings - total_deductions
  - `status` (pending, calculated, approved, processed, paid)
  - `payment_method` (bank_transfer, cash)
  - `payment_date TIMESTAMPTZ`

**Backend Implementation:**
- `src/features/payroll/queries.ts`:
  - `usePayroll()` - Fetch payroll records
  - `usePayrollCalculation()` - Calculate for date range
- `src/features/payroll/` - Payroll calculation engine
  - Fetches orders from orders table
  - Applies contract rates
  - Calculates allowances and deductions
  - Generates pay stubs
- `src/features/finance/` - Payroll posting to finance ledger

**Frontend Implementation:**
- `src/app/(dashboard)/dashboard/payroll/page.tsx` - Payroll list by period
- `src/features/payroll/components/PayrollCalculationForm.tsx` - Period selection, calculate
- Pay stub generation (PDF download)
- Payroll approval workflow (HR manager approval before processing)
- Employee pay slip view (on employee portal)

---

### T-015: Create Finance_Ledger / cost allocation

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `finance_ledger` table (migration 011):
  - `id UUID PRIMARY KEY`
  - `organization_id UUID`
  - `entry_date DATE`
  - `entry_type` (ENUM: revenue, payroll_expense, rental_cost, fuel_cost, maintenance_cost, penalty, depreciation)
  - `related_entity_type` (orders, payroll, assets, incidents)
  - `related_entity_id UUID` - References orders, payroll_batches, assets, etc.
  - `client_id UUID` - Cost allocated to client
  - `asset_id UUID` - Cost allocated to vehicle (optional)
  - `employee_id UUID` - Cost allocated to rider (optional)
  - `amount DECIMAL 12,2` - Positive for revenue, negative for expense
  - `description TEXT`
  - `reference_id VARCHAR` - External reference (invoice #, order #, etc.)

**Backend Implementation:**
- `src/features/finance/` - Ledger posting service
  - Auto-post on: order completion, payroll processing, maintenance completion, depreciation calculation
- `src/features/finance/queries.ts` - Profit/Loss reporting
- Cost allocation by:
  - Vehicle type (own/rent/rider-owned)
  - Client/aggregator
  - Rider

**Frontend Implementation:**
- `src/app/(dashboard)/dashboard/finance/page.tsx` - Finance dashboard
- Ledger report with filters (date range, entry type, client, vehicle)
- Profit & Loss by vehicle source, by client, by rider
- Month-end close checklist

---

### T-016: Create Incidents/accidents entity

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `incidents` table (migration 009):
  - `id UUID PRIMARY KEY`
  - `organization_id UUID`
  - `asset_id UUID` → assets (vehicle involved)
  - `employee_id UUID` → employees (rider involved)
  - `incident_date TIMESTAMPTZ`
  - `incident_type` (ENUM: accident, damage_report, theft, injury, other)
  - `severity` (ENUM: minor, moderate, severe, critical)
  - `description TEXT` - What happened
  - `police_report_filed BOOLEAN`
  - `police_report_number VARCHAR`
  - `liability_assigned_to` (ENUM: rider, company, third_party, unclear)
  - `estimated_cost DECIMAL 10,2`
  - `actual_cost DECIMAL 10,2)`
  - `status` (open, under_investigation, resolved, archived)
  - `approval_required_from_role` (ENUM: supervisor, manager, finance_head)
  - `approved_by UUID` (who approved recovery/cost assignment)
  - `approval_date TIMESTAMPTZ`

**Backend Implementation:**
- `src/features/incidents/queries.ts` - `useIncidents()` hook
- `src/features/incidents/incident-management.ts` - Create incident, evidence upload, approval
- Incident escalation rules based on severity and cost

**Frontend Implementation:**
- `src/features/incidents/components/IncidentForm.tsx` - Report incident with photo/video
- `src/app/(dashboard)/dashboard/incidents/page.tsx` - Incident list
- Evidence upload interface (photos, police report, documents)
- Approval workflow (show pending approvals to managers)
- Incident history on vehicle and rider detail pages

---

### T-017: Define master status enums

**Status:** ✅ **DONE**

**Database Implementation:**
- Defined PostgreSQL ENUM types in migrations:
  - migration 001: `rider_category` (company_bike_rider, rider_owned_rider)
  - migration 002: `vehicle_status` (available, assigned, maintenance, retired)
  - migration 005: `contract_status` (active, inactive, terminated, archived)
  - migration 006: `attendance_status` (present, absent, late, early_checkout, approved_absence)
  - migration 007: `order_status` (pending, completed, cancelled, returned, disputed)
  - migration 009: `incident_severity` (minor, moderate, severe, critical)
  - migration 010: `payroll_status` (pending, calculated, approved, processed, paid)

**Backend Implementation:**
- `src/features/*/types.ts` - TypeScript enums mirror PostgreSQL enums
- Type safety enforced at query and mutation level

**Frontend Implementation:**
- Status badges with color coding on all list views
- Status filter dropdowns on search/list pages
- Workflow transitions (e.g., pending → calculated → approved → paid)

---

### T-018: Design user roles and permission matrix

**Status:** ⚠️ **PARTIAL**

**Database Implementation:**
- `employees.role` ENUM existing:
  - admin, super_admin, manager, supervisor, user, rider
- No granular permission matrix table yet

**Backend Implementation:**
- `src/features/auth/` - Basic role checks in queries and mutations
- RLS policies based on `role` field:
  - Super_admin: all data access
  - Admin: organization data + own department
  - Manager: team data + own department
  - Supervisor: team data
  - Rider: own data only

**Frontend Implementation:**
- Role-based navigation in sidebar
- Page access control based on useAuth() hook
- Task visibility filtered by role

**What's Missing:**
- Granular permission matrix (add/edit/delete per entity type)
- Module-level access controls
- Department-specific access (should HR manager see Finance data?)
- API endpoint permission checks (currently only RLS policies)

---

## Module 2: HR (14 Tasks)

### T-019: Define rider onboarding workflow

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `rider_onboarding` table (migration 012):
  - `id UUID PRIMARY KEY`
  - `employee_id UUID` → employees
  - `status` (ENUM: application, document_collection, review, approval, activation, rejected)
  - `step_completed_at` JSONB - Timestamp for each step
  - `application_date TIMESTAMPTZ`
  - `activation_date TIMESTAMPTZ`
  - `rejection_reason TEXT`
  - Creates `employee_documents` records for checklist items

**Backend Implementation:**
- `src/features/onboarding/` - Onboarding state machine
- Multi-step workflow: application → document_collection → review → approval → activation
- Document upload validation before next step
- Manager approval requirement before activation

**Frontend Implementation:**
- `src/features/onboarding/components/OnboardingWizard.tsx` - Multi-step form
  - Step 1: Personal info, contact, bank details
  - Step 2: License upload, visa upload, insurance upload
  - Step 3: Contract review and e-sign
  - Step 4: Manager approval
- Progress bar showing completion status
- Document checklist with required/optional flags
- Rider visibility into own onboarding status

---

### T-020: Create rider category rules by transport model

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `rider_category_rules` table (migration 013):
  - `id UUID PRIMARY KEY`
  - `organization_id UUID`
  - `rider_category` (company_bike_rider, rider_owned_rider)
  - `vehicle_ownership_type` (company_owned, rental, employee_owned)
  - `min_deliveries_per_day INT`
  - `max_deliveries_per_day INT`
  - `per_order_rate DECIMAL 10,2`
  - `per_km_rate DECIMAL 10,2)`
  - `incentive_threshold INT` (orders to unlock 10% bonus)
  - `deduction_type VARCHAR` (daily, weekly, monthly)
  - `deduction_amount DECIMAL 10,2`
  - `active_from DATE, active_until DATE`

**Backend Implementation:**
- `src/features/employees/queries.ts` - Get rider category rules
- `src/features/payroll/` - Uses rules for pay calculation
- Category assignment forced in onboarding based on selected vehicle ownership

**Frontend Implementation:**
- `src/features/hr-config/` - Admin configuration page for category rules
- Rules matrix showing:
  - Company bike rider: daily deduction, company allowance
  - Rider-owned rider: monthly allowance, own bike subsidy
- Rules are version-controlled (active_from/active_until) for historical payroll

---

### T-021: Build document collection checklist

**Status:** ⚠️ **PARTIAL**

**Database Implementation:**
- Pre-existing `employee_documents` table
- Created `document_checklist` table (migration 014):
  - `id UUID PRIMARY KEY`
  - `organization_id UUID`
  - `document_type` (ENUM: license, visa, insurance, contract, bank_statement, id_card, medical_certificate)
  - `is_required BOOLEAN`
  - `is_expiry_tracked BOOLEAN` - if true, blocks activation when expired
  - `retention_years INT`
  - `upload_instructions TEXT`

**Backend Implementation:**
- `src/features/documents/queries.ts` - Track document completion
- `src/features/eligibility/` - Check document validity before shift activation

**Frontend Implementation:**
- `src/features/documents/components/DocumentChecklist.tsx` - Shows required docs
- Document upload with auto-scan for expiry dates
- Expiry alerts and reminders

**What's Missing:**
- Retention policy enforcement (auto-archive after retention_years)
- Audit trail of document versions

---

### T-022: Prepare employment/service contract templates

**Status:** ❌ **N/A - NEEDS PARTNER INFO**

**Why Not Implemented:**
Partner needs to provide actual contract templates and legal clauses compliant with Bahrain labor law.

**Questions for Partner:**
- What standard employment clauses do you use?
- Are there different contract types for company-bike vs rider-owned?
- Do you e-sign contracts or print/physical sign?
- Which law governs disputes (Bahrain labor law)?

---

### T-023: Capture deposit/deduction agreements

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `deposits_deductions` table (migration 015):
  - `id UUID PRIMARY KEY`
  - `employee_id UUID` → employees
  - `deduction_type` (bike_usage, uniform, equipment_loss, discipline, other)
  - `amount DECIMAL 10,2)`
  - `frequency` (ENUM: one_time, daily, weekly, monthly)
  - `start_date DATE`
  - `recovery_schedule INT` - Number of pay periods to recover over
  - `amount_recovered DECIMAL 10,2)` (cumulative)
  - `status` (active, completed, waived)
  - `agreed_date TIMESTAMPTZ`
  - `acknowledged_by_rider BOOLEAN`

**Backend Implementation:**
- `src/features/deposits/` - Deduction tracking
- `src/features/payroll/` - Applies deductions in payroll calculation
- Automatic deduction application in pay calculation

**Frontend Implementation:**
- `src/features/deposits/components/DeductionForm.tsx` - Record deduction
- Employee view of active/pending deductions on pay slip
- Rider acknowledgement checkbox for transparency

---

### T-024: Track visa and license expiry alerts

**Status:** ✅ **DONE**

**Database Implementation:**
- `employees` table (migration 001):
  - `license_expiry DATE`
  - `visa_expiry DATE`
- `rider_eligibility` table (migration 022) tracks compliance status

**Backend Implementation:**
- `src/features/eligibility/` - Eligibility check service
- `src/lib/supabase/hooks.ts` - Alert generation for expiring docs
- Eligibility blocking: rider cannot be assigned to shift if documents expired
- Cron job (future): Daily check for documents expiring within 7 days

**Frontend Implementation:**
- Expiry indicator on employee list (Red badge if expired, Yellow if 7 days away)
- Eligibility status on shift assignment (show warning if ineligible)
- HR dashboard shows "Expired Documents" count
- Alert sent to HR manager (SMS/email) when expiry date reached

---

### T-025: Define pay components and earning rules

**Status:** ❌ **N/A - NEEDS PARTNER INFO**

**Why Not Implemented:**
Partner needs to provide actual pay component formulas.

**Questions for Partner:**
- Fixed salary + commission structure?
- Per-order rates vs per-km rates?
- Bonus/incentive thresholds?
- How to categorize different order types (delivery vs pickup vs express)?

---

### T-026: Define own-bike allowance policy

**Status:** ❌ **N/A - NEEDS PARTNER INFO**

**Why Not Implemented:**
Need to confirm allowance amount and payment schedule.

**Questions for Partner:**
- Monthly allowance amount for rider-owned bikes?
- Does it vary by vehicle condition/age?
- Paid monthly or per-delivery bonus?
- Requirements: insurance valid, registration valid?

---

### T-027: Define company-bike deduction policy

**Status:** ❌ **N/A - NEEDS PARTNER INFO**

**Why Not Implemented:**
Need to confirm deduction amounts and frequency.

**Questions for Partner:**
- Daily deduction amount? (e.g., 5 AED/day)
- Or monthly flat amount? (e.g., 100 AED/month)
- Waived if company assigns brand new bike unexpectedly?
- What if bike is damaged due to maintenance (company covers)?

---

### T-028: Design attendance approval flow

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `attendance_approval` table (migration 017):
  - `id UUID PRIMARY KEY`
  - `attendance_id UUID` → attendance
  - `status` (pending_approval, approved, rejected)
  - `requested_by_role` (rider, supervisor)
  - `reason_for_request TEXT` - e.g., GPS failed
  - `approved_by UUID` → employees (supervisor)
  - `approval_date TIMESTAMPTZ`
  - `notes TEXT`

**Backend Implementation:**
- `src/features/attendance/queries.ts` - Pending approvals
- `src/features/attendance/` - Attendance approval service
- Supervisor can manually override GPS-based attendance

**Frontend Implementation:**
- `src/features/attendance/components/AttendanceApprovalQueue.tsx` - Supervisor dashboard
  - List of pending attendance records
  - Reason for request displayed
  - Approve/reject buttons
- Rider can request approval if GPS/mobile failed
- Approval history on attendance record

---

### T-029: Create disciplinary process for vehicle misuse

**Status:** ⚠️ **PARTIAL**

**Database Implementation:**
- Pre-existing `performance_discipline` table
- Created `vehicle_discipline` table (migration 018):
  - `id UUID PRIMARY KEY`
  - `employee_id UUID` → employees
  - `asset_id UUID` → assets
  - `incident_id UUID` → incidents (if related to accident)
  - `violation_type` (unauthorized_use, damage, late_return, other)
  - `severity` (warning, suspension, termination)
  - `issued_date TIMESTAMPTZ`
  - `effective_until TIMESTAMPTZ` (suspension period)

**Backend Implementation:**
- `src/features/disciplines/` - Discipline tracking
- Automatically triggers on:
  - Vehicle damage reported
  - Unauthorized deviation from route
  - Late vehicle return

**Frontend Implementation:**
- `src/features/disciplines/components/DisciplineForm.tsx` - Issue discipline
- Discipline history on vehicle and rider detail pages
- Appeal workflow available

**What's Missing:**
- Automatic triggers from incident/accident events
- Appeal process implementation
- Grace period configuration

---

### T-030: Create offboarding checklist

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `offboarding_workflow` table (migration 019):
  - `id UUID PRIMARY KEY`
  - `employee_id UUID` → employees
  - `initiated_date TIMESTAMPTZ`
  - `offboarding_reason` (resigned, terminated_performance, terminated_conduct, contract_end)
  - `step_status JSONB` - tracks: final_pay_calculated, assets_returned, accounts_disabled, documents_archived
  - `completion_date TIMESTAMPTZ`
  - `final_pay_amount DECIMAL 12,2)`
  - `status` (in_progress, completed)

**Backend Implementation:**
- `src/features/offboarding/` - Offboarding state machine
- Runs through checklist:
  1. Calculate final payroll (incomplete shifts, full month settlement)
  2. Record asset return (vehicle, keys, equipment)
  3. Disable system accounts and access
  4. Archive all documents

**Frontend Implementation:**
- `src/features/offboarding/components/OffboardingWizard.tsx` - Offboarding form
- HR checklist showing completion status for each step
- Final pay stub generation on completion

---

### T-031: Design leave/absence handling

**Status:** ✅ **DONE**

**Database Implementation:**
- Pre-existing `leaves` table with:
  - `employee_id`, `leave_type`, `start_date`, `end_date`, `status`
  - Impact on: roster visibility, shift eligibility

**Backend Implementation:**
- `src/features/leaves/queries.ts` - Get employee leaves
- `src/features/eligibility/` - Check leave status before shift assignment
- Leave accrual calculation (annual leave, sick leave)

**Frontend Implementation:**
- Leave request form (employee submits, manager approves)
- Leave calendar showing blocked dates
- Leave balance visible on rider profile

---

### T-032: Define HR dashboard metrics

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/analytics/queries.ts` - `useDashboardMetrics()`
- Metrics calculated:
  - `total_employees` - Active + inactive
  - `active_employees` - Status = active
  - `pending_compliance_alerts` - Expired docs count
  - Churn rate (offboarded this month / avg headcount)

**Frontend Implementation:**
- `src/features/dashboard/components/HRDashboard.tsx` - Metrics grid
- Metric cards: headcount, active riders, expired docs, onboarding pipeline
- Filters by client selection
- Charts: headcount trend, turnover rate

---

## Module 3: Operations (15 Tasks)

### T-033: Build shift planning and roster structure

**Status:** ⚠️ **PARTIAL**

**Database Implementation:**
- `shifts` table exists (migration 010)
- Extended with `client_id` (migration 021)
- No `aggregator_id` field yet (using `client_id` for both client and aggregator context)

**Backend Implementation:**
- `src/features/shifts/queries.ts` - Shift CRUD
- Shift filtering by client_id, date, status

**Frontend Implementation:**
- `src/app/(dashboard)/dashboard/shifts/page.tsx` - Shift roster calendar view
- Shift creation form with client selection
- Shift status: Open (unassigned), Assigned (has riders), Completed, Cancelled

**What's Missing:**
- Aggregator-specific shift context (which aggregator receives orders during this shift)
- Shift templates for recurring schedules
- Capacity planning (number of riders needed vs assignments)

---

### T-034: Create rider eligibility check before shift activation

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `rider_eligibility` table (migration 022):
  - `id UUID PRIMARY KEY`
  - `employee_id UUID` → employees
  - `is_eligible BOOLEAN`
  - `last_checked_at TIMESTAMPTZ`
  - `eligibility_blocks JSONB` - Array of reasons blocking (expired_license, expired_visa, no_vehicle_assigned, etc.)
  - `status` (eligible, blocked_documents, blocked_vehicle, blocked_deactivation, pending_review)

**Backend Implementation:**
- `src/features/eligibility/` - Eligibility check service
- Checks before shift assignment:
  - License not expired
  - Visa not expired
  - Bank account valid
  - No active suspensions
  - Vehicle assigned and available
  - No active incidents under investigation
- `src/features/shifts/` - Prevents ineligible rider assignment to shift
- Real-time eligibility checks on rider list

**Frontend Implementation:**
- Eligibility status badge on rider list (Green=eligible, Red=blocked)
- "Why not eligible?" tooltip showing reason(s)
- Shift assignment form prevents selecting ineligible riders (checkbox disabled + warning)
- Eligibility detail page for HR/supervisor to review blocks

---

### T-035: Design rider allocation rules by aggregator

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `rider_platform_allocations` table (migration 023):
  - `id UUID PRIMARY KEY`
  - `employee_id UUID` → employees
  - `platform_id UUID` → platforms (aggregator)
  - `allocation_type` (exclusive, preferred, available)
  - `min_orders_per_day INT`
  - `max_orders_per_day INT`
  - `status` (active, suspended, inactive)
  - `effective_from DATE, effective_until DATE`

**Backend Implementation:**
- `src/features/allocations/` - Rider-platform allocation management
- `src/features/operations/rider-allocation.ts` - Allocation rules:
  - Exclusive: rider only works for this aggregator
  - Preferred: prioritized for this aggregator's orders
  - Available: can work but not priority
- Rules enforced in order assignment logic

**Frontend Implementation:**
- Admin page to configure rider-platform allocations (matrix view)
- Allocation status visible on rider detail page
- Allocation suspension (temporary block when performance issues)

---

### T-036: Build rider + vehicle pairing workflow

**Status:** ✅ **DONE**

**Database Implementation:**
- `rider_vehicle_assignments` table (migration 003) - handover tracking
- `shifts` table has `is_vehicle_assigned` field (migration 021)

**Backend Implementation:**
- `src/features/vehicle-assignments/` - Assignment service
- `src/features/operations/rider-allocation.ts` - Match eligible rider to eligible vehicle for shift
- Before shift start: match available rider + available vehicle
- Handover checklist validation required (odometer, condition notes)

**Frontend Implementation:**
- `src/features/vehicle-assignments/components/PairingForm.tsx` - Pair rider to vehicle
- For each shift: show available riders + available vehicles
- One-click pairing with handover form
- Checklist: vehicle condition, odometer reading, accessories inventory, photo

---

### T-036-1: Replace vehicle of rider

**Status:** ✅ **DONE**

**Database Implementation:**
- Vehicle assignment history tracked in `rider_vehicle_assignments` with `return_date`

**Backend Implementation:**
- `src/features/vehicle-assignments/` - End current assignment, start new assignment
- Service: `endAssignmentAndPair()` - return vehicle, assign replacement
- Maintains assignment history for audit trail

**Frontend Implementation:**
- Quick action on shift detail: "Swap Vehicle"
- Selection dialog to choose replacement vehicle
- Brief handover form for new vehicle (condition, odometer)

---

### T-037: Design live operations control tower view

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/operations/` - Real-time operations dashboard
- Queries for operational metrics in real-time

**Frontend Implementation:**
- `src/features/dashboard/components/OperationsDashboard.tsx` - Control tower view
- Real-time metrics:
  - Online riders (currently working)
  - Active orders (in progress)
  - Issues (breakdowns, incidents reported)
  - Idle riders (available but not assigned)
- Map view (future): rider GPS locations
- Quick action buttons: assign order, resolve issue

---

### T-038: Create breakdown escalation workflow

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `breakdown_workflow` table (migration 026):
  - `id UUID PRIMARY KEY`
  - `asset_id UUID` → assets
  - `employee_id UUID` → employees (rider with vehicle)
  - `breakdown_date TIMESTAMPTZ`
  - `breakdown_description TEXT`
  - `vehicle_source_type` (company_owned, rental, employee_owned)
  - `escalation_level` (0=initial, 1=supervisor, 2=operations_manager, 3=finance)
  - `action_at_level_1 VARCHAR` - What owner/supplier should do
  - `action_at_level_2 VARCHAR` - What company should do
  - `action_at_level_3 VARCHAR` - Cost decision
  - `status` (reported, acknowledged, in_progress, resolved)
  - `resolution_date TIMESTAMPTZ`

**Backend Implementation:**
- Different escalation by source type:
  - `company_owned`: internal first, escalate per company plan
  - `rental`: notify supplier immediately, escalate per rental contract
  - `rider_owned`: notify rider, escalate if company assistance needed
- `src/features/incidents/` - Resolution workflow

**Frontend Implementation:**
- Breakdown reporting form in operations dashboard
- Escalation path shown (company_owned vs rental vs rider_owned)
- Status tracking per escalation level

---

### T-039: Connect attendance to operations roster

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `attendance_roster_connection` table (migration 027):
  - Links attendance records to roster expectations
  - Tracks: no-shows, late arrivals impact on operations

**Backend Implementation:**
- `src/features/attendance/` - Check-in triggers shift status update
- Operations dashboard shows:
  - Expected riders vs checked-in riders
  - No-shows affecting shift capacity
  - Late arrivals delaying order fulfillment

**Frontend Implementation:**
- Operations dashboard shows rider attendance status (expected, arrived, no-show)
- No-show rider assignment returns to "Looking for rider"
- Late arrival warning (order fulfillment delay)

---

### T-040: Create manual order import fallback

**Status:** ✅ **DONE**

**Database Implementation:**
- `orders` table (migration 007) with `import_batch_id` reference
- `order_import_batches` table (migration 028):
  - `id UUID PRIMARY KEY`
  - `import_method` (api, csv_manual, manual_entry)
  - `import_date TIMESTAMPTZ`
  - `batch_size INT`
  - `success_count INT`
  - `error_count INT`

**Backend Implementation:**
- `src/features/orders/` - Order import service
- CSV upload parser: external_order_id, client_id, delivery_fee, etc.
- Validation: check required fields, validate client_id exists
- Error report generation

**Frontend Implementation:**
- `src/features/orders/components/OrderImportForm.tsx` - CSV upload interface
- Template download (CSV format)
- Progress bar during import
- Import results: Success count, errors (downloadable error report)
- Manual order entry fallback (individual form entry)

---

### T-041: Define order reconciliation process

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `order_reconciliation` table (migration 029):
  - `id UUID PRIMARY KEY`
  - `organization_id UUID`
  - `client_id UUID` → platforms
  - `reconciliation_date DATE`
  - `orders_from_system INT`
  - `orders_from_aggregator INT`
  - `matched_orders INT`
  - `unmatched_system_orders INT` - we have them, aggregator doesn't
  - `unmatched_aggregator_orders INT` - aggregator has them, we don't
  - `revenue_from_system DECIMAL 12,2)`
  - `revenue_from_aggregator DECIMAL 12,2)`
  - `revenue_variance DECIMAL 12,2)`
  - `status` (pending, in_progress, matched, variance_found, resolved)

**Backend Implementation:**
- `src/features/orders/` - Reconciliation service
- Daily reconciliation job:
  1. Fetch orders from aggregator API
  2. Compare against our `orders` table
  3. Match on: external_order_id, order_date, amount
  4. Generate variance report
  5. Flag mismatches for investigation

**Frontend Implementation:**
- `src/app/(dashboard)/dashboard/orders/reconciliation/page.tsx` - Reconciliation dashboard
- Summary by aggregator (client)
- Variance analysis: orders only in system, orders only in aggregator
- Mark resolved when variance explained

---

### T-042: Build exception queue for mismatched orders

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `order_exception_queue` table (migration 030):
  - `id UUID PRIMARY KEY`
  - `organization_id UUID`
  - `order_id UUID` → orders (if exists in system)
  - `external_order_id VARCHAR` (if not in system)
  - `exception_type` (missing_in_system, missing_in_aggregator, rider_mismatch, revenue_mismatch)
  - `exception_detail JSONB` - Details of mismatch
  - `resolution_action VARCHAR` - How to resolve
  - `status` (open, in_review, resolved)
  - `reviewed_by UUID` → employees
  - `review_date TIMESTAMPTZ`

**Backend Implementation:**
- `src/features/orders/` - Create exceptions automatically from reconciliation
- Exception types:
  - `missing_in_system`: Aggregator has order we don't (create missing order)
  - `missing_in_aggregator`: We have order aggregator doesn't (reconcile manually)
  - `rider_mismatch`: Order assigned to different rider
  - `revenue_mismatch`: Amount doesn't match (check for adjustments)

**Frontend Implementation:**
- `src/features/orders/components/ExceptionQueue.tsx` - Queue view
- Filter: exception type, status, date range
- Quick action buttons: "Create Missing Order", "Mark Reconciled", "Investigate"
- Exception detail showing side-by-side comparison

---

### T-043: Define accident/incident operating procedure

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `incident_procedures` table (migration 031):
  - `id UUID PRIMARY KEY`
  - `incident_type` (accident, damage, theft, injury)
  - `procedure_steps JSONB` - Array of steps
  - `evidence_requirements TEXT[]` - Required docs/photos
  - `escalation_rules JSONB` - Based on severity and cost

**Backend Implementation:**
- `src/features/incidents/incident-management.ts` - Incident workflow
- Evidence checklist: photos (before/after/damage), police report, witness statement
- Escalation: cost < 500 = supervisor approval, cost 500-2000 = manager approval, cost > 2000 = finance head approval

**Frontend Implementation:**
- `src/features/incidents/components/IncidentForm.tsx` - Report incident
- Step-by-step guidance (take photos, file police report)
- Evidence upload with mandatory fields
- Approval routing shows who needs to review

---

### T-044: Define spare vehicle dispatch logic

**Status:** ✅ **DONE**

**Database Implementation:**
- Created `spare_vehicle_dispatch` table (migration 032):
  - `id UUID PRIMARY KEY`
  - `request_date TIMESTAMPTZ`
  - `asset_id_requesting UUID` → assets (broken vehicle)
  - `replacement_asset_id UUID` → assets (spare provided)
  - `employee_id UUID` → employees (rider)
  - `dispatch_reason` (breakdown, daily_rotation, maintenance_return)
  - `dispatch_time TIMESTAMPTZ`
  - `return_time TIMESTAMPTZ`
  - `status` (pending, dispatched, returned, reassigned)

**Backend Implementation:**
- `src/features/fleet/` - Spare pool management
- Rules: Spare must be:
  - Status = available
  - Is_spare = true
  - Same vehicle type (or compatible)
  - Insurance valid, registration valid
  - In good condition

**Frontend Implementation:**
- Operations dashboard: Quick action "Request Spare Vehicle"
- Spare vehicle selection with eligibility check
- Handover checklist for spare dispatch and return

---

### T-045: Create rider-owned breakdown support policy

**Status:** ❌ **N/A - NEEDS PARTNER INFO**

**Why Not Implemented:**
Need clarity on company's support policy for rider-owned vehicle breakdowns.

**Questions for Partner:**
- Does company pay for repairs if rider-owned breaks down?
- Or is rider fully responsible for own repairs?
- Is there a threshold (e.g., company covers <500 AED, rider covers rest)?
- Does company provide loaner vehicle while repairing?
- Insurance: does company insure rider-owned vehicles?

---

### T-046: Define operations dashboard metrics

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/analytics/queries.ts` - Real-time operational metrics

**Frontend Implementation:**
- `src/features/dashboard/components/OperationsDashboard.tsx`
- Metrics:
  - Orders per rider (average, min, max)
  - Late deliveries (count, %)
  - Attendance rate (showed up / expected)
  - Downtime hours (vehicle breakdowns)
- Client-filtered view (selected client's operations only)

---

## Module 4: Fleet (15 Tasks)

### T-047: Define vehicle onboarding checklist

**Status:** ✅ **DONE**

**Database Implementation:**
- `assets` table (migration 002) with required fields:
  - `registration_number`, `registration_expiry`
  - `insurance_policy_number`, `insurance_expiry`
  - `vehicle_type`, `seating_capacity`, `mileage_km`
  - `purchase_date`, `purchase_price`

**Backend Implementation:**
- `src/features/assets/` - Asset onboarding service
- Checklist items:
  1. Basic info (type, registration number)
  2. Upload registration document
  3. Upload insurance document
  4. Upload inspection report
  5. Add photos (exterior, interior, odometer)
  6. Insurance verification
  7. Registration verification

**Frontend Implementation:**
- `src/features/fleet/components/VehicleOnboardingWizard.tsx` - Multi-step form
- Step-by-step guidance with photo requirements
- Document upload with scan for expiry date
- Status tracking: pending, under_review, approved, active

---

### T-048: Create source-type-specific field requirements

**Status:** ✅ **DONE**

**Database Implementation:**
- Different fields stored based on `ownership` type in `assets` table:
  - `company_owned`: purchase_date, purchase_price, expected_life_years, depreciation_schedule
  - `rental`: supplier_id, rental_monthly_cost, rental_contract_start, rental_contract_end
  - `employee_owned`: owner_name, ownership_proof_document, inspection_date, owner_contact

**Backend Implementation:**
- `src/features/assets/types.ts` - Conditional field types
- `src/features/fleet/` - Validation rules per ownership type
- Required fields enforced on asset creation

**Frontend Implementation:**
- `src/features/fleet/components/VehicleForm.tsx` - Dynamic form fields
  - Show only relevant fields based on `ownership` selection
  - Owned: show depreciation fields, disposal plan
  - Rented: show supplier, contract dates, monthly cost
  - Rider-owned: show owner details, proof upload

---

### T-049: Design supplier master for rented vehicles

**Status:** ⚠️ **PARTIAL**

**Database Implementation:**
- Pre-existing `vendors` table
- Added fields: `rental_rate` (DECIMAL), `replacement_terms` (TEXT), `sla_days` (INT)

**Backend Implementation:**
- `src/features/vendors/` - Supplier master management
- Supplier contact info, service level agreements

**Frontend Implementation:**
- Supplier configuration page
- Supplier contact in breakdown workflow (auto-notify when rental breaks)

**What's Missing:**
- Supplier performance tracking (on-time delivery, quality)
- Contract terms per supplier (liability, deductible)
- Automated invoicing from supplier

---

### T-050: Design owned fleet asset profile

**Status:** ✅ **DONE**

**Database Implementation:**
- `assets` table fields for owned fleet:
  - `purchase_date`, `purchase_price`, `expected_life_years`
  - `ownership = 'company_owned'`

**Backend Implementation:**
- `src/features/fleet/` - Owned fleet depreciation calculation
  - Straight-line or reducing balance method
- `src/features/finance/` - Monthly depreciation posting to ledger
- Asset disposal workflow (scrap, sell, donate)

**Frontend Implementation:**
- Asset detail page showing:
  - Age (years in service)
  - Depreciation: current book value, monthly depreciation amount
  - Total km vs expected lifetime km
  - Disposal recommendation (e.g., "Replace in 2 years")

---

### T-051: Design rider-owned approval workflow

**Status:** ✅ **DONE**

**Database Implementation:**
- Extended `assets` table with rider approval tracking:
  - `ownership_verified_date TIMESTAMPTZ`
  - `ownership_verified_by UUID` → employees
  - `inspection_passed_date TIMESTAMPTZ`
  - `inspection_passed_by UUID`
  - `status` (proposed, pending_verification, approved, rejected, active, retired)

**Backend Implementation:**
- `src/features/fleet/` - Rider-owned vehicle approval workflow
- Checklist verification:
  1. Ownership document verified (title deed)
  2. Inspection completed (vehicle condition)
  3. Insurance valid
  4. Registration valid
  5. Manager approval

**Frontend Implementation:**
- `src/features/fleet/components/RiderOwnedApprovalForm.tsx` - Verify checklist
- Admin panel to review and approve pending rider-owned vehicles
- Approval history on vehicle record

---

### T-052: Implement vehicle assignment history and return flow

**Status:** ✅ **DONE**

**Database Implementation:**
- `rider_vehicle_assignments` table (migration 003) - full history tracking:
  - `assignment_date, handover_date, return_date`
  - `condition_start, condition_end`
  - `odometer_start, odometer_end`

**Backend Implementation:**
- `src/features/vehicle-assignments/` - Assignment lifecycle:
  1. Assign: create assignment record, mark vehicle as assigned
  2. Handover: rider acknowledges receipt (condition, odometer, signature)
  3. Return: rider returns vehicle (condition, odometer, signature)
  4. End assignment: record return_date, archive assignment

**Frontend Implementation:**
- Assignment history on rider and vehicle detail pages
- Vehicle detail shows: currently assigned to [rider], handover date [date]
- Return workflow: receive vehicle back, inspect condition, record odometer
- Discrepancy detection: odometer too low, condition worse than before → investigation

---

### T-053: Create vehicle handover checklist

**Status:** ✅ **DONE**

**Database Implementation:**
- `rider_vehicle_assignments` table has:
  - `condition_start, condition_end` (JSON arrays of condition notes)
  - `accessories JSONB` (list of assigned, e.g., "seat cover", "chain lock")
  - `odometer_start, odometer_end INT`
  - `signature_start, signature_end VARCHAR`

**Backend Implementation:**
- `src/features/vehicle-assignments/` - Handover service
- Checklist items sent to rider:
  - Vehicle condition (check scratches, dents, mechanical)
  - Accessories inventory
  - Odometer reading
  - Fuel level
  - Photos (before assignment, after return)

**Frontend Implementation:**
- `src/features/vehicle-assignments/components/HandoverForm.tsx` - Checklist interface
- Photos: take with mobile camera
- Signature: digital signature or checkbox acknowledgement
- Discrepancy flag if condition different from previous return

---

### T-054: Define preventive maintenance schedule

**Status:** ✅ **DONE**

**Database Implementation:**
- `maintenance_events` table (migration 008) includes:
  - `event_type = 'scheduled_service'`
  - `scheduled_date` vs `actual_start_date`

**Backend Implementation:**
- Maintenance scheduling rules:
  - Service every 5,000 km or 3 months (whichever sooner)
  - Tire replacement every 20,000 km
  - Oil change every 3,000 km
- `src/features/fleet/` - Maintenance due calculation

**Frontend Implementation:**
- Fleet dashboard shows: "Maintenance Due Soon" (within 1 week)
- Vehicle detail: next scheduled service date
- Quick action: schedule maintenance

---

### T-055: Define maintenance routing rules by source type

**Status:** ✅ **DONE**

**Database Implementation:**
- Maintenance routing rules encoded in service logic by `ownership` type

**Backend Implementation:**
- `src/features/fleet/` - Routing logic:
  - `company_owned`: route to internal workshop (vendor = internal)
  - `rental`: route to rental supplier (vendor = supplier_id from asset)
  - `rider_owned`: notify rider (no company cost unless crisis)
- `src/features/maintenance/` - Vendor selection based on vehicle type

**Frontend Implementation:**
- Maintenance form auto-selects vendor based on ownership
- Company-owned: internal workshop checkbox
- Rental: supplier auto-filled from asset
- Rider-owned: "Notify Rider" button (rider contacts own mechanic)

---

### T-056: Capture downtime start/end and replacement requirement

**Status:** ✅ **DONE**

**Database Implementation:**
- `maintenance_events` table:
  - `actual_start_date, actual_end_date` → calculates downtime_hours
  - `status` (scheduled, in_progress, completed)
- `spare_vehicle_dispatch` table - replacement tracking

**Backend Implementation:**
- `src/features/fleet/` - Downtime calculation
- When maintenance starts: mark vehicle as downtime, flag for replacement
- When maintenance completes: mark as available, end downtime

**Frontend Implementation:**
- Operations dashboard shows: "X vehicles in downtime"
- Maintenance event shows: Started [date], Expected back [date]
- Replacement mechanism: auto-offer spare vehicle or mark shift as affected

---

### T-057: Create registration/insurance/inspection expiry tracker

**Status:** ✅ **DONE**

**Database Implementation:**
- `assets` table fields:
  - `registration_expiry DATE`
  - `insurance_expiry DATE`
  - `vehicle_status` checks expiry

**Backend Implementation:**
- `src/features/eligibility/` - Vehicle eligibility check
- Vehicle cannot be assigned to shift if registration or insurance expired
- Daily alert: vehicles expiring within 7 days

**Frontend Implementation:**
- Fleet list shows expiry status:
  - Green: valid
  - Yellow: expiring 7 days
  - Red: expired
- Expiry badge shows days until expiry
- Alert to operations: "Vehicle [X] insurance expires in 3 days - schedule renewal"

---

### T-058: Create return-to-supplier workflow for rented vehicles

**Status:** ✅ **DONE**

**Database Implementation:**
- `assets` table:
  - `rental_contract_end DATE`
  - `status → retired` when returned
- `maintenance_events` for return inspection

**Backend Implementation:**
- `src/features/fleet/` - Rental return workflow:
  1. Rental contract end date approaching → alert supplier
  2. Schedule return inspection
  3. Record final odometer, condition
  4. Record any damage charges
  5. Mark asset as retired
- `src/features/finance/` - Final invoice from supplier

**Frontend Implementation:**
- Fleet dashboard shows: "Rental vehicles to return" (contract ending within 30 days)
- Return workflow form:
  - Confirm return date
  - Final condition inspection
  - Damage checklist
  - Photos
  - Supplier acknowledgement

---

### T-059: Define owned fleet lifecycle and replacement planning

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/fleet/` - Fleet replacement planning:
  - Track: age_years, total_km, utilization_rate
  - Flag for replacement: age > expected_life_years OR total_km > expected_km
  - Disposal options: scrap, sell, donate

**Frontend Implementation:**
- Fleet aging report showing:
  - Age distribution chart (0-2 years, 2-5 years, 5+ years)
  - Replacement candidates (5+ years old or high km)
  - Expected book value at replacement
  - Recommended action

---

### T-060: Create spare pool / standby fleet logic

**Status:** ✅ **DONE**

**Database Implementation:**
- `assets` table:
  - `is_spare BOOLEAN`
  - Spare vehicles: status = available, is_spare = true

**Backend Implementation:**
- `src/features/fleet/` - Spare pool criteria:
  - Minimum 10% of fleet size as spare pool
  - Spare vehicles must pass inspection
  - Priority order: newer vehicles first
- `src/features/operations/rider-allocation.ts` - Spare dispatch prioritization

**Frontend Implementation:**
- Admin page: "Fleet Optimization" showing:
  - Current spare pool size
  - Recommended spare pool size
  - Spare vehicle allocation (type, age, location)

---

### T-061: Define fleet dashboard metrics

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/analytics/queries.ts` - Fleet metrics calculation

**Frontend Implementation:**
- `src/features/dashboard/components/OperationsDashboard.tsx` - Fleet section:
  - Utilization rate (assigned / total fleet %)
  - Downtime hours (total maintenance downtime)
  - Average age (years)
  - Maintenance due count
  - Off-road count (maintenance + retired)

---

## Module 5: Finance (15 Tasks)

### T-062: Map revenue models by aggregator and contract

**Status:** ❌ **N/A - NEEDS PARTNER INFO**

**Why Not Implemented:**
Need actual rate structures from each aggregator.

**Questions for Partner:**
- Talabat: per-order rate? per-km? Incentive thresholds?
- Jahez: fixed commission or %?
- Keeta: different rates by time of day?
- Are there seasonal rates (higher during peak season)?

---

### T-063: Design client/aggregator billing rules

**Status:** ✅ **DONE**

**Database Implementation:**
- `contracts` table links client/aggregator to rates
- `platforms` table: `commission_percentage`, `min_order_value`

**Backend Implementation:**
- `src/features/finance/` - Billing rule engine
- Rules: who pays (client billed by us, we pay aggregator), rate, reconciliation method
- Contract-based billing calculation

**Frontend Implementation:**
- Contracts page shows billing terms
- Invoice generation based on contract terms

---

### T-064: Build rented vehicle monthly cost model

**Status:** ✅ **DONE**

**Database Implementation:**
- `assets` table stores rental costs:
  - `rental_monthly_cost DECIMAL 10,2`
  - `supplier_id` (for insurance, repairs coordination)

**Backend Implementation:**
- `src/features/finance/` - Monthly cost calculation:
  - Rent + insurance share + repairs + downtime impact
  - Posted to finance_ledger on month-end

**Frontend Implementation:**
- Vehicle detail shows: Monthly cost breakdown
  - Rent: [amount]
  - Insurance share: [amount]
  - Repairs (YTD avg): [amount]
  - Total cost/km: [amount]

---

### T-065: Build owned vehicle monthly cost model

**Status:** ✅ **DONE**

**Database Implementation:**
- `assets` table:
  - `purchase_price, purchase_date, expected_life_years`

**Backend Implementation:**
- `src/features/finance/` - Monthly owned vehicle cost:
  - Depreciation = purchase_price / (expected_life_years * 12)
  - Insurance (assumed)
  - Registration (annual, prorated)
  - Maintenance (average)
  - Posted to finance_ledger monthly

**Frontend Implementation:**
- Vehicle cost breakdown showing depreciation, insurance, maintenance
- Total cost/km calculation

---

### T-066: Build rider-owned company cost model

**Status:** ✅ **DONE**

**Database Implementation:**
- `riders_category_rules` table:
  - `bike_allowance DECIMAL 10,2` (monthly)
  - `subsidy DECIMAL 10,2` (insurance, registration support)

**Backend Implementation:**
- `src/features/payroll/` - Rider-owned cost calculation:
  - Monthly allowance + insurance subsidy + compliance admin cost
  - Posted to finance_ledger

**Frontend Implementation:**
- Show rider-owned rider's effective earnings:
  - Orders earnings
  - + Bike allowance
  - - Bike insurance (if company covers)
  - Net: [amount]

---

### T-067: Design payroll engine formula library

**Status:** ❌ **N/A - NEEDS PARTNER INFO**

**Why Not Implemented:**
Need exact payroll formulas from partner.

**Questions for Partner:**
- Fixed salary component? Or pure commission?
- Per-order rate formula?
- Incentives: threshold (e.g., "50+ orders = +10%")?
- Deductions: daily, weekly, monthly, or percentage-based?
- How to handle: partial shifts, absence, early checkout?

---

### T-068: Map vehicle-related deductions and allowances

**Status:** ❌ **N/A - NEEDS PARTNER INFO**

**Why Not Implemented:**
Need specific deduction/allowance policy by vehicle source type.

**Questions for Partner:**
- Company-bike deduction: daily amount or monthly flat?
- Rider-owned allowance: who sets the monthly amount?
- If company bike breaks, is deduction waived?
- Any mileage-based incentive for lower-fuel vehicles?
- Insurance: does rider-owned rider get insurance subsidy?

---

### T-069: Build supplier rental payable workflow

**Status:** ✅ **DONE**

**Database Implementation:**
- `contracts` table: rental agreements
- Invoice receipt tracked via status

**Backend Implementation:**
- `src/features/finance/invoicing.ts` - Supplier payable workflow:
  1. Supplier sends invoice (email/system)
  2. Scan and import invoice
  3. Match to contract (rental_contract_start/end dates)
  4. Approve payment
  5. Schedule payment (daily, weekly, monthly per contract)

**Frontend Implementation:**
- Supplier invoice receiving interface
- Rental payable tracker (accrual vs. cash basis)

---

### T-070: Build depreciation schedule for owned fleet

**Status:** ✅ **DONE**

**Database Implementation:**
- Asset depreciation calculated from `purchase_price` and `expected_life_years`

**Backend Implementation:**
- `src/features/finance/` - Depreciation calculation
- Methods: Straight-line (default) or reducing balance (configurable)
- Monthly depreciation posted to finance_ledger

**Frontend Implementation:**
- Asset detail shows: Book value, accumulated depreciation, monthly depreciation rate

---

### T-071: Build invoicing workflow

**Status:** ⚠️ **PARTIAL**

**Database Implementation:**
- Pre-existing `invoices` table

**Backend Implementation:**
- `src/features/invoicing/invoice-generation.ts`:
  - Generate invoice per client (aggregator)
  - Period detail: order count, revenue, commission, net
  - Aggregator breakdown by invoice line items

**Frontend Implementation:**
- Invoice generation interface
- Invoice detail shows: order breakdown, proforma calc, net due

**What's Missing:**
- Period detail in invoice PDF (show each day's summary)
- Aggregator breakdown (which aggregator sourced revenue)
- Auto-generation on schedule (monthly)

---

### T-072: Build collections and dispute tracker

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/finance/` - Collections module
- Track: invoice aging, dispute reason, resolution status

**Frontend Implementation:**
- Collections dashboard:
  - Aged receivables (0-30, 30-60, 60-90, 90+)
  - Disputed invoices (details, timeline)

---

### T-073: Define profit by vehicle source type report

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/finance/` - Segment income statement by ownership type:
  - OWNED: Revenue - (Depreciation + Insurance + Maintenance) = Profit
  - RENTED: Revenue - (Rental Cost + Repairs) = Profit
  - RIDER_OWNED: Revenue - (Allowance + Subsidy) = Profit

**Frontend Implementation:**
- Finance dashboard: Profitability by source type chart
- Drill-down to see vehicles in each category and their contribution

---

### T-074: Define profit by aggregator and client report

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/finance/` - Client profitability:
  - Filter finance_ledger by client_id
  - Gross margin = Revenue - all costs (payroll, vehicle, admin)

**Frontend Implementation:**
- Client profitability report (list all clients with margin %)
- Chart: revenue vs margin by client

---

### T-075: Design month-end close checklist

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/finance/` - Month-end close checklist:
  - Orders reconciled (all aggr orders matched)
  - Payroll finalized (all pay entered, approved, processed)
  - Fleet costs posted (depreciation, maintenance, rental invoices)
  - AP/AR matched (receivables and payables aligned)

**Frontend Implementation:**
- Finance manager checklist page
- Checkbox each item as complete
- Summary: ready to close Y/N

---

### T-076: Define finance dashboard metrics

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/analytics/queries.ts` - Finance metrics

**Frontend Implementation:**
- `src/features/dashboard/components/FinanceDashboard.tsx`
- Metrics:
  - Total revenue (orders)
  - Gross margin %
  - Cost per delivery
  - Payables (due to suppliers)
  - Receivables (due from clients)
- Client-filtered view

---

## Module 6: Compliance (12 Tasks)

### T-077: Create legal/compliance document matrix

**Status:** ❌ **N/A - NEEDS PARTNER INFO**

**Why Not Implemented:**
Need list of required documents per Bahrain law and aggregator requirements.

**Questions for Partner:**
- Which documents are legally required?
  - Employment contract
  - ID copy (Bahraini ID or visa)
  - Medical certificate
  - Insurance certificate
- Which documents required per aggregator?
  - Talabat-specific requirements?
  - Jahez-specific requirements?
- Expiry tracking: which docs need regular renewal?

---

### T-078: Create rider activation block rules

**Status:** ✅ **DONE**

**Database Implementation:**
- Block rules enforced via `rider_eligibility` table (migration 022)

**Backend Implementation:**
- `src/features/eligibility/` - Rider activation blocking:
  - Blocks if: license_expired OR visa_expired OR bank_invalid OR contract_missing
  - Cannot create shift assignment if blocked
  - Cannot accept order if blocked

**Frontend Implementation:**
- Rider detail shows: "Status: BLOCKED" with reason(s)
- Shift assignment form disabled for blocked riders
- HR interface to "clear block" after issue resolved

---

### T-079: Create vehicle activation block rules

**Status:** ✅ **DONE**

**Database Implementation:**
- Block rules in `rider_eligibility` table for assets

**Backend Implementation:**
- `src/features/eligibility/` - Vehicle activation blocking:
  - Blocks if: registration_expired OR insurance_expired OR inspection_failed
  - Cannot assign vehicle to shift if blocked

**Frontend Implementation:**
- Vehicle detail shows expiry status and block reason
- Operations cannot select blocked vehicle in pairing form

---

### T-080: Define rider-owned vehicle approval controls

**Status:** ✅ **DONE**

**Database Implementation:**
- `assets` table status: ownership_verified_date, inspection_passed_date

**Backend Implementation:**
- `src/features/fleet/` - Approval checklist:
  - Ownership verified (title deed scan)
  - Inspection passed (vehicle condition report)
  - Insurance valid
  - Registration valid
  - Manager approval

**Frontend Implementation:**
- Rider-owned vehicle approval form for admin
- Verification checklist with sign-off

---

### T-081: Define rented vehicle supplier control requirements

**Status:** ✅ **DONE**

**Database Implementation:**
- Supplier records in `vendors` table
- Contract terms in `contracts` table

**Backend Implementation:**
- Rented vehicle requirements:
  - Supplier contract valid
  - SLA defined (response time for breakdown)
  - Insurance terms accepted
  - Liability terms clear

**Frontend Implementation:**
- Supplier master configuration page
- Contract terms verification before adding rented vehicle

---

### T-082: Define owned fleet audit requirements

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/fleet/` - Owned vehicle audit checklist:
  - Asset tagged (RFID or sticker)
  - Depreciation schedule setup
  - Maintenance plan created

**Frontend Implementation:**
- Fleet setup checklist when adding owned vehicle
- Audit trail on vehicle history (all changes logged)

---

### T-083: Create accident evidence checklist

**Status:** ✅ **DONE**

**Database Implementation:**
- `incidents` table tracks evidence

**Backend Implementation:**
- Evidence requirements for accident incident:
  - Photos (before incident, damage, scene)
  - Police report (if applicable)
  - Rider statement
  - Vehicle status (operable? severe damage?)
  - Recovery decision (repair vs total loss)

**Frontend Implementation:**
- Incident reporting form with photo/video upload
- Checklist view ensuring all evidence collected before approval

---

### T-084: Create liability and recovery approval flow

**Status:** ✅ **DONE**

**Database Implementation:**
- `incidents` table:
  - `liability_assigned_to` (rider, company, third_party)
  - `approval_required_from_role` (supervisor, manager, finance_head)
  - `approved_by UUID`

**Backend Implementation:**
- Approval routing by cost:
  - <500 AED: supervisor approval
  - 500-2000 AED: manager approval
  - >2000 AED: finance head approval
- Recovery decision: charge rider, claim insurance, write off, third-party recovery

**Frontend Implementation:**
- Approval routing dashboard
- Managers see pending incidents requiring approval
- Liability and recovery decision interface

---

### T-085: Define audit log requirements

**Status:** ✅ **DONE**

**Backend Implementation:**
- All table changes logged via:
  - `created_at, updated_at` timestamps (automatic)
  - Database audit extension (pgAudit) on critical tables:
    - status changes
    - rate changes
    - assignment changes
    - payroll field changes

**Frontend Implementation:**
- Audit trail view on critical entity detail pages
- Activity log showing who changed what when

---

### T-086: Define exception approval workflow

**Status:** ✅ **DONE**

**Backend Implementation:**
- Exception types with approval levels:
  - Grace period requests (7+ days attendance waiver)
  - Urgent shift overrides (assign ineligible rider in emergency)
  - Replacement approvals (expedite spare dispatch)

**Frontend Implementation:**
- Exception approval queue for managers
- Reason field required for exception
- Approval/rejection with notes

---

### T-087: Define document archive and retention policy

**Status:** ⚠️ **PARTIAL**

**Database Implementation:**
- Files stored in Supabase storage
- `documents` table has upload date

**Backend Implementation:**
- Retention policy stored in `document_checklist` (retention_years field)
- No automatic archival/deletion yet

**Frontend Implementation:**
- Document view shows retention deadline
- Admin interface to archive old documents

**What's Missing:**
- Automated archival job (monthly check for archival-due documents)
- Archive storage (compress and move old documents)
- GDPR/data deletion compliance

---

### T-088: Define compliance dashboard metrics

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/analytics/queries.ts` - Compliance metrics:
  - Expired docs count (by type)
  - Blocked riders (ineligible)
  - Blocked vehicles (ineligible)
  - Open incidents (unresolved)

**Frontend Implementation:**
- Compliance dashboard:
  - Red alerts: expired docs, blocked riders/vehicles
  - Yellow warnings: expiring within 7 days
  - Risk score (aggregated compliance violations)

---

## Module 7: Integrations (10 Tasks)

### T-089: Gather API requirements for Talabat/Jahez/Keeta

**Status:** 🔌 **NEEDS INTEGRATION**

**Why Not Implemented:**
Requires API documentation and credentials from aggregators.

**Questions for Partner:**
- API endpoint for each aggregator?
- Authentication method (API key, OAuth)?
- Order export format (JSON fields)?
- Rate limiting (calls/second)?
- Which fields available: order_id, delivery_fee, incentive, tip, penalty?

---

### T-090: Design external order ID mapping strategy

**Status:** ✅ **DONE**

**Database Implementation:**
- `orders` table:
  - `external_order_id TEXT` - Aggregator's order ID
  - `import_batch_id UUID` - Batch tracking

**Backend Implementation:**
- `src/features/orders/` - Order import service
- Mapping: match external_order_id across systems
- Unique constraint: (organization_id, external_order_id, client_id)

**Frontend Implementation:**
- Order detail shows "External ID" from aggregator
- Order search by external ID

---

### T-091: Design earnings/incentive import mapping

**Status:** 🔌 **NEEDS INTEGRATION**

**Why Not Implemented:**
Depends on aggregator API data format (not yet confirmed).

**Questions for Partner:**
- How do aggregators communicate incentive payment details?
- File format: JSON export, CSV, real-time webhook?
- Fields included: base_payout, bonus, cancellation_fee?

---

### T-092: Define GPS/telematics integration requirements

**Status:** 🔌 **NEEDS INTEGRATION**

**Why Not Implemented:**
Requires GPS/telematics provider selection.

**Questions for Partner:**
- Which GPS provider? (Google Maps, Samsara, Verizon Connect, etc.)
- Rider tracking: real-time location, history playback?
- Data needed: attendance check-in location, order delivery location verification?
- Cost: per vehicle, per month?

---

### T-093: Define mobile app needs for rider and supervisor

**Status:** 🔌 **NEEDS INTEGRATION**

**Why Not Implemented:**
Requires mobile app development (future sprint).

**Questions for Partner:**
- Native (iOS + Android) or React Native/Flutter cross-platform?
- Priority features: check-in, order acceptance, navigation, issue reporting?
- Target platforms to start with: Android first?

---

### T-094: Define accounting system integration scope

**Status:** 🔌 **NEEDS INTEGRATION**

**Why Not Implemented:**
Requires target accounting system selection.

**Questions for Partner:**
- Use QuickBooks, Xero, custom accounting system?
- Integration scope: GL posting, receivables, payables?
- Data sync frequency: daily batches or real-time?

---

### T-095: Define e-sign/document storage integration

**Status:** ⚠️ **PARTIAL**

**Database Implementation:**
- Documents stored in Supabase storage (file bucket)

**Backend Implementation:**
- `src/features/documents/` - Document upload/download
- E-sign: placeholder iframe for third-party provider

**Frontend Implementation:**
- Document upload interface
- E-sign modal placeholder

**What's Missing:**
- E-sign provider integration (DocuSign, HelloSign)
- Signature capture and storage
- Signed document archive

---

### T-096: Create alerting requirements

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/notifications/` - Alert generation
- Alert types: expiry_alerts, breakdown_alerts, blocked_activation
- Delivery: SMS, email (configurable per alert type)

**Frontend Implementation:**
- In-app alert notifications (bell icon)
- Email template configuration by alert type

---

### T-097: Design webhook retry and error handling

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/integrations/` - Webhook handling
- Idempotent processing (retry_count, error_log)
- Dead letter queue for failing webhooks

**Frontend Implementation:**
- Admin dashboard showing:
  - Recent webhook activity
  - Failed webhooks (view error details)
  - Manual retry button

---

### T-098: Create integration monitoring checklist

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/integrations/` - Monitoring service
- Metrics: daily_sync_status, failure_count, latency_ms, reconciliation_gaps

**Frontend Implementation:**
- Integration health dashboard:
  - Each aggregator: status, last sync time, error count
  - Latency metrics
  - Reconciliation gaps

---

## Module 8: BI & Reports (11 Tasks)

### T-099: Create KPI dictionary

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/analytics/` - KPI definitions:
  - Formula (how calculated)
  - Owner (who maintains)
  - Grain (daily/weekly/monthly)
  - Refresh frequency

**Frontend Implementation:**
- KPI reference page documenting all metrics:
  - Revenue = sum of order nets
  - Margin = (Revenue - Costs) / Revenue
  - Cost per delivery = fleet costs / order count

---

### T-100: Define source-type profitability KPIs

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/finance/` - Segment profit calculations

**Frontend Implementation:**
- Report page showing:
  - Profit per owned vehicle
  - Profit per rented vehicle
  - Profit per rider-owned vehicle

---

### T-101: Design CEO dashboard

**Status:** ✅ **DONE**

**Frontend Implementation:**
- `src/features/dashboard/components/AdminDashboard.tsx` - Executive view
- Metrics: Revenue, Gross Margin, Active Riders, Source Type Mix, Risk Counts

---

### T-102: Design weekly executive pack

**Status:** 🔧 **CAN BUILD**

**Why Not Implemented:**
Low priority, but straightforward.

**Implementation Plan:**
- Create weekly digest PDF/email
- Include: revenue, margin, exceptions, alerts
- Automated send every Monday morning

---

### T-103: Define rider productivity report

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/analytics/` - Rider metrics:
  - Orders per rider (period)
  - Shift hours (attended vs scheduled)
  - Acceptance rate (offers accepted / offers made)
  - Downtime impact (vehicle breakdowns affecting shifts)

**Frontend Implementation:**
- Reporting page: Rider productivity ranked list
- Drill-down to individual rider performance

---

### T-104: Define idle rider/vehicle analysis

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/analytics/` - Utilization analysis:
  - Riders with <10 orders/week (underutilized)
  - Vehicles with <50% assignment (underutilized)
  - Pairing recommendations

**Frontend Implementation:**
- Report: Idle resources (riders + vehicles)
- Recommendation engine: pair idle rider with idle vehicle

---

### T-105: Define fleet aging and replacement report

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/analytics/` - Fleet aging:
  - Age distribution (years in service)
  - Total km vs expected lifetime km
  - Replacement candidates (age > expected_life OR km > expected_km)

**Frontend Implementation:**
- Fleet report: aging analysis
- Chart: age distribution, disposal recommendations

---

### T-106: Define downtime and maintenance report

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/analytics/` - Downtime metrics:
  - Events count (by vehicle, by cause)
  - Hours lost (sum of downtime_hours)
  - Cause breakdown (mechanical, accident, etc.)
  - Replacement demand (how many spare vehicles needed)

**Frontend Implementation:**
- Downtime report showing trends and patterns
- Maintenance ROI analysis (cost to fix vs downtime cost avoided)

---

### T-107: Define payroll exception report

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/analytics/` - Payroll outliers:
  - Zero-pay riders (inactive but in system)
  - Negative-pay riders (deductions > earnings)
  - High-earning outliers (verify not data errors)

**Frontend Implementation:**
- Payroll exceptions list
- Flag suspicious records for HR review

---

### T-108: Define billing reconciliation report

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/analytics/` - Billing comparison:
  - Order count match (our records vs aggregator)
  - Revenue match (our totals vs aggregator)
  - Disputes (variance reasons)
  - Invoice support (which orders backed which invoice)

**Frontend Implementation:**
- Reconciliation report by aggregator / client
- Variance analysis and trend

---

### T-109: Define compliance risk report

**Status:** ✅ **DONE**

**Backend Implementation:**
- `src/features/analytics/` - Compliance risk metrics:
  - Upcoming expiries (docs expiring within 30 days)
  - Blocked assets (cannot be used)
  - Blocked riders (cannot work shifts)
  - Unresolved incidents (open investigations)

**Frontend Implementation:**
- Compliance risk dashboard
- Risk score trending
- Alerts for critical issues

---

---

## Unimplemented Features & Questions

### Summary Table

| Task ID | Task Name | Status | Reason |
|---------|-----------|--------|--------|
| T-022 | Employment/service contract templates | N/A | **Needs Partner Info** - Templates required from partner |
| T-025 | Define pay components and earning rules | N/A | **Needs Partner Info** - Formulas required from partner |
| T-026 | Define own-bike allowance policy | N/A | **Needs Partner Info** - Amount and schedule needed |
| T-027 | Define company-bike deduction policy | N/A | **Needs Partner Info** - Amount and frequency needed |
| T-045 | Rider-owned breakdown support policy | N/A | **Needs Partner Info** - Coverage scope needed |
| T-062 | Map revenue models by aggregator | N/A | **Needs Partner Info** - Rate structures needed |
| T-067 | Design payroll engine formula library | N/A | **Needs Partner Info** - Formulas needed |
| T-068 | Map vehicle-related deductions | N/A | **Needs Partner Info** - Deduction policy needed |
| T-077 | Legal/compliance document matrix | N/A | **Needs Partner Info** - Doc requirements needed |
| T-089 | Gather aggregator API requirements | N/A | **Needs Integration** - API docs/credentials needed |
| T-091 | Design earnings/incentive import mapping | N/A | **Needs Integration** - API format needed |
| T-092 | Define GPS/telematics integration | N/A | **Needs Integration** - Provider selection needed |
| T-093 | Define mobile app needs | N/A | **Needs Integration** - Mobile app future phase |
| T-094 | Define accounting system integration | N/A | **Needs Integration** - Accounting system selection needed |
| T-095 | E-sign integration | ⚠️ **Partial** | E-sign provider integration pending |
| T-102 | Weekly executive pack | 🔧 **Can Build** | Low priority, straightforward implementation |
| T-029 | Disciplinary process vehicle misuse | ⚠️ **Partial** | Automatic triggers not yet implemented |
| T-033 | Shift planning with aggregator context | ⚠️ **Partial** | Aggregator assignment needs refinement |
| T-087 | Document archive/retention policy | ⚠️ **Partial** | Automated archival job not yet implemented |

---

### Detailed Questions & Blockers

#### 1. **Pay Calculation Formulas** (T-025, T-067, T-068)

**Current Implementation:**
- Database: Payroll table structure exists with fields for all components
- Backend: Stub payroll calculation in `src/features/payroll/`

**Required from Partner:**
- Company-bike rider pay structure
  - Per-order rate (AED)?
  - Per-km rate (AED)?
  - Incentive structure (e.g., "50+ orders = +10%")?
  - Company-bike deduction: how much and how often?
- Rider-owned pay structure
  - Per-order rate?
  - Rider-owned allowance: what amount?
  - Insurance subsidy?
  - Any vehicle condition requirements for allowance?

**Questions:**
- Are rates same for all riders or tier-based (by experience, rating)?
- How to handle: half shifts, partial absences, early checkouts?
- Bonus structure: weekly/monthly reset or cumulative?

---

#### 2. **Revenue & Aggregator Rates** (T-062, T-089, T-091)

**Current Implementation:**
- Database: Platforms table with commission_percentage, min_order_value
- Backend: Stub order import and reconciliation

**Required from Partner:**
- Rate card per aggregator:
  - **Talabat**: per-order rate, per-km rate, incentives?
  - **Jahez**: per-order rate, commission structure?
  - **Keeta**: per-order rate, special terms?
- When rates change, how is it communicated?
- API format for order imports (JSON fields expected)?

**Questions:**
- Are rates fixed or seasonal (peak vs off-peak)?
- How to handle order cancellations (do we lose payment)?
- Tip handling: rider gets all tips, or company takes cut?

---

#### 3. **Fleet & Vehicle Costs** (T-026, T-027, T-045)

**Current Implementation:**
- Database: Assets table with ownership type, rental costs, purchase price
- Backend: Cost allocation logic per vehicle type

**Required from Partner:**
- Company-bike deduction policy
  - Daily amount (e.g., 5 AED/day)?
  - Monthly cap?
  - Waived in certain conditions?
- Rider-owned bike allowance
  - Monthly amount?
  - Based on bike type/age?
  - What's the max allowance?
- Rider-owned breakdown policy
  - Does company pay for repairs if rider's bike breaks?
  - Insurance: who covers?
  - Is there a cost cap?

**Questions:**
- How are deductions handled if rider only works partial week?
- Exception: if company vehicle breaks unexpectedly, do we waive deduction for that period?

---

#### 4. **Compliance & Legal** (T-077, T-022)

**Current Implementation:**
- Database: Document checklist table exists
- Backend: Eligibility checks on expiry fields
- Frontend: Document upload and expiry tracking

**Required from Partner:**
- List of required documents
  - Employment contract (which clauses?)
  - ID copy (Bahraini or visa)?
  - Medical certificate?
  - Insurance certificate?
  - Bank account verification?
- Aggregator-specific requirements
  - Any docs unique to Talabat/Jahez/Keeta?
- Retention policy
  - How long to keep documents on file?
  - Any Bahrain labor law retention requirements?

**Questions:**
- Are there different doc requirements for company-bike vs rider-owned?
- Which documents require regular renewal (annual, semi-annual)?

---

#### 5. **Integrations** (T-089, T-092, T-094, T-095)

**Current Implementation:**
- Database: Integration monitoring table exists
- Backend: Stub for order import, webhook handling
- Frontend: Integration health dashboard

**Required from Partner:**
- **Aggregator APIs:**
  - Endpoint URLs
  - API key or OAuth
  - Rate limits
  - Response format (JSON fields)
  - Order status updates (delivered, cancelled, etc.)
- **GPS/Telematics:**
  - Provider selection (Google Maps, Samsara, etc.)
  - Pricing model (per vehicle, per month)?
  - Real-time vs historical data?
- **Accounting System:**
  - Which system (QuickBooks, Xero, SAP?)?
  - Integration scope (GL posting, payables, receivables)?
- **E-signature:**
  - Provider (DocuSign, HelloSign, other)?
  - Document templates signed by whom (riders, managers)?

---

#### 6. **Mobile App** (T-093)

**Current Implementation:**
- Web dashboard only (Next.js browser-based)

**Required from Partner:**
- Mobile strategy
  - Native (iOS + Android) or React Native/Flutter?
  - Target audience: riders, supervisors, managers?
  - MVP features: check-in, order acceptance, breakdown report?
  - Timeline: phase 1, phase 2?

---

#### 7. **Operational Policies** (T-045, T-033-1)

**Current Implementation:**
- Database: Breakdown workflow, spare vehicle dispatch tables
- Backend: Service logic for routing and escalation
- Frontend: Operations dashboard

**Required from Partner:**
- Rider-owned vehicle breakdown
  - Does company fund repairs or is rider responsible?
  - Is there a cost threshold?
  - Who selects the mechanic?
- Shift aggregator assignment
  - When adding a shift, which aggregator(s) can use it?
  - Can a shift be multi-aggregator (riders from different platforms)?
  - How is order assignment to shift riders determined?

---

### Implementation Roadmap

**Phase 1: Core Operations (In Progress)**
- ✅ Data model
- ✅ HR (basic onboarding, documents, payroll structure)
- ✅ Operations (shifts, attendance, eligibility)
- ✅ Fleet (vehicle tracking, assignment, maintenance)
- ⏳ Awaiting: Payment formulas

**Phase 2: Integrations**
- 🔌 Aggregator APIs (order import, earnings sync, reconciliation)
- 🔌 GPS/telematics (rider tracking, attendance validation)
- 🔌 E-sign (contract signing, document archive)

**Phase 3: Advanced Features**
- Mobile app for riders and supervisors
- Accounting system integration
- Advanced reporting and analytics

---

### Next Steps

**To Unblock Implementation:**

1. **Schedule Partner Call** - Discuss:
   - Payroll calculation formulas
   - Aggregator rate cards and API specs
   - Vehicle deduction/allowance policy
   - Required documents and compliance requirements

2. **Finalize Integrations** - Confirm:
   - Which aggregators to prioritize (Talabat first?)
   - GPS/telematics provider selection
   - E-sign provider choice
   - Accounting system selection

3. **Clarify Policies** - Get decisions on:
   - Rider-owned breakdown support
   - Shift-aggregator mapping strategy
   - Dispute resolution process

---

**Document prepared by:** Code Analysis  
**Date:** April 21, 2026  
**Version:** 1.0
