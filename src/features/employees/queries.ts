'use client';

import { useCallback } from 'react';
import { useSupabase, useQuery, useMutation, applyPagination, applySort } from '@/lib/supabase/hooks';
import type { PaginationParams, SortParams, PaginatedResult } from '@/lib/supabase/hooks';
import type { Employee, EmployeeStatus, EmployeeRole, RiderCategory } from './types';

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface EmployeeFilters {
  status?: EmployeeStatus;
  role?: EmployeeRole;
  rider_category?: RiderCategory;
  department_id?: string;
  search?: string;
  /** Filter by client IDs - only show employees assigned to these clients */
  clientIds?: string[] | null;
}

/**
 * Fetch paginated list of employees with filters
 */
export function useEmployees(
  filters?: EmployeeFilters,
  pagination?: PaginationParams,
  sort?: SortParams
) {
  return useQuery<PaginatedResult<Employee>>(
    async (supabase) => {
      // If filtering by clients, first get employee IDs
      let employeeIdsFromClients: string[] | null = null;
      
      if (filters?.clientIds && filters.clientIds.length > 0) {
        const { data: assignments } = await supabase
          .from('client_assignments')
          .select('employee_id')
          .in('client_id', filters.clientIds)
          .eq('status', 'active');
        
        employeeIdsFromClients = [...new Set(assignments?.map(a => a.employee_id) || [])];
        
        // If no employees assigned to selected clients, return empty
        if (employeeIdsFromClients.length === 0) {
          return {
            data: {
              data: [],
              count: 0,
              page: pagination?.page || 1,
              pageSize: pagination?.pageSize || 20,
              totalPages: 0,
            },
            error: null,
          };
        }
      }

      let query = supabase
        .from('employees')
        .select('*', { count: 'exact' });

      // Filter by employee IDs from client assignments
      if (employeeIdsFromClients) {
        query = query.in('id', employeeIdsFromClients);
      }

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.role) {
        query = query.eq('role', filters.role);
      }
      if (filters?.rider_category) {
        query = query.eq('rider_category', filters.rider_category);
      }
      if (filters?.department_id) {
        query = query.eq('department_id', filters.department_id);
      }
      if (filters?.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,employee_id.ilike.%${filters.search}%`);
      }

      // Apply sorting
      query = applySort(query, sort || { column: 'full_name', direction: 'asc' });

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
 * Fetch a single employee by ID
 */
export function useEmployee(id: string | null) {
  return useQuery<Employee>(
    async (supabase) => {
      if (!id) return { data: null, error: null };

      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          department:departments(id, name),
          assigned_vehicle:assets!assets_assigned_employee_id_fkey(id, name, license_plate),
          supervisor:employees!employees_supervisor_id_fkey(id, full_name)
        `)
        .eq('id', id)
        .single();

      return { data, error };
    },
    [id]
  );
}

/**
 * Fetch employees for dropdown/select
 */
export function useEmployeeOptions(filters?: { role?: EmployeeRole; status?: EmployeeStatus }) {
  return useQuery<{ id: string; full_name: string; employee_number: string }[]>(
    async (supabase) => {
      let query = supabase
        .from('employees')
        .select('id, full_name, employee_number')
        .eq('status', filters?.status || 'active')
        .order('full_name');

      if (filters?.role) {
        query = query.eq('role', filters.role);
      }

      const { data, error } = await query;
      return { data, error };
    },
    [filters?.role, filters?.status]
  );
}

/**
 * Fetch riders (employees with role='rider')
 */
export function useRiders(
  filters?: Omit<EmployeeFilters, 'role'>,
  pagination?: PaginationParams
) {
  return useEmployees({ ...filters, role: 'rider' }, pagination);
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export interface CreateEmployeeInput {
  full_name: string;
  email: string;
  phone?: string;
  role: EmployeeRole;
  status?: EmployeeStatus;
  hire_date?: string;
  department_id?: string;
  supervisor_id?: string;
  rider_category?: RiderCategory;
  license_number?: string;
  license_expiry?: string;
  visa_number?: string;
  visa_expiry?: string;
}

export interface UpdateEmployeeInput extends Partial<CreateEmployeeInput> {
  id: string;
}

/**
 * Create a new employee
 */
export function useCreateEmployee() {
  return useMutation<Employee, CreateEmployeeInput>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('employees')
        .insert(input)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Update an existing employee
 */
export function useUpdateEmployee() {
  return useMutation<Employee, UpdateEmployeeInput>(
    async (supabase, { id, ...input }) => {
      const { data, error } = await supabase
        .from('employees')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Soft delete an employee
 */
export function useDeleteEmployee() {
  return useMutation<Employee, string>(
    async (supabase, id) => {
      const { data, error } = await supabase
        .from('employees')
        .update({
          status: 'past',
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Activate an employee
 */
export function useActivateEmployee() {
  return useMutation<Employee, string>(
    async (supabase, id) => {
      const { data, error } = await supabase
        .from('employees')
        .update({
          status: 'active',
          activation_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

// ============================================================================
// SERVER ACTIONS (for server components)
// ============================================================================

/**
 * Server-side function to fetch employees
 */
export async function getEmployees(
  supabase: ReturnType<typeof useSupabase>,
  filters?: EmployeeFilters,
  pagination?: PaginationParams
) {
  let query = supabase
    .from('employees')
    .select('*', { count: 'exact' });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.role) {
    query = query.eq('role', filters.role);
  }
  if (filters?.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }

  query = query.order('full_name');

  if (pagination) {
    query = applyPagination(query, pagination);
  }

  return query;
}

/**
 * Server-side function to fetch a single employee
 */
export async function getEmployee(
  supabase: ReturnType<typeof useSupabase>,
  id: string
) {
  return supabase
    .from('employees')
    .select(`
      *,
      department:departments(id, name),
      assigned_vehicle:assets(id, name, license_plate)
    `)
    .eq('id', id)
    .single();
}
