// Fleet Management Types (T-065 to T-072)

// === Enums ===

export type VehiclePoolType = 
  | 'general'
  | 'dedicated'
  | 'backup'
  | 'training'
  | 'vip';

export type PoolAssignmentStatus = 
  | 'pending'
  | 'active'
  | 'completed'
  | 'cancelled';

export type FuelTransactionType = 
  | 'filling'
  | 'adjustment'
  | 'initial'
  | 'return';

export type InsuranceClaimStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'closed';

export type ViolationType = 
  | 'speeding'
  | 'parking'
  | 'red_light'
  | 'illegal_turn'
  | 'license_issue'
  | 'registration'
  | 'overloading'
  | 'other';

export type ViolationStatus = 
  | 'pending'
  | 'paid'
  | 'disputed'
  | 'resolved'
  | 'written_off';

export type MaintenancePriority = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type MaintenanceScheduleStatus = 
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'cancelled';

export type MaintenanceTriggerType = 'mileage' | 'time' | 'both';

export type InsurancePolicyType = 'comprehensive' | 'third_party' | 'collision' | 'liability';

export type PremiumFrequency = 'annual' | 'semi_annual' | 'quarterly' | 'monthly';

// === Vehicle Pools (T-065) ===

export interface VehiclePool {
  id: string;
  organization_id: string;
  pool_name: string;
  pool_code: string;
  pool_type: VehiclePoolType;
  
  location_id?: string;
  
  max_vehicles?: number;
  current_vehicle_count: number;
  
  manager_id?: string;
  
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehiclePoolWithRelations extends VehiclePool {
  location?: { id: string; name: string };
  manager?: { id: string; full_name: string };
  vehicles?: VehiclePoolAssignment[];
}

export interface VehiclePoolAssignment {
  id: string;
  organization_id: string;
  pool_id: string;
  asset_id: string;
  
  assignment_start: string;
  assignment_end?: string;
  
  status: PoolAssignmentStatus;
  
  assigned_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VehiclePoolAssignmentWithRelations extends VehiclePoolAssignment {
  pool?: { id: string; pool_name: string; pool_code: string };
  asset?: { id: string; name: string; license_plate: string };
  assigned_by_employee?: { id: string; full_name: string };
}

export interface CreateVehiclePoolInput {
  organization_id: string;
  pool_name: string;
  pool_code: string;
  pool_type?: VehiclePoolType;
  location_id?: string;
  max_vehicles?: number;
  manager_id?: string;
  description?: string;
}

export interface AssignVehicleToPoolInput {
  organization_id: string;
  pool_id: string;
  asset_id: string;
  assignment_start: string;
  assignment_end?: string;
  assigned_by?: string;
  notes?: string;
}

// === Vehicle Utilization (T-066) ===

export interface VehicleUtilizationDaily {
  id: string;
  organization_id: string;
  asset_id: string;
  utilization_date: string;
  
  available_hours: number;
  utilized_hours: number;
  idle_hours: number;
  maintenance_hours: number;
  
  distance_km: number;
  
  orders_completed: number;
  revenue_generated: number;
  
  primary_rider_id?: string;
  rider_count: number;
  
  fuel_consumed: number;
  fuel_cost: number;
  
  utilization_percent?: number; // Generated column
  
  created_at: string;
  updated_at: string;
}

export interface FleetUtilizationSummary {
  organization_id: string;
  utilization_date: string;
  vehicles_active: number;
  total_utilized_hours: number;
  total_available_hours: number;
  avg_utilization_percent: number;
  total_distance_km: number;
  total_orders: number;
  total_revenue: number;
  total_fuel_consumed: number;
  total_fuel_cost: number;
}

export interface VehicleUtilizationFilters {
  organization_id: string;
  asset_id?: string;
  date_from?: string;
  date_to?: string;
  rider_id?: string;
  pool_id?: string;
  min_utilization_percent?: number;
}

// === Fuel Management (T-067) ===

export interface FuelTransaction {
  id: string;
  organization_id: string;
  transaction_number: string;
  
  asset_id: string;
  employee_id?: string;
  
  transaction_type: FuelTransactionType;
  transaction_date: string;
  transaction_time?: string;
  
  fuel_type?: string;
  quantity_liters: number;
  unit_price?: number;
  total_amount?: number;
  
  odometer_reading?: number;
  previous_odometer?: number;
  distance_since_last?: number;
  
  fuel_efficiency?: number;
  
  station_name?: string;
  station_location?: string;
  receipt_number?: string;
  receipt_path?: string;
  
  payment_method?: string;
  card_number?: string;
  
  notes?: string;
  created_at: string;
}

export interface FuelTransactionWithRelations extends FuelTransaction {
  asset?: { id: string; name: string; license_plate: string };
  employee?: { id: string; full_name: string };
}

export interface VehicleFuelEfficiency {
  asset_id: string;
  vehicle_name: string;
  license_plate: string;
  fill_count: number;
  total_fuel: number;
  total_cost: number;
  first_reading: number;
  last_reading: number;
  total_distance: number;
  overall_efficiency?: number;
}

export interface CreateFuelTransactionInput {
  organization_id: string;
  asset_id: string;
  employee_id?: string;
  transaction_type?: FuelTransactionType;
  transaction_date: string;
  transaction_time?: string;
  fuel_type?: string;
  quantity_liters: number;
  unit_price?: number;
  total_amount?: number;
  odometer_reading?: number;
  station_name?: string;
  station_location?: string;
  receipt_number?: string;
  payment_method?: string;
  notes?: string;
}

export interface FuelFilters {
  organization_id: string;
  asset_id?: string;
  employee_id?: string;
  date_from?: string;
  date_to?: string;
  fuel_type?: string;
}

// === Insurance Management (T-068) ===

export interface InsurancePolicy {
  id: string;
  organization_id: string;
  policy_number: string;
  
  insurer_name: string;
  insurer_contact?: string;
  broker_name?: string;
  broker_contact?: string;
  
  coverage_type: string;
  policy_type?: string;
  
  start_date: string;
  end_date: string;
  renewal_reminder_days: number;
  
  premium_amount?: number;
  premium_frequency: PremiumFrequency;
  next_premium_date?: string;
  
  coverage_amount?: number;
  deductible_amount?: number;
  
  vehicles_covered_count: number;
  
  is_active: boolean;
  
  policy_document_path?: string;
  
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleInsuranceCoverage {
  id: string;
  organization_id: string;
  policy_id: string;
  asset_id: string;
  
  coverage_start: string;
  coverage_end?: string;
  
  individual_premium?: number;
  individual_deductible?: number;
  
  is_active: boolean;
  created_at: string;
}

export interface InsuranceClaim {
  id: string;
  organization_id: string;
  claim_number: string;
  
  policy_id: string;
  asset_id?: string;
  incident_id?: string;
  
  claim_date: string;
  incident_date: string;
  incident_description: string;
  incident_location?: string;
  
  claim_amount: number;
  approved_amount?: number;
  deductible_applied?: number;
  settlement_amount?: number;
  
  status: InsuranceClaimStatus;
  submitted_at?: string;
  approved_at?: string;
  paid_at?: string;
  
  adjuster_name?: string;
  adjuster_notes?: string;
  rejection_reason?: string;
  
  supporting_documents: Array<{ name: string; path: string; uploaded_at: string }>;
  
  submitted_by?: string;
  approved_by?: string;
  
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InsuranceExpiryAlert {
  id: string;
  organization_id: string;
  policy_number: string;
  insurer_name: string;
  coverage_type: string;
  end_date: string;
  days_until_expiry: number;
  renewal_reminder_days: number;
  premium_amount?: number;
  coverage_amount?: number;
  vehicles_covered_count: number;
  alert_status: 'expired' | 'renewal_due' | 'active';
}

export interface CreateInsurancePolicyInput {
  organization_id: string;
  policy_number: string;
  insurer_name: string;
  insurer_contact?: string;
  broker_name?: string;
  coverage_type: string;
  policy_type?: string;
  start_date: string;
  end_date: string;
  renewal_reminder_days?: number;
  premium_amount?: number;
  premium_frequency?: PremiumFrequency;
  coverage_amount?: number;
  deductible_amount?: number;
}

export interface CreateInsuranceClaimInput {
  organization_id: string;
  policy_id: string;
  asset_id?: string;
  incident_id?: string;
  claim_date: string;
  incident_date: string;
  incident_description: string;
  incident_location?: string;
  claim_amount: number;
  submitted_by?: string;
}

export interface ApproveClaimInput {
  claim_id: string;
  approved_amount: number;
  deductible_applied?: number;
  approved_by: string;
  adjuster_notes?: string;
}

// === Traffic Violations (T-069) ===

export interface TrafficViolation {
  id: string;
  organization_id: string;
  violation_number: string;
  
  asset_id: string;
  employee_id?: string;
  
  violation_type: ViolationType;
  violation_date: string;
  violation_time?: string;
  location?: string;
  
  fine_amount: number;
  black_points: number;
  
  authority_reference?: string;
  issuing_authority?: string;
  
  due_date?: string;
  paid_amount?: number;
  paid_date?: string;
  payment_reference?: string;
  
  status: ViolationStatus;
  
  rider_responsibility: boolean;
  deduction_id?: string;
  deduction_amount?: number;
  
  dispute_reason?: string;
  dispute_outcome?: string;
  
  notes?: string;
  evidence_path?: string;
  created_at: string;
  updated_at: string;
}

export interface TrafficViolationWithRelations extends TrafficViolation {
  asset?: { id: string; name: string; license_plate: string };
  employee?: { id: string; full_name: string; employee_id: string };
}

export interface ViolationSummaryByRider {
  organization_id: string;
  employee_id: string;
  rider_name: string;
  rider_code: string;
  total_violations: number;
  pending_count: number;
  total_fines: number;
  total_paid: number;
  outstanding: number;
  total_black_points: number;
  total_deducted: number;
}

export interface CreateViolationInput {
  organization_id: string;
  asset_id: string;
  employee_id?: string;
  violation_type: ViolationType;
  violation_date: string;
  violation_time?: string;
  location?: string;
  fine_amount: number;
  black_points?: number;
  authority_reference?: string;
  issuing_authority?: string;
  due_date?: string;
  rider_responsibility?: boolean;
}

export interface PayViolationInput {
  violation_id: string;
  paid_amount: number;
  paid_date: string;
  payment_reference?: string;
}

export interface DisputeViolationInput {
  violation_id: string;
  dispute_reason: string;
}

export interface ViolationFilters {
  organization_id: string;
  asset_id?: string;
  employee_id?: string;
  violation_type?: ViolationType;
  status?: ViolationStatus | ViolationStatus[];
  date_from?: string;
  date_to?: string;
  has_outstanding?: boolean;
}

// === Maintenance Scheduling (T-070) ===

export interface MaintenanceSchedule {
  id: string;
  organization_id: string;
  schedule_name: string;
  
  trigger_type: MaintenanceTriggerType;
  mileage_interval?: number;
  time_interval_days?: number;
  
  maintenance_type: string;
  description?: string;
  estimated_duration_hours?: number;
  estimated_cost?: number;
  
  required_parts: Array<{ name: string; quantity: number; part_number?: string }>;
  
  priority: MaintenancePriority;
  is_active: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface VehicleMaintenanceDue {
  id: string;
  organization_id: string;
  asset_id: string;
  schedule_id: string;
  
  due_date?: string;
  due_mileage?: number;
  
  last_performed_date?: string;
  last_performed_mileage?: number;
  last_maintenance_id?: string;
  
  current_mileage?: number;
  
  status: MaintenanceScheduleStatus;
  is_overdue: boolean;
  days_overdue?: number;
  mileage_overdue?: number;
  
  priority: MaintenancePriority;
  
  scheduled_for_date?: string;
  scheduled_vendor_id?: string;
  
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceDueAlert {
  id: string;
  organization_id: string;
  asset_id: string;
  vehicle_name: string;
  license_plate: string;
  schedule_name: string;
  maintenance_type: string;
  description?: string;
  due_date?: string;
  due_mileage?: number;
  current_mileage?: number;
  is_overdue: boolean;
  days_overdue?: number;
  mileage_overdue?: number;
  status: MaintenanceScheduleStatus;
  priority: MaintenancePriority;
  estimated_duration_hours?: number;
  estimated_cost?: number;
}

export interface CreateMaintenanceScheduleInput {
  organization_id: string;
  schedule_name: string;
  trigger_type: MaintenanceTriggerType;
  mileage_interval?: number;
  time_interval_days?: number;
  maintenance_type: string;
  description?: string;
  estimated_duration_hours?: number;
  estimated_cost?: number;
  required_parts?: Array<{ name: string; quantity: number; part_number?: string }>;
  priority?: MaintenancePriority;
}

export interface ScheduleMaintenanceInput {
  maintenance_due_id: string;
  scheduled_for_date: string;
  scheduled_vendor_id?: string;
  notes?: string;
}

export interface MaintenanceFilters {
  organization_id: string;
  asset_id?: string;
  schedule_id?: string;
  status?: MaintenanceScheduleStatus | MaintenanceScheduleStatus[];
  priority?: MaintenancePriority | MaintenancePriority[];
  is_overdue?: boolean;
}

// === Fleet Dashboard ===

export interface FleetDashboardMetrics {
  organization_id: string;
  
  // Fleet overview
  total_vehicles: number;
  active_vehicles: number;
  in_maintenance: number;
  available: number;
  
  // Utilization
  avg_utilization_today: number;
  avg_utilization_week: number;
  avg_utilization_month: number;
  
  // Costs
  fuel_cost_today: number;
  fuel_cost_week: number;
  fuel_cost_month: number;
  maintenance_cost_month: number;
  violation_cost_month: number;
  
  // Alerts
  maintenance_due_count: number;
  overdue_maintenance_count: number;
  insurance_expiring_count: number;
  pending_violations_count: number;
}

export interface VehicleHealthScore {
  asset_id: string;
  vehicle_name: string;
  license_plate: string;
  
  health_score: number; // 0-100
  
  factors: {
    maintenance_compliance: number;
    fuel_efficiency: number;
    violation_history: number;
    age_factor: number;
    mileage_factor: number;
  };
  
  recommendations: string[];
}
