import { PageHeader, PageContent } from '@/components/ui';
import { AssetForm } from '../AssetForm';

/**
 * New asset page.
 */
export default function NewAssetPage() {
  return (
    <PageContent className="max-w-3xl mx-auto">
      <PageHeader
        title="Add Asset"
        description="Add a new vehicle or equipment."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Assets', href: '/dashboard/assets' },
          { label: 'New Asset' },
        ]}
      />
      <AssetForm />
    </PageContent>
  );
}
