import Link from 'next/link';
import { Button } from '@/components/ui';
import { DocumentList } from './DocumentList';

/**
 * Documents list page.
 * Shows all employee documents with filtering, search, and batch upload.
 */
export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Document Storage</h1>
          <p className="text-muted">Manage employee documents and files.</p>
        </div>
        <Link href="/dashboard/documents/upload">
          <Button>Upload Documents</Button>
        </Link>
      </div>

      {/* Document list */}
      <DocumentList />
    </div>
  );
}
