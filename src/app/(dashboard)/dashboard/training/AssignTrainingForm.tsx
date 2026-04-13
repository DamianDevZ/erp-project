'use client';

import { useState } from 'react';
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
} from '@/components/ui';
import type { TrainingCourse, EmployeeTraining, TrainingStatus } from '@/features/training';
import { TRAINING_STATUS_LABELS } from '@/features/training';

interface Employee {
  id: string;
  full_name: string;
  employee_id: string | null;
}

interface AssignTrainingFormProps {
  training?: EmployeeTraining;
  employees: Employee[];
  courses: TrainingCourse[];
}

// Icons
function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
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

/**
 * Form for assigning or editing a training assignment.
 */
export function AssignTrainingForm({ training, employees, courses }: AssignTrainingFormProps) {
  const router = useRouter();
  const isEdit = !!training;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [employeeId, setEmployeeId] = useState(training?.employee_id || '');
  const [courseId, setCourseId] = useState(training?.course_id || '');
  const [dueDate, setDueDate] = useState(training?.due_date || '');
  const [status, setStatus] = useState<TrainingStatus>(training?.status || 'not_started');
  const [startedAt, setStartedAt] = useState(training?.started_at?.split('T')[0] || '');
  const [completedAt, setCompletedAt] = useState(training?.completed_at?.split('T')[0] || '');
  const [expiryDate, setExpiryDate] = useState(training?.expiry_date || '');
  const [score, setScore] = useState(training?.score?.toString() || '');
  const [passed, setPassed] = useState(training?.passed || false);
  const [certificateUrl, setCertificateUrl] = useState(training?.certificate_url || '');
  const [certificateNumber, setCertificateNumber] = useState(training?.certificate_number || '');
  const [notes, setNotes] = useState(training?.notes || '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!employeeId || !courseId) {
      setError('Please select both an employee and a course');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      const data = {
        employee_id: employeeId,
        course_id: courseId,
        due_date: dueDate || null,
        status,
        started_at: startedAt ? new Date(startedAt).toISOString() : null,
        completed_at: completedAt ? new Date(completedAt).toISOString() : null,
        expiry_date: expiryDate || null,
        score: score ? parseFloat(score) : null,
        passed: status === 'completed' ? passed : null,
        certificate_url: certificateUrl || null,
        certificate_number: certificateNumber || null,
        notes: notes || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('employee_trainings')
          .update(data)
          .eq('id', training.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employee_trainings')
          .insert(data);

        if (error) throw error;
      }

      router.push('/dashboard/training');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save training assignment');
    } finally {
      setLoading(false);
    }
  }

  // Get selected course details for auto-calculating expiry
  const selectedCourse = courses.find(c => c.id === courseId);

  // Auto-set expiry date when completed and course has recertification
  function handleCompletedAtChange(date: string) {
    setCompletedAt(date);
    if (date && selectedCourse?.requires_recertification && selectedCourse.recertification_months) {
      const completedDate = new Date(date);
      completedDate.setMonth(completedDate.getMonth() + selectedCourse.recertification_months);
      setExpiryDate(completedDate.toISOString().split('T')[0]);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl">
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

      {/* Assignment Details */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <UserPlusIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Training Assignment</CardTitle>
              <p className="text-sm text-muted">Assign a course to an employee</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Employee */}
            <div className="space-y-2">
              <Label htmlFor="employeeId" required>Employee</Label>
              <select
                id="employeeId"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                required
                disabled={isEdit}
              >
                <option value="">Select employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name}
                    {emp.employee_id && ` (${emp.employee_id})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Course */}
            <div className="space-y-2">
              <Label htmlFor="courseId" required>Course</Label>
              <select
                id="courseId"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                required
                disabled={isEdit}
              >
                <option value="">Select course...</option>
                {courses.filter(c => c.is_active).map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                    {course.is_mandatory && ' (Mandatory)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TrainingStatus)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(TRAINING_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress & Results */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <ChartIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Progress & Results</CardTitle>
              <p className="text-sm text-muted">Track completion and certification</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Started At */}
            <div className="space-y-2">
              <Label htmlFor="startedAt">Started Date</Label>
              <Input
                id="startedAt"
                type="date"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
              />
            </div>

            {/* Completed At */}
            <div className="space-y-2">
              <Label htmlFor="completedAt">Completed Date</Label>
              <Input
                id="completedAt"
                type="date"
                value={completedAt}
                onChange={(e) => handleCompletedAtChange(e.target.value)}
              />
            </div>

            {/* Expiry Date */}
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
              {selectedCourse?.requires_recertification && (
                <p className="text-xs text-muted">
                  Auto-calculated based on {selectedCourse.recertification_months} months recertification period
                </p>
              )}
            </div>

            {/* Score */}
            <div className="space-y-2">
              <Label htmlFor="score">Score (%)</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="e.g., 85"
              />
            </div>

            {/* Passed */}
            {status === 'completed' && (
              <div className="space-y-2">
                <Label>Result</Label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={passed}
                    onChange={(e) => setPassed(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-heading">Passed</span>
                </label>
              </div>
            )}

            {/* Certificate Number */}
            <div className="space-y-2">
              <Label htmlFor="certificateNumber">Certificate Number</Label>
              <Input
                id="certificateNumber"
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                placeholder="Certificate ID or number"
              />
            </div>

            {/* Certificate URL */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="certificateUrl">Certificate URL</Label>
              <Input
                id="certificateUrl"
                type="url"
                value={certificateUrl}
                onChange={(e) => setCertificateUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-heading placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>

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
          {isEdit ? 'Save Changes' : 'Assign Training'}
        </Button>
      </div>
    </form>
  );
}
