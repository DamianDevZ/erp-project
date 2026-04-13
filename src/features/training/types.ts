/**
 * Training Module Types
 * 
 * Types for managing training courses, certifications,
 * and employee training records.
 */

export type TrainingType = 
  | 'mandatory'
  | 'skill_development'
  | 'certification'
  | 'onboarding'
  | 'safety'
  | 'compliance'
  | 'leadership'
  | 'other';

export type TrainingStatus = 
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'expired'
  | 'failed';

export type TrainingDelivery = 
  | 'in_person'
  | 'online'
  | 'hybrid'
  | 'self_paced';

export interface TrainingCourse {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  type: TrainingType;
  delivery: TrainingDelivery;
  
  // Requirements
  duration_hours: number | null;
  is_mandatory: boolean;
  requires_recertification: boolean;
  recertification_months: number | null;
  
  // Provider info
  provider: string | null;
  external_url: string | null;
  
  // Cost tracking
  cost_per_person: number | null;
  currency: string;
  
  // Status
  is_active: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface EmployeeTraining {
  id: string;
  organization_id: string;
  employee_id: string;
  course_id: string;
  
  // Assignment
  assigned_by: string | null;
  assigned_at: string;
  due_date: string | null;
  
  // Progress
  status: TrainingStatus;
  started_at: string | null;
  completed_at: string | null;
  expiry_date: string | null;
  
  // Results
  score: number | null;
  passed: boolean | null;
  certificate_url: string | null;
  certificate_number: string | null;
  
  // Notes
  notes: string | null;
  
  created_at: string;
  updated_at: string;
  
  // Joined fields
  employee?: {
    id: string;
    full_name: string;
    employee_id: string | null;
  };
  course?: TrainingCourse;
  assigner?: {
    id: string;
    full_name: string;
  } | null;
}

export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  mandatory: 'Mandatory',
  skill_development: 'Skill Development',
  certification: 'Certification',
  onboarding: 'Onboarding',
  safety: 'Safety',
  compliance: 'Compliance',
  leadership: 'Leadership',
  other: 'Other',
};

export const TRAINING_TYPE_COLORS: Record<TrainingType, string> = {
  mandatory: 'bg-red-100 text-red-800',
  skill_development: 'bg-blue-100 text-blue-800',
  certification: 'bg-purple-100 text-purple-800',
  onboarding: 'bg-green-100 text-green-800',
  safety: 'bg-orange-100 text-orange-800',
  compliance: 'bg-yellow-100 text-yellow-800',
  leadership: 'bg-indigo-100 text-indigo-800',
  other: 'bg-gray-100 text-gray-800',
};

export const TRAINING_STATUS_LABELS: Record<TrainingStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  expired: 'Expired',
  failed: 'Failed',
};

export const TRAINING_STATUS_COLORS: Record<TrainingStatus, string> = {
  not_started: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  expired: 'bg-orange-100 text-orange-800',
  failed: 'bg-red-100 text-red-800',
};

export const TRAINING_DELIVERY_LABELS: Record<TrainingDelivery, string> = {
  in_person: 'In Person',
  online: 'Online',
  hybrid: 'Hybrid',
  self_paced: 'Self-Paced',
};
