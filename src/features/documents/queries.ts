'use client';

import { useQuery, useMutation } from '@/lib/supabase/hooks';
import type { EmployeeDocument, DocumentType, DocumentChecklist, DocumentChecklistItem } from './types';

// ============================================================================
// DOCUMENT HOOKS
// ============================================================================

export interface DocumentFilters {
  employee_id?: string;
  asset_id?: string;
  type?: DocumentType;
  is_expired?: boolean;
}

/**
 * Fetch documents for an employee
 */
export function useEmployeeDocuments(employeeId: string | null) {
  return useQuery<EmployeeDocument[]>(
    async (supabase) => {
      if (!employeeId) return { data: null, error: null };

      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      return { data, error };
    },
    [employeeId]
  );
}

/**
 * Fetch expiring documents (within 30 days)
 */
export function useExpiringDocuments() {
  return useQuery<EmployeeDocument[]>(
    async (supabase) => {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('employee_documents')
        .select(`
          *,
          employee:employees(id, full_name, employee_number)
        `)
        .not('expires_at', 'is', null)
        .lte('expires_at', thirtyDaysFromNow.toISOString().split('T')[0])
        .gte('expires_at', today.toISOString().split('T')[0])
        .order('expires_at');

      return { data, error };
    },
    []
  );
}

/**
 * Fetch expired documents
 */
export function useExpiredDocuments() {
  return useQuery<EmployeeDocument[]>(
    async (supabase) => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('employee_documents')
        .select(`
          *,
          employee:employees(id, full_name, employee_number)
        `)
        .not('expires_at', 'is', null)
        .lt('expires_at', today)
        .order('expires_at');

      return { data, error };
    },
    []
  );
}

// ============================================================================
// CHECKLIST HOOKS
// ============================================================================

/**
 * Fetch document checklist templates
 */
export function useDocumentChecklists() {
  return useQuery<DocumentChecklist[]>(
    async (supabase) => {
      const { data, error } = await supabase
        .from('document_checklists')
        .select('*')
        .eq('is_active', true)
        .order('checklist_name');

      return { data, error };
    },
    []
  );
}

/**
 * Fetch checklist items for an employee's onboarding
 */
export function useEmployeeChecklistItems(employeeId: string | null) {
  return useQuery<DocumentChecklistItem[]>(
    async (supabase) => {
      if (!employeeId) return { data: null, error: null };

      const { data, error } = await supabase
        .from('document_checklist_items')
        .select(`
          *,
          document:employee_documents(id, file_name, file_path)
        `)
        .eq('employee_id', employeeId)
        .order('is_required', { ascending: false })
        .order('item_order');

      return { data, error };
    },
    [employeeId]
  );
}

/**
 * Fetch document checklist progress
 */
export function useChecklistProgress(employeeId: string | null) {
  return useQuery<{ total: number; completed: number; required: number; required_completed: number }>(
    async (supabase) => {
      if (!employeeId) return { data: null, error: null };

      const { data, error } = await supabase
        .from('document_checklist_items')
        .select('is_required, is_submitted, is_verified')
        .eq('employee_id', employeeId);

      if (error) return { data: null, error };

      const progress = {
        total: data?.length || 0,
        completed: data?.filter(i => i.is_verified).length || 0,
        required: data?.filter(i => i.is_required).length || 0,
        required_completed: data?.filter(i => i.is_required && i.is_verified).length || 0,
      };

      return { data: progress, error: null };
    },
    [employeeId]
  );
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Upload a document
 */
export function useUploadDocument() {
  return useMutation<EmployeeDocument, {
    employee_id: string;
    type: DocumentType;
    file_name: string;
    file_path: string;
    expires_at?: string;
  }>(
    async (supabase, input) => {
      const { data, error } = await supabase
        .from('employee_documents')
        .insert(input)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Update document expiry
 */
export function useUpdateDocumentExpiry() {
  return useMutation<EmployeeDocument, { id: string; expires_at: string }>(
    async (supabase, { id, expires_at }) => {
      const { data, error } = await supabase
        .from('employee_documents')
        .update({ expires_at })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Delete a document
 */
export function useDeleteDocument() {
  return useMutation<null, string>(
    async (supabase, id) => {
      const { error } = await supabase
        .from('employee_documents')
        .delete()
        .eq('id', id);

      return { data: null, error };
    }
  );
}

/**
 * Mark checklist item as submitted
 */
export function useSubmitChecklistItem() {
  return useMutation<DocumentChecklistItem, { id: string; document_id: string }>(
    async (supabase, { id, document_id }) => {
      const { data, error } = await supabase
        .from('document_checklist_items')
        .update({
          is_submitted: true,
          submitted_at: new Date().toISOString(),
          document_id,
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Verify a checklist item
 */
export function useVerifyChecklistItem() {
  return useMutation<DocumentChecklistItem, { id: string; verified_by: string }>(
    async (supabase, { id, verified_by }) => {
      const { data, error } = await supabase
        .from('document_checklist_items')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          verified_by,
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}

/**
 * Reject a checklist item
 */
export function useRejectChecklistItem() {
  return useMutation<DocumentChecklistItem, { id: string; rejection_reason: string }>(
    async (supabase, { id, rejection_reason }) => {
      const { data, error } = await supabase
        .from('document_checklist_items')
        .update({
          is_submitted: false,
          submitted_at: null,
          document_id: null,
          rejection_reason,
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    }
  );
}
