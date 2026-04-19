'use client';

/**
 * Order Reconciliation Service (T-041)
 * 
 * Compares internal order data with aggregator platform data:
 * - Order count matching
 * - Earnings verification
 * - Incentive reconciliation
 * - Discrepancy flagging and resolution
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type ReconciliationStatus = 'pending' | 'matched' | 'discrepancy' | 'resolved' | 'disputed';
export type DiscrepancyType = 
  | 'missing_order'
  | 'extra_order'
  | 'earnings_mismatch'
  | 'incentive_mismatch'
  | 'commission_mismatch'
  | 'date_mismatch'
  | 'rider_mismatch';

export interface ReconciliationBatch {
  id: string;
  platformId: string;
  platformName: string;
  periodStart: string;
  periodEnd: string;
  status: ReconciliationStatus;
  internalOrderCount: number;
  platformOrderCount: number;
  internalEarnings: number;
  platformEarnings: number;
  discrepancyCount: number;
  totalVariance: number;
  reconciledAt: string | null;
  reconciledBy: string | null;
  notes: string | null;
}

export interface OrderMatch {
  id: string;
  batchId: string;
  internalOrderId: string | null;
  platformOrderId: string | null;
  riderId: string;
  riderName: string;
  orderDate: string;
  internalAmount: number | null;
  platformAmount: number | null;
  status: ReconciliationStatus;
  discrepancyType: DiscrepancyType | null;
  variance: number;
  resolution: string | null;
}

export interface PlatformImportData {
  orderId: string;
  riderId: string;
  riderPlatformId: string;
  orderDate: string;
  deliveryFee: number;
  incentives: number;
  deductions: number;
  netEarnings: number;
  metadata?: Record<string, unknown>;
}

export interface ReconciliationSummary {
  totalBatches: number;
  pendingBatches: number;
  discrepancyBatches: number;
  resolvedBatches: number;
  totalVariance: number;
  varianceByPlatform: Array<{
    platformId: string;
    platformName: string;
    variance: number;
    discrepancyCount: number;
  }>;
  topDiscrepancies: Array<{
    type: DiscrepancyType;
    count: number;
    totalVariance: number;
  }>;
}

// ============================================================================
// LABELS
// ============================================================================

export const DISCREPANCY_TYPE_LABELS: Record<DiscrepancyType, string> = {
  missing_order: 'Missing Order (in platform, not in system)',
  extra_order: 'Extra Order (in system, not in platform)',
  earnings_mismatch: 'Earnings Amount Mismatch',
  incentive_mismatch: 'Incentive Amount Mismatch',
  commission_mismatch: 'Commission Mismatch',
  date_mismatch: 'Order Date Mismatch',
  rider_mismatch: 'Rider Assignment Mismatch',
};

// ============================================================================
// BATCH CREATION & MANAGEMENT
// ============================================================================

/**
 * Create a reconciliation batch for a platform and period.
 */
export async function createReconciliationBatch(input: {
  platformId: string;
  periodStart: string;
  periodEnd: string;
}): Promise<{ success: boolean; batchId?: string; error?: string }> {
  const supabase = createClient();
  
  // Check for existing batch in same period
  const { data: existing } = await supabase
    .from('reconciliation_batches')
    .select('id')
    .eq('platform_id', input.platformId)
    .eq('period_start', input.periodStart)
    .eq('period_end', input.periodEnd)
    .single();
  
  if (existing) {
    return { success: false, error: 'Batch already exists for this period' };
  }
  
  // Get internal order data
  const { data: internalOrders } = await supabase
    .from('orders')
    .select('id, total_earnings')
    .eq('platform_id', input.platformId)
    .gte('order_date', input.periodStart)
    .lte('order_date', input.periodEnd);
  
  const internalOrderCount = internalOrders?.length || 0;
  const internalEarnings = internalOrders?.reduce((sum, o) => sum + (o.total_earnings || 0), 0) || 0;
  
  // Create batch
  const { data, error } = await supabase
    .from('reconciliation_batches')
    .insert({
      platform_id: input.platformId,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      status: 'pending',
      internal_order_count: internalOrderCount,
      internal_earnings: internalEarnings,
      platform_order_count: 0,
      platform_earnings: 0,
      discrepancy_count: 0,
      total_variance: 0,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, batchId: data.id };
}

/**
 * Import platform data for reconciliation.
 */
export async function importPlatformData(
  batchId: string,
  platformData: PlatformImportData[]
): Promise<{ success: boolean; imported: number; errors: string[] }> {
  const supabase = createClient();
  const errors: string[] = [];
  let imported = 0;
  
  // Get batch details
  const { data: batch } = await supabase
    .from('reconciliation_batches')
    .select('platform_id, period_start, period_end')
    .eq('id', batchId)
    .single();
  
  if (!batch) {
    return { success: false, imported: 0, errors: ['Batch not found'] };
  }
  
  // Store platform records
  for (const record of platformData) {
    // Find rider by platform ID
    const { data: allocation } = await supabase
      .from('platform_allocations')
      .select('rider_id')
      .eq('platform_id', batch.platform_id)
      .eq('platform_account_id', record.riderPlatformId)
      .single();
    
    if (!allocation) {
      errors.push(`Rider not found for platform ID: ${record.riderPlatformId}`);
      continue;
    }
    
    const { error } = await supabase
      .from('platform_order_imports')
      .insert({
        batch_id: batchId,
        platform_order_id: record.orderId,
        rider_id: allocation.rider_id,
        order_date: record.orderDate,
        delivery_fee: record.deliveryFee,
        incentives: record.incentives,
        deductions: record.deductions,
        net_earnings: record.netEarnings,
        metadata: record.metadata,
      });
    
    if (error) {
      errors.push(`Failed to import order ${record.orderId}: ${error.message}`);
    } else {
      imported++;
    }
  }
  
  // Update batch with platform totals
  const { data: platformTotals } = await supabase
    .from('platform_order_imports')
    .select('net_earnings')
    .eq('batch_id', batchId);
  
  const platformOrderCount = platformTotals?.length || 0;
  const platformEarnings = platformTotals?.reduce((sum, o) => sum + o.net_earnings, 0) || 0;
  
  await supabase
    .from('reconciliation_batches')
    .update({
      platform_order_count: platformOrderCount,
      platform_earnings: platformEarnings,
    })
    .eq('id', batchId);
  
  return { success: errors.length === 0, imported, errors };
}

// ============================================================================
// RECONCILIATION LOGIC
// ============================================================================

/**
 * Run reconciliation for a batch.
 */
export async function runReconciliation(batchId: string): Promise<{
  success: boolean;
  matched: number;
  discrepancies: number;
  error?: string;
}> {
  const supabase = createClient();
  
  // Get batch details
  const { data: batch } = await supabase
    .from('reconciliation_batches')
    .select('*')
    .eq('id', batchId)
    .single();
  
  if (!batch) {
    return { success: false, matched: 0, discrepancies: 0, error: 'Batch not found' };
  }
  
  // Get internal orders
  const { data: internalOrders } = await supabase
    .from('orders')
    .select(`
      id,
      rider_id,
      order_date,
      total_earnings,
      platform_order_id
    `)
    .eq('platform_id', batch.platform_id)
    .gte('order_date', batch.period_start)
    .lte('order_date', batch.period_end);
  
  // Get platform imports
  const { data: platformOrders } = await supabase
    .from('platform_order_imports')
    .select('*')
    .eq('batch_id', batchId);
  
  const matches: Array<Record<string, unknown>> = [];
  let matchedCount = 0;
  let discrepancyCount = 0;
  
  // Create maps for matching
  const platformOrderMap = new Map(
    (platformOrders || []).map(o => [o.platform_order_id, o])
  );
  const matchedPlatformIds = new Set<string>();
  
  // Match internal orders to platform orders
  for (const internal of internalOrders || []) {
    const platformOrder = platformOrderMap.get(internal.platform_order_id);
    
    if (platformOrder) {
      matchedPlatformIds.add(platformOrder.platform_order_id);
      
      const internalAmount = internal.total_earnings || 0;
      const platformAmount = platformOrder.net_earnings || 0;
      const variance = platformAmount - internalAmount;
      
      let status: ReconciliationStatus = 'matched';
      let discrepancyType: DiscrepancyType | null = null;
      
      // Check for earnings mismatch (tolerance of 0.1 BHD)
      if (Math.abs(variance) > 0.1) {
        status = 'discrepancy';
        discrepancyType = 'earnings_mismatch';
        discrepancyCount++;
      } else {
        matchedCount++;
      }
      
      // Check for rider mismatch
      if (platformOrder.rider_id !== internal.rider_id) {
        status = 'discrepancy';
        discrepancyType = 'rider_mismatch';
        if (status !== 'discrepancy') discrepancyCount++;
      }
      
      matches.push({
        batch_id: batchId,
        internal_order_id: internal.id,
        platform_order_id: platformOrder.platform_order_id,
        rider_id: internal.rider_id,
        order_date: internal.order_date,
        internal_amount: internalAmount,
        platform_amount: platformAmount,
        status,
        discrepancy_type: discrepancyType,
        variance,
      });
    } else {
      // Extra order (in system, not in platform)
      discrepancyCount++;
      matches.push({
        batch_id: batchId,
        internal_order_id: internal.id,
        platform_order_id: null,
        rider_id: internal.rider_id,
        order_date: internal.order_date,
        internal_amount: internal.total_earnings,
        platform_amount: null,
        status: 'discrepancy',
        discrepancy_type: 'extra_order',
        variance: -(internal.total_earnings || 0),
      });
    }
  }
  
  // Find missing orders (in platform, not in system)
  for (const platformOrder of platformOrders || []) {
    if (!matchedPlatformIds.has(platformOrder.platform_order_id)) {
      discrepancyCount++;
      matches.push({
        batch_id: batchId,
        internal_order_id: null,
        platform_order_id: platformOrder.platform_order_id,
        rider_id: platformOrder.rider_id,
        order_date: platformOrder.order_date,
        internal_amount: null,
        platform_amount: platformOrder.net_earnings,
        status: 'discrepancy',
        discrepancy_type: 'missing_order',
        variance: platformOrder.net_earnings,
      });
    }
  }
  
  // Insert matches
  if (matches.length > 0) {
    await supabase.from('order_matches').insert(matches);
  }
  
  // Calculate total variance
  const totalVariance = matches.reduce((sum, m) => sum + Math.abs(m.variance as number), 0);
  
  // Update batch status
  const batchStatus: ReconciliationStatus = discrepancyCount > 0 ? 'discrepancy' : 'matched';
  
  await supabase
    .from('reconciliation_batches')
    .update({
      status: batchStatus,
      discrepancy_count: discrepancyCount,
      total_variance: totalVariance,
      reconciled_at: new Date().toISOString(),
    })
    .eq('id', batchId);
  
  return { success: true, matched: matchedCount, discrepancies: discrepancyCount };
}

// ============================================================================
// DISCREPANCY RESOLUTION
// ============================================================================

/**
 * Resolve a discrepancy.
 */
export async function resolveDiscrepancy(
  matchId: string,
  resolution: string,
  resolvedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('order_matches')
    .update({
      status: 'resolved',
      resolution,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', matchId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Check if all discrepancies in batch are resolved
  const { data: match } = await supabase
    .from('order_matches')
    .select('batch_id')
    .eq('id', matchId)
    .single();
  
  if (match) {
    const { data: unresolvedCount } = await supabase
      .from('order_matches')
      .select('id')
      .eq('batch_id', match.batch_id)
      .eq('status', 'discrepancy');
    
    if (!unresolvedCount || unresolvedCount.length === 0) {
      await supabase
        .from('reconciliation_batches')
        .update({ status: 'resolved' })
        .eq('id', match.batch_id);
    }
  }
  
  return { success: true };
}

/**
 * Dispute a discrepancy (escalate to platform).
 */
export async function disputeDiscrepancy(
  matchId: string,
  reason: string,
  disputedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('order_matches')
    .update({
      status: 'disputed',
      dispute_reason: reason,
      disputed_by: disputedBy,
      disputed_at: new Date().toISOString(),
    })
    .eq('id', matchId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get reconciliation batches.
 */
export async function getReconciliationBatches(filters?: {
  platformId?: string;
  status?: ReconciliationStatus;
  startDate?: string;
  endDate?: string;
}): Promise<ReconciliationBatch[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('reconciliation_batches')
    .select(`
      *,
      platform:platforms(name)
    `)
    .order('period_start', { ascending: false });
  
  if (filters?.platformId) {
    query = query.eq('platform_id', filters.platformId);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.startDate) {
    query = query.gte('period_start', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('period_end', filters.endDate);
  }
  
  const { data } = await query;
  
  return (data || []).map(row => {
    const platform = row.platform as unknown;
    const platformData = (Array.isArray(platform) ? platform[0] : platform) as { name: string } | null;
    
    return {
      id: row.id,
      platformId: row.platform_id,
      platformName: platformData?.name || 'Unknown',
      periodStart: row.period_start,
      periodEnd: row.period_end,
      status: row.status,
      internalOrderCount: row.internal_order_count,
      platformOrderCount: row.platform_order_count,
      internalEarnings: row.internal_earnings,
      platformEarnings: row.platform_earnings,
      discrepancyCount: row.discrepancy_count,
      totalVariance: row.total_variance,
      reconciledAt: row.reconciled_at,
      reconciledBy: row.reconciled_by,
      notes: row.notes,
    };
  });
}

/**
 * Get order matches for a batch.
 */
export async function getBatchOrderMatches(
  batchId: string,
  filters?: {
    status?: ReconciliationStatus;
    discrepancyType?: DiscrepancyType;
  }
): Promise<OrderMatch[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('order_matches')
    .select(`
      *,
      rider:employees(full_name)
    `)
    .eq('batch_id', batchId)
    .order('order_date');
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.discrepancyType) {
    query = query.eq('discrepancy_type', filters.discrepancyType);
  }
  
  const { data } = await query;
  
  return (data || []).map(row => {
    const rider = row.rider as unknown;
    const riderData = (Array.isArray(rider) ? rider[0] : rider) as { full_name: string } | null;
    
    return {
      id: row.id,
      batchId: row.batch_id,
      internalOrderId: row.internal_order_id,
      platformOrderId: row.platform_order_id,
      riderId: row.rider_id,
      riderName: riderData?.full_name || 'Unknown',
      orderDate: row.order_date,
      internalAmount: row.internal_amount,
      platformAmount: row.platform_amount,
      status: row.status,
      discrepancyType: row.discrepancy_type,
      variance: row.variance,
      resolution: row.resolution,
    };
  });
}

// ============================================================================
// REPORTING
// ============================================================================

/**
 * Get reconciliation summary.
 */
export async function getReconciliationSummary(): Promise<ReconciliationSummary> {
  const supabase = createClient();
  
  const { data: batches } = await supabase
    .from('reconciliation_batches')
    .select('*');
  
  const { data: matches } = await supabase
    .from('order_matches')
    .select('discrepancy_type, variance, status')
    .eq('status', 'discrepancy');
  
  const { data: platforms } = await supabase
    .from('platforms')
    .select('id, name');
  
  // Calculate variance by platform
  const varianceByPlatform: ReconciliationSummary['varianceByPlatform'] = [];
  
  for (const platform of platforms || []) {
    const platformBatches = (batches || []).filter(b => b.platform_id === platform.id);
    const variance = platformBatches.reduce((sum, b) => sum + (b.total_variance || 0), 0);
    const discrepancyCount = platformBatches.reduce((sum, b) => sum + (b.discrepancy_count || 0), 0);
    
    varianceByPlatform.push({
      platformId: platform.id,
      platformName: platform.name,
      variance,
      discrepancyCount,
    });
  }
  
  // Calculate top discrepancy types
  const discrepancyGroups = new Map<DiscrepancyType, { count: number; variance: number }>();
  
  for (const match of matches || []) {
    if (match.discrepancy_type) {
      const current = discrepancyGroups.get(match.discrepancy_type) || { count: 0, variance: 0 };
      current.count++;
      current.variance += Math.abs(match.variance || 0);
      discrepancyGroups.set(match.discrepancy_type, current);
    }
  }
  
  const topDiscrepancies = Array.from(discrepancyGroups.entries())
    .map(([type, data]) => ({
      type,
      count: data.count,
      totalVariance: data.variance,
    }))
    .sort((a, b) => b.count - a.count);
  
  return {
    totalBatches: batches?.length || 0,
    pendingBatches: batches?.filter(b => b.status === 'pending').length || 0,
    discrepancyBatches: batches?.filter(b => b.status === 'discrepancy').length || 0,
    resolvedBatches: batches?.filter(b => b.status === 'resolved').length || 0,
    totalVariance: batches?.reduce((sum, b) => sum + (b.total_variance || 0), 0) || 0,
    varianceByPlatform,
    topDiscrepancies,
  };
}

/**
 * Generate reconciliation report for a batch.
 */
export async function generateReconciliationReport(batchId: string): Promise<{
  batch: ReconciliationBatch;
  summary: {
    matched: number;
    discrepancies: number;
    resolved: number;
    disputed: number;
    totalInternalEarnings: number;
    totalPlatformEarnings: number;
    netVariance: number;
  };
  discrepanciesByType: Array<{
    type: DiscrepancyType;
    count: number;
    variance: number;
  }>;
  topVarianceItems: OrderMatch[];
} | null> {
  const supabase = createClient();
  
  const batches = await getReconciliationBatches();
  const batch = batches.find(b => b.id === batchId);
  
  if (!batch) return null;
  
  const matches = await getBatchOrderMatches(batchId);
  
  const matched = matches.filter(m => m.status === 'matched').length;
  const discrepancies = matches.filter(m => m.status === 'discrepancy').length;
  const resolved = matches.filter(m => m.status === 'resolved').length;
  const disputed = matches.filter(m => m.status === 'disputed').length;
  
  const totalInternalEarnings = matches.reduce((sum, m) => sum + (m.internalAmount || 0), 0);
  const totalPlatformEarnings = matches.reduce((sum, m) => sum + (m.platformAmount || 0), 0);
  const netVariance = totalPlatformEarnings - totalInternalEarnings;
  
  // Group discrepancies by type
  const discrepancyGroups = new Map<DiscrepancyType, { count: number; variance: number }>();
  
  for (const match of matches.filter(m => m.discrepancyType)) {
    const type = match.discrepancyType!;
    const current = discrepancyGroups.get(type) || { count: 0, variance: 0 };
    current.count++;
    current.variance += Math.abs(match.variance);
    discrepancyGroups.set(type, current);
  }
  
  const discrepanciesByType = Array.from(discrepancyGroups.entries())
    .map(([type, data]) => ({
      type,
      count: data.count,
      variance: data.variance,
    }));
  
  // Get top variance items
  const topVarianceItems = matches
    .filter(m => m.status === 'discrepancy')
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
    .slice(0, 10);
  
  return {
    batch,
    summary: {
      matched,
      discrepancies,
      resolved,
      disputed,
      totalInternalEarnings,
      totalPlatformEarnings,
      netVariance,
    },
    discrepanciesByType,
    topVarianceItems,
  };
}
