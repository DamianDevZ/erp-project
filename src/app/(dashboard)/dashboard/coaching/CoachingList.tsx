'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Spinner,
} from '@/components/ui';
import type { CoachingWithRelations } from '@/features/coaching';

interface CoachingListProps {
  coachings: CoachingWithRelations[];
  loading?: boolean;
}

/**
 * List component for coaching sessions with search and view.
 */
export function CoachingList({ coachings, loading }: CoachingListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCoachings = coachings.filter((coaching) => {
    const employeeName = coaching.employee?.full_name?.toLowerCase() || '';
    const employeeId = coaching.employee?.employee_id?.toLowerCase() || '';
    const notes = coaching.notes?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return employeeName.includes(search) || employeeId.includes(search) || notes.includes(search);
  });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <Input
            placeholder="Search coachings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Link href="/dashboard/coaching/new">
          <Button>
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Coaching
          </Button>
        </Link>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Notes Preview</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoachings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted">
                    {searchTerm ? 'No coaching sessions found matching your search.' : 'No coaching sessions yet. Create your first one!'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCoachings.map((coaching) => (
                  <TableRow key={coaching.id}>
                    <TableCell className="font-medium">
                      {formatDate(coaching.coaching_date)}
                    </TableCell>
                    <TableCell className="text-muted">
                      {formatTime(coaching.coaching_date)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/employees/${coaching.employee_id}`}
                        className="text-primary hover:underline"
                      >
                        {coaching.employee?.full_name || 'Unknown'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted font-mono text-sm">
                      {coaching.employee?.employee_id || '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted">
                      {coaching.notes || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/dashboard/coaching/${coaching.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
