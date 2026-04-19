'use client';

/**
 * Notifications & Alerts Service (T-076 to T-078)
 * 
 * Manages:
 * - System notifications
 * - Push alerts
 * - Email notifications
 * - SMS alerts
 * - Notification preferences
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type NotificationType = 
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'alert';

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

export type NotificationCategory = 
  | 'system'
  | 'attendance'
  | 'payroll'
  | 'document'
  | 'asset'
  | 'incident'
  | 'performance'
  | 'shift'
  | 'compliance'
  | 'announcement';

export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  actionUrl: string | null;
  actionLabel: string | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface Alert {
  id: string;
  type: string;
  priority: AlertPriority;
  title: string;
  message: string;
  targetType: 'all' | 'role' | 'user' | 'department';
  targetIds: string[] | null;
  channels: NotificationChannel[];
  metadata: Record<string, unknown> | null;
  sentAt: string;
  sentBy: string;
  expiresAt: string | null;
  isActive: boolean;
  readCount: number;
  totalRecipients: number;
}

export interface NotificationPreference {
  userId: string;
  category: NotificationCategory;
  channels: NotificationChannel[];
  enabled: boolean;
}

export interface AlertTemplate {
  id: string;
  name: string;
  category: NotificationCategory;
  type: NotificationType;
  titleTemplate: string;
  messageTemplate: string;
  channels: NotificationChannel[];
  isActive: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  info: 'Information',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  alert: 'Alert',
};

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  system: 'System',
  attendance: 'Attendance',
  payroll: 'Payroll',
  document: 'Document',
  asset: 'Asset',
  incident: 'Incident',
  performance: 'Performance',
  shift: 'Shift',
  compliance: 'Compliance',
  announcement: 'Announcement',
};

export const ALERT_PRIORITY_LABELS: Record<AlertPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Create a notification for a user.
 */
export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
}): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: input.userId,
      type: input.type,
      category: input.category,
      title: input.title,
      message: input.message,
      action_url: input.actionUrl,
      action_label: input.actionLabel,
      metadata: input.metadata,
      is_read: false,
      expires_at: input.expiresAt,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, notificationId: data.id };
}

/**
 * Create notifications for multiple users.
 */
export async function createBulkNotifications(input: {
  userIds: string[];
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; created: number; error?: string }> {
  const supabase = createClient();
  
  const notifications = input.userIds.map(userId => ({
    user_id: userId,
    type: input.type,
    category: input.category,
    title: input.title,
    message: input.message,
    action_url: input.actionUrl,
    action_label: input.actionLabel,
    metadata: input.metadata,
    is_read: false,
  }));
  
  const { data, error } = await supabase
    .from('notifications')
    .insert(notifications)
    .select('id');
  
  if (error) {
    return { success: false, created: 0, error: error.message };
  }
  
  return { success: true, created: data.length };
}

/**
 * Get notifications for a user.
 */
export async function getNotifications(
  userId: string,
  options?: {
    unreadOnly?: boolean;
    category?: NotificationCategory;
    limit?: number;
    offset?: number;
  }
): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const supabase = createClient();
  
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
    .order('created_at', { ascending: false });
  
  if (options?.unreadOnly) {
    query = query.eq('is_read', false);
  }
  if (options?.category) {
    query = query.eq('category', options.category);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }
  
  const { data } = await query;
  
  // Get unread count
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  
  return {
    notifications: (data || []).map(mapNotification),
    unreadCount: count || 0,
  };
}

/**
 * Mark notification as read.
 */
export async function markAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(
  userId: string,
  category?: NotificationCategory
): Promise<{ success: boolean; updated: number; error?: string }> {
  const supabase = createClient();
  
  let query = supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('is_read', false);
  
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query.select('id');
  
  if (error) {
    return { success: false, updated: 0, error: error.message };
  }
  
  return { success: true, updated: data.length };
}

/**
 * Delete notification.
 */
export async function deleteNotification(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// ALERTS
// ============================================================================

/**
 * Send an alert.
 */
export async function sendAlert(input: {
  type: string;
  priority: AlertPriority;
  title: string;
  message: string;
  targetType: Alert['targetType'];
  targetIds?: string[];
  channels: NotificationChannel[];
  metadata?: Record<string, unknown>;
  expiresAt?: string;
  sentBy: string;
}): Promise<{ success: boolean; alertId?: string; recipientCount?: number; error?: string }> {
  const supabase = createClient();
  
  // Determine recipients
  let recipientIds: string[] = [];
  
  switch (input.targetType) {
    case 'all':
      const { data: allUsers } = await supabase
        .from('employees')
        .select('id')
        .eq('status', 'active');
      recipientIds = allUsers?.map(u => u.id) || [];
      break;
    
    case 'role':
      const { data: roleUsers } = await supabase
        .from('employees')
        .select('id')
        .eq('status', 'active')
        .in('role', input.targetIds || []);
      recipientIds = roleUsers?.map(u => u.id) || [];
      break;
    
    case 'department':
      const { data: deptUsers } = await supabase
        .from('employees')
        .select('id')
        .eq('status', 'active')
        .in('department_id', input.targetIds || []);
      recipientIds = deptUsers?.map(u => u.id) || [];
      break;
    
    case 'user':
      recipientIds = input.targetIds || [];
      break;
  }
  
  if (!recipientIds.length) {
    return { success: false, error: 'No recipients found' };
  }
  
  // Create alert record
  const { data: alert, error: alertError } = await supabase
    .from('alerts')
    .insert({
      type: input.type,
      priority: input.priority,
      title: input.title,
      message: input.message,
      target_type: input.targetType,
      target_ids: input.targetIds,
      channels: input.channels,
      metadata: input.metadata,
      sent_at: new Date().toISOString(),
      sent_by: input.sentBy,
      expires_at: input.expiresAt,
      is_active: true,
      read_count: 0,
      total_recipients: recipientIds.length,
    })
    .select('id')
    .single();
  
  if (alertError) {
    return { success: false, error: alertError.message };
  }
  
  // Send via each channel
  for (const channel of input.channels) {
    switch (channel) {
      case 'in_app':
        await createBulkNotifications({
          userIds: recipientIds,
          type: input.priority === 'critical' ? 'error' : 'alert',
          category: 'system',
          title: input.title,
          message: input.message,
          metadata: { alertId: alert.id, ...input.metadata },
        });
        break;
      
      case 'email':
        // Queue email notifications
        await queueEmailNotifications(recipientIds, input.title, input.message);
        break;
      
      case 'sms':
        // Queue SMS notifications
        await queueSmsNotifications(recipientIds, input.message);
        break;
      
      case 'push':
        // Queue push notifications
        await queuePushNotifications(recipientIds, input.title, input.message);
        break;
    }
  }
  
  return { success: true, alertId: alert.id, recipientCount: recipientIds.length };
}

/**
 * Get alerts.
 */
export async function getAlerts(filters?: {
  type?: string;
  priority?: AlertPriority;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}): Promise<Alert[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('alerts')
    .select('*')
    .order('sent_at', { ascending: false });
  
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }
  if (filters?.startDate) {
    query = query.gte('sent_at', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('sent_at', filters.endDate);
  }
  
  const { data } = await query;
  
  return (data || []).map(mapAlert);
}

/**
 * Deactivate alert.
 */
export async function deactivateAlert(
  alertId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('alerts')
    .update({ is_active: false })
    .eq('id', alertId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// PREFERENCES
// ============================================================================

/**
 * Get notification preferences for a user.
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreference[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId);
  
  // Return defaults if no preferences set
  if (!data?.length) {
    return Object.keys(NOTIFICATION_CATEGORY_LABELS).map(category => ({
      userId,
      category: category as NotificationCategory,
      channels: ['in_app', 'email'] as NotificationChannel[],
      enabled: true,
    }));
  }
  
  return data.map(p => ({
    userId: p.user_id,
    category: p.category as NotificationCategory,
    channels: p.channels as NotificationChannel[],
    enabled: p.enabled,
  }));
}

/**
 * Update notification preference.
 */
export async function updateNotificationPreference(input: {
  userId: string;
  category: NotificationCategory;
  channels: NotificationChannel[];
  enabled: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: input.userId,
      category: input.category,
      channels: input.channels,
      enabled: input.enabled,
    }, {
      onConflict: 'user_id,category',
    });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// TEMPLATES
// ============================================================================

/**
 * Get alert templates.
 */
export async function getAlertTemplates(
  category?: NotificationCategory
): Promise<AlertTemplate[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('alert_templates')
    .select('*')
    .eq('is_active', true)
    .order('name');
  
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data } = await query;
  
  return (data || []).map(t => ({
    id: t.id,
    name: t.name,
    category: t.category as NotificationCategory,
    type: t.type as NotificationType,
    titleTemplate: t.title_template,
    messageTemplate: t.message_template,
    channels: t.channels as NotificationChannel[],
    isActive: t.is_active,
  }));
}

/**
 * Send notification using template.
 */
export async function sendFromTemplate(
  templateId: string,
  recipientIds: string[],
  variables: Record<string, string>
): Promise<{ success: boolean; created: number; error?: string }> {
  const supabase = createClient();
  
  // Get template
  const { data: template } = await supabase
    .from('alert_templates')
    .select('*')
    .eq('id', templateId)
    .single();
  
  if (!template) {
    return { success: false, created: 0, error: 'Template not found' };
  }
  
  // Replace variables in template
  let title = template.title_template;
  let message = template.message_template;
  
  for (const [key, value] of Object.entries(variables)) {
    title = title.replace(new RegExp(`{{${key}}}`, 'g'), value);
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  
  // Create notifications
  const result = await createBulkNotifications({
    userIds: recipientIds,
    type: template.type as NotificationType,
    category: template.category as NotificationCategory,
    title,
    message,
    metadata: { templateId, variables },
  });
  
  return result;
}

// ============================================================================
// SCHEDULED NOTIFICATIONS
// ============================================================================

/**
 * Schedule a notification.
 */
export async function scheduleNotification(input: {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  scheduledFor: string;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; scheduleId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('scheduled_notifications')
    .insert({
      user_id: input.userId,
      type: input.type,
      category: input.category,
      title: input.title,
      message: input.message,
      scheduled_for: input.scheduledFor,
      metadata: input.metadata,
      status: 'pending',
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, scheduleId: data.id };
}

/**
 * Process scheduled notifications (to be called by cron job).
 */
export async function processScheduledNotifications(): Promise<{ processed: number }> {
  const supabase = createClient();
  
  const now = new Date().toISOString();
  
  // Get pending scheduled notifications
  const { data: scheduled } = await supabase
    .from('scheduled_notifications')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now);
  
  let processed = 0;
  
  for (const sched of scheduled || []) {
    await createNotification({
      userId: sched.user_id,
      type: sched.type as NotificationType,
      category: sched.category as NotificationCategory,
      title: sched.title,
      message: sched.message,
      metadata: sched.metadata,
    });
    
    await supabase
      .from('scheduled_notifications')
      .update({ status: 'sent', sent_at: now })
      .eq('id', sched.id);
    
    processed++;
  }
  
  return { processed };
}

// ============================================================================
// QUEUE FUNCTIONS (placeholders for actual implementations)
// ============================================================================

async function queueEmailNotifications(
  recipientIds: string[],
  subject: string,
  body: string
): Promise<void> {
  const supabase = createClient();
  
  // Get recipient emails
  const { data: users } = await supabase
    .from('employees')
    .select('id, email')
    .in('id', recipientIds)
    .not('email', 'is', null);
  
  // Queue emails
  const emails = (users || []).map(u => ({
    recipient_id: u.id,
    recipient_email: u.email,
    subject,
    body,
    status: 'pending',
  }));
  
  if (emails.length) {
    await supabase.from('email_queue').insert(emails);
  }
}

async function queueSmsNotifications(
  recipientIds: string[],
  message: string
): Promise<void> {
  const supabase = createClient();
  
  // Get recipient phones
  const { data: users } = await supabase
    .from('employees')
    .select('id, phone')
    .in('id', recipientIds)
    .not('phone', 'is', null);
  
  // Queue SMS
  const sms = (users || []).map(u => ({
    recipient_id: u.id,
    recipient_phone: u.phone,
    message,
    status: 'pending',
  }));
  
  if (sms.length) {
    await supabase.from('sms_queue').insert(sms);
  }
}

async function queuePushNotifications(
  recipientIds: string[],
  title: string,
  body: string
): Promise<void> {
  const supabase = createClient();
  
  // Get push tokens
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', recipientIds)
    .eq('is_active', true);
  
  // Queue push notifications
  const pushes = (tokens || []).map(t => ({
    user_id: t.user_id,
    token: t.token,
    title,
    body,
    status: 'pending',
  }));
  
  if (pushes.length) {
    await supabase.from('push_queue').insert(pushes);
  }
}

// ============================================================================
// REPORTING
// ============================================================================

export interface NotificationSummary {
  totalSent: number;
  totalRead: number;
  readRate: number;
  byCategory: Record<NotificationCategory, number>;
  byType: Record<NotificationType, number>;
  recentAlerts: Alert[];
  pendingScheduled: number;
  emailsQueued: number;
  smsQueued: number;
}

export async function getNotificationSummary(): Promise<NotificationSummary> {
  const supabase = createClient();
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: notifications } = await supabase
    .from('notifications')
    .select('category, type, is_read')
    .gte('created_at', thirtyDaysAgo.toISOString());
  
  const byCategory: Record<NotificationCategory, number> = {
    system: 0,
    attendance: 0,
    payroll: 0,
    document: 0,
    asset: 0,
    incident: 0,
    performance: 0,
    shift: 0,
    compliance: 0,
    announcement: 0,
  };
  
  const byType: Record<NotificationType, number> = {
    info: 0,
    success: 0,
    warning: 0,
    error: 0,
    alert: 0,
  };
  
  let totalRead = 0;
  
  for (const n of notifications || []) {
    byCategory[n.category as NotificationCategory]++;
    byType[n.type as NotificationType]++;
    if (n.is_read) totalRead++;
  }
  
  const totalSent = notifications?.length || 0;
  const readRate = totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0;
  
  // Recent alerts
  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(5);
  
  // Pending scheduled
  const { count: pendingScheduled } = await supabase
    .from('scheduled_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  // Queue counts
  const { count: emailsQueued } = await supabase
    .from('email_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  const { count: smsQueued } = await supabase
    .from('sms_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  return {
    totalSent,
    totalRead,
    readRate,
    byCategory,
    byType,
    recentAlerts: (alerts || []).map(mapAlert),
    pendingScheduled: pendingScheduled || 0,
    emailsQueued: emailsQueued || 0,
    smsQueued: smsQueued || 0,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as NotificationType,
    category: row.category as NotificationCategory,
    title: row.title as string,
    message: row.message as string,
    actionUrl: row.action_url as string | null,
    actionLabel: row.action_label as string | null,
    metadata: row.metadata as Record<string, unknown> | null,
    isRead: row.is_read as boolean,
    readAt: row.read_at as string | null,
    createdAt: row.created_at as string,
    expiresAt: row.expires_at as string | null,
  };
}

function mapAlert(row: Record<string, unknown>): Alert {
  return {
    id: row.id as string,
    type: row.type as string,
    priority: row.priority as AlertPriority,
    title: row.title as string,
    message: row.message as string,
    targetType: row.target_type as Alert['targetType'],
    targetIds: row.target_ids as string[] | null,
    channels: row.channels as NotificationChannel[],
    metadata: row.metadata as Record<string, unknown> | null,
    sentAt: row.sent_at as string,
    sentBy: row.sent_by as string,
    expiresAt: row.expires_at as string | null,
    isActive: row.is_active as boolean,
    readCount: row.read_count as number,
    totalRecipients: row.total_recipients as number,
  };
}
