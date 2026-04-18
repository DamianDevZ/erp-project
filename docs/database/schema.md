# Database Schema

This document describes all tables, their relationships, and purpose.

> **Multi-tenant**: All tables (except `organizations`) have `organization_id` for tenant isolation via RLS.

---

## Enums

| Enum | Values | Used By |
|------|--------|---------|
| `employee_status` | `pending`, `active`, `past` | employees |
| `employee_role` | `rider`, `supervisor`, `manager`, `hr` | employees |
| `rider_category` | `company_vehicle_rider`, `own_vehicle_rider` | employees |
| `compliance_status` | `compliant`, `expiring_soon`, `non_compliant`, `blocked` | employees, assets |
| `asset_ownership` | `company_owned`, `employee_owned`, `rental` | assets |
| `asset_type` | `vehicle`, `equipment`, `other` | assets |
| `vehicle_status` | `available`, `assigned`, `maintenance`, `off_road`, `disposed` | assets |
| `contract_status` | `draft`, `active`, `expired`, `terminated` | contracts |
| `billing_model` | `per_order`, `per_hour`, `per_shift`, `fixed_monthly`, `hybrid` | contracts |
| `attendance_status` | `checked_in`, `checked_out`, `no_show`, `late`, `early_leave`, `approved`, `disputed` | attendance |
| `order_status` | `pending`, `completed`, `cancelled`, `returned`, `disputed` | orders |
| `incident_type` | `accident`, `theft`, `vandalism`, `breakdown`, `damage_rider`, `damage_third_party`, `violation`, `other` | incidents |
| `incident_severity` | `minor`, `moderate`, `major`, `total` | incidents |
| `responsibility_party` | `rider`, `third_party`, `company`, `unknown`, `shared` | incidents |
| `maintenance_type` | `scheduled_service`, `unscheduled_repair`, `accident_repair`, `inspection`, `cleaning`, `modification` | maintenance_events |
| `maintenance_paid_by` | `company`, `supplier`, `rider`, `insurance`, `warranty`, `pending` | maintenance_events |

---

## Core Tables

### `organizations`
Tenant table — each row is one company using the ERP.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Company name |
| `slug` | TEXT | URL-friendly identifier (unique) |
| `created_at` | TIMESTAMPTZ | When created |
| `updated_at` | TIMESTAMPTZ | Last update |

---

### `user_profiles`
App users — people who log into the dashboard (admin staff).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK, references `auth.users(id)` |
| `organization_id` | UUID | FK → `organizations` |
| `full_name` | TEXT | Display name |
| `email` | TEXT | Email address |
| `role` | TEXT | `admin`, `manager`, `hr`, `viewer` |
| `created_at` | TIMESTAMPTZ | When joined |
| `updated_at` | TIMESTAMPTZ | Last update |

---

## Employees

### `employees`
The people managed by the ERP — riders, supervisors, etc.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `full_name` | TEXT | Legal name |
| `email` | TEXT | Contact email (unique per org) |
| `phone` | TEXT | Contact phone |
| `role` | `employee_role` | `rider`, `supervisor`, `manager`, `hr` |
| `status` | `employee_status` | `pending`, `active`, `past` |
| `hire_date` | DATE | When hired |
| `termination_date` | DATE | When terminated (if applicable) |
| `created_at` | TIMESTAMPTZ | Record created |
| `updated_at` | TIMESTAMPTZ | Last update |

---

### `employee_documents`
Documents for employees (licenses, contracts, etc.)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `employee_id` | UUID | FK → `employees` |
| `type` | TEXT | `license`, `insurance`, `contract`, `id_card`, etc. |
| `file_path` | TEXT | Path in Supabase Storage |
| `file_name` | TEXT | Original filename |
| `expires_at` | DATE | Expiration date (nullable) |
| `created_at` | TIMESTAMPTZ | Upload date |

---

## Platforms (Clients)

### `platforms`
Delivery platforms the org works with (Uber Eats, DoorDash, etc.)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `name` | TEXT | Platform name |
| `contact_email` | TEXT | Contact email |
| `contact_phone` | TEXT | Contact phone |
| `is_active` | BOOLEAN | Whether currently active |
| `billing_rate_type` | TEXT | `per_delivery`, `hourly`, `fixed` |
| `billing_rate` | DECIMAL | Rate per unit |
| `created_at` | TIMESTAMPTZ | Record created |
| `updated_at` | TIMESTAMPTZ | Last update |

---

### `platform_assignments`
Links employees to platforms they work for.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `employee_id` | UUID | FK → `employees` |
| `platform_id` | UUID | FK → `platforms` |
| `start_date` | DATE | Assignment start |
| `end_date` | DATE | Assignment end (null = ongoing) |
| `status` | TEXT | `active`, `ended`, `suspended` |
| `external_id` | TEXT | Platform's driver ID |
| `created_at` | TIMESTAMPTZ | Record created |
| `updated_at` | TIMESTAMPTZ | Last update |

---

## Assets

### `assets`
Vehicles and equipment.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `name` | TEXT | Display name (e.g., "Honda PCX 2023") |
| `type` | `asset_type` | `vehicle`, `equipment`, `other` |
| `ownership` | `asset_ownership` | `company_owned`, `employee_owned`, `rental` |
| `license_plate` | TEXT | License plate number |
| `make` | TEXT | Manufacturer (Honda, Toyota) |
| `model` | TEXT | Model name |
| `year` | INTEGER | Year of manufacture |
| `color` | TEXT | Color |
| `vin` | TEXT | Vehicle Identification Number |
| `assigned_employee_id` | UUID | FK → `employees` (who uses it) |
| `owner_employee_id` | UUID | FK → `employees` (for employee-owned) |
| `is_active` | BOOLEAN | Whether in use |
| `notes` | TEXT | Additional notes |
| `created_at` | TIMESTAMPTZ | Record created |
| `updated_at` | TIMESTAMPTZ | Last update |

---

### `rental_companies`
Companies that rent out vehicles.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `name` | TEXT | Company name |
| `contact_name` | TEXT | Contact person |
| `contact_email` | TEXT | Email |
| `contact_phone` | TEXT | Phone |
| `address` | TEXT | Address |
| `notes` | TEXT | Notes |
| `created_at` | TIMESTAMPTZ | Record created |
| `updated_at` | TIMESTAMPTZ | Last update |

---

### `asset_rentals`
Rental contracts for rental assets.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `asset_id` | UUID | FK → `assets` |
| `rental_company_id` | UUID | FK → `rental_companies` |
| `contract_number` | TEXT | Contract/reference number |
| `start_date` | DATE | Rental start |
| `end_date` | DATE | Rental end (null = ongoing) |
| `daily_rate` | DECIMAL | Daily cost |
| `weekly_rate` | DECIMAL | Weekly cost |
| `monthly_rate` | DECIMAL | Monthly cost |
| `deposit_amount` | DECIMAL | Deposit paid |
| `status` | TEXT | `active`, `ended`, `cancelled` |
| `notes` | TEXT | Notes |
| `created_at` | TIMESTAMPTZ | Record created |
| `updated_at` | TIMESTAMPTZ | Last update |

---

### `asset_maintenance`
Maintenance records for assets.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `asset_id` | UUID | FK → `assets` |
| `type` | TEXT | `oil_change`, `repair`, `inspection`, etc. |
| `description` | TEXT | Details |
| `cost` | DECIMAL | Cost of maintenance |
| `performed_at` | DATE | When performed |
| `next_due_at` | DATE | Next scheduled maintenance |
| `created_at` | TIMESTAMPTZ | Record created |

---

## Invoicing

### `work_logs`
Daily work entries — deliveries, hours worked per employee per platform.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `employee_id` | UUID | FK → `employees` |
| `platform_id` | UUID | FK → `platforms` |
| `work_date` | DATE | Date of work |
| `deliveries_count` | INTEGER | Number of deliveries |
| `hours_worked` | DECIMAL | Hours worked |
| `gross_earnings` | DECIMAL | Platform-reported earnings |
| `tips` | DECIMAL | Tips received |
| `bonuses` | DECIMAL | Bonuses |
| `status` | TEXT | `pending`, `verified`, `invoiced` |
| `notes` | TEXT | Notes |
| `created_at` | TIMESTAMPTZ | Record created |
| `updated_at` | TIMESTAMPTZ | Last update |

**Unique constraint**: One entry per employee + platform + date.

---

### `invoices`
Invoices to platforms for services rendered.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `platform_id` | UUID | FK → `platforms` |
| `invoice_number` | TEXT | Unique invoice number |
| `period_start` | DATE | Billing period start |
| `period_end` | DATE | Billing period end |
| `subtotal` | DECIMAL | Amount before tax |
| `tax_rate` | DECIMAL | Tax percentage |
| `tax_amount` | DECIMAL | Tax amount |
| `total` | DECIMAL | Final amount |
| `status` | TEXT | `draft`, `sent`, `paid`, `overdue`, `cancelled` |
| `issued_at` | DATE | When issued |
| `due_at` | DATE | Payment due date |
| `paid_at` | DATE | When paid |
| `notes` | TEXT | Notes |
| `created_at` | TIMESTAMPTZ | Record created |
| `updated_at` | TIMESTAMPTZ | Last update |

---

### `invoice_line_items`
Breakdown of invoice charges.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `invoice_id` | UUID | FK → `invoices` |
| `description` | TEXT | Line item description |
| `employee_id` | UUID | FK → `employees` (optional) |
| `quantity` | DECIMAL | Quantity |
| `unit_price` | DECIMAL | Price per unit |
| `amount` | DECIMAL | Total (qty × price) |
| `type` | TEXT | `service`, `deliveries`, `hours`, `bonus`, `adjustment`, `other` |
| `created_at` | TIMESTAMPTZ | Record created |

---

## Entity Relationship Diagram

```
┌──────────────────┐
│  organizations   │
└────────┬─────────┘
         │
    ┌────┴────┬──────────────┬──────────────┬────────────────┐
    │         │              │              │                │
    ▼         ▼              ▼              ▼                ▼
┌────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────────┐
│ users  │ │employees │ │platforms │ │  assets   │ │rental_companies │
└────────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘ └────────┬────────┘
                │            │             │                │
        ┌───────┼────────────┤             │                │
        │       │            │             ▼                ▼
        ▼       ▼            ▼      ┌─────────────┐  ┌─────────────┐
  ┌──────────┐ ┌────────────────┐   │asset_rentals│──│   (link)    │
  │documents │ │platform_assign │   └─────────────┘  └─────────────┘
  └──────────┘ └───────┬────────┘         │
                       │                  ▼
                       ▼           ┌──────────────┐
               ┌───────────┐       │ maintenance  │
               │ work_logs │       └──────────────┘
               └─────┬─────┘
                     │
                     ▼
               ┌───────────┐
               │ invoices  │────► invoice_line_items
               └───────────┘
```

---

## RLS Helper Function

```sql
-- Get current user's organization
SELECT public.get_user_organization_id();
```

All queries are automatically scoped to the user's organization via RLS policies.

---

## New Tables (3PL Enhancement)

> Added to support the 3PL mixed-fleet operations requirements.

### `contracts`
Service contracts with clients/aggregators defining commercial terms.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `platform_id` | UUID | FK → `platforms` |
| `contract_number` | TEXT | Contract reference |
| `contract_name` | TEXT | Display name |
| `start_date` | DATE | Contract start |
| `end_date` | DATE | Contract end (null = open-ended) |
| `status` | `contract_status` | draft, active, expired, terminated |
| `billing_model` | `billing_model` | per_order, per_hour, per_shift, fixed_monthly, hybrid |
| `rate_per_order` | DECIMAL | Rate per order (if applicable) |
| `rate_per_hour` | DECIMAL | Rate per hour (if applicable) |
| `incentive_share_percent` | DECIMAL | % of platform incentives we keep |
| `billing_frequency` | TEXT | weekly, biweekly, monthly |
| `payment_due_days` | INTEGER | Days after invoice to pay |
| `currency` | TEXT | Default 'BHD' |
| `service_zones` | TEXT | Comma-separated zone names |
| `created_at` | TIMESTAMPTZ | Record created |
| `updated_at` | TIMESTAMPTZ | Last update |

---

### `rider_vehicle_assignments`
History of rider-to-vehicle assignments with handover tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `employee_id` | UUID | FK → `employees` |
| `asset_id` | UUID | FK → `assets` |
| `platform_id` | UUID | FK → `platforms` (optional) |
| `start_date` | DATE | Assignment start |
| `end_date` | DATE | Assignment end (null = active) |
| `assignment_type` | TEXT | primary, temporary, replacement |
| `assignment_reason` | TEXT | Why assigned |
| `handover_condition` | TEXT | Condition notes at handover |
| `handover_odometer` | INTEGER | Odometer at handover |
| `return_condition` | TEXT | Condition at return |
| `return_odometer` | INTEGER | Odometer at return |
| `created_at` | TIMESTAMPTZ | Record created |
| `updated_at` | TIMESTAMPTZ | Last update |

---

### `attendance`
Rider attendance with GPS check-in/out.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `employee_id` | UUID | FK → `employees` |
| `shift_id` | UUID | FK → `shifts` (optional) |
| `platform_id` | UUID | FK → `platforms` (optional) |
| `attendance_date` | DATE | Date of attendance |
| `check_in_time` | TIMESTAMPTZ | When checked in |
| `check_in_latitude` | DECIMAL | GPS latitude |
| `check_in_longitude` | DECIMAL | GPS longitude |
| `check_in_method` | TEXT | manual, gps, qr_code, biometric |
| `check_out_time` | TIMESTAMPTZ | When checked out |
| `worked_hours` | DECIMAL | Total hours worked |
| `status` | `attendance_status` | checked_in, checked_out, no_show, etc. |
| `late_minutes` | INTEGER | Minutes late |
| `requires_approval` | BOOLEAN | Needs supervisor approval |
| `approved_by` | UUID | FK → `user_profiles` |
| `created_at` | TIMESTAMPTZ | Record created |
| `updated_at` | TIMESTAMPTZ | Last update |

---

### `orders`
Delivery orders imported from aggregators.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `external_order_id` | TEXT | Order ID from aggregator |
| `platform_id` | UUID | FK → `platforms` |
| `contract_id` | UUID | FK → `contracts` (optional) |
| `employee_id` | UUID | FK → `employees` |
| `asset_id` | UUID | FK → `assets` |
| `order_date` | DATE | Date of delivery |
| `order_type` | TEXT | delivery, pickup, express, scheduled |
| `distance_km` | DECIMAL | Distance traveled |
| `base_payout` | DECIMAL | Base delivery fee we receive |
| `incentive_payout` | DECIMAL | Bonus/incentive amount |
| `tip_amount` | DECIMAL | Tip received |
| `total_revenue` | DECIMAL | Total revenue |
| `platform_commission` | DECIMAL | Platform commission |
| `net_revenue` | DECIMAL | Net revenue |
| `status` | `order_status` | pending, completed, cancelled, etc. |
| `reconciliation_status` | TEXT | pending, matched, mismatched |
| `payroll_processed` | BOOLEAN | Included in payroll |
| `invoice_processed` | BOOLEAN | Included in invoice |
| `created_at` | TIMESTAMPTZ | Record created |
| `updated_at` | TIMESTAMPTZ | Last update |

---

### `maintenance_events`
Vehicle maintenance, repair, and service records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `asset_id` | UUID | FK → `assets` |
| `incident_id` | UUID | FK → `incidents` (if caused by accident) |
| `event_type` | `maintenance_type` | scheduled_service, unscheduled_repair, etc. |
| `description` | TEXT | What was done |
| `vendor_id` | UUID | FK → `vendors` |
| `reported_date` | DATE | When reported |
| `completed_at` | TIMESTAMPTZ | When completed |
| `downtime_hours` | DECIMAL | Hours out of service |
| `actual_cost` | DECIMAL | Total cost |
| `paid_by` | `maintenance_paid_by` | company, supplier, rider, etc. |
| `recovery_amount` | DECIMAL | Amount recovered |
| `recovery_status` | TEXT | pending, partial, recovered |
| `status` | TEXT | reported, in_progress, completed |
| `created_at` | TIMESTAMPTZ | Record created |
| `updated_at` | TIMESTAMPTZ | Last update |

---

### `incidents`
Accidents, damage events, and incidents.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `incident_number` | TEXT | Reference number |
| `asset_id` | UUID | FK → `assets` |
| `employee_id` | UUID | FK → `employees` |
| `incident_type` | `incident_type` | accident, theft, vandalism, etc. |
| `severity` | `incident_severity` | minor, moderate, major, total |
| `incident_date` | DATE | When it happened |
| `incident_location` | TEXT | Where it happened |
| `description` | TEXT | What happened |
| `responsibility` | `responsibility_party` | rider, third_party, company, unknown |
| `photos_uploaded` | BOOLEAN | Evidence photos uploaded |
| `police_report_filed` | BOOLEAN | Police report exists |
| `insurance_claim_filed` | BOOLEAN | Insurance claim submitted |
| `total_cost` | DECIMAL | Total cost of incident |
| `recovery_status` | TEXT | pending, partial, recovered, written_off |
| `vehicle_downtime_days` | INTEGER | Days vehicle was out |
| `status` | TEXT | reported, under_investigation, resolved, closed |
| `created_at` | TIMESTAMPTZ | Record created |
| `updated_at` | TIMESTAMPTZ | Last update |

---

## Enhanced Employees Fields

> New fields added to `employees` table for rider management.

| Column | Type | Description |
|--------|------|-------------|
| `license_number` | TEXT | Driver's license number |
| `license_type` | TEXT | motorcycle, car, both |
| `license_expiry` | DATE | License expiration date |
| `visa_number` | TEXT | Work visa number |
| `visa_type` | TEXT | Visa category |
| `visa_expiry` | DATE | Visa expiration date |
| `rider_category` | `rider_category` | company_vehicle_rider, own_vehicle_rider |
| `compliance_status` | `compliance_status` | Auto-calculated based on doc expiries |
| `onboarding_completed_at` | TIMESTAMPTZ | When onboarding finished |
| `activation_date` | DATE | When rider can start working |
| `deactivation_date` | DATE | When rider stopped working |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp |

---

## Enhanced Assets Fields

> New fields added to `assets` table for vehicle management.

| Column | Type | Description |
|--------|------|-------------|
| `registration_number` | TEXT | Vehicle registration |
| `registration_expiry` | DATE | Registration expiration |
| `insurance_policy_number` | TEXT | Insurance policy reference |
| `insurance_expiry` | DATE | Insurance expiration |
| `inspection_date` | DATE | Last inspection |
| `inspection_expiry` | DATE | Inspection due date |
| `vehicle_status` | `vehicle_status` | available, assigned, maintenance, etc. |
| `compliance_status` | `compliance_status` | Auto-calculated |
| `purchase_date` | DATE | For owned vehicles |
| `purchase_price` | DECIMAL | Purchase cost |
| `expected_life_years` | INTEGER | Expected useful life |
| `odometer_reading` | INTEGER | Current odometer |
| `next_service_km` | INTEGER | Service due at km |
| `next_service_date` | DATE | Service due date |
| `is_spare` | BOOLEAN | In spare/standby pool |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp |

---

## Enhanced Platforms Fields

> New fields added to `platforms` table for aggregator integration.

| Column | Type | Description |
|--------|------|-------------|
| `api_base_url` | TEXT | Aggregator API URL |
| `api_key_encrypted` | TEXT | Encrypted API key |
| `integration_status` | TEXT | not_configured, configured, active, error |
| `commission_rate` | DECIMAL | Platform's commission % |
| `incentive_share_rate` | DECIMAL | Our share of incentives |
| `payment_terms` | TEXT | weekly, biweekly, monthly |
| `payment_delay_days` | INTEGER | Days after period end |
| `requires_uniform` | BOOLEAN | Rider needs uniform |
| `requires_bag` | BOOLEAN | Rider needs delivery bag |
| `orders_import_method` | TEXT | manual, api, csv |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp |

---

### `payroll`
Pay periods and calculations for riders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `payroll_number` | TEXT | Pay period reference |
| `period_start` | DATE | Period start date |
| `period_end` | DATE | Period end date |
| `payment_date` | DATE | When to pay |
| `employee_id` | UUID | FK → `employees` |
| `rider_category` | `rider_category` | Snapshot at calculation time |
| `base_salary` | DECIMAL | Fixed base salary |
| `orders_count` | INTEGER | Orders completed |
| `order_earnings` | DECIMAL | Earnings from orders |
| `incentives` | DECIMAL | Platform incentives |
| `tips` | DECIMAL | Tips received |
| `vehicle_allowance` | DECIMAL | Own-bike allowance (T-026) |
| `gross_pay` | DECIMAL | Total before deductions |
| `vehicle_deduction` | DECIMAL | Company-bike deduction (T-027) |
| `damage_deduction` | DECIMAL | Damage recovery |
| `advance_recovery` | DECIMAL | Advance payback |
| `total_deductions` | DECIMAL | All deductions sum |
| `net_pay` | DECIMAL | Final pay amount |
| `status` | `payroll_status` | draft, calculated, approved, processing, paid |
| `approved_by` | UUID | FK → `user_profiles` |
| `created_at` | TIMESTAMPTZ | Record created |
| `updated_at` | TIMESTAMPTZ | Last update |

---

### `finance_ledger`
Cost allocation and financial tracking for P&L analysis.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → `organizations` |
| `transaction_date` | DATE | When transaction occurred |
| `transaction_type` | `ledger_transaction_type` | revenue, payroll, vehicle_cost, etc. |
| `category` | TEXT | Sub-category for reporting |
| `description` | TEXT | Transaction description |
| `amount` | DECIMAL | Amount (positive=expense, negative=income) |
| `currency` | TEXT | Default 'BHD' |
| `platform_id` | UUID | FK → `platforms` (for allocation) |
| `contract_id` | UUID | FK → `contracts` (for allocation) |
| `employee_id` | UUID | FK → `employees` (for allocation) |
| `asset_id` | UUID | FK → `assets` (for allocation) |
| `vendor_id` | UUID | FK → `vendors` (for allocation) |
| `vehicle_source_type` | TEXT | company_owned, rental, employee_owned (T-073) |
| `source_table` | TEXT | Source record table |
| `source_id` | UUID | Source record ID |
| `accounting_period` | TEXT | YYYY-MM format |
| `is_posted` | BOOLEAN | Whether posted to accounting |
| `created_at` | TIMESTAMPTZ | Record created |
| `updated_at` | TIMESTAMPTZ | Last update |
