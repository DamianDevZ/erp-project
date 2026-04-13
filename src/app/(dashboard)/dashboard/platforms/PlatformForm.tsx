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
import type { Platform, BillingRateType } from '@/features/platforms';

interface PlatformFormProps {
  platform?: Platform;
}

// Icons
function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function CurrencyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/**
 * Form for creating or editing a platform.
 */
export function PlatformForm({ platform }: PlatformFormProps) {
  const router = useRouter();
  const isEdit = !!platform;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(platform?.name || '');
  const [contactEmail, setContactEmail] = useState(platform?.contact_email || '');
  const [contactPhone, setContactPhone] = useState(platform?.contact_phone || '');
  const [vatId, setVatId] = useState(platform?.vat_id || '');
  const [address, setAddress] = useState(platform?.address || '');
  const [city, setCity] = useState(platform?.city || '');
  const [country, setCountry] = useState(platform?.country || '');
  const [billingRate, setBillingRate] = useState(platform?.billing_rate?.toString() || '');
  const [billingRateType, setBillingRateType] = useState<BillingRateType>(
    platform?.billing_rate_type || 'per_delivery'
  );
  const [isActive, setIsActive] = useState(platform?.is_active ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const data = {
        name,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        vat_id: vatId || null,
        address: address || null,
        city: city || null,
        country: country || null,
        billing_rate: billingRate ? parseFloat(billingRate) : null,
        billing_rate_type: billingRateType,
        is_active: isActive,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('platforms')
          .update(data)
          .eq('id', platform.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platforms')
          .insert(data);

        if (error) throw error;
      }

      router.push('/dashboard/platforms');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save platform');
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

      {/* Platform Information */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BuildingIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Platform Information</CardTitle>
              <p className="text-sm text-muted">Delivery platform details</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="name" required>Platform Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Uber Eats"
              required
            />
            <p className="text-xs text-muted">The delivery platform your company works with</p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@platform.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+973 1234 5678"
              />
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <Label htmlFor="vatId">VAT ID / Tax Registration Number</Label>
            <Input
              id="vatId"
              value={vatId}
              onChange={(e) => setVatId(e.target.value)}
              placeholder="VAT1234567890"
            />
            <p className="text-xs text-muted">This will appear on invoices sent to this platform</p>
          </div>

          <div className="mt-6 space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Business Street"
            />
          </div>

          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Manama"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Bahrain"
              />
            </div>
          </div>

          {/* Status (only show in edit mode) */}
          {isEdit && (
            <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-background-subtle p-4">
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-5 w-5 rounded border-border accent-primary"
              />
              <div>
                <Label htmlFor="isActive" className="text-heading font-medium">Active Platform</Label>
                <p className="text-sm text-muted">Uncheck to mark this platform as inactive</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Information */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CurrencyIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-base">Billing Settings</CardTitle>
              <p className="text-sm text-muted">Rate configuration for invoicing</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Billing Rate */}
            <div className="space-y-2">
              <Label htmlFor="billingRate">Billing Rate</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                <Input
                  id="billingRate"
                  type="number"
                  value={billingRate}
                  onChange={(e) => setBillingRate(e.target.value)}
                  placeholder="5.00"
                  step="0.01"
                  min="0"
                  className="pl-7"
                />
              </div>
            </div>

            {/* Billing Rate Type */}
            <div className="space-y-2">
              <Label htmlFor="billingRateType">Rate Type</Label>
              <select
                id="billingRateType"
                value={billingRateType}
                onChange={(e) => setBillingRateType(e.target.value as BillingRateType)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="per_delivery">Per Delivery</option>
                <option value="hourly">Hourly</option>
                <option value="fixed">Fixed Period</option>
              </select>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-700">
              <strong>Tip:</strong> The billing rate will be used when generating invoices for this platform.
            </p>
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
          {isEdit ? 'Save Changes' : 'Create Platform'}
        </Button>
      </div>
    </form>
  );
}
