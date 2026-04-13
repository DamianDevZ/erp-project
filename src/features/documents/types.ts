export type DocumentType = 'contract' | 'id_document' | 'certification' | 'insurance' | 'training' | 'other';

export interface EmployeeDocument {
  id: string;
  organization_id: string;
  employee_id: string;
  type: DocumentType;
  file_path: string;
  file_name: string;
  expires_at: string | null;
  created_at: string;
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
