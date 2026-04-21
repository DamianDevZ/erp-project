'use client';

/**
 * Commission & Incentive Rules Service (T-067 to T-069)
 * 
 * Manages:
 * - Commission structures by platform
 * - Performance-based incentives
 * - Bonus calculations
 * - Target achievements
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type CommissionType = 'per_order' | 'percentage' | 'tiered' | 'flat';
export type IncentiveType = 
  | 'target_completion'
  | 'peak_hours'
  | 'customer_rating'
  | 'attendance'
  | 'referral'
  | 'retention'
  | 'special_event';

export type IncentiveStatus = 'active' | 'paused' | 'ended';
export type AchievementStatus = 'pending' | 'achieved' | 'missed' | 'paid';

export interface CommissionRule {
  id: string;
  name: string;
  platformId: string;
  platformName: string;
  type: CommissionType;
  baseRate: number; // per order or percentage
  tiers: CommissionTier[];
  minOrderValue: number | null;
  maxOrderValue: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface CommissionTier {
  minOrders: number;
  maxOrders: number | null;
  rate: number;
  bonus: number;
}

export interface IncentiveProgram {
  id: string;
  name: string;
  description: string;
  type: IncentiveType;
  rules: IncentiveRules;
  rewardAmount: number;
  rewardType: 'fixed' | 'percentage' | 'per_unit';
  maxReward: number | null;
  startDate: string;
  endDate: string;
  status: IncentiveStatus;
  categoryIds: string[] | null; // null = all categories
  platformIds: string[] | null; // null = all platforms
  participantCount: number;
  totalPaidOut: number;
}

export interface IncentiveRules {
  targetType: string;
  targetValue: number;
  period?: 'daily' | 'weekly' | 'monthly';
  minOrders?: number;
  minRating?: number;
  minAttendance?: number;
  peakHourStart?: string;
  peakHourEnd?: string;
  requirements?: string[];
}

export interface RiderCommission {
  id: string;
  riderId: string;
  riderName: string;
  orderId: string;
  platformId: string;
  platformName: string;
  orderValue: number;
  commissionAmount: number;
  ruleId: string;
  status: 'pending' | 'approved' | 'paid';
  createdAt: string;
  paidAt: string | null;
}

export interface IncentiveAchievement {
  id: string;
  programId: string;
  programName: string;
  riderId: string;
  riderName: string;
  targetValue: number;
  achievedValue: number;
  progress: number; // percentage
  rewardAmount: number;
  status: AchievementStatus;
  periodStart: string;
  periodEnd: string;
  achievedAt: string | null;
  paidAt: string | null;
}

// ============================================================================
// LABELS
// ============================================================================

export const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
  per_order: 'Per Order',
  percentage: 'Percentage',
  tiered: 'Tiered',
  flat: 'Flat Rate',
};

export const INCENTIVE_TYPE_LABELS: Record<IncentiveType, string> = {
  target_completion: 'Target Completion',
  peak_hours: 'Peak Hours',
  customer_rating: 'Customer Rating',
  attendance: 'Attendance',
  referral: 'Referral',
  retention: 'Retention',
  special_event: 'Special Event',
};

// ============================================================================
// COMMISSION RULES
// ============================================================================

/**
 * Create commission rule.
 */
export async function createCommissionRule(input: {
  name: string;
  platformId: string;
  type: CommissionType;
  baseRate: number;
  tiers?: CommissionTier[];
  minOrderValue?: number;
  maxOrderValue?: number;
  effectiveFrom: string;
  effectiveTo?: string;
}): Promise<{ success: boolean; ruleId?: string; error?: string }> {
  const supabase = createClient();
  
  // Deactivate existing rules for the same platform
  await supabase
    .from('commission_rules')
    .update({ is_active: false, effective_to: input.effectiveFrom })
    .eq('platform_id', input.platformId)
    .eq('is_active', true);
  
  const { data, error } = await supabase
    .from('commission_rules')
    .insert({
      name: input.name,
      platform_id: input.platformId,
      type: input.type,
      base_rate: input.baseRate,
      tiers: input.tiers || [],
      min_order_value: input.minOrderValue,
      max_order_value: input.maxOrderValue,
      effective_from: input.effectiveFrom,
      effective_to: input.effectiveTo,
      is_active: true,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, ruleId: data.id };
}

/**
 * Get active commission rules.
 */
export async function getCommissionRules(platformId?: string): Promise<CommissionRule[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('commission_rules')
    .select(`
      *,
      client:clients(name)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (platformId) {
    query = query.eq('platform_id', platformId);
  }
  
  const { data } = await query;
  
  return (data || []).map(mapCommissionRule);
}

/**
 * Calculate commission for an order.
 */
export async function calculateCommission(
  riderId: string,
  orderId: string,
  platformId: string,
  orderValue: number
): Promise<{ amount: number; ruleId: string | null }> {
  const supabase = createClient();
  
  // Get active rule for platform
  const { data: rule } = await supabase
    .from('commission_rules')
    .select('*')
    .eq('platform_id', platformId)
    .eq('is_active', true)
    .single();
  
  if (!rule) {
    return { amount: 0, ruleId: null };
  }
  
  // Check order value constraints
  if (rule.min_order_value && orderValue < rule.min_order_value) {
    return { amount: 0, ruleId: rule.id };
  }
  if (rule.max_order_value && orderValue > rule.max_order_value) {
    return { amount: 0, ruleId: rule.id };
  }
  
  let commission = 0;
  
  switch (rule.type as CommissionType) {
    case 'per_order':
      commission = rule.base_rate;
      break;
    
    case 'percentage':
      commission = (orderValue * rule.base_rate) / 100;
      break;
    
    case 'tiered': {
      // Get rider's order count for current period
      const periodStart = new Date();
      periodStart.setDate(1);
      
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('rider_id', riderId)
        .eq('status', 'completed')
        .gte('completed_at', periodStart.toISOString());
      
      const orderCount = (count || 0) + 1;
      const tiers = rule.tiers as CommissionTier[];
      
      // Find applicable tier
      const tier = tiers.find(t => 
        orderCount >= t.minOrders && 
        (t.maxOrders === null || orderCount <= t.maxOrders)
      );
      
      if (tier) {
        commission = tier.rate + tier.bonus;
      } else {
        commission = rule.base_rate;
      }
      break;
    }
    
    case 'flat':
      commission = rule.base_rate;
      break;
  }
  
  return { amount: Math.round(commission * 100) / 100, ruleId: rule.id };
}

/**
 * Record commission for an order.
 */
export async function recordCommission(input: {
  riderId: string;
  orderId: string;
  platformId: string;
  orderValue: number;
}): Promise<{ success: boolean; commissionId?: string; amount?: number; error?: string }> {
  const supabase = createClient();
  
  // Check if commission already recorded
  const { data: existing } = await supabase
    .from('order_commissions')
    .select('id')
    .eq('order_id', input.orderId)
    .single();
  
  if (existing) {
    return { success: false, error: 'Commission already recorded for this order' };
  }
  
  // Calculate commission
  const { amount, ruleId } = await calculateCommission(
    input.riderId,
    input.orderId,
    input.platformId,
    input.orderValue
  );
  
  if (amount === 0) {
    return { success: true, amount: 0 };
  }
  
  const { data, error } = await supabase
    .from('order_commissions')
    .insert({
      rider_id: input.riderId,
      order_id: input.orderId,
      platform_id: input.platformId,
      order_value: input.orderValue,
      commission_amount: amount,
      rule_id: ruleId,
      status: 'pending',
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, commissionId: data.id, amount };
}

/**
 * Get rider's commissions.
 */
export async function getRiderCommissions(
  riderId: string,
  filters?: { startDate?: string; endDate?: string; status?: string }
): Promise<RiderCommission[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('order_commissions')
    .select(`
      *,
      rider:employees!order_commissions_rider_id_fkey(full_name),
      client:clients(name)
    `)
    .eq('rider_id', riderId)
    .order('created_at', { ascending: false });
  
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  
  const { data } = await query;
  
  return (data || []).map(mapRiderCommission);
}

// ============================================================================
// INCENTIVE PROGRAMS
// ============================================================================

/**
 * Create incentive program.
 */
export async function createIncentiveProgram(input: {
  name: string;
  description: string;
  type: IncentiveType;
  rules: IncentiveRules;
  rewardAmount: number;
  rewardType: 'fixed' | 'percentage' | 'per_unit';
  maxReward?: number;
  startDate: string;
  endDate: string;
  categoryIds?: string[];
  platformIds?: string[];
}): Promise<{ success: boolean; programId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('incentive_programs')
    .insert({
      name: input.name,
      description: input.description,
      type: input.type,
      rules: input.rules,
      reward_amount: input.rewardAmount,
      reward_type: input.rewardType,
      max_reward: input.maxReward,
      start_date: input.startDate,
      end_date: input.endDate,
      status: 'active',
      category_ids: input.categoryIds,
      platform_ids: input.platformIds,
      participant_count: 0,
      total_paid_out: 0,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, programId: data.id };
}

/**
 * Get incentive programs.
 */
export async function getIncentivePrograms(
  status?: IncentiveStatus
): Promise<IncentiveProgram[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('incentive_programs')
    .select('*')
    .order('start_date', { ascending: false });
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data } = await query;
  
  return (data || []).map(mapIncentiveProgram);
}

/**
 * Calculate incentive achievement for a rider.
 */
export async function calculateIncentiveAchievement(
  riderId: string,
  programId: string
): Promise<{ progress: number; targetValue: number; achievedValue: number; rewardAmount: number }> {
  const supabase = createClient();
  
  // Get program
  const { data: program } = await supabase
    .from('incentive_programs')
    .select('*')
    .eq('id', programId)
    .single();
  
  if (!program) {
    return { progress: 0, targetValue: 0, achievedValue: 0, rewardAmount: 0 };
  }
  
  const rules = program.rules as IncentiveRules;
  let achievedValue = 0;
  
  // Calculate based on incentive type
  switch (program.type as IncentiveType) {
    case 'target_completion': {
      // Orders completed
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('rider_id', riderId)
        .eq('status', 'completed')
        .gte('completed_at', program.start_date)
        .lte('completed_at', program.end_date);
      achievedValue = count || 0;
      break;
    }
    
    case 'peak_hours': {
      // Orders during peak hours
      const { data: orders } = await supabase
        .from('orders')
        .select('completed_at')
        .eq('rider_id', riderId)
        .eq('status', 'completed')
        .gte('completed_at', program.start_date)
        .lte('completed_at', program.end_date);
      
      achievedValue = (orders || []).filter(o => {
        const hour = new Date(o.completed_at).getHours();
        const startHour = parseInt(rules.peakHourStart?.split(':')[0] || '0');
        const endHour = parseInt(rules.peakHourEnd?.split(':')[0] || '24');
        return hour >= startHour && hour < endHour;
      }).length;
      break;
    }
    
    case 'customer_rating': {
      // Average rating
      const { data: ratings } = await supabase
        .from('order_ratings')
        .select('rating')
        .eq('rider_id', riderId)
        .gte('created_at', program.start_date)
        .lte('created_at', program.end_date);
      
      achievedValue = ratings?.length 
        ? Number((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(2))
        : 0;
      break;
    }
    
    case 'attendance': {
      // Attendance rate
      const { data: attendance } = await supabase
        .from('attendance')
        .select('status')
        .eq('employee_id', riderId)
        .gte('date', program.start_date)
        .lte('date', program.end_date);
      
      const present = attendance?.filter(a => a.status === 'present').length || 0;
      achievedValue = attendance?.length 
        ? Math.round((present / attendance.length) * 100)
        : 0;
      break;
    }
    
    case 'referral': {
      // Successful referrals
      const { count } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', riderId)
        .eq('status', 'completed')
        .gte('completed_at', program.start_date)
        .lte('completed_at', program.end_date);
      achievedValue = count || 0;
      break;
    }
    
    default:
      achievedValue = 0;
  }
  
  const targetValue = rules.targetValue;
  const progress = targetValue > 0 ? Math.min(100, Math.round((achievedValue / targetValue) * 100)) : 0;
  
  // Calculate reward
  let rewardAmount = 0;
  if (progress >= 100) {
    switch (program.reward_type) {
      case 'fixed':
        rewardAmount = program.reward_amount;
        break;
      case 'percentage':
        // Would need base amount - using achieved value
        rewardAmount = (achievedValue * program.reward_amount) / 100;
        break;
      case 'per_unit':
        rewardAmount = achievedValue * program.reward_amount;
        break;
    }
    
    if (program.max_reward) {
      rewardAmount = Math.min(rewardAmount, program.max_reward);
    }
  }
  
  return { progress, targetValue, achievedValue, rewardAmount };
}

/**
 * Record incentive achievement.
 */
export async function recordIncentiveAchievement(
  riderId: string,
  programId: string
): Promise<{ success: boolean; achievementId?: string; error?: string }> {
  const supabase = createClient();
  
  // Get program
  const { data: program } = await supabase
    .from('incentive_programs')
    .select('start_date, end_date')
    .eq('id', programId)
    .single();
  
  if (!program) {
    return { success: false, error: 'Program not found' };
  }
  
  // Check for existing achievement
  const { data: existing } = await supabase
    .from('incentive_achievements')
    .select('id')
    .eq('program_id', programId)
    .eq('rider_id', riderId)
    .single();
  
  if (existing) {
    return { success: false, error: 'Achievement already recorded' };
  }
  
  // Calculate achievement
  const achievement = await calculateIncentiveAchievement(riderId, programId);
  
  const status: AchievementStatus = achievement.progress >= 100 ? 'achieved' : 'pending';
  
  const { data, error } = await supabase
    .from('incentive_achievements')
    .insert({
      program_id: programId,
      rider_id: riderId,
      target_value: achievement.targetValue,
      achieved_value: achievement.achievedValue,
      progress: achievement.progress,
      reward_amount: achievement.rewardAmount,
      status,
      period_start: program.start_date,
      period_end: program.end_date,
      achieved_at: status === 'achieved' ? new Date().toISOString() : null,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update program stats
  if (status === 'achieved') {
    await supabase
      .from('incentive_programs')
      .update({ 
        participant_count: supabase.rpc('increment_participant_count', { program_id: programId })
      })
      .eq('id', programId);
  }
  
  return { success: true, achievementId: data.id };
}

/**
 * Get rider's incentive achievements.
 */
export async function getRiderIncentiveAchievements(
  riderId: string
): Promise<IncentiveAchievement[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('incentive_achievements')
    .select(`
      *,
      program:incentive_programs(name),
      rider:employees!incentive_achievements_rider_id_fkey(full_name)
    `)
    .eq('rider_id', riderId)
    .order('created_at', { ascending: false });
  
  return (data || []).map(mapIncentiveAchievement);
}

// ============================================================================
// BONUS CALCULATIONS
// ============================================================================

export interface BonusSummary {
  riderId: string;
  riderName: string;
  period: string;
  ordersCompleted: number;
  totalCommissions: number;
  incentivesEarned: number;
  bonuses: number;
  totalEarnings: number;
  breakdown: Array<{
    type: 'commission' | 'incentive' | 'bonus';
    description: string;
    amount: number;
  }>;
}

/**
 * Calculate total bonus/earnings for a rider.
 */
export async function calculateRiderBonuses(
  riderId: string,
  startDate: string,
  endDate: string
): Promise<BonusSummary> {
  const supabase = createClient();
  
  // Get rider info
  const { data: rider } = await supabase
    .from('employees')
    .select('full_name')
    .eq('id', riderId)
    .single();
  
  // Get commissions
  const { data: commissions } = await supabase
    .from('order_commissions')
    .select('commission_amount, client:clients(name)')
    .eq('rider_id', riderId)
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  const totalCommissions = commissions?.reduce((sum, c) => sum + c.commission_amount, 0) || 0;
  
  // Get incentives
  const { data: incentives } = await supabase
    .from('incentive_achievements')
    .select('reward_amount, program:incentive_programs(name)')
    .eq('rider_id', riderId)
    .eq('status', 'achieved')
    .gte('achieved_at', startDate)
    .lte('achieved_at', endDate);
  
  const incentivesEarned = incentives?.reduce((sum, i) => sum + i.reward_amount, 0) || 0;
  
  // Get bonuses
  const { data: bonuses } = await supabase
    .from('bonuses')
    .select('amount, reason')
    .eq('employee_id', riderId)
    .eq('status', 'approved')
    .gte('date', startDate)
    .lte('date', endDate);
  
  const totalBonuses = bonuses?.reduce((sum, b) => sum + b.amount, 0) || 0;
  
  // Orders count
  const { count: ordersCompleted } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('rider_id', riderId)
    .eq('status', 'completed')
    .gte('completed_at', startDate)
    .lte('completed_at', endDate);
  
  // Build breakdown
  const breakdown: BonusSummary['breakdown'] = [];
  
  // Group commissions by platform
  const commissionsByPlatform = new Map<string, number>();
  for (const c of commissions || []) {
    const platform = c.platform as unknown;
    const platformData = (Array.isArray(platform) ? platform[0] : platform) as { name: string } | null;
    const name = platformData?.name || 'Unknown';
    commissionsByPlatform.set(name, (commissionsByPlatform.get(name) || 0) + c.commission_amount);
  }
  for (const [platform, amount] of commissionsByPlatform) {
    breakdown.push({
      type: 'commission',
      description: `${platform} Commissions`,
      amount,
    });
  }
  
  // Add incentives
  for (const i of incentives || []) {
    const program = i.program as unknown;
    const programData = (Array.isArray(program) ? program[0] : program) as { name: string } | null;
    breakdown.push({
      type: 'incentive',
      description: programData?.name || 'Incentive',
      amount: i.reward_amount,
    });
  }
  
  // Add bonuses
  for (const b of bonuses || []) {
    breakdown.push({
      type: 'bonus',
      description: b.reason,
      amount: b.amount,
    });
  }
  
  return {
    riderId,
    riderName: rider?.full_name || 'Unknown',
    period: `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
    ordersCompleted: ordersCompleted || 0,
    totalCommissions,
    incentivesEarned,
    bonuses: totalBonuses,
    totalEarnings: totalCommissions + incentivesEarned + totalBonuses,
    breakdown,
  };
}

// ============================================================================
// REPORTING
// ============================================================================

export interface CommissionSummary {
  totalPaid: number;
  totalPending: number;
  averagePerOrder: number;
  byPlatform: Array<{
    platformId: string;
    platformName: string;
    orders: number;
    total: number;
  }>;
  topEarners: Array<{
    riderId: string;
    riderName: string;
    orders: number;
    total: number;
  }>;
  thisMonth: number;
  lastMonth: number;
  trend: number;
}

export async function getCommissionSummary(): Promise<CommissionSummary> {
  const supabase = createClient();
  
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
  
  const { data: commissions } = await supabase
    .from('order_commissions')
    .select(`
      commission_amount,
      status,
      created_at,
      rider_id,
      platform_id,
      rider:employees!order_commissions_rider_id_fkey(full_name),
      client:clients(name)
    `);
  
  let totalPaid = 0;
  let totalPending = 0;
  let thisMonth = 0;
  let lastMonth = 0;
  
  const platformMap = new Map<string, { name: string; orders: number; total: number }>();
  const riderMap = new Map<string, { name: string; orders: number; total: number }>();
  
  for (const c of commissions || []) {
    if (c.status === 'paid') {
      totalPaid += c.commission_amount;
    } else {
      totalPending += c.commission_amount;
    }
    
    if (c.created_at >= thisMonthStart) thisMonth += c.commission_amount;
    if (c.created_at >= lastMonthStart && c.created_at <= lastMonthEnd) {
      lastMonth += c.commission_amount;
    }
    
    // Platform breakdown
    const platform = c.platform as unknown;
    const platformData = (Array.isArray(platform) ? platform[0] : platform) as { name: string } | null;
    const existing = platformMap.get(c.platform_id) || { name: platformData?.name || 'Unknown', orders: 0, total: 0 };
    existing.orders++;
    existing.total += c.commission_amount;
    platformMap.set(c.platform_id, existing);
    
    // Rider breakdown
    const rider = c.rider as unknown;
    const riderData = (Array.isArray(rider) ? rider[0] : rider) as { full_name: string } | null;
    const riderExisting = riderMap.get(c.rider_id) || { name: riderData?.full_name || 'Unknown', orders: 0, total: 0 };
    riderExisting.orders++;
    riderExisting.total += c.commission_amount;
    riderMap.set(c.rider_id, riderExisting);
  }
  
  const byPlatform = Array.from(platformMap.entries())
    .map(([id, data]) => ({ platformId: id, platformName: data.name, orders: data.orders, total: data.total }))
    .sort((a, b) => b.total - a.total);
  
  const topEarners = Array.from(riderMap.entries())
    .map(([id, data]) => ({ riderId: id, riderName: data.name, orders: data.orders, total: data.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
  
  const trend = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;
  
  return {
    totalPaid,
    totalPending,
    averagePerOrder: commissions?.length ? Math.round((totalPaid + totalPending) / commissions.length) : 0,
    byPlatform,
    topEarners,
    thisMonth,
    lastMonth,
    trend,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function mapCommissionRule(row: Record<string, unknown>): CommissionRule {
  const platform = row.platform as unknown;
  const platformData = (Array.isArray(platform) ? platform[0] : platform) as { name: string } | null;
  
  return {
    id: row.id as string,
    name: row.name as string,
    platformId: row.platform_id as string,
    platformName: platformData?.name || 'Unknown',
    type: row.type as CommissionType,
    baseRate: row.base_rate as number,
    tiers: (row.tiers as CommissionTier[]) || [],
    minOrderValue: row.min_order_value as number | null,
    maxOrderValue: row.max_order_value as number | null,
    effectiveFrom: row.effective_from as string,
    effectiveTo: row.effective_to as string | null,
    isActive: row.is_active as boolean,
  };
}

function mapRiderCommission(row: Record<string, unknown>): RiderCommission {
  const rider = row.rider as unknown;
  const riderData = (Array.isArray(rider) ? rider[0] : rider) as { full_name: string } | null;
  const platform = row.platform as unknown;
  const platformData = (Array.isArray(platform) ? platform[0] : platform) as { name: string } | null;
  
  return {
    id: row.id as string,
    riderId: row.rider_id as string,
    riderName: riderData?.full_name || 'Unknown',
    orderId: row.order_id as string,
    platformId: row.platform_id as string,
    platformName: platformData?.name || 'Unknown',
    orderValue: row.order_value as number,
    commissionAmount: row.commission_amount as number,
    ruleId: row.rule_id as string,
    status: row.status as RiderCommission['status'],
    createdAt: row.created_at as string,
    paidAt: row.paid_at as string | null,
  };
}

function mapIncentiveProgram(row: Record<string, unknown>): IncentiveProgram {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    type: row.type as IncentiveType,
    rules: row.rules as IncentiveRules,
    rewardAmount: row.reward_amount as number,
    rewardType: row.reward_type as IncentiveProgram['rewardType'],
    maxReward: row.max_reward as number | null,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    status: row.status as IncentiveStatus,
    categoryIds: row.category_ids as string[] | null,
    platformIds: row.platform_ids as string[] | null,
    participantCount: row.participant_count as number,
    totalPaidOut: row.total_paid_out as number,
  };
}

function mapIncentiveAchievement(row: Record<string, unknown>): IncentiveAchievement {
  const program = row.program as unknown;
  const programData = (Array.isArray(program) ? program[0] : program) as { name: string } | null;
  const rider = row.rider as unknown;
  const riderData = (Array.isArray(rider) ? rider[0] : rider) as { full_name: string } | null;
  
  return {
    id: row.id as string,
    programId: row.program_id as string,
    programName: programData?.name || 'Unknown',
    riderId: row.rider_id as string,
    riderName: riderData?.full_name || 'Unknown',
    targetValue: row.target_value as number,
    achievedValue: row.achieved_value as number,
    progress: row.progress as number,
    rewardAmount: row.reward_amount as number,
    status: row.status as AchievementStatus,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    achievedAt: row.achieved_at as string | null,
    paidAt: row.paid_at as string | null,
  };
}
