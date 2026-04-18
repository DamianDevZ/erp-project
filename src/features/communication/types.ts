/**
 * Communication, Mobile & Reporting Types
 * T-101 to T-110
 */

// ============================================================================
// ENUMS
// ============================================================================

export type MessageType =
  | 'text'
  | 'image'
  | 'document'
  | 'location'
  | 'voice'
  | 'system';

export type ConversationType = 'direct' | 'group' | 'broadcast' | 'support';

export type DeviceType = 'android' | 'ios' | 'web' | 'desktop';

export type DeviceStatus = 'active' | 'inactive' | 'blocked';

export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export type AnnouncementTargetType = 'all' | 'department' | 'role' | 'specific';

export type GeofenceEventType = 'enter' | 'exit' | 'dwell';

export type ReportOutputFormat = 'pdf' | 'excel' | 'csv';

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type FeedbackType = 'bug' | 'feature' | 'general';

export type FeedbackStatus = 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'closed';

// ============================================================================
// CONVERSATIONS (T-101)
// ============================================================================

export interface Conversation {
  id: string;
  organization_id: string;
  
  conversation_type: ConversationType;
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  
  participant_ids: string[];
  
  is_muted: boolean;
  is_archived: boolean;
  
  last_message_at: string | null;
  last_message_preview: string | null;
  
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  employee_id: string;
  
  role: string;
  
  joined_at: string;
  left_at: string | null;
  
  is_muted: boolean;
  last_read_at: string | null;
  unread_count: number;
}

export interface ConversationWithParticipants extends Conversation {
  participants: ConversationParticipantDetail[];
}

export interface ConversationParticipantDetail extends ConversationParticipant {
  employee_name: string;
  employee_avatar?: string;
}

export interface CreateConversationRequest {
  conversation_type: ConversationType;
  name?: string;
  description?: string;
  participant_employee_ids: string[];
}

// ============================================================================
// MESSAGES (T-102)
// ============================================================================

export interface Message {
  id: string;
  organization_id: string;
  conversation_id: string;
  
  sender_id: string | null;
  
  message_type: MessageType;
  content: string | null;
  
  media_url: string | null;
  media_type: string | null;
  media_size: number | null;
  thumbnail_url: string | null;
  
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  
  reply_to_id: string | null;
  thread_root_id: string | null;
  
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MessageWithSender extends Message {
  sender: {
    id: string;
    name: string;
    avatar_url?: string;
  } | null;
  read_receipts?: MessageReadReceipt[];
  reply_to?: Message | null;
}

export interface MessageReadReceipt {
  id: string;
  message_id: string;
  employee_id: string;
  read_at: string;
}

export interface SendMessageRequest {
  conversation_id: string;
  message_type?: MessageType;
  content?: string;
  media_url?: string;
  media_type?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  reply_to_id?: string;
}

// ============================================================================
// ANNOUNCEMENTS (T-103)
// ============================================================================

export interface Announcement {
  id: string;
  organization_id: string;
  
  title: string;
  content: string;
  content_html: string | null;
  
  target_type: AnnouncementTargetType;
  target_departments: string[];
  target_roles: string[];
  target_employees: string[];
  
  publish_at: string;
  expires_at: string | null;
  
  priority: AnnouncementPriority;
  is_pinned: boolean;
  requires_acknowledgment: boolean;
  
  is_published: boolean;
  
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementAcknowledgment {
  id: string;
  announcement_id: string;
  employee_id: string;
  acknowledged_at: string;
}

export interface AnnouncementWithStats extends Announcement {
  total_recipients: number;
  acknowledged_count: number;
  is_acknowledged?: boolean;
  created_by_name?: string;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  content_html?: string;
  target_type?: AnnouncementTargetType;
  target_departments?: string[];
  target_roles?: string[];
  target_employees?: string[];
  publish_at?: string;
  expires_at?: string;
  priority?: AnnouncementPriority;
  is_pinned?: boolean;
  requires_acknowledgment?: boolean;
}

// ============================================================================
// MOBILE DEVICES (T-104)
// ============================================================================

export interface MobileDevice {
  id: string;
  organization_id: string;
  employee_id: string;
  
  device_type: DeviceType;
  device_name: string | null;
  device_model: string | null;
  os_version: string | null;
  app_version: string | null;
  
  push_token: string | null;
  push_enabled: boolean;
  
  status: DeviceStatus;
  last_active_at: string | null;
  last_ip_address: string | null;
  last_location_lat: number | null;
  last_location_lng: number | null;
  
  biometric_enabled: boolean;
  
  registered_at: string;
  updated_at: string;
}

export interface MobileSession {
  id: string;
  device_id: string;
  
  session_token_hash: string;
  
  started_at: string;
  last_activity_at: string;
  expires_at: string | null;
  ended_at: string | null;
  
  ip_address: string | null;
  
  is_active: boolean;
}

export interface RegisterDeviceRequest {
  device_type: DeviceType;
  device_name?: string;
  device_model?: string;
  os_version?: string;
  push_token?: string;
}

// ============================================================================
// GEOFENCES (T-105)
// ============================================================================

export interface Geofence {
  id: string;
  organization_id: string;
  
  name: string;
  description: string | null;
  
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  
  polygon_coordinates: GeoPoint[] | null;
  
  trigger_on_enter: boolean;
  trigger_on_exit: boolean;
  
  active_days: number[];
  active_start_time: string;
  active_end_time: string;
  
  notification_template_id: string | null;
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeofenceEvent {
  id: string;
  organization_id: string;
  geofence_id: string;
  employee_id: string;
  device_id: string | null;
  
  event_type: GeofenceEventType;
  
  location_lat: number | null;
  location_lng: number | null;
  accuracy_meters: number | null;
  
  duration_seconds: number | null;
  
  created_at: string;
}

export interface GeofenceWithStats extends Geofence {
  total_events_today: number;
  unique_employees_today: number;
}

export interface CreateGeofenceRequest {
  name: string;
  description?: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  polygon_coordinates?: GeoPoint[];
  trigger_on_enter?: boolean;
  trigger_on_exit?: boolean;
  active_days?: number[];
  active_start_time?: string;
  active_end_time?: string;
  notification_template_id?: string;
}

// ============================================================================
// REPORT SCHEDULES (T-106)
// ============================================================================

export interface ReportSchedule {
  id: string;
  organization_id: string;
  
  report_definition_id: string | null;
  
  schedule_name: string;
  
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  day_of_week: number | null;
  day_of_month: number | null;
  time_of_day: string;
  timezone: string;
  
  recipient_emails: string[];
  recipient_employee_ids: string[];
  
  output_format: ReportOutputFormat;
  
  report_parameters: Record<string, unknown>;
  
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportDelivery {
  id: string;
  organization_id: string;
  schedule_id: string | null;
  generated_report_id: string | null;
  
  recipient_email: string;
  
  status: 'pending' | 'sent' | 'failed';
  sent_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  
  created_at: string;
}

export interface CreateReportScheduleRequest {
  report_definition_id?: string;
  schedule_name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  day_of_week?: number;
  day_of_month?: number;
  time_of_day?: string;
  timezone?: string;
  recipient_emails?: string[];
  recipient_employee_ids?: string[];
  output_format?: ReportOutputFormat;
  report_parameters?: Record<string, unknown>;
}

// ============================================================================
// SAVED FILTERS (T-107)
// ============================================================================

export interface SavedFilter {
  id: string;
  organization_id: string;
  employee_id: string | null;
  
  filter_name: string;
  entity_type: string;
  
  filter_config: FilterConfig;
  
  is_default: boolean;
  is_shared: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface FilterConfig {
  conditions: FilterCondition[];
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  columns?: string[];
}

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'between'
  | 'in'
  | 'not_in'
  | 'is_null'
  | 'is_not_null';

// ============================================================================
// DATA EXPORTS (T-108)
// ============================================================================

export interface DataExport {
  id: string;
  organization_id: string;
  
  export_type: 'full' | 'partial';
  entity_types: string[];
  
  date_from: string | null;
  date_to: string | null;
  
  status: ExportStatus;
  started_at: string | null;
  completed_at: string | null;
  
  file_id: string | null;
  file_size_bytes: number | null;
  record_count: number | null;
  
  error_message: string | null;
  
  download_url: string | null;
  download_expires_at: string | null;
  download_count: number;
  max_downloads: number;
  
  requested_by: string | null;
  created_at: string;
}

export interface CreateDataExportRequest {
  export_type: 'full' | 'partial';
  entity_types?: string[];
  date_from?: string;
  date_to?: string;
}

// ============================================================================
// FEATURE FLAGS (T-109)
// ============================================================================

export interface FeatureFlag {
  id: string;
  
  flag_key: string;
  flag_name: string;
  description: string | null;
  
  is_enabled: boolean;
  
  rollout_percentage: number;
  
  enabled_organizations: string[];
  enabled_user_ids: string[];
  
  conditions: FeatureFlagCondition[];
  
  owner: string | null;
  expires_at: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface FeatureFlagCondition {
  attribute: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: unknown;
}

export interface FeatureFlagEvaluation {
  flag_key: string;
  enabled: boolean;
  reason: string;
  variant?: string;
}

// ============================================================================
// FEEDBACK (T-110)
// ============================================================================

export interface Feedback {
  id: string;
  organization_id: string | null;
  
  feedback_type: FeedbackType;
  category: string | null;
  
  title: string | null;
  description: string;
  
  page_url: string | null;
  user_agent: string | null;
  screenshot_url: string | null;
  
  rating: number | null;
  
  status: FeedbackStatus;
  resolution_notes: string | null;
  
  submitted_by: string | null;
  assigned_to: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface SubmitFeedbackRequest {
  feedback_type: FeedbackType;
  category?: string;
  title?: string;
  description: string;
  rating?: number;
  screenshot?: File;
}

// ============================================================================
// REAL-TIME & PUSH NOTIFICATIONS
// ============================================================================

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
  click_action?: string;
}

export interface RealtimeEvent {
  event: string;
  payload: unknown;
  timestamp: string;
}

export interface TypingIndicator {
  conversation_id: string;
  employee_id: string;
  is_typing: boolean;
  timestamp: string;
}

export interface PresenceStatus {
  employee_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_seen_at: string;
  device_type?: DeviceType;
}

// ============================================================================
// UNREAD CONVERSATIONS VIEW
// ============================================================================

export interface UnreadConversation {
  employee_id: string;
  conversation_id: string;
  organization_id: string;
  name: string | null;
  conversation_type: ConversationType;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  Conversation,
  ConversationParticipant,
  ConversationWithParticipants,
  ConversationParticipantDetail,
  CreateConversationRequest,
  Message,
  MessageWithSender,
  MessageReadReceipt,
  SendMessageRequest,
  Announcement,
  AnnouncementAcknowledgment,
  AnnouncementWithStats,
  CreateAnnouncementRequest,
  MobileDevice,
  MobileSession,
  RegisterDeviceRequest,
  Geofence,
  GeoPoint,
  GeofenceEvent,
  GeofenceWithStats,
  CreateGeofenceRequest,
  ReportSchedule,
  ReportDelivery,
  CreateReportScheduleRequest,
  SavedFilter,
  FilterConfig,
  FilterCondition,
  DataExport,
  CreateDataExportRequest,
  FeatureFlag,
  FeatureFlagCondition,
  FeatureFlagEvaluation,
  Feedback,
  SubmitFeedbackRequest,
  PushNotificationPayload,
  RealtimeEvent,
  TypingIndicator,
  PresenceStatus,
  UnreadConversation,
};
