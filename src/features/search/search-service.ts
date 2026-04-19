'use client';

/**
 * Search & Filtering Service (T-091 to T-093)
 * 
 * Manages:
 * - Global search
 * - Entity-specific filtering
 * - Saved filters
 * - Search history
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type SearchEntityType = 
  | 'employee'
  | 'rider'
  | 'order'
  | 'asset'
  | 'document'
  | 'invoice'
  | 'incident';

export type FilterOperator = 
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in'
  | 'is_null'
  | 'is_not_null'
  | 'between';

export interface SearchResult {
  entityType: SearchEntityType;
  entityId: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  status: string | null;
  url: string;
  relevanceScore: number;
  highlightedText: string | null;
}

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
  label?: string;
}

export interface FilterGroup {
  logic: 'and' | 'or';
  conditions: FilterCondition[];
}

export interface SavedFilter {
  id: string;
  name: string;
  entityType: SearchEntityType;
  filters: FilterGroup;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  columns?: string[];
  isDefault: boolean;
  isShared: boolean;
  createdBy: string;
  createdAt: string;
  usageCount: number;
}

export interface SearchHistory {
  id: string;
  query: string;
  entityType: SearchEntityType | null;
  resultsCount: number;
  searchedAt: string;
}

export interface FilterField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  operators: FilterOperator[];
  options?: Array<{ value: string; label: string }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const ENTITY_TYPE_LABELS: Record<SearchEntityType, string> = {
  employee: 'Employees',
  rider: 'Riders',
  order: 'Orders',
  asset: 'Assets',
  document: 'Documents',
  invoice: 'Invoices',
  incident: 'Incidents',
};

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: 'Equals',
  neq: 'Not equals',
  gt: 'Greater than',
  gte: 'Greater than or equal',
  lt: 'Less than',
  lte: 'Less than or equal',
  contains: 'Contains',
  starts_with: 'Starts with',
  ends_with: 'Ends with',
  in: 'Is one of',
  not_in: 'Is not one of',
  is_null: 'Is empty',
  is_not_null: 'Is not empty',
  between: 'Between',
};

// ============================================================================
// GLOBAL SEARCH
// ============================================================================

/**
 * Perform global search across all entities.
 */
export async function globalSearch(
  query: string,
  options?: {
    entityTypes?: SearchEntityType[];
    limit?: number;
    userId?: string;
  }
): Promise<SearchResult[]> {
  if (!query || query.length < 2) {
    return [];
  }
  
  const supabase = createClient();
  const searchTerm = `%${query.toLowerCase()}%`;
  const limit = options?.limit || 20;
  const entityTypes = options?.entityTypes || ['employee', 'rider', 'order', 'asset', 'document', 'invoice', 'incident'];
  
  const results: SearchResult[] = [];
  
  // Search employees
  if (entityTypes.includes('employee')) {
    const { data: employees } = await supabase
      .from('employees')
      .select('id, full_name, email, employee_number, role, status')
      .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},employee_number.ilike.${searchTerm}`)
      .limit(limit);
    
    for (const emp of employees || []) {
      results.push({
        entityType: 'employee',
        entityId: emp.id,
        title: emp.full_name,
        subtitle: emp.employee_number,
        description: emp.email,
        status: emp.status,
        url: `/dashboard/employees/${emp.id}`,
        relevanceScore: calculateRelevance(query, [emp.full_name, emp.email, emp.employee_number]),
        highlightedText: highlightMatch(emp.full_name, query),
      });
    }
  }
  
  // Search riders
  if (entityTypes.includes('rider')) {
    const { data: riders } = await supabase
      .from('employees')
      .select('id, full_name, email, employee_number, status')
      .eq('role', 'rider')
      .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},employee_number.ilike.${searchTerm}`)
      .limit(limit);
    
    for (const rider of riders || []) {
      results.push({
        entityType: 'rider',
        entityId: rider.id,
        title: rider.full_name,
        subtitle: rider.employee_number,
        description: rider.email,
        status: rider.status,
        url: `/dashboard/riders/${rider.id}`,
        relevanceScore: calculateRelevance(query, [rider.full_name, rider.email, rider.employee_number]),
        highlightedText: highlightMatch(rider.full_name, query),
      });
    }
  }
  
  // Search orders
  if (entityTypes.includes('order')) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_phone, status')
      .or(`order_number.ilike.${searchTerm},customer_name.ilike.${searchTerm},customer_phone.ilike.${searchTerm}`)
      .limit(limit);
    
    for (const order of orders || []) {
      results.push({
        entityType: 'order',
        entityId: order.id,
        title: order.order_number,
        subtitle: order.customer_name,
        description: order.customer_phone,
        status: order.status,
        url: `/dashboard/orders/${order.id}`,
        relevanceScore: calculateRelevance(query, [order.order_number, order.customer_name]),
        highlightedText: highlightMatch(order.order_number, query),
      });
    }
  }
  
  // Search assets
  if (entityTypes.includes('asset')) {
    const { data: assets } = await supabase
      .from('assets')
      .select('id, name, asset_number, license_plate, status')
      .or(`name.ilike.${searchTerm},asset_number.ilike.${searchTerm},license_plate.ilike.${searchTerm}`)
      .limit(limit);
    
    for (const asset of assets || []) {
      results.push({
        entityType: 'asset',
        entityId: asset.id,
        title: asset.name,
        subtitle: asset.asset_number,
        description: asset.license_plate,
        status: asset.status,
        url: `/dashboard/assets/${asset.id}`,
        relevanceScore: calculateRelevance(query, [asset.name, asset.asset_number, asset.license_plate]),
        highlightedText: highlightMatch(asset.name, query),
      });
    }
  }
  
  // Search invoices
  if (entityTypes.includes('invoice')) {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, client_name, status')
      .or(`invoice_number.ilike.${searchTerm},client_name.ilike.${searchTerm}`)
      .limit(limit);
    
    for (const invoice of invoices || []) {
      results.push({
        entityType: 'invoice',
        entityId: invoice.id,
        title: invoice.invoice_number,
        subtitle: invoice.client_name,
        description: null,
        status: invoice.status,
        url: `/dashboard/invoices/${invoice.id}`,
        relevanceScore: calculateRelevance(query, [invoice.invoice_number, invoice.client_name]),
        highlightedText: highlightMatch(invoice.invoice_number, query),
      });
    }
  }
  
  // Search incidents
  if (entityTypes.includes('incident')) {
    const { data: incidents } = await supabase
      .from('incidents')
      .select('id, incident_number, type, status')
      .or(`incident_number.ilike.${searchTerm},type.ilike.${searchTerm}`)
      .limit(limit);
    
    for (const incident of incidents || []) {
      results.push({
        entityType: 'incident',
        entityId: incident.id,
        title: incident.incident_number,
        subtitle: incident.type,
        description: null,
        status: incident.status,
        url: `/dashboard/incidents/${incident.id}`,
        relevanceScore: calculateRelevance(query, [incident.incident_number, incident.type]),
        highlightedText: highlightMatch(incident.incident_number, query),
      });
    }
  }
  
  // Sort by relevance
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Save to search history
  if (options?.userId) {
    await saveSearchHistory(options.userId, query, null, results.length);
  }
  
  return results.slice(0, limit);
}

function calculateRelevance(query: string, fields: (string | null)[]): number {
  const lowerQuery = query.toLowerCase();
  let score = 0;
  
  for (const field of fields) {
    if (!field) continue;
    const lowerField = field.toLowerCase();
    
    if (lowerField === lowerQuery) {
      score += 100; // Exact match
    } else if (lowerField.startsWith(lowerQuery)) {
      score += 75; // Prefix match
    } else if (lowerField.includes(lowerQuery)) {
      score += 50; // Contains match
    }
  }
  
  return score;
}

function highlightMatch(text: string | null, query: string): string | null {
  if (!text) return null;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  
  if (index === -1) return text;
  
  return (
    text.substring(0, index) +
    '<mark>' +
    text.substring(index, index + query.length) +
    '</mark>' +
    text.substring(index + query.length)
  );
}

// ============================================================================
// ENTITY FILTERING
// ============================================================================

/**
 * Apply filters to a Supabase query.
 */
export function applyFilters<T>(
  query: ReturnType<ReturnType<typeof createClient>['from']>['select'],
  filterGroup: FilterGroup
): ReturnType<ReturnType<typeof createClient>['from']>['select'] {
  let filteredQuery = query as unknown as T;
  
  for (const condition of filterGroup.conditions) {
    filteredQuery = applyCondition(filteredQuery, condition) as T;
  }
  
  return filteredQuery as unknown as typeof query;
}

function applyCondition<T>(query: T, condition: FilterCondition): T {
  const q = query as Record<string, (col: string, value?: unknown) => T>;
  const { field, operator, value } = condition;
  
  switch (operator) {
    case 'eq':
      return q.eq(field, value);
    case 'neq':
      return q.neq(field, value);
    case 'gt':
      return q.gt(field, value);
    case 'gte':
      return q.gte(field, value);
    case 'lt':
      return q.lt(field, value);
    case 'lte':
      return q.lte(field, value);
    case 'contains':
      return q.ilike(field, `%${value}%`);
    case 'starts_with':
      return q.ilike(field, `${value}%`);
    case 'ends_with':
      return q.ilike(field, `%${value}`);
    case 'in':
      return q.in(field, value as unknown[]);
    case 'not_in':
      return (q as T & { not: { in: (col: string, val: unknown[]) => T } }).not.in(field, value as unknown[]);
    case 'is_null':
      return q.is(field, null);
    case 'is_not_null':
      return (q as T & { not: { is: (col: string, val: null) => T } }).not.is(field, null);
    case 'between': {
      const [min, max] = value as [unknown, unknown];
      return q.gte(field, min) && q.lte(field, max);
    }
    default:
      return query;
  }
}

/**
 * Get filter fields for an entity type.
 */
export function getFilterFields(entityType: SearchEntityType): FilterField[] {
  const commonFields: FilterField[] = [
    { name: 'created_at', label: 'Created Date', type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'] },
    { name: 'updated_at', label: 'Updated Date', type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'] },
  ];
  
  switch (entityType) {
    case 'employee':
    case 'rider':
      return [
        { name: 'full_name', label: 'Name', type: 'string', operators: ['eq', 'contains', 'starts_with'] },
        { name: 'email', label: 'Email', type: 'string', operators: ['eq', 'contains'] },
        { name: 'status', label: 'Status', type: 'enum', operators: ['eq', 'neq', 'in'], options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
          { value: 'onboarding', label: 'Onboarding' },
          { value: 'terminated', label: 'Terminated' },
        ]},
        { name: 'nationality', label: 'Nationality', type: 'string', operators: ['eq', 'in'] },
        { name: 'hired_at', label: 'Hire Date', type: 'date', operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'] },
        ...commonFields,
      ];
    
    case 'order':
      return [
        { name: 'order_number', label: 'Order Number', type: 'string', operators: ['eq', 'contains', 'starts_with'] },
        { name: 'status', label: 'Status', type: 'enum', operators: ['eq', 'neq', 'in'], options: [
          { value: 'pending', label: 'Pending' },
          { value: 'assigned', label: 'Assigned' },
          { value: 'picked_up', label: 'Picked Up' },
          { value: 'in_transit', label: 'In Transit' },
          { value: 'delivered', label: 'Delivered' },
          { value: 'cancelled', label: 'Cancelled' },
        ]},
        { name: 'order_value', label: 'Order Value', type: 'number', operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'] },
        { name: 'platform_id', label: 'Platform', type: 'string', operators: ['eq', 'in'] },
        ...commonFields,
      ];
    
    case 'asset':
      return [
        { name: 'name', label: 'Name', type: 'string', operators: ['eq', 'contains'] },
        { name: 'category', label: 'Category', type: 'enum', operators: ['eq', 'in'], options: [
          { value: 'vehicle', label: 'Vehicle' },
          { value: 'equipment', label: 'Equipment' },
          { value: 'device', label: 'Device' },
        ]},
        { name: 'status', label: 'Status', type: 'enum', operators: ['eq', 'neq', 'in'], options: [
          { value: 'available', label: 'Available' },
          { value: 'assigned', label: 'Assigned' },
          { value: 'maintenance', label: 'Maintenance' },
          { value: 'retired', label: 'Retired' },
        ]},
        { name: 'purchase_date', label: 'Purchase Date', type: 'date', operators: ['eq', 'gt', 'lt', 'between'] },
        ...commonFields,
      ];
    
    case 'invoice':
      return [
        { name: 'invoice_number', label: 'Invoice Number', type: 'string', operators: ['eq', 'contains'] },
        { name: 'status', label: 'Status', type: 'enum', operators: ['eq', 'neq', 'in'], options: [
          { value: 'draft', label: 'Draft' },
          { value: 'sent', label: 'Sent' },
          { value: 'paid', label: 'Paid' },
          { value: 'overdue', label: 'Overdue' },
        ]},
        { name: 'total_amount', label: 'Amount', type: 'number', operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'] },
        { name: 'due_date', label: 'Due Date', type: 'date', operators: ['eq', 'gt', 'lt', 'between'] },
        ...commonFields,
      ];
    
    case 'incident':
      return [
        { name: 'incident_number', label: 'Incident Number', type: 'string', operators: ['eq', 'contains'] },
        { name: 'type', label: 'Type', type: 'enum', operators: ['eq', 'in'], options: [
          { value: 'accident', label: 'Accident' },
          { value: 'theft', label: 'Theft' },
          { value: 'damage', label: 'Damage' },
          { value: 'violation', label: 'Violation' },
        ]},
        { name: 'severity', label: 'Severity', type: 'enum', operators: ['eq', 'in'], options: [
          { value: 'minor', label: 'Minor' },
          { value: 'moderate', label: 'Moderate' },
          { value: 'major', label: 'Major' },
          { value: 'critical', label: 'Critical' },
        ]},
        { name: 'status', label: 'Status', type: 'enum', operators: ['eq', 'neq', 'in'], options: [
          { value: 'reported', label: 'Reported' },
          { value: 'under_investigation', label: 'Under Investigation' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'closed', label: 'Closed' },
        ]},
        { name: 'occurred_at', label: 'Occurred Date', type: 'date', operators: ['eq', 'gt', 'lt', 'between'] },
        ...commonFields,
      ];
    
    default:
      return commonFields;
  }
}

// ============================================================================
// SAVED FILTERS
// ============================================================================

/**
 * Save a filter.
 */
export async function saveFilter(input: {
  name: string;
  entityType: SearchEntityType;
  filters: FilterGroup;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  columns?: string[];
  isShared?: boolean;
  userId: string;
}): Promise<{ success: boolean; filterId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('saved_filters')
    .insert({
      name: input.name,
      entity_type: input.entityType,
      filters: input.filters,
      sort_by: input.sortBy,
      sort_order: input.sortOrder,
      columns: input.columns,
      is_default: false,
      is_shared: input.isShared || false,
      created_by: input.userId,
      usage_count: 0,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, filterId: data.id };
}

/**
 * Get saved filters.
 */
export async function getSavedFilters(
  entityType: SearchEntityType,
  userId: string
): Promise<SavedFilter[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('saved_filters')
    .select('*')
    .eq('entity_type', entityType)
    .or(`created_by.eq.${userId},is_shared.eq.true`)
    .order('usage_count', { ascending: false });
  
  return (data || []).map(f => ({
    id: f.id,
    name: f.name,
    entityType: f.entity_type as SearchEntityType,
    filters: f.filters as FilterGroup,
    sortBy: f.sort_by,
    sortOrder: f.sort_order as 'asc' | 'desc' | undefined,
    columns: f.columns,
    isDefault: f.is_default,
    isShared: f.is_shared,
    createdBy: f.created_by,
    createdAt: f.created_at,
    usageCount: f.usage_count,
  }));
}

/**
 * Apply a saved filter (increments usage count).
 */
export async function applySavedFilter(filterId: string): Promise<SavedFilter | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('saved_filters')
    .select('*')
    .eq('id', filterId)
    .single();
  
  if (!data) return null;
  
  // Increment usage count
  await supabase
    .from('saved_filters')
    .update({ usage_count: data.usage_count + 1 })
    .eq('id', filterId);
  
  return {
    id: data.id,
    name: data.name,
    entityType: data.entity_type as SearchEntityType,
    filters: data.filters as FilterGroup,
    sortBy: data.sort_by,
    sortOrder: data.sort_order as 'asc' | 'desc' | undefined,
    columns: data.columns,
    isDefault: data.is_default,
    isShared: data.is_shared,
    createdBy: data.created_by,
    createdAt: data.created_at,
    usageCount: data.usage_count + 1,
  };
}

/**
 * Update a saved filter.
 */
export async function updateSavedFilter(
  filterId: string,
  userId: string,
  updates: Partial<Pick<SavedFilter, 'name' | 'filters' | 'sortBy' | 'sortOrder' | 'columns' | 'isShared'>>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.filters) dbUpdates.filters = updates.filters;
  if (updates.sortBy !== undefined) dbUpdates.sort_by = updates.sortBy;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
  if (updates.columns !== undefined) dbUpdates.columns = updates.columns;
  if (updates.isShared !== undefined) dbUpdates.is_shared = updates.isShared;
  
  const { error } = await supabase
    .from('saved_filters')
    .update(dbUpdates)
    .eq('id', filterId)
    .eq('created_by', userId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Set filter as default.
 */
export async function setDefaultFilter(
  filterId: string,
  entityType: SearchEntityType,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Clear existing default
  await supabase
    .from('saved_filters')
    .update({ is_default: false })
    .eq('entity_type', entityType)
    .eq('created_by', userId)
    .eq('is_default', true);
  
  // Set new default
  const { error } = await supabase
    .from('saved_filters')
    .update({ is_default: true })
    .eq('id', filterId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Delete a saved filter.
 */
export async function deleteSavedFilter(
  filterId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('saved_filters')
    .delete()
    .eq('id', filterId)
    .eq('created_by', userId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// SEARCH HISTORY
// ============================================================================

/**
 * Save search history.
 */
async function saveSearchHistory(
  userId: string,
  query: string,
  entityType: SearchEntityType | null,
  resultsCount: number
): Promise<void> {
  const supabase = createClient();
  
  await supabase.from('search_history').insert({
    user_id: userId,
    query,
    entity_type: entityType,
    results_count: resultsCount,
  });
}

/**
 * Get search history.
 */
export async function getSearchHistory(
  userId: string,
  limit: number = 10
): Promise<SearchHistory[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('search_history')
    .select('*')
    .eq('user_id', userId)
    .order('searched_at', { ascending: false })
    .limit(limit);
  
  return (data || []).map(h => ({
    id: h.id,
    query: h.query,
    entityType: h.entity_type as SearchEntityType | null,
    resultsCount: h.results_count,
    searchedAt: h.searched_at,
  }));
}

/**
 * Get recent/popular searches.
 */
export async function getPopularSearches(
  limit: number = 5
): Promise<Array<{ query: string; count: number }>> {
  const supabase = createClient();
  
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data } = await supabase
    .from('search_history')
    .select('query')
    .gte('searched_at', oneWeekAgo);
  
  // Count occurrences
  const counts = new Map<string, number>();
  for (const h of data || []) {
    const q = h.query.toLowerCase();
    counts.set(q, (counts.get(q) || 0) + 1);
  }
  
  return Array.from(counts.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Clear search history.
 */
export async function clearSearchHistory(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('search_history')
    .delete()
    .eq('user_id', userId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// QUICK FILTERS
// ============================================================================

/**
 * Get quick filter presets for an entity type.
 */
export function getQuickFilters(entityType: SearchEntityType): Array<{
  name: string;
  filters: FilterGroup;
}> {
  switch (entityType) {
    case 'employee':
    case 'rider':
      return [
        { name: 'Active Only', filters: { logic: 'and', conditions: [{ field: 'status', operator: 'eq', value: 'active' }] } },
        { name: 'New This Month', filters: { logic: 'and', conditions: [{ field: 'hired_at', operator: 'gte', value: getMonthStart() }] } },
        { name: 'On Leave', filters: { logic: 'and', conditions: [{ field: 'status', operator: 'eq', value: 'on_leave' }] } },
      ];
    
    case 'order':
      return [
        { name: 'Pending', filters: { logic: 'and', conditions: [{ field: 'status', operator: 'eq', value: 'pending' }] } },
        { name: 'In Transit', filters: { logic: 'and', conditions: [{ field: 'status', operator: 'eq', value: 'in_transit' }] } },
        { name: 'Today', filters: { logic: 'and', conditions: [{ field: 'created_at', operator: 'gte', value: getTodayStart() }] } },
        { name: 'High Value', filters: { logic: 'and', conditions: [{ field: 'order_value', operator: 'gte', value: 100 }] } },
      ];
    
    case 'asset':
      return [
        { name: 'Available', filters: { logic: 'and', conditions: [{ field: 'status', operator: 'eq', value: 'available' }] } },
        { name: 'In Maintenance', filters: { logic: 'and', conditions: [{ field: 'status', operator: 'eq', value: 'maintenance' }] } },
        { name: 'Vehicles', filters: { logic: 'and', conditions: [{ field: 'category', operator: 'eq', value: 'vehicle' }] } },
      ];
    
    case 'invoice':
      return [
        { name: 'Overdue', filters: { logic: 'and', conditions: [{ field: 'status', operator: 'eq', value: 'overdue' }] } },
        { name: 'Pending Payment', filters: { logic: 'and', conditions: [{ field: 'status', operator: 'in', value: ['sent', 'partial'] }] } },
        { name: 'This Month', filters: { logic: 'and', conditions: [{ field: 'created_at', operator: 'gte', value: getMonthStart() }] } },
      ];
    
    case 'incident':
      return [
        { name: 'Open', filters: { logic: 'and', conditions: [{ field: 'status', operator: 'in', value: ['reported', 'under_investigation'] }] } },
        { name: 'Critical', filters: { logic: 'and', conditions: [{ field: 'severity', operator: 'eq', value: 'critical' }] } },
        { name: 'This Week', filters: { logic: 'and', conditions: [{ field: 'occurred_at', operator: 'gte', value: getWeekStart() }] } },
      ];
    
    default:
      return [];
  }
}

function getTodayStart(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}

function getWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const weekStart = new Date(today.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString();
}

function getMonthStart(): string {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
}
