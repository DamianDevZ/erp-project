'use client';

import { useQuery, useMutation, applyPagination } from '@/lib/supabase/hooks';
import type { PaginationParams, PaginatedResult } from '@/lib/supabase/hooks';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Vehicle {
  id: string;
  organization_id: string;
  registration_number: string;
  type: 'bike' | 'car' | 'van' | 'truck';
  make: string;
  model: string;
  year: number;
  color?: string;
  vin?: string;
  status: 'available' | 'assigned' | 'maintenance' | 'retired';
  ownership_type: 'owned' | 'rented' | 'leased';
  current_employee_id?: string;
  insurance_expiry?: string;
  registration_expiry?: string;
  last_service_date?: string;
  next_service_date?: string;
  odometer_reading?: number;
  fuel_type?: string;
  notes?: string;
  created_at: string;
  current_employee?: { id: string; full_name: string };
}

export interface MaintenanceRecord {
  id: string;
  organization_id: string;
  vehicle_id: string;
  type: 'scheduled' | 'repair' | 'inspection' | 'accident';
  description: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date: string;
  completed_date?: string;
  vendor?: string;
  cost?: number;
  odometer_at_service?: number;
  parts_replaced?: string;
  technician_notes?: string;
  invoice_url?: string;
  vehicle?: Vehicle;
}

export interface FuelRecord {
  id: string;
  organization_id: string;
  vehicle_id: string;
  employee_id?: string;
  quantity_liters: number;
  cost_per_liter: number;
  total_cost: number;
  odometer_reading: number;
  station?: string;
  fuel_type: string;
  payment_method?: string;
  receipt_url?: string;
  filled_at: string;
  vehicle?: Vehicle;
  employee?: { id: string; full_name: string };
}

export interface TrafficViolation {
  id: string;
  organization_id: string;
  vehicle_id: string;
  employee_id?: string;
  violation_type: string;
  description?: string;
  fine_amount: number;
  violation_date: string;
  location?: string;
  status: 'pending' | 'paid' | 'disputed' | 'transferred';
  paid_by?: 'company' | 'employee';
  deducted_from_salary?: boolean;
  payment_date?: string;
  reference_number?: string;
  vehicle?: Vehicle;
  employee?: { id: string; full_name: string };
}

export interface Incident {
  id: string;
  organization_id: string;
  vehicle_id?: string;
  employee_id?: string;
  type: 'accident' | 'theft' | 'damage' | 'breakdown' | 'other';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  description: string;
  incident_date: string;
  location?: string;
  status: 'reported' | 'investigating' | 'resolved' | 'closed';
  police_report_number?: string;
  insurance_claim_number?: string;
  estimated_cost?: number;
  actual_cost?: number;
  at_fault?: boolean;
  resolution_notes?: string;
  photos?: string[];
  vehicle?: Vehicle;
  employee?: { id: string; full_name: string };
}

// ============================================================================
// VEHICLE HOOKS
// ============================================================================

export interface VehicleFilters {
  type?: string;
  status?: string;
  ownership_type?: string;
  has_employee?: boolean;
  search?: string;
}

/**
 * Fetch vehicles with filters
 */
export function useVehicles(filters?: VehicleFilters, pagination?: PaginationParams) {
  return useQuery<PaginatedResult<Vehicle>>(
    async (supabase) => {
      let query = supabase
        .from('vehicles')
        .select(`
          *,
          current_employee:employees(id, full_name)
        `, { count: 'exact' });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.ownership_type) {
        query = query.eq('ownership_type', filters.ownership_type);
      }
      if (filters?.has_employee === true) {
        query = query.not('current_employee_id', 'is', null);
      } else if (filters?.has_employee === false) {
        query = query.is('current_employee_id', null);
      }
      if (filters?.search) {
        query = query.or(`registration_number.ilike.%${filters.search}%,make.ilike.%${filters.search}%,model.ilike.%${filters.search}%`);
      }

      query = query.order('registration_number');

      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      query = applyPagination(query, pagination);

      const { data, error, count } = await query;

      if (error) return { data: null, error };

      return {
        data: {
          data: data || [],
          count: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize),
        },
        error: null,
      };
    },
    [JSON.stringify(filters), pagination?.page, pagination?.pageSize]
  );
}

/**
 * Fetch single vehicle with details
 */
export function useVehicle(id: string | null) {
  return useQuery<Vehicle & {
    maintenance_records: MaintenanceRecord[];
    fuel_records: FuelRecord[];
  }>(
    async (supabase) => {
      if (!id) return { data: null, error: null };

      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          current_employee:employees(id, full_name),
          maintenance_records:maintenance_records(*)::order(scheduled_date.desc)::limit(10),
          fuel_records:fuel_records(*)::order(filled_at.desc)::limit(10)
        `)
        .eq('id', id)
        .single();

      return { data, error };
    },
    [id]
  );
}

/**
 * Fetch available vehicles for assignment
 */
export function useAvailableVehicles(type?: string) {
  return useQuery<Vehicle[]>(
    async (supabase) => {
      let query = supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'available')
        .is('current_employee_id', null);

      if (type) {
        query = query.eq('type', type);
      }

      query = query.order('registration_number');

      const { data, error } = await query;
      return { data, error };
    },
    [type]
  );
}

/**
 * Fetch vehicles needing service soon
 */
export function useVehiclesDueForService(daysAhead: number = 30) {
  return useQuery<Vehicle[]>(
    async (supabase) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .lte('next_service_date', futureDate.toISOString().split('T')[0])
        .neq('status', 'retired')
        .order('next_service_date');

      return { data, error };
    },
    [daysAhead]
  );
}

/**
 * Fetch vehicles with expiring documents
 */
export function useVehiclesWithExpiringDocs(daysAhead: number = 30) {
  return useQuery<Vehicle[]>(
    async (supabase) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      const dateStr = futureDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .neq('status', 'retired')
        .or(`insurance_expiry.lte.${dateStr},registration_expiry.lte.${dateStr}`)
        .order('insurance_expiry');

      return { data, error };
    },
    [daysAhead]
  );
}

/**
 * Get fleet summary statistics
 */
export function useFleetSummary() {
  return useQuery<{
    total: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    by_ownership: Record<string, number>;
    assigned: number;
    available: number;
    in_maintenance: number;
  }>(
    async (supabase) => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('status, type, ownership_type, current_employee_id')
        .neq('status', 'retired');

      if (error) return { data: null, error };

      const byStatus: Record<string, number> = {};
      const byType: Record<string, number> = {};
      const byOwnership: Record<string, number> = {};

      let assigned = 0;
      let available = 0;
      let inMaintenance = 0;

      data?.forEach(v => {
        byStatus[v.status] = (byStatus[v.status] || 0) + 1;
        byType[v.type] = (byType[v.type] || 0) + 1;
        byOwnership[v.ownership_type] = (byOwnership[v.ownership_type] || 0) + 1;

        if (v.current_employee_id) assigned++;
        if (v.status === 'available') available++;
        if (v.status === 'maintenance') inMaintenance++;
      });

      return {
        data: {
          total: data?.length || 0,
          by_status: byStatus,
          by_type: byType,
          by_ownership: byOwnership,
          assigned,
          available,
          in_maintenance: inMaintenance,
        },
        error: null,
      };
    },
    []
  );
}

// ============================================================================
// VEHICLE MUTATIONS
// ============================================================================

/**
 * Create vehicle
 */
export function useCreateVehicle() {
  return useMutation<Vehicle, Omit<Vehicle, 'id' | 'organization_id' | 'created_at' | 'current_employee'>>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('vehicles')
        .insert(input)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Update vehicle
 */
export function useUpdateVehicle() {
  return useMutation<Vehicle, { id: string } & Partial<Vehicle>>(
    async (supabase, { id, ...updates }) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Assign vehicle to employee
 */
export function useAssignVehicle() {
  return useMutation<Vehicle, { vehicle_id: string; employee_id: string }>(
    async (supabase, { vehicle_id, employee_id }) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update({
          current_employee_id: employee_id,
          status: 'assigned',
        })
        .eq('id', vehicle_id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Unassign vehicle from employee
 */
export function useUnassignVehicle() {
  return useMutation<Vehicle, string>(
    async (supabase, vehicleId) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update({
          current_employee_id: null,
          status: 'available',
        })
        .eq('id', vehicleId)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Send vehicle to maintenance
 */
export function useSendToMaintenance() {
  return useMutation<Vehicle, { id: string; reason: string }>(
    async (supabase, { id, reason }) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update({
          status: 'maintenance',
          notes: reason,
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Retire vehicle
 */
export function useRetireVehicle() {
  return useMutation<Vehicle, { id: string; reason?: string }>(
    async (supabase, { id, reason }) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update({
          status: 'retired',
          current_employee_id: null,
          notes: reason,
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

// ============================================================================
// MAINTENANCE HOOKS
// ============================================================================

export interface MaintenanceFilters {
  vehicle_id?: string;
  type?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Fetch maintenance records
 */
export function useMaintenanceRecords(filters?: MaintenanceFilters, pagination?: PaginationParams) {
  return useQuery<PaginatedResult<MaintenanceRecord>>(
    async (supabase) => {
      let query = supabase
        .from('maintenance_records')
        .select(`
          *,
          vehicle:vehicles(id, registration_number, make, model)
        `, { count: 'exact' });

      if (filters?.vehicle_id) {
        query = query.eq('vehicle_id', filters.vehicle_id);
      }
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.date_from) {
        query = query.gte('scheduled_date', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('scheduled_date', filters.date_to);
      }

      query = query.order('scheduled_date', { ascending: false });

      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      query = applyPagination(query, pagination);

      const { data, error, count } = await query;

      if (error) return { data: null, error };

      return {
        data: {
          data: data || [],
          count: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize),
        },
        error: null,
      };
    },
    [JSON.stringify(filters), pagination?.page, pagination?.pageSize]
  );
}

/**
 * Fetch scheduled maintenance
 */
export function useScheduledMaintenance() {
  return useQuery<MaintenanceRecord[]>(
    async (supabase) => {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select(`
          *,
          vehicle:vehicles(id, registration_number, make, model)
        `)
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_date');

      return { data, error };
    },
    []
  );
}

/**
 * Get maintenance cost summary
 */
export function useMaintenanceCostSummary(vehicleId?: string, dateFrom?: string, dateTo?: string) {
  return useQuery<{
    total_cost: number;
    by_type: Record<string, number>;
    records_count: number;
  }>(
    async (supabase) => {
      let query = supabase
        .from('maintenance_records')
        .select('type, cost')
        .eq('status', 'completed');

      if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId);
      }
      if (dateFrom) {
        query = query.gte('completed_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('completed_date', dateTo);
      }

      const { data, error } = await query;

      if (error) return { data: null, error };

      const byType: Record<string, number> = {};
      let totalCost = 0;

      data?.forEach(m => {
        totalCost += m.cost || 0;
        byType[m.type] = (byType[m.type] || 0) + (m.cost || 0);
      });

      return {
        data: {
          total_cost: totalCost,
          by_type: byType,
          records_count: data?.length || 0,
        },
        error: null,
      };
    },
    [vehicleId, dateFrom, dateTo]
  );
}

// ============================================================================
// MAINTENANCE MUTATIONS
// ============================================================================

/**
 * Schedule maintenance
 */
export function useScheduleMaintenance() {
  return useMutation<MaintenanceRecord, Omit<MaintenanceRecord, 'id' | 'organization_id' | 'vehicle'>>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('maintenance_records')
        .insert({
          ...input,
          status: 'scheduled',
        })
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Start maintenance
 */
export function useStartMaintenance() {
  return useMutation<MaintenanceRecord, string>(
    async (supabase, id) => {
      const { data, error } = await supabase
        .from('maintenance_records')
        .update({ status: 'in_progress' })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Complete maintenance
 */
export function useCompleteMaintenance() {
  return useMutation<MaintenanceRecord, {
    id: string;
    cost?: number;
    parts_replaced?: string;
    technician_notes?: string;
    odometer_at_service?: number;
  }>(
    async (supabase, { id, ...updates }) => {
      const { data, error } = await supabase
        .from('maintenance_records')
        .update({
          ...updates,
          status: 'completed',
          completed_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', id)
        .select()
        .single();

      // Update vehicle last/next service dates
      if (!error && data) {
        const nextServiceDate = new Date();
        nextServiceDate.setMonth(nextServiceDate.getMonth() + 3); // Default 3 months

        await supabase
          .from('vehicles')
          .update({
            last_service_date: data.completed_date,
            next_service_date: nextServiceDate.toISOString().split('T')[0],
            status: 'available',
            odometer_reading: updates.odometer_at_service,
          })
          .eq('id', data.vehicle_id);
      }

      return { data, error };
    }
  );
}

// ============================================================================
// FUEL HOOKS
// ============================================================================

export interface FuelFilters {
  vehicle_id?: string;
  employee_id?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Fetch fuel records
 */
export function useFuelRecords(filters?: FuelFilters, pagination?: PaginationParams) {
  return useQuery<PaginatedResult<FuelRecord>>(
    async (supabase) => {
      let query = supabase
        .from('fuel_records')
        .select(`
          *,
          vehicle:vehicles(id, registration_number, make, model),
          employee:employees(id, full_name)
        `, { count: 'exact' });

      if (filters?.vehicle_id) {
        query = query.eq('vehicle_id', filters.vehicle_id);
      }
      if (filters?.employee_id) {
        query = query.eq('employee_id', filters.employee_id);
      }
      if (filters?.date_from) {
        query = query.gte('filled_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('filled_at', filters.date_to);
      }

      query = query.order('filled_at', { ascending: false });

      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      query = applyPagination(query, pagination);

      const { data, error, count } = await query;

      if (error) return { data: null, error };

      return {
        data: {
          data: data || [],
          count: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize),
        },
        error: null,
      };
    },
    [JSON.stringify(filters), pagination?.page, pagination?.pageSize]
  );
}

/**
 * Get fuel consumption summary
 */
export function useFuelConsumptionSummary(vehicleId?: string, dateFrom?: string, dateTo?: string) {
  return useQuery<{
    total_liters: number;
    total_cost: number;
    average_cost_per_liter: number;
    records_count: number;
    km_traveled?: number;
    avg_consumption_per_100km?: number;
  }>(
    async (supabase) => {
      let query = supabase
        .from('fuel_records')
        .select('quantity_liters, total_cost, cost_per_liter, odometer_reading');

      if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId);
      }
      if (dateFrom) {
        query = query.gte('filled_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('filled_at', dateTo);
      }

      query = query.order('odometer_reading');

      const { data, error } = await query;

      if (error) return { data: null, error };

      let totalLiters = 0;
      let totalCost = 0;
      let totalCostPerLiter = 0;

      data?.forEach(f => {
        totalLiters += f.quantity_liters || 0;
        totalCost += f.total_cost || 0;
        totalCostPerLiter += f.cost_per_liter || 0;
      });

      const recordsCount = data?.length || 0;
      const avgCostPerLiter = recordsCount > 0 ? totalCostPerLiter / recordsCount : 0;

      // Calculate km traveled if we have odometer readings
      let kmTraveled: number | undefined;
      let avgConsumption: number | undefined;
      if (data && data.length >= 2) {
        const first = data[0];
        const last = data[data.length - 1];
        if (first.odometer_reading && last.odometer_reading) {
          kmTraveled = last.odometer_reading - first.odometer_reading;
          if (kmTraveled > 0 && totalLiters > 0) {
            avgConsumption = (totalLiters / kmTraveled) * 100;
          }
        }
      }

      return {
        data: {
          total_liters: totalLiters,
          total_cost: totalCost,
          average_cost_per_liter: avgCostPerLiter,
          records_count: recordsCount,
          km_traveled: kmTraveled,
          avg_consumption_per_100km: avgConsumption,
        },
        error: null,
      };
    },
    [vehicleId, dateFrom, dateTo]
  );
}

/**
 * Record fuel fill-up
 */
export function useRecordFuelFillup() {
  return useMutation<FuelRecord, Omit<FuelRecord, 'id' | 'organization_id' | 'total_cost' | 'vehicle' | 'employee'>>(
    async (supabase, input) => {
      const totalCost = input.quantity_liters * input.cost_per_liter;

      const { data, error } = await supabase
        .from('fuel_records')
        .insert({
          ...input,
          total_cost: totalCost,
          filled_at: input.filled_at || new Date().toISOString(),
        })
        .select()
        .single();

      // Update vehicle odometer
      if (!error && data && input.odometer_reading) {
        await supabase
          .from('vehicles')
          .update({ odometer_reading: input.odometer_reading })
          .eq('id', input.vehicle_id);
      }

      return { data, error };
    }
  );
}

// ============================================================================
// TRAFFIC VIOLATIONS HOOKS
// ============================================================================

export interface ViolationFilters {
  vehicle_id?: string;
  employee_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Fetch traffic violations
 */
export function useTrafficViolations(filters?: ViolationFilters, pagination?: PaginationParams) {
  return useQuery<PaginatedResult<TrafficViolation>>(
    async (supabase) => {
      let query = supabase
        .from('traffic_violations')
        .select(`
          *,
          vehicle:vehicles(id, registration_number),
          employee:employees(id, full_name)
        `, { count: 'exact' });

      if (filters?.vehicle_id) {
        query = query.eq('vehicle_id', filters.vehicle_id);
      }
      if (filters?.employee_id) {
        query = query.eq('employee_id', filters.employee_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.date_from) {
        query = query.gte('violation_date', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('violation_date', filters.date_to);
      }

      query = query.order('violation_date', { ascending: false });

      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      query = applyPagination(query, pagination);

      const { data, error, count } = await query;

      if (error) return { data: null, error };

      return {
        data: {
          data: data || [],
          count: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize),
        },
        error: null,
      };
    },
    [JSON.stringify(filters), pagination?.page, pagination?.pageSize]
  );
}

/**
 * Fetch pending violations
 */
export function usePendingViolations() {
  return useQuery<TrafficViolation[]>(
    async (supabase) => {
      const { data, error } = await supabase
        .from('traffic_violations')
        .select(`
          *,
          vehicle:vehicles(id, registration_number),
          employee:employees(id, full_name)
        `)
        .eq('status', 'pending')
        .order('violation_date');

      return { data, error };
    },
    []
  );
}

/**
 * Get violations summary
 */
export function useViolationsSummary(dateFrom?: string, dateTo?: string) {
  return useQuery<{
    total_count: number;
    total_fines: number;
    paid_fines: number;
    pending_fines: number;
    by_type: Record<string, { count: number; amount: number }>;
  }>(
    async (supabase) => {
      let query = supabase
        .from('traffic_violations')
        .select('violation_type, status, fine_amount');

      if (dateFrom) {
        query = query.gte('violation_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('violation_date', dateTo);
      }

      const { data, error } = await query;

      if (error) return { data: null, error };

      const byType: Record<string, { count: number; amount: number }> = {};
      let totalFines = 0;
      let paidFines = 0;
      let pendingFines = 0;

      data?.forEach(v => {
        totalFines += v.fine_amount || 0;
        if (v.status === 'paid') {
          paidFines += v.fine_amount || 0;
        } else if (v.status === 'pending') {
          pendingFines += v.fine_amount || 0;
        }

        if (!byType[v.violation_type]) {
          byType[v.violation_type] = { count: 0, amount: 0 };
        }
        byType[v.violation_type].count++;
        byType[v.violation_type].amount += v.fine_amount || 0;
      });

      return {
        data: {
          total_count: data?.length || 0,
          total_fines: totalFines,
          paid_fines: paidFines,
          pending_fines: pendingFines,
          by_type: byType,
        },
        error: null,
      };
    },
    [dateFrom, dateTo]
  );
}

// ============================================================================
// VIOLATION MUTATIONS
// ============================================================================

/**
 * Record traffic violation
 */
export function useRecordViolation() {
  return useMutation<TrafficViolation, Omit<TrafficViolation, 'id' | 'organization_id' | 'vehicle' | 'employee'>>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('traffic_violations')
        .insert({
          ...input,
          status: 'pending',
        })
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Pay violation
 */
export function usePayViolation() {
  return useMutation<TrafficViolation, {
    id: string;
    paid_by: 'company' | 'employee';
    deduct_from_salary?: boolean;
    reference_number?: string;
  }>(
    async (supabase, { id, ...input }) => {
      const { data, error } = await supabase
        .from('traffic_violations')
        .update({
          ...input,
          deducted_from_salary: input.deduct_from_salary,
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Dispute violation
 */
export function useDisputeViolation() {
  return useMutation<TrafficViolation, { id: string; reason: string }>(
    async (supabase, { id, reason }) => {
      const { data, error } = await supabase
        .from('traffic_violations')
        .update({
          status: 'disputed',
          description: reason,
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

// ============================================================================
// INCIDENT HOOKS
// ============================================================================

export interface IncidentFilters {
  vehicle_id?: string;
  employee_id?: string;
  type?: string;
  severity?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Fetch incidents
 */
export function useIncidents(filters?: IncidentFilters, pagination?: PaginationParams) {
  return useQuery<PaginatedResult<Incident>>(
    async (supabase) => {
      let query = supabase
        .from('incidents')
        .select(`
          *,
          vehicle:vehicles(id, registration_number),
          employee:employees(id, full_name)
        `, { count: 'exact' });

      if (filters?.vehicle_id) {
        query = query.eq('vehicle_id', filters.vehicle_id);
      }
      if (filters?.employee_id) {
        query = query.eq('employee_id', filters.employee_id);
      }
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.date_from) {
        query = query.gte('incident_date', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('incident_date', filters.date_to);
      }

      query = query.order('incident_date', { ascending: false });

      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      query = applyPagination(query, pagination);

      const { data, error, count } = await query;

      if (error) return { data: null, error };

      return {
        data: {
          data: data || [],
          count: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize),
        },
        error: null,
      };
    },
    [JSON.stringify(filters), pagination?.page, pagination?.pageSize]
  );
}

/**
 * Fetch open incidents
 */
export function useOpenIncidents() {
  return useQuery<Incident[]>(
    async (supabase) => {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          *,
          vehicle:vehicles(id, registration_number),
          employee:employees(id, full_name)
        `)
        .in('status', ['reported', 'investigating'])
        .order('incident_date', { ascending: false });

      return { data, error };
    },
    []
  );
}

/**
 * Report incident
 */
export function useReportIncident() {
  return useMutation<Incident, Omit<Incident, 'id' | 'organization_id' | 'vehicle' | 'employee'>>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('incidents')
        .insert({
          ...input,
          status: 'reported',
        })
        .select()
        .single();

      // If vehicle involved, update its status
      if (!error && input.vehicle_id && input.severity !== 'minor') {
        await supabase
          .from('vehicles')
          .update({ status: 'maintenance' })
          .eq('id', input.vehicle_id);
      }

      return { data, error };
    }
  );
}

/**
 * Update incident status
 */
export function useUpdateIncidentStatus() {
  return useMutation<Incident, {
    id: string;
    status: 'investigating' | 'resolved' | 'closed';
    resolution_notes?: string;
    actual_cost?: number;
  }>(
    async (supabase, { id, ...input }) => {
      const { data, error } = await supabase
        .from('incidents')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}
