# Employees Feature

Manages employee profiles (riders, supervisors, managers, HR staff).

## Purpose

Core entity of the ERP — the people your organization manages who work for delivery platforms.

## Data Model

See [Database Schema](../../../docs/database/schema.md#employees)

### Employee Status
- `pending` — Newly added, awaiting document verification
- `active` — Verified and available for assignments  
- `past` — No longer working (terminated or resigned)

### Employee Role
- `rider` — Delivery person
- `supervisor` — Oversees riders
- `manager` — Manages supervisors and operations
- `hr` — Human resources staff

## Components

| Component | Description |
|-----------|-------------|
| `EmployeeList` | Table of all employees with filters |
| `EmployeeForm` | Create/edit employee |
| `EmployeeCard` | Summary card |
| `EmployeeStatusBadge` | Visual status indicator |
| `EmployeeRoleBadge` | Visual role indicator |

## Server Actions

| Action | Description |
|--------|-------------|
| `createEmployee` | Add a new employee |
| `updateEmployee` | Update employee details |
| `updateEmployeeStatus` | Change status (pending/active/past) |
| `getEmployees` | Fetch employees (paginated, filtered) |
| `getEmployeeById` | Fetch single employee with details |

## Business Rules

1. Employee email must be unique within an organization
2. Status transitions: `pending` → `active` ↔ `past`
3. Employees cannot be deleted if they have active assignments or assets
4. Termination date is required when status changes to `past`
