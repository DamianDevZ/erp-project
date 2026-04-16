'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  Input,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Spinner,
} from '@/components/ui';
import type { 
  CoachingWithRelations, 
  CoachingType, 
  CoachingStatus, 
  CoachingOutcome 
} from '@/features/coaching';

interface CoachingListProps {
  coachings: CoachingWithRelations[];
  loading?: boolean;
}

// Type labels
const TYPE_LABELS: Record<CoachingType, string> = {
  corrective: 'Corrective',
  goal_setting: 'Goal Setting',
  performance_review: 'Performance',
  one_on_one: '1-on-1',
  training: 'Training',
  other: 'Other',
};

// Status badges
const STATUS_COLORS: Record<CoachingStatus, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  draft: 'outline',
  scheduled: 'default',
  completed: 'success',
  acknowledged: 'success',
};

const STATUS_LABELS: Record<CoachingStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  completed: 'Completed',
  acknowledged: 'Acknowledged',
};

// Outcome badges
const OUTCOME_COLORS: Record<CoachingOutcome, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  exceeded: 'success',
  met: 'success',
  needs_improvement: 'warning',
  unacceptable: 'error',
  pending: 'outline',
};

const OUTCOME_LABELS: Record<CoachingOutcome, string> = {
  exceeded: 'Exceeded',
  met: 'Met',
  needs_improvement: 'Needs Improvement',
  unacceptable: 'Unacceptable',
  pending: 'Pending',
};

/**
 * Enhanced list component for coaching sessions.
 */
export function CoachingList({ coachings, loading }: CoachingListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCoachings = coachings.filter((coaching) => {
    const employeeName = coaching.employee?.full_name?.toLowerCase() || '';
    const employeeId = coaching.employee?.employee_id?.toLowerCase() || '';
    const managerNotes = coaching.manager_notes?.toLowerCase() || '';
    const notes = coaching.notes?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return employeeName.includes(search) || employeeId.includes(search) || 
           managerNotes.includes(search) || notes.includes(search);
  });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Outcome</TableHead>
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
                    <TableCell>
                      <div className="flex flex-col">
                        <Link
                          href={`/dashboard/employees/${coaching.employee_id}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {coaching.employee?.full_name || 'Unknown'}
                        </Link>
                        {coaching.employee?.employee_id && (
                          <span className="text-xs text-muted">{coaching.employee.employee_id}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {TYPE_LABELS[coaching.coaching_type as CoachingType] || coaching.coaching_type || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[coaching.status as CoachingStatus] || 'default'}>
                        {STATUS_LABELS[coaching.status as CoachingStatus] || coaching.status || 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={OUTCOME_COLORS[coaching.outcome as CoachingOutcome] || 'outline'}>
                        {OUTCOME_LABELS[coaching.outcome as CoachingOutcome] || coaching.outcome || 'Pending'}
                      </Badge>
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
      </Card>
    </div>
  );
}
