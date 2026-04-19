import Link from 'next/link';
import { Button, PageHeader, PageContent } from '@/components/ui';
import { DocumentList } from './DocumentList';

/**
 * Documents list page.
 * Shows all employee documents with filtering, search, and batch upload.
 */
export default function DocumentsPage() {
  return (
    <PageContent>
      <PageHeader
        title="Document Storage"
        description="Manage employee documents and files."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Documents' },
        ]}
        actions={
          <Link href="/dashboard/documents/upload">
            <Button>Upload Documents</Button>
          </Link>
        }
      />
      <DocumentList />
    </PageContent>
  );
}
