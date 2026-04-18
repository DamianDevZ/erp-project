/**
 * Onboarding types and interfaces (T-019).
 * Tracks rider onboarding workflow from application to activation.
 */

import type { OnboardingStep } from '../employees/types';

/**
 * Onboarding checklist entity as stored in the database.
 */
export interface OnboardingChecklist {
  id: string;
  organization_id: string;
  employee_id: string;
  current_step: OnboardingStep;
  
  // Step completion timestamps
  application_submitted_at: string;
  documents_requested_at: string | null;
  documents_uploaded_at: string | null;
  documents_reviewed_at: string | null;
  documents_approved_at: string | null;
  training_assigned_at: string | null;
  training_completed_at: string | null;
  vehicle_assigned_at: string | null;
  final_approved_at: string | null;
  activated_at: string | null;
  rejected_at: string | null;
  
  // Users who performed actions
  documents_reviewed_by: string | null;
  documents_approved_by: string | null;
  final_approved_by: string | null;
  rejected_by: string | null;
  
  // Notes
  review_notes: string | null;
  rejection_reason: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Onboarding step transition with allowed next steps.
 */
export const ONBOARDING_TRANSITIONS: Record<OnboardingStep, OnboardingStep[]> = {
  application_submitted: ['documents_pending', 'rejected'],
  documents_pending: ['documents_uploaded', 'rejected'],
  documents_uploaded: ['documents_review', 'rejected'],
  documents_review: ['documents_approved', 'documents_pending', 'rejected'], // Can send back for more docs
  documents_approved: ['training_pending', 'vehicle_assignment', 'rejected'],
  training_pending: ['training_completed', 'rejected'],
  training_completed: ['vehicle_assignment', 'final_approval', 'rejected'],
  vehicle_assignment: ['final_approval', 'rejected'],
  final_approval: ['activated', 'rejected'],
  activated: [], // Terminal state
  rejected: [], // Terminal state
};

/**
 * Check if a transition between steps is valid.
 */
export function isValidTransition(from: OnboardingStep, to: OnboardingStep): boolean {
  return ONBOARDING_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get the next recommended step in the onboarding flow.
 */
export function getNextRecommendedStep(current: OnboardingStep): OnboardingStep | null {
  const transitions = ONBOARDING_TRANSITIONS[current];
  if (!transitions || transitions.length === 0) return null;
  // Return the first non-rejected option
  return transitions.find(s => s !== 'rejected') ?? null;
}

/**
 * Onboarding step configuration for UI display.
 */
export interface OnboardingStepConfig {
  step: OnboardingStep;
  label: string;
  description: string;
  requiresAction: boolean;
  actionLabel?: string;
}

export const ONBOARDING_STEP_CONFIG: OnboardingStepConfig[] = [
  {
    step: 'application_submitted',
    label: 'Application',
    description: 'New rider application submitted',
    requiresAction: true,
    actionLabel: 'Request Documents',
  },
  {
    step: 'documents_pending',
    label: 'Documents Pending',
    description: 'Waiting for rider to upload documents',
    requiresAction: false,
  },
  {
    step: 'documents_uploaded',
    label: 'Documents Uploaded',
    description: 'Documents uploaded, ready for review',
    requiresAction: true,
    actionLabel: 'Review Documents',
  },
  {
    step: 'documents_review',
    label: 'Under Review',
    description: 'Documents being reviewed',
    requiresAction: true,
    actionLabel: 'Approve Documents',
  },
  {
    step: 'documents_approved',
    label: 'Documents Approved',
    description: 'All documents verified',
    requiresAction: true,
    actionLabel: 'Assign Training',
  },
  {
    step: 'training_pending',
    label: 'Training Pending',
    description: 'Waiting for training completion',
    requiresAction: false,
  },
  {
    step: 'training_completed',
    label: 'Training Completed',
    description: 'Training finished successfully',
    requiresAction: true,
    actionLabel: 'Assign Vehicle',
  },
  {
    step: 'vehicle_assignment',
    label: 'Vehicle Assignment',
    description: 'Vehicle being assigned to rider',
    requiresAction: true,
    actionLabel: 'Final Approval',
  },
  {
    step: 'final_approval',
    label: 'Final Approval',
    description: 'Final review before activation',
    requiresAction: true,
    actionLabel: 'Activate Rider',
  },
  {
    step: 'activated',
    label: 'Activated',
    description: 'Rider is active and ready to work',
    requiresAction: false,
  },
  {
    step: 'rejected',
    label: 'Rejected',
    description: 'Application rejected',
    requiresAction: false,
  },
];
