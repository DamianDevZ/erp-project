# Platforms Feature

Manages delivery platforms (clients) like Uber Eats, DoorDash, Glovo.

## Purpose

Track the platforms (clients) that your employees deliver for. Configure billing rates and manage assignments.

## Data Model

See [Database Schema](../../../docs/database/schema.md#platforms-clients)

## Concepts

### Billing Rate Types
- `per_delivery` — Charge per delivery completed
- `hourly` — Charge per hour worked
- `fixed` — Fixed fee per period

### Platform Assignments
Employees are assigned to platforms with start/end dates. This tracks who works for which platform.

## Components

| Component | Description |
|-----------|-------------|
| `PlatformList` | Table of all platforms |
| `PlatformForm` | Create/edit platform |
| `PlatformCard` | Summary card |
| `PlatformSelect` | Dropdown for selecting platform |

## Server Actions

| Action | Description |
|--------|-------------|
| `createPlatform` | Add a new platform |
| `updatePlatform` | Update platform details |
| `getPlatforms` | Fetch all platforms |
| `assignEmployee` | Assign employee to platform |
| `getAssignments` | Get platform assignments |

## Business Rules

1. Platform names should be unique within organization
2. Billing rate is required for invoicing
3. Inactive platforms cannot receive new assignments
