'use client';

/**
 * User Roles & Permissions Service (T-100 to T-102)
 * 
 * Manages:
 * - Role definitions
 * - Permission management
 * - Access control
 * - Role assignments
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type ResourceType = 
  | 'employee'
  | 'rider'
  | 'order'
  | 'asset'
  | 'document'
  | 'attendance'
  | 'leave'
  | 'shift'
  | 'payroll'
  | 'invoice'
  | 'incident'
  | 'report'
  | 'settings'
  | 'user';

export type ActionType = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export' | 'manage';

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  resource: ResourceType;
  actions: ActionType[];
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'not_in' | 'own';
  value?: unknown;
}

export interface UserRole {
  userId: string;
  roleId: string;
  roleName: string;
  assignedAt: string;
  assignedBy: string;
  expiresAt: string | null;
}

export interface PermissionCheck {
  resource: ResourceType;
  action: ActionType;
  resourceId?: string;
  context?: Record<string, unknown>;
}

export interface AccessDecision {
  allowed: boolean;
  reason?: string;
  conditions?: PermissionCondition[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const RESOURCE_LABELS: Record<ResourceType, string> = {
  employee: 'Employees',
  rider: 'Riders',
  order: 'Orders',
  asset: 'Assets',
  document: 'Documents',
  attendance: 'Attendance',
  leave: 'Leave Requests',
  shift: 'Shifts',
  payroll: 'Payroll',
  invoice: 'Invoices',
  incident: 'Incidents',
  report: 'Reports',
  settings: 'Settings',
  user: 'Users',
};

export const ACTION_LABELS: Record<ActionType, string> = {
  create: 'Create',
  read: 'View',
  update: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  export: 'Export',
  manage: 'Manage',
};

// Default role permissions
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: [
    { resource: 'employee', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'rider', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'order', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'asset', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'document', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'attendance', actions: ['create', 'read', 'update', 'delete', 'approve'] },
    { resource: 'leave', actions: ['create', 'read', 'update', 'delete', 'approve'] },
    { resource: 'shift', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'payroll', actions: ['create', 'read', 'update', 'approve', 'export'] },
    { resource: 'invoice', actions: ['create', 'read', 'update', 'delete', 'approve'] },
    { resource: 'incident', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'report', actions: ['read', 'export', 'manage'] },
    { resource: 'settings', actions: ['read', 'update', 'manage'] },
    { resource: 'user', actions: ['create', 'read', 'update', 'delete', 'manage'] },
  ],
  admin: [
    { resource: 'employee', actions: ['create', 'read', 'update'] },
    { resource: 'rider', actions: ['create', 'read', 'update'] },
    { resource: 'order', actions: ['create', 'read', 'update'] },
    { resource: 'asset', actions: ['create', 'read', 'update'] },
    { resource: 'document', actions: ['create', 'read', 'update'] },
    { resource: 'attendance', actions: ['create', 'read', 'update', 'approve'] },
    { resource: 'leave', actions: ['read', 'update', 'approve'] },
    { resource: 'shift', actions: ['create', 'read', 'update'] },
    { resource: 'payroll', actions: ['read'] },
    { resource: 'invoice', actions: ['create', 'read', 'update'] },
    { resource: 'incident', actions: ['create', 'read', 'update'] },
    { resource: 'report', actions: ['read', 'export'] },
    { resource: 'settings', actions: ['read'] },
    { resource: 'user', actions: ['read'] },
  ],
  supervisor: [
    { resource: 'employee', actions: ['read'] },
    { resource: 'rider', actions: ['read', 'update'] },
    { resource: 'order', actions: ['read', 'update'] },
    { resource: 'asset', actions: ['read'] },
    { resource: 'document', actions: ['read'] },
    { resource: 'attendance', actions: ['read', 'update'] },
    { resource: 'leave', actions: ['read', 'approve'] },
    { resource: 'shift', actions: ['read', 'update'] },
    { resource: 'incident', actions: ['create', 'read', 'update'] },
    { resource: 'report', actions: ['read'] },
  ],
  hr: [
    { resource: 'employee', actions: ['create', 'read', 'update'] },
    { resource: 'rider', actions: ['create', 'read', 'update'] },
    { resource: 'document', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'attendance', actions: ['read', 'update', 'approve'] },
    { resource: 'leave', actions: ['read', 'update', 'approve'] },
    { resource: 'payroll', actions: ['create', 'read', 'update', 'approve'] },
    { resource: 'report', actions: ['read', 'export'] },
  ],
  rider: [
    { resource: 'order', actions: ['read', 'update'], conditions: [{ field: 'rider_id', operator: 'own' }] },
    { resource: 'document', actions: ['read', 'create'], conditions: [{ field: 'employee_id', operator: 'own' }] },
    { resource: 'attendance', actions: ['read'], conditions: [{ field: 'employee_id', operator: 'own' }] },
    { resource: 'leave', actions: ['create', 'read'], conditions: [{ field: 'employee_id', operator: 'own' }] },
    { resource: 'shift', actions: ['read'], conditions: [{ field: 'employee_id', operator: 'own' }] },
    { resource: 'incident', actions: ['create', 'read'], conditions: [{ field: 'rider_id', operator: 'own' }] },
  ],
};

// ============================================================================
// ROLE MANAGEMENT
// ============================================================================

/**
 * Get all roles.
 */
export async function getRoles(): Promise<Role[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('roles')
    .select('*')
    .order('name');
  
  return (data || []).map(r => ({
    id: r.id,
    name: r.name,
    displayName: r.display_name,
    description: r.description,
    permissions: r.permissions as Permission[],
    isSystem: r.is_system,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

/**
 * Get a role by ID.
 */
export async function getRole(roleId: string): Promise<Role | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single();
  
  if (!data) return null;
  
  return {
    id: data.id,
    name: data.name,
    displayName: data.display_name,
    description: data.description,
    permissions: data.permissions as Permission[],
    isSystem: data.is_system,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Get role by name.
 */
export async function getRoleByName(name: string): Promise<Role | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('roles')
    .select('*')
    .eq('name', name)
    .single();
  
  if (!data) return null;
  
  return {
    id: data.id,
    name: data.name,
    displayName: data.display_name,
    description: data.description,
    permissions: data.permissions as Permission[],
    isSystem: data.is_system,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Create a new role.
 */
export async function createRole(input: {
  name: string;
  displayName: string;
  description?: string;
  permissions: Permission[];
}): Promise<{ success: boolean; roleId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('roles')
    .insert({
      name: input.name.toLowerCase().replace(/\s+/g, '_'),
      display_name: input.displayName,
      description: input.description || '',
      permissions: input.permissions,
      is_system: false,
      is_active: true,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, roleId: data.id };
}

/**
 * Update a role.
 */
export async function updateRole(
  roleId: string,
  updates: Partial<Pick<Role, 'displayName' | 'description' | 'permissions' | 'isActive'>>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Check if system role
  const { data: role } = await supabase
    .from('roles')
    .select('is_system')
    .eq('id', roleId)
    .single();
  
  if (role?.is_system) {
    return { success: false, error: 'Cannot modify system roles' };
  }
  
  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (updates.displayName) dbUpdates.display_name = updates.displayName;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.permissions) dbUpdates.permissions = updates.permissions;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  
  const { error } = await supabase
    .from('roles')
    .update(dbUpdates)
    .eq('id', roleId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Delete a role.
 */
export async function deleteRole(
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Check if system role
  const { data: role } = await supabase
    .from('roles')
    .select('is_system')
    .eq('id', roleId)
    .single();
  
  if (role?.is_system) {
    return { success: false, error: 'Cannot delete system roles' };
  }
  
  // Check if role is in use
  const { count } = await supabase
    .from('user_roles')
    .select('*', { count: 'exact', head: true })
    .eq('role_id', roleId);
  
  if (count && count > 0) {
    return { success: false, error: 'Role is assigned to users' };
  }
  
  const { error } = await supabase
    .from('roles')
    .delete()
    .eq('id', roleId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// USER ROLE ASSIGNMENT
// ============================================================================

/**
 * Assign role to user.
 */
export async function assignRoleToUser(input: {
  userId: string;
  roleId: string;
  assignedBy: string;
  expiresAt?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Check if already assigned
  const { data: existing } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', input.userId)
    .eq('role_id', input.roleId)
    .single();
  
  if (existing) {
    return { success: false, error: 'Role already assigned to user' };
  }
  
  const { error } = await supabase
    .from('user_roles')
    .insert({
      user_id: input.userId,
      role_id: input.roleId,
      assigned_by: input.assignedBy,
      expires_at: input.expiresAt,
    });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Remove role from user.
 */
export async function removeRoleFromUser(
  userId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Get user roles.
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('user_roles')
    .select(`
      *,
      role:roles(name, display_name)
    `)
    .eq('user_id', userId);
  
  return (data || []).map(ur => {
    const role = ur.role as unknown;
    const roleData = (Array.isArray(role) ? role[0] : role) as { name: string; display_name: string } | null;
    
    return {
      userId: ur.user_id,
      roleId: ur.role_id,
      roleName: roleData?.display_name || roleData?.name || 'Unknown',
      assignedAt: ur.assigned_at,
      assignedBy: ur.assigned_by,
      expiresAt: ur.expires_at,
    };
  });
}

/**
 * Get users with role.
 */
export async function getUsersWithRole(
  roleId: string
): Promise<Array<{ userId: string; userName: string; assignedAt: string }>> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('user_roles')
    .select(`
      user_id,
      assigned_at,
      user:employees(full_name)
    `)
    .eq('role_id', roleId);
  
  return (data || []).map(ur => {
    const user = ur.user as unknown;
    const userData = (Array.isArray(user) ? user[0] : user) as { full_name: string } | null;
    
    return {
      userId: ur.user_id,
      userName: userData?.full_name || 'Unknown',
      assignedAt: ur.assigned_at,
    };
  });
}

// ============================================================================
// PERMISSION CHECKING
// ============================================================================

/**
 * Check if user has permission.
 */
export async function checkPermission(
  userId: string,
  check: PermissionCheck
): Promise<AccessDecision> {
  const supabase = createClient();
  
  // Get user roles
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select(`
      role:roles(permissions)
    `)
    .eq('user_id', userId);
  
  if (!userRoles || userRoles.length === 0) {
    return { allowed: false, reason: 'No roles assigned' };
  }
  
  // Check each role's permissions
  for (const ur of userRoles) {
    const role = ur.role as unknown;
    const roleData = (Array.isArray(role) ? role[0] : role) as { permissions: Permission[] } | null;
    
    if (!roleData?.permissions) continue;
    
    for (const permission of roleData.permissions) {
      if (permission.resource === check.resource && permission.actions.includes(check.action)) {
        // Check conditions if any
        if (permission.conditions && permission.conditions.length > 0) {
          const conditionsMet = await evaluateConditions(
            permission.conditions,
            check.resource,
            check.resourceId,
            userId,
            check.context
          );
          
          if (conditionsMet) {
            return { allowed: true, conditions: permission.conditions };
          }
        } else {
          return { allowed: true };
        }
      }
    }
  }
  
  return { allowed: false, reason: 'Permission denied' };
}

/**
 * Evaluate permission conditions.
 */
async function evaluateConditions(
  conditions: PermissionCondition[],
  resource: ResourceType,
  resourceId: string | undefined,
  userId: string,
  context?: Record<string, unknown>
): Promise<boolean> {
  for (const condition of conditions) {
    if (condition.operator === 'own') {
      // Check if the resource belongs to the user
      if (!resourceId) return false;
      
      const supabase = createClient();
      const tableName = getTableName(resource);
      
      const { data } = await supabase
        .from(tableName)
        .select(condition.field)
        .eq('id', resourceId)
        .single();
      
      const record = data as Record<string, unknown> | null;
      if (!record || record[condition.field] !== userId) {
        return false;
      }
    } else if (context) {
      const fieldValue = context[condition.field];
      
      switch (condition.operator) {
        case 'eq':
          if (fieldValue !== condition.value) return false;
          break;
        case 'neq':
          if (fieldValue === condition.value) return false;
          break;
        case 'in':
          if (!Array.isArray(condition.value) || !condition.value.includes(fieldValue)) return false;
          break;
        case 'not_in':
          if (Array.isArray(condition.value) && condition.value.includes(fieldValue)) return false;
          break;
      }
    }
  }
  
  return true;
}

function getTableName(resource: ResourceType): string {
  const tableMap: Record<ResourceType, string> = {
    employee: 'employees',
    rider: 'employees',
    order: 'orders',
    asset: 'assets',
    document: 'documents',
    attendance: 'attendance',
    leave: 'leave_requests',
    shift: 'shift_assignments',
    payroll: 'pay_slips',
    invoice: 'invoices',
    incident: 'incidents',
    report: 'report_definitions',
    settings: 'system_settings',
    user: 'employees',
  };
  return tableMap[resource];
}

/**
 * Check multiple permissions.
 */
export async function checkPermissions(
  userId: string,
  checks: PermissionCheck[]
): Promise<Record<string, AccessDecision>> {
  const results: Record<string, AccessDecision> = {};
  
  for (const check of checks) {
    const key = `${check.resource}:${check.action}`;
    results[key] = await checkPermission(userId, check);
  }
  
  return results;
}

/**
 * Get user permissions summary.
 */
export async function getUserPermissions(
  userId: string
): Promise<Permission[]> {
  const supabase = createClient();
  
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select(`
      role:roles(permissions)
    `)
    .eq('user_id', userId);
  
  const allPermissions: Permission[] = [];
  const seen = new Set<string>();
  
  for (const ur of userRoles || []) {
    const role = ur.role as unknown;
    const roleData = (Array.isArray(role) ? role[0] : role) as { permissions: Permission[] } | null;
    
    if (!roleData?.permissions) continue;
    
    for (const permission of roleData.permissions) {
      const key = `${permission.resource}:${permission.actions.join(',')}`;
      if (!seen.has(key)) {
        seen.add(key);
        allPermissions.push(permission);
      }
    }
  }
  
  return allPermissions;
}

// ============================================================================
// PERMISSION MATRIX
// ============================================================================

/**
 * Get permission matrix for all roles.
 */
export async function getPermissionMatrix(): Promise<{
  resources: ResourceType[];
  actions: ActionType[];
  roles: Array<{
    id: string;
    name: string;
    displayName: string;
    permissions: Record<string, ActionType[]>;
  }>;
}> {
  const roles = await getRoles();
  
  const resources: ResourceType[] = [
    'employee', 'rider', 'order', 'asset', 'document',
    'attendance', 'leave', 'shift', 'payroll', 'invoice',
    'incident', 'report', 'settings', 'user'
  ];
  
  const actions: ActionType[] = ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage'];
  
  return {
    resources,
    actions,
    roles: roles.map(role => {
      const permissions: Record<string, ActionType[]> = {};
      
      for (const perm of role.permissions) {
        permissions[perm.resource] = perm.actions;
      }
      
      return {
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        permissions,
      };
    }),
  };
}

// ============================================================================
// ROLE TEMPLATES
// ============================================================================

/**
 * Clone a role.
 */
export async function cloneRole(
  roleId: string,
  newName: string,
  newDisplayName: string
): Promise<{ success: boolean; roleId?: string; error?: string }> {
  const role = await getRole(roleId);
  
  if (!role) {
    return { success: false, error: 'Role not found' };
  }
  
  return createRole({
    name: newName,
    displayName: newDisplayName,
    description: `Cloned from ${role.displayName}`,
    permissions: role.permissions,
  });
}

/**
 * Initialize default roles.
 */
export async function initializeDefaultRoles(): Promise<{
  success: boolean;
  rolesCreated: string[];
  errors: string[];
}> {
  const rolesCreated: string[] = [];
  const errors: string[] = [];
  
  const defaultRoles = [
    { name: 'super_admin', displayName: 'Super Admin', description: 'Full system access' },
    { name: 'admin', displayName: 'Administrator', description: 'Administrative access' },
    { name: 'supervisor', displayName: 'Supervisor', description: 'Team supervision' },
    { name: 'hr', displayName: 'HR Manager', description: 'Human resources management' },
    { name: 'rider', displayName: 'Rider', description: 'Delivery rider access' },
  ];
  
  for (const roleDef of defaultRoles) {
    // Check if exists
    const existing = await getRoleByName(roleDef.name);
    if (existing) continue;
    
    const permissions = DEFAULT_ROLE_PERMISSIONS[roleDef.name] || [];
    
    const result = await createRole({
      name: roleDef.name,
      displayName: roleDef.displayName,
      description: roleDef.description,
      permissions,
    });
    
    if (result.success) {
      rolesCreated.push(roleDef.name);
    } else if (result.error) {
      errors.push(`${roleDef.name}: ${result.error}`);
    }
  }
  
  return { success: errors.length === 0, rolesCreated, errors };
}

// ============================================================================
// SUMMARY
// ============================================================================

/**
 * Get roles summary.
 */
export async function getRolesSummary(): Promise<{
  totalRoles: number;
  systemRoles: number;
  customRoles: number;
  usersPerRole: Array<{ roleId: string; roleName: string; userCount: number }>;
}> {
  const supabase = createClient();
  
  const roles = await getRoles();
  
  const { data: userRoleCounts } = await supabase
    .from('user_roles')
    .select('role_id');
  
  const countMap = new Map<string, number>();
  for (const ur of userRoleCounts || []) {
    countMap.set(ur.role_id, (countMap.get(ur.role_id) || 0) + 1);
  }
  
  return {
    totalRoles: roles.length,
    systemRoles: roles.filter(r => r.isSystem).length,
    customRoles: roles.filter(r => !r.isSystem).length,
    usersPerRole: roles.map(r => ({
      roleId: r.id,
      roleName: r.displayName,
      userCount: countMap.get(r.id) || 0,
    })),
  };
}
