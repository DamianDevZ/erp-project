/**
 * Client types and interfaces.
 * Clients represent delivery service partners (Uber Eats, Bolt, Deliveroo, etc.).
 */

export type BillingRateType = 'per_delivery' | 'hourly' | 'fixed';
export type AssignmentStatus = 'active' | 'ended' | 'suspended';
export type IntegrationStatus = 'not_configured' | 'configured' | 'active' | 'error';
export type OrdersImportMethod = 'manual' | 'api' | 'csv';

/**
 * Client entity (delivery services like Uber Eats, Bolt, Deliveroo).
 */
export interface Client {
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
  // API integration fields
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
 * Client assignment (employee → client).
 */
export interface ClientAssignment {
  id: string;
  organization_id: string;
  employee_id: string;
  client_id: string;
  start_date: string;
  end_date: string | null;
  status: AssignmentStatus;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Client with stats.
 */
export interface ClientWithStats extends Client {
  active_employees_count?: number;
  total_deliveries?: number;
}

/**
 * Assignment with related data.
 */
export interface AssignmentWithRelations extends ClientAssignment {
  employee: {
    id: string;
    full_name: string;
  };
  client: {
    id: string;
    name: string;
  };
}

/**
 * Input for creating a client.
 */
export interface CreateClientInput {
  name: string;
  contact_email?: string;
  contact_phone?: string;
  billing_rate_type?: BillingRateType;
  billing_rate?: number;
}

// Backwards compatibility aliases (deprecated)
/** @deprecated Use Client instead */
export type Platform = Client;
/** @deprecated Use ClientAssignment instead */
export type PlatformAssignment = ClientAssignment;
/** @deprecated Use ClientWithStats instead */
export type PlatformWithStats = ClientWithStats;
/** @deprecated Use CreateClientInput instead */
export type CreatePlatformInput = CreateClientInput;
