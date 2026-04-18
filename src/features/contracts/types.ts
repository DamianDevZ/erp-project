/**
 * Contract types and interfaces.
 * Service contracts with clients/aggregators defining commercial terms.
 */

export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated';
export type BillingModel = 'per_order' | 'per_hour' | 'per_shift' | 'fixed_monthly' | 'hybrid';
export type BillingFrequency = 'weekly' | 'biweekly' | 'monthly';

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  expired: 'Expired',
  terminated: 'Terminated',
};

export const BILLING_MODEL_LABELS: Record<BillingModel, string> = {
  per_order: 'Per Order',
  per_hour: 'Per Hour',
  per_shift: 'Per Shift',
  fixed_monthly: 'Fixed Monthly',
  hybrid: 'Hybrid',
};

/**
 * Contract entity.
 */
export interface Contract {
  id: string;
  organization_id: string;
  platform_id: string;
  contract_number: string | null;
  contract_name: string;
  // Validity
  start_date: string;
  end_date: string | null;
  status: ContractStatus;
  // Revenue model
  billing_model: BillingModel;
  rate_per_order: number | null;
  rate_per_hour: number | null;
  rate_per_shift: number | null;
  fixed_monthly_amount: number | null;
  // Incentive sharing
  incentive_share_percent: number;
  // Penalties
  late_delivery_penalty: number | null;
  cancel_penalty: number | null;
  minimum_acceptance_rate: number | null;
  // Volume commitments
  minimum_riders: number | null;
  minimum_orders_per_day: number | null;
  // Billing terms
  billing_frequency: BillingFrequency;
  payment_due_days: number;
  currency: string;
  // Scope
  service_zones: string | null;
  // Document
  contract_document_path: string | null;
  // Notes
  special_terms: string | null;
  notes: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Contract with related platform data.
 */
export interface ContractWithRelations extends Contract {
  platform: {
    id: string;
    name: string;
  };
}

/**
 * Input for creating a contract.
 */
export interface CreateContractInput {
  platform_id: string;
  contract_name: string;
  contract_number?: string;
  start_date: string;
  end_date?: string;
  billing_model: BillingModel;
  rate_per_order?: number;
  rate_per_hour?: number;
  rate_per_shift?: number;
  fixed_monthly_amount?: number;
  incentive_share_percent?: number;
  late_delivery_penalty?: number;
  cancel_penalty?: number;
  minimum_acceptance_rate?: number;
  minimum_riders?: number;
  minimum_orders_per_day?: number;
  billing_frequency?: BillingFrequency;
  payment_due_days?: number;
  currency?: string;
  service_zones?: string;
  special_terms?: string;
  notes?: string;
}

/**
 * Input for updating a contract.
 */
export interface UpdateContractInput extends Partial<CreateContractInput> {
  status?: ContractStatus;
}
