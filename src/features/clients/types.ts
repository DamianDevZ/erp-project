// Client types for operations

export type ClientStatus = 
  | 'active'
  | 'inactive' 
  | 'onboarding'
  | 'suspended'
  | 'churned';

export type ClientType = 
  | 'aggregator_only'
  | 'direct_only'
  | 'hybrid';

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  client_type: ClientType;
  
  // Contact
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  
  // Location
  address: string | null;
  city: string | null;
  area: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  
  // Business
  business_type: string | null;
  tax_id: string | null;
  
  // Contract
  contract_start_date: string | null;
  contract_end_date: string | null;
  billing_frequency: string | null;
  payment_terms_days: number;
  
  status: ClientStatus;
  notes: string | null;
  
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  
  // Joined
  platforms?: ClientPlatform[];
}

export interface ClientPlatform {
  id: string;
  client_id: string;
  platform_id: string;
  platform_client_id: string | null;
  platform_client_name: string | null;
  is_active: boolean;
  created_at: string;
  
  // Joined
  platform?: {
    id: string;
    name: string;
  };
}

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  onboarding: 'Onboarding',
  suspended: 'Suspended',
  churned: 'Churned',
};

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  aggregator_only: 'Aggregator Only',
  direct_only: 'Direct Only',
  hybrid: 'Hybrid',
};
