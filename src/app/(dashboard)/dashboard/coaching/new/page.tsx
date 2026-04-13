import Link from 'next/link';
import { CoachingForm } from '../CoachingForm';

/**
 * New coaching session page.
 */
export default function NewCoachingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <Link 
          href="/dashboard/coaching"
          className="inline-flex items-center text-sm text-muted hover:text-heading mb-2"
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Coaching
        </Link>
        <h1 className="text-2xl font-bold text-heading">New Coaching Session</h1>
        <p className="text-muted">Record a coaching session with an employee</p>
      </div>

      <CoachingForm />
    </div>
  );
}
