# 3PL Mixed-Fleet System Implementation Tracker

> Internal tracking document mapping partner requirements to our ERP build.  
> Source: `3PL_Mixed_Fleet_System_Task_Checklist.xlsx` (received April 18, 2026)

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total Tasks | 109 |
| Already Built (full/partial) | ~15 |
| Not Started | ~94 |
| Needs Clarification | 8 |

### Phase Overview

| Phase | Focus | Priority Tasks |
|-------|-------|----------------|
| **Phase 1 - Foundation** | Data model, core entities, compliance basics | 32 Critical/High |
| **Phase 2 - Core Operations** | Shifts, attendance, orders, incidents | 28 Critical/High |
| **Phase 3 - Finance & Control** | Payroll, billing, maintenance, cost models | 25 Critical/High |
| **Phase 4 - Integrations & BI** | APIs, dashboards, reports | 24 Medium/Low |

---

## Terminology Mapping

| Partner Term | Our Current Term | Action Needed |
|--------------|------------------|---------------|
| **Riders** | Employees | Consider renaming or adding `rider_category` field |
| **Vehicles** | Assets | Need to add `vehicle_source_type` enum |
| **Aggregators** | N/A | New entity (Talabat, Jahez, Keeta) |
| **Clients** | Platforms | Already exists, good match |
| **Orders** | N/A | New entity - external delivery orders |
| **Attendance** | N/A | New entity - GPS check-in/out |
| **Contracts** | N/A | New entity - rate/billing terms |
| **Payroll** | N/A | New entity - complex pay calculation |
| **Maintenance_Events** | N/A | New entity - service/repair tracking |

### Vehicle Source Types (Critical Concept)

They use a mixed-fleet model with 3 vehicle ownership types:

| Type | Code | Description | Our Impact |
|------|------|-------------|------------|
| Company Owned | `OWNED_BY_COMPANY` | Company purchased the bike | Full asset tracking, depreciation |
| Rented | `RENTED_BY_COMPANY` | Rented from suppliers | Supplier management, rental costs |
| Rider Owned | `RIDER_OWNED` | Rider brings own bike | Allowance payments, less control |

Many tasks have different logic paths based on source type. This is a **core architectural decision**.

---

## Module 1: Data Model (18 Tasks)

### What We Have vs What They Need

| Their Entity | Our Entity | Match | Gap |
|--------------|------------|-------|-----|
| Riders | `employees` | Partial | Need rider-specific fields (license, visa, bank, rider_category) |
| Vehicles | `assets` | Partial | Need `vehicle_source_type`, compliance dates, assignment tracking |
| Clients | `platforms` | ✅ Good | Minor field additions |
| Aggregators | N/A | ❌ Missing | New table needed |
| Contracts | N/A | ❌ Missing | New table needed |
| Shifts | `shifts` | ✅ Good | Need attendance linkage |
| Attendance | N/A | ❌ Missing | New table needed |
| Orders | N/A | ❌ Missing | New table needed |
| Maintenance_Events | N/A | ❌ Missing | New table needed |
| Payroll | N/A | ❌ Missing | New table needed |
| Finance_Ledger | N/A | ❌ Missing | New table needed |
| Incidents | N/A | ❌ Missing | New table needed |

### Task Details

| Task ID | Task | Status | Our Work | Notes |
|---------|------|--------|----------|-------|
| T-001 | Master ID strategy and audit fields | ✅ Done | All tables have `id`, `created_at`, `updated_at`, `organization_id` | Add `deleted_at` for soft delete? |
| T-002 | Create Riders entity | ⚠️ Partial | `employees` table exists | Need: license_number, license_expiry, visa_expiry, bank_account, rider_category |
| T-003 | Create Vehicles entity | ⚠️ Partial | `assets` table exists | Need: vehicle_source_type, compliance_dates, current_assignment |
| T-004 | Add vehicle_source_type enum | ❌ Not Started | - | Critical: `RENTED_BY_COMPANY`, `OWNED_BY_COMPANY`, `RIDER_OWNED` |
| T-005 | Create Vehicle_Source_Details entity | ❌ Not Started | - | Ownership proof, supplier, costs, responsibilities |
| T-006 | Create Rider_Vehicle_Assignments | ❌ Not Started | - | History table for assignment tracking |
| T-007 | Create Clients entity | ✅ Done | `platforms` table | May need fields for 3PL customer specifics |
| T-008 | Create Aggregators entity | ❌ Not Started | - | Talabat, Jahez, Keeta config |
| T-009 | Create Contracts entity | ❌ Not Started | - | Rates, validity, billing terms |
| T-010 | Create Shifts entity | ✅ Done | `shifts` table | Need attendance linkage |
| T-011 | Create Attendance entity | ❌ Not Started | - | GPS check-in/out, worked hours |
| T-012 | Create Orders entity | ❌ Not Started | - | External order data from aggregators |
| T-013 | Create Maintenance_Events entity | ❌ Not Started | - | Service/repair/accident records |
| T-014 | Create Payroll entity | ❌ Not Started | - | Complex pay calculation |
| T-015 | Create Finance_Ledger | ❌ Not Started | - | Cost allocation structure |
| T-016 | Create Incidents entity | ❌ Not Started | - | Accidents, damage, downtime |
| T-017 | Define master status enums | ⚠️ Partial | Some enums exist | Need unified status strategy |
| T-018 | User roles and permission matrix | ⚠️ Partial | `user_profiles.role` exists | Need granular permissions |

---

## Module 2: HR (14 Tasks)

### What We Have

- ✅ Employee management (basic CRUD)
- ✅ Leave management
- ✅ Documents management
- ✅ Discipline/Performance tracking
- ✅ Training management
- ❌ Onboarding workflow
- ❌ Payroll inputs/calculation
- ❌ Contract templates
- ❌ Visa/license expiry tracking

### Task Details

| Task ID | Task | Status | Our Work | Notes |
|---------|------|--------|----------|-------|
| T-019 | Rider onboarding workflow | ❌ Not Started | - | Multi-step application to activation |
| T-020 | Rider category rules by transport model | ❌ Not Started | - | Different handling for company-bike vs rider-owned |
| T-021 | Document collection checklist | ⚠️ Partial | `employee_documents` exists | Need: checklist logic, required docs list |
| T-022 | Employment contract templates | ❌ Not Started | - | Different clauses per vehicle source type |
| T-023 | Deposit/deduction agreements | ❌ Not Started | - | Damage, uniform, equipment recovery |
| T-024 | Visa and license expiry alerts | ❌ Not Started | - | **Critical** - block activation if expired |
| T-025 | Pay components and earning rules | ❌ Not Started | - | Fixed, per-order, km, allowance, deductions |
| T-026 | Own-bike allowance policy | ❌ Not Started | - | Rider-owned vehicle allowance |
| T-027 | Company-bike deduction policy | ❌ Not Started | - | Monthly/daily deduction for company vehicles |
| T-028 | Attendance approval flow | ❌ Not Started | - | Manual override, lateness handling |
| T-029 | Disciplinary process for vehicle misuse | ⚠️ Partial | `performance_discipline` exists | Need: vehicle-specific triggers |
| T-030 | Offboarding checklist | ❌ Not Started | - | Final pay, asset return, doc archive |
| T-031 | Leave/absence handling | ✅ Done | `leaves` table | Link to roster and payroll |
| T-032 | HR dashboard metrics | ❌ Not Started | - | Headcount, churn, expired docs |

---

## Module 3: Operations (15 Tasks)

### What We Have

- ✅ Shifts management
- ✅ Coaching records
- ✅ Assets/Locations
- ❌ Rider allocation logic
- ❌ Order management
- ❌ Live control tower
- ❌ Incident handling

### Task Details

| Task ID | Task | Status | Our Work | Notes |
|---------|------|--------|----------|-------|
| T-033 | Shift planning and roster | ⚠️ Partial | `shifts` exists | Need: aggregator/client assignment |
| T-034 | Rider eligibility check | ❌ Not Started | - | Validate docs + vehicle before activation |
| T-035 | Rider allocation rules by aggregator | ❌ Not Started | - | Talabat/Jahez/Keeta assignment logic |
| T-036 | Rider + vehicle pairing workflow | ❌ Not Started | - | Match available vehicle to rider |
| 36-1 | Replace vehicle of rider | ❌ Not Started | - | Temp/perm replacement for vehicle issues |
| T-037 | Live operations control tower | ❌ Not Started | - | Phase 4 - Real-time dashboard |
| T-038 | Breakdown escalation workflow | ❌ Not Started | - | Different paths per source type |
| T-039 | Connect attendance to roster | ❌ Not Started | - | Show no-shows, late arrivals |
| T-040 | Manual order import | ❌ Not Started | - | CSV fallback when API unavailable |
| T-041 | Order reconciliation process | ❌ Not Started | - | Validate against aggregator data |
| T-042 | Exception queue for mismatched orders | ❌ Not Started | - | Surface mapping failures |
| T-043 | Accident/incident procedure | ❌ Not Started | - | Escalation, approval, evidence |
| T-044 | Spare vehicle dispatch logic | ❌ Not Started | - | Replacement eligibility rules |
| T-045 | Rider-owned breakdown support policy | ❌ Not Started | - | When company helps vs rider responsible |
| T-046 | Operations dashboard metrics | ❌ Not Started | - | Orders/rider, attendance gaps |

---

## Module 4: Fleet (15 Tasks)

### What We Have

- ✅ Asset management (basic)
- ✅ Locations management
- ⚠️ Vendor management (for suppliers)
- ❌ Vehicle-specific tracking
- ❌ Maintenance scheduling
- ❌ Assignment history

### Task Details

| Task ID | Task | Status | Our Work | Notes |
|---------|------|--------|----------|-------|
| T-047 | Vehicle onboarding checklist | ❌ Not Started | - | Registration, insurance, photos, VIN |
| T-048 | Source-type-specific fields | ❌ Not Started | - | Different data per ownership type |
| T-049 | Supplier master for rented vehicles | ⚠️ Partial | `vendors` exists | Add rental-specific fields |
| T-050 | Owned fleet asset profile | ❌ Not Started | - | Purchase date, capex, expected life |
| T-051 | Rider-owned approval workflow | ❌ Not Started | - | Ownership proof, inspection |
| T-052 | Vehicle assignment history | ❌ Not Started | - | Track every assignment/return |
| T-053 | Vehicle handover checklist | ❌ Not Started | - | Condition, damages, odometer |
| T-054 | Preventive maintenance schedule | ❌ Not Started | - | Service intervals by km/time |
| T-055 | Maintenance routing rules | ❌ Not Started | - | Supplier vs workshop vs rider |
| T-056 | Downtime tracking | ❌ Not Started | - | Start/end, replacement needs |
| T-057 | Registration/insurance expiry tracker | ❌ Not Started | - | **Critical** - block non-compliant |
| T-058 | Return-to-supplier workflow | ❌ Not Started | - | Off-hire, condition check |
| T-059 | Owned fleet lifecycle planning | ❌ Not Started | - | Age, utilization, disposal triggers |
| T-060 | Spare pool logic | ❌ Not Started | - | Backup vehicle management |
| T-061 | Fleet dashboard metrics | ❌ Not Started | - | Utilization, downtime, aging |

---

## Module 5: Finance (15 Tasks)

### What We Have

- ✅ Invoices (basic)
- ✅ Platforms/Clients
- ✅ Vendors
- ❌ Payroll calculation
- ❌ Cost models
- ❌ Depreciation

### Task Details

| Task ID | Task | Status | Our Work | Notes |
|---------|------|--------|----------|-------|
| T-062 | Revenue models by aggregator | ❌ Not Started | - | Per order, hybrid, incentives |
| T-063 | Client/aggregator billing rules | ❌ Not Started | - | Who pays, at what rate |
| T-064 | Rented vehicle cost model | ❌ Not Started | - | Rent, deposit, insurance, repairs |
| T-065 | Owned vehicle cost model | ❌ Not Started | - | Depreciation, maintenance |
| T-066 | Rider-owned cost model | ❌ Not Started | - | Allowance, subsidy |
| T-067 | Payroll engine formulas | ❌ Not Started | - | Complex pay calculation |
| T-068 | Vehicle-related deductions/allowances | ❌ Not Started | - | Different per source type |
| T-069 | Supplier rental payable workflow | ❌ Not Started | - | Invoice intake, matching |
| T-070 | Depreciation schedule | ❌ Not Started | - | Monthly depreciation |
| T-071 | Invoicing workflow | ⚠️ Partial | `invoices` exists | Need billing output details |
| T-072 | Collections/dispute tracker | ❌ Not Started | - | Invoice aging, disputes |
| T-073 | Profit by vehicle source type | ❌ Not Started | - | **Critical** - owned vs rented vs rider-owned |
| T-074 | Profit by aggregator/client | ❌ Not Started | - | Margin by contract |
| T-075 | Month-end close checklist | ❌ Not Started | - | Reconciliation process |
| T-076 | Finance dashboard metrics | ❌ Not Started | - | Revenue, margin, cost/delivery |

---

## Module 6: Compliance (12 Tasks)

### What We Have

- ✅ Document storage
- ⚠️ Basic status tracking
- ❌ Expiry alerts
- ❌ Activation blocks
- ❌ Audit trails

### Task Details

| Task ID | Task | Status | Our Work | Notes |
|---------|------|--------|----------|-------|
| T-077 | Legal/compliance document matrix | ❌ Not Started | - | Required docs by country/client |
| T-078 | Rider activation block rules | ❌ Not Started | - | **Critical** - expired docs = blocked |
| T-079 | Vehicle activation block rules | ❌ Not Started | - | **Critical** - expired = blocked |
| T-080 | Rider-owned vehicle approval controls | ❌ Not Started | - | Ownership proof, inspection |
| T-081 | Rented vehicle supplier controls | ❌ Not Started | - | Valid contract, SLA |
| T-082 | Owned fleet audit requirements | ❌ Not Started | - | Asset tag, depreciation |
| T-083 | Accident evidence checklist | ❌ Not Started | - | Photos, police report, statement |
| T-084 | Liability/recovery approval flow | ❌ Not Started | - | Cost recovery decisions |
| T-085 | Audit log requirements | ❌ Not Started | - | Track sensitive field changes |
| T-086 | Exception approval workflow | ❌ Not Started | - | Temporary overrides |
| T-087 | Document archive/retention | ⚠️ Partial | Files stored | Need retention policy |
| T-088 | Compliance dashboard metrics | ❌ Not Started | - | Expired docs, blocked assets |

---

## Module 7: Integrations (10 Tasks)

### What We Have

- ❌ No external integrations yet
- ❌ No mobile app
- ❌ No GPS/telematics

### Task Details

| Task ID | Task | Status | Our Work | Notes |
|---------|------|--------|----------|-------|
| T-089 | Aggregator API requirements | ❌ Not Started | - | Talabat/Jahez/Keeta APIs |
| T-090 | External order ID mapping | ❌ Not Started | - | Unique reference tracking |
| T-091 | Earnings/incentive import | ❌ Not Started | - | Link to payroll/billing |
| T-092 | GPS/telematics integration | ❌ Not Started | - | Location, trip, distance |
| T-093 | Mobile app needs | ❌ Not Started | - | Rider and supervisor apps |
| T-094 | Accounting system integration | ❌ Not Started | - | AP, AR, journals |
| T-095 | E-sign/document storage | ⚠️ Partial | Supabase storage | Add e-sign? |
| T-096 | Alerting requirements | ❌ Not Started | - | Expiry, breakdown alerts |
| T-097 | Webhook retry/error handling | ❌ Not Started | - | Idempotent, monitored |
| T-098 | Integration monitoring | ❌ Not Started | - | Daily status checks |

---

## Module 8: BI & Reports (11 Tasks)

### What We Have

- ⚠️ Basic KPIs page (placeholder)
- ❌ No real dashboards
- ❌ No report exports

### Task Details

| Task ID | Task | Status | Our Work | Notes |
|---------|------|--------|----------|-------|
| T-099 | KPI dictionary | ❌ Not Started | - | Formulas, owners, frequency |
| T-100 | Source-type profitability KPIs | ❌ Not Started | - | **Critical** - profit per model |
| T-101 | CEO dashboard | ❌ Not Started | - | Executive summary view |
| T-102 | Weekly executive pack | ❌ Not Started | - | Performance summary |
| T-103 | Rider productivity report | ❌ Not Started | - | Orders/rider, shift hours |
| T-104 | Idle rider/vehicle analysis | ❌ Not Started | - | Underutilization |
| T-105 | Fleet aging/replacement report | ❌ Not Started | - | Owned fleet lifecycle |
| T-106 | Downtime/maintenance report | ❌ Not Started | - | Hours lost, causes |
| T-107 | Payroll exception report | ❌ Not Started | - | Outliers, zero-pay |
| T-108 | Billing reconciliation report | ❌ Not Started | - | Order count, disputes |
| T-109 | Compliance risk report | ❌ Not Started | - | Expiries, blocked assets |

---

## Questions & Clarifications Needed

### 🔴 Critical Questions

1. **Rider vs Employee**: Should we rename `employees` table to `riders`? Or keep employees and add a `rider_category` field?

2. **Asset vs Vehicle**: Should `assets` become `vehicles`? We currently support generic assets (phones, uniforms). Do they only need bikes?

3. **Aggregator API Access**: Do we have API documentation/credentials for Talabat, Jahez, Keeta? This is Phase 2 critical.

4. **GPS Provider**: What GPS/telematics provider will be used? Need to plan integration.

5. **Bahrain Labor Law**: Are there specific Bahraini employment/visa rules we need to encode?

### 🟡 Design Questions

6. **Task 36-1**: This was added manually (not T-###). Is this a partner addition? "Replace Vehicle of Rider"

7. **Payroll Complexity**: How complex is the pay calculation? Need formula details for:
   - Fixed salary vs per-order vs hybrid
   - Allowances (fuel, phone, bike)
   - Deductions (advances, damages, uniform)

8. **Multi-Client**: Do riders work for multiple clients simultaneously, or exclusive assignment?

### 🟢 Nice to Clarify

9. **Document Types**: What specific documents are required in Bahrain? (CPR, visa, license types)

10. **Currency**: Confirming BHD (Bahraini Dinar) throughout?

---

## Recommended Implementation Order

### Sprint 1: Foundation (2-3 weeks)
Focus: Data model changes

- [ ] Add `vehicle_source_type` enum to assets
- [ ] Add rider-specific fields to employees (license, visa, bank)
- [ ] Create `aggregators` table
- [ ] Create `rider_vehicle_assignments` table
- [ ] Add document expiry tracking

### Sprint 2: Core Operations (3-4 weeks)
Focus: Shifts + Orders + Attendance

- [ ] Create `attendance` table (GPS check-in/out)
- [ ] Create `orders` table (aggregator imports)
- [ ] Create `contracts` table (rates, terms)
- [ ] Build rider eligibility checks
- [ ] Manual order import (CSV)

### Sprint 3: Fleet Management (2-3 weeks)
Focus: Vehicle lifecycle

- [ ] Create `maintenance_events` table
- [ ] Vehicle assignment workflow
- [ ] Expiry blocking logic
- [ ] Handover checklists

### Sprint 4: Finance & Payroll (3-4 weeks)
Focus: Money flows

- [ ] Create `payroll` table and calculation engine
- [ ] Cost models per source type
- [ ] Billing workflow improvements
- [ ] Depreciation tracking (owned)

### Sprint 5: Compliance & Reporting (2-3 weeks)
Focus: Controls + Visibility

- [ ] Audit trail implementation
- [ ] Compliance dashboard
- [ ] KPI dashboards
- [ ] Executive reports

### Sprint 6: Integrations (4+ weeks)
Focus: External systems

- [ ] Aggregator API integration (when available)
- [ ] GPS/telematics integration
- [ ] Mobile app (if needed)
- [ ] Alerting system

---

## Progress Tracking

| Date | Action | Tasks Affected |
|------|--------|----------------|
| 2026-04-18 | Received checklist from partner | All |
| 2026-04-18 | Created internal tracker | - |
| - | - | - |

---

*Last updated: 2026-04-18*
