import { PlatformForm } from '../PlatformForm';

/**
 * New platform page.
 */
export default function NewPlatformPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-heading">Add Platform</h1>
        <p className="text-muted">Add a new delivery platform.</p>
      </div>

      <PlatformForm />
    </div>
  );
}
