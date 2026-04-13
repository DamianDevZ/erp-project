/**
 * Coaching types and interfaces.
 * Enhanced to support multiple coaching types, dual notes, acknowledgment, and outcomes.
 */

/**
 * Type of coaching session
 */
export type CoachingType = 
  | 'corrective'      // Addressing performance or behavior issues
  | 'goal_setting'    // Setting objectives and targets
  | 'performance_review' // Regular performance discussion
  | 'one_on_one'      // General 1:1 meeting
  | 'training'        // Skills development
  | 'other';

export const COACHING_TYPE_LABELS: Record<CoachingType, string> = {
  corrective: 'Corrective Action',
  goal_setting: 'Goal Setting',
  performance_review: 'Performance Review',
  one_on_one: '1-on-1 Meeting',
  training: 'Training',
  other: 'Other',
};

/**
 * Outcome of the coaching based on manager evaluation
 */
export type CoachingOutcome = 
  | 'exceeded'        // Exceeded expectations
  | 'met'             // Met expectations
  | 'needs_improvement' // Needs improvement
  | 'unacceptable'    // Unacceptable performance
  | 'pending';        // Not yet evaluated

export const COACHING_OUTCOME_LABELS: Record<CoachingOutcome, string> = {
  exceeded: 'Exceeded Expectations',
  met: 'Met Expectations',
  needs_improvement: 'Needs Improvement',
  unacceptable: 'Unacceptable',
  pending: 'Pending Evaluation',
};

/**
 * Status of the coaching session
 */
export type CoachingStatus = 
  | 'draft'           // Not yet scheduled
  | 'scheduled'       // Scheduled for future
  | 'completed'       // Session completed, awaiting acknowledgment
  | 'acknowledged';   // Employee acknowledged

export const COACHING_STATUS_LABELS: Record<CoachingStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  completed: 'Completed',
  acknowledged: 'Acknowledged',
};

/**
 * Coaching session entity.
 */
export interface Coaching {
  id: string;
  organization_id: string;
  employee_id: string;
  coached_by: string | null;
  
  // Enhanced fields
  coaching_type: CoachingType;
  coaching_date: string;
  status: CoachingStatus;
  
  // Notes
  manager_notes: string | null;   // Manager's observations and feedback
  employee_notes: string | null;  // Employee's response and input
  
  // Legacy notes field (for backwards compatibility)
  notes: string | null;
  
  // Acknowledgment
  employee_acknowledged: boolean;
  acknowledged_at: string | null;
  
  // Outcome
  outcome: CoachingOutcome;
  outcome_notes: string | null;   // Explanation of the outcome
  
  // Follow-up
  follow_up_date: string | null;  // When to follow up
  
  created_at: string;
  updated_at: string;
}

/**
 * Coaching with related data.
 */
export interface CoachingWithRelations extends Coaching {
  employee?: {
    id: string;
    full_name: string;
    employee_id: string | null;
  };
  coach?: {
    id: string;
    full_name: string;
  };
}

/**
 * Input for creating a new coaching session.
 */
export interface CreateCoachingInput {
  employee_id: string;
  coaching_type?: CoachingType;
  coaching_date?: string;
  status?: CoachingStatus;
  manager_notes?: string;
  employee_notes?: string;
  notes?: string;
  outcome?: CoachingOutcome;
  outcome_notes?: string;
  follow_up_date?: string;
}

/**
 * Input for updating an existing coaching session.
 */
export interface UpdateCoachingInput {
  employee_id?: string;
  coaching_type?: CoachingType;
  coaching_date?: string;
  status?: CoachingStatus;
  manager_notes?: string;
  employee_notes?: string;
  notes?: string;
  employee_acknowledged?: boolean;
  acknowledged_at?: string;
  outcome?: CoachingOutcome;
  outcome_notes?: string;
  follow_up_date?: string;
}
