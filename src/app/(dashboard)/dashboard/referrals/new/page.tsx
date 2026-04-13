import Link from 'next/link';
import { ReferralForm } from '../ReferralForm';

/**
 * New referral page.
 */
export default function NewReferralPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted mb-2">
          <Link href="/dashboard/referrals" className="hover:text-heading">
            Referrals
          </Link>
          <span>/</span>
          <span>New</span>
        </div>
        <h1 className="text-2xl font-bold text-heading">Add Referral</h1>
        <p className="text-muted">Add a new employee referral.</p>
      </div>

      {/* Form */}
      <ReferralForm />
    </div>
  );
}
