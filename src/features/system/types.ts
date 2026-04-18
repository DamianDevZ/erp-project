/**
 * System & Admin Types
 * T-089 to T-100
 */

// ============================================================================
// ENUMS
// ============================================================================

export type NotificationChannel =
  | 'in_app'
  | 'email'
  | 'sms'
  | 'push'
  | 'whatsapp'
  | 'slack'
  | 'webhook';

export type NotificationStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'cancelled';

export type IntegrationStatus =
  | 'active'
  | 'inactive'
  | 'error'
  | 'pending_setup'
  | 'suspended';

export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

export type BatchType = 'import' | 'export';

export type BatchStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type JobExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled';

// ============================================================================
// AUDIT LOGS (T-089)
// ============================================================================

export interface AuditLog {
  id: string;
  organization_id: string | null;
  
  user_id: string | null;
  user_email: string | null;
  
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changes: AuditChange | null;
  
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  
  success: boolean;
  error_message: string | null;
  
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditChange {
  [key: string]: {
    old: unknown;
    new: unknown;
  };
}

export interface AuditLogFilter {
  organization_id?: string;
  user_id?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  success?: boolean;
  from_date?: string;
  to_date?: string;
}

// ============================================================================
// NOTIFICATIONS (T-090)
// ============================================================================

export interface Notification {
  id: string;
  organization_id: string;
  
  recipient_user_id: string | null;
  recipient_employee_id: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  
  channel: NotificationChannel;
  
  notification_type: string;
  title: string;
  message: string;
  html_content: string | null;
  
  entity_type: string | null;
  entity_id: string | null;
  action_url: string | null;
  
  status: NotificationStatus;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  
  scheduled_for: string | null;
  expires_at: string | null;
  
  retry_count: number;
  max_retries: number;
  
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  organization_id: string | null;
  
  template_code: string;
  template_name: string;
  
  notification_type: string;
  channel: NotificationChannel;
  
  subject_template: string | null;
  body_template: string;
  html_template: string | null;
  
  variables: TemplateVariable[];
  
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  name: string;
  description?: string;
  required?: boolean;
  default_value?: string;
}

export interface CreateNotificationRequest {
  recipient_employee_id?: string;
  recipient_email?: string;
  recipient_phone?: string;
  channel: NotificationChannel;
  notification_type: string;
  title: string;
  message: string;
  html_content?: string;
  entity_type?: string;
  entity_id?: string;
  action_url?: string;
  scheduled_for?: string;
}

// ============================================================================
// ORGANIZATION SETTINGS (T-091)
// ============================================================================

export interface OrganizationSetting {
  id: string;
  organization_id: string;
  
  setting_key: string;
  setting_value: unknown;
  setting_type: string;
  
  category: string | null;
  description: string | null;
  
  is_encrypted: boolean;
  is_public: boolean;
  
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettingDefinition {
  key: string;
  label: string;
  description?: string;
  category: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'select';
  default_value?: unknown;
  options?: { label: string; value: string | number }[];
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface SettingsCategory {
  key: string;
  label: string;
  description?: string;
  icon?: string;
  settings: SettingDefinition[];
}

// ============================================================================
// API KEYS (T-092)
// ============================================================================

export interface ApiKey {
  id: string;
  organization_id: string;
  
  name: string;
  key_prefix: string;
  key_hash: string;
  
  scopes: string[];
  rate_limit_per_minute: number;
  
  status: ApiKeyStatus;
  
  expires_at: string | null;
  last_used_at: string | null;
  
  total_requests: number;
  
  created_by: string | null;
  revoked_by: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes?: string[];
  rate_limit_per_minute?: number;
  expires_at?: string;
}

export interface CreateApiKeyResponse {
  api_key: ApiKey;
  secret_key: string; // Only returned on creation
}

export interface ApiKeyScope {
  key: string;
  label: string;
  description: string;
  category: string;
}

// ============================================================================
// INTEGRATIONS (T-093)
// ============================================================================

export interface Integration {
  id: string;
  organization_id: string;
  
  integration_code: string;
  integration_name: string;
  provider: string;
  
  config: Record<string, unknown>;
  credentials: Record<string, unknown>;
  
  status: IntegrationStatus;
  last_sync_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  
  base_url: string | null;
  webhook_url: string | null;
  callback_url: string | null;
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationLog {
  id: string;
  organization_id: string;
  integration_id: string;
  
  direction: 'inbound' | 'outbound';
  endpoint: string | null;
  method: string | null;
  
  request_headers: Record<string, string> | null;
  request_body: unknown;
  
  response_status: number | null;
  response_headers: Record<string, string> | null;
  response_body: unknown;
  
  duration_ms: number | null;
  success: boolean | null;
  error_message: string | null;
  
  created_at: string;
}

export interface IntegrationProvider {
  code: string;
  name: string;
  description: string;
  logo_url?: string;
  category: string;
  config_schema: Record<string, unknown>;
  credential_fields: CredentialField[];
  features: string[];
}

export interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'textarea';
  required: boolean;
  placeholder?: string;
}

// ============================================================================
// SCHEDULED JOBS (T-094)
// ============================================================================

export interface ScheduledJob {
  id: string;
  organization_id: string | null;
  
  job_name: string;
  job_type: string;
  
  cron_expression: string | null;
  interval_seconds: number | null;
  next_run_at: string | null;
  
  job_config: Record<string, unknown>;
  
  is_active: boolean;
  is_running: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_duration_ms: number | null;
  last_error: string | null;
  
  run_count: number;
  failure_count: number;
  
  created_at: string;
  updated_at: string;
}

export interface JobExecution {
  id: string;
  job_id: string;
  
  started_at: string;
  completed_at: string | null;
  
  status: JobExecutionStatus;
  duration_ms: number | null;
  
  records_processed: number | null;
  records_failed: number | null;
  
  result: Record<string, unknown> | null;
  error_message: string | null;
  error_stack: string | null;
  
  created_at: string;
}

export interface CreateJobRequest {
  job_name: string;
  job_type: string;
  cron_expression?: string;
  interval_seconds?: number;
  job_config?: Record<string, unknown>;
}

// ============================================================================
// FILE UPLOADS (T-095)
// ============================================================================

export interface FileUpload {
  id: string;
  organization_id: string;
  
  file_name: string;
  original_name: string;
  mime_type: string | null;
  file_size: number | null;
  
  storage_bucket: string;
  storage_path: string;
  public_url: string | null;
  
  entity_type: string | null;
  entity_id: string | null;
  category: string | null;
  
  uploaded_by: string | null;
  
  is_public: boolean;
  expires_at: string | null;
  
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UploadRequest {
  file: File;
  entity_type?: string;
  entity_id?: string;
  category?: string;
  is_public?: boolean;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// ============================================================================
// DATA BATCHES (T-096)
// ============================================================================

export interface DataBatch {
  id: string;
  organization_id: string;
  
  batch_type: BatchType;
  entity_type: string;
  
  file_id: string | null;
  file_name: string | null;
  
  status: BatchStatus;
  started_at: string | null;
  completed_at: string | null;
  
  total_records: number;
  processed_records: number;
  success_records: number;
  error_records: number;
  
  errors: BatchError[];
  
  mapping_config: ColumnMapping;
  options: BatchOptions;
  
  created_by: string | null;
  created_at: string;
}

export interface BatchError {
  row: number;
  column?: string;
  message: string;
  value?: unknown;
}

export interface ColumnMapping {
  [sourceColumn: string]: {
    target_field: string;
    transform?: string;
    default_value?: unknown;
  };
}

export interface BatchOptions {
  skip_header?: boolean;
  skip_errors?: boolean;
  update_existing?: boolean;
  dry_run?: boolean;
  date_format?: string;
}

export interface ImportPreview {
  headers: string[];
  sample_rows: Record<string, unknown>[];
  detected_types: Record<string, string>;
  suggested_mappings: ColumnMapping;
}

// ============================================================================
// SYSTEM HEALTH (T-097)
// ============================================================================

export interface SystemHealthMetrics {
  id: string;
  
  metric_time: string;
  
  db_connections_active: number | null;
  db_connections_idle: number | null;
  db_size_bytes: number | null;
  
  api_requests_per_minute: number | null;
  api_avg_response_ms: number | null;
  api_error_rate: number | null;
  
  jobs_queued: number | null;
  jobs_running: number | null;
  jobs_failed_last_hour: number | null;
  
  storage_used_bytes: number | null;
  
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SystemStatus {
  database: ServiceStatus;
  api: ServiceStatus;
  storage: ServiceStatus;
  background_jobs: ServiceStatus;
  integrations: ServiceStatus;
  overall: 'healthy' | 'degraded' | 'down';
}

export interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'down';
  latency_ms?: number;
  error_rate?: number;
  message?: string;
  last_check: string;
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  date_format: string;
  time_format: '12h' | '24h';
  number_format: string;
  currency_format: string;
  
  notifications: {
    email: boolean;
    push: boolean;
    in_app: boolean;
    digest: 'none' | 'daily' | 'weekly';
  };
  
  dashboard: {
    default_view: string;
    widgets: string[];
    refresh_interval: number;
  };
}

// ============================================================================
// ACTIVITY FEED
// ============================================================================

export interface ActivityItem {
  id: string;
  actor: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  AuditLog,
  AuditChange,
  AuditLogFilter,
  Notification,
  NotificationTemplate,
  TemplateVariable,
  CreateNotificationRequest,
  OrganizationSetting,
  SettingDefinition,
  SettingsCategory,
  ApiKey,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  ApiKeyScope,
  Integration,
  IntegrationLog,
  IntegrationProvider,
  CredentialField,
  ScheduledJob,
  JobExecution,
  CreateJobRequest,
  FileUpload,
  UploadRequest,
  UploadProgress,
  DataBatch,
  BatchError,
  ColumnMapping,
  BatchOptions,
  ImportPreview,
  SystemHealthMetrics,
  SystemStatus,
  ServiceStatus,
  UserPreferences,
  ActivityItem,
};
