import Link from "next/link";
import { Button } from "@/components/ui";

/**
 * Landing page for non-authenticated users.
 * Shows a simple welcome message and login link.
 */
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <main className="text-center">
        <h1 className="text-4xl font-bold text-heading">ERP Platform</h1>
        <p className="mt-4 text-lg text-muted">
          Manage your workforce, assets, and invoicing in one place.
        </p>
        <div className="mt-8">
          <Link href="/login">
            <Button size="lg">Sign In</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
