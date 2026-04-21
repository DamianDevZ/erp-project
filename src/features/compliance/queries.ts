'use client';

import { useQuery, useMutation } from '@/lib/supabase/hooks';
import type { ComplianceAlert, ComplianceStatus } from './types';

// ============================================================================
// COMPLIANCE HOOKS
// ============================================================================

export interface ComplianceFilters {
  status?: ComplianceStatus;
  entity_type?: 'employee' | 'asset';
  alert_type?: string;
  is_resolved?: boolean;
}

/**
 * Fetch compliance alerts with filters
 */
export function useComplianceAlerts(filters?: ComplianceFilters) {
  return useQuery<ComplianceAlert[]>(
    async (supabase) => {
      let query = supabase
        .from('compliance_alerts')
        .select(`
          *,
          employee:employees(id, full_name, employee_number),
          asset:assets(id, name, license_plate)
        `);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.entity_type === 'employee') {
        query = query.not('employee_id', 'is', null);
      } else if (filters?.entity_type === 'asset') {
        query = query.not('asset_id', 'is', null);
      }
      if (filters?.alert_type) {
        query = query.eq('alert_type', filters.alert_type);
      }
      if (filters?.is_resolved !== undefined) {
        query = query.eq('is_resolved', filters.is_resolved);
      }

      query = query.order('expires_at', { ascending: true });

      const { data, error } = await query;
      return { data, error };
    },
    [filters?.status, filters?.entity_type, filters?.alert_type, filters?.is_resolved]
  );
}

/**
 * Fetch active (unresolved) compliance alerts
 */
export function useActiveComplianceAlerts() {
  return useComplianceAlerts({ status: 'open' as any });
}

/**
 * Fetch expiring soon alerts (within 30 days)
 */
export function useExpiringSoonAlerts() {
  return useQuery<ComplianceAlert[]>(
    async (supabase) => {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('compliance_alerts')
        .select(`
          *,
          employee:employees(id, full_name),
          asset:assets(id, name, license_plate)
        `)
        .in('status', ['open', 'acknowledged'])
        .lte('expires_at', thirtyDaysFromNow.toISOString().split('T')[0])
        .gte('expires_at', today.toISOString().split('T')[0])
        .order('expires_at');

      return { data, error };
    },
    []
  );
}

/**
 * Fetch compliance alerts for an employee
 */
export function useEmployeeComplianceAlerts(employeeId: string | null) {
  return useQuery<ComplianceAlert[]>(
    async (supabase) => {
      if (!employeeId) return { data: null, error: null };

      const { data, error } = await supabase
        .from('compliance_alerts')
        .select('*')
        .eq('employee_id', employeeId)
        .order('expires_at');

      return { data, error };
    },
    [employeeId]
  );
}

/**
 * Fetch compliance alerts for an asset
 */
export function useAssetComplianceAlerts(assetId: string | null) {
  return useQuery<ComplianceAlert[]>(
    async (supabase) => {
      if (!assetId) return { data: null, error: null };

      const { data, error } = await supabase
        .from('compliance_alerts')
        .select('*')
        .eq('asset_id', assetId)
        .order('expires_at');

      return { data, error };
    },
    [assetId]
  );
}

/**
 * Fetch compliance summary counts
 */
export function useComplianceSummary() {
  return useQuery<{
    compliant: number;
    expiring_soon: number;
    non_compliant: number;
    blocked: number;
  }>(
    async (supabase) => {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('compliance_alerts')
        .select('status, severity, expires_at')
        .in('status', ['open', 'acknowledged']);

      if (error) return { data: null, error };

      const summary = {
        compliant: 0,
        expiring_soon: 0,
        non_compliant: 0,
        blocked: 0,
      };

      data?.forEach(alert => {
        const expiryDate = new Date(alert.expires_at);
        if (expiryDate < today) {
          summary.non_compliant++;
        } else if (expiryDate <= thirtyDaysFromNow) {
          summary.expiring_soon++;
        } else {
          summary.compliant++;
        }

        if (alert.severity === 'blocking') {
          summary.blocked++;
        }
      });

      return { data: summary, error: null };
    },
    []
  );
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Resolve a compliance alert
 */
export function useResolveComplianceAlert() {
  return useMutation<ComplianceAlert, { id: string; resolution_notes?: string }>(
    async (supabase, { id, resolution_notes }) => {
      const { data, error } = await supabase
        .from('compliance_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes,
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Create a compliance alert
 */
export function useCreateComplianceAlert() {
  return useMutation<ComplianceAlert, {
    entity_type: 'employee' | 'asset';
    employee_id?: string;
    asset_id?: string;
    alert_type: string;
    document_type?: string;
    expiry_date: string;
    compliance_status: ComplianceStatus;
  }>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('compliance_alerts')
        .insert(input)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Snooze a compliance alert
 */
export function useSnoozeComplianceAlert() {
  return useMutation<ComplianceAlert, { id: string; snooze_until: string }>(
    async (supabase, { id, snooze_until }) => {
      const { data, error } = await supabase
        .from('compliance_alerts')
        .update({
          snoozed_until: snooze_until,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}
