import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { EmployeeStatusBadge } from './EmployeeStatusBadge';
import { EmployeeRoleBadge } from './EmployeeRoleBadge';
import type { Employee } from '../types';

interface EmployeeCardProps {
  employee: Employee;
  onClick?: () => void;
  className?: string;
}

/**
 * Card displaying employee summary.
 * 
 * @example
 * <EmployeeCard employee={employee} onClick={() => openDetails(employee.id)} />
 */
export function EmployeeCard({ employee, onClick, className = '' }: EmployeeCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-shadow hover:shadow-md ${className}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">{employee.full_name}</CardTitle>
          <EmployeeRoleBadge role={employee.role} className="mt-1" />
        </div>
        <EmployeeStatusBadge status={employee.status} />
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-sm text-muted">
          {employee.email && <p>{employee.email}</p>}
          {employee.phone && <p>{employee.phone}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
