# Data Access Layer

This document describes the React hooks for data fetching and mutations.

## Overview

All data access is done through custom React hooks located in `src/features/*/queries.ts`. These hooks:

- Use Supabase as the data layer
- Provide automatic caching and revalidation
- Handle loading and error states
- Support filtering, pagination, and sorting

## Core Utilities

Located in `src/lib/supabase/hooks.ts`:

```typescript
// Generic query hook with caching
useQuery<T>(queryFn, dependencies)

// Generic mutation hook
useMutation<T, V>(mutationFn)

// Pagination helpers
applyPagination(query, params)
applySort(query, params)
```

## Feature Modules

### Analytics (`src/features/analytics/queries.ts`)

Dashboard and reporting hooks.

| Hook | Description | Returns |
|------|-------------|---------|
| `useDashboardMetrics()` | Main dashboard KPIs | `DashboardMetrics` |
| `useOrdersTrend(days)` | Order volume over time | `TimeSeriesDataPoint[]` |
| `useRevenueTrend(days)` | Revenue over time | `TimeSeriesDataPoint[]` |
| `useTopRiders(limit, dateFrom?, dateTo?)` | Top performing riders | `RiderPerformanceMetrics[]` |
| `useRiderPerformance(employeeId)` | Individual rider stats | `RiderPerformanceMetrics` |
| `usePlatformPerformance(dateFrom?, dateTo?)` | Platform comparison | `PlatformPerformanceMetrics[]` |
| `useFinancialSummary(dateFrom?, dateTo?)` | Financial overview | `FinancialSummary` |
| `useExpenseBreakdown(dateFrom?, dateTo?)` | Expense categories | `Record<string, number>` |
| `useComplianceOverview()` | Compliance status | `ComplianceOverview` |
| `useFleetOverview()` | Fleet status | `FleetOverview` |

### Employees (`src/features/employees/queries.ts`)

Employee management hooks.

| Hook | Description | Returns |
|------|-------------|---------|
| `useEmployees(filters?, pagination?, sort?)` | Paginated list | `PaginatedResult<Employee>` |
| `useEmployee(id)` | Single employee | `Employee` |
| `useEmployeeOptions(filters?)` | For dropdowns | `{id, full_name}[]` |
| `useRiders(filters?, pagination?)` | Only riders | `PaginatedResult<Employee>` |
| `useCreateEmployee()` | Create mutation | `Mutation<Employee>` |
| `useUpdateEmployee(id)` | Update mutation | `Mutation<Employee>` |
| `useDeleteEmployee(id)` | Delete mutation | `Mutation<void>` |

**Filter Options:**
```typescript
interface EmployeeFilters {
  status?: 'pending' | 'active' | 'past';
  role?: 'rider' | 'supervisor' | 'manager' | 'hr';
  rider_category?: 'company_vehicle_rider' | 'own_vehicle_rider';
  department_id?: string;
  search?: string;
}
```

### Orders (`src/features/orders/queries.ts`)

Order management hooks.

| Hook | Description | Returns |
|------|-------------|---------|
| `useOrders(filters?, pagination?)` | Paginated list | `PaginatedResult<Order>` |
| `useOrder(id)` | Single order | `Order` |
| `useOrderStats(dateFrom, dateTo)` | Order statistics | `OrderStats` |
| `useUnreconciledOrders(platformId?)` | Unreconciled | `Order[]` |
| `useTodaysOrders()` | Today's orders | `Order[]` |
| `useOrderExceptions()` | Problem orders | `OrderException[]` |

**Filter Options:**
```typescript
interface OrderFilters {
  platform_id?: string;
  employee_id?: string;
  status?: 'pending' | 'completed' | 'cancelled' | 'returned' | 'disputed';
  date?: string;
  date_from?: string;
  date_to?: string;
  reconciliation_status?: string;
  payroll_processed?: boolean;
  invoice_processed?: boolean;
  search?: string;
}
```

### Fleet (`src/features/fleet/queries.ts`)

Vehicle/asset management hooks.

| Hook | Description | Returns |
|------|-------------|---------|
| `useVehicles(filters?, pagination?)` | Paginated list | `PaginatedResult<Vehicle>` |
| `useVehicle(id)` | Single vehicle | `Vehicle` |
| `useVehicleOptions()` | For dropdowns | `{id, license_plate}[]` |
| `useAvailableVehicles()` | Unassigned | `Vehicle[]` |
| `useMaintenanceHistory(vehicleId)` | Maintenance log | `MaintenanceEvent[]` |
| `useVehicleDocuments(vehicleId)` | Documents | `VehicleDocument[]` |
| `useCreateVehicle()` | Create mutation | `Mutation<Vehicle>` |
| `useUpdateVehicle(id)` | Update mutation | `Mutation<Vehicle>` |

### Shifts (`src/features/shifts/queries.ts`)

Shift scheduling hooks.

| Hook | Description | Returns |
|------|-------------|---------|
| `useShifts(filters?, pagination?)` | Paginated list | `PaginatedResult<Shift>` |
| `useShift(id)` | Single shift | `Shift` |
| `useShiftsByDate(date)` | Shifts for date | `Shift[]` |
| `useShiftAssignments(shiftId)` | Assigned riders | `ShiftAssignment[]` |
| `useEmployeeShifts(employeeId, dateFrom?, dateTo?)` | Employee's shifts | `Shift[]` |
| `useCreateShift()` | Create mutation | `Mutation<Shift>` |
| `useAssignToShift()` | Assign rider | `Mutation<ShiftAssignment>` |

### Attendance (`src/features/attendance/queries.ts`)

Attendance tracking hooks.

| Hook | Description | Returns |
|------|-------------|---------|
| `useAttendanceRecords(filters?, pagination?)` | Paginated list | `PaginatedResult<Attendance>` |
| `useTodaysAttendance()` | Today's records | `Attendance[]` |
| `useEmployeeAttendance(employeeId, dateFrom?, dateTo?)` | Employee history | `Attendance[]` |
| `useClockIn()` | Clock in mutation | `Mutation<Attendance>` |
| `useClockOut(attendanceId)` | Clock out mutation | `Mutation<Attendance>` |

### Platforms (`src/features/platforms/queries.ts`)

Platform/client management hooks.

| Hook | Description | Returns |
|------|-------------|---------|
| `usePlatforms(filters?)` | List all | `Platform[]` |
| `usePlatform(id)` | Single platform | `Platform` |
| `usePlatformOptions()` | For dropdowns | `{id, name}[]` |
| `usePlatformRateCards(platformId)` | Rate cards | `RateCard[]` |
| `usePlatformAssignments(platformId)` | Assigned riders | `PlatformAssignment[]` |
| `useRiderPlatforms(employeeId)` | Rider's platforms | `Platform[]` |

### Invoicing (`src/features/invoicing/queries.ts`)

Invoice management hooks.

| Hook | Description | Returns |
|------|-------------|---------|
| `useInvoices(filters?, pagination?)` | Paginated list | `PaginatedResult<Invoice>` |
| `useInvoice(id)` | Single invoice | `Invoice` |
| `useInvoiceLineItems(invoiceId)` | Line items | `InvoiceLineItem[]` |
| `usePendingInvoices()` | Unpaid invoices | `Invoice[]` |
| `useCreateInvoice()` | Create mutation | `Mutation<Invoice>` |
| `useMarkInvoicePaid(id)` | Mark paid | `Mutation<Invoice>` |

### Payroll (`src/features/payroll/queries.ts`)

Payroll management hooks.

| Hook | Description | Returns |
|------|-------------|---------|
| `usePayrollBatches(filters?, pagination?)` | Batch list | `PaginatedResult<PayrollBatch>` |
| `usePayrollBatch(id)` | Single batch | `PayrollBatch` |
| `usePayrollItems(batchId)` | Batch line items | `PayrollItem[]` |
| `useEmployeePayrollHistory(employeeId)` | Employee history | `PayrollItem[]` |
| `useEmployeeAdvances(employeeId)` | Employee advances | `EmployeeAdvance[]` |

### Compliance (`src/features/compliance/queries.ts`)

Compliance and document hooks.

| Hook | Description | Returns |
|------|-------------|---------|
| `useComplianceAlerts(filters?)` | Alert list | `ComplianceAlert[]` |
| `useActiveComplianceAlerts()` | Active alerts | `ComplianceAlert[]` |
| `useExpiringSoonAlerts()` | Expiring in 30 days | `ComplianceAlert[]` |
| `useEmployeeComplianceAlerts(employeeId)` | Employee alerts | `ComplianceAlert[]` |
| `useComplianceSummary()` | Summary counts | `ComplianceSummary` |
| `useAcknowledgeAlert(id)` | Acknowledge mutation | `Mutation<void>` |
| `useResolveAlert(id)` | Resolve mutation | `Mutation<void>` |

### Documents (`src/features/documents/queries.ts`)

Document management hooks.

| Hook | Description | Returns |
|------|-------------|---------|
| `useEmployeeDocuments(employeeId)` | Employee docs | `EmployeeDocument[]` |
| `useDocumentTypes()` | Available types | `DocumentType[]` |
| `useExpiringDocuments(days?)` | Expiring soon | `EmployeeDocument[]` |
| `useUploadDocument()` | Upload mutation | `Mutation<EmployeeDocument>` |
| `useVerifyDocument(id)` | Verify mutation | `Mutation<void>` |

### Finance (`src/features/finance/queries.ts`)

General finance hooks.

| Hook | Description | Returns |
|------|-------------|---------|
| `usePettyCashTransactions(filters?, pagination?)` | Transactions | `PaginatedResult<PettyCashTransaction>` |
| `usePettyCashBalance()` | Current balance | `number` |
| `useCODCollections(filters?, pagination?)` | COD list | `PaginatedResult<CODCollection>` |
| `usePendingCOD()` | Unremitted COD | `CODCollection[]` |
| `useTrafficViolations(filters?)` | Violations | `TrafficViolation[]` |

### Onboarding (`src/features/onboarding/queries.ts`)

Rider onboarding hooks.

| Hook | Description | Returns |
|------|-------------|---------|
| `useOnboardingChecklists(filters?)` | Checklists | `OnboardingChecklist[]` |
| `useOnboardingChecklist(id)` | Single checklist | `OnboardingChecklist` |
| `useEmployeeOnboarding(employeeId)` | Employee's checklist | `OnboardingChecklist` |
| `useOnboardingTemplates()` | Templates | `OnboardingTemplate[]` |

## Usage Examples

### Basic Query

```tsx
import { useEmployees } from '@/features/employees/queries';

function EmployeeList() {
  const { data, isLoading, error, refetch } = useEmployees();

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <ul>
      {data?.data.map(emp => (
        <li key={emp.id}>{emp.full_name}</li>
      ))}
    </ul>
  );
}
```

### With Filters

```tsx
import { useOrders, type OrderFilters } from '@/features/orders/queries';

function OrderList() {
  const [filters, setFilters] = useState<OrderFilters>({
    status: 'completed',
    date_from: '2026-04-01',
  });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useOrders(filters, { page, pageSize: 20 });

  // ... render with pagination
}
```

### Mutation

```tsx
import { useCreateEmployee } from '@/features/employees/queries';

function NewEmployeeForm() {
  const createEmployee = useCreateEmployee();

  const handleSubmit = async (data: CreateEmployeeInput) => {
    try {
      await createEmployee.mutateAsync(data);
      toast.success('Employee created');
    } catch (error) {
      toast.error('Failed to create employee');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... form fields */}
      <Button loading={createEmployee.isLoading}>Create</Button>
    </form>
  );
}
```

### Dashboard Metrics

```tsx
import { useDashboardMetrics, useComplianceOverview } from '@/features/analytics/queries';

function Dashboard() {
  const { data: metrics } = useDashboardMetrics();
  const { data: compliance } = useComplianceOverview();

  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard title="Orders Today" value={metrics?.total_orders_today} />
      <MetricCard title="Active Riders" value={metrics?.active_employees} />
      <MetricCard title="Compliance Score" value={`${compliance?.compliance_score}%`} />
    </div>
  );
}
```

## Best Practices

1. **Use hooks at the component level** — don't call hooks conditionally
2. **Leverage caching** — hooks cache data and revalidate on mount
3. **Handle loading states** — always show loading indicators
4. **Handle errors gracefully** — provide retry functionality
5. **Use filters** — reduce data transfer by filtering server-side
6. **Paginate large lists** — use pagination for tables
7. **Prefetch common data** — use `useEffect` to warm caches
