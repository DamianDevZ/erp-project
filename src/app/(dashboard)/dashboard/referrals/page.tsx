import Link from 'next/link';
import { Button } from '@/components/ui';
import { ReferralList } from './ReferralList';

/**
 * Referrals list page.
 * Shows all referrals with filtering and actions.
 */
export default function ReferralsPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">References & Referrals</h1>
          <p className="text-muted">Track employee referrals and hiring bonuses.</p>
        </div>
        <Link href="/dashboard/referrals/new">
          <Button>Add Referral</Button>
        </Link>
      </div>

      {/* Referral list */}
      <ReferralList />
    </div>
  );
}
