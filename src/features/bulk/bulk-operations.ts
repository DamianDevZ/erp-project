'use client';

/**
 * Bulk Operations Service (T-094 to T-096)
 * 
 * Manages:
 * - Bulk updates
 * - Batch processing
 * - Mass actions
 * - Background jobs
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type BulkOperationType = 
  | 'update'
  | 'delete'
  | 'assign'
  | 'unassign'
  | 'status_change'
  | 'export'
  | 'import';

export type BulkOperationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type EntityType = 
  | 'employee'
  | 'order'
  | 'asset'
  | 'document'
  | 'shift'
  | 'invoice';

export interface BulkOperation {
  id: string;
  type: BulkOperationType;
  entityType: EntityType;
  entityIds: string[];
  parameters: Record<string, unknown>;
  status: BulkOperationStatus;
  progress: number;
  totalItems: number;
  processedItems: number;
  successCount: number;
  failureCount: number;
  errors: BulkOperationError[];
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string;
  createdAt: string;
}

export interface BulkOperationError {
  entityId: string;
  error: string;
  timestamp: string;
}

export interface BulkUpdateInput {
  entityType: EntityType;
  entityIds: string[];
  updates: Record<string, unknown>;
  userId: string;
}

export interface BulkAssignInput {
  entityType: EntityType;
  entityIds: string[];
  assignToId: string;
  userId: string;
}

export interface BulkStatusChangeInput {
  entityType: EntityType;
  entityIds: string[];
  newStatus: string;
  reason?: string;
  userId: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const OPERATION_TYPE_LABELS: Record<BulkOperationType, string> = {
  update: 'Bulk Update',
  delete: 'Bulk Delete',
  assign: 'Bulk Assign',
  unassign: 'Bulk Unassign',
  status_change: 'Status Change',
  export: 'Export',
  import: 'Import',
};

export const BATCH_SIZE = 100;

// ============================================================================
// BULK OPERATIONS MANAGEMENT
// ============================================================================

/**
 * Create a bulk operation record.
 */
async function createBulkOperationRecord(
  type: BulkOperationType,
  entityType: EntityType,
  entityIds: string[],
  parameters: Record<string, unknown>,
  userId: string
): Promise<string> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('bulk_operations')
    .insert({
      type,
      entity_type: entityType,
      entity_ids: entityIds,
      parameters,
      status: 'pending',
      progress: 0,
      total_items: entityIds.length,
      processed_items: 0,
      success_count: 0,
      failure_count: 0,
      errors: [],
      created_by: userId,
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create bulk operation: ${error.message}`);
  }
  
  return data.id;
}

/**
 * Update bulk operation progress.
 */
async function updateBulkOperationProgress(
  operationId: string,
  updates: {
    status?: BulkOperationStatus;
    processedItems?: number;
    successCount?: number;
    failureCount?: number;
    errors?: BulkOperationError[];
    startedAt?: string;
    completedAt?: string;
  }
): Promise<void> {
  const supabase = createClient();
  
  const dbUpdates: Record<string, unknown> = {};
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.processedItems !== undefined) {
    dbUpdates.processed_items = updates.processedItems;
    // Also calculate progress
    const { data: op } = await supabase
      .from('bulk_operations')
      .select('total_items')
      .eq('id', operationId)
      .single();
    if (op) {
      dbUpdates.progress = Math.round((updates.processedItems / op.total_items) * 100);
    }
  }
  if (updates.successCount !== undefined) dbUpdates.success_count = updates.successCount;
  if (updates.failureCount !== undefined) dbUpdates.failure_count = updates.failureCount;
  if (updates.errors) dbUpdates.errors = updates.errors;
  if (updates.startedAt) dbUpdates.started_at = updates.startedAt;
  if (updates.completedAt) dbUpdates.completed_at = updates.completedAt;
  
  await supabase
    .from('bulk_operations')
    .update(dbUpdates)
    .eq('id', operationId);
}

/**
 * Get a bulk operation.
 */
export async function getBulkOperation(
  operationId: string
): Promise<BulkOperation | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('bulk_operations')
    .select('*')
    .eq('id', operationId)
    .single();
  
  if (!data) return null;
  
  return {
    id: data.id,
    type: data.type as BulkOperationType,
    entityType: data.entity_type as EntityType,
    entityIds: data.entity_ids,
    parameters: data.parameters,
    status: data.status as BulkOperationStatus,
    progress: data.progress,
    totalItems: data.total_items,
    processedItems: data.processed_items,
    successCount: data.success_count,
    failureCount: data.failure_count,
    errors: data.errors as BulkOperationError[],
    startedAt: data.started_at,
    completedAt: data.completed_at,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
}

/**
 * Get bulk operations for a user.
 */
export async function getBulkOperations(
  userId: string,
  status?: BulkOperationStatus
): Promise<BulkOperation[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('bulk_operations')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data } = await query;
  
  return (data || []).map(op => ({
    id: op.id,
    type: op.type as BulkOperationType,
    entityType: op.entity_type as EntityType,
    entityIds: op.entity_ids,
    parameters: op.parameters,
    status: op.status as BulkOperationStatus,
    progress: op.progress,
    totalItems: op.total_items,
    processedItems: op.processed_items,
    successCount: op.success_count,
    failureCount: op.failure_count,
    errors: op.errors as BulkOperationError[],
    startedAt: op.started_at,
    completedAt: op.completed_at,
    createdBy: op.created_by,
    createdAt: op.created_at,
  }));
}

/**
 * Cancel a running bulk operation.
 */
export async function cancelBulkOperation(
  operationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('bulk_operations')
    .update({ 
      status: 'cancelled', 
      completed_at: new Date().toISOString() 
    })
    .eq('id', operationId)
    .in('status', ['pending', 'running']);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// BULK UPDATE
// ============================================================================

/**
 * Perform bulk update.
 */
export async function bulkUpdate(input: BulkUpdateInput): Promise<{
  success: boolean;
  operationId?: string;
  error?: string;
}> {
  const supabase = createClient();
  
  if (input.entityIds.length === 0) {
    return { success: false, error: 'No entities selected' };
  }
  
  // Create operation record
  const operationId = await createBulkOperationRecord(
    'update',
    input.entityType,
    input.entityIds,
    input.updates,
    input.userId
  );
  
  // Start processing
  await updateBulkOperationProgress(operationId, {
    status: 'running',
    startedAt: new Date().toISOString(),
  });
  
  const tableName = getTableName(input.entityType);
  const errors: BulkOperationError[] = [];
  let successCount = 0;
  let failureCount = 0;
  
  // Process in batches
  for (let i = 0; i < input.entityIds.length; i += BATCH_SIZE) {
    const batch = input.entityIds.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase
      .from(tableName)
      .update({
        ...input.updates,
        updated_at: new Date().toISOString(),
      })
      .in('id', batch);
    
    if (error) {
      // Record errors for each item in failed batch
      for (const id of batch) {
        errors.push({
          entityId: id,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        failureCount++;
      }
    } else {
      successCount += batch.length;
    }
    
    // Update progress
    await updateBulkOperationProgress(operationId, {
      processedItems: i + batch.length,
      successCount,
      failureCount,
      errors,
    });
  }
  
  // Complete operation
  await updateBulkOperationProgress(operationId, {
    status: failureCount === 0 ? 'completed' : (successCount > 0 ? 'completed' : 'failed'),
    completedAt: new Date().toISOString(),
  });
  
  return { success: true, operationId };
}

// ============================================================================
// BULK DELETE
// ============================================================================

/**
 * Perform bulk delete (soft delete).
 */
export async function bulkDelete(input: {
  entityType: EntityType;
  entityIds: string[];
  hardDelete?: boolean;
  userId: string;
}): Promise<{ success: boolean; operationId?: string; error?: string }> {
  const supabase = createClient();
  
  if (input.entityIds.length === 0) {
    return { success: false, error: 'No entities selected' };
  }
  
  const operationId = await createBulkOperationRecord(
    'delete',
    input.entityType,
    input.entityIds,
    { hardDelete: input.hardDelete },
    input.userId
  );
  
  await updateBulkOperationProgress(operationId, {
    status: 'running',
    startedAt: new Date().toISOString(),
  });
  
  const tableName = getTableName(input.entityType);
  const errors: BulkOperationError[] = [];
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < input.entityIds.length; i += BATCH_SIZE) {
    const batch = input.entityIds.slice(i, i + BATCH_SIZE);
    
    let error;
    if (input.hardDelete) {
      const result = await supabase
        .from(tableName)
        .delete()
        .in('id', batch);
      error = result.error;
    } else {
      // Soft delete
      const result = await supabase
        .from(tableName)
        .update({
          deleted_at: new Date().toISOString(),
          status: 'deleted',
        })
        .in('id', batch);
      error = result.error;
    }
    
    if (error) {
      for (const id of batch) {
        errors.push({
          entityId: id,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        failureCount++;
      }
    } else {
      successCount += batch.length;
    }
    
    await updateBulkOperationProgress(operationId, {
      processedItems: i + batch.length,
      successCount,
      failureCount,
      errors,
    });
  }
  
  await updateBulkOperationProgress(operationId, {
    status: failureCount === 0 ? 'completed' : (successCount > 0 ? 'completed' : 'failed'),
    completedAt: new Date().toISOString(),
  });
  
  return { success: true, operationId };
}

// ============================================================================
// BULK ASSIGN
// ============================================================================

/**
 * Perform bulk assignment.
 */
export async function bulkAssign(input: BulkAssignInput): Promise<{
  success: boolean;
  operationId?: string;
  error?: string;
}> {
  if (input.entityIds.length === 0) {
    return { success: false, error: 'No entities selected' };
  }
  
  const fieldName = getAssignmentField(input.entityType);
  
  return bulkUpdate({
    entityType: input.entityType,
    entityIds: input.entityIds,
    updates: { [fieldName]: input.assignToId },
    userId: input.userId,
  });
}

/**
 * Perform bulk unassign.
 */
export async function bulkUnassign(input: {
  entityType: EntityType;
  entityIds: string[];
  userId: string;
}): Promise<{ success: boolean; operationId?: string; error?: string }> {
  if (input.entityIds.length === 0) {
    return { success: false, error: 'No entities selected' };
  }
  
  const fieldName = getAssignmentField(input.entityType);
  
  return bulkUpdate({
    entityType: input.entityType,
    entityIds: input.entityIds,
    updates: { [fieldName]: null },
    userId: input.userId,
  });
}

// ============================================================================
// BULK STATUS CHANGE
// ============================================================================

/**
 * Perform bulk status change.
 */
export async function bulkStatusChange(input: BulkStatusChangeInput): Promise<{
  success: boolean;
  operationId?: string;
  error?: string;
}> {
  const supabase = createClient();
  
  if (input.entityIds.length === 0) {
    return { success: false, error: 'No entities selected' };
  }
  
  const operationId = await createBulkOperationRecord(
    'status_change',
    input.entityType,
    input.entityIds,
    { newStatus: input.newStatus, reason: input.reason },
    input.userId
  );
  
  await updateBulkOperationProgress(operationId, {
    status: 'running',
    startedAt: new Date().toISOString(),
  });
  
  const tableName = getTableName(input.entityType);
  const errors: BulkOperationError[] = [];
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < input.entityIds.length; i += BATCH_SIZE) {
    const batch = input.entityIds.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase
      .from(tableName)
      .update({
        status: input.newStatus,
        status_changed_at: new Date().toISOString(),
        status_change_reason: input.reason,
        updated_at: new Date().toISOString(),
      })
      .in('id', batch);
    
    if (error) {
      for (const id of batch) {
        errors.push({
          entityId: id,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        failureCount++;
      }
    } else {
      successCount += batch.length;
    }
    
    await updateBulkOperationProgress(operationId, {
      processedItems: i + batch.length,
      successCount,
      failureCount,
      errors,
    });
  }
  
  await updateBulkOperationProgress(operationId, {
    status: failureCount === 0 ? 'completed' : (successCount > 0 ? 'completed' : 'failed'),
    completedAt: new Date().toISOString(),
  });
  
  return { success: true, operationId };
}

// ============================================================================
// ENTITY-SPECIFIC BULK OPERATIONS
// ============================================================================

/**
 * Bulk assign orders to rider.
 */
export async function bulkAssignOrders(
  orderIds: string[],
  riderId: string,
  userId: string
): Promise<{ success: boolean; operationId?: string; error?: string }> {
  const supabase = createClient();
  
  if (orderIds.length === 0) {
    return { success: false, error: 'No orders selected' };
  }
  
  const operationId = await createBulkOperationRecord(
    'assign',
    'order',
    orderIds,
    { riderId },
    userId
  );
  
  await updateBulkOperationProgress(operationId, {
    status: 'running',
    startedAt: new Date().toISOString(),
  });
  
  const errors: BulkOperationError[] = [];
  let successCount = 0;
  let failureCount = 0;
  
  for (const orderId of orderIds) {
    // Check if order can be assigned
    const { data: order } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();
    
    if (!order || !['pending', 'unassigned'].includes(order.status)) {
      errors.push({
        entityId: orderId,
        error: 'Order cannot be assigned (invalid status)',
        timestamp: new Date().toISOString(),
      });
      failureCount++;
      continue;
    }
    
    const { error } = await supabase
      .from('orders')
      .update({
        rider_id: riderId,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
    
    if (error) {
      errors.push({
        entityId: orderId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      failureCount++;
    } else {
      successCount++;
    }
    
    await updateBulkOperationProgress(operationId, {
      processedItems: successCount + failureCount,
      successCount,
      failureCount,
      errors,
    });
  }
  
  await updateBulkOperationProgress(operationId, {
    status: failureCount === 0 ? 'completed' : (successCount > 0 ? 'completed' : 'failed'),
    completedAt: new Date().toISOString(),
  });
  
  return { success: true, operationId };
}

/**
 * Bulk assign assets to employees.
 */
export async function bulkAssignAssets(
  assetIds: string[],
  employeeId: string,
  userId: string
): Promise<{ success: boolean; operationId?: string; error?: string }> {
  const supabase = createClient();
  
  if (assetIds.length === 0) {
    return { success: false, error: 'No assets selected' };
  }
  
  const operationId = await createBulkOperationRecord(
    'assign',
    'asset',
    assetIds,
    { employeeId },
    userId
  );
  
  await updateBulkOperationProgress(operationId, {
    status: 'running',
    startedAt: new Date().toISOString(),
  });
  
  const errors: BulkOperationError[] = [];
  let successCount = 0;
  let failureCount = 0;
  
  for (const assetId of assetIds) {
    // Check if asset is available
    const { data: asset } = await supabase
      .from('assets')
      .select('status')
      .eq('id', assetId)
      .single();
    
    if (!asset || asset.status !== 'available') {
      errors.push({
        entityId: assetId,
        error: 'Asset not available for assignment',
        timestamp: new Date().toISOString(),
      });
      failureCount++;
      continue;
    }
    
    const { error } = await supabase
      .from('assets')
      .update({
        assigned_to: employeeId,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', assetId);
    
    if (error) {
      errors.push({
        entityId: assetId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      failureCount++;
    } else {
      successCount++;
    }
    
    await updateBulkOperationProgress(operationId, {
      processedItems: successCount + failureCount,
      successCount,
      failureCount,
      errors,
    });
  }
  
  await updateBulkOperationProgress(operationId, {
    status: failureCount === 0 ? 'completed' : (successCount > 0 ? 'completed' : 'failed'),
    completedAt: new Date().toISOString(),
  });
  
  return { success: true, operationId };
}

/**
 * Bulk approve leave requests.
 */
export async function bulkApproveLeaveRequests(
  requestIds: string[],
  approverId: string,
  userId: string
): Promise<{ success: boolean; operationId?: string; error?: string }> {
  const supabase = createClient();
  
  if (requestIds.length === 0) {
    return { success: false, error: 'No requests selected' };
  }
  
  const operationId = await createBulkOperationRecord(
    'status_change',
    'document', // Using document as placeholder
    requestIds,
    { action: 'approve', approverId },
    userId
  );
  
  await updateBulkOperationProgress(operationId, {
    status: 'running',
    startedAt: new Date().toISOString(),
  });
  
  const errors: BulkOperationError[] = [];
  let successCount = 0;
  let failureCount = 0;
  
  for (const requestId of requestIds) {
    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('status', 'pending');
    
    if (error) {
      errors.push({
        entityId: requestId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      failureCount++;
    } else {
      successCount++;
    }
    
    await updateBulkOperationProgress(operationId, {
      processedItems: successCount + failureCount,
      successCount,
      failureCount,
      errors,
    });
  }
  
  await updateBulkOperationProgress(operationId, {
    status: failureCount === 0 ? 'completed' : (successCount > 0 ? 'completed' : 'failed'),
    completedAt: new Date().toISOString(),
  });
  
  return { success: true, operationId };
}

/**
 * Bulk send invoices.
 */
export async function bulkSendInvoices(
  invoiceIds: string[],
  userId: string
): Promise<{ success: boolean; operationId?: string; error?: string }> {
  const supabase = createClient();
  
  if (invoiceIds.length === 0) {
    return { success: false, error: 'No invoices selected' };
  }
  
  const operationId = await createBulkOperationRecord(
    'status_change',
    'invoice',
    invoiceIds,
    { action: 'send' },
    userId
  );
  
  await updateBulkOperationProgress(operationId, {
    status: 'running',
    startedAt: new Date().toISOString(),
  });
  
  const errors: BulkOperationError[] = [];
  let successCount = 0;
  let failureCount = 0;
  
  for (const invoiceId of invoiceIds) {
    // Check if invoice can be sent
    const { data: invoice } = await supabase
      .from('invoices')
      .select('status')
      .eq('id', invoiceId)
      .single();
    
    if (!invoice || invoice.status !== 'draft') {
      errors.push({
        entityId: invoiceId,
        error: 'Invoice cannot be sent (invalid status)',
        timestamp: new Date().toISOString(),
      });
      failureCount++;
      continue;
    }
    
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);
    
    if (error) {
      errors.push({
        entityId: invoiceId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      failureCount++;
    } else {
      successCount++;
    }
    
    await updateBulkOperationProgress(operationId, {
      processedItems: successCount + failureCount,
      successCount,
      failureCount,
      errors,
    });
  }
  
  await updateBulkOperationProgress(operationId, {
    status: failureCount === 0 ? 'completed' : (successCount > 0 ? 'completed' : 'failed'),
    completedAt: new Date().toISOString(),
  });
  
  return { success: true, operationId };
}

// ============================================================================
// HELPERS
// ============================================================================

function getTableName(entityType: EntityType): string {
  const tableMap: Record<EntityType, string> = {
    employee: 'employees',
    order: 'orders',
    asset: 'assets',
    document: 'documents',
    shift: 'shift_assignments',
    invoice: 'invoices',
  };
  return tableMap[entityType] || entityType;
}

function getAssignmentField(entityType: EntityType): string {
  const fieldMap: Record<EntityType, string> = {
    employee: 'manager_id',
    order: 'rider_id',
    asset: 'assigned_to',
    document: 'employee_id',
    shift: 'employee_id',
    invoice: 'assigned_to',
  };
  return fieldMap[entityType] || 'assigned_to';
}

// ============================================================================
// SUMMARY
// ============================================================================

/**
 * Get bulk operations summary.
 */
export async function getBulkOperationsSummary(
  userId: string
): Promise<{
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  recentOperations: BulkOperation[];
}> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('bulk_operations')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  
  const operations = data || [];
  
  return {
    total: operations.length,
    pending: operations.filter(o => o.status === 'pending').length,
    running: operations.filter(o => o.status === 'running').length,
    completed: operations.filter(o => o.status === 'completed').length,
    failed: operations.filter(o => o.status === 'failed').length,
    recentOperations: operations.slice(0, 10).map(op => ({
      id: op.id,
      type: op.type as BulkOperationType,
      entityType: op.entity_type as EntityType,
      entityIds: op.entity_ids,
      parameters: op.parameters,
      status: op.status as BulkOperationStatus,
      progress: op.progress,
      totalItems: op.total_items,
      processedItems: op.processed_items,
      successCount: op.success_count,
      failureCount: op.failure_count,
      errors: op.errors as BulkOperationError[],
      startedAt: op.started_at,
      completedAt: op.completed_at,
      createdBy: op.created_by,
      createdAt: op.created_at,
    })),
  };
}
