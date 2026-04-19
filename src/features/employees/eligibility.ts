'use client';

/**
 * Rider Eligibility Services (T-034)
 * 
 * Checks if a rider can be assigned to shifts or is blocked from working.
 * Evaluates: documents, vehicle, compliance, training, attendance.
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type BlockReason = 
  | 'license_expired'
  | 'visa_expired'
  | 'license_expiring_soon'
  | 'visa_expiring_soon'
  | 'document_missing'
  | 'document_expired'
  | 'no_vehicle_assigned'
  | 'vehicle_not_compliant'
  | 'vehicle_in_maintenance'
  | 'training_incomplete'
  | 'pending_onboarding'
  | 'inactive_status'
  | 'bank_details_missing'
  | 'contract_expired'
  | 'disciplinary_action';

export type WarnReason =
  | 'license_expiring_14d'
  | 'visa_expiring_14d'
  | 'document_expiring'
  | 'vehicle_service_due'
  | 'insurance_expiring'
  | 'poor_attendance';

export interface EligibilityResult {
  isEligible: boolean;
  isWarning: boolean;
  blocks: Array<{ reason: BlockReason; message: string; expiresAt?: string }>;
  warnings: Array<{ reason: WarnReason; message: string; expiresAt?: string }>;
  vehicleId: string | null;
  vehiclePlate: string | null;
}

export interface BulkEligibilityResult {
  employeeId: string;
  employeeName: string;
  result: EligibilityResult;
}

// ============================================================================
// MAIN ELIGIBILITY CHECK
// ============================================================================

/**
 * Check if a rider is eligible to work shifts.
 * Returns blocking reasons and warnings.
 */
export async function checkRiderEligibility(employeeId: string): Promise<EligibilityResult> {
  const supabase = createClient();
  const blocks: EligibilityResult['blocks'] = [];
  const warnings: EligibilityResult['warnings'] = [];
  const now = new Date();
  const fourteenDays = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Fetch all required data in parallel
  const [
    employeeResult,
    documentsResult,
    vehicleResult,
    trainingResult,
    attendanceResult,
  ] = await Promise.all([
    supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single(),
    supabase
      .from('employee_documents')
      .select('*')
      .eq('employee_id', employeeId),
    supabase
      .from('rider_vehicle_assignments')
      .select(`
        *,
        asset:assets(*)
      `)
      .eq('employee_id', employeeId)
      .is('end_date', null)
      .single(),
    supabase
      .from('training_assignments')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('is_mandatory', true)
      .neq('status', 'completed'),
    supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('work_date', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .eq('status', 'no_show'),
  ]);

  const employee = employeeResult.data;
  const documents = documentsResult.data || [];
  const vehicleAssignment = vehicleResult.data;
  const pendingTraining = trainingResult.data || [];
  const noShows = attendanceResult.data || [];

  if (!employee) {
    return {
      isEligible: false,
      isWarning: false,
      blocks: [{ reason: 'inactive_status', message: 'Employee not found' }],
      warnings: [],
      vehicleId: null,
      vehiclePlate: null,
    };
  }

  // ============================================
  // 1. Employee Status Checks
  // ============================================

  if (employee.status !== 'active') {
    blocks.push({
      reason: 'inactive_status',
      message: `Employee status is ${employee.status}`,
    });
  }

  if (employee.onboarding_step && employee.onboarding_step !== 'activated') {
    blocks.push({
      reason: 'pending_onboarding',
      message: `Onboarding not complete (${employee.onboarding_step})`,
    });
  }

  // ============================================
  // 2. License & Visa Checks
  // ============================================

  if (employee.license_expiry) {
    const licenseExpiry = new Date(employee.license_expiry);
    if (licenseExpiry < now) {
      blocks.push({
        reason: 'license_expired',
        message: 'Driving license has expired',
        expiresAt: employee.license_expiry,
      });
    } else if (licenseExpiry < fourteenDays) {
      warnings.push({
        reason: 'license_expiring_14d',
        message: `License expires on ${licenseExpiry.toLocaleDateString()}`,
        expiresAt: employee.license_expiry,
      });
    }
  }

  if (employee.visa_expiry) {
    const visaExpiry = new Date(employee.visa_expiry);
    if (visaExpiry < now) {
      blocks.push({
        reason: 'visa_expired',
        message: 'Work visa has expired',
        expiresAt: employee.visa_expiry,
      });
    } else if (visaExpiry < fourteenDays) {
      warnings.push({
        reason: 'visa_expiring_14d',
        message: `Visa expires on ${visaExpiry.toLocaleDateString()}`,
        expiresAt: employee.visa_expiry,
      });
    }
  }

  // ============================================
  // 3. Document Checks
  // ============================================

  const requiredDocTypes = ['cpr_id', 'driving_license', 'visa'];
  const uploadedDocTypes = new Set(documents.map(d => d.document_type));

  for (const docType of requiredDocTypes) {
    if (!uploadedDocTypes.has(docType)) {
      blocks.push({
        reason: 'document_missing',
        message: `Required document missing: ${docType.replace('_', ' ')}`,
      });
    }
  }

  for (const doc of documents) {
    if (doc.status === 'rejected') {
      blocks.push({
        reason: 'document_missing',
        message: `Document rejected: ${doc.document_type}`,
      });
    }

    if (doc.expires_at) {
      const expiryDate = new Date(doc.expires_at);
      if (expiryDate < now) {
        blocks.push({
          reason: 'document_expired',
          message: `${doc.document_type} document has expired`,
          expiresAt: doc.expires_at,
        });
      } else if (expiryDate < thirtyDays) {
        warnings.push({
          reason: 'document_expiring',
          message: `${doc.document_type} expires on ${expiryDate.toLocaleDateString()}`,
          expiresAt: doc.expires_at,
        });
      }
    }
  }

  // ============================================
  // 4. Bank Details Check
  // ============================================

  if (!employee.bank_name || !employee.bank_account_number) {
    blocks.push({
      reason: 'bank_details_missing',
      message: 'Bank account details required for payroll',
    });
  }

  // ============================================
  // 5. Vehicle Checks (for company vehicle riders)
  // ============================================

  let vehicleId: string | null = null;
  let vehiclePlate: string | null = null;

  if (employee.rider_category === 'company_vehicle_rider') {
    if (!vehicleAssignment) {
      blocks.push({
        reason: 'no_vehicle_assigned',
        message: 'No vehicle assigned to rider',
      });
    } else {
      const vehicle = vehicleAssignment.asset;
      vehicleId = vehicle?.id;
      vehiclePlate = vehicle?.license_plate;

      if (vehicle) {
        // Check vehicle compliance
        if (vehicle.compliance_status === 'non_compliant' || vehicle.compliance_status === 'blocked') {
          blocks.push({
            reason: 'vehicle_not_compliant',
            message: `Vehicle ${vehicle.license_plate} is not compliant`,
          });
        }

        // Check vehicle status
        if (vehicle.vehicle_status === 'maintenance' || vehicle.vehicle_status === 'off_road') {
          blocks.push({
            reason: 'vehicle_in_maintenance',
            message: `Vehicle ${vehicle.license_plate} is ${vehicle.vehicle_status}`,
          });
        }

        // Check vehicle registration expiry
        if (vehicle.registration_expiry) {
          const regExpiry = new Date(vehicle.registration_expiry);
          if (regExpiry < now) {
            blocks.push({
              reason: 'vehicle_not_compliant',
              message: `Vehicle registration expired`,
              expiresAt: vehicle.registration_expiry,
            });
          }
        }

        // Check vehicle insurance expiry
        if (vehicle.insurance_expiry) {
          const insExpiry = new Date(vehicle.insurance_expiry);
          if (insExpiry < now) {
            blocks.push({
              reason: 'vehicle_not_compliant',
              message: `Vehicle insurance expired`,
              expiresAt: vehicle.insurance_expiry,
            });
          } else if (insExpiry < fourteenDays) {
            warnings.push({
              reason: 'insurance_expiring',
              message: `Vehicle insurance expires on ${insExpiry.toLocaleDateString()}`,
              expiresAt: vehicle.insurance_expiry,
            });
          }
        }

        // Check if service is due
        if (vehicle.next_service_date) {
          const serviceDate = new Date(vehicle.next_service_date);
          if (serviceDate < now) {
            warnings.push({
              reason: 'vehicle_service_due',
              message: 'Vehicle service is overdue',
            });
          }
        }
      }
    }
  } else if (employee.rider_category === 'own_vehicle_rider') {
    // Check rider's own vehicle
    const { data: ownVehicle } = await supabase
      .from('assets')
      .select('*')
      .eq('owner_employee_id', employeeId)
      .eq('ownership', 'employee_owned')
      .eq('is_active', true)
      .single();

    if (!ownVehicle) {
      blocks.push({
        reason: 'no_vehicle_assigned',
        message: 'Own vehicle not registered or approved',
      });
    } else {
      vehicleId = ownVehicle.id;
      vehiclePlate = ownVehicle.license_plate;

      if (ownVehicle.compliance_status === 'non_compliant' || ownVehicle.compliance_status === 'blocked') {
        blocks.push({
          reason: 'vehicle_not_compliant',
          message: 'Own vehicle compliance issues',
        });
      }
    }
  }

  // ============================================
  // 6. Training Checks
  // ============================================

  if (pendingTraining.length > 0) {
    blocks.push({
      reason: 'training_incomplete',
      message: `${pendingTraining.length} mandatory training(s) not completed`,
    });
  }

  // ============================================
  // 7. Attendance/Discipline Warnings
  // ============================================

  if (noShows.length >= 3) {
    warnings.push({
      reason: 'poor_attendance',
      message: `${noShows.length} no-shows in the last 30 days`,
    });
  }

  return {
    isEligible: blocks.length === 0,
    isWarning: warnings.length > 0,
    blocks,
    warnings,
    vehicleId,
    vehiclePlate,
  };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Check eligibility for multiple riders (for shift planning).
 */
export async function checkBulkRiderEligibility(
  employeeIds: string[]
): Promise<BulkEligibilityResult[]> {
  const results: BulkEligibilityResult[] = [];

  // Process in batches to avoid overwhelming the database
  const batchSize = 10;
  for (let i = 0; i < employeeIds.length; i += batchSize) {
    const batch = employeeIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (id) => {
        const result = await checkRiderEligibility(id);
        return { employeeId: id, result };
      })
    );
    results.push(...batchResults.map(r => ({ ...r, employeeName: '' })));
  }

  // Fetch employee names
  const supabase = createClient();
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name')
    .in('id', employeeIds);

  const nameMap = new Map(employees?.map(e => [e.id, e.full_name]) || []);
  results.forEach(r => {
    r.employeeName = nameMap.get(r.employeeId) || 'Unknown';
  });

  return results;
}

/**
 * Get all blocked riders with their reasons.
 */
export async function getBlockedRiders(): Promise<BulkEligibilityResult[]> {
  const supabase = createClient();

  // Get all active riders
  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .eq('role', 'rider')
    .eq('status', 'active');

  if (!employees?.length) return [];

  const results = await checkBulkRiderEligibility(employees.map(e => e.id));
  return results.filter(r => !r.result.isEligible);
}

/**
 * Get riders with warnings (eligible but have issues).
 */
export async function getRidersWithWarnings(): Promise<BulkEligibilityResult[]> {
  const supabase = createClient();

  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .eq('role', 'rider')
    .eq('status', 'active');

  if (!employees?.length) return [];

  const results = await checkBulkRiderEligibility(employees.map(e => e.id));
  return results.filter(r => r.result.isEligible && r.result.isWarning);
}

// ============================================================================
// SHIFT-SPECIFIC ELIGIBILITY
// ============================================================================

/**
 * Check if a rider can work a specific shift.
 * Adds shift-specific checks on top of general eligibility.
 */
export async function checkShiftEligibility(
  employeeId: string,
  shiftId: string
): Promise<EligibilityResult> {
  const supabase = createClient();
  
  // Start with general eligibility
  const result = await checkRiderEligibility(employeeId);

  // Fetch shift details
  const { data: shift } = await supabase
    .from('shifts')
    .select('*')
    .eq('id', shiftId)
    .single();

  if (!shift) {
    result.blocks.push({
      reason: 'inactive_status',
      message: 'Shift not found',
    });
    result.isEligible = false;
    return result;
  }

  // Check if rider is already assigned to another shift at the same time
  const { data: existingAssignments } = await supabase
    .from('shift_assignments')
    .select('*, shift:shifts(*)')
    .eq('employee_id', employeeId)
    .neq('shift_id', shiftId);

  const overlappingShift = existingAssignments?.find(assignment => {
    const s = assignment.shift;
    if (!s) return false;

    // Check date overlap
    if (s.shift_date !== shift.shift_date) return false;

    // Check time overlap
    const newStart = shift.start_time;
    const newEnd = shift.end_time;
    const existStart = s.start_time;
    const existEnd = s.end_time;

    return newStart < existEnd && existStart < newEnd;
  });

  if (overlappingShift) {
    result.blocks.push({
      reason: 'inactive_status',
      message: 'Already assigned to overlapping shift',
    });
    result.isEligible = false;
  }

  // Check if rider has required rest time (8 hours between shifts)
  const shiftDate = new Date(`${shift.shift_date}T${shift.start_time}`);
  const { data: recentShifts } = await supabase
    .from('shift_assignments')
    .select('*, shift:shifts(*)')
    .eq('employee_id', employeeId)
    .eq('status', 'completed');

  const tooSoon = recentShifts?.some(assignment => {
    const s = assignment.shift;
    if (!s) return false;
    const endTime = new Date(`${s.shift_date}T${s.end_time}`);
    const hoursSince = (shiftDate.getTime() - endTime.getTime()) / (1000 * 60 * 60);
    return hoursSince > 0 && hoursSince < 8;
  });

  if (tooSoon) {
    result.warnings.push({
      reason: 'poor_attendance',
      message: 'Less than 8 hours since last shift',
    });
    result.isWarning = true;
  }

  return result;
}

// ============================================================================
// ELIGIBILITY SUMMARY FOR DASHBOARD
// ============================================================================

export interface EligibilitySummary {
  totalRiders: number;
  eligibleRiders: number;
  blockedRiders: number;
  ridersWithWarnings: number;
  topBlockReasons: Array<{ reason: BlockReason; count: number }>;
  topWarnReasons: Array<{ reason: WarnReason; count: number }>;
}

/**
 * Get summary of rider eligibility for dashboard.
 */
export async function getEligibilitySummary(): Promise<EligibilitySummary> {
  const supabase = createClient();

  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .eq('role', 'rider')
    .eq('status', 'active');

  if (!employees?.length) {
    return {
      totalRiders: 0,
      eligibleRiders: 0,
      blockedRiders: 0,
      ridersWithWarnings: 0,
      topBlockReasons: [],
      topWarnReasons: [],
    };
  }

  const results = await checkBulkRiderEligibility(employees.map(e => e.id));

  const blockReasonCounts: Record<BlockReason, number> = {} as Record<BlockReason, number>;
  const warnReasonCounts: Record<WarnReason, number> = {} as Record<WarnReason, number>;

  let eligible = 0;
  let blocked = 0;
  let warnings = 0;

  for (const r of results) {
    if (r.result.isEligible) {
      eligible++;
      if (r.result.isWarning) warnings++;
    } else {
      blocked++;
    }

    for (const b of r.result.blocks) {
      blockReasonCounts[b.reason] = (blockReasonCounts[b.reason] || 0) + 1;
    }
    for (const w of r.result.warnings) {
      warnReasonCounts[w.reason] = (warnReasonCounts[w.reason] || 0) + 1;
    }
  }

  const topBlockReasons = Object.entries(blockReasonCounts)
    .map(([reason, count]) => ({ reason: reason as BlockReason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topWarnReasons = Object.entries(warnReasonCounts)
    .map(([reason, count]) => ({ reason: reason as WarnReason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalRiders: results.length,
    eligibleRiders: eligible,
    blockedRiders: blocked,
    ridersWithWarnings: warnings,
    topBlockReasons,
    topWarnReasons,
  };
}
