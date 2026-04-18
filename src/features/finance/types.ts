/**
 * Finance Ledger types and interfaces.
 * Cost allocation and financial tracking.
 */

export type LedgerTransactionType = 
  | 'revenue'
  | 'payroll'
  | 'vehicle_cost'
  | 'rent_expense'
  | 'maintenance'
  | 'depreciation'
  | 'insurance'
  | 'penalty'
  | 'recovery'
  | 'adjustment'
  | 'other';

export const TRANSACTION_TYPE_LABELS: Record<LedgerTransactionType, string> = {
  revenue: 'Revenue',
  payroll: 'Payroll',
  vehicle_cost: 'Vehicle Cost',
  rent_expense: 'Rental Expense',
  maintenance: 'Maintenance',
  depreciation: 'Depreciation',
  insurance: 'Insurance',
  penalty: 'Penalty',
  recovery: 'Recovery',
  adjustment: 'Adjustment',
  other: 'Other',
};

export type VehicleSourceType = 'company_owned' | 'rental' | 'employee_owned';

export const VEHICLE_SOURCE_TYPE_LABELS: Record<VehicleSourceType, string> = {
  company_owned: 'Company Owned',
  rental: 'Rental',
  employee_owned: 'Rider Owned',
};

/**
 * Finance Ledger entity.
 */
export interface FinanceLedger {
  id: string;
  organization_id: string;
  // Transaction
  transaction_date: string;
  transaction_type: LedgerTransactionType;
  category: string | null;
  description: string;
  // Amount
  amount: number;
  currency: string;
  // Cost allocation dimensions
  platform_id: string | null;
  contract_id: string | null;
  employee_id: string | null;
  asset_id: string | null;
  vendor_id: string | null;
  // Profitability analysis
  vehicle_source_type: VehicleSourceType | null;
  // Source reference
  source_table: string | null;
  source_id: string | null;
  // Accounting
  accounting_period: string | null;
  is_posted: boolean;
  posted_at: string | null;
  posted_by: string | null;
  notes: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Finance Ledger with related data.
 */
export interface FinanceLedgerWithRelations extends FinanceLedger {
  platform?: { id: string; name: string } | null;
  contract?: { id: string; contract_name: string } | null;
  employee?: { id: string; full_name: string } | null;
  asset?: { id: string; name: string; license_plate: string | null } | null;
  vendor?: { id: string; name: string } | null;
}

/**
 * Input for creating a ledger entry.
 */
export interface CreateLedgerEntryInput {
  transaction_date: string;
  transaction_type: LedgerTransactionType;
  category?: string;
  description: string;
  amount: number;
  currency?: string;
  platform_id?: string;
  contract_id?: string;
  employee_id?: string;
  asset_id?: string;
  vendor_id?: string;
  vehicle_source_type?: VehicleSourceType;
  source_table?: string;
  source_id?: string;
  accounting_period?: string;
  notes?: string;
}

/**
 * Profit by vehicle source type (T-073).
 */
export interface ProfitByVehicleSource {
  vehicle_source_type: VehicleSourceType;
  total_revenue: number;
  total_costs: number;
  gross_profit: number;
  margin_percent: number;
  vehicle_count: number;
  avg_profit_per_vehicle: number;
}

/**
 * Profit by platform/aggregator (T-074).
 */
export interface ProfitByPlatform {
  platform_id: string;
  platform_name: string;
  total_revenue: number;
  total_costs: number;
  gross_profit: number;
  margin_percent: number;
  orders_count: number;
  avg_profit_per_order: number;
}

/**
 * Monthly P&L summary.
 */
export interface MonthlyPLSummary {
  accounting_period: string;
  total_revenue: number;
  revenue_by_type: Record<string, number>;
  total_expenses: number;
  expenses_by_type: Record<LedgerTransactionType, number>;
  net_profit: number;
  margin_percent: number;
}

// ============================================
// Finance & Cash Management Types (T-059 to T-064)
// ============================================

// === Cash Management Enums ===

export type CashCollectionStatus = 
  | 'pending'
  | 'collected'
  | 'verified'
  | 'deposited'
  | 'variance_review'
  | 'completed';

export type RemittanceStatus = 
  | 'pending'
  | 'scheduled'
  | 'in_transit'
  | 'received'
  | 'verified'
  | 'variance'
  | 'completed';

export type PettyCashType = 
  | 'fund_allocation'
  | 'expense'
  | 'replenishment'
  | 'return'
  | 'adjustment';

export type AdvanceType = 
  | 'salary_advance'
  | 'expense_advance'
  | 'emergency'
  | 'deposit'
  | 'other';

export type AdvanceStatus = 
  | 'requested'
  | 'approved'
  | 'disbursed'
  | 'partially_recovered'
  | 'fully_recovered'
  | 'written_off'
  | 'cancelled';

export type CashVarianceType = 'shortage' | 'overage';

export type VarianceResolution = 
  | 'deduct_from_pay'
  | 'cash_recovered'
  | 'written_off'
  | 'disputed'
  | 'pending';

export type RecoveryMethod = 'payroll' | 'cash' | 'mixed';

export type VarianceSourceType = 'collection' | 'remittance' | 'petty_cash' | 'deposit';

// === Cash Collections (T-059) ===

export interface CashCollection {
  id: string;
  organization_id: string;
  collection_number: string;
  
  rider_id: string;
  collector_id?: string;
  
  collection_date: string;
  shift_id?: string;
  
  expected_amount: number;
  collected_amount?: number;
  variance_amount?: number; // Generated column
  
  orders_count?: number;
  status: CashCollectionStatus;
  
  collected_at?: string;
  verified_by?: string;
  verified_at?: string;
  
  deposited_by?: string;
  deposited_at?: string;
  deposit_reference?: string;
  bank_account?: string;
  
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CashCollectionSummary extends CashCollection {
  rider_name: string;
  rider_code: string;
  collector_name?: string;
  verified_by_name?: string;
}

export interface CreateShiftCollectionInput {
  organization_id: string;
  rider_id: string;
  shift_id?: string;
  collection_date?: string;
}

export interface RecordCollectionInput {
  collection_id: string;
  collected_amount: number;
  collector_id: string;
}

// === COD Remittance (T-060) ===

export interface CodRemittance {
  id: string;
  organization_id: string;
  remittance_number: string;
  
  platform_id: string;
  period_start: string;
  period_end: string;
  
  total_cod_collected: number;
  platform_commission?: number;
  our_share?: number; // Generated column
  adjustment_amount?: number;
  adjustment_reason?: string;
  final_remittance?: number;
  
  orders_count?: number;
  status: RemittanceStatus;
  scheduled_date?: string;
  
  received_amount?: number;
  received_at?: string;
  received_by?: string;
  variance_amount?: number;
  
  verified_by?: string;
  verified_at?: string;
  
  payment_reference?: string;
  bank_reference?: string;
  
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CodRemittanceSummary extends CodRemittance {
  platform_name: string;
  receipt_variance?: number;
}

export interface CreateRemittanceInput {
  organization_id: string;
  platform_id: string;
  period_start: string;
  period_end: string;
}

// === Petty Cash (T-061) ===

export interface PettyCashAccount {
  id: string;
  organization_id: string;
  account_name: string;
  
  custodian_id?: string;
  location_id?: string;
  
  initial_fund: number;
  current_balance: number;
  replenishment_threshold?: number;
  max_transaction_amount?: number;
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PettyCashTransaction {
  id: string;
  organization_id: string;
  account_id: string;
  transaction_number: string;
  
  transaction_type: PettyCashType;
  transaction_date: string;
  
  amount: number;
  running_balance?: number;
  
  description: string;
  category?: string;
  vendor?: string;
  receipt_number?: string;
  receipt_path?: string;
  
  requested_by?: string;
  approved_by?: string;
  approved_at?: string;
  
  notes?: string;
  created_at: string;
}

// === Employee Advances (T-062) ===

export interface EmployeeAdvance {
  id: string;
  organization_id: string;
  advance_number: string;
  
  employee_id: string;
  advance_type: AdvanceType;
  
  requested_amount: number;
  approved_amount?: number;
  disbursed_amount?: number;
  recovered_amount: number;
  outstanding_amount?: number; // Generated column
  
  recovery_start_date?: string;
  recovery_method: RecoveryMethod;
  recovery_installments: number;
  recovery_per_installment?: number;
  installments_recovered: number;
  
  request_date: string;
  approval_date?: string;
  disbursement_date?: string;
  expected_completion_date?: string;
  actual_completion_date?: string;
  
  status: AdvanceStatus;
  
  requested_by?: string;
  approved_by?: string;
  rejected_by?: string;
  rejection_reason?: string;
  
  disbursed_by?: string;
  disbursement_method?: string;
  disbursement_reference?: string;
  
  reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeAdvanceSummary extends EmployeeAdvance {
  employee_name: string;
  employee_code: string;
}

export interface AdvanceRecoveryRecord {
  id: string;
  organization_id: string;
  advance_id: string;
  
  recovery_date: string;
  recovery_method: string;
  amount: number;
  
  payroll_id?: string;
  collection_id?: string;
  
  installment_number?: number;
  notes?: string;
  created_at: string;
}

export interface RequestAdvanceInput {
  organization_id: string;
  employee_id: string;
  advance_type: AdvanceType;
  requested_amount: number;
  recovery_installments?: number;
  reason: string;
  requested_by?: string;
}

export interface ApproveAdvanceInput {
  advance_id: string;
  approved_amount: number;
  approved_by: string;
  recovery_start_date: string;
  recovery_installments: number;
  recovery_method?: RecoveryMethod;
}

// === Cash Variances (T-063) ===

export interface CashVariance {
  id: string;
  organization_id: string;
  variance_number: string;
  
  source_type: VarianceSourceType;
  source_id?: string;
  
  employee_id?: string;
  
  variance_date: string;
  variance_type: CashVarianceType;
  expected_amount: number;
  actual_amount: number;
  variance_amount?: number; // Generated column
  
  resolution: VarianceResolution;
  resolution_date?: string;
  resolution_amount?: number;
  resolution_notes?: string;
  
  deduction_id?: string;
  
  investigated_by?: string;
  investigation_notes?: string;
  
  approved_by?: string;
  approved_at?: string;
  
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ResolveVarianceInput {
  variance_id: string;
  resolution: VarianceResolution;
  resolution_amount?: number;
  resolution_notes?: string;
  create_deduction?: boolean;
}

// === Finance Dashboard (T-064) ===

export interface FinanceDashboardMetrics {
  organization_id: string;
  
  // Today's collections
  collections_today: number;
  collected_today: number;
  variances_today: number;
  
  // Pending
  pending_collections: number;
  pending_amount: number;
  
  // Monthly
  collected_this_month: number;
  
  // Variances
  unresolved_variances: number;
  variance_total: number;
}

export interface OutstandingAdvancesSummary {
  organization_id: string;
  total_advances: number;
  active_advances: number;
  total_outstanding: number;
  active_outstanding: number;
  avg_outstanding?: number;
}

export interface CashFlowSummary {
  organization_id: string;
  date: string;
  
  // Inflows
  cod_collected: number;
  remittances_received: number;
  other_inflows: number;
  total_inflows: number;
  
  // Outflows
  advances_disbursed: number;
  petty_cash_expenses: number;
  deposits_made: number;
  other_outflows: number;
  total_outflows: number;
  
  // Net
  net_cash_flow: number;
}

// === Filter Types ===

export interface CashCollectionFilters {
  organization_id: string;
  rider_id?: string;
  collection_date_from?: string;
  collection_date_to?: string;
  status?: CashCollectionStatus | CashCollectionStatus[];
  has_variance?: boolean;
}

export interface RemittanceFilters {
  organization_id: string;
  platform_id?: string;
  period_start?: string;
  period_end?: string;
  status?: RemittanceStatus | RemittanceStatus[];
}

export interface AdvanceFilters {
  organization_id: string;
  employee_id?: string;
  advance_type?: AdvanceType;
  status?: AdvanceStatus | AdvanceStatus[];
  has_outstanding?: boolean;
}

export interface VarianceFilters {
  organization_id: string;
  employee_id?: string;
  source_type?: VarianceSourceType;
  variance_type?: CashVarianceType;
  resolution?: VarianceResolution;
  date_from?: string;
  date_to?: string;
}
