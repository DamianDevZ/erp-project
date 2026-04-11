# Organizations Feature

Handles multi-tenant organization management and onboarding.

## Purpose

Manages the tenant entities — the companies that use this ERP to manage their employees.

## Data Model

See [Database Schema](../../../docs/database/schema.md#organizations)

## Key Responsibilities

- Organization creation and setup
- Tenant-scoped data isolation
- Organization settings and preferences
- User invitation and role management

## Server Actions

| Action | Description |
|--------|-------------|
| `createOrganization` | Create new tenant |
| `getOrganization` | Fetch current org details |
| `updateOrganization` | Update org settings |
| `inviteUser` | Send invite to join org |

## Business Rules

1. Organization slug must be globally unique
2. First user to create org becomes `admin`
3. Only `admin` can invite new users
