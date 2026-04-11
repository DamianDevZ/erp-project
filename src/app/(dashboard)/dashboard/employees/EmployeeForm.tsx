'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter,
  Button,
  Input,
  Label,
} from '@/components/ui';
import type { Employee, EmployeeRole, EmployeeStatus, CreateEmployeeInput } from '@/features/employees';

interface EmployeeFormProps {
  /** Existing employee for editing, or undefined for create */
  employee?: Employee;
}

/**
 * Form for creating or editing an employee.
 * 
 * @example
 * // Create mode
 * <EmployeeForm />
 * 
 * @example
 * // Edit mode
 * <EmployeeForm employee={existingEmployee} />
 */
export function EmployeeForm({ employee }: EmployeeFormProps) {
  const router = useRouter();
  const isEdit = !!employee;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState(employee?.full_name || '');
  const [email, setEmail] = useState(employee?.email || '');
  const [phone, setPhone] = useState(employee?.phone || '');
  const [role, setRole] = useState<EmployeeRole>(employee?.role || 'rider');
  const [status, setStatus] = useState<EmployeeStatus>(employee?.status || 'pending');
  const [hireDate, setHireDate] = useState(employee?.hire_date || '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const data = {
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        role,
        status,
        hire_date: hireDate || null,
      };

      if (isEdit) {
        // Update existing employee
        const { error } = await supabase
          .from('employees')
          .update(data)
          .eq('id', employee.id);

        if (error) throw error;
      } else {
        // Create new employee
        const { error } = await supabase
          .from('employees')
          .insert(data);

        if (error) throw error;
      }

      router.push('/dashboard/employees');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Employee' : 'Employee Details'}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" required>Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role" required>Role</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as EmployeeRole)}
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="rider">Rider</option>
              <option value="supervisor">Supervisor</option>
              <option value="manager">Manager</option>
              <option value="hr">HR</option>
            </select>
          </div>

          {/* Status (only show in edit mode) */}
          {isEdit && (
            <div className="space-y-2">
              <Label htmlFor="status" required>Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="past">Past</option>
              </select>
            </div>
          )}

          {/* Hire Date */}
          <div className="space-y-2">
            <Label htmlFor="hireDate">Hire Date</Label>
            <Input
              id="hireDate"
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
            />
          </div>
        </CardContent>

        <CardFooter className="justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Employee'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
