export type ReferralStatus = 'pending' | 'contacted' | 'interviewed' | 'hired' | 'rejected' | 'not_interested';

export interface Referral {
  id: string;
  organization_id: string;
  referrer_employee_id: string;
  referred_employee_id: string | null;
  referred_name: string;
  referred_phone: string;
  referred_email: string | null;
  status: ReferralStatus;
  notes: string | null;
  bonus_amount: number | null;
  bonus_paid_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  referrer?: {
    id: string;
    full_name: string;
    employee_id: string | null;
  };
  referred_employee?: {
    id: string;
    full_name: string;
    employee_id: string | null;
  };
}

export interface CreateReferralInput {
  referrer_employee_id: string;
  referred_name: string;
  referred_phone: string;
  referred_email?: string;
  status?: ReferralStatus;
  notes?: string;
  bonus_amount?: number;
}

export interface UpdateReferralInput extends Partial<CreateReferralInput> {
  bonus_paid_at?: string;
  referred_employee_id?: string;
}

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  pending: 'Pending Review',
  contacted: 'Contacted',
  interviewed: 'Interviewed',
  hired: 'Hired',
  rejected: 'Rejected',
  not_interested: 'Not Interested',
};
