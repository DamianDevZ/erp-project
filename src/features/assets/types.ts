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

/** Vehicle operational status */
export type VehicleStatus = 'available' | 'assigned' | 'maintenance' | 'off_road' | 'disposed';

/** Compliance status for vehicles */
export type AssetComplianceStatus = 'compliant' | 'expiring_soon' | 'non_compliant' | 'blocked';

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  available: 'Available',
  assigned: 'Assigned',
  maintenance: 'In Maintenance',
  off_road: 'Off Road',
  disposed: 'Disposed',
};

export const ASSET_COMPLIANCE_STATUS_LABELS: Record<AssetComplianceStatus, string> = {
  compliant: 'Compliant',
  expiring_soon: 'Expiring Soon',
  non_compliant: 'Non-Compliant',
  blocked: 'Blocked',
};

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
  // Location tracking
  current_location_id: string | null;
  is_active: boolean;
  // Vehicle compliance fields (T-003)
  registration_number: string | null;
  registration_expiry: string | null;
  insurance_policy_number: string | null;
  insurance_expiry: string | null;
  inspection_date: string | null;
  inspection_expiry: string | null;
  // Vehicle status
  vehicle_status: VehicleStatus;
  compliance_status: AssetComplianceStatus;
  // Owned vehicle fields
  purchase_date: string | null;
  purchase_price: number | null;
  expected_life_years: number | null;
  disposal_date: string | null;
  disposal_value: number | null;
  // Operational data
  odometer_reading: number | null;
  last_odometer_date: string | null;
  next_service_km: number | null;
  next_service_date: string | null;
  // Spare pool flag
  is_spare: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
 * Maintenance types for assets
 */
export type MaintenanceType = 'oil_change' | 'repair' | 'inspection' | 'tire_rotation' | 'brake_service' | 'general_service' | 'other';

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  oil_change: 'Oil Change',
  repair: 'Repair',
  inspection: 'Inspection',
  tire_rotation: 'Tire Rotation',
  brake_service: 'Brake Service',
  general_service: 'General Service',
  other: 'Other',
};

/**
 * Asset maintenance record.
 */
export interface AssetMaintenance {
  id: string;
  organization_id: string;
  asset_id: string;
  type: MaintenanceType;
  description: string | null;
  cost: number | null;
  performed_at: string | null;
  next_due_at: string | null;
  created_at: string;
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

// ============================================
// Asset Lifecycle & Vendor Types (T-071 to T-077)
// ============================================

export type AssetLifecycleStage = 
  | 'procurement'
  | 'pre_delivery'
  | 'active'
  | 'maintenance'
  | 'repair'
  | 'idle'
  | 'disposal_pending'
  | 'disposed';

export type DisposalMethod = 
  | 'sold'
  | 'scrapped'
  | 'donated'
  | 'returned_to_lessor'
  | 'trade_in'
  | 'written_off';

export type VendorCategory = 
  | 'maintenance'
  | 'fuel'
  | 'insurance'
  | 'parts'
  | 'rental'
  | 'equipment'
  | 'services'
  | 'other';

export type VendorRating = 
  | 'excellent'
  | 'good'
  | 'average'
  | 'below_average'
  | 'poor';

// === Asset Lifecycle Events ===

export interface AssetLifecycleEvent {
  id: string;
  organization_id: string;
  asset_id: string;
  
  event_date: string;
  event_type: string;
  
  previous_stage?: AssetLifecycleStage;
  new_stage?: AssetLifecycleStage;
  
  event_value?: number;
  accumulated_depreciation?: number;
  book_value?: number;
  
  description?: string;
  reference_number?: string;
  related_document_path?: string;
  
  performed_by?: string;
  
  metadata?: Record<string, unknown>;
  notes?: string;
  created_at: string;
}

export interface CreateLifecycleEventInput {
  asset_id: string;
  event_date: string;
  event_type: string;
  previous_stage?: AssetLifecycleStage;
  new_stage?: AssetLifecycleStage;
  event_value?: number;
  description?: string;
  reference_number?: string;
  performed_by?: string;
  notes?: string;
}

// === Asset Disposal ===

export interface AssetDisposal {
  id: string;
  organization_id: string;
  asset_id: string;
  
  disposal_date: string;
  disposal_method: DisposalMethod;
  
  book_value_at_disposal?: number;
  disposal_amount?: number;
  gain_loss?: number; // Generated column
  
  buyer_name?: string;
  buyer_contact?: string;
  
  disposal_reason?: string;
  condition_at_disposal?: string;
  
  sale_agreement_path?: string;
  transfer_documents?: Array<{ name: string; path: string }>;
  
  requested_by?: string;
  approved_by?: string;
  approved_at?: string;
  
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DisposeAssetInput {
  asset_id: string;
  disposal_date: string;
  disposal_method: DisposalMethod;
  disposal_value: number;
  disposal_reason: string;
  buyer_name?: string;
  buyer_contact?: string;
  condition_at_disposal?: string;
  requested_by?: string;
}

// === Asset Depreciation ===

export interface AssetDepreciation {
  acquisition_cost: number;
  salvage_value: number;
  useful_life_months: number;
  months_used: number;
  monthly_depreciation: number;
  accumulated_depreciation: number;
  book_value: number;
}

// === Vendor Types ===

export interface Vendor {
  id: string;
  organization_id: string;
  vendor_code?: string;
  name: string;
  trade_name?: string;
  category?: VendorCategory;
  subcategory?: string;
  
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  mobile?: string;
  website?: string;
  
  address?: string;
  address_line2?: string;
  city?: string;
  emirate?: string;
  country: string;
  postal_code?: string;
  
  trade_license_number?: string;
  trade_license_expiry?: string;
  tax_id?: string;
  vat_registration_number?: string;
  
  bank_name?: string;
  bank_account_number?: string;
  iban?: string;
  swift_code?: string;
  
  payment_terms?: string;
  payment_terms_days: number;
  credit_limit?: number;
  
  rating?: VendorRating;
  rating_notes?: string;
  last_rating_date?: string;
  
  status: string;
  approved_by?: string;
  approved_at?: string;
  blacklisted_reason?: string;
  is_preferred: boolean;
  
  services_provided?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface VendorService {
  id: string;
  vendor_id: string;
  
  service_name: string;
  service_description?: string;
  
  base_price?: number;
  price_unit?: string;
  
  turnaround_time_hours?: number;
  warranty_days?: number;
  
  is_active: boolean;
  created_at: string;
}

export interface VendorPerformanceRecord {
  id: string;
  organization_id: string;
  vendor_id: string;
  
  record_period: string;
  
  orders_count: number;
  total_spend: number;
  
  on_time_deliveries: number;
  late_deliveries: number;
  avg_delivery_days?: number;
  
  quality_issues: number;
  returns_count: number;
  warranty_claims: number;
  
  price_variance_percent?: number;
  
  on_time_rate?: number;
  quality_rate?: number;
  overall_score?: number;
  
  notes?: string;
  created_at: string;
}

export interface VendorPerformanceSummary {
  vendor_id: string;
  organization_id: string;
  vendor_code?: string;
  vendor_name: string;
  category?: VendorCategory;
  status: string;
  rating?: VendorRating;
  is_preferred: boolean;
  
  periods_tracked: number;
  total_orders: number;
  total_spend: number;
  avg_on_time_rate?: number;
  avg_quality_rate?: number;
  avg_score?: number;
  latest_score?: number;
}

export interface CreateVendorInput {
  vendor_code?: string;
  name: string;
  trade_name?: string;
  category: VendorCategory;
  subcategory?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  mobile?: string;
  website?: string;
  address?: string;
  city?: string;
  emirate?: string;
  country?: string;
  trade_license_number?: string;
  trade_license_expiry?: string;
  vat_registration_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  iban?: string;
  payment_terms_days?: number;
  credit_limit?: number;
  services_provided?: string;
  notes?: string;
}

export interface VendorFilters {
  organization_id: string;
  category?: VendorCategory;
  status?: string;
  rating?: VendorRating;
  is_preferred?: boolean;
  search?: string;
}

// === Vehicle Cost Summary ===

export interface VehicleCostSummary {
  asset_id: string;
  organization_id: string;
  vehicle_name: string;
  license_plate?: string;
  ownership: AssetOwnership;
  
  acquisition_date?: string;
  acquisition_cost?: number;
  current_book_value?: number;
  
  fuel_cost_30d: number;
  maintenance_cost_30d: number;
  insurance_cost_monthly: number;
  violation_cost_30d: number;
  
  total_cost_30d?: number;
}
