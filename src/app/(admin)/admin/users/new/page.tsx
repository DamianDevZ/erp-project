import { UserForm } from '../UserForm';

/**
 * Create new user page.
 */
export default function NewUserPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Create User</h1>
        <p className="text-muted">Add a new user and assign them to an organization.</p>
      </div>

      <UserForm />
    </div>
  );
}
