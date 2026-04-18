/**
 * Platform types and interfaces.
 * Platforms represent both clients and aggregators (Talabat, Jahez, Keeta).
 */

export type BillingRateType = 'per_delivery' | 'hourly' | 'fixed';
export type AssignmentStatus = 'active' | 'ended' | 'suspended';
export type IntegrationStatus = 'not_configured' | 'configured' | 'active' | 'error';
export type OrdersImportMethod = 'manual' | 'api' | 'csv';

/**
 * Platform entity (clients/aggregators like Talabat, Jahez, Keeta).
 */
export interface Platform {
  id: string;
  organization_id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  vat_id: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  is_active: boolean;
  billing_rate_type: BillingRateType | null;
  billing_rate: number | null;
  // Aggregator integration fields (T-008)
  api_base_url: string | null;
  api_key_encrypted: string | null;
  api_webhook_secret: string | null;
  integration_status: IntegrationStatus;
  // Commission and financial terms
  commission_rate: number | null;
  incentive_share_rate: number | null;
  payment_terms: string | null;
  payment_delay_days: number;
  // Operational requirements
  requires_uniform: boolean;
  requires_bag: boolean;
  requires_phone_app: boolean;
  min_acceptance_rate: number | null;
  max_cancel_rate: number | null;
  // Order import tracking
  last_order_sync_at: string | null;
  orders_import_method: OrdersImportMethod;
  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Platform assignment (employee → platform).
 */
export interface PlatformAssignment {
  id: string;
  organization_id: string;
  employee_id: string;
  platform_id: string;
  start_date: string;
  end_date: string | null;
  status: AssignmentStatus;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Platform with stats.
 */
export interface PlatformWithStats extends Platform {
  active_employees_count?: number;
  total_deliveries?: number;
}

/**
 * Assignment with related data.
 */
export interface AssignmentWithRelations extends PlatformAssignment {
  employee: {
    id: string;
    full_name: string;
  };
  platform: {
    id: string;
    name: string;
  };
}

/**
 * Input for creating a platform.
 */
export interface CreatePlatformInput {
  name: string;
  contact_email?: string;
  contact_phone?: string;
  billing_rate_type?: BillingRateType;
  billing_rate?: number;
}

/**
 * Input for creating an assignment.
 */
export interface CreateAssignmentInput {
  employee_id: string;
  platform_id: string;
  start_date: string;
  end_date?: string;
  external_id?: string;
}
