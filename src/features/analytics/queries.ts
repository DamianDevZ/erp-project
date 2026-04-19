'use client';

import { useQuery } from '@/lib/supabase/hooks';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DashboardMetrics {
  total_employees: number;
  active_employees: number;
  total_vehicles: number;
  available_vehicles: number;
  total_orders_today: number;
  total_revenue_today: number;
  total_shifts_today: number;
  active_riders: number;
  pending_compliance_alerts: number;
  pending_cod_remittance: number;
}

export interface RiderPerformanceMetrics {
  employee_id: string;
  employee_name: string;
  orders_completed: number;
  orders_rejected: number;
  total_earnings: number;
  average_rating?: number;
  on_time_percentage: number;
  total_distance_km?: number;
}

export interface PlatformPerformanceMetrics {
  platform_id: string;
  platform_name: string;
  total_orders: number;
  total_revenue: number;
  active_riders: number;
  average_order_value: number;
  rejection_rate: number;
}

export interface FinancialSummary {
  total_revenue: number;
  total_expenses: number;
  gross_profit: number;
  total_payroll: number;
  total_invoiced: number;
  total_collected: number;
  pending_invoices: number;
  pending_cod: number;
}

export interface ComplianceOverview {
  total_alerts: number;
  critical_alerts: number;
  expiring_documents: number;
  expired_documents: number;
  pending_renewals: number;
  compliance_score: number;
}

export interface FleetOverview {
  total_vehicles: number;
  active_vehicles: number;
  in_maintenance: number;
  upcoming_maintenance: number;
  total_fuel_cost: number;
  pending_violations: number;
  pending_fines_amount: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

// ============================================================================
// DASHBOARD OVERVIEW HOOKS
// ============================================================================

/**
 * Fetch main dashboard metrics
 */
export function useDashboardMetrics() {
  return useQuery<DashboardMetrics>(
    async (supabase) => {
      const today = new Date().toISOString().split('T')[0];

      // Parallel queries for efficiency
      const [
        employeesRes,
        vehiclesRes,
        ordersRes,
        shiftsRes,
        alertsRes,
        codRes,
      ] = await Promise.all([
        supabase.from('employees').select('status', { count: 'exact' }),
        supabase.from('vehicles').select('status', { count: 'exact' }).neq('status', 'retired'),
        supabase.from('orders').select('total, status').gte('created_at', today),
        supabase.from('shifts').select('id', { count: 'exact' }).eq('date', today),
        supabase.from('compliance_alerts').select('id', { count: 'exact' }).in('status', ['open', 'acknowledged']),
        supabase.from('cod_collections').select('amount').eq('status', 'pending'),
      ]);

      const activeEmployees = employeesRes.data?.filter(e => e.status === 'active').length || 0;
      const availableVehicles = vehiclesRes.data?.filter(v => v.status === 'available').length || 0;
      const totalRevenueToday = ordersRes.data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const pendingCod = codRes.data?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      return {
        data: {
          total_employees: employeesRes.count || 0,
          active_employees: activeEmployees,
          total_vehicles: vehiclesRes.count || 0,
          available_vehicles: availableVehicles,
          total_orders_today: ordersRes.data?.length || 0,
          total_revenue_today: totalRevenueToday,
          total_shifts_today: shiftsRes.count || 0,
          active_riders: activeEmployees, // Simplified
          pending_compliance_alerts: alertsRes.count || 0,
          pending_cod_remittance: pendingCod,
        },
        error: null,
      };
    },
    []
  );
}

/**
 * Fetch orders trend over time
 */
export function useOrdersTrend(days: number = 30) {
  return useQuery<TimeSeriesDataPoint[]>(
    async (supabase) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('orders')
        .select('created_at, total')
        .gte('created_at', startDate.toISOString());

      if (error) return { data: null, error };

      // Group by date
      const byDate: Record<string, number> = {};
      data?.forEach(order => {
        const date = order.created_at.split('T')[0];
        byDate[date] = (byDate[date] || 0) + 1;
      });

      // Convert to array
      const result: TimeSeriesDataPoint[] = Object.entries(byDate)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return { data: result, error: null };
    },
    [days]
  );
}

/**
 * Fetch revenue trend over time
 */
export function useRevenueTrend(days: number = 30) {
  return useQuery<TimeSeriesDataPoint[]>(
    async (supabase) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('orders')
        .select('created_at, total')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'delivered');

      if (error) return { data: null, error };

      // Group by date
      const byDate: Record<string, number> = {};
      data?.forEach(order => {
        const date = order.created_at.split('T')[0];
        byDate[date] = (byDate[date] || 0) + (order.total || 0);
      });

      // Convert to array
      const result: TimeSeriesDataPoint[] = Object.entries(byDate)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return { data: result, error: null };
    },
    [days]
  );
}

// ============================================================================
// PERFORMANCE ANALYTICS HOOKS
// ============================================================================

/**
 * Fetch top performing riders
 */
export function useTopRiders(limit: number = 10, dateFrom?: string, dateTo?: string) {
  return useQuery<RiderPerformanceMetrics[]>(
    async (supabase) => {
      let query = supabase
        .from('orders')
        .select(`
          employee_id,
          total,
          status,
          employees!inner(id, full_name)
        `)
        .eq('status', 'delivered');

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const { data, error } = await query;

      if (error) return { data: null, error };

      // Aggregate by employee
      const byEmployee: Record<string, RiderPerformanceMetrics> = {};

      data?.forEach((order: Record<string, unknown>) => {
        const empId = order.employee_id as string;
        const emp = order.employees as { id: string; full_name: string };
        
        if (!byEmployee[empId]) {
          byEmployee[empId] = {
            employee_id: empId,
            employee_name: emp?.full_name || 'Unknown',
            orders_completed: 0,
            orders_rejected: 0,
            total_earnings: 0,
            on_time_percentage: 95, // Placeholder
          };
        }
        byEmployee[empId].orders_completed++;
        byEmployee[empId].total_earnings += (order.total as number) || 0;
      });

      // Sort by orders completed and limit
      const result = Object.values(byEmployee)
        .sort((a, b) => b.orders_completed - a.orders_completed)
        .slice(0, limit);

      return { data: result, error: null };
    },
    [limit, dateFrom, dateTo]
  );
}

/**
 * Fetch rider performance details
 */
export function useRiderPerformance(employeeId: string | null, dateFrom?: string, dateTo?: string) {
  return useQuery<RiderPerformanceMetrics>(
    async (supabase) => {
      if (!employeeId) return { data: null, error: null };

      let query = supabase
        .from('orders')
        .select('total, status')
        .eq('employee_id', employeeId);

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const [ordersRes, employeeRes] = await Promise.all([
        query,
        supabase.from('employees').select('full_name').eq('id', employeeId).single(),
      ]);

      if (ordersRes.error) return { data: null, error: ordersRes.error };

      let completed = 0;
      let rejected = 0;
      let totalEarnings = 0;

      ordersRes.data?.forEach(o => {
        if (o.status === 'delivered') {
          completed++;
          totalEarnings += o.total || 0;
        } else if (o.status === 'cancelled' || o.status === 'rejected') {
          rejected++;
        }
      });

      return {
        data: {
          employee_id: employeeId,
          employee_name: employeeRes.data?.full_name || 'Unknown',
          orders_completed: completed,
          orders_rejected: rejected,
          total_earnings: totalEarnings,
          on_time_percentage: completed > 0 ? 95 : 0, // Placeholder
        },
        error: null,
      };
    },
    [employeeId, dateFrom, dateTo]
  );
}

/**
 * Fetch platform performance comparison
 */
export function usePlatformPerformance(dateFrom?: string, dateTo?: string) {
  return useQuery<PlatformPerformanceMetrics[]>(
    async (supabase) => {
      let query = supabase
        .from('orders')
        .select(`
          platform_id,
          total,
          status,
          platforms!inner(id, name)
        `);

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const { data, error } = await query;

      if (error) return { data: null, error };

      // Aggregate by platform
      const byPlatform: Record<string, {
        platform_id: string;
        platform_name: string;
        total_orders: number;
        delivered: number;
        rejected: number;
        total_revenue: number;
        riders: Set<string>;
      }> = {};

      data?.forEach((order: Record<string, unknown>) => {
        const platId = order.platform_id as string;
        const plat = order.platforms as { id: string; name: string };
        
        if (!byPlatform[platId]) {
          byPlatform[platId] = {
            platform_id: platId,
            platform_name: plat?.name || 'Unknown',
            total_orders: 0,
            delivered: 0,
            rejected: 0,
            total_revenue: 0,
            riders: new Set(),
          };
        }
        
        byPlatform[platId].total_orders++;
        if (order.status === 'delivered') {
          byPlatform[platId].delivered++;
          byPlatform[platId].total_revenue += (order.total as number) || 0;
        } else if (order.status === 'rejected' || order.status === 'cancelled') {
          byPlatform[platId].rejected++;
        }
      });

      const result: PlatformPerformanceMetrics[] = Object.values(byPlatform).map(p => ({
        platform_id: p.platform_id,
        platform_name: p.platform_name,
        total_orders: p.total_orders,
        total_revenue: p.total_revenue,
        active_riders: p.riders.size,
        average_order_value: p.delivered > 0 ? p.total_revenue / p.delivered : 0,
        rejection_rate: p.total_orders > 0 ? (p.rejected / p.total_orders) * 100 : 0,
      }));

      return { data: result, error: null };
    },
    [dateFrom, dateTo]
  );
}

// ============================================================================
// FINANCIAL ANALYTICS HOOKS
// ============================================================================

/**
 * Fetch financial summary
 */
export function useFinancialSummary(dateFrom?: string, dateTo?: string) {
  return useQuery<FinancialSummary>(
    async (supabase) => {
      const [ordersRes, payrollRes, invoicesRes, codRes] = await Promise.all([
        (async () => {
          let q = supabase.from('orders').select('total').eq('status', 'delivered');
          if (dateFrom) q = q.gte('created_at', dateFrom);
          if (dateTo) q = q.lte('created_at', dateTo);
          return q;
        })(),
        (async () => {
          let q = supabase.from('payroll_batches').select('total_net_pay').eq('status', 'completed');
          if (dateFrom) q = q.gte('period_start', dateFrom);
          if (dateTo) q = q.lte('period_end', dateTo);
          return q;
        })(),
        (async () => {
          let q = supabase.from('invoices').select('total, status, paid_at');
          if (dateFrom) q = q.gte('issued_at', dateFrom);
          if (dateTo) q = q.lte('issued_at', dateTo);
          return q;
        })(),
        supabase.from('cod_collections').select('amount, status'),
      ]);

      const totalRevenue = ordersRes.data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const totalPayroll = payrollRes.data?.reduce((sum, p) => sum + (p.total_net_pay || 0), 0) || 0;
      
      let totalInvoiced = 0;
      let totalCollected = 0;
      let pendingInvoices = 0;
      invoicesRes.data?.forEach(inv => {
        totalInvoiced += inv.total || 0;
        if (inv.status === 'paid') {
          totalCollected += inv.total || 0;
        } else if (inv.status !== 'cancelled') {
          pendingInvoices += inv.total || 0;
        }
      });

      const pendingCod = codRes.data
        ?.filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      return {
        data: {
          total_revenue: totalRevenue,
          total_expenses: totalPayroll, // Simplified
          gross_profit: totalRevenue - totalPayroll,
          total_payroll: totalPayroll,
          total_invoiced: totalInvoiced,
          total_collected: totalCollected,
          pending_invoices: pendingInvoices,
          pending_cod: pendingCod,
        },
        error: null,
      };
    },
    [dateFrom, dateTo]
  );
}

/**
 * Fetch expense breakdown
 */
export function useExpenseBreakdown(dateFrom?: string, dateTo?: string) {
  return useQuery<Record<string, number>>(
    async (supabase) => {
      let query = supabase
        .from('financial_transactions')
        .select('category, amount')
        .eq('direction', 'outflow');

      if (dateFrom) {
        query = query.gte('transaction_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('transaction_date', dateTo);
      }

      const { data, error } = await query;

      if (error) return { data: null, error };

      const breakdown: Record<string, number> = {};
      data?.forEach(tx => {
        breakdown[tx.category] = (breakdown[tx.category] || 0) + (tx.amount || 0);
      });

      return { data: breakdown, error: null };
    },
    [dateFrom, dateTo]
  );
}

// ============================================================================
// COMPLIANCE ANALYTICS HOOKS
// ============================================================================

/**
 * Fetch compliance overview
 */
export function useComplianceOverview() {
  return useQuery<ComplianceOverview>(
    async (supabase) => {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

      const [alertsRes, expiringRes, expiredRes] = await Promise.all([
        supabase
          .from('compliance_alerts')
          .select('severity, status')
          .in('status', ['open', 'acknowledged']),
        supabase
          .from('employee_documents')
          .select('id')
          .gt('expiry_date', today)
          .lte('expiry_date', thirtyDaysStr),
        supabase
          .from('employee_documents')
          .select('id')
          .lte('expiry_date', today),
      ]);

      const totalAlerts = alertsRes.data?.length || 0;
      const criticalAlerts = alertsRes.data?.filter(a => a.severity === 'critical').length || 0;

      // Calculate compliance score (simplified)
      const totalDocs = (expiringRes.data?.length || 0) + (expiredRes.data?.length || 0);
      const complianceScore = totalDocs > 0 
        ? Math.round(100 - ((expiredRes.data?.length || 0) / totalDocs) * 100)
        : 100;

      return {
        data: {
          total_alerts: totalAlerts,
          critical_alerts: criticalAlerts,
          expiring_documents: expiringRes.data?.length || 0,
          expired_documents: expiredRes.data?.length || 0,
          pending_renewals: expiringRes.data?.length || 0,
          compliance_score: complianceScore,
        },
        error: null,
      };
    },
    []
  );
}

/**
 * Fetch compliance trend
 */
export function useComplianceTrend(days: number = 30) {
  return useQuery<TimeSeriesDataPoint[]>(
    async (supabase) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('compliance_alerts')
        .select('created_at, status')
        .gte('created_at', startDate.toISOString());

      if (error) return { data: null, error };

      // Group by date (alerts created)
      const byDate: Record<string, number> = {};
      data?.forEach(alert => {
        const date = alert.created_at.split('T')[0];
        byDate[date] = (byDate[date] || 0) + 1;
      });

      const result: TimeSeriesDataPoint[] = Object.entries(byDate)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return { data: result, error: null };
    },
    [days]
  );
}

// ============================================================================
// FLEET ANALYTICS HOOKS
// ============================================================================

/**
 * Fetch fleet overview
 */
export function useFleetOverview() {
  return useQuery<FleetOverview>(
    async (supabase) => {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const [vehiclesRes, maintenanceRes, fuelRes, violationsRes] = await Promise.all([
        supabase.from('vehicles').select('status').neq('status', 'retired'),
        supabase
          .from('maintenance_records')
          .select('id')
          .in('status', ['scheduled', 'in_progress']),
        supabase
          .from('fuel_records')
          .select('total_cost')
          .gte('filled_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('traffic_violations')
          .select('fine_amount')
          .eq('status', 'pending'),
      ]);

      const total = vehiclesRes.data?.length || 0;
      const active = vehiclesRes.data?.filter(v => v.status === 'assigned' || v.status === 'available').length || 0;
      const inMaintenance = vehiclesRes.data?.filter(v => v.status === 'maintenance').length || 0;
      const totalFuelCost = fuelRes.data?.reduce((sum, f) => sum + (f.total_cost || 0), 0) || 0;
      const pendingFines = violationsRes.data?.reduce((sum, v) => sum + (v.fine_amount || 0), 0) || 0;

      return {
        data: {
          total_vehicles: total,
          active_vehicles: active,
          in_maintenance: inMaintenance,
          upcoming_maintenance: maintenanceRes.data?.length || 0,
          total_fuel_cost: totalFuelCost,
          pending_violations: violationsRes.data?.length || 0,
          pending_fines_amount: pendingFines,
        },
        error: null,
      };
    },
    []
  );
}

/**
 * Fetch fuel cost trend
 */
export function useFuelCostTrend(days: number = 30) {
  return useQuery<TimeSeriesDataPoint[]>(
    async (supabase) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('fuel_records')
        .select('filled_at, total_cost')
        .gte('filled_at', startDate.toISOString());

      if (error) return { data: null, error };

      // Group by date
      const byDate: Record<string, number> = {};
      data?.forEach(record => {
        const date = record.filled_at.split('T')[0];
        byDate[date] = (byDate[date] || 0) + (record.total_cost || 0);
      });

      const result: TimeSeriesDataPoint[] = Object.entries(byDate)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return { data: result, error: null };
    },
    [days]
  );
}

// ============================================================================
// ATTENDANCE ANALYTICS HOOKS
// ============================================================================

/**
 * Fetch attendance summary
 */
export function useAttendanceSummary(dateFrom?: string, dateTo?: string) {
  return useQuery<{
    total_records: number;
    present: number;
    absent: number;
    late: number;
    on_time: number;
    attendance_rate: number;
  }>(
    async (supabase) => {
      let query = supabase
        .from('attendance')
        .select('status, check_in_time, shift_start_time');

      if (dateFrom) {
        query = query.gte('date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('date', dateTo);
      }

      const { data, error } = await query;

      if (error) return { data: null, error };

      let present = 0;
      let absent = 0;
      let late = 0;
      let onTime = 0;

      data?.forEach(record => {
        if (record.status === 'present' || record.status === 'approved') {
          present++;
          // Check if late (simplified - compare times)
          if (record.check_in_time && record.shift_start_time) {
            if (record.check_in_time > record.shift_start_time) {
              late++;
            } else {
              onTime++;
            }
          }
        } else if (record.status === 'absent' || record.status === 'no_show') {
          absent++;
        }
      });

      const total = data?.length || 0;
      const attendanceRate = total > 0 ? (present / total) * 100 : 0;

      return {
        data: {
          total_records: total,
          present,
          absent,
          late,
          on_time: onTime,
          attendance_rate: Math.round(attendanceRate * 10) / 10,
        },
        error: null,
      };
    },
    [dateFrom, dateTo]
  );
}

/**
 * Fetch attendance trend
 */
export function useAttendanceTrend(days: number = 30) {
  return useQuery<TimeSeriesDataPoint[]>(
    async (supabase) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('attendance')
        .select('date, status')
        .gte('date', startDate.toISOString().split('T')[0]);

      if (error) return { data: null, error };

      // Group by date and calculate attendance rate
      const byDate: Record<string, { present: number; total: number }> = {};
      data?.forEach(record => {
        if (!byDate[record.date]) {
          byDate[record.date] = { present: 0, total: 0 };
        }
        byDate[record.date].total++;
        if (record.status === 'present' || record.status === 'approved') {
          byDate[record.date].present++;
        }
      });

      const result: TimeSeriesDataPoint[] = Object.entries(byDate)
        .map(([date, stats]) => ({
          date,
          value: Math.round((stats.present / stats.total) * 100),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return { data: result, error: null };
    },
    [days]
  );
}

// ============================================================================
// REPORT GENERATION HOOKS
// ============================================================================

export interface ReportParams {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  date_from: string;
  date_to: string;
  include_sections?: string[];
}

/**
 * Generate comprehensive report data
 */
export function useReportData(params: ReportParams) {
  return useQuery<{
    generated_at: string;
    period: { from: string; to: string };
    dashboard: DashboardMetrics | null;
    financial: FinancialSummary | null;
    compliance: ComplianceOverview | null;
    fleet: FleetOverview | null;
    top_riders: RiderPerformanceMetrics[];
    platform_performance: PlatformPerformanceMetrics[];
  }>(
    async (supabase) => {
      const { date_from, date_to } = params;

      // Fetch all report sections in parallel
      const [
        dashboardRes,
        financialRes,
        complianceRes,
        fleetRes,
        ridersRes,
        platformsRes,
      ] = await Promise.all([
        // Dashboard metrics - simplified
        supabase.from('employees').select('status', { count: 'exact' }),
        // Financial - orders
        supabase
          .from('orders')
          .select('total')
          .eq('status', 'delivered')
          .gte('created_at', date_from)
          .lte('created_at', date_to),
        // Compliance alerts
        supabase
          .from('compliance_alerts')
          .select('severity, status')
          .in('status', ['open', 'acknowledged']),
        // Fleet
        supabase.from('vehicles').select('status').neq('status', 'retired'),
        // Top riders
        supabase
          .from('orders')
          .select('employee_id, total, employees!inner(full_name)')
          .eq('status', 'delivered')
          .gte('created_at', date_from)
          .lte('created_at', date_to),
        // Platform performance
        supabase
          .from('orders')
          .select('platform_id, total, status, platforms!inner(name)')
          .gte('created_at', date_from)
          .lte('created_at', date_to),
      ]);

      // Process financial
      const totalRevenue = financialRes.data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

      // Process riders
      const ridersMap: Record<string, { name: string; orders: number; earnings: number }> = {};
      ridersRes.data?.forEach((o: Record<string, unknown>) => {
        const empId = o.employee_id as string;
        const emp = o.employees as { full_name: string };
        if (!ridersMap[empId]) {
          ridersMap[empId] = { name: emp?.full_name || 'Unknown', orders: 0, earnings: 0 };
        }
        ridersMap[empId].orders++;
        ridersMap[empId].earnings += (o.total as number) || 0;
      });

      const topRiders: RiderPerformanceMetrics[] = Object.entries(ridersMap)
        .map(([id, data]) => ({
          employee_id: id,
          employee_name: data.name,
          orders_completed: data.orders,
          orders_rejected: 0,
          total_earnings: data.earnings,
          on_time_percentage: 95,
        }))
        .sort((a, b) => b.orders_completed - a.orders_completed)
        .slice(0, 10);

      // Process platforms
      const platformsMap: Record<string, { name: string; orders: number; revenue: number; rejected: number }> = {};
      platformsRes.data?.forEach((o: Record<string, unknown>) => {
        const platId = o.platform_id as string;
        const plat = o.platforms as { name: string };
        if (!platformsMap[platId]) {
          platformsMap[platId] = { name: plat?.name || 'Unknown', orders: 0, revenue: 0, rejected: 0 };
        }
        platformsMap[platId].orders++;
        if (o.status === 'delivered') {
          platformsMap[platId].revenue += (o.total as number) || 0;
        } else if (o.status === 'rejected' || o.status === 'cancelled') {
          platformsMap[platId].rejected++;
        }
      });

      const platformPerformance: PlatformPerformanceMetrics[] = Object.entries(platformsMap)
        .map(([id, data]) => ({
          platform_id: id,
          platform_name: data.name,
          total_orders: data.orders,
          total_revenue: data.revenue,
          active_riders: 0,
          average_order_value: data.orders > 0 ? data.revenue / data.orders : 0,
          rejection_rate: data.orders > 0 ? (data.rejected / data.orders) * 100 : 0,
        }));

      return {
        data: {
          generated_at: new Date().toISOString(),
          period: { from: date_from, to: date_to },
          dashboard: {
            total_employees: dashboardRes.count || 0,
            active_employees: dashboardRes.data?.filter(e => e.status === 'active').length || 0,
            total_vehicles: fleetRes.data?.length || 0,
            available_vehicles: fleetRes.data?.filter(v => v.status === 'available').length || 0,
            total_orders_today: 0,
            total_revenue_today: 0,
            total_shifts_today: 0,
            active_riders: 0,
            pending_compliance_alerts: complianceRes.data?.length || 0,
            pending_cod_remittance: 0,
          },
          financial: {
            total_revenue: totalRevenue,
            total_expenses: 0,
            gross_profit: totalRevenue,
            total_payroll: 0,
            total_invoiced: 0,
            total_collected: 0,
            pending_invoices: 0,
            pending_cod: 0,
          },
          compliance: {
            total_alerts: complianceRes.data?.length || 0,
            critical_alerts: complianceRes.data?.filter(a => a.severity === 'critical').length || 0,
            expiring_documents: 0,
            expired_documents: 0,
            pending_renewals: 0,
            compliance_score: 100,
          },
          fleet: {
            total_vehicles: fleetRes.data?.length || 0,
            active_vehicles: fleetRes.data?.filter(v => v.status !== 'maintenance').length || 0,
            in_maintenance: fleetRes.data?.filter(v => v.status === 'maintenance').length || 0,
            upcoming_maintenance: 0,
            total_fuel_cost: 0,
            pending_violations: 0,
            pending_fines_amount: 0,
          },
          top_riders: topRiders,
          platform_performance: platformPerformance,
        },
        error: null,
      };
    },
    [params.date_from, params.date_to, params.type]
  );
}
