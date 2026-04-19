'use client';

/**
 * Data Import/Export Service (T-097 to T-099)
 * 
 * Manages:
 * - CSV/Excel imports
 * - Data exports
 * - Import templates
 * - Data validation
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type ImportEntityType = 
  | 'employee'
  | 'order'
  | 'asset'
  | 'client'
  | 'platform';

export type ExportEntityType = 
  | 'employee'
  | 'order'
  | 'asset'
  | 'document'
  | 'invoice'
  | 'attendance'
  | 'incident'
  | 'payroll';

export type ImportStatus = 'pending' | 'validating' | 'importing' | 'completed' | 'failed';
export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf';

export interface ImportJob {
  id: string;
  entityType: ImportEntityType;
  fileName: string;
  fileSize: number;
  status: ImportStatus;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedRows: number;
  validationErrors: ValidationError[];
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
}

export interface ValidationError {
  row: number;
  field: string;
  value: string;
  error: string;
}

export interface ExportJob {
  id: string;
  entityType: ExportEntityType;
  format: ExportFormat;
  filters: Record<string, unknown>;
  columns: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number | null;
  fileUrl: string | null;
  expiresAt: string | null;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
}

export interface ImportTemplate {
  entityType: ImportEntityType;
  name: string;
  description: string;
  columns: ImportColumn[];
  sampleData: Record<string, string>[];
}

export interface ImportColumn {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'email' | 'phone' | 'boolean' | 'enum';
  required: boolean;
  maxLength?: number;
  pattern?: string;
  enumValues?: string[];
  description?: string;
}

export interface ParsedImportRow {
  rowNumber: number;
  data: Record<string, unknown>;
  errors: ValidationError[];
  isValid: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const ENTITY_TYPE_LABELS: Record<ImportEntityType | ExportEntityType, string> = {
  employee: 'Employees',
  order: 'Orders',
  asset: 'Assets',
  client: 'Clients',
  platform: 'Platforms',
  document: 'Documents',
  invoice: 'Invoices',
  attendance: 'Attendance',
  incident: 'Incidents',
  payroll: 'Payroll',
};

// ============================================================================
// IMPORT TEMPLATES
// ============================================================================

/**
 * Get import template for an entity type.
 */
export function getImportTemplate(entityType: ImportEntityType): ImportTemplate {
  switch (entityType) {
    case 'employee':
      return {
        entityType: 'employee',
        name: 'Employee Import Template',
        description: 'Template for importing employee data',
        columns: [
          { name: 'employee_number', label: 'Employee Number', type: 'string', required: true, maxLength: 20 },
          { name: 'full_name', label: 'Full Name', type: 'string', required: true, maxLength: 100 },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'phone', label: 'Phone', type: 'phone', required: false },
          { name: 'role', label: 'Role', type: 'enum', required: true, enumValues: ['admin', 'rider', 'supervisor', 'hr'] },
          { name: 'status', label: 'Status', type: 'enum', required: false, enumValues: ['active', 'inactive', 'onboarding'] },
          { name: 'nationality', label: 'Nationality', type: 'string', required: false },
          { name: 'date_of_birth', label: 'Date of Birth', type: 'date', required: false },
          { name: 'hired_at', label: 'Hire Date', type: 'date', required: false },
          { name: 'emergency_contact_name', label: 'Emergency Contact Name', type: 'string', required: false },
          { name: 'emergency_contact_phone', label: 'Emergency Contact Phone', type: 'phone', required: false },
        ],
        sampleData: [
          {
            employee_number: 'EMP001',
            full_name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '+971501234567',
            role: 'rider',
            status: 'active',
            nationality: 'UAE',
            date_of_birth: '1990-01-15',
            hired_at: '2024-01-01',
            emergency_contact_name: 'Jane Doe',
            emergency_contact_phone: '+971507654321',
          },
        ],
      };
    
    case 'asset':
      return {
        entityType: 'asset',
        name: 'Asset Import Template',
        description: 'Template for importing asset data',
        columns: [
          { name: 'asset_number', label: 'Asset Number', type: 'string', required: true, maxLength: 20 },
          { name: 'name', label: 'Name', type: 'string', required: true, maxLength: 100 },
          { name: 'category', label: 'Category', type: 'enum', required: true, enumValues: ['vehicle', 'equipment', 'device'] },
          { name: 'brand', label: 'Brand', type: 'string', required: false },
          { name: 'model', label: 'Model', type: 'string', required: false },
          { name: 'license_plate', label: 'License Plate', type: 'string', required: false },
          { name: 'purchase_date', label: 'Purchase Date', type: 'date', required: false },
          { name: 'purchase_price', label: 'Purchase Price', type: 'number', required: false },
          { name: 'status', label: 'Status', type: 'enum', required: false, enumValues: ['available', 'assigned', 'maintenance', 'retired'] },
        ],
        sampleData: [
          {
            asset_number: 'VEH001',
            name: 'Honda PCX 2024',
            category: 'vehicle',
            brand: 'Honda',
            model: 'PCX 160',
            license_plate: 'DXB-12345',
            purchase_date: '2024-01-15',
            purchase_price: '12000',
            status: 'available',
          },
        ],
      };
    
    case 'client':
      return {
        entityType: 'client',
        name: 'Client Import Template',
        description: 'Template for importing client (billing) data',
        columns: [
          { name: 'name', label: 'Company Name', type: 'string', required: true, maxLength: 100 },
          { name: 'email', label: 'Email', type: 'email', required: false },
          { name: 'phone', label: 'Phone', type: 'phone', required: false },
          { name: 'address', label: 'Address', type: 'string', required: false },
          { name: 'tax_number', label: 'Tax Number', type: 'string', required: false },
          { name: 'billing_cycle', label: 'Billing Cycle', type: 'enum', required: false, enumValues: ['weekly', 'biweekly', 'monthly'] },
          { name: 'payment_terms_days', label: 'Payment Terms (Days)', type: 'number', required: false },
        ],
        sampleData: [
          {
            name: 'ABC Restaurant',
            email: 'billing@abcrestaurant.com',
            phone: '+971501234567',
            address: 'Dubai Marina, Dubai',
            tax_number: 'TRN123456',
            billing_cycle: 'monthly',
            payment_terms_days: '30',
          },
        ],
      };
    
    case 'platform':
      return {
        entityType: 'platform',
        name: 'Platform Import Template',
        description: 'Template for importing delivery platform data',
        columns: [
          { name: 'name', label: 'Platform Name', type: 'string', required: true, maxLength: 50 },
          { name: 'code', label: 'Platform Code', type: 'string', required: true, maxLength: 10 },
          { name: 'commission_rate', label: 'Commission Rate', type: 'number', required: false },
          { name: 'contact_email', label: 'Contact Email', type: 'email', required: false },
          { name: 'contact_phone', label: 'Contact Phone', type: 'phone', required: false },
          { name: 'is_active', label: 'Active', type: 'boolean', required: false },
        ],
        sampleData: [
          {
            name: 'Talabat',
            code: 'TAL',
            commission_rate: '15',
            contact_email: 'partner@talabat.com',
            contact_phone: '+971800825228',
            is_active: 'true',
          },
        ],
      };
    
    case 'order':
      return {
        entityType: 'order',
        name: 'Order Import Template',
        description: 'Template for importing historical order data',
        columns: [
          { name: 'order_number', label: 'Order Number', type: 'string', required: true },
          { name: 'platform_code', label: 'Platform Code', type: 'string', required: true },
          { name: 'customer_name', label: 'Customer Name', type: 'string', required: false },
          { name: 'customer_phone', label: 'Customer Phone', type: 'phone', required: false },
          { name: 'pickup_address', label: 'Pickup Address', type: 'string', required: true },
          { name: 'delivery_address', label: 'Delivery Address', type: 'string', required: true },
          { name: 'order_value', label: 'Order Value', type: 'number', required: false },
          { name: 'rider_employee_number', label: 'Rider Employee #', type: 'string', required: false },
          { name: 'status', label: 'Status', type: 'enum', required: false, enumValues: ['pending', 'assigned', 'delivered', 'cancelled'] },
          { name: 'created_at', label: 'Order Date', type: 'date', required: false },
        ],
        sampleData: [
          {
            order_number: 'ORD-2024-001',
            platform_code: 'TAL',
            customer_name: 'Ahmed Ali',
            customer_phone: '+971501234567',
            pickup_address: 'Restaurant ABC, Downtown Dubai',
            delivery_address: 'Marina Tower 5, Apt 1201',
            order_value: '85.50',
            rider_employee_number: 'EMP001',
            status: 'delivered',
            created_at: '2024-01-15',
          },
        ],
      };
    
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

/**
 * Generate template CSV content.
 */
export function generateTemplateCSV(entityType: ImportEntityType): string {
  const template = getImportTemplate(entityType);
  
  // Header row
  const headers = template.columns.map(c => c.name);
  
  // Sample data rows
  const rows = template.sampleData.map(row => 
    headers.map(h => row[h] || '').join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

// ============================================================================
// IMPORT VALIDATION
// ============================================================================

/**
 * Validate import data.
 */
export function validateImportData(
  entityType: ImportEntityType,
  rows: Record<string, string>[]
): ParsedImportRow[] {
  const template = getImportTemplate(entityType);
  const results: ParsedImportRow[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: ValidationError[] = [];
    const data: Record<string, unknown> = {};
    
    for (const column of template.columns) {
      const value = row[column.name]?.trim() || '';
      
      // Required check
      if (column.required && !value) {
        errors.push({
          row: i + 2, // Account for header row
          field: column.name,
          value,
          error: `${column.label} is required`,
        });
        continue;
      }
      
      if (!value) {
        data[column.name] = null;
        continue;
      }
      
      // Type validation
      switch (column.type) {
        case 'email':
          if (!isValidEmail(value)) {
            errors.push({
              row: i + 2,
              field: column.name,
              value,
              error: 'Invalid email format',
            });
          } else {
            data[column.name] = value.toLowerCase();
          }
          break;
        
        case 'phone':
          if (!isValidPhone(value)) {
            errors.push({
              row: i + 2,
              field: column.name,
              value,
              error: 'Invalid phone format',
            });
          } else {
            data[column.name] = value;
          }
          break;
        
        case 'number':
          const num = parseFloat(value);
          if (isNaN(num)) {
            errors.push({
              row: i + 2,
              field: column.name,
              value,
              error: 'Invalid number format',
            });
          } else {
            data[column.name] = num;
          }
          break;
        
        case 'date':
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push({
              row: i + 2,
              field: column.name,
              value,
              error: 'Invalid date format (use YYYY-MM-DD)',
            });
          } else {
            data[column.name] = date.toISOString().slice(0, 10);
          }
          break;
        
        case 'boolean':
          const boolValue = value.toLowerCase();
          if (!['true', 'false', '1', '0', 'yes', 'no'].includes(boolValue)) {
            errors.push({
              row: i + 2,
              field: column.name,
              value,
              error: 'Invalid boolean (use true/false)',
            });
          } else {
            data[column.name] = ['true', '1', 'yes'].includes(boolValue);
          }
          break;
        
        case 'enum':
          if (column.enumValues && !column.enumValues.includes(value.toLowerCase())) {
            errors.push({
              row: i + 2,
              field: column.name,
              value,
              error: `Invalid value. Must be one of: ${column.enumValues.join(', ')}`,
            });
          } else {
            data[column.name] = value.toLowerCase();
          }
          break;
        
        default:
          // String validation
          if (column.maxLength && value.length > column.maxLength) {
            errors.push({
              row: i + 2,
              field: column.name,
              value,
              error: `Exceeds maximum length of ${column.maxLength}`,
            });
          } else if (column.pattern && !new RegExp(column.pattern).test(value)) {
            errors.push({
              row: i + 2,
              field: column.name,
              value,
              error: 'Invalid format',
            });
          } else {
            data[column.name] = value;
          }
      }
    }
    
    results.push({
      rowNumber: i + 2,
      data,
      errors,
      isValid: errors.length === 0,
    });
  }
  
  return results;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return /^\+?[\d\s-]{8,15}$/.test(phone);
}

// ============================================================================
// IMPORT OPERATIONS
// ============================================================================

/**
 * Create an import job.
 */
export async function createImportJob(input: {
  entityType: ImportEntityType;
  fileName: string;
  fileSize: number;
  totalRows: number;
  userId: string;
}): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('import_jobs')
    .insert({
      entity_type: input.entityType,
      file_name: input.fileName,
      file_size: input.fileSize,
      status: 'pending',
      total_rows: input.totalRows,
      valid_rows: 0,
      invalid_rows: 0,
      imported_rows: 0,
      validation_errors: [],
      created_by: input.userId,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, jobId: data.id };
}

/**
 * Process import job.
 */
export async function processImportJob(
  jobId: string,
  parsedRows: ParsedImportRow[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Get job
  const { data: job } = await supabase
    .from('import_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  
  if (!job) {
    return { success: false, error: 'Import job not found' };
  }
  
  // Update status to validating
  await supabase
    .from('import_jobs')
    .update({ status: 'validating' })
    .eq('id', jobId);
  
  const validRows = parsedRows.filter(r => r.isValid);
  const invalidRows = parsedRows.filter(r => !r.isValid);
  const allErrors = parsedRows.flatMap(r => r.errors);
  
  // Update validation results
  await supabase
    .from('import_jobs')
    .update({
      status: 'importing',
      valid_rows: validRows.length,
      invalid_rows: invalidRows.length,
      validation_errors: allErrors,
    })
    .eq('id', jobId);
  
  if (validRows.length === 0) {
    await supabase
      .from('import_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    return { success: false, error: 'No valid rows to import' };
  }
  
  // Import valid rows
  const tableName = getTableName(job.entity_type);
  let importedCount = 0;
  
  for (const row of validRows) {
    const { error } = await supabase
      .from(tableName)
      .insert(row.data);
    
    if (!error) {
      importedCount++;
    }
  }
  
  // Update completion
  await supabase
    .from('import_jobs')
    .update({
      status: 'completed',
      imported_rows: importedCount,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);
  
  return { success: true };
}

/**
 * Get import job.
 */
export async function getImportJob(jobId: string): Promise<ImportJob | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('import_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  
  if (!data) return null;
  
  return {
    id: data.id,
    entityType: data.entity_type as ImportEntityType,
    fileName: data.file_name,
    fileSize: data.file_size,
    status: data.status as ImportStatus,
    totalRows: data.total_rows,
    validRows: data.valid_rows,
    invalidRows: data.invalid_rows,
    importedRows: data.imported_rows,
    validationErrors: data.validation_errors as ValidationError[],
    createdBy: data.created_by,
    createdAt: data.created_at,
    completedAt: data.completed_at,
  };
}

/**
 * Get import jobs.
 */
export async function getImportJobs(
  userId: string,
  limit: number = 20
): Promise<ImportJob[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('import_jobs')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return (data || []).map(j => ({
    id: j.id,
    entityType: j.entity_type as ImportEntityType,
    fileName: j.file_name,
    fileSize: j.file_size,
    status: j.status as ImportStatus,
    totalRows: j.total_rows,
    validRows: j.valid_rows,
    invalidRows: j.invalid_rows,
    importedRows: j.imported_rows,
    validationErrors: j.validation_errors as ValidationError[],
    createdBy: j.created_by,
    createdAt: j.created_at,
    completedAt: j.completed_at,
  }));
}

// ============================================================================
// EXPORT OPERATIONS
// ============================================================================

/**
 * Create an export job.
 */
export async function createExportJob(input: {
  entityType: ExportEntityType;
  format: ExportFormat;
  filters?: Record<string, unknown>;
  columns?: string[];
  userId: string;
}): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('export_jobs')
    .insert({
      entity_type: input.entityType,
      format: input.format,
      filters: input.filters || {},
      columns: input.columns || [],
      status: 'pending',
      created_by: input.userId,
    })
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Start processing
  processExportJob(data.id);
  
  return { success: true, jobId: data.id };
}

/**
 * Process export job.
 */
async function processExportJob(jobId: string): Promise<void> {
  const supabase = createClient();
  
  // Get job
  const { data: job } = await supabase
    .from('export_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  
  if (!job) return;
  
  // Update status
  await supabase
    .from('export_jobs')
    .update({ status: 'processing' })
    .eq('id', jobId);
  
  try {
    // Get data based on entity type
    const tableName = getExportTableName(job.entity_type);
    const { data, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' });
    
    // Generate file (placeholder - in production would create actual file)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const fileUrl = `/api/exports/${jobId}.${job.format}`;
    
    await supabase
      .from('export_jobs')
      .update({
        status: 'completed',
        total_rows: count,
        file_url: fileUrl,
        expires_at: expiresAt,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  } catch {
    await supabase
      .from('export_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}

/**
 * Get export job.
 */
export async function getExportJob(jobId: string): Promise<ExportJob | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('export_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  
  if (!data) return null;
  
  return {
    id: data.id,
    entityType: data.entity_type as ExportEntityType,
    format: data.format as ExportFormat,
    filters: data.filters,
    columns: data.columns,
    status: data.status,
    totalRows: data.total_rows,
    fileUrl: data.file_url,
    expiresAt: data.expires_at,
    createdBy: data.created_by,
    createdAt: data.created_at,
    completedAt: data.completed_at,
  };
}

/**
 * Get export jobs.
 */
export async function getExportJobs(
  userId: string,
  limit: number = 20
): Promise<ExportJob[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('export_jobs')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return (data || []).map(j => ({
    id: j.id,
    entityType: j.entity_type as ExportEntityType,
    format: j.format as ExportFormat,
    filters: j.filters,
    columns: j.columns,
    status: j.status,
    totalRows: j.total_rows,
    fileUrl: j.file_url,
    expiresAt: j.expires_at,
    createdBy: j.created_by,
    createdAt: j.created_at,
    completedAt: j.completed_at,
  }));
}

/**
 * Get export columns for an entity type.
 */
export function getExportColumns(entityType: ExportEntityType): Array<{
  name: string;
  label: string;
  default: boolean;
}> {
  switch (entityType) {
    case 'employee':
      return [
        { name: 'employee_number', label: 'Employee Number', default: true },
        { name: 'full_name', label: 'Full Name', default: true },
        { name: 'email', label: 'Email', default: true },
        { name: 'phone', label: 'Phone', default: true },
        { name: 'role', label: 'Role', default: true },
        { name: 'status', label: 'Status', default: true },
        { name: 'nationality', label: 'Nationality', default: false },
        { name: 'date_of_birth', label: 'Date of Birth', default: false },
        { name: 'hired_at', label: 'Hire Date', default: true },
        { name: 'created_at', label: 'Created', default: false },
      ];
    
    case 'order':
      return [
        { name: 'order_number', label: 'Order Number', default: true },
        { name: 'platform_name', label: 'Platform', default: true },
        { name: 'customer_name', label: 'Customer', default: true },
        { name: 'customer_phone', label: 'Phone', default: false },
        { name: 'pickup_address', label: 'Pickup', default: true },
        { name: 'delivery_address', label: 'Delivery', default: true },
        { name: 'order_value', label: 'Value', default: true },
        { name: 'status', label: 'Status', default: true },
        { name: 'rider_name', label: 'Rider', default: true },
        { name: 'created_at', label: 'Order Date', default: true },
        { name: 'completed_at', label: 'Completed', default: false },
      ];
    
    case 'invoice':
      return [
        { name: 'invoice_number', label: 'Invoice Number', default: true },
        { name: 'client_name', label: 'Client', default: true },
        { name: 'total_amount', label: 'Total Amount', default: true },
        { name: 'tax_amount', label: 'Tax', default: false },
        { name: 'amount_paid', label: 'Paid', default: true },
        { name: 'amount_due', label: 'Due', default: true },
        { name: 'status', label: 'Status', default: true },
        { name: 'due_date', label: 'Due Date', default: true },
        { name: 'created_at', label: 'Created', default: true },
      ];
    
    default:
      return [];
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function getTableName(entityType: ImportEntityType): string {
  const tableMap: Record<ImportEntityType, string> = {
    employee: 'employees',
    order: 'orders',
    asset: 'assets',
    client: 'clients',
    platform: 'platforms',
  };
  return tableMap[entityType];
}

function getExportTableName(entityType: ExportEntityType): string {
  const tableMap: Record<ExportEntityType, string> = {
    employee: 'employees',
    order: 'orders',
    asset: 'assets',
    document: 'documents',
    invoice: 'invoices',
    attendance: 'attendance',
    incident: 'incidents',
    payroll: 'pay_slips',
  };
  return tableMap[entityType];
}

// ============================================================================
// SUMMARY
// ============================================================================

/**
 * Get import/export summary.
 */
export async function getImportExportSummary(
  userId: string
): Promise<{
  imports: {
    total: number;
    completed: number;
    failed: number;
    recentImports: ImportJob[];
  };
  exports: {
    total: number;
    completed: number;
    failed: number;
    recentExports: ExportJob[];
  };
}> {
  const supabase = createClient();
  
  const { data: imports } = await supabase
    .from('import_jobs')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  const { data: exports } = await supabase
    .from('export_jobs')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  const importJobs = (imports || []).map(j => ({
    id: j.id,
    entityType: j.entity_type as ImportEntityType,
    fileName: j.file_name,
    fileSize: j.file_size,
    status: j.status as ImportStatus,
    totalRows: j.total_rows,
    validRows: j.valid_rows,
    invalidRows: j.invalid_rows,
    importedRows: j.imported_rows,
    validationErrors: j.validation_errors as ValidationError[],
    createdBy: j.created_by,
    createdAt: j.created_at,
    completedAt: j.completed_at,
  }));
  
  const exportJobs = (exports || []).map(j => ({
    id: j.id,
    entityType: j.entity_type as ExportEntityType,
    format: j.format as ExportFormat,
    filters: j.filters,
    columns: j.columns,
    status: j.status,
    totalRows: j.total_rows,
    fileUrl: j.file_url,
    expiresAt: j.expires_at,
    createdBy: j.created_by,
    createdAt: j.created_at,
    completedAt: j.completed_at,
  }));
  
  return {
    imports: {
      total: importJobs.length,
      completed: importJobs.filter(j => j.status === 'completed').length,
      failed: importJobs.filter(j => j.status === 'failed').length,
      recentImports: importJobs.slice(0, 5),
    },
    exports: {
      total: exportJobs.length,
      completed: exportJobs.filter(j => j.status === 'completed').length,
      failed: exportJobs.filter(j => j.status === 'failed').length,
      recentExports: exportJobs.slice(0, 5),
    },
  };
}
