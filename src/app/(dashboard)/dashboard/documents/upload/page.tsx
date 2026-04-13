'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Button,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Spinner,
  Badge,
} from '@/components/ui';
import { 
  DocumentType, 
  DOCUMENT_TYPE_LABELS,
  getFileIcon,
  formatFileSize,
} from '@/features/documents/types';

interface EmployeeOption {
  id: string;
  full_name: string;
  employee_id: string;
}

interface FileToUpload {
  file: File;
  employeeId: string;
  type: DocumentType;
  expiresAt: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function UploadDocumentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [files, setFiles] = useState<FileToUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [defaultEmployeeId, setDefaultEmployeeId] = useState('');
  const [defaultType, setDefaultType] = useState<DocumentType>('other');

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
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles: FileToUpload[] = selectedFiles.map(file => ({
      file,
      employeeId: defaultEmployeeId,
      type: defaultType,
      expiresAt: '',
      status: 'pending',
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }

  function updateFile(index: number, updates: Partial<FileToUpload>) {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function uploadFiles() {
    if (files.length === 0) return;

    // Validate all files have employee assigned
    const invalid = files.some(f => !f.employeeId);
    if (invalid) {
      alert('Please assign an employee to all files');
      return;
    }

    setUploading(true);
    const supabase = createClient();

    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      updateFile(i, { status: 'uploading' });

      try {
        // Generate unique file path
        const timestamp = Date.now();
        const filePath = `${fileData.employeeId}/${timestamp}-${fileData.file.name}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, fileData.file);

        if (uploadError) throw uploadError;

        // Create database record
        const { error: dbError } = await supabase
          .from('employee_documents')
          .insert({
            employee_id: fileData.employeeId,
            type: fileData.type,
            file_path: filePath,
            file_name: fileData.file.name,
            expires_at: fileData.expiresAt || null,
          });

        if (dbError) throw dbError;

        updateFile(i, { status: 'success' });
      } catch (err) {
        updateFile(i, { 
          status: 'error', 
          error: err instanceof Error ? err.message : 'Upload failed' 
        });
      }
    }

    setUploading(false);
    
    // Navigate away if all succeeded
    const allSuccess = files.every(f => f.status === 'success');
    if (allSuccess) {
      setTimeout(() => {
        router.push('/dashboard/documents');
        router.refresh();
      }, 1500);
    }
  }

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted mb-2">
          <Link href="/dashboard/documents" className="hover:text-heading">
            Documents
          </Link>
          <span>/</span>
          <span>Upload</span>
        </div>
        <h1 className="text-2xl font-bold text-heading">Upload Documents</h1>
        <p className="text-muted">Upload multiple documents at once for employees.</p>
      </div>

      {/* Default Settings */}
      <Card>
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-base">Default Settings</CardTitle>
              <p className="text-sm text-muted">These will be applied to newly added files</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultEmployee">Default Employee</Label>
              {loadingEmployees ? (
                <div className="flex items-center gap-2 py-2">
                  <Spinner size="sm" />
                  <span className="text-sm text-muted">Loading...</span>
                </div>
              ) : (
                <select
                  id="defaultEmployee"
                  value={defaultEmployeeId}
                  onChange={(e) => setDefaultEmployeeId(e.target.value)}
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
            <div className="space-y-2">
              <Label htmlFor="defaultType">Default Document Type</Label>
              <select
                id="defaultType"
                value={defaultType}
                onChange={(e) => setDefaultType(e.target.value as DocumentType)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Area */}
      <Card>
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-base">Select Files</CardTitle>
              <p className="text-sm text-muted">Add files to upload</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-background-subtle transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
            />
            <svg className="h-12 w-12 mx-auto text-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-heading font-medium mb-1">Click to select files</p>
            <p className="text-sm text-muted">or drag and drop</p>
            <p className="text-xs text-muted mt-2">PDF, Word, Excel, Images up to 10MB each</p>
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="border-b border-border bg-background-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-base">Files to Upload ({files.length})</CardTitle>
                  <p className="text-sm text-muted">
                    {successCount > 0 && <span className="text-green-600">{successCount} uploaded</span>}
                    {successCount > 0 && pendingCount > 0 && ' · '}
                    {pendingCount > 0 && <span>{pendingCount} pending</span>}
                    {errorCount > 0 && ' · '}
                    {errorCount > 0 && <span className="text-red-600">{errorCount} failed</span>}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiles([])}
                disabled={uploading}
              >
                Clear All
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-3">
            {files.map((fileData, index) => (
              <div 
                key={index} 
                className={`border rounded-lg p-4 ${
                  fileData.status === 'success' ? 'border-green-300 bg-green-50' :
                  fileData.status === 'error' ? 'border-red-300 bg-red-50' :
                  fileData.status === 'uploading' ? 'border-blue-300 bg-blue-50' :
                  'border-border'
                }`}
              >
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-2xl">{getFileIcon(fileData.file.name)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-heading truncate">{fileData.file.name}</p>
                    <p className="text-xs text-muted">{formatFileSize(fileData.file.size)}</p>
                  </div>
                  {fileData.status === 'uploading' && <Spinner size="sm" />}
                  {fileData.status === 'success' && (
                    <Badge variant="success">Uploaded</Badge>
                  )}
                  {fileData.status === 'error' && (
                    <Badge variant="error">Failed</Badge>
                  )}
                  {fileData.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                      className="text-red-600"
                    >
                      Remove
                    </Button>
                  )}
                </div>
                
                {fileData.status === 'pending' && (
                  <div className="grid gap-3 md:grid-cols-3">
                    <select
                      value={fileData.employeeId}
                      onChange={(e) => updateFile(index, { employeeId: e.target.value })}
                      className="rounded-md border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select employee *</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={fileData.type}
                      onChange={(e) => updateFile(index, { type: e.target.value as DocumentType })}
                      className="rounded-md border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={fileData.expiresAt}
                      onChange={(e) => updateFile(index, { expiresAt: e.target.value })}
                      placeholder="Expires (optional)"
                      className="rounded-md border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                
                {fileData.status === 'error' && fileData.error && (
                  <p className="text-sm text-red-600 mt-2">{fileData.error}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/documents')}
          disabled={uploading}
        >
          Cancel
        </Button>
        <Button 
          onClick={uploadFiles} 
          disabled={uploading || files.length === 0 || pendingCount === 0}
        >
          {uploading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Uploading...
            </>
          ) : (
            `Upload ${pendingCount} File${pendingCount !== 1 ? 's' : ''}`
          )}
        </Button>
      </div>
    </div>
  );
}
