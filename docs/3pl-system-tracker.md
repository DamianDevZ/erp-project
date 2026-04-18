# 3PL Mixed-Fleet System Implementation Tracker

> Internal tracking document mapping partner requirements to our ERP build.  
> Source: `3PL_Mixed_Fleet_System_Task_Checklist.xlsx` (received April 18, 2026)

---

## Quick Stats

| Metric | Count |
|--------|-------|
| Total Tasks | 110 (109 + 36-1) |
| ✅ Done | 17 |
| ⚠️ Partial | 1 |
| 🔧 Ready to Build | ~79 |
| 🔌 Needs Integration | 10 |
| ❓ Needs Info | 10 |

### Progress

- **Module 1: Data Model** - 17/18 complete ✅
- **Module 2: HR** - 2/14 complete
- **Module 3: Operations** - 2/15 complete
- **Module 4: Fleet** - 1/15 complete
- **Module 5: Finance** - 1/15 complete
- **Module 6: Compliance** - 1/12 complete
- **Module 7: Integrations** - 1/10 complete
- **Module 8: BI & Reports** - 0/11 complete

### Status Key

- ✅ **Done** - Built and ready
- ⚠️ **Partial** - Exists but needs additions
- 🔧 **Can Build** - Ready to implement
- 🔌 **Needs Integration** - Requires external API/system
- ❓ **Needs Info** - Missing details from partner
- ⏳ **Not Started** - Clear requirements, not yet built

---

## Terminology Mapping

| Partner Term | Our Current Term | Notes |
|--------------|------------------|-------|
| Riders | Employees | Keep as employees, add rider-specific fields |
| Vehicles | Assets | Add vehicle-specific fields, keep generic asset support |
| Aggregators | Platforms | Same as Clients - use platforms table |
| Clients | Platforms | Good match |
| Orders | Orders | New table created |
| Attendance | Attendance | New table created |
| Contracts | Contracts | New table created |
| Payroll | N/A | New table - pay calculation (next sprint) |
| Maintenance_Events | Maintenance_Events | New table created |

### Vehicle Source Types

Three ownership models - maps to existing `assets.ownership` enum:
- `company_owned` → OWNED_BY_COMPANY
- `rental` → RENTED_BY_COMPANY  
- `employee_owned` → RIDER_OWNED

---

## Module 1: Data Model (18 Tasks)

| ID | Task | Priority | Status | Notes |
|----|------|----------|--------|-------|
| T-001 | Define master ID strategy and audit fields | Critical | ✅ Done | Added deleted_at for soft delete (migration 001) |
| T-002 | Create Riders entity with profile fields | Critical | ✅ Done | Added license, visa, rider_category fields (migration 001) |
| T-003 | Create Vehicles entity with mixed-fleet attributes | Critical | ✅ Done | Added registration, insurance, vehicle_status (migration 002) |
| T-004 | Add vehicle_source_type enumeration | Critical | ✅ Done | Using existing `ownership` enum (company_owned, rental, employee_owned) |
| T-005 | Create Vehicle_Source_Details entity | Critical | ✅ Done | Added purchase_date, purchase_price, expected_life to assets (migration 002) |
| T-006 | Create Rider_Vehicle_Assignments history table | Critical | ✅ Done | Created rider_vehicle_assignments with handover tracking (migration 003) |
| T-007 | Create Clients entity | High | ✅ Done | `platforms` table works for this |
| T-008 | Create Aggregators entity | Critical | ✅ Done | Using platforms table with new integration fields (migration 004) |
| T-009 | Create Contracts entity | Critical | ✅ Done | Created contracts table with billing models (migration 005) |
| T-010 | Create Shifts entity | High | ✅ Done | `shifts` table exists |
| T-011 | Create Attendance entity | Critical | ✅ Done | Created attendance with GPS check-in/out (migration 006) |
| T-012 | Create Orders entity | Critical | ✅ Done | Created orders table for aggregator imports (migration 007) |
| T-013 | Create Maintenance_Events entity | Critical | ✅ Done | Created maintenance_events with cost tracking (migration 008) |
| T-014 | Create Payroll entity | Critical | ✅ Done | Created payroll table with earnings/deductions (migration 010) |
| T-015 | Create Finance_Ledger / cost allocation | High | ✅ Done | Created finance_ledger for cost tracking (migration 011) |
| T-016 | Create Incidents/accidents entity | High | ✅ Done | Created incidents table (migration 009) |
| T-017 | Define master status enums | High | ✅ Done | Added vehicle_status, compliance_status, attendance_status, order_status |
| T-018 | Design user roles and permission matrix | High | ⚠️ Partial | Have role field. Need granular permissions per module |

---

## Module 2: HR (14 Tasks)

| ID | Task | Priority | Status | Notes |
|----|------|----------|--------|-------|
| T-019 | Define rider onboarding workflow | Critical | 🔧 Can Build | Multi-step: application → document upload → review → approval → activation |
| T-020 | Create rider category rules by transport model | Critical | 🔧 Can Build | company_bike_rider vs rider_owned_rider categories affect pay/deductions |
| T-021 | Build document collection checklist | High | ⚠️ Partial | `employee_documents` exists. Add: required_documents config, completion tracking |
| T-022 | Prepare employment/service contract templates | High | ❓ Needs Info | Need actual contract templates/clauses from partner |
| T-023 | Capture deposit/deduction agreements | High | 🔧 Can Build | deposit_amount, deduction_type, recovery_schedule per employee |
| T-024 | Track visa and license expiry alerts | Critical | 🔧 Can Build | Add expiry fields + cron job for alerts. Block if expired |
| T-025 | Define pay components and earning rules | Critical | ❓ Needs Info | Need actual formulas: fixed vs per-order vs km-based rates |
| T-026 | Define own-bike allowance policy | High | ❓ Needs Info | What's the allowance amount? When paid? |
| T-027 | Define company-bike deduction policy | High | ❓ Needs Info | Daily vs monthly deduction amount? |
| T-028 | Design attendance approval flow | High | 🔧 Can Build | missed_checkin handling, manual_override, supervisor_approval |
| T-029 | Create disciplinary process for vehicle misuse | Medium | ⚠️ Partial | `performance_discipline` exists. Add vehicle-linked triggers |
| T-030 | Create offboarding checklist | High | 🔧 Can Build | final_pay_calculated, assets_returned, accounts_disabled, documents_archived |
| T-031 | Design leave/absence handling | Medium | ✅ Done | `leaves` table exists with roster impact |
| T-032 | Define HR dashboard metrics | Medium | 🔧 Can Build | headcount, active_riders, expired_docs_count, monthly_churn, payroll_exceptions |

---

## Module 3: Operations (15 Tasks)

| ID | Task | Priority | Status | Notes |
|----|------|----------|--------|-------|
| T-033 | Build shift planning and roster structure | Critical | ⚠️ Partial | `shifts` exists. Add: client_id, aggregator_id assignment |
| T-034 | Create rider eligibility check before shift activation | Critical | 🔧 Can Build | Check: docs valid, vehicle assigned, no blocks |
| T-035 | Design rider allocation rules by aggregator | Critical | 🔧 Can Build | Which riders can work for which aggregators |
| T-036 | Build rider + vehicle pairing workflow | High | 🔧 Can Build | Match available compliant vehicle to rider for shift |
| T-036-1 | Replace vehicle of rider | High | 🔧 Can Build | Temp or perm replacement when vehicle has issues |
| T-037 | Design live operations control tower view | High | 🔧 Can Build | Real-time: online riders, active orders, issues, idle riders |
| T-038 | Create breakdown escalation workflow | Critical | 🔧 Can Build | Different escalation paths per vehicle source type |
| T-039 | Connect attendance to operations roster | High | 🔧 Can Build | Show no-shows, late arrivals in ops view |
| T-040 | Create manual order import fallback | Medium | 🔧 Can Build | CSV upload when API unavailable |
| T-041 | Define order reconciliation process | Critical | 🔧 Can Build | Compare our orders vs aggregator data, flag mismatches |
| T-042 | Build exception queue for mismatched orders | High | 🔧 Can Build | Orders where rider/vehicle mapping fails |
| T-043 | Define accident/incident operating procedure | High | 🔧 Can Build | Escalation rules, required evidence, approval flow |
| T-044 | Define spare vehicle dispatch logic | High | 🔧 Can Build | Spare pool rules, who's eligible for replacement |
| T-045 | Create rider-owned breakdown support policy | Medium | ❓ Needs Info | When does company help vs rider responsible? |
| T-046 | Define operations dashboard metrics | Medium | 🔧 Can Build | orders_per_rider, late_deliveries, attendance_rate, downtime |

---

## Module 4: Fleet (15 Tasks)

| ID | Task | Priority | Status | Notes |
|----|------|----------|--------|-------|
| T-047 | Define vehicle onboarding checklist | Critical | 🔧 Can Build | registration, insurance, photos, VIN, readiness_check |
| T-048 | Create source-type-specific field requirements | Critical | 🔧 Can Build | Different required fields per OWNED/RENTED/RIDER_OWNED |
| T-049 | Design supplier master for rented vehicles | High | ⚠️ Partial | `vendors` exists. Add: rental_rate, replacement_terms, sla_days |
| T-050 | Design owned fleet asset profile | High | 🔧 Can Build | purchase_date, purchase_price, expected_life_years, disposal_method |
| T-051 | Design rider-owned approval workflow | Critical | 🔧 Can Build | ownership_proof, inspection_date, insurance_verified, registration_verified |
| T-052 | Implement vehicle assignment history and return flow | Critical | 🔧 Can Build | Track every assignment, off-hire, replacement, return |
| T-053 | Create vehicle handover checklist | High | 🔧 Can Build | condition_notes, accessories, damages, odometer, rider_signature |
| T-054 | Define preventive maintenance schedule | High | 🔧 Can Build | service_interval_km, service_interval_days, next_service_due |
| T-055 | Define maintenance routing rules by source type | Critical | 🔧 Can Build | OWNED→workshop, RENTED→supplier, RIDER_OWNED→rider |
| T-056 | Capture downtime start/end and replacement requirement | High | 🔧 Can Build | downtime_start, downtime_end, replacement_needed, replacement_vehicle_id |
| T-057 | Create registration/insurance/inspection expiry tracker | Critical | 🔧 Can Build | Block vehicle if any expired |
| T-058 | Create return-to-supplier workflow for rented vehicles | Medium | 🔧 Can Build | off_hire_date, condition_check, penalties, closure_status |
| T-059 | Define owned fleet lifecycle and replacement planning | High | 🔧 Can Build | age_years, total_km, utilization_rate, replacement_triggered |
| T-060 | Create spare pool / standby fleet logic | Medium | 🔧 Can Build | is_spare, available_for_dispatch, priority_order |
| T-061 | Define fleet dashboard metrics | Medium | 🔧 Can Build | utilization_rate, downtime_hours, avg_age, maintenance_due, off_road_count |

---

## Module 5: Finance (15 Tasks)

| ID | Task | Priority | Status | Notes |
|----|------|----------|--------|-------|
| T-062 | Map revenue models by aggregator and contract | Critical | ❓ Needs Info | Need actual rate structures: per-order, hybrid, incentive rules |
| T-063 | Design client/aggregator billing rules | Critical | 🔧 Can Build | who_pays, rate, reconciliation_method |
| T-064 | Build rented vehicle monthly cost model | Critical | 🔧 Can Build | rent + deposit + insurance_share + repairs + downtime_cost |
| T-065 | Build owned vehicle monthly cost model | Critical | 🔧 Can Build | depreciation + insurance + registration + maintenance + downtime |
| T-066 | Build rider-owned company cost model | High | 🔧 Can Build | allowance + subsidy + compliance_admin_cost |
| T-067 | Design payroll engine formula library | Critical | ❓ Needs Info | Need actual formulas for each pay component |
| T-068 | Map vehicle-related deductions and allowances | Critical | ❓ Needs Info | Different treatment per source type - need specifics |
| T-069 | Build supplier rental payable workflow | High | 🔧 Can Build | invoice_received, matched_to_contract, approved, payment_scheduled |
| T-070 | Build depreciation schedule for owned fleet | High | 🔧 Can Build | straight_line or reducing_balance, monthly_depreciation |
| T-071 | Build invoicing workflow | High | ⚠️ Partial | `invoices` exists. Add: period detail, aggregator breakdown |
| T-072 | Build collections and dispute tracker | Medium | 🔧 Can Build | invoice_id, aging_days, dispute_reason, resolution_status |
| T-073 | Define profit by vehicle source type report | Critical | 🔧 Can Build | Revenue - costs grouped by OWNED/RENTED/RIDER_OWNED |
| T-074 | Define profit by aggregator and client report | High | 🔧 Can Build | Gross margin by contract |
| T-075 | Design month-end close checklist | Medium | 🔧 Can Build | orders_reconciled, payroll_finalized, fleet_costs_posted, ap_ar_matched |
| T-076 | Define finance dashboard metrics | Medium | 🔧 Can Build | revenue, gross_margin, cost_per_delivery, payables, receivables |

---

## Module 6: Compliance (12 Tasks)

| ID | Task | Priority | Status | Notes |
|----|------|----------|--------|-------|
| T-077 | Create legal/compliance document matrix | Critical | ❓ Needs Info | Need list of required docs by Bahrain law / aggregator requirements |
| T-078 | Create rider activation block rules | Critical | 🔧 Can Build | Block if: visa_expired OR license_expired OR bank_invalid OR contract_missing |
| T-079 | Create vehicle activation block rules | Critical | 🔧 Can Build | Block if: registration_expired OR insurance_expired OR inspection_failed |
| T-080 | Define rider-owned vehicle approval controls | Critical | 🔧 Can Build | ownership_verified, inspection_passed, insurance_valid, registration_valid |
| T-081 | Define rented vehicle supplier control requirements | High | 🔧 Can Build | contract_valid, liability_terms_accepted, sla_defined |
| T-082 | Define owned fleet audit requirements | Medium | 🔧 Can Build | asset_tagged, depreciation_setup, maintenance_plan_exists |
| T-083 | Create accident evidence checklist | High | 🔧 Can Build | photos_uploaded, police_report, rider_statement, vehicle_status, recovery_decision |
| T-084 | Create liability and recovery approval flow | High | 🔧 Can Build | cost_threshold for finance_approval, recovery_from options |
| T-085 | Define audit log requirements | High | 🔧 Can Build | Log changes to: status, rates, assignments, payroll fields |
| T-086 | Define exception approval workflow | High | 🔧 Can Build | grace_period_requests, urgent_shift_overrides, replacement_approvals |
| T-087 | Define document archive and retention policy | Medium | ⚠️ Partial | Files stored in Supabase. Add: retention_years, archive_rules |
| T-088 | Define compliance dashboard metrics | Medium | 🔧 Can Build | expired_docs, blocked_riders, blocked_vehicles, open_incidents |

---

## Module 7: Integrations (10 Tasks)

| ID | Task | Priority | Status | Notes |
|----|------|----------|--------|-------|
| T-089 | Gather API requirements for Talabat/Jahez/Keeta | Critical | 🔌 Needs Integration | Need API docs and credentials from aggregators |
| T-090 | Design external order ID mapping strategy | Critical | 🔧 Can Build | external_order_id unique per aggregator, import_batch tracking |
| T-091 | Design earnings/incentive import mapping | High | 🔌 Needs Integration | Depends on aggregator API data format |
| T-092 | Define GPS/telematics integration requirements | High | 🔌 Needs Integration | Need to know which GPS provider |
| T-093 | Define mobile app needs for rider and supervisor | High | 🔌 Needs Integration | Attendance, issues, assignments, earnings - future mobile app |
| T-094 | Define accounting system integration scope | Medium | 🔌 Needs Integration | AP, AR, journals - need to know target accounting system |
| T-095 | Define e-sign/document storage integration | Medium | ⚠️ Partial | Supabase storage works. E-sign needs third-party (DocuSign?) |
| T-096 | Create alerting requirements | High | 🔧 Can Build | Email/SMS for: expiry_alerts, breakdown_alerts, blocked_activation |
| T-097 | Design webhook retry and error handling | High | 🔧 Can Build | Idempotent imports, retry_count, error_log |
| T-098 | Create integration monitoring checklist | Medium | 🔧 Can Build | daily_sync_status, failure_count, latency_ms, reconciliation_gaps |

---

## Module 8: BI & Reports (11 Tasks)

| ID | Task | Priority | Status | Notes |
|----|------|----------|--------|-------|
| T-099 | Create KPI dictionary | High | 🔧 Can Build | Define formula, owner, grain (daily/weekly/monthly), refresh_frequency |
| T-100 | Define source-type profitability KPIs | Critical | 🔧 Can Build | profit_per_owned_vehicle, profit_per_rented, profit_per_rider_owned |
| T-101 | Design CEO dashboard | Medium | 🔧 Can Build | revenue, gross_margin, active_riders, source_type_mix, risk_counts |
| T-102 | Design weekly executive pack | Low | 🔧 Can Build | PDF/email summary for leadership |
| T-103 | Define rider productivity report | Medium | 🔧 Can Build | orders_per_rider, shift_hours, acceptance_rate, downtime_impact |
| T-104 | Define idle rider/vehicle analysis | Medium | 🔧 Can Build | underutilized resources, pairing opportunities |
| T-105 | Define fleet aging and replacement report | Medium | 🔧 Can Build | age_distribution, disposal_candidates (owned only) |
| T-106 | Define downtime and maintenance report | Medium | 🔧 Can Build | events_count, hours_lost, cause_breakdown, replacement_demand |
| T-107 | Define payroll exception report | High | 🔧 Can Build | outliers, zero_pay_cases, negative_pay_cases |
| T-108 | Define billing reconciliation report | High | 🔧 Can Build | order_count_match, revenue_match, disputes, invoice_support |
| T-109 | Define compliance risk report | Medium | 🔧 Can Build | upcoming_expiries, blocked_assets, blocked_riders, unresolved_incidents |

---

## Items Needing Partner Information

These tasks need specific details before we can implement:

| Task | What We Need |
|------|--------------|
| T-022 | Actual employment/service contract templates |
| T-025 | Pay component formulas (fixed, per-order, km rates) |
| T-026 | Own-bike allowance amount and payment schedule |
| T-027 | Company-bike deduction amounts (daily/monthly) |
| T-045 | Rider-owned breakdown support policy details |
| T-062 | Revenue rate structures from each aggregator |
| T-067 | Complete payroll calculation formulas |
| T-068 | Vehicle-related deduction/allowance specifics |
| T-077 | Bahrain legal document requirements list |

## Items Needing External Integration

These require third-party API access or integrations:

| Task | Integration Needed |
|------|-------------------|
| T-089, T-091 | Talabat, Jahez, Keeta API documentation and credentials |
| T-092 | GPS/telematics provider selection and API |
| T-093 | Mobile app development (React Native / Flutter) |
| T-094 | Accounting system (QuickBooks? Xero? Custom?) |
| T-095 | E-signature provider (DocuSign? HelloSign?) |

---

## Implementation Progress

### Sprint 1: Data Model Foundation
_Target: Add new fields and tables_

| Task | Status | Date |
|------|--------|------|
| T-001 | ✅ | Existing |
| T-002 | ⏳ | |
| T-003 | ⏳ | |
| T-004 | ⏳ | |
| ... | | |

### Sprint 2: Core Workflows
_Target: Attendance, Orders, Eligibility_

| Task | Status | Date |
|------|--------|------|
| ... | | |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-04-18 | Initial tracker created from partner checklist |
| | |
