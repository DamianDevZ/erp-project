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
  type TrainingCourse,
  type TrainingType,
  type TrainingDelivery,
  TRAINING_TYPE_LABELS,
  TRAINING_DELIVERY_LABELS,
} from '@/features/training';

interface CourseFormProps {
  course?: TrainingCourse;
}

// Icons
function AcademicCapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  );
}

function CogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

/**
 * Form for creating or editing training courses.
 */
export function CourseForm({ course }: CourseFormProps) {
  const router = useRouter();
  const isEdit = !!course;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(course?.name || '');
  const [description, setDescription] = useState(course?.description || '');
  const [type, setType] = useState<TrainingType>(course?.type || 'skill_development');
  const [delivery, setDelivery] = useState<TrainingDelivery>(course?.delivery || 'in_person');
  const [durationHours, setDurationHours] = useState(course?.duration_hours?.toString() || '');
  const [isMandatory, setIsMandatory] = useState(course?.is_mandatory || false);
  const [requiresRecertification, setRequiresRecertification] = useState(course?.requires_recertification || false);
  const [recertificationMonths, setRecertificationMonths] = useState(course?.recertification_months?.toString() || '');
  const [provider, setProvider] = useState(course?.provider || '');
  const [externalUrl, setExternalUrl] = useState(course?.external_url || '');
  const [costPerPerson, setCostPerPerson] = useState(course?.cost_per_person?.toString() || '');
  const [currency, setCurrency] = useState(course?.currency || 'BHD');
  const [isActive, setIsActive] = useState(course?.is_active ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const data = {
        name,
        description: description || null,
        type,
        delivery,
        duration_hours: durationHours ? parseFloat(durationHours) : null,
        is_mandatory: isMandatory,
        requires_recertification: requiresRecertification,
        recertification_months: recertificationMonths ? parseInt(recertificationMonths) : null,
        provider: provider || null,
        external_url: externalUrl || null,
        cost_per_person: costPerPerson ? parseFloat(costPerPerson) : null,
        currency,
        is_active: isActive,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('training_courses')
          .update(data)
          .eq('id', course.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('training_courses')
          .insert(data);

        if (error) throw error;
      }

      router.push('/dashboard/training');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save course');
    } finally {
      setLoading(false);
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

      {/* Course Details */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <AcademicCapIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Course Details</CardTitle>
              <p className="text-sm text-muted">Basic information about the training course</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Name */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name" required>Course Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Safety Training, Driver Certification"
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
                placeholder="Brief description of the training course..."
                rows={3}
                className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-heading placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type" required>Type</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as TrainingType)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                required
              >
                {Object.entries(TRAINING_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Delivery */}
            <div className="space-y-2">
              <Label htmlFor="delivery" required>Delivery Method</Label>
              <select
                id="delivery"
                value={delivery}
                onChange={(e) => setDelivery(e.target.value as TrainingDelivery)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                required
              >
                {Object.entries(TRAINING_DELIVERY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="durationHours">Duration (hours)</Label>
              <Input
                id="durationHours"
                type="number"
                step="0.5"
                min="0"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                placeholder="e.g., 4"
              />
            </div>

            {/* Provider */}
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Input
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Training provider or company"
              />
            </div>

            {/* External URL */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="externalUrl">External URL</Label>
              <Input
                id="externalUrl"
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <CogIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Settings</CardTitle>
              <p className="text-sm text-muted">Course requirements and pricing</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Mandatory */}
            <div className="space-y-2">
              <Label>Mandatory</Label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMandatory}
                  onChange={(e) => setIsMandatory(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-heading">This is a mandatory training</span>
              </label>
            </div>

            {/* Active */}
            <div className="space-y-2">
              <Label>Status</Label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-heading">Course is active</span>
              </label>
            </div>

            {/* Recertification */}
            <div className="space-y-2 md:col-span-2">
              <Label>Recertification</Label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresRecertification}
                  onChange={(e) => setRequiresRecertification(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-heading">Requires periodic recertification</span>
              </label>
              {requiresRecertification && (
                <div className="mt-3">
                  <Label htmlFor="recertificationMonths">Recertification Period (months)</Label>
                  <Input
                    id="recertificationMonths"
                    type="number"
                    min="1"
                    value={recertificationMonths}
                    onChange={(e) => setRecertificationMonths(e.target.value)}
                    placeholder="e.g., 12"
                    className="mt-2 max-w-xs"
                  />
                </div>
              )}
            </div>

            {/* Cost */}
            <div className="space-y-2">
              <Label htmlFor="costPerPerson">Cost per Person</Label>
              <div className="flex gap-2">
                <Input
                  id="costPerPerson"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPerPerson}
                  onChange={(e) => setCostPerPerson(e.target.value)}
                  placeholder="0.00"
                  className="flex-1"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="BHD">AED</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
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
          {isEdit ? 'Save Changes' : 'Create Course'}
        </Button>
      </div>
    </form>
  );
}