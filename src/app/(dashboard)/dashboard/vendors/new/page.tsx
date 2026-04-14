import { VendorForm } from '../VendorForm';

export default function NewVendorPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-heading">Add Vendor</h1>
        <p className="text-muted">Create a new supplier or vendor</p>
      </div>

      {/* Form */}
      <VendorForm />
    </div>
  );
}
