/**
 * Compliance alerts types (T-024).
 * Track expiring documents and compliance status.
 */

/** Alert type */
export type AlertType =
  | 'license_expiring'
  | 'license_expired'
  | 'visa_expiring'
  | 'visa_expired'
  | 'document_expiring'
  | 'document_expired'
  | 'registration_expiring'
  | 'registration_expired'
  | 'insurance_expiring'
  | 'insurance_expired';

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  license_expiring: 'License Expiring',
  license_expired: 'License Expired',
  visa_expiring: 'Visa Expiring',
  visa_expired: 'Visa Expired',
  document_expiring: 'Document Expiring',
  document_expired: 'Document Expired',
  registration_expiring: 'Registration Expiring',
  registration_expired: 'Registration Expired',
  insurance_expiring: 'Insurance Expiring',
  insurance_expired: 'Insurance Expired',
};

/** Alert severity */
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'blocking';

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  info: 'Info (30+ days)',
  warning: 'Warning (14-30 days)',
  critical: 'Critical (7-14 days)',
  blocking: 'Blocking (expired)',
};

export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  info: 'text-blue-600 bg-blue-50',
  warning: 'text-yellow-600 bg-yellow-50',
  critical: 'text-orange-600 bg-orange-50',
  blocking: 'text-red-600 bg-red-50',
};

/**
 * Compliance alert entity.
 */
export interface ComplianceAlert {
  id: string;
  organization_id: string;
  
  // Target
  employee_id: string | null;
  asset_id: string | null;
  document_id: string | null;
  
  // Alert details
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string | null;
  expires_at: string;
  days_until_expiry: number;
  
  // Resolution
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  
  // Auto-blocking
  is_auto_blocked: boolean;
  blocked_at: string | null;
  
  // Notification
  notification_sent: boolean;
  notification_sent_at: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Joined fields
  employee?: {
    id: string;
    full_name: string;
    employee_id: string;
  };
  asset?: {
    id: string;
    name: string;
    asset_tag: string;
  };
}

/**
 * Compliance dashboard summary.
 */
export interface ComplianceDashboard {
  organization_id: string;
  compliant_count: number;
  expiring_soon_count: number;
  non_compliant_count: number;
  blocked_count: number;
  total_active_employees: number;
}

/**
 * Input for resolving an alert.
 */
export interface ResolveAlertInput {
  resolution_notes?: string;
}

/**
 * Calculate days until expiry from a date string.
 */
export function daysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get severity based on days until expiry.
 */
export function getSeverityFromDays(days: number): AlertSeverity {
  if (days < 0) return 'blocking';
  if (days <= 7) return 'critical';
  if (days <= 14) return 'warning';
  return 'info';
}
