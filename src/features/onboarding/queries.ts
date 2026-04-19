'use client';

import { useQuery, useMutation } from '@/lib/supabase/hooks';
import type { OnboardingStep } from '../employees/types';
import type { OnboardingChecklist } from './types';

// ============================================================================
// ONBOARDING HOOKS
// ============================================================================

// Type alias for compatibility
type RiderOnboarding = OnboardingChecklist;
type OnboardingStatus = OnboardingStep;

export interface OnboardingFilters {
  status?: OnboardingStatus;
  assigned_to?: string;
}

/**
 * Fetch all onboarding records with filters
 */
export function useOnboardingRecords(filters?: OnboardingFilters) {
  return useQuery<RiderOnboarding[]>(
    async (supabase) => {
      let query = supabase
        .from('rider_onboarding')
        .select(`
          *,
          employee:employees(id, full_name, email, phone),
          assigned_user:user_profiles!rider_onboarding_assigned_to_fkey(id, full_name)
        `);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      return { data, error };
    },
    [filters?.status, filters?.assigned_to]
  );
}

/**
 * Fetch pending onboarding (not yet completed)
 */
export function usePendingOnboarding() {
  return useQuery<RiderOnboarding[]>(
    async (supabase) => {
      const { data, error } = await supabase
        .from('rider_onboarding')
        .select(`
          *,
          employee:employees(id, full_name, email)
        `)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      return { data, error };
    },
    []
  );
}

/**
 * Fetch onboarding record for an employee
 */
export function useEmployeeOnboarding(employeeId: string | null) {
  return useQuery<RiderOnboarding>(
    async (supabase) => {
      if (!employeeId) return { data: null, error: null };

      const { data, error } = await supabase
        .from('rider_onboarding')
        .select('*')
        .eq('employee_id', employeeId)
        .single();

      return { data, error };
    },
    [employeeId]
  );
}

/**
 * Fetch onboarding steps for an employee
 */
export function useOnboardingSteps(onboardingId: string | null) {
  return useQuery<OnboardingStep[]>(
    async (supabase) => {
      if (!onboardingId) return { data: null, error: null };

      const { data, error } = await supabase
        .from('onboarding_steps')
        .select('*')
        .eq('onboarding_id', onboardingId)
        .order('step_order');

      return { data, error };
    },
    [onboardingId]
  );
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Start onboarding for an employee
 */
export function useStartOnboarding() {
  return useMutation<RiderOnboarding, { employee_id: string; assigned_to?: string }>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('rider_onboarding')
        .insert({
          ...input,
          status: 'pending_documents',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Update onboarding status
 */
export function useUpdateOnboardingStatus() {
  return useMutation<RiderOnboarding, { id: string; status: OnboardingStatus }>(
    async (supabase, { id, status }) => {
      const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'activated') {
        updates.activated_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('rider_onboarding')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Complete an onboarding step
 */
export function useCompleteOnboardingStep() {
  return useMutation<OnboardingStep, { id: string; notes?: string }>(
    async (supabase, { id, notes }) => {
      const { data, error } = await supabase
        .from('onboarding_steps')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          notes,
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}
