'use client';

/**
 * Settings & Configuration Service (T-085 to T-087)
 * 
 * Manages:
 * - System settings
 * - Organization configuration
 * - Feature flags
 * - User preferences
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type SettingCategory = 
  | 'general'
  | 'operations'
  | 'finance'
  | 'notifications'
  | 'integrations'
  | 'security'
  | 'branding';

export type SettingType = 'string' | 'number' | 'boolean' | 'json' | 'select' | 'color';

export interface SystemSetting {
  key: string;
  category: SettingCategory;
  label: string;
  description: string;
  value: unknown;
  defaultValue: unknown;
  type: SettingType;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    required?: boolean;
  };
  isSystem: boolean;
  lastUpdatedAt: string;
  lastUpdatedBy: string | null;
}

export interface OrganizationConfig {
  id: string;
  name: string;
  settings: Record<string, unknown>;
  features: FeatureFlags;
  branding: BrandingConfig;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlags {
  [key: string]: {
    enabled: boolean;
    rolloutPercentage?: number;
    allowedRoles?: string[];
    startDate?: string;
    endDate?: string;
  };
}

export interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  logo: string | null;
  favicon: string | null;
  companyName: string;
  tagline: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
}

export interface UserPreference {
  key: string;
  label: string;
  value: unknown;
  type: SettingType;
  category: string;
}

export interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  settings: Record<string, unknown>;
  features: string[];
  createdAt: string;
  isDefault: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_BRANDING: BrandingConfig = {
  primaryColor: '#4F46E5',
  secondaryColor: '#10B981',
  logo: null,
  favicon: null,
  companyName: '3PL Rider',
  tagline: 'Fleet Management Made Simple',
  supportEmail: null,
  supportPhone: null,
};

export const CATEGORY_LABELS: Record<SettingCategory, string> = {
  general: 'General',
  operations: 'Operations',
  finance: 'Finance',
  notifications: 'Notifications',
  integrations: 'Integrations',
  security: 'Security',
  branding: 'Branding',
};

// ============================================================================
// SYSTEM SETTINGS
// ============================================================================

/**
 * Get all system settings.
 */
export async function getSystemSettings(
  category?: SettingCategory
): Promise<SystemSetting[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('system_settings')
    .select('*')
    .order('category')
    .order('key');
  
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data } = await query;
  
  return (data || []).map(s => ({
    key: s.key,
    category: s.category as SettingCategory,
    label: s.label,
    description: s.description,
    value: s.value,
    defaultValue: s.default_value,
    type: s.type as SettingType,
    options: s.options,
    validation: s.validation,
    isSystem: s.is_system,
    lastUpdatedAt: s.updated_at,
    lastUpdatedBy: s.updated_by,
  }));
}

/**
 * Get a specific setting.
 */
export async function getSetting(key: string): Promise<unknown> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .single();
  
  return data?.value;
}

/**
 * Update a system setting.
 */
export async function updateSetting(
  key: string,
  value: unknown,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('system_settings')
    .update({
      value,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('key', key)
    .eq('is_system', false);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Update multiple settings at once.
 */
export async function updateSettings(
  settings: Record<string, unknown>,
  userId: string
): Promise<{ success: boolean; errors?: Record<string, string> }> {
  const supabase = createClient();
  const errors: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(settings)) {
    const { error } = await supabase
      .from('system_settings')
      .update({
        value,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('key', key)
      .eq('is_system', false);
    
    if (error) {
      errors[key] = error.message;
    }
  }
  
  return {
    success: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}

/**
 * Reset setting to default.
 */
export async function resetSettingToDefault(
  key: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Get default value
  const { data: setting } = await supabase
    .from('system_settings')
    .select('default_value')
    .eq('key', key)
    .single();
  
  if (!setting) {
    return { success: false, error: 'Setting not found' };
  }
  
  const { error } = await supabase
    .from('system_settings')
    .update({
      value: setting.default_value,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('key', key);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// ORGANIZATION CONFIG
// ============================================================================

/**
 * Get organization configuration.
 */
export async function getOrganizationConfig(
  organizationId: string
): Promise<OrganizationConfig | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();
  
  if (!data) return null;
  
  return {
    id: data.id,
    name: data.name,
    settings: data.settings || {},
    features: data.features || {},
    branding: data.branding || DEFAULT_BRANDING,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Update organization settings.
 */
export async function updateOrganizationConfig(
  organizationId: string,
  config: Partial<Pick<OrganizationConfig, 'settings' | 'features' | 'branding'>>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (config.settings) {
    updates.settings = config.settings;
  }
  if (config.features) {
    updates.features = config.features;
  }
  if (config.branding) {
    updates.branding = config.branding;
  }
  
  const { error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', organizationId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Get all feature flags.
 */
export async function getFeatureFlags(
  organizationId: string
): Promise<FeatureFlags> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('organizations')
    .select('features')
    .eq('id', organizationId)
    .single();
  
  return data?.features || {};
}

/**
 * Check if a feature is enabled.
 */
export async function isFeatureEnabled(
  organizationId: string,
  featureKey: string,
  userRole?: string
): Promise<boolean> {
  const flags = await getFeatureFlags(organizationId);
  const feature = flags[featureKey];
  
  if (!feature) return false;
  if (!feature.enabled) return false;
  
  // Check date restrictions
  const now = new Date();
  if (feature.startDate && new Date(feature.startDate) > now) return false;
  if (feature.endDate && new Date(feature.endDate) < now) return false;
  
  // Check role restrictions
  if (feature.allowedRoles && userRole) {
    if (!feature.allowedRoles.includes(userRole)) return false;
  }
  
  // Check rollout percentage (simple random for demo)
  if (feature.rolloutPercentage !== undefined && feature.rolloutPercentage < 100) {
    return Math.random() * 100 < feature.rolloutPercentage;
  }
  
  return true;
}

/**
 * Update feature flag.
 */
export async function updateFeatureFlag(
  organizationId: string,
  featureKey: string,
  config: FeatureFlags[string]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: org } = await supabase
    .from('organizations')
    .select('features')
    .eq('id', organizationId)
    .single();
  
  const features = org?.features || {};
  features[featureKey] = config;
  
  const { error } = await supabase
    .from('organizations')
    .update({ features, updated_at: new Date().toISOString() })
    .eq('id', organizationId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Toggle feature on/off.
 */
export async function toggleFeature(
  organizationId: string,
  featureKey: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const flags = await getFeatureFlags(organizationId);
  const existing = flags[featureKey] || { enabled: false };
  
  return updateFeatureFlag(organizationId, featureKey, {
    ...existing,
    enabled,
  });
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

/**
 * Get user preferences.
 */
export async function getUserPreferences(
  userId: string
): Promise<UserPreference[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .order('category')
    .order('key');
  
  return (data || []).map(p => ({
    key: p.key,
    label: p.label,
    value: p.value,
    type: p.type as SettingType,
    category: p.category,
  }));
}

/**
 * Get a specific user preference.
 */
export async function getUserPreference(
  userId: string,
  key: string
): Promise<unknown> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('user_preferences')
    .select('value')
    .eq('user_id', userId)
    .eq('key', key)
    .single();
  
  return data?.value;
}

/**
 * Update user preference.
 */
export async function updateUserPreference(
  userId: string,
  key: string,
  value: unknown
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      key,
      value,
      updated_at: new Date().toISOString(),
    });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Update multiple user preferences.
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const records = Object.entries(preferences).map(([key, value]) => ({
    user_id: userId,
    key,
    value,
    updated_at: new Date().toISOString(),
  }));
  
  const { error } = await supabase
    .from('user_preferences')
    .upsert(records);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// CONFIGURATION TEMPLATES
// ============================================================================

/**
 * Get configuration templates.
 */
export async function getConfigurationTemplates(): Promise<ConfigurationTemplate[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('configuration_templates')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name');
  
  return (data || []).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    settings: t.settings,
    features: t.features,
    createdAt: t.created_at,
    isDefault: t.is_default,
  }));
}

/**
 * Apply configuration template.
 */
export async function applyConfigurationTemplate(
  organizationId: string,
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: template } = await supabase
    .from('configuration_templates')
    .select('*')
    .eq('id', templateId)
    .single();
  
  if (!template) {
    return { success: false, error: 'Template not found' };
  }
  
  // Apply template settings to organization
  const features: FeatureFlags = {};
  for (const featureKey of template.features || []) {
    features[featureKey] = { enabled: true };
  }
  
  const { error } = await supabase
    .from('organizations')
    .update({
      settings: template.settings,
      features,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Create configuration template from current settings.
 */
export async function createTemplateFromOrganization(
  organizationId: string,
  name: string,
  description: string
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  const supabase = createClient();
  
  const config = await getOrganizationConfig(organizationId);
  if (!config) {
    return { success: false, error: 'Organization not found' };
  }
  
  const enabledFeatures = Object.entries(config.features)
    .filter(([, v]) => v.enabled)
    .map(([k]) => k);
  
  const { data, error } = await supabase
    .from('configuration_templates')
    .insert({
      name,
      description,
      settings: config.settings,
      features: enabledFeatures,
      is_default: false,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, templateId: data.id };
}

// ============================================================================
// BRANDING
// ============================================================================

/**
 * Get branding config.
 */
export async function getBranding(
  organizationId: string
): Promise<BrandingConfig> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('organizations')
    .select('branding')
    .eq('id', organizationId)
    .single();
  
  return data?.branding || DEFAULT_BRANDING;
}

/**
 * Update branding config.
 */
export async function updateBranding(
  organizationId: string,
  branding: Partial<BrandingConfig>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const current = await getBranding(organizationId);
  const updated = { ...current, ...branding };
  
  const { error } = await supabase
    .from('organizations')
    .update({
      branding: updated,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Upload logo.
 */
export async function uploadLogo(
  organizationId: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = createClient();
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${organizationId}/logo.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from('branding')
    .upload(fileName, file, { upsert: true });
  
  if (uploadError) {
    return { success: false, error: uploadError.message };
  }
  
  const { data: urlData } = supabase.storage
    .from('branding')
    .getPublicUrl(fileName);
  
  // Update branding config
  await updateBranding(organizationId, { logo: urlData.publicUrl });
  
  return { success: true, url: urlData.publicUrl };
}

// ============================================================================
// SETTINGS EXPORT/IMPORT
// ============================================================================

/**
 * Export all settings.
 */
export async function exportSettings(
  organizationId: string
): Promise<{
  systemSettings: Record<string, unknown>;
  organizationConfig: OrganizationConfig | null;
  exportedAt: string;
}> {
  const settings = await getSystemSettings();
  const config = await getOrganizationConfig(organizationId);
  
  const systemSettings: Record<string, unknown> = {};
  for (const setting of settings) {
    systemSettings[setting.key] = setting.value;
  }
  
  return {
    systemSettings,
    organizationConfig: config,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Import settings.
 */
export async function importSettings(
  organizationId: string,
  data: {
    systemSettings?: Record<string, unknown>;
    organizationConfig?: Partial<OrganizationConfig>;
  },
  userId: string
): Promise<{ success: boolean; errors?: string[] }> {
  const errors: string[] = [];
  
  // Import system settings
  if (data.systemSettings) {
    const result = await updateSettings(data.systemSettings, userId);
    if (!result.success && result.errors) {
      errors.push(...Object.values(result.errors));
    }
  }
  
  // Import organization config
  if (data.organizationConfig) {
    const result = await updateOrganizationConfig(organizationId, {
      settings: data.organizationConfig.settings,
      features: data.organizationConfig.features,
      branding: data.organizationConfig.branding,
    });
    if (!result.success && result.error) {
      errors.push(result.error);
    }
  }
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ============================================================================
// OPERATIONAL SETTINGS (QUICK ACCESS)
// ============================================================================

/**
 * Get operation-specific settings.
 */
export async function getOperationalSettings(): Promise<{
  orderAutoAssignment: boolean;
  maxOrdersPerRider: number;
  shiftDurationMinutes: number;
  breakDurationMinutes: number;
  overtimeThresholdHours: number;
  lateArrivalGraceMinutes: number;
  performanceScoringEnabled: boolean;
}> {
  const settings = await getSystemSettings('operations');
  
  const getValue = (key: string, defaultVal: unknown) => {
    const setting = settings.find(s => s.key === key);
    return setting?.value ?? defaultVal;
  };
  
  return {
    orderAutoAssignment: getValue('order_auto_assignment', true) as boolean,
    maxOrdersPerRider: getValue('max_orders_per_rider', 10) as number,
    shiftDurationMinutes: getValue('shift_duration_minutes', 480) as number,
    breakDurationMinutes: getValue('break_duration_minutes', 30) as number,
    overtimeThresholdHours: getValue('overtime_threshold_hours', 8) as number,
    lateArrivalGraceMinutes: getValue('late_arrival_grace_minutes', 10) as number,
    performanceScoringEnabled: getValue('performance_scoring_enabled', true) as boolean,
  };
}

/**
 * Get finance-specific settings.
 */
export async function getFinanceSettings(): Promise<{
  currency: string;
  taxRate: number;
  invoiceDueDays: number;
  payrollDayOfMonth: number;
  commissionPayoutDelay: number;
  overdueReminderDays: number[];
}> {
  const settings = await getSystemSettings('finance');
  
  const getValue = (key: string, defaultVal: unknown) => {
    const setting = settings.find(s => s.key === key);
    return setting?.value ?? defaultVal;
  };
  
  return {
    currency: getValue('currency', 'AED') as string,
    taxRate: getValue('tax_rate', 5) as number,
    invoiceDueDays: getValue('invoice_due_days', 30) as number,
    payrollDayOfMonth: getValue('payroll_day_of_month', 25) as number,
    commissionPayoutDelay: getValue('commission_payout_delay', 7) as number,
    overdueReminderDays: getValue('overdue_reminder_days', [7, 14, 30]) as number[],
  };
}
