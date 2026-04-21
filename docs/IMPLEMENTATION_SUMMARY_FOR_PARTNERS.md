# 3PL System — Implementation Summary for Partners

**Date:** April 21, 2026

This document summarizes what has been built, what is partially built, and what we still need from you to complete the system.

---

## Module 1: Data Model — Foundation

| # | What It Is | Status | Plain English |
|---|-----------|--------|---------------|
| T-001 | ID strategy & audit trail | Done | Every record has a unique ID, creation date, and soft-delete (nothing is permanently deleted). |
| T-002 | Rider profile fields | Done | Riders have: license number & expiry, visa number & expiry, bank account, rating, and category (company-bike rider vs. rider-owned rider). |
| T-003 | Vehicle fields | Done | Vehicles have: registration number & expiry, insurance policy & expiry, vehicle type, mileage, and status (available / assigned / maintenance / retired). |
| T-004 | Vehicle ownership types | Done | Three ownership types defined: Company-Owned, Rented from Supplier, Rider-Owned. Each has different rules for maintenance, cost, and deductions. |
| T-005 | Vehicle source details | Done | Company vehicles store purchase price, purchase date, and expected lifespan. Rented vehicles store supplier, monthly rent, and contract dates. Rider-owned vehicles store ownership proof and inspection date. |
| T-006 | Vehicle assignment history | Done | Every time a rider is given a vehicle we log: handover date, return date, odometer readings, vehicle condition, accessories, and rider signature. Full history kept forever. |
| T-007 | Clients (aggregators as clients) | Done | Talabat, Jahez, Keeta — each set up as a client. Every order, shift, and invoice is tagged to a client. |
| T-008 | Aggregator settings | Done | Each aggregator has: API connection status, commission %, and minimum order value configurable. |
| T-009 | Contracts | Done | Contracts table links a client, a rider, or a rented vehicle to: rates, start/end dates, deposit, payment frequency, and a signed document upload. |
| T-010 | Shifts | Done | Shifts are linked to a client, have a vehicle-assigned flag, and track which riders attended. |
| T-011 | Attendance | Done | Attendance records store check-in/check-out times, GPS location at check-in, hours worked, and whether it was a manual entry by a supervisor. |
| T-012 | Orders | Done | Each order stores: external order ID from aggregator, which rider delivered, which vehicle was used, base payout, incentive, tip, commission, and reconciliation status. |
| T-013 | Maintenance events | Done | Maintenance logs: scheduled vs. actual dates, downtime hours, cost (estimated vs. actual), and which vendor did the work. |
| T-014 | Payroll | Done | Payroll records store: order count, base earnings, incentive earnings, bike allowance, company-bike deduction, deposit recovery, total deductions, and net pay per period. |
| T-015 | Finance ledger | Done | Every money movement (revenue, payroll, maintenance, rental, depreciation) is logged to a central ledger with tags for client, vehicle, and rider so we can calculate profit by any slice. |
| T-016 | Incidents | Done | Incidents (accidents, damage, theft) store: severity, description, police report, who is liable, cost, and an approval chain for recovery decisions. |
| T-017 | Status enums | Done | All system statuses are standardized: vehicle status, order status, payroll status, attendance status, incident severity — no free-text, consistent across the whole system. |
| T-018 | User roles & permissions | Partial | Roles exist (super admin, admin, manager, supervisor, rider). Basic access control in place. Granular per-module permissions not yet built. |

---

## Module 2: HR

| # | What It Is | Status | Plain English |
|---|-----------|--------|---------------|
| T-019 | Rider onboarding workflow | Done | Multi-step onboarding: personal info → document uploads (license, visa, insurance) → manager review → approval → activation. Rider cannot work until fully activated. |
| T-020 | Rider category rules | Done | System knows the difference between a "company-bike rider" and a "rider-owned rider" — different pay rates, deductions, and allowances apply automatically based on category. |
| T-021 | Document checklist | Partial | Required documents tracked (license, visa, insurance, contract, bank). Uploads and expiry tracking work. Automatic archival after retention period not yet built. |
| T-022 | Employment contract templates | Need from you | We need your actual contract templates. We have the upload and signing infrastructure ready, but we don't have your legal clauses. |
| T-023 | Deposits & deductions | Done | Deductions can be set up per rider: type (bike usage, equipment loss, etc.), amount, frequency (daily / weekly / monthly), and recovery schedule. Rider acknowledges the deduction in the system. |
| T-024 | Visa & license expiry alerts | Done | System automatically flags expired documents. HR gets an alert when expiry is within 7 days. Riders with expired documents are automatically blocked from shifts. |
| T-025 | Pay component formulas | Need from you | We need your actual pay rates. The payroll calculation engine is built, but the formula (per-order rate, per-km rate, incentive threshold) has to come from you. |
| T-026 | Rider-owned bike allowance | Need from you | We need the monthly allowance amount for riders who use their own vehicle. Infrastructure is ready to apply it. |
| T-027 | Company-bike deduction | Need from you | We need the deduction amount and frequency (e.g., 5 AED/day or 100 AED/month) for riders using company bikes. |
| T-028 | Attendance approval flow | Done | If GPS check-in fails or a rider's attendance is disputed, the supervisor has an approval queue to manually confirm attendance. Full trail of who approved and why. |
| T-029 | Discipline for vehicle misuse | Partial | Discipline records exist (warnings, suspensions, vehicle-linked violations). Automatic trigger when an accident is reported is not yet wired up. |
| T-030 | Offboarding checklist | Done | When a rider leaves: final payroll calculated → vehicle returned → system access disabled → documents archived. Each step tracked with completion status. |
| T-031 | Leave & absence handling | Done | Leave requests, approval workflow, and leave calendar exist. Leave status blocks shift assignment while on leave. |
| T-032 | HR dashboard | Done | HR dashboard shows: total riders, active riders, expired documents count, onboarding pipeline, churn rate — all filterable by client. |

---

## Module 3: Operations

| # | What It Is | Status | Plain English |
|---|-----------|--------|---------------|
| T-033 | Shift planning & roster | Partial | Shifts linked to clients, rider assignment, and vehicle assignment. Missing: aggregator-specific shift context, recurring shift templates, capacity planning. |
| T-034 | Rider eligibility check | Done | Before a rider can be assigned to a shift, system automatically checks: license valid, visa valid, bank account set, no active suspension, vehicle assigned and available, no open incidents. If any check fails, rider is blocked. |
| T-035 | Rider-to-aggregator allocation rules | Done | Each rider can be set as: exclusive to one aggregator, preferred for an aggregator, or generally available. These rules control which orders a rider can accept. |
| T-036 | Rider + vehicle pairing | Done | Before each shift, operations pairs a rider with a vehicle. System shows available eligible riders and eligible vehicles. Handover form required: condition, odometer, accessories, signature. |
| T-036-1 | Swap vehicle mid-shift | Done | If a vehicle has issues during a shift, operations can swap it. Old vehicle is returned, new vehicle is assigned with its own handover checklist. Full history maintained. |
| T-037 | Operations control tower | Done | Live dashboard showing: riders currently online, active orders, issues (breakdowns, incidents), and idle riders. Quick action buttons for common tasks. |
| T-038 | Breakdown escalation workflow | Done | When a vehicle breaks down, the escalation path is different per ownership type: company vehicle goes to internal workshop, rented vehicle notifies the supplier, rider-owned vehicle notifies the rider directly. |
| T-039 | Attendance linked to roster | Done | Operations can see in real time which expected riders have checked in and which are no-shows. No-show slots are flagged, affecting order fulfillment estimates. |
| T-040 | Manual order import | Done | If the aggregator API is unavailable, orders can be uploaded via CSV file or entered manually one by one. An import report shows successes and errors. |
| T-041 | Order reconciliation | Done | System compares our internal order records against aggregator exports. It flags: orders we have that aggregator doesn't, orders aggregator has that we don't, and revenue differences. |
| T-042 | Order exception queue | Done | Mismatched orders go into a queue with the reason (missing order, rider mismatch, revenue mismatch). Operations team resolves them one by one with quick action buttons. |
| T-043 | Accident/incident procedure | Done | Step-by-step guidance when an incident is reported: take photos, file police report, collect rider statement. Escalation automatically routes to supervisor, manager, or finance head based on cost. |
| T-044 | Spare vehicle dispatch | Done | A spare pool of vehicles is maintained. When a breakdown occurs, the system selects the best eligible spare (available, same type, valid insurance/registration) and dispatches it with a handover form. |
| T-045 | Rider-owned breakdown support | Need from you | We need your policy. If a rider's personal bike breaks down — does your company help pay for repairs? Is there a cost limit? Do you provide a loaner vehicle? |
| T-046 | Operations dashboard metrics | Done | Live metrics: orders per rider, late deliveries, attendance rate, downtime hours — all per selected client. |

---

## Module 4: Fleet

| # | What It Is | Status | Plain English |
|---|-----------|--------|---------------|
| T-047 | Vehicle onboarding checklist | Done | Adding a new vehicle requires: registration details, insurance details, photos, inspection report. System validates required fields before vehicle goes active. |
| T-048 | Different fields per ownership type | Done | Forms automatically change based on ownership: company vehicles ask for purchase price and lifespan, rented vehicles ask for supplier and contract dates, rider-owned vehicles ask for ownership proof and inspection. |
| T-049 | Supplier/vendor master | Partial | Supplier records exist with rental rate and SLA days. Missing: supplier performance tracking and automated billing from supplier. |
| T-050 | Owned fleet asset profile | Done | Company vehicles track purchase date, purchase price, expected lifespan, book value, and monthly depreciation amount. |
| T-051 | Rider-owned vehicle approval | Done | Before a rider can use their personal vehicle, it must pass an approval workflow: ownership document verified, physical inspection done, insurance and registration confirmed, manager approved. |
| T-052 | Assignment history & return flow | Done | Every vehicle keeps a full log of who had it, when, in what condition, with what odometer reading. Return flow records condition at return and flags any damage compared to assignment condition. |
| T-053 | Vehicle handover checklist | Done | Both assignment and return require: condition notes, accessories inventory, odometer reading, fuel level, photos, and a digital signature or acknowledgement from the rider. |
| T-054 | Preventive maintenance schedule | Done | System tracks service intervals (every 5,000 km or 3 months) and alerts when a vehicle is due for service. Fleet dashboard shows "maintenance due soon" vehicles. |
| T-055 | Maintenance routing by vehicle type | Done | Company vehicles go to internal workshop. Rented vehicles automatically notify the supplier. Rider-owned vehicles notify the rider. Cost is allocated accordingly. |
| T-056 | Downtime tracking | Done | When a vehicle goes into maintenance, downtime start and end are logged. Downtime hours flow into fleet reports and affect operations capacity calculations. |
| T-057 | Registration & insurance expiry tracker | Done | Vehicles with expired registration or insurance are automatically blocked from assignment. Expiry alerts sent 7 days before expiry. |
| T-058 | Rental return workflow | Done | When a rental contract is approaching its end, system alerts operations. Return checklist: final inspection, damage record, odometer confirmation, supplier acknowledgement. |
| T-059 | Fleet lifecycle & replacement planning | Done | System flags owned vehicles that are overage (older than expected life or past expected km). Disposal options available: scrap, sell, donate. |
| T-060 | Spare pool management | Done | Fleet maintains a designated spare pool. Spare vehicles must be available, inspected, and eligible before dispatch to a breakdown. |
| T-061 | Fleet dashboard metrics | Done | Fleet dashboard shows: fleet utilization %, downtime hours, average vehicle age, maintenance due count, off-road vehicle count. |

---

## Module 5: Finance

| # | What It Is | Status | Plain English |
|---|-----------|--------|---------------|
| T-062 | Revenue models per aggregator | Need from you | We need your rate cards. What Talabat, Jahez, and Keeta each pay per order or per km. The system is ready to store and apply these rates. |
| T-063 | Client & aggregator billing rules | Done | Contract-based billing rules set who pays, at what rate, and how reconciliation happens per client. |
| T-064 | Rented vehicle monthly cost | Done | Monthly cost for each rented vehicle is calculated: rent + insurance share + average repairs + downtime impact. Cost per km shown on vehicle detail. |
| T-065 | Owned vehicle monthly cost | Done | Monthly cost for owned vehicles: depreciation + insurance (prorated) + average maintenance. Book value updated monthly. |
| T-066 | Rider-owned cost model | Done | When rider-owned riders are in payroll, the company cost is calculated: monthly allowance + insurance subsidy if applicable. |
| T-067 | Payroll formula library | Need from you | We need the exact pay calculation formulas. The payroll engine is built and ready — we just need: per-order rate, incentive thresholds, how absences are handled. |
| T-068 | Vehicle deductions & allowances | Need from you | We need the actual amounts. Company-bike deduction per day or month? Rider-owned bike allowance per month? Any special conditions? |
| T-069 | Supplier rental payable workflow | Done | When a supplier sends a rental invoice, it goes through: import → match to contract → approval → payment scheduling. |
| T-070 | Depreciation schedule | Done | Straight-line depreciation calculated monthly from purchase price and expected lifespan. Posted automatically to the finance ledger. |
| T-071 | Invoicing workflow | Partial | Invoice generation exists. Missing: daily/line-item detail in the invoice PDF, aggregator breakdown per invoice, automatic monthly generation. |
| T-072 | Collections & dispute tracker | Done | Aged receivables dashboard (0–30, 30–60, 60–90, 90+ days). Disputed invoices tracked with reason and resolution timeline. |
| T-073 | Profit by vehicle type | Done | Profitability report splits results by Company-Owned, Rented, and Rider-Owned — showing revenue minus all allocated costs for each group. |
| T-074 | Profit by aggregator/client | Done | Gross margin report per aggregator/client. Revenue vs. all costs (payroll, vehicle, admin) filtered by client. |
| T-075 | Month-end close checklist | Done | Finance manager checklist to confirm: orders reconciled, payroll finalized, fleet costs posted, AP/AR balanced before closing the month. |
| T-076 | Finance dashboard | Done | Finance dashboard shows: total revenue, gross margin %, cost per delivery, total payables, total receivables — per selected client. |

---

## Module 6: Compliance

| # | What It Is | Status | Plain English |
|---|-----------|--------|---------------|
| T-077 | Legal document requirements | Need from you | We need the list of documents required by Bahrain law and by each aggregator. Once we have the list, the system will enforce it during onboarding. |
| T-078 | Rider activation blocks | Done | A rider cannot be assigned to any shift if: license expired, visa expired, bank account missing, contract missing, or account suspended. |
| T-079 | Vehicle activation blocks | Done | A vehicle cannot be assigned to any shift if: registration expired, insurance expired, or inspection failed. |
| T-080 | Rider-owned vehicle approval controls | Done | Rider-owned vehicles must be fully approved before they can be used. Approval checklist: ownership verified, inspection passed, insurance valid, registration valid, manager sign-off. |
| T-081 | Rental vehicle compliance controls | Done | Before a rented vehicle goes active: supplier contract must be valid, SLA must be defined, liability terms accepted. |
| T-082 | Owned fleet audit | Done | When adding a company vehicle: asset must be tagged, depreciation schedule set up, maintenance plan created. All changes are logged. |
| T-083 | Accident evidence checklist | Done | When an accident is reported: mandatory photos (scene, damage, vehicle), optional police report, rider statement required, vehicle status update required. Cannot close incident without evidence. |
| T-084 | Liability & recovery approval | Done | Cost determines who approves: under 500 AED = supervisor, 500–2000 AED = manager, over 2000 AED = finance head. Recovery can be: charge rider, claim insurance, third-party recovery, or write off. |
| T-085 | Audit log | Done | All changes to critical fields are logged with timestamp and who made the change: status changes, rate changes, assignment changes, payroll field changes. |
| T-086 | Exception approval workflow | Done | If an emergency requires overriding a block (e.g., assigning an ineligible rider for an urgent shift), a supervisor can submit an exception with a reason. Manager approves or rejects. All tracked. |
| T-087 | Document archive & retention | Partial | Files stored in secure cloud storage. Retention period configurable per document type. Automatic archival job (move to archive after retention period) not yet built. |
| T-088 | Compliance dashboard | Done | Compliance dashboard shows: expired documents by type, blocked riders, blocked vehicles, open unresolved incidents. Expiring-soon items highlighted in yellow. |

---

## Module 7: Integrations

| # | What It Is | Status | Plain English |
|---|-----------|--------|---------------|
| T-089 | Aggregator API connection | Need API access | We need API credentials and documentation from Talabat, Jahez, and Keeta. Once connected, orders will import automatically instead of requiring CSV uploads. |
| T-090 | External order ID mapping | Done | System stores the aggregator's own order ID alongside our internal ID. Prevents duplicate imports. Orders searchable by external ID. |
| T-091 | Earnings & incentive import | Need API access | Depends on what each aggregator's API provides. Once we get the API format, we will map their incentive fields to our payroll calculation. |
| T-092 | GPS / telematics | Need provider choice | We need you to choose a GPS provider. Once selected, we can build rider location tracking and attendance validation by GPS. |
| T-093 | Mobile app (rider & supervisor) | Future phase | Mobile app for riders to check in, accept orders, and report issues. Planned for a future sprint. |
| T-094 | Accounting system integration | Need provider choice | We need to know which accounting system you use (QuickBooks, Xero, custom). Once confirmed, we can auto-post payroll and invoices to your books. |
| T-095 | E-signature | Partial | Document upload and storage works. E-sign integration (DocuSign or similar) not yet wired in. Contracts can be uploaded as PDFs manually for now. |
| T-096 | Alerts & notifications | Done | Alert system sends: document expiry warnings, breakdown alerts, blocked activation notices. Delivered via email and in-app notifications. Configurable per alert type. |
| T-097 | Webhook retry & error handling | Done | When aggregator webhooks fail, the system retries automatically and logs errors. Failed webhooks visible in admin dashboard with manual retry option. |
| T-098 | Integration health monitoring | Done | Admin dashboard shows status of each integration: last sync time, error count, latency, reconciliation gaps. |

---

## Module 8: Reports & Analytics

| # | What It Is | Status | Plain English |
|---|-----------|--------|---------------|
| T-099 | KPI dictionary | Done | All metrics defined with: formula, owner, how often it refreshes. Reference page in the system. |
| T-100 | Profitability by vehicle type | Done | Report showing profit per company-owned vehicle, per rented vehicle, and per rider-owned vehicle separately. |
| T-101 | CEO / executive dashboard | Done | Top-level view: revenue, gross margin, active rider count, vehicle mix breakdown, compliance risk count. |
| T-102 | Weekly executive email | Ready to build | Not yet built — low effort. Will send automated weekly digest (revenue, margin, exceptions) every Monday. |
| T-103 | Rider productivity report | Done | Ranked list of riders by: orders delivered, shift hours, attendance rate, downtime impact on their shifts. |
| T-104 | Idle rider & vehicle analysis | Done | Highlights underutilized riders (low orders per week) and underutilized vehicles (low assignment rate). Recommends pairings. |
| T-105 | Fleet aging & replacement | Done | Shows age distribution across the fleet, flags vehicles past their expected lifespan or km limit, recommends replacements. |
| T-106 | Downtime & maintenance report | Done | Downtime events per vehicle, hours lost, breakdown by cause. Helps identify problem vehicles and maintenance patterns. |
| T-107 | Payroll exception report | Done | Flags unusual payroll records: zero-pay riders, negative-pay riders (deductions exceed earnings), unusually high earners. |
| T-108 | Billing reconciliation report | Done | Side-by-side comparison of our order records vs. aggregator records per reconciliation period. Shows variances and which invoices each order supports. |
| T-109 | Compliance risk report | Done | Upcoming document expiries (within 30 days), blocked riders, blocked vehicles, unresolved incidents — all in one risk view. |

---

## What We Need From You

To finish the remaining items and connect external services, we need the following:

### Information Needed (your decisions)

| # | What We Need | Why It Is Blocked |
|---|--------------|-----------------|
| T-022 | Employment contract templates and clauses | We have the signing infrastructure — just need your legal templates |
| T-025 | Pay rates: per-order, per-km, incentive thresholds | Payroll engine is ready to calculate once we have the formula |
| T-026 | Rider-owned bike monthly allowance amount | System will auto-apply it per payroll period |
| T-027 | Company-bike deduction: daily or monthly, and amount | System will auto-deduct per payroll period |
| T-045 | Rider-owned breakdown policy: does company help pay? Any cost limit? | Affects breakdown workflow and finance rules |
| T-062 | Rate cards from Talabat, Jahez, Keeta | Revenue cannot be correctly calculated without these |
| T-067 | Full payroll formula (fixed salary? purely commission? bonus rules?) | Payroll engine waits on this |
| T-068 | Specific deduction/allowance amounts per vehicle type | Needed to complete pay calculation |
| T-077 | List of documents required by Bahrain law + by each aggregator | Onboarding checklist enforcement depends on this |

### External Integrations Needed (your choice of provider)

| # | What We Need | Current Workaround |
|---|--------------|-------------------|
| T-089 | Talabat, Jahez, Keeta API credentials & docs | Manual CSV upload |
| T-092 | GPS provider selection | No live tracking yet |
| T-093 | Mobile app prioritization (Android first? Both?) | Web browser on mobile for now |
| T-094 | Accounting system choice (QuickBooks, Xero, other?) | Manual export for now |
| T-095 | E-sign provider choice (DocuSign, HelloSign, other?) | PDF upload + manual signature for now |

---

## Overall Progress

| Module | Total Tasks | Done | Partial | Need Info / Integration |
|--------|-------------|------|---------|------------------------|
| Data Model | 18 | 17 | 1 | 0 |
| HR | 14 | 9 | 2 | 3 |
| Operations | 15 | 12 | 1 | 2 |
| Fleet | 15 | 13 | 1 | 1 |
| Finance | 15 | 10 | 1 | 4 |
| Compliance | 12 | 10 | 1 | 1 |
| Integrations | 10 | 4 | 1 | 5 |
| Reports | 11 | 10 | 0 | 1 |
| **Total** | **110** | **85** | **8** | **17** |

**85 of 110 tasks are fully implemented.** The remaining 17 are blocked on information or integration decisions that only you can provide.
