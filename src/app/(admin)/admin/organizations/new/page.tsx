import { OrganizationForm } from '../OrganizationForm';

/**
 * Create new organization page.
 */
export default function NewOrganizationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Create Organization</h1>
        <p className="text-muted">Add a new organization to the platform.</p>
      </div>

      <OrganizationForm />
    </div>
  );
}
