import { ReferralForm } from '../ReferralForm';

/**
 * New referral page.
 */
export default function NewReferralPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-heading">Add Referral</h1>
        <p className="text-muted">Add a new employee referral.</p>
      </div>

      {/* Form */}
      <ReferralForm />
    </div>
  );
}
