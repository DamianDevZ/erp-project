'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import type { Invoice, InvoiceStatus } from '@/features/invoicing';
import type { Client } from '@/features/clients';

interface InvoiceFormProps {
  invoice?: Invoice;
}

interface AttachmentPreview {
  file: File;
  preview: string;
  uploading?: boolean;
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

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * Form for creating or editing an invoice.
 * Simplified billing: Payroll Amount + 10% VAT = Total Invoiced Amount
 * Currency: BHD (Bahraini Dinar) with 3 decimal places
 */
export function InvoiceForm({ invoice }: InvoiceFormProps) {
  const router = useRouter();
  const isEdit = !!invoice;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<Client[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);

  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoice_number || '');
  const [title, setTitle] = useState(invoice?.title || '');
  const [clientId, setClientId] = useState(invoice?.client_id || '');
  const [periodStart, setPeriodStart] = useState(invoice?.period_start || '');
  const [periodEnd, setPeriodEnd] = useState(invoice?.period_end || '');
  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status || 'draft');
  const [dueAt, setDueAt] = useState(invoice?.due_at?.split('T')[0] || '');
  const [notes, setNotes] = useState(invoice?.notes || '');
  
  // Simplified billing - just payroll amount, VAT is fixed at 10%
  const [payrollAmount, setPayrollAmount] = useState(invoice?.subtotal?.toString() || '');
  
  // Image attachments
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<{ id: string; file_url: string; file_name: string }[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  
  // Calculate VAT (10%) and total
  const payrollValue = parseFloat(payrollAmount) || 0;
  const vatAmount = payrollValue * 0.10;
  const totalAmount = payrollValue + vatAmount;

  useEffect(() => {
    fetchClients();
    if (!isEdit) {
      generateInvoiceNumber();
    } else {
      fetchExistingAttachments();
    }
  }, []);

  async function fetchClients() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setPlatforms(data || []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoadingPlatforms(false);
    }
  }

  async function fetchExistingAttachments() {
    if (!invoice?.id) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('invoice_attachments')
        .select('id, file_url, file_name')
        .eq('invoice_id', invoice.id)
        .order('created_at');

      if (error) throw error;
      setExistingAttachments(data || []);
    } catch (err) {
      console.error('Failed to fetch attachments:', err);
    }
  }

  async function generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const yearMonth = `${year}${month}`;
    
    try {
      const supabase = createClient();
      const { count, error } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .like('invoice_number', `INV-${yearMonth}-%`);
      
      if (error) throw error;
      
      const sequence = ((count || 0) + 1).toString().padStart(3, '0');
      setInvoiceNumber(`INV-${yearMonth}-${sequence}`);
    } catch (err) {
      console.error('Failed to generate invoice number:', err);
      setInvoiceNumber(`INV-${yearMonth}-001`);
    }
  }

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    const newAttachments: AttachmentPreview[] = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
  }, []);

  // Handle paste event (for screenshots)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
    if (imageItems.length === 0) return;

    e.preventDefault();
    const files = imageItems.map(item => item.getAsFile()).filter((f): f is File => f !== null);
    handleFileSelect(files);
  }, [handleFileSelect]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Remove attachment
  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Remove existing attachment
  const removeExistingAttachment = async (attachmentId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('invoice_attachments')
        .delete()
        .eq('id', attachmentId);
      
      if (error) throw error;
      setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (err) {
      console.error('Failed to remove attachment:', err);
    }
  };

  // Upload attachments to Supabase Storage
  async function uploadAttachments(invoiceId: string) {
    if (attachments.length === 0) return;
    
    setUploadingAttachments(true);
    const supabase = createClient();
    
    for (const attachment of attachments) {
      try {
        const ext = attachment.file.name.split('.').pop() || 'png';
        const fileName = `${invoiceId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        
        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('invoice-attachments')
          .upload(fileName, attachment.file);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('invoice-attachments')
          .getPublicUrl(fileName);
        
        // Save attachment record
        await supabase.from('invoice_attachments').insert({
          invoice_id: invoiceId,
          file_url: publicUrl,
          file_name: attachment.file.name,
          file_type: attachment.file.type,
          file_size: attachment.file.size,
        });
      } catch (err) {
        console.error('Failed to upload attachment:', err);
      }
    }
    
    setUploadingAttachments(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const invoiceData = {
        invoice_number: invoiceNumber,
        title: title || null,
        client_id: clientId,
        period_start: periodStart,
        period_end: periodEnd,
        subtotal: payrollValue,
        tax_rate: 10,
        tax_amount: vatAmount,
        total: totalAmount,
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
      } else {
        const { data, error } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select('id')
          .single();

        if (error) throw error;
        invoiceId = data.id;
      }

      // Upload any new attachments
      if (invoiceId && attachments.length > 0) {
        await uploadAttachments(invoiceId);
      }

      router.push('/dashboard/invoices');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  }

  // Format BHD with 3 decimal places
  const formatBHD = (amount: number) =>
    `BHD ${amount.toFixed(3)}`;

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

            {/* Client */}
            <div className="space-y-2">
              <Label htmlFor="clientId" required>Client</Label>
              {loadingPlatforms ? (
                <div className="flex items-center gap-2 py-2">
                  <Spinner size="sm" />
                  <span className="text-sm text-muted">Loading clients...</span>
                </div>
              ) : (
                <select
                  id="clientId"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="">Select client...</option>
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Invoice Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Driver Services - April 2026"
              />
              <p className="text-xs text-muted">Optional title or description for this invoice</p>
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

      {/* Billing Amount */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CurrencyIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-base">Billing Amount</CardTitle>
              <p className="text-sm text-muted">Enter the payroll amount - VAT (10%) is calculated automatically</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Payroll Amount Input */}
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="payrollAmount" required>Payroll Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-medium">BHD</span>
              <Input
                id="payrollAmount"
                type="number"
                value={payrollAmount}
                onChange={(e) => setPayrollAmount(e.target.value)}
                placeholder="0.000"
                step="0.001"
                min="0"
                className="pl-14 text-right font-mono"
                required
              />
            </div>
          </div>

          {/* Summary */}
          <div className="mt-8 rounded-lg border border-border bg-background-subtle p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-body">Payroll Amount</span>
                <span className="font-mono text-heading">{formatBHD(payrollValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-body">VAT (10%)</span>
                <span className="font-mono text-heading">{formatBHD(vatAmount)}</span>
              </div>
              <div className="border-t border-border pt-4 flex justify-between items-center">
                <span className="text-lg font-semibold text-heading">Total Invoiced Amount</span>
                <span className="text-lg font-bold font-mono text-primary">{formatBHD(totalAmount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes & Attachments */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <ImageIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-base">Notes & Attachments</CardTitle>
              <p className="text-sm text-muted">Add notes and attach images (paste screenshots or drag files)</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                ref={notesRef}
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onPaste={handlePaste}
                placeholder="Additional notes or payment instructions... (Paste images with Ctrl+V)"
                rows={4}
                className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-heading placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Attachment Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-8 w-8 mx-auto text-muted mb-2" />
              <p className="text-sm text-muted">
                Drag & drop images here, or click to select
              </p>
              <p className="text-xs text-muted mt-1">
                You can also paste screenshots directly in the notes field
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              />
            </div>

            {/* Existing Attachments (for edit mode) */}
            {existingAttachments.length > 0 && (
              <div className="space-y-2">
                <Label>Existing Attachments</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {existingAttachments.map((attachment) => (
                    <div key={attachment.id} className="relative group">
                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={attachment.file_url}
                          alt={attachment.file_name}
                          className="w-full h-24 object-cover rounded-lg border border-border"
                        />
                      </a>
                      <button
                        type="button"
                        onClick={() => removeExistingAttachment(attachment.id)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Attachment Previews */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <Label>New Attachments ({attachments.length})</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {attachments.map((attachment, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={attachment.preview}
                        alt={attachment.file.name}
                        className="w-full h-24 object-cover rounded-lg border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                      <p className="text-xs text-muted truncate mt-1">{attachment.file.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
          {isEdit ? 'Save Changes' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  );
}
