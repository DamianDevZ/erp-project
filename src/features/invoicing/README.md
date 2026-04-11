# Invoicing Feature

Generates invoices to platforms (Uber Eats, etc.) based on work completed.

## Purpose

Track work done by employees, then generate invoices to bill platforms for the services rendered.

## Data Model

See [Database Schema](../../../docs/database/schema.md#invoicing)

## Concepts

### Work Logs
Daily records of work done per employee per platform:
- Number of deliveries
- Hours worked
- Earnings reported by platform

### Invoice Flow
1. **Track work** — Log daily deliveries/hours per employee
2. **Select period** — Choose date range to invoice
3. **Generate invoice** — Create invoice with line items
4. **Send** — Mark as sent to platform
5. **Track payment** — Mark as paid when received

### Invoice Statuses
- `draft` — Being prepared
- `sent` — Sent to platform
- `paid` — Payment received
- `overdue` — Past due date
- `cancelled` — Voided

## Components

| Component | Description |
|-----------|-------------|
| `InvoiceList` | Table of invoices with filters |
| `InvoiceForm` | Create invoice |
| `InvoicePreview` | Preview before sending |
| `InvoiceStatusBadge` | Visual status |
| `WorkLogEntry` | Daily work log form |
| `PeriodSelector` | Date range picker |

## Server Actions

| Action | Description |
|--------|-------------|
| `createWorkLog` | Log daily work |
| `getWorkLogs` | Fetch work logs for period |
| `generateInvoice` | Create invoice from work logs |
| `updateInvoiceStatus` | Change invoice status |
| `getInvoices` | Fetch invoices (paginated) |

## Business Rules

1. Work logs are unique per employee + platform + date
2. Work logs can only be invoiced once
3. Invoice number must be unique per organization
4. Invoice total = sum of line items + tax
5. Paid invoices cannot be modified
