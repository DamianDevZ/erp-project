# Database Schema

This document describes all tables, their relationships, and purpose.

> **Multi-tenant**: All tables (except `organizations`) have `organization_id` for tenant isolation via RLS.

---

## Enums

| Enum | Values | Used By |
|------|--------|---------|
| `employee_status` | `pending`, `active`, `past` | employees |
| `employee_role` | `rider`, `supervisor`, `manager`, `hr` | employees |
| `asset_ownership` | `company_owned`, `employee_owned`, `rental` | assets |
| `asset_type` | `vehicle`, `equipment`, `other` | assets |

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
