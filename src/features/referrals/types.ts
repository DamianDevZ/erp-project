export type ReferralStatus = 'pending' | 'contacted' | 'interviewed' | 'hired' | 'rejected' | 'not_interested';

export interface Referral {
  id: string;
  organization_id: string;
  referred_by_employee_id: string;
  referred_name: string;
  referred_phone: string;
  referred_email: string | null;
  relationship: string | null;
  position_applied: string | null;
  status: ReferralStatus;
  notes: string | null;
  bonus_amount: number | null;
  bonus_paid: boolean;
  hired_employee_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  referred_by?: {
    id: string;
    full_name: string;
    employee_id: string;
  };
  hired_employee?: {
    id: string;
    full_name: string;
    employee_id: string;
  };
}

export interface CreateReferralInput {
  referred_by_employee_id: string;
  referred_name: string;
  referred_phone: string;
  referred_email?: string;
  relationship?: string;
  position_applied?: string;
  status?: ReferralStatus;
  notes?: string;
  bonus_amount?: number;
}

export interface UpdateReferralInput extends Partial<CreateReferralInput> {
  bonus_paid?: boolean;
  hired_employee_id?: string;
}

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  pending: 'Pending Review',
  contacted: 'Contacted',
  interviewed: 'Interviewed',
  hired: 'Hired',
  rejected: 'Rejected',
  not_interested: 'Not Interested',
};
