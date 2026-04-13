import { PlatformForm } from '../PlatformForm';

/**
 * New client page.
 */
export default function NewPlatformPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-heading">Add Client</h1>
        <p className="text-muted">Add a new client.</p>
      </div>

      <PlatformForm />
    </div>
  );
}
