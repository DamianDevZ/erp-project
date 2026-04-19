'use client';

/**
 * KPI & Performance Scoring Service (T-061 to T-063)
 * 
 * Manages:
 * - Performance metrics tracking
 * - Rider scorecards
 * - Rankings and leaderboards
 * - Performance reviews
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type MetricType = 
  | 'orders_completed'
  | 'orders_cancelled'
  | 'on_time_delivery'
  | 'customer_rating'
  | 'attendance_rate'
  | 'punctuality'
  | 'incidents'
  | 'complaints'
  | 'earnings'
  | 'hours_worked'
  | 'distance_traveled'
  | 'acceptance_rate';

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type PerformanceTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface Metric {
  type: MetricType;
  value: number;
  target: number | null;
  unit: string;
  weight: number; // percentage weight in overall score
  achieved: boolean;
}

export interface PerformanceScore {
  overallScore: number; // 0-100
  tier: PerformanceTier;
  metrics: Record<MetricType, Metric>;
  rank: number;
  totalRiders: number;
  percentile: number;
  trend: 'up' | 'down' | 'stable';
  previousScore: number | null;
}

export interface Scorecard {
  id: string;
  riderId: string;
  riderName: string;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  score: PerformanceScore;
  highlights: string[];
  improvements: string[];
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  riderId: string;
  riderName: string;
  photo: string | null;
  score: number;
  tier: PerformanceTier;
  ordersCompleted: number;
  customerRating: number;
  onTimeRate: number;
  change: number; // rank change from previous period
}

export interface PerformanceTarget {
  id: string;
  metricType: MetricType;
  targetValue: number;
  minValue: number;
  maxBonus: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  platformId: string | null;
  categoryId: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const METRIC_LABELS: Record<MetricType, string> = {
  orders_completed: 'Orders Completed',
  orders_cancelled: 'Orders Cancelled',
  on_time_delivery: 'On-Time Delivery',
  customer_rating: 'Customer Rating',
  attendance_rate: 'Attendance Rate',
  punctuality: 'Punctuality',
  incidents: 'Incidents',
  complaints: 'Complaints',
  earnings: 'Earnings',
  hours_worked: 'Hours Worked',
  distance_traveled: 'Distance Traveled',
  acceptance_rate: 'Acceptance Rate',
};

export const METRIC_UNITS: Record<MetricType, string> = {
  orders_completed: 'orders',
  orders_cancelled: 'orders',
  on_time_delivery: '%',
  customer_rating: '/5',
  attendance_rate: '%',
  punctuality: '%',
  incidents: 'count',
  complaints: 'count',
  earnings: 'AED',
  hours_worked: 'hours',
  distance_traveled: 'km',
  acceptance_rate: '%',
};

export const TIER_THRESHOLDS: Record<PerformanceTier, { min: number; max: number }> = {
  bronze: { min: 0, max: 49 },
  silver: { min: 50, max: 64 },
  gold: { min: 65, max: 79 },
  platinum: { min: 80, max: 89 },
  diamond: { min: 90, max: 100 },
};

export const TIER_LABELS: Record<PerformanceTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
};

// Default metric weights (sum to 100)
export const DEFAULT_METRIC_WEIGHTS: Partial<Record<MetricType, number>> = {
  orders_completed: 15,
  on_time_delivery: 20,
  customer_rating: 25,
  attendance_rate: 15,
  acceptance_rate: 10,
  incidents: 10,
  complaints: 5,
};

// ============================================================================
// METRICS COLLECTION
// ============================================================================

/**
 * Collect metrics for a rider for a specific period.
 */
export async function collectRiderMetrics(
  riderId: string,
  startDate: string,
  endDate: string
): Promise<Record<MetricType, number>> {
  const supabase = createClient();
  
  // Orders completed
  const { count: ordersCompleted } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('rider_id', riderId)
    .eq('status', 'completed')
    .gte('completed_at', startDate)
    .lte('completed_at', endDate);
  
  // Orders cancelled
  const { count: ordersCancelled } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('rider_id', riderId)
    .eq('status', 'cancelled')
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  // On-time delivery rate
  const { data: deliveries } = await supabase
    .from('orders')
    .select('delivered_at, estimated_delivery_at')
    .eq('rider_id', riderId)
    .eq('status', 'completed')
    .gte('completed_at', startDate)
    .lte('completed_at', endDate);
  
  const onTimeCount = deliveries?.filter(d => 
    d.delivered_at && d.estimated_delivery_at &&
    new Date(d.delivered_at) <= new Date(d.estimated_delivery_at)
  ).length || 0;
  
  const onTimeRate = deliveries?.length 
    ? Math.round((onTimeCount / deliveries.length) * 100)
    : 0;
  
  // Customer rating (average)
  const { data: ratings } = await supabase
    .from('order_ratings')
    .select('rating')
    .eq('rider_id', riderId)
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  const avgRating = ratings?.length
    ? Number((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(2))
    : 0;
  
  // Attendance rate
  const { data: attendance } = await supabase
    .from('attendance')
    .select('status')
    .eq('employee_id', riderId)
    .gte('date', startDate)
    .lte('date', endDate);
  
  const presentDays = attendance?.filter(a => a.status === 'present').length || 0;
  const attendanceRate = attendance?.length
    ? Math.round((presentDays / attendance.length) * 100)
    : 0;
  
  // Punctuality
  const { data: shifts } = await supabase
    .from('shift_assignments')
    .select('scheduled_start, actual_start')
    .eq('rider_id', riderId)
    .gte('date', startDate)
    .lte('date', endDate);
  
  const onTimeShifts = shifts?.filter(s =>
    s.actual_start && s.scheduled_start &&
    new Date(s.actual_start) <= new Date(new Date(s.scheduled_start).getTime() + 15 * 60000) // 15 min grace
  ).length || 0;
  
  const punctuality = shifts?.length
    ? Math.round((onTimeShifts / shifts.length) * 100)
    : 0;
  
  // Incidents count
  const { count: incidents } = await supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true })
    .eq('rider_id', riderId)
    .gte('occurred_at', startDate)
    .lte('occurred_at', endDate);
  
  // Complaints count
  const { count: complaints } = await supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true })
    .eq('rider_id', riderId)
    .eq('type', 'customer_complaint')
    .gte('occurred_at', startDate)
    .lte('occurred_at', endDate);
  
  // Total earnings
  const { data: earnings } = await supabase
    .from('order_earnings')
    .select('amount')
    .eq('rider_id', riderId)
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  const totalEarnings = earnings?.reduce((sum, e) => sum + e.amount, 0) || 0;
  
  // Hours worked
  const { data: hours } = await supabase
    .from('shift_assignments')
    .select('actual_start, actual_end')
    .eq('rider_id', riderId)
    .not('actual_start', 'is', null)
    .not('actual_end', 'is', null)
    .gte('date', startDate)
    .lte('date', endDate);
  
  const totalHours = hours?.reduce((sum, h) => {
    const start = new Date(h.actual_start!).getTime();
    const end = new Date(h.actual_end!).getTime();
    return sum + (end - start) / (1000 * 60 * 60);
  }, 0) || 0;
  
  // Acceptance rate
  const { data: requests } = await supabase
    .from('order_requests')
    .select('status')
    .eq('rider_id', riderId)
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  const acceptedRequests = requests?.filter(r => r.status === 'accepted').length || 0;
  const acceptanceRate = requests?.length
    ? Math.round((acceptedRequests / requests.length) * 100)
    : 0;
  
  return {
    orders_completed: ordersCompleted || 0,
    orders_cancelled: ordersCancelled || 0,
    on_time_delivery: onTimeRate,
    customer_rating: avgRating,
    attendance_rate: attendanceRate,
    punctuality,
    incidents: incidents || 0,
    complaints: complaints || 0,
    earnings: totalEarnings,
    hours_worked: Math.round(totalHours),
    distance_traveled: 0, // Would need GPS tracking data
    acceptance_rate: acceptanceRate,
  };
}

// ============================================================================
// SCORING
// ============================================================================

/**
 * Calculate performance score from metrics.
 */
export function calculatePerformanceScore(
  metrics: Record<MetricType, number>,
  targets: Partial<Record<MetricType, number>>,
  weights: Partial<Record<MetricType, number>> = DEFAULT_METRIC_WEIGHTS
): { score: number; tier: PerformanceTier; metricScores: Record<string, Metric> } {
  let totalWeight = 0;
  let weightedScore = 0;
  const metricScores: Record<string, Metric> = {};
  
  for (const [key, weight] of Object.entries(weights)) {
    const metricType = key as MetricType;
    const value = metrics[metricType] || 0;
    const target = targets[metricType] || null;
    
    // Calculate metric score (0-100)
    let metricScore = 0;
    
    // Handle inverted metrics (lower is better)
    const invertedMetrics: MetricType[] = ['orders_cancelled', 'incidents', 'complaints'];
    
    if (invertedMetrics.includes(metricType)) {
      // For inverted metrics: 0 incidents = 100%, each incident reduces score
      const penalty = target ? (value / target) * 100 : value * 10;
      metricScore = Math.max(0, 100 - penalty);
    } else if (target) {
      // For normal metrics: achieve target = 100%
      metricScore = Math.min(100, (value / target) * 100);
    } else {
      // No target - use value directly if it's a percentage
      metricScore = Math.min(100, value);
    }
    
    metricScores[metricType] = {
      type: metricType,
      value,
      target,
      unit: METRIC_UNITS[metricType],
      weight: weight!,
      achieved: target ? value >= target : metricScore >= 80,
    };
    
    weightedScore += metricScore * (weight! / 100);
    totalWeight += weight!;
  }
  
  // Normalize if weights don't sum to 100
  const finalScore = totalWeight > 0 
    ? Math.round((weightedScore / totalWeight) * 100)
    : 0;
  
  // Determine tier
  let tier: PerformanceTier = 'bronze';
  for (const [t, { min, max }] of Object.entries(TIER_THRESHOLDS)) {
    if (finalScore >= min && finalScore <= max) {
      tier = t as PerformanceTier;
    }
  }
  
  return { score: finalScore, tier, metricScores };
}

// ============================================================================
// SCORECARDS
// ============================================================================

/**
 * Generate scorecard for a rider.
 */
export async function generateScorecard(
  riderId: string,
  periodType: PeriodType = 'monthly'
): Promise<{ success: boolean; scorecardId?: string; error?: string }> {
  const supabase = createClient();
  
  // Calculate period dates
  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;
  
  switch (periodType) {
    case 'daily':
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
      break;
    case 'weekly':
      periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() - periodEnd.getDay()); // Last Sunday
      periodStart = new Date(periodEnd);
      periodStart.setDate(periodStart.getDate() - 6);
      break;
    case 'quarterly':
      const quarter = Math.floor(now.getMonth() / 3);
      periodStart = new Date(now.getFullYear(), quarter * 3 - 3, 1);
      periodEnd = new Date(now.getFullYear(), quarter * 3, 0);
      break;
    default: // monthly
      periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  }
  
  // Collect metrics
  const metrics = await collectRiderMetrics(
    riderId,
    periodStart.toISOString(),
    periodEnd.toISOString()
  );
  
  // Get targets
  const { data: targets } = await supabase
    .from('performance_targets')
    .select('metric_type, target_value')
    .lte('effective_from', periodEnd.toISOString())
    .or(`effective_to.is.null,effective_to.gte.${periodStart.toISOString()}`);
  
  const targetMap: Partial<Record<MetricType, number>> = {};
  for (const t of targets || []) {
    targetMap[t.metric_type as MetricType] = t.target_value;
  }
  
  // Calculate score
  const { score, tier, metricScores } = calculatePerformanceScore(metrics, targetMap);
  
  // Get previous score for trend
  const { data: previousScorecard } = await supabase
    .from('scorecards')
    .select('overall_score')
    .eq('rider_id', riderId)
    .eq('period_type', periodType)
    .lt('period_end', periodStart.toISOString())
    .order('period_end', { ascending: false })
    .limit(1)
    .single();
  
  const previousScore = previousScorecard?.overall_score;
  const trend: 'up' | 'down' | 'stable' = 
    previousScore === null ? 'stable' :
    score > previousScore + 5 ? 'up' :
    score < previousScore - 5 ? 'down' : 'stable';
  
  // Get rank
  const { data: allScores } = await supabase
    .from('scorecards')
    .select('rider_id, overall_score')
    .eq('period_type', periodType)
    .gte('period_start', periodStart.toISOString())
    .lte('period_end', periodEnd.toISOString())
    .order('overall_score', { ascending: false });
  
  const rank = (allScores?.findIndex(s => s.overall_score <= score) || 0) + 1;
  const totalRiders = (allScores?.length || 0) + 1;
  const percentile = Math.round(((totalRiders - rank) / totalRiders) * 100);
  
  // Generate highlights and improvements
  const highlights: string[] = [];
  const improvements: string[] = [];
  
  for (const [, metric] of Object.entries(metricScores)) {
    if (metric.achieved) {
      highlights.push(`${METRIC_LABELS[metric.type]}: ${metric.value}${metric.unit} (target: ${metric.target})`);
    } else if (metric.target) {
      improvements.push(`${METRIC_LABELS[metric.type]}: ${metric.value}${metric.unit} (need: ${metric.target})`);
    }
  }
  
  // Save scorecard
  const { data, error } = await supabase
    .from('scorecards')
    .insert({
      rider_id: riderId,
      period_type: periodType,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      overall_score: score,
      tier,
      metrics: metricScores,
      rank,
      total_riders: totalRiders,
      percentile,
      trend,
      previous_score: previousScore,
      highlights,
      improvements,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, scorecardId: data.id };
}

/**
 * Get scorecard.
 */
export async function getScorecard(scorecardId: string): Promise<Scorecard | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('scorecards')
    .select(`
      *,
      rider:employees!scorecards_rider_id_fkey(full_name),
      reviewer:employees!scorecards_reviewed_by_fkey(full_name)
    `)
    .eq('id', scorecardId)
    .single();
  
  if (!data) return null;
  
  return mapScorecard(data);
}

/**
 * Add review to scorecard.
 */
export async function reviewScorecard(
  scorecardId: string,
  reviewedBy: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('scorecards')
    .update({
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_notes: notes,
    })
    .eq('id', scorecardId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================================================
// LEADERBOARDS
// ============================================================================

/**
 * Get leaderboard for a period.
 */
export async function getLeaderboard(
  periodType: PeriodType = 'monthly',
  limit = 50
): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  
  // Get current period dates
  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;
  
  switch (periodType) {
    case 'weekly':
      periodEnd = new Date(now);
      periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - 7);
      break;
    case 'quarterly':
      const quarter = Math.floor(now.getMonth() / 3);
      periodStart = new Date(now.getFullYear(), quarter * 3, 1);
      periodEnd = now;
      break;
    default: // monthly
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = now;
  }
  
  const { data: scorecards } = await supabase
    .from('scorecards')
    .select(`
      rider_id,
      overall_score,
      tier,
      metrics,
      rank,
      rider:employees!scorecards_rider_id_fkey(full_name, photo_url)
    `)
    .eq('period_type', periodType)
    .gte('period_start', periodStart.toISOString())
    .lte('period_end', periodEnd.toISOString())
    .order('overall_score', { ascending: false })
    .limit(limit);
  
  // Get previous period scores for rank change
  const prevStart = new Date(periodStart);
  const prevEnd = new Date(periodEnd);
  switch (periodType) {
    case 'weekly':
      prevStart.setDate(prevStart.getDate() - 7);
      prevEnd.setDate(prevEnd.getDate() - 7);
      break;
    case 'quarterly':
      prevStart.setMonth(prevStart.getMonth() - 3);
      prevEnd.setMonth(prevEnd.getMonth() - 3);
      break;
    default:
      prevStart.setMonth(prevStart.getMonth() - 1);
      prevEnd.setMonth(prevEnd.getMonth() - 1);
  }
  
  const { data: prevScorecards } = await supabase
    .from('scorecards')
    .select('rider_id, rank')
    .eq('period_type', periodType)
    .gte('period_start', prevStart.toISOString())
    .lte('period_end', prevEnd.toISOString());
  
  const prevRanks = new Map(prevScorecards?.map(s => [s.rider_id, s.rank]));
  
  return (scorecards || []).map((sc, idx) => {
    const rider = sc.rider as unknown;
    const riderData = (Array.isArray(rider) ? rider[0] : rider) as { full_name: string; photo_url: string | null } | null;
    const metrics = sc.metrics as Record<MetricType, Metric>;
    const prevRank = prevRanks.get(sc.rider_id);
    
    return {
      rank: idx + 1,
      riderId: sc.rider_id,
      riderName: riderData?.full_name || 'Unknown',
      photo: riderData?.photo_url || null,
      score: sc.overall_score,
      tier: sc.tier as PerformanceTier,
      ordersCompleted: metrics?.orders_completed?.value || 0,
      customerRating: metrics?.customer_rating?.value || 0,
      onTimeRate: metrics?.on_time_delivery?.value || 0,
      change: prevRank ? prevRank - (idx + 1) : 0,
    };
  });
}

/**
 * Get rider's rank history.
 */
export async function getRankHistory(
  riderId: string,
  periods = 12
): Promise<Array<{ period: string; rank: number; score: number; tier: PerformanceTier }>> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('scorecards')
    .select('period_start, rank, overall_score, tier')
    .eq('rider_id', riderId)
    .eq('period_type', 'monthly')
    .order('period_start', { ascending: false })
    .limit(periods);
  
  return (data || []).reverse().map(sc => ({
    period: new Date(sc.period_start).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    rank: sc.rank,
    score: sc.overall_score,
    tier: sc.tier as PerformanceTier,
  }));
}

// ============================================================================
// TARGETS MANAGEMENT
// ============================================================================

/**
 * Set performance target.
 */
export async function setPerformanceTarget(input: {
  metricType: MetricType;
  targetValue: number;
  minValue?: number;
  maxBonus?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  platformId?: string;
  categoryId?: string;
}): Promise<{ success: boolean; targetId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('performance_targets')
    .insert({
      metric_type: input.metricType,
      target_value: input.targetValue,
      min_value: input.minValue || 0,
      max_bonus: input.maxBonus || 0,
      effective_from: input.effectiveFrom,
      effective_to: input.effectiveTo,
      platform_id: input.platformId,
      category_id: input.categoryId,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, targetId: data.id };
}

/**
 * Get active performance targets.
 */
export async function getPerformanceTargets(): Promise<PerformanceTarget[]> {
  const supabase = createClient();
  
  const now = new Date().toISOString();
  
  const { data } = await supabase
    .from('performance_targets')
    .select('*')
    .lte('effective_from', now)
    .or(`effective_to.is.null,effective_to.gte.${now}`);
  
  return (data || []).map(t => ({
    id: t.id,
    metricType: t.metric_type as MetricType,
    targetValue: t.target_value,
    minValue: t.min_value,
    maxBonus: t.max_bonus,
    effectiveFrom: t.effective_from,
    effectiveTo: t.effective_to,
    platformId: t.platform_id,
    categoryId: t.category_id,
  }));
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Generate scorecards for all active riders.
 */
export async function generateAllScorecards(
  periodType: PeriodType = 'monthly'
): Promise<{ success: boolean; generated: number; errors: number }> {
  const supabase = createClient();
  
  // Get all active riders
  const { data: riders } = await supabase
    .from('employees')
    .select('id')
    .eq('role', 'rider')
    .eq('status', 'active');
  
  let generated = 0;
  let errors = 0;
  
  for (const rider of riders || []) {
    const result = await generateScorecard(rider.id, periodType);
    if (result.success) {
      generated++;
    } else {
      errors++;
    }
  }
  
  return { success: true, generated, errors };
}

// ============================================================================
// SUMMARIES
// ============================================================================

export interface PerformanceSummary {
  totalRiders: number;
  averageScore: number;
  tierDistribution: Record<PerformanceTier, number>;
  topPerformers: LeaderboardEntry[];
  improvementNeeded: LeaderboardEntry[];
  metricAverages: Record<MetricType, number>;
}

export async function getPerformanceSummary(
  periodType: PeriodType = 'monthly'
): Promise<PerformanceSummary> {
  const supabase = createClient();
  
  // Get period dates
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const { data: scorecards } = await supabase
    .from('scorecards')
    .select(`
      overall_score,
      tier,
      metrics,
      rider_id,
      rider:employees!scorecards_rider_id_fkey(full_name, photo_url)
    `)
    .eq('period_type', periodType)
    .gte('period_start', periodStart.toISOString());
  
  const tierDistribution: Record<PerformanceTier, number> = {
    bronze: 0,
    silver: 0,
    gold: 0,
    platinum: 0,
    diamond: 0,
  };
  
  const metricTotals: Record<MetricType, number[]> = {
    orders_completed: [],
    orders_cancelled: [],
    on_time_delivery: [],
    customer_rating: [],
    attendance_rate: [],
    punctuality: [],
    incidents: [],
    complaints: [],
    earnings: [],
    hours_worked: [],
    distance_traveled: [],
    acceptance_rate: [],
  };
  
  let totalScore = 0;
  
  for (const sc of scorecards || []) {
    tierDistribution[sc.tier as PerformanceTier]++;
    totalScore += sc.overall_score;
    
    const metrics = sc.metrics as Record<MetricType, Metric>;
    for (const [key, metric] of Object.entries(metrics || {})) {
      metricTotals[key as MetricType].push(metric.value);
    }
  }
  
  const metricAverages: Record<MetricType, number> = {} as Record<MetricType, number>;
  for (const [key, values] of Object.entries(metricTotals)) {
    metricAverages[key as MetricType] = values.length
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 0;
  }
  
  const sorted = [...(scorecards || [])].sort((a, b) => b.overall_score - a.overall_score);
  
  const mapToEntry = (sc: typeof sorted[0], idx: number): LeaderboardEntry => {
    const rider = sc.rider as unknown;
    const riderData = (Array.isArray(rider) ? rider[0] : rider) as { full_name: string; photo_url: string | null } | null;
    const metrics = sc.metrics as Record<MetricType, Metric>;
    
    return {
      rank: idx + 1,
      riderId: sc.rider_id,
      riderName: riderData?.full_name || 'Unknown',
      photo: riderData?.photo_url || null,
      score: sc.overall_score,
      tier: sc.tier as PerformanceTier,
      ordersCompleted: metrics?.orders_completed?.value || 0,
      customerRating: metrics?.customer_rating?.value || 0,
      onTimeRate: metrics?.on_time_delivery?.value || 0,
      change: 0,
    };
  };
  
  return {
    totalRiders: scorecards?.length || 0,
    averageScore: scorecards?.length ? Math.round(totalScore / scorecards.length) : 0,
    tierDistribution,
    topPerformers: sorted.slice(0, 5).map(mapToEntry),
    improvementNeeded: sorted.slice(-5).reverse().map(mapToEntry),
    metricAverages,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function mapScorecard(row: Record<string, unknown>): Scorecard {
  const rider = row.rider as unknown;
  const riderData = (Array.isArray(rider) ? rider[0] : rider) as { full_name: string } | null;
  const reviewer = row.reviewer as unknown;
  const reviewerData = (Array.isArray(reviewer) ? reviewer[0] : reviewer) as { full_name: string } | null;
  
  return {
    id: row.id as string,
    riderId: row.rider_id as string,
    riderName: riderData?.full_name || 'Unknown',
    periodType: row.period_type as PeriodType,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    score: {
      overallScore: row.overall_score as number,
      tier: row.tier as PerformanceTier,
      metrics: row.metrics as Record<MetricType, Metric>,
      rank: row.rank as number,
      totalRiders: row.total_riders as number,
      percentile: row.percentile as number,
      trend: row.trend as 'up' | 'down' | 'stable',
      previousScore: row.previous_score as number | null,
    },
    highlights: row.highlights as string[],
    improvements: row.improvements as string[],
    reviewedBy: row.reviewed_by as string | null,
    reviewedAt: row.reviewed_at as string | null,
    reviewNotes: row.review_notes as string | null,
  };
}
