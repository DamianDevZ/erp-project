# Assets Feature

Manages vehicles and equipment — company-owned, employee-owned, or rentals.

## Purpose

Track all assets (primarily vehicles) used by employees, including ownership, rentals, and maintenance.

## Data Model

See [Database Schema](../../../docs/database/schema.md#assets)

### Asset Types
- `vehicle` — Cars, motorcycles, scooters, bikes
- `equipment` — Phones, bags, uniforms  
- `other` — Miscellaneous

### Ownership Types
- `company_owned` — Organization owns the asset
- `employee_owned` — Employee brings their own
- `rental` — Rented from a rental company

## Components

| Component | Description |
|-----------|-------------|
| `AssetList` | Table of all assets with filters |
| `AssetForm` | Create/edit asset |
| `AssetCard` | Summary card |
| `AssetOwnershipBadge` | Visual ownership indicator |
| `RentalCompanySelect` | Dropdown for rental companies |
| `RentalDetails` | Shows rental contract info |

## Server Actions

| Action | Description |
|--------|-------------|
| `createAsset` | Add a new asset |
| `updateAsset` | Update asset details |
| `assignAsset` | Assign to an employee |
| `getAssets` | Fetch assets (paginated, filtered) |
| `createRentalCompany` | Add a rental company |
| `createAssetRental` | Create rental contract |

## Business Rules

1. Rental assets must have a rental contract
2. Only one employee can be assigned to an asset at a time
3. Employee-owned assets must have `owner_employee_id` set
4. License plates should be unique within organization
