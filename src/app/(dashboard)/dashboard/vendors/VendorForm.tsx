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
import type { Vendor, VendorType, VendorStatus } from '@/features/vendors';

interface VendorFormProps {
  vendor?: Vendor;
}

const VENDOR_TYPES: { value: VendorType; label: string }[] = [
  { value: 'equipment', label: 'Equipment Supplier' },
  { value: 'staffing', label: 'Staffing Agency' },
  { value: 'maintenance', label: 'Maintenance/Repair' },
  { value: 'uniform', label: 'Uniform Supplier' },
  { value: 'technology', label: 'Technology/Software' },
  { value: 'other', label: 'Other' },
];

const VENDOR_STATUSES: { value: VendorStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending Approval' },
];

// Icons
function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
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

function BankIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

/**
 * Form for creating or editing a vendor.
 */
export function VendorForm({ vendor }: VendorFormProps) {
  const router = useRouter();
  const isEdit = !!vendor;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(vendor?.name || '');
  const [type, setType] = useState<VendorType>(vendor?.type as VendorType || 'equipment');
  const [status, setStatus] = useState<VendorStatus>(vendor?.status as VendorStatus || 'active');
  const [contactName, setContactName] = useState(vendor?.contact_name || '');
  const [contactEmail, setContactEmail] = useState(vendor?.contact_email || '');
  const [contactPhone, setContactPhone] = useState(vendor?.contact_phone || '');
  const [address, setAddress] = useState(vendor?.address || '');
  const [city, setCity] = useState(vendor?.city || '');
  const [country, setCountry] = useState(vendor?.country || '');
  const [taxId, setTaxId] = useState(vendor?.tax_id || '');
  const [paymentTerms, setPaymentTerms] = useState(vendor?.payment_terms || '');
  const [bankName, setBankName] = useState(vendor?.bank_name || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(vendor?.bank_account_number || '');
  const [iban, setIban] = useState(vendor?.iban || '');
  const [servicesProvided, setServicesProvided] = useState(vendor?.services_provided || '');
  const [notes, setNotes] = useState(vendor?.notes || '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const data = {
        name,
        type,
        status,
        contact_name: contactName || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        address: address || null,
        city: city || null,
        country: country || null,
        tax_id: taxId || null,
        payment_terms: paymentTerms || null,
        bank_name: bankName || null,
        bank_account_number: bankAccountNumber || null,
        iban: iban || null,
        services_provided: servicesProvided || null,
        notes: notes || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('vendors')
          .update(data)
          .eq('id', vendor.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendors')
          .insert(data);

        if (error) throw error;
      }

      router.push('/dashboard/vendors');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vendor');
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

      {/* Basic Information */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BuildingIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Vendor Information</CardTitle>
              <p className="text-sm text-muted">Basic details about the vendor</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" required>Vendor Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Company name"
                required
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type" required>Vendor Type</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as VendorType)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                required
              >
                {VENDOR_TYPES.map((vt) => (
                  <option key={vt.value} value={vt.value}>{vt.label}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as VendorStatus)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {VENDOR_STATUSES.map((vs) => (
                  <option key={vs.value} value={vs.value}>{vs.label}</option>
                ))}
              </select>
            </div>

            {/* Services Provided */}
            <div className="space-y-2">
              <Label htmlFor="servicesProvided">Services Provided</Label>
              <Input
                id="servicesProvided"
                value={servicesProvided}
                onChange={(e) => setServicesProvided(e.target.value)}
                placeholder="e.g., Bike rental, Maintenance, Repairs"
              />
              <p className="text-xs text-muted">Comma-separated list</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <UserIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Contact Information</CardTitle>
              <p className="text-sm text-muted">Primary contact and address</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact Name */}
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Primary contact person"
              />
            </div>

            {/* Contact Phone */}
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>

            {/* Contact Email */}
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@vendor.com"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address"
              />
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
              />
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment & Banking */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <BankIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-base">Payment & Banking</CardTitle>
              <p className="text-sm text-muted">Financial details for payments</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Tax ID */}
            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID / VAT Number</Label>
              <Input
                id="taxId"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="Tax registration number"
              />
            </div>

            {/* Payment Terms */}
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input
                id="paymentTerms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g., Net 30, Due on receipt"
              />
            </div>

            {/* Bank Name */}
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Bank name"
              />
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label htmlFor="bankAccountNumber">Account Number</Label>
              <Input
                id="bankAccountNumber"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="Bank account number"
              />
            </div>

            {/* IBAN */}
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="International bank account number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes about this vendor..."
            rows={3}
            className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-heading placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
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
          {isEdit ? 'Save Changes' : 'Create Vendor'}
        </Button>
      </div>
    </form>
  );
}
