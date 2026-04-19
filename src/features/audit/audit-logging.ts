'use client';

/**
 * Audit Logging Service (T-082 to T-084)
 * 
 * Manages:
 * - Activity tracking
 * - Change history
 * - Compliance logs
 * - Security audits
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type AuditAction = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'import'
  | 'approve'
  | 'reject'
  | 'assign'
  | 'unassign';

export type AuditCategory = 
  | 'authentication'
  | 'employee'
  | 'order'
  | 'asset'
  | 'document'
  | 'finance'
  | 'settings'
  | 'admin';

export type ChangeType = 'field_change' | 'status_change' | 'assignment_change' | 'bulk_change';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  category: AuditCategory;
  entityType: string;
  entityId: string;
  entityName: string | null;
  userId: string;
  userName: string;
  userRole: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: AuditDetails;
  timestamp: string;
}

export interface AuditDetails {
  description: string;
  changes?: FieldChange[];
  metadata?: Record<string, unknown>;
}

export interface FieldChange {
  field: string;
  fieldLabel: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: ChangeType;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  description: string;
  entityType: string;
  entityId: string | null;
  timestamp: string;
}

export interface SecurityEvent {
  id: string;
  eventType: 'login_success' | 'login_failed' | 'password_reset' | 'permission_denied' | 'suspicious_activity';
  userId: string | null;
  userName: string | null;
  ipAddress: string;
  userAgent: string;
  details: Record<string, unknown>;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ComplianceLog {
  id: string;
  complianceType: string;
  entityType: string;
  entityId: string;
  entityName: string;
  status: 'compliant' | 'non_compliant' | 'pending' | 'expired';
  details: string;
  dueDate: string | null;
  checkedAt: string;
  checkedBy: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Created',
  read: 'Viewed',
  update: 'Updated',
  delete: 'Deleted',
  login: 'Logged In',
  logout: 'Logged Out',
  export: 'Exported',
  import: 'Imported',
  approve: 'Approved',
  reject: 'Rejected',
  assign: 'Assigned',
  unassign: 'Unassigned',
};

export const CATEGORY_LABELS: Record<AuditCategory, string> = {
  authentication: 'Authentication',
  employee: 'Employee',
  order: 'Order',
  asset: 'Asset',
  document: 'Document',
  finance: 'Finance',
  settings: 'Settings',
  admin: 'Admin',
};

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log an audit event.
 */
export async function logAuditEvent(input: {
  action: AuditAction;
  category: AuditCategory;
  entityType: string;
  entityId: string;
  entityName?: string;
  userId: string;
  userName: string;
  userRole: string;
  details: AuditDetails;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ success: boolean; logId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      action: input.action,
      category: input.category,
      entity_type: input.entityType,
      entity_id: input.entityId,
      entity_name: input.entityName,
      user_id: input.userId,
      user_name: input.userName,
      user_role: input.userRole,
      details: input.details,
      ip_address: input.ipAddress,
      user_agent: input.userAgent,
    })
    .select('id')
    .single();
  
  if (error) {
    console.error('Failed to log audit event:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true, logId: data.id };
}

/**
 * Log field changes for an entity update.
 */
export async function logEntityUpdate<T extends Record<string, unknown>>(input: {
  entityType: string;
  entityId: string;
  entityName?: string;
  category: AuditCategory;
  userId: string;
  userName: string;
  userRole: string;
  oldData: T;
  newData: T;
  fieldLabels?: Record<string, string>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ success: boolean; logId?: string; error?: string }> {
  const changes: FieldChange[] = [];
  
  const fieldLabels = input.fieldLabels || {};
  
  for (const key of Object.keys(input.newData)) {
    if (JSON.stringify(input.oldData[key]) !== JSON.stringify(input.newData[key])) {
      changes.push({
        field: key,
        fieldLabel: fieldLabels[key] || formatFieldName(key),
        oldValue: input.oldData[key],
        newValue: input.newData[key],
        changeType: key === 'status' ? 'status_change' 
          : key.includes('assigned') ? 'assignment_change' 
          : 'field_change',
      });
    }
  }
  
  if (changes.length === 0) {
    return { success: true };
  }
  
  return logAuditEvent({
    action: 'update',
    category: input.category,
    entityType: input.entityType,
    entityId: input.entityId,
    entityName: input.entityName,
    userId: input.userId,
    userName: input.userName,
    userRole: input.userRole,
    details: {
      description: `Updated ${changes.length} field(s)`,
      changes,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, l => l.toUpperCase());
}

// ============================================================================
// QUERY AUDIT LOGS
// ============================================================================

/**
 * Get audit logs with filters.
 */
export async function getAuditLogs(filters: {
  startDate?: string;
  endDate?: string;
  action?: AuditAction;
  category?: AuditCategory;
  entityType?: string;
  entityId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const supabase = createClient();
  
  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' });
  
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }
  if (filters.action) {
    query = query.eq('action', filters.action);
  }
  if (filters.category) {
    query = query.eq('category', filters.category);
  }
  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType);
  }
  if (filters.entityId) {
    query = query.eq('entity_id', filters.entityId);
  }
  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }
  
  query = query
    .order('created_at', { ascending: false })
    .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);
  
  const { data, count, error } = await query;
  
  if (error) {
    console.error('Failed to get audit logs:', error);
    return { logs: [], total: 0 };
  }
  
  const logs: AuditLogEntry[] = (data || []).map(log => ({
    id: log.id,
    action: log.action as AuditAction,
    category: log.category as AuditCategory,
    entityType: log.entity_type,
    entityId: log.entity_id,
    entityName: log.entity_name,
    userId: log.user_id,
    userName: log.user_name,
    userRole: log.user_role,
    ipAddress: log.ip_address,
    userAgent: log.user_agent,
    details: log.details as AuditDetails,
    timestamp: log.created_at,
  }));
  
  return { logs, total: count || 0 };
}

/**
 * Get audit logs for a specific entity.
 */
export async function getEntityHistory(
  entityType: string,
  entityId: string
): Promise<AuditLogEntry[]> {
  const { logs } = await getAuditLogs({
    entityType,
    entityId,
    limit: 100,
  });
  return logs;
}

/**
 * Get user activity history.
 */
export async function getUserActivity(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<AuditLogEntry[]> {
  const { logs } = await getAuditLogs({
    userId,
    startDate,
    endDate,
    limit: 100,
  });
  return logs;
}

// ============================================================================
// ACTIVITY LOGGING
// ============================================================================

/**
 * Log user activity (lighter weight than audit).
 */
export async function logActivity(input: {
  userId: string;
  userName: string;
  action: string;
  description: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  const supabase = createClient();
  
  await supabase.from('activity_logs').insert({
    user_id: input.userId,
    user_name: input.userName,
    action: input.action,
    description: input.description,
    entity_type: input.entityType,
    entity_id: input.entityId,
  });
}

/**
 * Get recent activities.
 */
export async function getRecentActivities(
  userId?: string,
  limit: number = 20
): Promise<ActivityLog[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data } = await query;
  
  return (data || []).map(a => ({
    id: a.id,
    userId: a.user_id,
    userName: a.user_name,
    action: a.action,
    description: a.description,
    entityType: a.entity_type,
    entityId: a.entity_id,
    timestamp: a.created_at,
  }));
}

// ============================================================================
// SECURITY EVENTS
// ============================================================================

/**
 * Log a security event.
 */
export async function logSecurityEvent(input: {
  eventType: SecurityEvent['eventType'];
  userId?: string;
  userName?: string;
  ipAddress: string;
  userAgent: string;
  details?: Record<string, unknown>;
  severity?: SecurityEvent['severity'];
}): Promise<void> {
  const supabase = createClient();
  
  const severity = input.severity || determineSeverity(input.eventType);
  
  await supabase.from('security_events').insert({
    event_type: input.eventType,
    user_id: input.userId,
    user_name: input.userName,
    ip_address: input.ipAddress,
    user_agent: input.userAgent,
    details: input.details || {},
    severity,
  });
  
  // Alert on high/critical events
  if (severity === 'high' || severity === 'critical') {
    await notifySecurityTeam(input, severity);
  }
}

function determineSeverity(eventType: SecurityEvent['eventType']): SecurityEvent['severity'] {
  switch (eventType) {
    case 'suspicious_activity':
      return 'critical';
    case 'permission_denied':
      return 'high';
    case 'login_failed':
      return 'medium';
    case 'password_reset':
      return 'low';
    default:
      return 'low';
  }
}

async function notifySecurityTeam(
  event: {
    eventType: SecurityEvent['eventType'];
    userId?: string;
    userName?: string;
    ipAddress: string;
    details?: Record<string, unknown>;
  },
  severity: SecurityEvent['severity']
): Promise<void> {
  const supabase = createClient();
  
  // Create alert for security team
  await supabase.from('alerts').insert({
    type: 'security',
    priority: severity === 'critical' ? 'urgent' : 'high',
    title: `Security Event: ${event.eventType}`,
    message: `${event.eventType} detected from IP ${event.ipAddress}. User: ${event.userName || 'Unknown'}`,
    target_roles: ['admin', 'super_admin'],
    data: {
      eventType: event.eventType,
      userId: event.userId,
      ipAddress: event.ipAddress,
      details: event.details,
    },
    is_active: true,
  });
}

/**
 * Get security events.
 */
export async function getSecurityEvents(filters: {
  eventType?: SecurityEvent['eventType'];
  severity?: SecurityEvent['severity'];
  startDate?: string;
  endDate?: string;
  userId?: string;
  limit?: number;
}): Promise<SecurityEvent[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('security_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters.limit || 50);
  
  if (filters.eventType) {
    query = query.eq('event_type', filters.eventType);
  }
  if (filters.severity) {
    query = query.eq('severity', filters.severity);
  }
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }
  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }
  
  const { data } = await query;
  
  return (data || []).map(e => ({
    id: e.id,
    eventType: e.event_type as SecurityEvent['eventType'],
    userId: e.user_id,
    userName: e.user_name,
    ipAddress: e.ip_address,
    userAgent: e.user_agent,
    details: e.details,
    timestamp: e.created_at,
    severity: e.severity as SecurityEvent['severity'],
  }));
}

// ============================================================================
// COMPLIANCE LOGGING
// ============================================================================

/**
 * Log compliance check.
 */
export async function logComplianceCheck(input: {
  complianceType: string;
  entityType: string;
  entityId: string;
  entityName: string;
  status: ComplianceLog['status'];
  details: string;
  dueDate?: string;
  checkedBy: string;
}): Promise<{ success: boolean; logId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('compliance_logs')
    .insert({
      compliance_type: input.complianceType,
      entity_type: input.entityType,
      entity_id: input.entityId,
      entity_name: input.entityName,
      status: input.status,
      details: input.details,
      due_date: input.dueDate,
      checked_by: input.checkedBy,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, logId: data.id };
}

/**
 * Get compliance logs.
 */
export async function getComplianceLogs(filters: {
  complianceType?: string;
  entityType?: string;
  entityId?: string;
  status?: ComplianceLog['status'];
  limit?: number;
}): Promise<ComplianceLog[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('compliance_logs')
    .select('*')
    .order('checked_at', { ascending: false })
    .limit(filters.limit || 50);
  
  if (filters.complianceType) {
    query = query.eq('compliance_type', filters.complianceType);
  }
  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType);
  }
  if (filters.entityId) {
    query = query.eq('entity_id', filters.entityId);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  const { data } = await query;
  
  return (data || []).map(c => ({
    id: c.id,
    complianceType: c.compliance_type,
    entityType: c.entity_type,
    entityId: c.entity_id,
    entityName: c.entity_name,
    status: c.status as ComplianceLog['status'],
    details: c.details,
    dueDate: c.due_date,
    checkedAt: c.checked_at,
    checkedBy: c.checked_by,
  }));
}

/**
 * Get compliance summary.
 */
export async function getComplianceSummary(): Promise<{
  totalChecks: number;
  compliant: number;
  nonCompliant: number;
  pending: number;
  expired: number;
  complianceRate: number;
  byType: Array<{
    type: string;
    compliant: number;
    nonCompliant: number;
    pending: number;
  }>;
}> {
  const supabase = createClient();
  
  // Get latest check for each entity
  const { data } = await supabase
    .from('compliance_logs')
    .select('compliance_type, status')
    .order('checked_at', { ascending: false });
  
  // Group by type and status
  const byType = new Map<string, { compliant: number; nonCompliant: number; pending: number; expired: number }>();
  
  for (const check of data || []) {
    const existing = byType.get(check.compliance_type) || { compliant: 0, nonCompliant: 0, pending: 0, expired: 0 };
    
    switch (check.status) {
      case 'compliant':
        existing.compliant++;
        break;
      case 'non_compliant':
        existing.nonCompliant++;
        break;
      case 'pending':
        existing.pending++;
        break;
      case 'expired':
        existing.expired++;
        break;
    }
    
    byType.set(check.compliance_type, existing);
  }
  
  const totals = {
    compliant: 0,
    nonCompliant: 0,
    pending: 0,
    expired: 0,
  };
  
  const byTypeArray = Array.from(byType.entries()).map(([type, counts]) => {
    totals.compliant += counts.compliant;
    totals.nonCompliant += counts.nonCompliant;
    totals.pending += counts.pending;
    totals.expired += counts.expired;
    
    return {
      type,
      compliant: counts.compliant,
      nonCompliant: counts.nonCompliant,
      pending: counts.pending,
    };
  });
  
  const totalChecks = totals.compliant + totals.nonCompliant + totals.pending + totals.expired;
  const complianceRate = totalChecks > 0 
    ? Math.round((totals.compliant / totalChecks) * 100) 
    : 0;
  
  return {
    totalChecks,
    ...totals,
    complianceRate,
    byType: byTypeArray,
  };
}

// ============================================================================
// DATA RETENTION
// ============================================================================

/**
 * Archive old audit logs.
 */
export async function archiveOldLogs(
  olderThanDays: number = 365
): Promise<{ success: boolean; archivedCount: number; error?: string }> {
  const supabase = createClient();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  // First, count logs to archive
  const { count } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', cutoffDate.toISOString());
  
  if (!count || count === 0) {
    return { success: true, archivedCount: 0 };
  }
  
  // Move to archive table (in production, would use different storage)
  const { data: toArchive } = await supabase
    .from('audit_logs')
    .select('*')
    .lt('created_at', cutoffDate.toISOString())
    .limit(1000);
  
  if (toArchive && toArchive.length > 0) {
    await supabase.from('audit_logs_archive').insert(toArchive);
  }
  
  // Delete archived logs
  const { error } = await supabase
    .from('audit_logs')
    .delete()
    .lt('created_at', cutoffDate.toISOString());
  
  if (error) {
    return { success: false, archivedCount: 0, error: error.message };
  }
  
  return { success: true, archivedCount: count };
}

/**
 * Get audit statistics.
 */
export async function getAuditStatistics(
  days: number = 30
): Promise<{
  totalEvents: number;
  byAction: Record<AuditAction, number>;
  byCategory: Record<AuditCategory, number>;
  topUsers: Array<{ userId: string; userName: string; count: number }>;
  dailyTrend: Array<{ date: string; count: number }>;
}> {
  const supabase = createClient();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data } = await supabase
    .from('audit_logs')
    .select('action, category, user_id, user_name, created_at')
    .gte('created_at', startDate.toISOString());
  
  const byAction: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const userCounts: Map<string, { userName: string; count: number }> = new Map();
  const dailyCounts: Map<string, number> = new Map();
  
  for (const log of data || []) {
    byAction[log.action] = (byAction[log.action] || 0) + 1;
    byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    
    const userCount = userCounts.get(log.user_id) || { userName: log.user_name, count: 0 };
    userCount.count++;
    userCounts.set(log.user_id, userCount);
    
    const date = log.created_at.slice(0, 10);
    dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
  }
  
  const topUsers = Array.from(userCounts.entries())
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  const dailyTrend = Array.from(dailyCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  return {
    totalEvents: data?.length || 0,
    byAction: byAction as Record<AuditAction, number>,
    byCategory: byCategory as Record<AuditCategory, number>,
    topUsers,
    dailyTrend,
  };
}
