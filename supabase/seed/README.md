# Seed Data

This directory contains SQL seed data for development and testing purposes.

## Overview

The seed data creates a realistic 3PL delivery company called **SwiftRiders LLC** based in Dubai, UAE. The data covers all major modules of the ERP system.

## Organization Details

| Attribute | Value |
|-----------|-------|
| **Company Name** | SwiftRiders LLC |
| **Location** | Dubai, UAE |
| **Currency** | AED (UAE Dirham) |
| **Timezone** | Asia/Dubai |
| **Reference Date** | April 19, 2026 |

## File Order

Files must be executed in order due to foreign key dependencies:

| # | File | Description |
|---|------|-------------|
| 1 | `01-organization.sql` | Organization, departments, job titles, shift templates, zones, document types |
| 2 | `02-platforms.sql` | Delivery platforms (Talabat, Deliveroo, etc.) and rate cards |
| 3 | `03-employees.sql` | 37 employees across all roles |
| 4 | `04-vehicles.sql` | Fleet vehicles (bikes, vans) and maintenance records |
| 5 | `05-platform-assignments.sql` | Rider-to-platform assignments |
| 6 | `06-shifts-attendance.sql` | Shifts for the week, assignments, attendance records |
| 7 | `07-orders.sql` | Delivery orders and COD collections |
| 8 | `08-finance.sql` | Invoices, payroll batches, advances, petty cash, traffic violations |
| 9 | `09-compliance.sql` | Employee documents, compliance alerts, onboarding checklists |

## Data Summary

### Organization Structure

- **5 Departments**: Operations, Human Resources, Finance, Fleet Management, Administration
- **8 Job Titles**: General Manager, Operations Manager, HR Manager, Finance Manager, Fleet Coordinator, Team Lead, Senior Rider, Rider
- **8 Delivery Zones**: Downtown Dubai, Business Bay, Dubai Marina, JBR, Deira, DIFC, Al Barsha, Motor City
- **5 Shift Templates**: Morning (6-14), Day (8-16), Evening (14-22), Night (22-6), Split (10-14, 18-22)

### Platforms

| Platform | Status | Base Rate | Peak Multiplier |
|----------|--------|-----------|-----------------|
| Talabat | Active | 8 AED | 1.5x |
| Deliveroo | Active | 9 AED | 1.6x |
| Noon Food | Active | 7.50 AED | 1.4x |
| Careem Now | Active | 8.50 AED | 1.5x |
| Instashop | Active | 10 AED | 1.3x |
| Amazon | Active | 12 AED | 1.2x |
| Quiqup | Inactive | — | — |

### Employees (37 total)

| Category | Count | Examples |
|----------|-------|----------|
| Management | 5 | GM, Ops Manager, HR, Finance, Fleet Coordinator |
| Team Leads | 3 | Ali Hassan, Mohammed Bakr, Khaled Omar |
| Senior Riders | 4 | Ajay Patel, Bilal Ahmed, Ravi Kumar, Lakshan Perera |
| Regular Riders | 18 | Active riders across all platforms |
| Part-time | 3 | Riders with fewer hours |
| Probation | 2 | Newly joined riders |
| Inactive | 2 | 1 terminated, 1 resigned |

### Fleet (32 vehicles)

| Category | Count | Details |
|----------|-------|---------|
| Assigned Bikes | 20 | Honda, Yamaha, TVS bikes |
| Spare Bikes | 5 | Pool vehicles for backup |
| In Maintenance | 2 | Currently being serviced |
| Rented Bikes | 3 | From rental company |
| Delivery Vans | 2 | For large orders |

### Financial Data

- **8 Invoices**: 6 paid, 2 draft (pending)
- **2 Payroll Batches**: March paid, April draft
- **3 Employee Advances**: Sample salary advances
- **6 Petty Cash**: Recent office expenses
- **3 Traffic Violations**: 1 pending, 1 disputed, 1 paid

### Compliance

- **15 Employee Documents**: Mix of EID, passport, visa, driving license
- **8 Compliance Alerts**: Critical (expired), High (expiring soon), Medium, Low
- **4 Onboarding Checklists**: Sample riders in various onboarding stages

## Usage

### Run All Seeds (PostgreSQL CLI)

```bash
cd supabase/seed
psql -d your_database -f seed-all.sql
```

### Run Individual Files

```bash
psql -d your_database -f 01-organization.sql
psql -d your_database -f 02-platforms.sql
# ... and so on
```

### Using Supabase

Add to `supabase/seed.sql`:

```sql
\i seed/01-organization.sql
\i seed/02-platforms.sql
-- etc.
```

Then run:

```bash
supabase db reset
```

## Important UUIDs

All seed data uses predictable UUIDs for easy reference:

| Entity | UUID Pattern | Example |
|--------|--------------|---------|
| Organization | `00000000-0000-0000-0000-000000000001` | SwiftRiders LLC |
| Employees | `e0000000-0000-0000-0000-000000000XXX` | GM is `...000001` |
| Vehicles | `v0000000-0000-0000-0000-000000000XXX` | First bike is `...000001` |
| Platforms | `p0000000-0000-0000-0000-000000000XXX` | Talabat is `...000001` |
| Departments | `d0000000-0000-0000-0000-000000000XXX` | Operations is `...000001` |

## Resetting Data

To reset and reseed:

```bash
# Using Supabase CLI
supabase db reset

# Or manually truncate and reseed
psql -d your_database -c "TRUNCATE organizations CASCADE"
psql -d your_database -f seed-all.sql
```

## Notes

- All dates are relative to April 19, 2026 (the "current" date in seed data)
- Financial amounts are in AED (UAE Dirham)
- Phone numbers use UAE format (+971-XX-XXXXXXX)
- Employee numbers follow pattern `SR-XXXX` (SwiftRiders)
