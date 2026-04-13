/**
 * Vendors/Suppliers types and interfaces.
 * Manages suppliers for equipment, bikes, staffing, and other services.
 */

/**
 * Types of vendors/suppliers
 */
export type VendorType = 
  | 'equipment'      // Equipment supplier (bikes, phones, etc.)
  | 'staffing'       // Staffing agency
  | 'maintenance'    // Repair/maintenance services
  | 'uniform'        // Uniform/clothing supplier
  | 'technology'     // Software/tech services
  | 'other';

export const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  equipment: 'Equipment Supplier',
  staffing: 'Staffing Agency',
  maintenance: 'Maintenance/Repair',
  uniform: 'Uniform Supplier',
  technology: 'Technology/Software',
  other: 'Other',
};

/**
 * Vendor status
 */
export type VendorStatus = 'active' | 'inactive' | 'pending';

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending Approval',
};

/**
 * Vendor entity
 */
export interface Vendor {
  id: string;
  organization_id: string;
  name: string;
  type: VendorType;
  status: VendorStatus;
  
  // Contact information
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  
  // Address
  address: string | null;
  city: string | null;
  country: string | null;
  
  // Business details
  tax_id: string | null;           // VAT/Tax registration number
  payment_terms: string | null;     // e.g., "Net 30", "Due on receipt"
  bank_name: string | null;
  bank_account_number: string | null;
  iban: string | null;
  
  // Categorization
  services_provided: string | null; // Comma-separated list of services
  
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a vendor
 */
export interface CreateVendorInput {
  name: string;
  type: VendorType;
  status?: VendorStatus;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  bank_name?: string;
  bank_account_number?: string;
  iban?: string;
  services_provided?: string;
  notes?: string;
}

/**
 * Input for updating a vendor
 */
export interface UpdateVendorInput extends Partial<CreateVendorInput> {}
