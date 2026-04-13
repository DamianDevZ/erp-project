/**
 * Coaching types and interfaces.
 */

/**
 * Coaching session entity.
 */
export interface Coaching {
  id: string;
  organization_id: string;
  employee_id: string;
  coached_by: string | null;
  coaching_date: string;
  notes: string | null;
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
  coaching_date?: string;
  notes?: string;
}

/**
 * Input for updating an existing coaching session.
 */
export interface UpdateCoachingInput {
  employee_id?: string;
  coaching_date?: string;
  notes?: string;
}
