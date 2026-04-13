'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Spinner,
} from '@/components/ui';
import { 
  Leave, 
  LeaveType, 
  LeaveStatus,
  LEAVE_TYPE_LABELS 
} from '@/features/leaves/types';

interface EmployeeOption {
  id: string;
  full_name: string;
  employee_id: string;
}

interface LeaveFormProps {
  leave?: Leave;
  isEditing?: boolean;
}

export function LeaveForm({ leave, isEditing = false }: LeaveFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // Form state
  const [employeeId, setEmployeeId] = useState(leave?.employee_id || '');
  const [leaveType, setLeaveType] = useState<LeaveType>(leave?.leave_type || 'annual');
  const [startDate, setStartDate] = useState(leave?.start_date || '');
  const [endDate, setEndDate] = useState(leave?.end_date || '');
  const [reason, setReason] = useState(leave?.reason || '');
  const [status, setStatus] = useState<LeaveStatus>(leave?.status || 'pending');

  // Calculate days count
  const daysCount = startDate && endDate 
    ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      setLoadingEmployees(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, employee_id')
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!employeeId || !startDate || !endDate) {
      alert('Please fill in all required fields');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      alert('End date must be after start date');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const data = {
        employee_id: employeeId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days_count: daysCount,
        reason: reason || null,
        status,
      };

      if (isEditing && leave) {
        const { error } = await supabase
          .from('leaves')
          .update(data)
          .eq('id', leave.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('leaves')
          .insert([data]);

        if (error) throw error;
      }

      router.push('/dashboard/leaves');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save leave request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Employee Selection */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-base">Employee</CardTitle>
              <p className="text-sm text-muted">Select the employee requesting leave</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="employee" required>Employee</Label>
            {loadingEmployees ? (
              <div className="flex items-center gap-2 py-2">
                <Spinner size="sm" />
                <span className="text-sm text-muted">Loading employees...</span>
              </div>
            ) : (
              <select
                id="employee"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select an employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_id})
                  </option>
                ))}
              </select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leave Details */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-base">Leave Details</CardTitle>
              <p className="text-sm text-muted">Type and duration of leave</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Leave Type */}
            <div className="space-y-2">
              <Label htmlFor="leaveType" required>Leave Type</Label>
              <select
                id="leaveType"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                required
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Status (for editing) */}
            {isEditing && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LeaveStatus)}
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate" required>Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="endDate" required>End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                required
              />
            </div>

            {/* Days Count (calculated) */}
            {daysCount > 0 && (
              <div className="md:col-span-2">
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">{daysCount} day{daysCount !== 1 ? 's' : ''}</span> of leave requested
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reason */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-base">Reason</CardTitle>
              <p className="text-sm text-muted">Additional details about the leave request</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for leave request (optional)..."
            rows={4}
            className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-heading placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/leaves')}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              {isEditing ? 'Saving...' : 'Submitting...'}
            </>
          ) : (
            isEditing ? 'Save Changes' : 'Submit Leave Request'
          )}
        </Button>
      </div>
    </form>
  );
}
