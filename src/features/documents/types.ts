import type { RiderCategory, EmployeeRole } from '../employees/types';

export type DocumentType = 'contract' | 'id_document' | 'certification' | 'insurance' | 'training' | 'other';

/** Document verification status (T-021) */
export type DocumentStatus =
  | 'pending_upload'
  | 'uploaded'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'expired';

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending_upload: 'Pending Upload',
  uploaded: 'Uploaded',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
};

export interface EmployeeDocument {
  id: string;
  organization_id: string;
  employee_id: string;
  type: DocumentType;
  file_path: string;
  file_name: string;
  expires_at: string | null;
  created_at: string;
  // T-021: Status and tracking fields
  status: DocumentStatus;
  required_document_type_id: string | null;
  uploaded_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  notes: string | null;
  updated_at: string;
  // Joined fields
  employee?: {
    id: string;
    full_name: string;
    employee_id: string;
  };
}

export interface CreateDocumentInput {
  employee_id: string;
  type: DocumentType;
  file_path: string;
  file_name: string;
  expires_at?: string;
}

export interface UpdateDocumentInput {
  type?: DocumentType;
  file_name?: string;
  expires_at?: string;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  contract: 'Contract',
  id_document: 'ID Document',
  certification: 'Certification',
  insurance: 'Insurance',
  training: 'Training',
  other: 'Other',
};

// Helper to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper to get file icon based on name extension
export function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
  if (ext === 'pdf') return '📄';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx'].includes(ext)) return '📊';
  return '📁';
}

// ========================================
// T-021: Document Collection Checklist
// ========================================

/**
 * Required document type configuration.
 */
export interface RequiredDocumentType {
  id: string;
  organization_id: string;
  document_type: string;
  display_name: string;
  description: string | null;
  
  // Who needs this document
  required_for_role: EmployeeRole[] | null;
  required_for_category: RiderCategory[] | null;
  required_for_onboarding: boolean;
  
  // Document properties
  has_expiry: boolean;
  expiry_warning_days: number;
  allows_multiple: boolean;
  
  // Validation
  accepted_file_types: string[];
  max_file_size_mb: number;
  
  // Priority
  sort_order: number;
  is_active: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Document checklist template.
 */
export interface DocumentChecklist {
  id: string;
  organization_id: string;
  checklist_name: string;
  description: string | null;
  role: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Document checklist item (from get_employee_document_checklist function).
 */
export interface DocumentChecklistItem {
  document_type: string;
  display_name: string;
  is_required: boolean;
  status: DocumentStatus;
  document_id: string | null;
  file_name: string | null;
  expires_at: string | null;
  is_expiring_soon: boolean;
  is_expired: boolean;
}

/**
 * Document completion summary (from check_employee_documents_complete function).
 */
export interface DocumentCompletionSummary {
  total_required: number;
  total_uploaded: number;
  total_approved: number;
  total_rejected: number;
  total_expired: number;
  is_complete: boolean;
  missing_documents: string[] | null;
}

/**
 * Default document types for rider onboarding.
 */
export const DEFAULT_RIDER_DOCUMENT_TYPES: Partial<RequiredDocumentType>[] = [
  {
    document_type: 'cpr_id',
    display_name: 'CPR/National ID',
    description: 'Valid national ID or CPR card',
    has_expiry: true,
    expiry_warning_days: 60,
    sort_order: 1,
  },
  {
    document_type: 'passport',
    display_name: 'Passport',
    description: 'Valid passport (photo page)',
    has_expiry: true,
    expiry_warning_days: 90,
    sort_order: 2,
  },
  {
    document_type: 'visa',
    display_name: 'Work Visa/Permit',
    description: 'Valid work visa or residence permit',
    has_expiry: true,
    expiry_warning_days: 60,
    sort_order: 3,
  },
  {
    document_type: 'driving_license',
    display_name: 'Driving License',
    description: 'Valid motorcycle/scooter license',
    has_expiry: true,
    expiry_warning_days: 30,
    sort_order: 4,
  },
  {
    document_type: 'vehicle_registration',
    display_name: 'Vehicle Registration',
    description: 'Vehicle registration document (own-bike riders)',
    required_for_category: ['own_vehicle_rider'],
    has_expiry: true,
    expiry_warning_days: 30,
    sort_order: 5,
  },
  {
    document_type: 'vehicle_insurance',
    display_name: 'Vehicle Insurance',
    description: 'Valid insurance certificate (own-bike riders)',
    required_for_category: ['own_vehicle_rider'],
    has_expiry: true,
    expiry_warning_days: 30,
    sort_order: 6,
  },
  {
    document_type: 'profile_photo',
    display_name: 'Profile Photo',
    description: 'Recent passport-style photo',
    has_expiry: false,
    sort_order: 7,
  },
  {
    document_type: 'bank_details',
    display_name: 'Bank Account Details',
    description: 'Bank statement or IBAN letter',
    has_expiry: false,
    sort_order: 8,
  },
];

/**
 * Input for creating a required document type.
 */
export interface CreateRequiredDocumentTypeInput {
  document_type: string;
  display_name: string;
  description?: string;
  required_for_role?: EmployeeRole[];
  required_for_category?: RiderCategory[];
  required_for_onboarding?: boolean;
  has_expiry?: boolean;
  expiry_warning_days?: number;
  allows_multiple?: boolean;
  accepted_file_types?: string[];
  max_file_size_mb?: number;
  sort_order?: number;
}

/**
 * Input for reviewing a document.
 */
export interface ReviewDocumentInput {
  status: 'approved' | 'rejected';
  rejection_reason?: string;
  notes?: string;
}
