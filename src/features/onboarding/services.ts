'use client';

/**
 * Onboarding Business Logic Services (T-019)
 * 
 * Multi-step workflow: Application → Documents → Review → Training → Vehicle → Activation
 */

import { createClient } from '@/lib/supabase/client';
import type { OnboardingStep } from '../employees/types';
import type { OnboardingChecklist } from './types';
import { isValidTransition, getNextRecommendedStep } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface OnboardingEligibility {
  canProceed: boolean;
  blockers: string[];
  warnings: string[];
}

export interface DocumentCheckResult {
  documentType: string;
  displayName: string;
  isRequired: boolean;
  isUploaded: boolean;
  isApproved: boolean;
  isExpired: boolean;
  expiresAt: string | null;
}

export interface OnboardingProgress {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  pendingSteps: OnboardingStep[];
  percentComplete: number;
  estimatedDaysRemaining: number;
}

// ============================================================================
// ELIGIBILITY CHECKS
// ============================================================================

/**
 * Check if an employee can proceed to the next onboarding step.
 * Returns blockers that must be resolved and warnings for review.
 */
export async function checkOnboardingEligibility(
  employeeId: string,
  targetStep: OnboardingStep
): Promise<OnboardingEligibility> {
  const supabase = createClient();
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Fetch employee and onboarding data
  const [employeeResult, onboardingResult, documentsResult] = await Promise.all([
    supabase
      .from('employees')
      .select('*, employee_documents(*)')
      .eq('id', employeeId)
      .single(),
    supabase
      .from('onboarding_checklists')
      .select('*')
      .eq('employee_id', employeeId)
      .single(),
    supabase
      .from('employee_documents')
      .select('*')
      .eq('employee_id', employeeId),
  ]);

  const employee = employeeResult.data;
  const onboarding = onboardingResult.data;
  const documents = documentsResult.data || [];

  if (!employee) {
    return { canProceed: false, blockers: ['Employee not found'], warnings: [] };
  }

  // Step-specific eligibility checks
  switch (targetStep) {
    case 'documents_pending':
      // No blockers - can always request documents
      break;

    case 'documents_review':
      // Check required documents are uploaded
      const requiredDocs = ['cpr_id', 'driving_license', 'visa', 'passport_photo'];
      const uploadedTypes = documents.map(d => d.document_type);
      
      for (const docType of requiredDocs) {
        if (!uploadedTypes.includes(docType)) {
          blockers.push(`Missing required document: ${docType.replace('_', ' ')}`);
        }
      }
      break;

    case 'documents_approved':
      // All documents must be verified
      const pendingDocs = documents.filter(d => d.status !== 'approved');
      if (pendingDocs.length > 0) {
        blockers.push(`${pendingDocs.length} document(s) pending approval`);
      }

      // Check for expiring documents
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      for (const doc of documents) {
        if (doc.expires_at && new Date(doc.expires_at) <= thirtyDaysFromNow) {
          if (new Date(doc.expires_at) <= new Date()) {
            blockers.push(`${doc.document_type} has expired`);
          } else {
            warnings.push(`${doc.document_type} expires within 30 days`);
          }
        }
      }
      break;

    case 'training_pending':
      // Documents must be approved
      if (!onboarding?.documents_approved_at) {
        blockers.push('Documents must be approved first');
      }
      break;

    case 'training_completed':
      // Check training assignment exists
      const trainingResult = await supabase
        .from('training_assignments')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'completed');
      
      if (!trainingResult.data?.length) {
        blockers.push('No completed training records');
      }
      break;

    case 'vehicle_assignment':
      // Check training completed (if required)
      if (onboarding?.training_assigned_at && !onboarding?.training_completed_at) {
        blockers.push('Training must be completed first');
      }

      // Check rider category allows vehicle assignment
      if (employee.rider_category === 'own_vehicle_rider') {
        // Check rider has own vehicle registered
        const ownVehicleResult = await supabase
          .from('assets')
          .select('*')
          .eq('owner_employee_id', employeeId)
          .eq('ownership', 'employee_owned')
          .eq('is_active', true);
        
        if (!ownVehicleResult.data?.length) {
          blockers.push('Own vehicle must be registered and approved');
        }
      }
      break;

    case 'final_approval':
      // All prior steps must be complete
      if (!onboarding?.documents_approved_at) {
        blockers.push('Documents not approved');
      }
      
      // Vehicle assignment required for company riders
      if (employee.rider_category === 'company_vehicle_rider') {
        const assignmentResult = await supabase
          .from('rider_vehicle_assignments')
          .select('*')
          .eq('employee_id', employeeId)
          .is('end_date', null);
        
        if (!assignmentResult.data?.length) {
          blockers.push('Vehicle must be assigned');
        }
      }

      // Bank details required for payroll
      if (!employee.bank_name || !employee.bank_account_number) {
        blockers.push('Bank account details required');
      }
      break;

    case 'activated':
      // Final approval must be complete
      if (!onboarding?.final_approved_at) {
        blockers.push('Final approval required');
      }

      // Compliance documents must be valid
      const expiredDocs = documents.filter(
        d => d.expires_at && new Date(d.expires_at) < new Date()
      );
      if (expiredDocs.length > 0) {
        blockers.push(`${expiredDocs.length} document(s) have expired`);
      }
      break;

    case 'rejected':
      // Can reject from any step
      break;
  }

  return {
    canProceed: blockers.length === 0,
    blockers,
    warnings,
  };
}

// ============================================================================
// STEP TRANSITIONS
// ============================================================================

/**
 * Transition an employee to the next onboarding step.
 * Validates eligibility and records the transition.
 */
export async function transitionOnboardingStep(
  employeeId: string,
  targetStep: OnboardingStep,
  performedBy: string,
  notes?: string
): Promise<{ success: boolean; error?: string; data?: OnboardingChecklist }> {
  const supabase = createClient();

  // Get current onboarding state
  const { data: onboarding, error: fetchError } = await supabase
    .from('onboarding_checklists')
    .select('*')
    .eq('employee_id', employeeId)
    .single();

  if (fetchError || !onboarding) {
    return { success: false, error: 'Onboarding record not found' };
  }

  // Validate transition is allowed
  if (!isValidTransition(onboarding.current_step, targetStep)) {
    return { 
      success: false, 
      error: `Cannot transition from ${onboarding.current_step} to ${targetStep}` 
    };
  }

  // Check eligibility
  const eligibility = await checkOnboardingEligibility(employeeId, targetStep);
  if (!eligibility.canProceed) {
    return { 
      success: false, 
      error: `Blocked: ${eligibility.blockers.join(', ')}` 
    };
  }

  // Build update object
  const updates: Record<string, unknown> = {
    current_step: targetStep,
    updated_at: new Date().toISOString(),
  };

  // Set step-specific timestamps
  const timestampField = getTimestampField(targetStep);
  if (timestampField) {
    updates[timestampField] = new Date().toISOString();
  }

  // Set performer fields
  const performerField = getPerformerField(targetStep);
  if (performerField) {
    updates[performerField] = performedBy;
  }

  // Add notes if provided
  if (notes) {
    if (targetStep === 'rejected') {
      updates.rejection_reason = notes;
    } else {
      updates.review_notes = notes;
    }
  }

  // Execute transition
  const { data, error } = await supabase
    .from('onboarding_checklists')
    .update(updates)
    .eq('id', onboarding.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Update employee status if activated
  if (targetStep === 'activated') {
    await supabase
      .from('employees')
      .update({ 
        status: 'active',
        onboarding_step: 'activated',
        start_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', employeeId);
  }

  // Update employee status if rejected
  if (targetStep === 'rejected') {
    await supabase
      .from('employees')
      .update({ 
        status: 'past',
        onboarding_step: 'rejected',
      })
      .eq('id', employeeId);
  }

  // Log the transition
  await logOnboardingEvent(onboarding.id, onboarding.current_step, targetStep, performedBy, notes);

  return { success: true, data };
}

// ============================================================================
// DOCUMENT CHECKLIST
// ============================================================================

/**
 * Get document checklist status for an employee.
 */
export async function getDocumentChecklist(
  employeeId: string
): Promise<DocumentCheckResult[]> {
  const supabase = createClient();

  // Get required documents for role
  const { data: employee } = await supabase
    .from('employees')
    .select('role, rider_category')
    .eq('id', employeeId)
    .single();

  // Get uploaded documents
  const { data: documents } = await supabase
    .from('employee_documents')
    .select('*')
    .eq('employee_id', employeeId);

  // Define required documents by role
  const requiredDocs: Record<string, { type: string; name: string; required: boolean }[]> = {
    rider: [
      { type: 'cpr_id', name: 'CPR/National ID', required: true },
      { type: 'driving_license', name: 'Driving License', required: true },
      { type: 'visa', name: 'Work Visa', required: true },
      { type: 'passport_photo', name: 'Passport Photo', required: true },
      { type: 'bank_details', name: 'Bank Account Details', required: true },
      { type: 'medical_certificate', name: 'Medical Certificate', required: false },
    ],
    supervisor: [
      { type: 'cpr_id', name: 'CPR/National ID', required: true },
      { type: 'visa', name: 'Work Visa', required: true },
    ],
  };

  const role = employee?.role || 'rider';
  const required = requiredDocs[role] || requiredDocs.rider;
  const uploadedMap = new Map(documents?.map(d => [d.document_type, d]) || []);

  return required.map(req => {
    const uploaded = uploadedMap.get(req.type);
    return {
      documentType: req.type,
      displayName: req.name,
      isRequired: req.required,
      isUploaded: !!uploaded,
      isApproved: uploaded?.status === 'approved',
      isExpired: uploaded?.expires_at ? new Date(uploaded.expires_at) < new Date() : false,
      expiresAt: uploaded?.expires_at || null,
    };
  });
}

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

/**
 * Get onboarding progress for an employee.
 */
export async function getOnboardingProgress(
  employeeId: string
): Promise<OnboardingProgress | null> {
  const supabase = createClient();

  const { data: onboarding } = await supabase
    .from('onboarding_checklists')
    .select('*')
    .eq('employee_id', employeeId)
    .single();

  if (!onboarding) return null;

  const allSteps: OnboardingStep[] = [
    'application_submitted',
    'documents_pending',
    'documents_uploaded',
    'documents_review',
    'documents_approved',
    'training_pending',
    'training_completed',
    'vehicle_assignment',
    'final_approval',
    'activated',
  ];

  const currentIndex = allSteps.indexOf(onboarding.current_step);
  const completedSteps = allSteps.slice(0, currentIndex);
  const pendingSteps = allSteps.slice(currentIndex + 1);

  // Estimate days remaining based on typical step durations
  const avgDaysPerStep: Record<OnboardingStep, number> = {
    application_submitted: 0,
    documents_pending: 3,
    documents_uploaded: 1,
    documents_review: 2,
    documents_approved: 1,
    training_pending: 2,
    training_completed: 1,
    vehicle_assignment: 1,
    final_approval: 1,
    activated: 0,
    rejected: 0,
  };

  const estimatedDays = pendingSteps.reduce(
    (sum, step) => sum + (avgDaysPerStep[step] || 1),
    0
  );

  return {
    currentStep: onboarding.current_step,
    completedSteps,
    pendingSteps,
    percentComplete: Math.round((currentIndex / (allSteps.length - 1)) * 100),
    estimatedDaysRemaining: estimatedDays,
  };
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Get all pending onboarding by step for dashboard.
 */
export async function getPendingOnboardingByStep(): Promise<Record<OnboardingStep, number>> {
  const supabase = createClient();

  const { data } = await supabase
    .from('onboarding_checklists')
    .select('current_step')
    .not('current_step', 'in', '(activated,rejected)');

  const counts: Record<string, number> = {};
  (data || []).forEach(record => {
    counts[record.current_step] = (counts[record.current_step] || 0) + 1;
  });

  return counts as Record<OnboardingStep, number>;
}

/**
 * Get employees stuck in onboarding (over X days in same step).
 */
export async function getStuckOnboarding(daysThreshold: number = 7): Promise<
  Array<{ employeeId: string; employeeName: string; step: OnboardingStep; daysInStep: number }>
> {
  const supabase = createClient();
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

  const { data } = await supabase
    .from('onboarding_checklists')
    .select(`
      employee_id,
      current_step,
      updated_at,
      employee:employees(full_name)
    `)
    .not('current_step', 'in', '(activated,rejected)')
    .lt('updated_at', thresholdDate.toISOString());

  return (data || []).map(record => {
    // Relations may come as arrays from Supabase
    const employeeData = record.employee as unknown;
    const employee = (Array.isArray(employeeData) ? employeeData[0] : employeeData) as { full_name: string } | null;
    return {
      employeeId: record.employee_id,
      employeeName: employee?.full_name || 'Unknown',
      step: record.current_step,
      daysInStep: Math.floor(
        (Date.now() - new Date(record.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      ),
    };
  });
}

// ============================================================================
// HELPERS
// ============================================================================

function getTimestampField(step: OnboardingStep): string | null {
  const map: Record<OnboardingStep, string | null> = {
    application_submitted: 'application_submitted_at',
    documents_pending: 'documents_requested_at',
    documents_uploaded: 'documents_uploaded_at',
    documents_review: 'documents_reviewed_at',
    documents_approved: 'documents_approved_at',
    training_pending: 'training_assigned_at',
    training_completed: 'training_completed_at',
    vehicle_assignment: 'vehicle_assigned_at',
    final_approval: 'final_approved_at',
    activated: 'activated_at',
    rejected: 'rejected_at',
  };
  return map[step];
}

function getPerformerField(step: OnboardingStep): string | null {
  const map: Partial<Record<OnboardingStep, string>> = {
    documents_review: 'documents_reviewed_by',
    documents_approved: 'documents_approved_by',
    final_approval: 'final_approved_by',
    rejected: 'rejected_by',
  };
  return map[step] || null;
}

async function logOnboardingEvent(
  onboardingId: string,
  fromStep: OnboardingStep,
  toStep: OnboardingStep,
  performedBy: string,
  notes?: string
): Promise<void> {
  const supabase = createClient();
  
  await supabase.from('audit_logs').insert({
    table_name: 'onboarding_checklists',
    record_id: onboardingId,
    operation: 'UPDATE',
    new_data: { from_step: fromStep, to_step: toStep, notes },
    performed_by: performedBy,
  });
}
