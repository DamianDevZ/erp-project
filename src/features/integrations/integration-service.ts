'use client';

/**
 * Integration & Webhooks Service (T-088 to T-090)
 * 
 * Manages:
 * - External integrations
 * - Webhook configuration
 * - Event dispatching
 * - API key management
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type IntegrationType = 
  | 'platform'
  | 'payment'
  | 'messaging'
  | 'mapping'
  | 'analytics'
  | 'accounting'
  | 'custom';

export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending';
export type WebhookStatus = 'active' | 'inactive' | 'failed';

export type WebhookEvent = 
  | 'order.created'
  | 'order.assigned'
  | 'order.picked_up'
  | 'order.delivered'
  | 'order.cancelled'
  | 'rider.active'
  | 'rider.inactive'
  | 'incident.reported'
  | 'incident.resolved'
  | 'shift.started'
  | 'shift.ended'
  | 'document.expiring'
  | 'payment.processed'
  | 'invoice.generated';

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  provider: string;
  status: IntegrationStatus;
  config: IntegrationConfig;
  credentials: Record<string, string>;
  lastSyncAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationConfig {
  baseUrl?: string;
  apiVersion?: string;
  timeout?: number;
  retryAttempts?: number;
  rateLimit?: number;
  options?: Record<string, unknown>;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  status: WebhookStatus;
  secret: string;
  headers?: Record<string, string>;
  retryConfig: {
    maxAttempts: number;
    backoffMs: number;
  };
  lastTriggeredAt: string | null;
  failureCount: number;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  status: 'pending' | 'success' | 'failed';
  statusCode: number | null;
  response: string | null;
  attempts: number;
  nextRetryAt: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const INTEGRATION_TYPE_LABELS: Record<IntegrationType, string> = {
  platform: 'Delivery Platform',
  payment: 'Payment Gateway',
  messaging: 'Messaging',
  mapping: 'Maps & Location',
  analytics: 'Analytics',
  accounting: 'Accounting',
  custom: 'Custom',
};

export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  'order.created': 'Order Created',
  'order.assigned': 'Order Assigned',
  'order.picked_up': 'Order Picked Up',
  'order.delivered': 'Order Delivered',
  'order.cancelled': 'Order Cancelled',
  'rider.active': 'Rider Active',
  'rider.inactive': 'Rider Inactive',
  'incident.reported': 'Incident Reported',
  'incident.resolved': 'Incident Resolved',
  'shift.started': 'Shift Started',
  'shift.ended': 'Shift Ended',
  'document.expiring': 'Document Expiring',
  'payment.processed': 'Payment Processed',
  'invoice.generated': 'Invoice Generated',
};

// ============================================================================
// INTEGRATIONS
// ============================================================================

/**
 * Create an integration.
 */
export async function createIntegration(input: {
  name: string;
  type: IntegrationType;
  provider: string;
  config?: IntegrationConfig;
  credentials: Record<string, string>;
}): Promise<{ success: boolean; integrationId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('integrations')
    .insert({
      name: input.name,
      type: input.type,
      provider: input.provider,
      status: 'pending',
      config: input.config || {},
      credentials: input.credentials,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, integrationId: data.id };
}

/**
 * Get an integration.
 */
export async function getIntegration(
  integrationId: string
): Promise<Integration | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('integrations')
    .select('*')
    .eq('id', integrationId)
    .single();
  
  if (!data) return null;
  
  return {
    id: data.id,
    name: data.name,
    type: data.type as IntegrationType,
    provider: data.provider,
    status: data.status as IntegrationStatus,
    config: data.config || {},
    credentials: data.credentials,
    lastSyncAt: data.last_sync_at,
    lastError: data.last_error,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Get all integrations.
 */
export async function getIntegrations(
  type?: IntegrationType
): Promise<Integration[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('integrations')
    .select('*')
    .order('name');
  
  if (type) {
    query = query.eq('type', type);
  }
  
  const { data } = await query;
  
  return (data || []).map(i => ({
    id: i.id,
    name: i.name,
    type: i.type as IntegrationType,
    provider: i.provider,
    status: i.status as IntegrationStatus,
    config: i.config || {},
    credentials: i.credentials,
    lastSyncAt: i.last_sync_at,
    lastError: i.last_error,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
  }));
}

/**
 * Update integration.
 */
export async function updateIntegration(
  integrationId: string,
  updates: Partial<Pick<Integration, 'name' | 'config' | 'credentials' | 'status'>>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('integrations')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', integrationId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Test integration connection.
 */
export async function testIntegration(
  integrationId: string
): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
  const supabase = createClient();
  
  const integration = await getIntegration(integrationId);
  if (!integration) {
    return { success: false, error: 'Integration not found' };
  }
  
  const startTime = Date.now();
  
  try {
    // Test connection based on integration type
    // In production, would actually call the external API
    const latencyMs = Date.now() - startTime;
    
    // Update last sync time
    await supabase
      .from('integrations')
      .update({
        status: 'active',
        last_sync_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integrationId);
    
    return { success: true, latencyMs };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Connection failed';
    
    await supabase
      .from('integrations')
      .update({
        status: 'error',
        last_error: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integrationId);
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Delete integration.
 */
export async function deleteIntegration(
  integrationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('integrations')
    .delete()
    .eq('id', integrationId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// WEBHOOKS
// ============================================================================

/**
 * Create a webhook.
 */
export async function createWebhook(input: {
  name: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  headers?: Record<string, string>;
  retryConfig?: Webhook['retryConfig'];
}): Promise<{ success: boolean; webhookId?: string; secret?: string; error?: string }> {
  const supabase = createClient();
  
  // Generate secret if not provided
  const secret = input.secret || generateWebhookSecret();
  
  const { data, error } = await supabase
    .from('webhooks')
    .insert({
      name: input.name,
      url: input.url,
      events: input.events,
      secret,
      headers: input.headers || {},
      retry_config: input.retryConfig || { maxAttempts: 3, backoffMs: 1000 },
      status: 'active',
      failure_count: 0,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, webhookId: data.id, secret };
}

function generateWebhookSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'whsec_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get a webhook.
 */
export async function getWebhook(webhookId: string): Promise<Webhook | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('webhooks')
    .select('*')
    .eq('id', webhookId)
    .single();
  
  if (!data) return null;
  
  return {
    id: data.id,
    name: data.name,
    url: data.url,
    events: data.events as WebhookEvent[],
    status: data.status as WebhookStatus,
    secret: data.secret,
    headers: data.headers,
    retryConfig: data.retry_config,
    lastTriggeredAt: data.last_triggered_at,
    failureCount: data.failure_count,
    createdAt: data.created_at,
  };
}

/**
 * Get all webhooks.
 */
export async function getWebhooks(): Promise<Webhook[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('webhooks')
    .select('*')
    .order('name');
  
  return (data || []).map(w => ({
    id: w.id,
    name: w.name,
    url: w.url,
    events: w.events as WebhookEvent[],
    status: w.status as WebhookStatus,
    secret: w.secret,
    headers: w.headers,
    retryConfig: w.retry_config,
    lastTriggeredAt: w.last_triggered_at,
    failureCount: w.failure_count,
    createdAt: w.created_at,
  }));
}

/**
 * Update webhook.
 */
export async function updateWebhook(
  webhookId: string,
  updates: Partial<Pick<Webhook, 'name' | 'url' | 'events' | 'headers' | 'retryConfig' | 'status'>>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.url) dbUpdates.url = updates.url;
  if (updates.events) dbUpdates.events = updates.events;
  if (updates.headers) dbUpdates.headers = updates.headers;
  if (updates.retryConfig) dbUpdates.retry_config = updates.retryConfig;
  if (updates.status) dbUpdates.status = updates.status;
  
  const { error } = await supabase
    .from('webhooks')
    .update(dbUpdates)
    .eq('id', webhookId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Delete webhook.
 */
export async function deleteWebhook(
  webhookId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', webhookId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Regenerate webhook secret.
 */
export async function regenerateWebhookSecret(
  webhookId: string
): Promise<{ success: boolean; secret?: string; error?: string }> {
  const supabase = createClient();
  
  const secret = generateWebhookSecret();
  
  const { error } = await supabase
    .from('webhooks')
    .update({ secret })
    .eq('id', webhookId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, secret };
}

// ============================================================================
// WEBHOOK DISPATCHING
// ============================================================================

/**
 * Dispatch a webhook event.
 */
export async function dispatchWebhookEvent(
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<{ dispatched: number; errors: string[] }> {
  const supabase = createClient();
  
  // Get all active webhooks subscribed to this event
  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('*')
    .eq('status', 'active')
    .contains('events', [event]);
  
  const errors: string[] = [];
  let dispatched = 0;
  
  for (const webhook of webhooks || []) {
    // Create delivery record
    const { data: delivery, error: deliveryError } = await supabase
      .from('webhook_deliveries')
      .insert({
        webhook_id: webhook.id,
        event,
        payload,
        status: 'pending',
        attempts: 0,
      })
      .select('id')
      .single();
    
    if (deliveryError) {
      errors.push(`Failed to create delivery for webhook ${webhook.id}: ${deliveryError.message}`);
      continue;
    }
    
    // Attempt delivery
    const result = await deliverWebhook(delivery.id);
    if (result.success) {
      dispatched++;
    } else if (result.error) {
      errors.push(result.error);
    }
  }
  
  return { dispatched, errors };
}

/**
 * Deliver a webhook.
 */
async function deliverWebhook(
  deliveryId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Get delivery and webhook
  const { data: delivery } = await supabase
    .from('webhook_deliveries')
    .select(`
      *,
      webhook:webhooks(*)
    `)
    .eq('id', deliveryId)
    .single();
  
  if (!delivery) {
    return { success: false, error: 'Delivery not found' };
  }
  
  const webhook = delivery.webhook as unknown;
  const webhookData = (Array.isArray(webhook) ? webhook[0] : webhook) as {
    id: string;
    url: string;
    secret: string;
    headers: Record<string, string>;
    retry_config: { maxAttempts: number; backoffMs: number };
  } | null;
  
  if (!webhookData) {
    return { success: false, error: 'Webhook not found' };
  }
  
  try {
    // In production, would actually make HTTP request
    // For now, simulate success
    const response = await simulateWebhookDelivery(
      webhookData.url,
      delivery.payload,
      webhookData.secret,
      webhookData.headers
    );
    
    // Update delivery status
    await supabase
      .from('webhook_deliveries')
      .update({
        status: 'success',
        status_code: response.statusCode,
        response: response.body,
        attempts: delivery.attempts + 1,
        completed_at: new Date().toISOString(),
      })
      .eq('id', deliveryId);
    
    // Update webhook last triggered
    await supabase
      .from('webhooks')
      .update({
        last_triggered_at: new Date().toISOString(),
        failure_count: 0,
      })
      .eq('id', webhookData.id);
    
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Delivery failed';
    const attempts = delivery.attempts + 1;
    const maxAttempts = webhookData.retry_config?.maxAttempts || 3;
    
    if (attempts < maxAttempts) {
      // Schedule retry
      const backoffMs = (webhookData.retry_config?.backoffMs || 1000) * Math.pow(2, attempts);
      const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
      
      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'pending',
          attempts,
          next_retry_at: nextRetryAt,
        })
        .eq('id', deliveryId);
    } else {
      // Mark as failed
      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'failed',
          attempts,
          completed_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);
      
      // Increment webhook failure count
      await supabase
        .from('webhooks')
        .update({
          failure_count: (await getWebhook(webhookData.id))?.failureCount || 0 + 1,
        })
        .eq('id', webhookData.id);
    }
    
    return { success: false, error: errorMessage };
  }
}

async function simulateWebhookDelivery(
  _url: string,
  _payload: Record<string, unknown>,
  _secret: string,
  _headers: Record<string, string>
): Promise<{ statusCode: number; body: string }> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Simulate 95% success rate
  if (Math.random() > 0.05) {
    return { statusCode: 200, body: '{"success":true}' };
  } else {
    throw new Error('Simulated connection error');
  }
}

/**
 * Retry failed deliveries.
 */
export async function retryFailedDeliveries(): Promise<{ retried: number; errors: string[] }> {
  const supabase = createClient();
  
  const now = new Date().toISOString();
  
  // Get deliveries that need retry
  const { data: deliveries } = await supabase
    .from('webhook_deliveries')
    .select('id')
    .eq('status', 'pending')
    .lte('next_retry_at', now)
    .limit(100);
  
  const errors: string[] = [];
  let retried = 0;
  
  for (const delivery of deliveries || []) {
    const result = await deliverWebhook(delivery.id);
    if (result.success) {
      retried++;
    } else if (result.error) {
      errors.push(result.error);
    }
  }
  
  return { retried, errors };
}

/**
 * Get webhook deliveries.
 */
export async function getWebhookDeliveries(
  webhookId: string,
  limit: number = 50
): Promise<WebhookDelivery[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('webhook_deliveries')
    .select('*')
    .eq('webhook_id', webhookId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return (data || []).map(d => ({
    id: d.id,
    webhookId: d.webhook_id,
    event: d.event as WebhookEvent,
    payload: d.payload,
    status: d.status as WebhookDelivery['status'],
    statusCode: d.status_code,
    response: d.response,
    attempts: d.attempts,
    nextRetryAt: d.next_retry_at,
    createdAt: d.created_at,
    completedAt: d.completed_at,
  }));
}

// ============================================================================
// API KEYS
// ============================================================================

/**
 * Create an API key.
 */
export async function createApiKey(input: {
  name: string;
  permissions: string[];
  expiresAt?: string;
  createdBy: string;
}): Promise<{ success: boolean; apiKeyId?: string; apiKey?: string; error?: string }> {
  const supabase = createClient();
  
  // Generate API key
  const apiKey = generateApiKey();
  const keyPrefix = apiKey.substring(0, 8);
  const keyHash = await hashApiKey(apiKey);
  
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      name: input.name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      permissions: input.permissions,
      expires_at: input.expiresAt,
      created_by: input.createdBy,
      is_active: true,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Return full key only once - it won't be stored
  return { success: true, apiKeyId: data.id, apiKey };
}

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '3pl_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function hashApiKey(key: string): Promise<string> {
  // In production, use proper hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate an API key.
 */
export async function validateApiKey(
  apiKey: string
): Promise<{ valid: boolean; permissions?: string[]; error?: string }> {
  const supabase = createClient();
  
  const keyPrefix = apiKey.substring(0, 8);
  const keyHash = await hashApiKey(apiKey);
  
  const { data } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_prefix', keyPrefix)
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();
  
  if (!data) {
    return { valid: false, error: 'Invalid API key' };
  }
  
  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: 'API key expired' };
  }
  
  // Update last used
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);
  
  return { valid: true, permissions: data.permissions };
}

/**
 * Get API keys.
 */
export async function getApiKeys(): Promise<ApiKey[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('api_keys')
    .select('*')
    .order('created_at', { ascending: false });
  
  return (data || []).map(k => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.key_prefix,
    permissions: k.permissions,
    expiresAt: k.expires_at,
    lastUsedAt: k.last_used_at,
    isActive: k.is_active,
    createdBy: k.created_by,
    createdAt: k.created_at,
  }));
}

/**
 * Revoke an API key.
 */
export async function revokeApiKey(
  apiKeyId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', apiKeyId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Delete an API key.
 */
export async function deleteApiKey(
  apiKeyId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', apiKeyId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// INTEGRATION SUMMARY
// ============================================================================

/**
 * Get integration summary.
 */
export async function getIntegrationSummary(): Promise<{
  integrations: {
    total: number;
    active: number;
    errored: number;
    byType: Record<IntegrationType, number>;
  };
  webhooks: {
    total: number;
    active: number;
    failed: number;
    deliveriesLast24h: number;
    successRate: number;
  };
  apiKeys: {
    total: number;
    active: number;
    expiringSoon: number;
  };
}> {
  const supabase = createClient();
  
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  
  // Integrations
  const { data: integrations } = await supabase
    .from('integrations')
    .select('type, status');
  
  const intByType: Record<string, number> = {};
  let intActive = 0;
  let intErrored = 0;
  
  for (const i of integrations || []) {
    intByType[i.type] = (intByType[i.type] || 0) + 1;
    if (i.status === 'active') intActive++;
    if (i.status === 'error') intErrored++;
  }
  
  // Webhooks
  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('status');
  
  const { data: deliveries } = await supabase
    .from('webhook_deliveries')
    .select('status')
    .gte('created_at', yesterday);
  
  const whActive = webhooks?.filter(w => w.status === 'active').length || 0;
  const whFailed = webhooks?.filter(w => w.status === 'failed').length || 0;
  const delSuccess = deliveries?.filter(d => d.status === 'success').length || 0;
  const delTotal = deliveries?.length || 0;
  
  // API Keys
  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('is_active, expires_at');
  
  const keysActive = apiKeys?.filter(k => k.is_active).length || 0;
  const keysExpiring = apiKeys?.filter(k => 
    k.is_active && k.expires_at && k.expires_at <= thirtyDays
  ).length || 0;
  
  return {
    integrations: {
      total: integrations?.length || 0,
      active: intActive,
      errored: intErrored,
      byType: intByType as Record<IntegrationType, number>,
    },
    webhooks: {
      total: webhooks?.length || 0,
      active: whActive,
      failed: whFailed,
      deliveriesLast24h: delTotal,
      successRate: delTotal > 0 ? Math.round((delSuccess / delTotal) * 100) : 0,
    },
    apiKeys: {
      total: apiKeys?.length || 0,
      active: keysActive,
      expiringSoon: keysExpiring,
    },
  };
}
