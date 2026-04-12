import { AssetForm } from '../AssetForm';

/**
 * New asset page.
 */
export default function NewAssetPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-heading">Add Asset</h1>
        <p className="text-muted">Add a new vehicle or equipment.</p>
      </div>

      <AssetForm />
    </div>
  );
}
