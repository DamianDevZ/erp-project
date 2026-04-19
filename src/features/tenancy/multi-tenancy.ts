'use client';

/**
 * Multi-Tenancy Service (T-103 to T-105)
 * 
 * Manages:
 * - Organization isolation
 * - Tenant switching
 * - Data scoping
 * - Tenant settings
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  displayName: string;
  logo?: string;
  settings: OrganizationSettings;
  subscription: SubscriptionInfo;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  features: FeatureFlags;
  branding: BrandingSettings;
  notifications: NotificationSettings;
}

export interface FeatureFlags {
  orders: boolean;
  assets: boolean;
  attendance: boolean;
  leave: boolean;
  payroll: boolean;
  invoicing: boolean;
  incidents: boolean;
  reporting: boolean;
  integrations: boolean;
}

export interface BrandingSettings {
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  companyName: string;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  digestFrequency: 'instant' | 'hourly' | 'daily' | 'weekly';
}

export interface SubscriptionInfo {
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'suspended';
  userLimit: number;
  storageLimit: number; // in GB
  currentUsers: number;
  currentStorage: number;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
}

export interface TenantContext {
  organizationId: string;
  organizationName: string;
  userId: string;
  userName: string;
  role: string;
  permissions: string[];
}

export interface OrganizationMember {
  userId: string;
  userName: string;
  email: string;
  role: string;
  joinedAt: string;
  lastActiveAt?: string;
  status: 'active' | 'invited' | 'suspended';
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_SETTINGS: OrganizationSettings = {
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  currency: 'USD',
  language: 'en',
  theme: 'light',
  features: {
    orders: true,
    assets: true,
    attendance: true,
    leave: true,
    payroll: true,
    invoicing: true,
    incidents: true,
    reporting: true,
    integrations: true,
  },
  branding: {
    primaryColor: '#3b82f6',
    accentColor: '#10b981',
    companyName: 'My Company',
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    digestFrequency: 'daily',
  },
};

export const PLAN_LIMITS: Record<string, { users: number; storage: number }> = {
  free: { users: 5, storage: 1 },
  starter: { users: 25, storage: 10 },
  professional: { users: 100, storage: 50 },
  enterprise: { users: -1, storage: -1 }, // unlimited
};

// ============================================================================
// ORGANIZATION MANAGEMENT
// ============================================================================

/**
 * Get organization by ID.
 */
export async function getOrganization(orgId: string): Promise<Organization | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();
  
  if (!data) return null;
  
  return mapOrganization(data);
}

/**
 * Get organization by slug.
 */
export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single();
  
  if (!data) return null;
  
  return mapOrganization(data);
}

function mapOrganization(data: Record<string, unknown>): Organization {
  return {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    displayName: (data.display_name || data.name) as string,
    logo: data.logo as string | undefined,
    settings: (data.settings || DEFAULT_SETTINGS) as OrganizationSettings,
    subscription: {
      plan: (data.subscription_plan || 'free') as SubscriptionInfo['plan'],
      status: (data.subscription_status || 'active') as SubscriptionInfo['status'],
      userLimit: (data.user_limit || PLAN_LIMITS.free.users) as number,
      storageLimit: (data.storage_limit || PLAN_LIMITS.free.storage) as number,
      currentUsers: (data.current_users || 0) as number,
      currentStorage: (data.current_storage || 0) as number,
      trialEndsAt: data.trial_ends_at as string | undefined,
      currentPeriodEnd: data.current_period_end as string | undefined,
    },
    isActive: (data.is_active ?? true) as boolean,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

/**
 * Create organization.
 */
export async function createOrganization(input: {
  name: string;
  displayName?: string;
  ownerUserId: string;
  plan?: SubscriptionInfo['plan'];
}): Promise<{ success: boolean; organizationId?: string; error?: string }> {
  const supabase = createClient();
  
  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Check slug uniqueness
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (existing) {
    return { success: false, error: 'Organization slug already exists' };
  }
  
  const plan = input.plan || 'free';
  const limits = PLAN_LIMITS[plan];
  
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name: input.name,
      slug,
      display_name: input.displayName || input.name,
      settings: DEFAULT_SETTINGS,
      subscription_plan: plan,
      subscription_status: 'active',
      user_limit: limits.users,
      storage_limit: limits.storage,
      current_users: 1,
      current_storage: 0,
      is_active: true,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Add owner as member
  await supabase
    .from('organization_members')
    .insert({
      organization_id: data.id,
      user_id: input.ownerUserId,
      role: 'owner',
      status: 'active',
    });
  
  return { success: true, organizationId: data.id };
}

/**
 * Update organization.
 */
export async function updateOrganization(
  orgId: string,
  updates: Partial<Pick<Organization, 'name' | 'displayName' | 'logo' | 'settings' | 'isActive'>>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.displayName) dbUpdates.display_name = updates.displayName;
  if (updates.logo !== undefined) dbUpdates.logo = updates.logo;
  if (updates.settings) dbUpdates.settings = updates.settings;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  
  const { error } = await supabase
    .from('organizations')
    .update(dbUpdates)
    .eq('id', orgId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Delete organization (soft delete).
 */
export async function deleteOrganization(
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('organizations')
    .update({
      is_active: false,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', orgId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// ORGANIZATION MEMBERS
// ============================================================================

/**
 * Get organization members.
 */
export async function getOrganizationMembers(
  orgId: string
): Promise<OrganizationMember[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('organization_members')
    .select(`
      *,
      user:employees(full_name, email)
    `)
    .eq('organization_id', orgId)
    .order('joined_at', { ascending: false });
  
  return (data || []).map(m => {
    const user = m.user as unknown;
    const userData = (Array.isArray(user) ? user[0] : user) as { full_name: string; email: string } | null;
    
    return {
      userId: m.user_id,
      userName: userData?.full_name || 'Unknown',
      email: userData?.email || '',
      role: m.role,
      joinedAt: m.joined_at,
      lastActiveAt: m.last_active_at,
      status: m.status,
    };
  });
}

/**
 * Add member to organization.
 */
export async function addOrganizationMember(input: {
  organizationId: string;
  userId: string;
  role: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Check user limit
  const org = await getOrganization(input.organizationId);
  if (!org) {
    return { success: false, error: 'Organization not found' };
  }
  
  if (org.subscription.userLimit !== -1 && 
      org.subscription.currentUsers >= org.subscription.userLimit) {
    return { success: false, error: 'User limit reached for this plan' };
  }
  
  // Check if already member
  const { data: existing } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', input.organizationId)
    .eq('user_id', input.userId)
    .single();
  
  if (existing) {
    return { success: false, error: 'User is already a member' };
  }
  
  const { error } = await supabase
    .from('organization_members')
    .insert({
      organization_id: input.organizationId,
      user_id: input.userId,
      role: input.role,
      status: 'active',
    });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update user count
  await supabase
    .from('organizations')
    .update({ current_users: org.subscription.currentUsers + 1 })
    .eq('id', input.organizationId);
  
  return { success: true };
}

/**
 * Remove member from organization.
 */
export async function removeOrganizationMember(
  organizationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Check if owner
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .single();
  
  if (member?.role === 'owner') {
    return { success: false, error: 'Cannot remove organization owner' };
  }
  
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', organizationId)
    .eq('user_id', userId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update user count
  const org = await getOrganization(organizationId);
  if (org) {
    await supabase
      .from('organizations')
      .update({ current_users: Math.max(0, org.subscription.currentUsers - 1) })
      .eq('id', organizationId);
  }
  
  return { success: true };
}

/**
 * Update member role.
 */
export async function updateMemberRole(
  organizationId: string,
  userId: string,
  newRole: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('organization_members')
    .update({ role: newRole })
    .eq('organization_id', organizationId)
    .eq('user_id', userId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// TENANT SWITCHING
// ============================================================================

/**
 * Get user organizations.
 */
export async function getUserOrganizations(
  userId: string
): Promise<Array<{ organization: Organization; role: string }>> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('organization_members')
    .select(`
      role,
      organization:organizations(*)
    `)
    .eq('user_id', userId)
    .eq('status', 'active');
  
  return (data || []).map(m => {
    const org = m.organization as unknown;
    const orgData = (Array.isArray(org) ? org[0] : org) as Record<string, unknown>;
    
    return {
      organization: mapOrganization(orgData),
      role: m.role,
    };
  });
}

/**
 * Get current tenant context.
 */
export async function getTenantContext(
  userId: string,
  organizationId: string
): Promise<TenantContext | null> {
  const supabase = createClient();
  
  // Get organization
  const org = await getOrganization(organizationId);
  if (!org || !org.isActive) return null;
  
  // Get membership
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  
  if (!member) return null;
  
  // Get user info
  const { data: user } = await supabase
    .from('employees')
    .select('full_name')
    .eq('id', userId)
    .single();
  
  // Get permissions (from roles service would be better)
  const permissions = getDefaultPermissions(member.role);
  
  return {
    organizationId,
    organizationName: org.displayName,
    userId,
    userName: user?.full_name || 'Unknown',
    role: member.role,
    permissions,
  };
}

function getDefaultPermissions(role: string): string[] {
  const permissionMap: Record<string, string[]> = {
    owner: ['*'],
    admin: ['manage:users', 'manage:settings', 'read:reports', 'manage:data'],
    manager: ['read:reports', 'manage:team'],
    member: ['read:own'],
  };
  return permissionMap[role] || permissionMap.member;
}

/**
 * Switch tenant context.
 */
export async function switchTenant(
  userId: string,
  organizationId: string
): Promise<{ success: boolean; context?: TenantContext; error?: string }> {
  const context = await getTenantContext(userId, organizationId);
  
  if (!context) {
    return { success: false, error: 'Not authorized for this organization' };
  }
  
  // Update last active
  const supabase = createClient();
  await supabase
    .from('organization_members')
    .update({ last_active_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('user_id', userId);
  
  return { success: true, context };
}

// ============================================================================
// DATA SCOPING
// ============================================================================

/**
 * Apply organization scope to query.
 */
export function withOrgScope<T extends { organization_id: string }>(
  data: T[],
  organizationId: string
): T[] {
  return data.filter(item => item.organization_id === organizationId);
}

/**
 * Validate resource belongs to organization.
 */
export async function validateOrgResource(
  table: string,
  resourceId: string,
  organizationId: string
): Promise<boolean> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from(table)
    .select('organization_id')
    .eq('id', resourceId)
    .single();
  
  return data?.organization_id === organizationId;
}

/**
 * Get organization data counts.
 */
export async function getOrganizationDataCounts(
  organizationId: string
): Promise<Record<string, number>> {
  const supabase = createClient();
  
  const tables = [
    'employees',
    'orders',
    'assets',
    'documents',
    'invoices',
    'incidents',
  ];
  
  const counts: Record<string, number> = {};
  
  for (const table of tables) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);
    
    counts[table] = count || 0;
  }
  
  return counts;
}

// ============================================================================
// ORGANIZATION SETTINGS
// ============================================================================

/**
 * Get organization settings.
 */
export async function getOrganizationSettings(
  orgId: string
): Promise<OrganizationSettings | null> {
  const org = await getOrganization(orgId);
  return org?.settings || null;
}

/**
 * Update organization settings.
 */
export async function updateOrganizationSettings(
  orgId: string,
  settings: Partial<OrganizationSettings>
): Promise<{ success: boolean; error?: string }> {
  const org = await getOrganization(orgId);
  if (!org) {
    return { success: false, error: 'Organization not found' };
  }
  
  const mergedSettings = {
    ...org.settings,
    ...settings,
    features: {
      ...org.settings.features,
      ...(settings.features || {}),
    },
    branding: {
      ...org.settings.branding,
      ...(settings.branding || {}),
    },
    notifications: {
      ...org.settings.notifications,
      ...(settings.notifications || {}),
    },
  };
  
  return updateOrganization(orgId, { settings: mergedSettings });
}

/**
 * Check feature flag.
 */
export async function isFeatureEnabled(
  orgId: string,
  feature: keyof FeatureFlags
): Promise<boolean> {
  const settings = await getOrganizationSettings(orgId);
  return settings?.features[feature] ?? true;
}

// ============================================================================
// SUBSCRIPTION
// ============================================================================

/**
 * Get subscription status.
 */
export async function getSubscriptionStatus(
  orgId: string
): Promise<SubscriptionInfo | null> {
  const org = await getOrganization(orgId);
  return org?.subscription || null;
}

/**
 * Update subscription.
 */
export async function updateSubscription(
  orgId: string,
  updates: Partial<SubscriptionInfo>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (updates.plan) {
    dbUpdates.subscription_plan = updates.plan;
    const limits = PLAN_LIMITS[updates.plan];
    dbUpdates.user_limit = limits.users;
    dbUpdates.storage_limit = limits.storage;
  }
  if (updates.status) dbUpdates.subscription_status = updates.status;
  if (updates.trialEndsAt) dbUpdates.trial_ends_at = updates.trialEndsAt;
  if (updates.currentPeriodEnd) dbUpdates.current_period_end = updates.currentPeriodEnd;
  
  const { error } = await supabase
    .from('organizations')
    .update(dbUpdates)
    .eq('id', orgId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Check if within limits.
 */
export async function checkLimits(
  orgId: string
): Promise<{
  withinLimits: boolean;
  users: { current: number; limit: number; exceeded: boolean };
  storage: { current: number; limit: number; exceeded: boolean };
}> {
  const org = await getOrganization(orgId);
  
  if (!org) {
    return {
      withinLimits: false,
      users: { current: 0, limit: 0, exceeded: true },
      storage: { current: 0, limit: 0, exceeded: true },
    };
  }
  
  const { subscription } = org;
  
  const usersExceeded = subscription.userLimit !== -1 && 
    subscription.currentUsers > subscription.userLimit;
  
  const storageExceeded = subscription.storageLimit !== -1 && 
    subscription.currentStorage > subscription.storageLimit;
  
  return {
    withinLimits: !usersExceeded && !storageExceeded,
    users: {
      current: subscription.currentUsers,
      limit: subscription.userLimit,
      exceeded: usersExceeded,
    },
    storage: {
      current: subscription.currentStorage,
      limit: subscription.storageLimit,
      exceeded: storageExceeded,
    },
  };
}

// ============================================================================
// ORGANIZATION INVITATIONS
// ============================================================================

/**
 * Create organization invitation.
 */
export async function createInvitation(input: {
  organizationId: string;
  email: string;
  role: string;
  invitedBy: string;
}): Promise<{ success: boolean; invitationId?: string; error?: string }> {
  const supabase = createClient();
  
  // Check limits
  const limits = await checkLimits(input.organizationId);
  if (limits.users.exceeded) {
    return { success: false, error: 'User limit exceeded' };
  }
  
  // Generate token
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
  
  const { data, error } = await supabase
    .from('organization_invitations')
    .insert({
      organization_id: input.organizationId,
      email: input.email.toLowerCase(),
      role: input.role,
      invited_by: input.invitedBy,
      token,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, invitationId: data.id };
}

/**
 * Accept invitation.
 */
export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ success: boolean; organizationId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data: invitation } = await supabase
    .from('organization_invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single();
  
  if (!invitation) {
    return { success: false, error: 'Invalid or expired invitation' };
  }
  
  if (new Date(invitation.expires_at) < new Date()) {
    return { success: false, error: 'Invitation has expired' };
  }
  
  // Add member
  const addResult = await addOrganizationMember({
    organizationId: invitation.organization_id,
    userId,
    role: invitation.role,
  });
  
  if (!addResult.success) {
    return addResult;
  }
  
  // Update invitation status
  await supabase
    .from('organization_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);
  
  return { success: true, organizationId: invitation.organization_id };
}

// ============================================================================
// SUMMARY
// ============================================================================

/**
 * Get organization summary.
 */
export async function getOrganizationSummary(
  orgId: string
): Promise<{
  organization: Organization;
  memberCount: number;
  dataCounts: Record<string, number>;
  limits: Awaited<ReturnType<typeof checkLimits>>;
} | null> {
  const org = await getOrganization(orgId);
  if (!org) return null;
  
  const members = await getOrganizationMembers(orgId);
  const dataCounts = await getOrganizationDataCounts(orgId);
  const limits = await checkLimits(orgId);
  
  return {
    organization: org,
    memberCount: members.length,
    dataCounts,
    limits,
  };
}
