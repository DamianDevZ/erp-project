'use client';

/**
 * Expiry Alerts & Renewals Service (T-024)
 * 
 * Tracks expiring documents, licenses, visas, certificates, and vehicle compliance.
 * Generates alerts and manages renewal workflows.
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type ExpiryItemType = 
  | 'license'
  | 'visa'
  | 'document'
  | 'vehicle_registration'
  | 'vehicle_insurance'
  | 'training_certificate'
  | 'contract'
  | 'equipment_warranty';

export type ExpiryPriority = 'critical' | 'high' | 'medium' | 'low';

export interface ExpiryItem {
  id: string;
  type: ExpiryItemType;
  entityType: 'employee' | 'asset' | 'contract';
  entityId: string;
  entityName: string;
  description: string;
  expiryDate: string;
  daysUntilExpiry: number;
  priority: ExpiryPriority;
  status: 'expired' | 'expiring' | 'valid';
  documentId?: string;
  renewalStarted?: boolean;
  renewalNotes?: string;
}

export interface ExpiryDashboard {
  expired: ExpiryItem[];
  expiringThisWeek: ExpiryItem[];
  expiringThisMonth: ExpiryItem[];
  expiringNext90Days: ExpiryItem[];
  summary: {
    totalExpired: number;
    totalExpiringThisWeek: number;
    totalExpiringThisMonth: number;
    byType: Record<ExpiryItemType, { expired: number; expiring: number }>;
  };
}

// ============================================================================
// PRIORITY CALCULATION
// ============================================================================

function calculatePriority(daysUntilExpiry: number, itemType: ExpiryItemType): ExpiryPriority {
  // Critical items (legal/compliance) have stricter thresholds
  const criticalTypes: ExpiryItemType[] = ['license', 'visa', 'vehicle_registration', 'vehicle_insurance'];
  
  if (daysUntilExpiry <= 0) return 'critical';
  
  if (criticalTypes.includes(itemType)) {
    if (daysUntilExpiry <= 7) return 'critical';
    if (daysUntilExpiry <= 14) return 'high';
    if (daysUntilExpiry <= 30) return 'medium';
    return 'low';
  }
  
  if (daysUntilExpiry <= 3) return 'high';
  if (daysUntilExpiry <= 14) return 'medium';
  return 'low';
}

function getStatus(daysUntilExpiry: number): ExpiryItem['status'] {
  if (daysUntilExpiry <= 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring';
  return 'valid';
}

// ============================================================================
// EMPLOYEE EXPIRY TRACKING
// ============================================================================

/**
 * Get all expiring items for employees (licenses, visas, documents).
 */
export async function getEmployeeExpiryItems(
  daysAhead: number = 90
): Promise<ExpiryItem[]> {
  const supabase = createClient();
  const now = new Date();
  const cutoffDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const items: ExpiryItem[] = [];

  // Get employees with expiring licenses
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, license_expiry, visa_expiry, contract_end_date')
    .eq('status', 'active')
    .or(`license_expiry.lte.${cutoffDate.toISOString()},visa_expiry.lte.${cutoffDate.toISOString()}`);

  for (const emp of employees || []) {
    if (emp.license_expiry) {
      const expiryDate = new Date(emp.license_expiry);
      const daysUntil = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil <= daysAhead) {
        items.push({
          id: `license-${emp.id}`,
          type: 'license',
          entityType: 'employee',
          entityId: emp.id,
          entityName: emp.full_name,
          description: 'Driving License',
          expiryDate: emp.license_expiry,
          daysUntilExpiry: daysUntil,
          priority: calculatePriority(daysUntil, 'license'),
          status: getStatus(daysUntil),
        });
      }
    }

    if (emp.visa_expiry) {
      const expiryDate = new Date(emp.visa_expiry);
      const daysUntil = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil <= daysAhead) {
        items.push({
          id: `visa-${emp.id}`,
          type: 'visa',
          entityType: 'employee',
          entityId: emp.id,
          entityName: emp.full_name,
          description: 'Work Visa',
          expiryDate: emp.visa_expiry,
          daysUntilExpiry: daysUntil,
          priority: calculatePriority(daysUntil, 'visa'),
          status: getStatus(daysUntil),
        });
      }
    }

    if (emp.contract_end_date) {
      const expiryDate = new Date(emp.contract_end_date);
      const daysUntil = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil <= daysAhead) {
        items.push({
          id: `contract-${emp.id}`,
          type: 'contract',
          entityType: 'employee',
          entityId: emp.id,
          entityName: emp.full_name,
          description: 'Employment Contract',
          expiryDate: emp.contract_end_date,
          daysUntilExpiry: daysUntil,
          priority: calculatePriority(daysUntil, 'contract'),
          status: getStatus(daysUntil),
        });
      }
    }
  }

  // Get expiring documents
  const { data: documents } = await supabase
    .from('employee_documents')
    .select(`
      id,
      document_type,
      expires_at,
      employee:employees(id, full_name)
    `)
    .eq('status', 'approved')
    .not('expires_at', 'is', null)
    .lte('expires_at', cutoffDate.toISOString());

  for (const doc of documents || []) {
    // Employee comes as object from single relation
    const employeeData = doc.employee as unknown;
    const employee = (Array.isArray(employeeData) ? employeeData[0] : employeeData) as { id: string; full_name: string } | null;
    if (!employee) continue;

    const expiryDate = new Date(doc.expires_at);
    const daysUntil = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    items.push({
      id: `doc-${doc.id}`,
      type: 'document',
      entityType: 'employee',
      entityId: employee.id,
      entityName: employee.full_name,
      description: `Document: ${doc.document_type.replace(/_/g, ' ')}`,
      expiryDate: doc.expires_at,
      daysUntilExpiry: daysUntil,
      priority: calculatePriority(daysUntil, 'document'),
      status: getStatus(daysUntil),
      documentId: doc.id,
    });
  }

  return items.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

// ============================================================================
// VEHICLE EXPIRY TRACKING
// ============================================================================

/**
 * Get all expiring items for vehicles (registration, insurance).
 */
export async function getVehicleExpiryItems(
  daysAhead: number = 90
): Promise<ExpiryItem[]> {
  const supabase = createClient();
  const now = new Date();
  const cutoffDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const items: ExpiryItem[] = [];

  const { data: vehicles } = await supabase
    .from('assets')
    .select('*')
    .eq('is_active', true)
    .eq('asset_type', 'vehicle')
    .or(`registration_expiry.lte.${cutoffDate.toISOString()},insurance_expiry.lte.${cutoffDate.toISOString()}`);

  for (const vehicle of vehicles || []) {
    const vehicleName = vehicle.license_plate || vehicle.asset_name || 'Unknown';

    if (vehicle.registration_expiry) {
      const expiryDate = new Date(vehicle.registration_expiry);
      const daysUntil = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil <= daysAhead) {
        items.push({
          id: `reg-${vehicle.id}`,
          type: 'vehicle_registration',
          entityType: 'asset',
          entityId: vehicle.id,
          entityName: vehicleName,
          description: 'Vehicle Registration',
          expiryDate: vehicle.registration_expiry,
          daysUntilExpiry: daysUntil,
          priority: calculatePriority(daysUntil, 'vehicle_registration'),
          status: getStatus(daysUntil),
        });
      }
    }

    if (vehicle.insurance_expiry) {
      const expiryDate = new Date(vehicle.insurance_expiry);
      const daysUntil = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil <= daysAhead) {
        items.push({
          id: `ins-${vehicle.id}`,
          type: 'vehicle_insurance',
          entityType: 'asset',
          entityId: vehicle.id,
          entityName: vehicleName,
          description: 'Vehicle Insurance',
          expiryDate: vehicle.insurance_expiry,
          daysUntilExpiry: daysUntil,
          priority: calculatePriority(daysUntil, 'vehicle_insurance'),
          status: getStatus(daysUntil),
        });
      }
    }
  }

  return items.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

// ============================================================================
// TRAINING CERTIFICATE EXPIRY
// ============================================================================

/**
 * Get expiring training certificates.
 */
export async function getTrainingExpiryItems(
  daysAhead: number = 90
): Promise<ExpiryItem[]> {
  const supabase = createClient();
  const now = new Date();
  const cutoffDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const items: ExpiryItem[] = [];

  const { data: assignments } = await supabase
    .from('training_assignments')
    .select(`
      id,
      certificate_expires_at,
      training:training_modules(name),
      employee:employees(id, full_name)
    `)
    .eq('status', 'completed')
    .not('certificate_expires_at', 'is', null)
    .lte('certificate_expires_at', cutoffDate.toISOString());

  for (const assignment of assignments || []) {
    // Relations may come as arrays from Supabase
    const employeeData = assignment.employee as unknown;
    const trainingData = assignment.training as unknown;
    const employee = (Array.isArray(employeeData) ? employeeData[0] : employeeData) as { id: string; full_name: string } | null;
    const training = (Array.isArray(trainingData) ? trainingData[0] : trainingData) as { name: string } | null;
    if (!employee) continue;

    const expiryDate = new Date(assignment.certificate_expires_at);
    const daysUntil = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    items.push({
      id: `training-${assignment.id}`,
      type: 'training_certificate',
      entityType: 'employee',
      entityId: employee.id,
      entityName: employee.full_name,
      description: `Training: ${training?.name || 'Unknown'}`,
      expiryDate: assignment.certificate_expires_at,
      daysUntilExpiry: daysUntil,
      priority: calculatePriority(daysUntil, 'training_certificate'),
      status: getStatus(daysUntil),
    });
  }

  return items.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

// ============================================================================
// COMBINED DASHBOARD
// ============================================================================

/**
 * Get complete expiry dashboard with all items.
 */
export async function getExpiryDashboard(): Promise<ExpiryDashboard> {
  const [employeeItems, vehicleItems, trainingItems] = await Promise.all([
    getEmployeeExpiryItems(90),
    getVehicleExpiryItems(90),
    getTrainingExpiryItems(90),
  ]);

  const allItems = [...employeeItems, ...vehicleItems, ...trainingItems]
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  const expired = allItems.filter(i => i.status === 'expired');
  const expiringThisWeek = allItems.filter(i => i.daysUntilExpiry > 0 && i.daysUntilExpiry <= 7);
  const expiringThisMonth = allItems.filter(i => i.daysUntilExpiry > 7 && i.daysUntilExpiry <= 30);
  const expiringNext90Days = allItems.filter(i => i.daysUntilExpiry > 30 && i.daysUntilExpiry <= 90);

  const byType: Record<ExpiryItemType, { expired: number; expiring: number }> = {
    license: { expired: 0, expiring: 0 },
    visa: { expired: 0, expiring: 0 },
    document: { expired: 0, expiring: 0 },
    vehicle_registration: { expired: 0, expiring: 0 },
    vehicle_insurance: { expired: 0, expiring: 0 },
    training_certificate: { expired: 0, expiring: 0 },
    contract: { expired: 0, expiring: 0 },
    equipment_warranty: { expired: 0, expiring: 0 },
  };

  for (const item of allItems) {
    if (item.status === 'expired') {
      byType[item.type].expired++;
    } else {
      byType[item.type].expiring++;
    }
  }

  return {
    expired,
    expiringThisWeek,
    expiringThisMonth,
    expiringNext90Days,
    summary: {
      totalExpired: expired.length,
      totalExpiringThisWeek: expiringThisWeek.length,
      totalExpiringThisMonth: expiringThisMonth.length,
      byType,
    },
  };
}

// ============================================================================
// RENEWAL WORKFLOW
// ============================================================================

export interface RenewalRequest {
  itemId: string;
  itemType: ExpiryItemType;
  entityId: string;
  notes?: string;
  requestedBy: string;
}

/**
 * Start a renewal workflow for an expiring item.
 */
export async function startRenewal(request: RenewalRequest): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // Create notification/task for renewal
  const { error } = await supabase.from('notifications').insert({
    type: 'renewal_request',
    title: `Renewal Required: ${request.itemType.replace(/_/g, ' ')}`,
    message: request.notes || `Renewal requested for ${request.itemType}`,
    target_type: request.itemType.startsWith('vehicle') ? 'asset' : 'employee',
    target_id: request.entityId,
    status: 'unread',
    created_by: request.requestedBy,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get items needing urgent attention (expired or expiring within 7 days).
 */
export async function getUrgentExpiryItems(): Promise<ExpiryItem[]> {
  const [employeeItems, vehicleItems, trainingItems] = await Promise.all([
    getEmployeeExpiryItems(7),
    getVehicleExpiryItems(7),
    getTrainingExpiryItems(7),
  ]);

  return [...employeeItems, ...vehicleItems, ...trainingItems]
    .filter(i => i.daysUntilExpiry <= 7)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

/**
 * Get expiry items for a specific employee.
 */
export async function getEmployeeExpiries(employeeId: string): Promise<ExpiryItem[]> {
  const [employeeItems, trainingItems] = await Promise.all([
    getEmployeeExpiryItems(365),
    getTrainingExpiryItems(365),
  ]);

  return [
    ...employeeItems.filter(i => i.entityId === employeeId),
    ...trainingItems.filter(i => i.entityId === employeeId),
  ].sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

/**
 * Get expiry items for a specific vehicle.
 */
export async function getVehicleExpiries(vehicleId: string): Promise<ExpiryItem[]> {
  const items = await getVehicleExpiryItems(365);
  return items.filter(i => i.entityId === vehicleId);
}
