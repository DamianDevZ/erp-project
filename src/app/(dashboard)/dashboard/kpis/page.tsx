import { createClient } from '@/lib/supabase/server';
import { KPIDashboard } from './KPIDashboard';

// Icons
function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

/**
 * Operations KPI Dashboard - A "mini Power BI" for key metrics
 */
export default async function KPIsPage() {
  const supabase = await createClient();

  // Fetch all KPI data in parallel
  const [
    employeesResult,
    assetsResult,
    invoicesResult,
    trainingsResult,
    coachingsResult,
    performanceResult,
    platformAssignmentsResult,
    leavesResult,
  ] = await Promise.all([
    // Employees data
    supabase.from('employees').select('id, status, role, hire_date, created_at'),
    // Assets data
    supabase.from('assets').select('id, status, type'),
    // Invoices data
    supabase.from('invoices').select('id, status, grand_total, created_at'),
    // Training data
    supabase.from('employee_trainings').select('id, status, completed_at'),
    // Coaching data
    supabase.from('coachings').select('id, type, status, created_at'),
    // Performance data
    supabase.from('performance_discipline').select('id, type, status, severity, created_at'),
    // Platform assignments
    supabase.from('platform_assignments').select('id, status, platform_id, employee_id'),
    // Leaves
    supabase.from('leaves').select('id, status, type'),
  ]);

  // Process data for KPIs
  const employees = employeesResult.data || [];
  const assets = assetsResult.data || [];
  const invoices = invoicesResult.data || [];
  const trainings = trainingsResult.data || [];
  const coachings = coachingsResult.data || [];
  const performance = performanceResult.data || [];
  const platformAssignments = platformAssignmentsResult.data || [];
  const leaves = leavesResult.data || [];

  // Calculate workforce metrics
  const workforceKPIs = {
    totalEmployees: employees.length,
    activeEmployees: employees.filter(e => e.status === 'active').length,
    pendingEmployees: employees.filter(e => e.status === 'pending').length,
    pastEmployees: employees.filter(e => e.status === 'past').length,
    byRole: {
      rider: employees.filter(e => e.role === 'rider').length,
      supervisor: employees.filter(e => e.role === 'supervisor').length,
      manager: employees.filter(e => e.role === 'manager').length,
      hr: employees.filter(e => e.role === 'hr').length,
    },
    recentHires: employees.filter(e => {
      if (!e.hire_date) return false;
      const hireDate = new Date(e.hire_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return hireDate >= thirtyDaysAgo;
    }).length,
  };

  // Calculate asset metrics
  const assetKPIs = {
    totalAssets: assets.length,
    available: assets.filter(a => a.status === 'available').length,
    assigned: assets.filter(a => a.status === 'assigned').length,
    maintenance: assets.filter(a => a.status === 'maintenance').length,
    retired: assets.filter(a => a.status === 'retired').length,
    utilizationRate: assets.length > 0 
      ? Math.round((assets.filter(a => a.status === 'assigned').length / assets.filter(a => ['available', 'assigned'].includes(a.status)).length) * 100) || 0
      : 0,
  };

  // Calculate financial metrics
  const financialKPIs = {
    totalInvoices: invoices.length,
    totalRevenue: invoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0),
    paidInvoices: invoices.filter(i => i.status === 'paid').length,
    pendingInvoices: invoices.filter(i => ['draft', 'sent', 'overdue'].includes(i.status)).length,
    paidAmount: invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + (inv.grand_total || 0), 0),
    pendingAmount: invoices.filter(i => ['draft', 'sent', 'overdue'].includes(i.status)).reduce((sum, inv) => sum + (inv.grand_total || 0), 0),
  };

  // Calculate training metrics
  const trainingKPIs = {
    totalAssignments: trainings.length,
    completed: trainings.filter(t => t.status === 'completed').length,
    inProgress: trainings.filter(t => t.status === 'in_progress').length,
    notStarted: trainings.filter(t => t.status === 'not_started').length,
    completionRate: trainings.length > 0 
      ? Math.round((trainings.filter(t => t.status === 'completed').length / trainings.length) * 100)
      : 0,
  };

  // Calculate coaching metrics
  const coachingKPIs = {
    total: coachings.length,
    completed: coachings.filter(c => c.status === 'completed').length,
    pending: coachings.filter(c => c.status === 'pending' || c.status === 'scheduled').length,
    byType: {
      performance: coachings.filter(c => c.type === 'performance').length,
      behavior: coachings.filter(c => c.type === 'behavior').length,
      development: coachings.filter(c => c.type === 'development').length,
      recognition: coachings.filter(c => c.type === 'recognition').length,
    },
  };

  // Calculate performance/discipline metrics
  const performanceKPIs = {
    total: performance.length,
    open: performance.filter(p => p.status === 'open').length,
    resolved: performance.filter(p => ['resolved', 'closed'].includes(p.status)).length,
    warnings: performance.filter(p => ['verbal_warning', 'written_warning', 'final_warning'].includes(p.type)).length,
    commendations: performance.filter(p => p.type === 'commendation').length,
    critical: performance.filter(p => p.severity === 'critical' || p.severity === 'high').length,
  };

  // Calculate operations metrics
  const operationsKPIs = {
    platformAssignments: platformAssignments.length,
    activeAssignments: platformAssignments.filter(pa => pa.status === 'active').length,
    pendingLeaves: leaves.filter(l => l.status === 'pending').length,
    approvedLeaves: leaves.filter(l => l.status === 'approved').length,
  };

  const kpiData = {
    workforce: workforceKPIs,
    assets: assetKPIs,
    financial: financialKPIs,
    training: trainingKPIs,
    coaching: coachingKPIs,
    performance: performanceKPIs,
    operations: operationsKPIs,
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <ChartBarIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-heading">Operations KPIs</h1>
          <p className="text-sm text-muted">Real-time metrics and performance indicators</p>
        </div>
      </div>

      {/* KPI Dashboard Component */}
      <KPIDashboard data={kpiData} />
    </div>
  );
}
