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
  Shift, 
  ShiftStatus,
  SHIFT_STATUS_LABELS,
  calculateShiftHours,
} from '@/features/shifts/types';

interface EmployeeOption {
  id: string;
  full_name: string;
  employee_id: string;
}

interface ClientOption {
  id: string;
  name: string;
}

interface ShiftFormProps {
  shift?: Shift;
  isEditing?: boolean;
}

export function ShiftForm({ shift, isEditing = false }: ShiftFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [employeeId, setEmployeeId] = useState(shift?.employee_id || '');
  const [clientId, setClientId] = useState(shift?.client_id || '');
  const [shiftDate, setShiftDate] = useState(shift?.shift_date || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(shift?.start_time || '09:00');
  const [endTime, setEndTime] = useState(shift?.end_time || '17:00');
  const [breakMinutes, setBreakMinutes] = useState(shift?.break_minutes?.toString() || '0');
  const [status, setStatus] = useState<ShiftStatus>(shift?.status || 'scheduled');
  const [notes, setNotes] = useState(shift?.notes || '');

  // Calculate duration
  const duration = calculateShiftHours(startTime, endTime, parseInt(breakMinutes) || 0);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoadingData(true);
      const supabase = createClient();
      
      const [employeesRes, clientsRes] = await Promise.all([
        supabase
          .from('employees')
          .select('id, full_name, employee_id')
          .eq('status', 'active')
          .order('full_name'),
        supabase
          .from('clients')
          .select('id, name')
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('name'),
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (clientsRes.error) throw clientsRes.error;
      
      setEmployees(employeesRes.data || []);
      setClients(clientsRes.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoadingData(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!employeeId || !shiftDate || !startTime || !endTime) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const data = {
        employee_id: employeeId,
        client_id: clientId || null,
        shift_date: shiftDate,
        start_time: startTime,
        end_time: endTime,
        break_minutes: parseInt(breakMinutes) || 0,
        status,
        notes: notes || null,
      };

      if (isEditing && shift) {
        const { error } = await supabase
          .from('shifts')
          .update(data)
          .eq('id', shift.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shifts')
          .insert([data]);

        if (error) throw error;
      }

      router.push('/dashboard/shifts');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save shift');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Employee & Client */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-base">Assignment</CardTitle>
              <p className="text-sm text-muted">Employee and client assignment</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Employee */}
            <div className="space-y-2">
              <Label htmlFor="employee" required>Employee</Label>
              {loadingData ? (
                <div className="flex items-center gap-2 py-2">
                  <Spinner size="sm" />
                  <span className="text-sm text-muted">Loading...</span>
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

            {/* Client */}
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              {loadingData ? (
                <div className="flex items-center gap-2 py-2">
                  <Spinner size="sm" />
                  <span className="text-sm text-muted">Loading...</span>
                </div>
              ) : (
                <select
                  id="client"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">No specific client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-base">Schedule</CardTitle>
              <p className="text-sm text-muted">Date and time for this shift</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-4">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="shiftDate" required>Date</Label>
              <Input
                id="shiftDate"
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                required
              />
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <Label htmlFor="startTime" required>Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label htmlFor="endTime" required>End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>

            {/* Break */}
            <div className="space-y-2">
              <Label htmlFor="breakMinutes">Break (minutes)</Label>
              <Input
                id="breakMinutes"
                type="number"
                min="0"
                step="5"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(e.target.value)}
              />
            </div>

            {/* Duration Display */}
            <div className="md:col-span-4">
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                <p className="text-sm text-blue-800">
                  Total shift duration: <span className="font-semibold">{duration.toFixed(1)} hours</span>
                  {parseInt(breakMinutes) > 0 && (
                    <span className="text-blue-600 ml-1">
                      (after {breakMinutes} minute break)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      {isEditing && (
        <Card className="mb-6">
          <CardHeader className="border-b border-border bg-background-subtle">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-base">Status</CardTitle>
                <p className="text-sm text-muted">Current shift status</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ShiftStatus)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Object.entries(SHIFT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-base">Notes</CardTitle>
              <p className="text-sm text-muted">Additional information about this shift</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes about this shift..."
            rows={3}
            className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-heading placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/shifts')}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              {isEditing ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            isEditing ? 'Save Changes' : 'Create Shift'
          )}
        </Button>
      </div>
    </form>
  );
}
