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
import {
  type PerformanceDiscipline,
  type DisciplineType,
  type DisciplineStatus,
  type SeverityLevel,
  DISCIPLINE_TYPE_LABELS,
  DISCIPLINE_STATUS_LABELS,
  SEVERITY_LABELS,
} from '@/features/performance';

interface PerformanceFormProps {
  record?: PerformanceDiscipline;
  employees: Array<{
    id: string;
    full_name: string;
    employee_id: string | null;
  }>;
}

// Icons
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286z" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/**
 * Form for creating or editing performance/discipline records.
 */
export function PerformanceForm({ record, employees }: PerformanceFormProps) {
  const router = useRouter();
  const isEdit = !!record;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [employeeId, setEmployeeId] = useState(record?.employee_id || '');
  const [reporterId, setReporterId] = useState(record?.reporter_id || '');
  const [type, setType] = useState<DisciplineType>(record?.type || 'incident_report');
  const [status, setStatus] = useState<DisciplineStatus>(record?.status || 'open');
  const [severity, setSeverity] = useState<SeverityLevel>(record?.severity || 'medium');
  const [title, setTitle] = useState(record?.title || '');
  const [description, setDescription] = useState(record?.description || '');
  const [incidentDate, setIncidentDate] = useState(record?.incident_date || new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState(record?.location || '');
  const [actionTaken, setActionTaken] = useState(record?.action_taken || '');
  const [actionDate, setActionDate] = useState(record?.action_date || '');
  const [followUpDate, setFollowUpDate] = useState(record?.follow_up_date || '');
  const [managerNotes, setManagerNotes] = useState(record?.manager_notes || '');
  const [hrNotes, setHrNotes] = useState(record?.hr_notes || '');
  const [outcome, setOutcome] = useState(record?.outcome || '');

  // Employee acknowledgment (read-only display for edit)
  const employeeAcknowledged = record?.employee_acknowledged || false;
  const acknowledgedAt = record?.acknowledged_at || null;
  const employeeResponse = record?.employee_response || '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!employeeId) {
      setError('Please select an employee');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      const data = {
        employee_id: employeeId,
        reporter_id: reporterId || null,
        type,
        status,
        severity,
        title,
        description: description || null,
        incident_date: incidentDate,
        location: location || null,
        action_taken: actionTaken || null,
        action_date: actionDate || null,
        follow_up_date: followUpDate || null,
        manager_notes: managerNotes || null,
        hr_notes: hrNotes || null,
        outcome: outcome || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('performance_discipline')
          .update(data)
          .eq('id', record.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('performance_discipline')
          .insert(data);

        if (error) throw error;
      }

      router.push('/dashboard/performance');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save record');
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

      {/* Incident Details */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ShieldIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Incident Details</CardTitle>
              <p className="text-sm text-muted">Basic information about the incident or action</p>
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

            {/* Reporter */}
            <div className="space-y-2">
              <Label htmlFor="reporterId">Reported By</Label>
              <select
                id="reporterId"
                value={reporterId}
                onChange={(e) => setReporterId(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Select reporter...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type" required>Type</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as DisciplineType)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                required
              >
                {Object.entries(DISCIPLINE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <Label htmlFor="severity" required>Severity</Label>
              <select
                id="severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                required
              >
                {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as DisciplineStatus)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(DISCIPLINE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Incident Date */}
            <div className="space-y-2">
              <Label htmlFor="incidentDate" required>Incident Date</Label>
              <Input
                id="incidentDate"
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                required
              />
            </div>

            {/* Title */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title" required>Title / Summary</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief summary of the incident or action"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of what occurred..."
                rows={4}
                className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-heading placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Location */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where did this occur?"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action & Follow-up */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <DocumentIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Action & Follow-up</CardTitle>
              <p className="text-sm text-muted">Document actions taken and schedule follow-ups</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Action Taken */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="actionTaken">Action Taken</Label>
              <textarea
                id="actionTaken"
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="What action was taken in response?"
                rows={3}
                className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-heading placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Action Date */}
            <div className="space-y-2">
              <Label htmlFor="actionDate">Action Date</Label>
              <Input
                id="actionDate"
                type="date"
                value={actionDate}
                onChange={(e) => setActionDate(e.target.value)}
              />
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
            </div>

            {/* Manager Notes */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="managerNotes">Manager Notes</Label>
              <textarea
                id="managerNotes"
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                placeholder="Internal notes from the manager..."
                rows={3}
                className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-heading placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* HR Notes */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="hrNotes">HR Notes</Label>
              <textarea
                id="hrNotes"
                value={hrNotes}
                onChange={(e) => setHrNotes(e.target.value)}
                placeholder="HR department notes..."
                rows={3}
                className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-heading placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Outcome */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="outcome">Outcome</Label>
              <textarea
                id="outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Final outcome or resolution..."
                rows={2}
                className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-heading placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Acknowledgment (read-only for edit) */}
      {isEdit && (
        <Card className="mb-6">
          <CardHeader className="border-b border-border bg-background-subtle">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base">Employee Acknowledgment</CardTitle>
                <p className="text-sm text-muted">Employee's acknowledgment and response</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Acknowledged</Label>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    employeeAcknowledged 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {employeeAcknowledged ? 'Yes' : 'Pending'}
                  </span>
                  {acknowledgedAt && (
                    <span className="text-sm text-muted">
                      on {new Date(acknowledgedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              {employeeResponse && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Employee Response</Label>
                  <div className="rounded-lg border border-border bg-background-subtle p-3 text-sm text-body">
                    {employeeResponse}
                  </div>
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
          {isEdit ? 'Save Changes' : 'Create Record'}
        </Button>
      </div>
    </form>
  );
}
