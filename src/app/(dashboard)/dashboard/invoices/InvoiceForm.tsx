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
} from '@/components/ui';
import type { Invoice, InvoiceStatus, LineItemType } from '@/features/invoicing';
import type { Platform } from '@/features/platforms';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  type: LineItemType;
}

interface InvoiceFormProps {
  invoice?: Invoice;
  existingLineItems?: LineItem[];
}

// Icons
function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

/**
 * Form for creating or editing an invoice with line items.
 */
export function InvoiceForm({ invoice, existingLineItems = [] }: InvoiceFormProps) {
  const router = useRouter();
  const isEdit = !!invoice;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);

  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoice_number || '');
  const [platformId, setPlatformId] = useState(invoice?.platform_id || '');
  const [periodStart, setPeriodStart] = useState(invoice?.period_start || '');
  const [periodEnd, setPeriodEnd] = useState(invoice?.period_end || '');
  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status || 'draft');
  const [dueAt, setDueAt] = useState(invoice?.due_at?.split('T')[0] || '');
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [taxRate, setTaxRate] = useState(invoice?.tax_rate?.toString() || '0');

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>(
    existingLineItems.length > 0 
      ? existingLineItems 
      : [{ id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, amount: 0, type: 'service' as LineItemType }]
  );

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const taxAmount = subtotal * (parseFloat(taxRate) / 100);
  const total = subtotal + taxAmount;

  useEffect(() => {
    fetchPlatforms();
    if (!isEdit) {
      generateInvoiceNumber();
    }
  }, []);

  async function fetchPlatforms() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPlatforms(data || []);
    } catch (err) {
      console.error('Failed to fetch platforms:', err);
    } finally {
      setLoadingPlatforms(false);
    }
  }

  async function generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const yearMonth = `${year}${month}`;
    
    try {
      const supabase = createClient();
      // Count invoices for this org in this year/month
      const { count, error } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .like('invoice_number', `INV-${yearMonth}-%`);
      
      if (error) throw error;
      
      const sequence = ((count || 0) + 1).toString().padStart(3, '0');
      setInvoiceNumber(`INV-${yearMonth}-${sequence}`);
    } catch (err) {
      // Fallback to 001 if query fails
      console.error('Failed to generate invoice number:', err);
      setInvoiceNumber(`INV-${yearMonth}-001`);
    }
  }

  function addLineItem() {
    setLineItems([
      ...lineItems,
      { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, amount: 0, type: 'service' as LineItemType }
    ]);
  }

  function removeLineItem(id: string) {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  }

  function updateLineItem(id: string, field: keyof LineItem, value: string | number) {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        updated.amount = updated.quantity * updated.unit_price;
        return updated;
      }
      return item;
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const invoiceData = {
        invoice_number: invoiceNumber,
        platform_id: platformId || null,
        period_start: periodStart,
        period_end: periodEnd,
        subtotal,
        tax_rate: parseFloat(taxRate) || 0,
        tax_amount: taxAmount,
        total,
        status,
        due_at: dueAt || null,
        notes: notes || null,
      };

      let invoiceId = invoice?.id;

      if (isEdit) {
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', invoice.id);

        if (error) throw error;

        // Delete existing line items
        await supabase.from('invoice_line_items').delete().eq('invoice_id', invoice.id);
      } else {
        const { data, error } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select('id')
          .single();

        if (error) throw error;
        invoiceId = data.id;
      }

      // Insert line items
      if (invoiceId && lineItems.length > 0) {
        const lineItemsData = lineItems
          .filter(item => item.description.trim() !== '')
          .map(item => ({
            invoice_id: invoiceId,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.quantity * item.unit_price,
            type: item.type,
          }));

        if (lineItemsData.length > 0) {
          const { error } = await supabase.from('invoice_line_items').insert(lineItemsData);
          if (error) throw error;
        }
      }

      router.push('/dashboard/invoices');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

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

      {/* Invoice Details */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <DocumentIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Invoice Details</CardTitle>
              <p className="text-sm text-muted">Basic invoice information</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Invoice Number */}
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber" required>Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-202604-001"
                className="font-mono"
                required
              />
            </div>

            {/* Platform */}
            <div className="space-y-2">
              <Label htmlFor="platformId" required>Platform / Client</Label>
              {loadingPlatforms ? (
                <div className="flex items-center gap-2 py-2">
                  <Spinner size="sm" />
                  <span className="text-sm text-muted">Loading platforms...</span>
                </div>
              ) : (
                <select
                  id="platformId"
                  value={platformId}
                  onChange={(e) => setPlatformId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="">Select platform...</option>
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" required>Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                required
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueAt">Due Date</Label>
              <Input
                id="dueAt"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Period */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Billing Period</CardTitle>
              <p className="text-sm text-muted">Date range for services rendered</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="periodStart" required>Period Start</Label>
              <Input
                id="periodStart"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodEnd" required>Period End</Label>
              <Input
                id="periodEnd"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <CurrencyIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base">Line Items</CardTitle>
                <p className="text-sm text-muted">Add services and charges</p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
              <PlusIcon className="mr-1 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Line items table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 px-2 text-left text-sm font-medium text-muted">Description</th>
                  <th className="py-3 px-2 text-left text-sm font-medium text-muted w-24">Type</th>
                  <th className="py-3 px-2 text-right text-sm font-medium text-muted w-20">Qty</th>
                  <th className="py-3 px-2 text-right text-sm font-medium text-muted w-28">Unit Price</th>
                  <th className="py-3 px-2 text-right text-sm font-medium text-muted w-28">Amount</th>
                  <th className="py-3 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={item.id} className="border-b border-border">
                    <td className="py-2 px-2">
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        placeholder="Delivery services..."
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={item.type}
                        onChange={(e) => updateLineItem(item.id, 'type', e.target.value)}
                        className="w-full rounded-md border border-border bg-input px-2 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="service">Service</option>
                        <option value="deliveries">Deliveries</option>
                        <option value="hours">Hours</option>
                        <option value="bonus">Bonus</option>
                        <option value="adjustment">Adjustment</option>
                        <option value="other">Other</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="1"
                        className="text-right"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-right font-medium text-heading">
                      {formatCurrency(item.quantity * item.unit_price)}
                    </td>
                    <td className="py-2 px-2">
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="p-1 text-muted hover:text-red-500 disabled:opacity-50"
                        disabled={lineItems.length === 1}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-72 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="font-medium text-heading">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted">Tax</span>
                  <Input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-16 text-right text-sm py-1"
                  />
                  <span className="text-muted">%</span>
                </div>
                <span className="font-medium text-heading">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3">
                <span className="text-lg font-bold text-heading">Total</span>
                <span className="text-lg font-bold text-heading">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or payment instructions..."
              rows={4}
              className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-heading placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
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
        <div className="flex gap-3">
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Invoice'}
          </Button>
        </div>
      </div>
    </form>
  );
}
