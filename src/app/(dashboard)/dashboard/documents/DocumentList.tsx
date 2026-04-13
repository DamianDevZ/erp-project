'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  Card, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell,
  Button,
  Spinner,
  Input,
  Badge,
} from '@/components/ui';
import { 
  EmployeeDocument, 
  DocumentType, 
  DOCUMENT_TYPE_LABELS,
  getFileIcon,
} from '@/features/documents/types';

/**
 * Client component that fetches and displays documents.
 */
export function DocumentList() {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'employee'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('employee_documents')
        .select(`
          *,
          employee:employees!employee_documents_employee_id_fkey(id, full_name, employee_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('employee_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;
      fetchDocuments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete document');
    }
  }

  async function handleDownload(doc: EmployeeDocument) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download document');
    }
  }

  // Filter and sort documents
  const filteredDocuments = documents
    .filter((doc) => {
      const matchesSearch = 
        doc.file_name?.toLowerCase().includes(search.toLowerCase()) ||
        doc.employee?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        doc.employee?.employee_id?.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || doc.type === typeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.file_name.localeCompare(b.file_name);
          break;
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'employee':
          comparison = (a.employee?.full_name || '').localeCompare(b.employee?.full_name || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Check for expiring documents
  const expiringDocuments = documents.filter(doc => {
    if (!doc.expires_at) return false;
    const expiryDate = new Date(doc.expires_at);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-red-500">{error}</p>
        <Button variant="outline" onClick={fetchDocuments} className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Expiring Documents Warning */}
      {expiringDocuments.length > 0 && (
        <Card className="p-4 border-yellow-300 bg-yellow-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-medium text-yellow-800">Documents Expiring Soon</p>
              <p className="text-sm text-yellow-700">
                {expiringDocuments.length} document{expiringDocuments.length !== 1 ? 's' : ''} will expire within 30 days
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Search by name or employee..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as DocumentType | 'all')}
          className="rounded-md border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Types</option>
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split('-');
            setSortBy(field as 'name' | 'date' | 'employee');
            setSortOrder(order as 'asc' | 'desc');
          }}
          className="rounded-md border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="employee-asc">Employee (A-Z)</option>
          <option value="employee-desc">Employee (Z-A)</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted">Total Documents</p>
          <p className="text-2xl font-bold text-heading">{documents.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted">Contracts</p>
          <p className="text-2xl font-bold text-blue-600">
            {documents.filter(d => d.type === 'contract').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted">ID Documents</p>
          <p className="text-2xl font-bold text-green-600">
            {documents.filter(d => d.type === 'id_document').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted">Expiring Soon</p>
          <p className="text-2xl font-bold text-yellow-600">{expiringDocuments.length}</p>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted">
                  {search || typeFilter !== 'all'
                    ? 'No documents match your filters.'
                    : 'No documents yet. Upload your first document.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredDocuments.map((doc) => {
                const isExpiring = doc.expires_at && new Date(doc.expires_at) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                const isExpired = doc.expires_at && new Date(doc.expires_at) < new Date();
                
                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getFileIcon(doc.file_name)}</span>
                        <p className="font-medium text-heading">{doc.file_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-heading">{doc.employee?.full_name}</p>
                        <p className="text-xs text-muted">{doc.employee?.employee_id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {DOCUMENT_TYPE_LABELS[doc.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.expires_at ? (
                        <span className={`text-sm ${isExpired ? 'text-red-600' : isExpiring ? 'text-yellow-600' : 'text-muted'}`}>
                          {new Date(doc.expires_at).toLocaleDateString()}
                          {isExpired && ' (Expired)'}
                          {isExpiring && !isExpired && ' (Soon)'}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(doc)}
                        >
                          Download
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
