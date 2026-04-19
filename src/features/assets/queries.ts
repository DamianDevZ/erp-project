'use client';

import { useQuery, useMutation, applyPagination, applySort } from '@/lib/supabase/hooks';
import type { PaginationParams, SortParams, PaginatedResult } from '@/lib/supabase/hooks';
import type {
  Asset,
  AssetType,
  AssetOwnership,
  VehicleStatus,
  AssetMaintenance,
  AssetRental,
} from './types';

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface AssetFilters {
  type?: AssetType;
  ownership?: AssetOwnership;
  vehicle_status?: VehicleStatus;
  is_active?: boolean;
  is_spare?: boolean;
  assigned_employee_id?: string;
  search?: string;
}

/**
 * Fetch paginated list of assets with filters
 */
export function useAssets(
  filters?: AssetFilters,
  pagination?: PaginationParams,
  sort?: SortParams
) {
  return useQuery<PaginatedResult<Asset>>(
    async (supabase) => {
      let query = supabase
        .from('assets')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.ownership) {
        query = query.eq('ownership', filters.ownership);
      }
      if (filters?.vehicle_status) {
        query = query.eq('vehicle_status', filters.vehicle_status);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters?.is_spare !== undefined) {
        query = query.eq('is_spare', filters.is_spare);
      }
      if (filters?.assigned_employee_id) {
        query = query.eq('assigned_employee_id', filters.assigned_employee_id);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,license_plate.ilike.%${filters.search}%,asset_number.ilike.%${filters.search}%`);
      }

      // Apply sorting
      query = applySort(query, sort || { column: 'name', direction: 'asc' });

      // Apply pagination
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
    [JSON.stringify(filters), pagination?.page, pagination?.pageSize, sort?.column, sort?.direction]
  );
}

/**
 * Fetch a single asset by ID
 */
export function useAsset(id: string | null) {
  return useQuery<Asset>(
    async (supabase) => {
      if (!id) return { data: null, error: null };

      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          assigned_employee:employees!assets_assigned_employee_id_fkey(id, full_name, employee_number),
          owner_employee:employees!assets_owner_employee_id_fkey(id, full_name)
        `)
        .eq('id', id)
        .single();

      return { data, error };
    },
    [id]
  );
}

/**
 * Fetch vehicles (assets with type='vehicle')
 */
export function useVehicles(
  filters?: Omit<AssetFilters, 'type'>,
  pagination?: PaginationParams,
  sort?: SortParams
) {
  return useAssets({ ...filters, type: 'vehicle' }, pagination, sort);
}

/**
 * Fetch available vehicles for assignment
 */
export function useAvailableVehicles() {
  return useQuery<Asset[]>(
    async (supabase) => {
      const { data, error } = await supabase
        .from('assets')
        .select('id, name, license_plate, make, model, vehicle_status')
        .eq('type', 'vehicle')
        .eq('is_active', true)
        .in('vehicle_status', ['available', 'assigned'])
        .is('deleted_at', null)
        .order('name');

      return { data, error };
    },
    []
  );
}

/**
 * Fetch spare vehicles
 */
export function useSpareVehicles() {
  return useQuery<Asset[]>(
    async (supabase) => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('type', 'vehicle')
        .eq('is_spare', true)
        .eq('vehicle_status', 'available')
        .is('deleted_at', null)
        .order('name');

      return { data, error };
    },
    []
  );
}

/**
 * Fetch asset options for dropdowns
 */
export function useAssetOptions(filters?: { type?: AssetType }) {
  return useQuery<{ id: string; name: string; license_plate: string | null }[]>(
    async (supabase) => {
      let query = supabase
        .from('assets')
        .select('id, name, license_plate')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      const { data, error } = await query;
      return { data, error };
    },
    [filters?.type]
  );
}

// ============================================================================
// MAINTENANCE HOOKS
// ============================================================================

/**
 * Fetch maintenance records for an asset
 */
export function useAssetMaintenance(assetId: string | null) {
  return useQuery<AssetMaintenance[]>(
    async (supabase) => {
      if (!assetId) return { data: null, error: null };

      const { data, error } = await supabase
        .from('asset_maintenance')
        .select('*')
        .eq('asset_id', assetId)
        .order('performed_at', { ascending: false });

      return { data, error };
    },
    [assetId]
  );
}

/**
 * Fetch due maintenance alerts
 */
export function useMaintenanceDue() {
  return useQuery<Asset[]>(
    async (supabase) => {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('assets')
        .select('id, name, license_plate, next_service_date, next_service_km, odometer_reading')
        .eq('type', 'vehicle')
        .eq('is_active', true)
        .or(`next_service_date.lte.${nextWeek},next_service_km.lte.odometer_reading`)
        .order('next_service_date');

      return { data, error };
    },
    []
  );
}

// ============================================================================
// RENTAL HOOKS
// ============================================================================

/**
 * Fetch rental information for an asset
 */
export function useAssetRental(assetId: string | null) {
  return useQuery<AssetRental>(
    async (supabase) => {
      if (!assetId) return { data: null, error: null };

      const { data, error } = await supabase
        .from('asset_rentals')
        .select(`
          *,
          rental_company:rental_companies(id, name)
        `)
        .eq('asset_id', assetId)
        .eq('status', 'active')
        .single();

      return { data, error };
    },
    [assetId]
  );
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export interface CreateAssetInput {
  name: string;
  type: AssetType;
  ownership: AssetOwnership;
  license_plate?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  vin?: string;
  is_spare?: boolean;
}

export interface UpdateAssetInput extends Partial<CreateAssetInput> {
  id: string;
}

/**
 * Create a new asset
 */
export function useCreateAsset() {
  return useMutation<Asset, CreateAssetInput>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('assets')
        .insert(input)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Update an existing asset
 */
export function useUpdateAsset() {
  return useMutation<Asset, UpdateAssetInput>(
    async (supabase, { id, ...input }) => {
      const { data, error } = await supabase
        .from('assets')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Update vehicle status
 */
export function useUpdateVehicleStatus() {
  return useMutation<Asset, { id: string; status: VehicleStatus }>(
    async (supabase, { id, status }) => {
      const { data, error } = await supabase
        .from('assets')
        .update({ vehicle_status: status, updated_at: new Date().toISOString() })
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
  return useMutation<Asset, { assetId: string; employeeId: string }>(
    async (supabase, { assetId, employeeId }) => {
      const { data, error } = await supabase
        .from('assets')
        .update({
          assigned_employee_id: employeeId,
          vehicle_status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', assetId)
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
  return useMutation<Asset, string>(
    async (supabase, assetId) => {
      const { data, error } = await supabase
        .from('assets')
        .update({
          assigned_employee_id: null,
          vehicle_status: 'available',
          updated_at: new Date().toISOString(),
        })
        .eq('id', assetId)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Create maintenance record
 */
export function useCreateMaintenance() {
  return useMutation<AssetMaintenance, Omit<AssetMaintenance, 'id' | 'organization_id' | 'created_at'>>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('asset_maintenance')
        .insert(input)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Soft delete an asset
 */
export function useDeleteAsset() {
  return useMutation<Asset, string>(
    async (supabase, id) => {
      const { data, error } = await supabase
        .from('assets')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}
