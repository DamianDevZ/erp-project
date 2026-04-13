/**
 * Asset types and interfaces.
 * Enhanced with location tracking and movement history.
 */

export type AssetType = 'vehicle' | 'equipment' | 'other';
export type AssetOwnership = 'company_owned' | 'employee_owned' | 'rental';
export type AssetCategory = 'vehicle' | 'helmet' | 'uniform' | 'phone' | 'bag' | 'accessory' | 'other';

/**
 * Location types for assets
 */
export type LocationType = 'warehouse' | 'client' | 'vendor' | 'employee' | 'maintenance' | 'other';

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  warehouse: 'Warehouse',
  client: 'Client Site',
  vendor: 'Vendor',
  employee: 'With Employee',
  maintenance: 'Maintenance/Repair',
  other: 'Other',
};

/**
 * Location entity for tracking where assets are stored/deployed
 */
export interface Location {
  id: string;
  organization_id: string;
  name: string;
  type: LocationType;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Asset movement types
 */
export type MovementType = 'transfer' | 'assignment' | 'return' | 'maintenance' | 'disposal';

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  transfer: 'Transfer',
  assignment: 'Assigned to Employee',
  return: 'Returned',
  maintenance: 'Sent for Maintenance',
  disposal: 'Disposed/Written Off',
};

/**
 * Asset movement history record
 */
export interface AssetMovement {
  id: string;
  organization_id: string;
  asset_id: string;
  movement_type: MovementType;
  from_location_id: string | null;
  to_location_id: string | null;
  from_employee_id: string | null;
  to_employee_id: string | null;
  movement_date: string;
  performed_by: string | null; // user_id who recorded the movement
  notes: string | null;
  created_at: string;
}

/**
 * Asset movement with related data
 */
export interface AssetMovementWithRelations extends AssetMovement {
  from_location?: Location | null;
  to_location?: Location | null;
  from_employee?: { id: string; full_name: string } | null;
  to_employee?: { id: string; full_name: string } | null;
  performed_by_user?: { full_name: string } | null;
}

/**
 * Asset entity.
 */
export interface Asset {
  id: string;
  organization_id: string;
  asset_number: string | null;
  name: string;
  type: AssetType;
  category: AssetCategory;
  ownership: AssetOwnership;
  license_plate: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  vin: string | null;
  assigned_employee_id: string | null;
  owner_employee_id: string | null;
  // New location tracking fields
  current_location_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Rental company entity.
 */
export interface RentalCompany {
  id: string;
  organization_id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Asset rental contract.
 */
export interface AssetRental {
  id: string;
  organization_id: string;
  asset_id: string;
  rental_company_id: string;
  contract_number: string | null;
  start_date: string;
  end_date: string | null;
  daily_rate: number | null;
  weekly_rate: number | null;
  monthly_rate: number | null;
  deposit_amount: number | null;
  status: 'active' | 'ended' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Asset with related data.
 */
export interface AssetWithRelations extends Asset {
  assigned_employee?: {
    id: string;
    full_name: string;
  } | null;
  owner_employee?: {
    id: string;
    full_name: string;
  } | null;
  current_location?: Location | null;
  current_rental?: AssetRental & {
    rental_company: RentalCompany;
  } | null;
}

/**
 * Input for creating an asset.
 */
export interface CreateAssetInput {
  name: string;
  type?: AssetType;
  ownership: AssetOwnership;
  license_plate?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  vin?: string;
  assigned_employee_id?: string;
  owner_employee_id?: string;
  current_location_id?: string;
  notes?: string;
}

/**
 * Input for creating a location.
 */
export interface CreateLocationInput {
  name: string;
  type: LocationType;
  address?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
}

/**
 * Input for recording an asset movement.
 */
export interface CreateAssetMovementInput {
  asset_id: string;
  movement_type: MovementType;
  from_location_id?: string;
  to_location_id?: string;
  from_employee_id?: string;
  to_employee_id?: string;
  movement_date?: string;
  notes?: string;
}
