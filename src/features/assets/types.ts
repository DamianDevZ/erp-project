/**
 * Asset types and interfaces.
 */

export type AssetType = 'vehicle' | 'equipment' | 'other';
export type AssetOwnership = 'company_owned' | 'employee_owned' | 'rental';
export type AssetCategory = 'vehicle' | 'helmet' | 'uniform' | 'phone' | 'bag' | 'accessory' | 'other';

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
  notes?: string;
}
