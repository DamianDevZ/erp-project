'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SearchResult {
  id: string;
  type: 'employee' | 'order' | 'asset' | 'invoice';
  title: string;
  subtitle?: string;
  href: string;
}

/**
 * Global search component with command palette style.
 * Searches employees, orders, assets, invoices across the organization.
 */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut to open search (Cmd/Ctrl + K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const searchTerm = `%${query}%`;

        // Search in parallel
        const [employees, orders, assets, invoices] = await Promise.all([
          supabase
            .from('employees')
            .select('id, full_name, email, role')
            .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
            .limit(5),
          supabase
            .from('orders')
            .select('id, order_number, status, client:clients(name)')
            .or(`order_number.ilike.${searchTerm}`)
            .limit(5),
          supabase
            .from('assets')
            .select('id, name, asset_type, plate_number')
            .or(`name.ilike.${searchTerm},plate_number.ilike.${searchTerm}`)
            .limit(5),
          supabase
            .from('invoices')
            .select('id, invoice_number, title, status')
            .or(`invoice_number.ilike.${searchTerm},title.ilike.${searchTerm}`)
            .limit(5),
        ]);

        const searchResults: SearchResult[] = [];

        // Map employees
        employees.data?.forEach((emp) => {
          searchResults.push({
            id: emp.id,
            type: 'employee',
            title: emp.full_name,
            subtitle: `${emp.role} • ${emp.email || 'No email'}`,
            href: `/dashboard/employees/${emp.id}`,
          });
        });

        // Map orders
        orders.data?.forEach((order) => {
          searchResults.push({
            id: order.id,
            type: 'order',
            title: order.order_number,
            subtitle: `${(order.client as unknown as { name: string } | null)?.name || 'Unknown'} • ${order.status}`,
            href: `/dashboard/orders/${order.id}`,
          });
        });

        // Map assets
        assets.data?.forEach((asset) => {
          searchResults.push({
            id: asset.id,
            type: 'asset',
            title: asset.name || asset.plate_number || 'Unnamed',
            subtitle: `${asset.asset_type} • ${asset.plate_number || 'No plate'}`,
            href: `/dashboard/assets/${asset.id}`,
          });
        });

        // Map invoices
        invoices.data?.forEach((inv) => {
          searchResults.push({
            id: inv.id,
            type: 'invoice',
            title: inv.invoice_number || inv.title,
            subtitle: `Invoice • ${inv.status}`,
            href: `/dashboard/invoices/${inv.id}`,
          });
        });

        setResults(searchResults);
        setActiveIndex(0);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      router.push(results[activeIndex].href);
      setOpen(false);
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (resultsRef.current) {
      const activeEl = resultsRef.current.querySelector('[data-active="true"]');
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const typeIcons: Record<string, string> = {
    employee: '👤',
    order: '📦',
    asset: '🚗',
    invoice: '📄',
  };

  const typeLabels: Record<string, string> = {
    employee: 'Employee',
    order: 'Order',
    asset: 'Asset',
    invoice: 'Invoice',
  };

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-muted hover:bg-hover transition-colors"
      >
        <SearchIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-hover px-1.5 font-mono text-[10px] text-muted">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-background/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          {/* Search dialog */}
          <div
            className="w-full max-w-lg rounded-lg border border-border bg-card shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center border-b border-border px-3">
              <SearchIcon className="h-4 w-4 text-muted" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search employees, orders, assets..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent px-3 py-4 text-sm text-heading placeholder:text-muted focus:outline-none"
              />
              {loading && <Spinner />}
            </div>

            {/* Results */}
            <div ref={resultsRef} className="max-h-80 overflow-y-auto p-2">
              {query.trim() && results.length === 0 && !loading && (
                <div className="py-8 text-center text-sm text-muted">
                  No results found for "{query}"
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-1">
                  {results.map((result, i) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      data-active={activeIndex === i}
                      onClick={() => {
                        router.push(result.href);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                        activeIndex === i ? 'bg-primary/10 text-primary' : 'hover:bg-hover'
                      }`}
                    >
                      <span className="text-lg">{typeIcons[result.type]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-heading truncate">{result.title}</p>
                        <p className="text-xs text-muted truncate">{result.subtitle}</p>
                      </div>
                      <span className="text-xs text-muted">{typeLabels[result.type]}</span>
                    </button>
                  ))}
                </div>
              )}

              {!query.trim() && (
                <div className="py-8 text-center text-sm text-muted">
                  Type to search across your organization
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-3 py-2 flex items-center justify-between text-xs text-muted">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <kbd className="border border-border rounded px-1 bg-hover">↑</kbd>
                  <kbd className="border border-border rounded px-1 bg-hover">↓</kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="border border-border rounded px-1 bg-hover">↵</kbd>
                  to select
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="border border-border rounded px-1 bg-hover">esc</kbd>
                to close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-muted" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
