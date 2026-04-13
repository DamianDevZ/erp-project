import Link from 'next/link';
import { VendorForm } from '../VendorForm';

// Icons
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

export default function NewVendorPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/vendors" className="text-muted hover:text-heading transition-colors">
          Vendors
        </Link>
        <span className="text-muted">/</span>
        <span className="text-heading font-medium">New</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/vendors" 
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted hover:bg-hover hover:text-heading transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <TruckIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-heading">Add Vendor</h1>
            <p className="text-sm text-muted">Create a new supplier or vendor</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <VendorForm />
    </div>
  );
}
