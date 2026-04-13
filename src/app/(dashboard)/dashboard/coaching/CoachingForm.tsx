'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Label,
  Spinner,
  Badge,
} from '@/components/ui';
import type { 
  Coaching, 
  CoachingType, 
  CoachingStatus, 
  CoachingOutcome,
} from '@/features/coaching';

interface EmployeeOption {
  id: string;
  full_name: string;
  employee_id: string | null;
}

interface CoachingFormProps {
  coaching?: Coaching;
  preselectedEmployeeId?: string;
}

// Icons
function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// Type/Status/Outcome labels
const TYPE_LABELS: Record<CoachingType, string> = {
  corrective: 'Corrective Action',
  goal_setting: 'Goal Setting',
  performance_review: 'Performance Review',
  one_on_one: '1-on-1 Meeting',
  training: 'Training',
  other: 'Other',
};

const STATUS_LABELS: Record<CoachingStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  completed: 'Completed',
  acknowledged: 'Acknowledged',
};

const OUTCOME_LABELS: Record<CoachingOutcome, string> = {
  exceeded: 'Exceeded Expectations',
  met: 'Met Expectations',
  needs_improvement: 'Needs Improvement',
  unacceptable: 'Unacceptable',
  pending: 'Pending Evaluation',
};

/**
 * Enhanced form for creating or editing a coaching session.
 * Supports multiple coaching types, manager/employee notes, acknowledgment, and outcomes.
 */
export function CoachingForm({ coaching, preselectedEmployeeId }: CoachingFormProps) {
  const router = useRouter();
  const isEdit = !!coaching;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // Form state
  const [employeeId, setEmployeeId] = useState(coaching?.employee_id || preselectedEmployeeId || '');
  const [coachingType, setCoachingType] = useState<CoachingType>(coaching?.coaching_type || 'one_on_one');
  const [coachingDate, setCoachingDate] = useState(
    coaching?.coaching_date
      ? new Date(coaching.coaching_date).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [status, setStatus] = useState<CoachingStatus>(coaching?.status || 'draft');
  const [managerNotes, setManagerNotes] = useState(coaching?.manager_notes || coaching?.notes || '');
  const [employeeNotes, setEmployeeNotes] = useState(coaching?.employee_notes || '');
  const [outcome, setOutcome] = useState<CoachingOutcome>(coaching?.outcome || 'pending');
  const [outcomeNotes, setOutcomeNotes] = useState(coaching?.outcome_notes || '');
  const [followUpDate, setFollowUpDate] = useState(
    coaching?.follow_up_date 
      ? new Date(coaching.follow_up_date).toISOString().slice(0, 10)
      : ''
  );

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, employee_id')
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const data = {
        employee_id: employeeId,
        coaching_type: coachingType,
        coaching_date: coachingDate,
        status,
        manager_notes: managerNotes || null,
        employee_notes: employeeNotes || null,
        notes: managerNotes || null, // Keep legacy field in sync
        outcome,
        outcome_notes: outcomeNotes || null,
        follow_up_date: followUpDate || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('coachings')
          .update(data)
          .eq('id', coaching.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('coachings')
          .insert(data);

        if (error) throw error;
      }

      router.push('/dashboard/coaching');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save coaching session');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl">
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Session Details */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <UserIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Session Details</CardTitle>
              <p className="text-sm text-muted">Basic information about the coaching session</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Employee */}
            <div className="space-y-2">
              <Label htmlFor="employeeId" required>Employee</Label>
              {loadingEmployees ? (
                <div className="flex items-center gap-2 py-2">
                  <Spinner size="sm" />
                  <span className="text-sm text-muted">Loading employees...</span>
                </div>
              ) : (
                <select
                  id="employeeId"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="">Select employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} {emp.employee_id ? `(${emp.employee_id})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Coaching Type */}
            <div className="space-y-2">
              <Label htmlFor="coachingType" required>Coaching Type</Label>
              <select
                id="coachingType"
                value={coachingType}
                onChange={(e) => setCoachingType(e.target.value as CoachingType)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                required
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Date & Time */}
            <div className="space-y-2">
              <Label htmlFor="coachingDate" required>Date & Time</Label>
              <Input
                id="coachingDate"
                type="datetime-local"
                value={coachingDate}
                onChange={(e) => setCoachingDate(e.target.value)}
                required
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as CoachingStatus)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Follow-up Date */}
            <div className="space-y-2">
              <Label htmlFor="followUpDate">Follow-up Date</Label>
              <Input
                id="followUpDate"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
              <p className="text-xs text-muted">Optional reminder for follow-up session</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <ClipboardIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Session Notes</CardTitle>
              <p className="text-sm text-muted">Record observations, feedback, and employee responses</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Manager Notes */}
          <div className="space-y-2">
            <Label htmlFor="managerNotes">Manager Notes</Label>
            <textarea
              id="managerNotes"
              value={managerNotes}
              onChange={(e) => setManagerNotes(e.target.value)}
              placeholder="Enter your observations, feedback, areas discussed, and action items..."
              rows={6}
              className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-heading placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <p className="text-xs text-muted">Your observations and feedback from the session</p>
          </div>

          {/* Employee Notes */}
          <div className="space-y-2">
            <Label htmlFor="employeeNotes">Employee Notes / Response</Label>
            <textarea
              id="employeeNotes"
              value={employeeNotes}
              onChange={(e) => setEmployeeNotes(e.target.value)}
              placeholder="Record the employee's comments, concerns, or feedback..."
              rows={4}
              className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-heading placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <p className="text-xs text-muted">Employee's input and response to the coaching</p>
          </div>
        </CardContent>
      </Card>

      {/* Outcome & Evaluation */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <ChartIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-base">Outcome & Evaluation</CardTitle>
              <p className="text-sm text-muted">Manager's assessment of the employee's performance or progress</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Outcome */}
            <div className="space-y-2">
              <Label htmlFor="outcome">Evaluation Outcome</Label>
              <select
                id="outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as CoachingOutcome)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Outcome Notes */}
          <div className="space-y-2 mt-6">
            <Label htmlFor="outcomeNotes">Outcome Notes</Label>
            <textarea
              id="outcomeNotes"
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              placeholder="Explain the rationale for the evaluation outcome..."
              rows={3}
              className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-heading placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Acknowledgment Status (Edit only) */}
      {isEdit && (
        <Card className="mb-6">
          <CardHeader className="border-b border-border bg-background-subtle">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <CheckIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base">Acknowledgment Status</CardTitle>
                <p className="text-sm text-muted">Employee acknowledgment of the coaching session</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              {coaching?.employee_acknowledged ? (
                <div className="flex items-center gap-2">
                  <Badge variant="success">Acknowledged</Badge>
                  {coaching.acknowledged_at && (
                    <span className="text-sm text-muted">
                      on {new Date(coaching.acknowledged_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="warning">Pending Acknowledgment</Badge>
                  <span className="text-sm text-muted">
                    Employee has not yet acknowledged this coaching session
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Create Coaching Session'}
        </Button>
      </div>
    </form>
  );
}
