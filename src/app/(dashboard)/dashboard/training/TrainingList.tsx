'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, SortableTableHead, type SortDirection } from '@/components/ui';
import {
  type TrainingCourse,
  type EmployeeTraining,
  type TrainingType,
  type TrainingStatus,
  TRAINING_TYPE_LABELS,
  TRAINING_TYPE_COLORS,
  TRAINING_STATUS_LABELS,
  TRAINING_STATUS_COLORS,
  TRAINING_DELIVERY_LABELS,
} from '@/features/training';

interface TrainingListProps {
  courses: TrainingCourse[];
  trainings: EmployeeTraining[];
}

// Icons
function MagnifyingGlassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function FolderOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

type TabType = 'courses' | 'assignments';

/**
 * Training list component with tabs for courses and assignments.
 */
export function TrainingList({ courses, trainings }: TrainingListProps) {
  const [activeTab, setActiveTab] = useState<TabType>('assignments');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TrainingType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TrainingStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<string | null>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc');
      if (sortDirection === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Filter trainings
  const filteredTrainings = trainings
    .filter((training) => {
      if (search) {
        const searchLower = search.toLowerCase();
        const employeeName = training.employee?.full_name?.toLowerCase() ?? '';
        const courseName = training.course?.name?.toLowerCase() || '';
        if (!employeeName.includes(searchLower) && !courseName.includes(searchLower)) {
          return false;
        }
      }
      if (typeFilter !== 'all' && training.course?.type !== typeFilter) return false;
      if (statusFilter !== 'all' && training.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (!sortKey || !sortDirection) return 0;
      
      let aVal: string | number | null | undefined;
      let bVal: string | number | null | undefined;
      
      if (sortKey === 'employee') {
        aVal = a.employee?.full_name;
        bVal = b.employee?.full_name;
      } else if (sortKey === 'course') {
        aVal = a.course?.name;
        bVal = b.course?.name;
      } else if (sortKey === 'type') {
        aVal = a.course?.type;
        bVal = b.course?.type;
      } else {
        aVal = a[sortKey as keyof EmployeeTraining] as string | number | null | undefined;
        bVal = b[sortKey as keyof EmployeeTraining] as string | number | null | undefined;
      }
      
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  // Filter courses
  const filteredCourses = courses
    .filter((course) => {
      if (search) {
        const searchLower = search.toLowerCase();
        if (!course.name.toLowerCase().includes(searchLower) && 
            !course.provider?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      if (typeFilter !== 'all' && course.type !== typeFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (!sortKey || !sortDirection) return 0;
      
      let aVal = a[sortKey as keyof TrainingCourse];
      let bVal = b[sortKey as keyof TrainingCourse];
      
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'assignments'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted hover:text-heading'
            }`}
          >
            Employee Training ({trainings.length})
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'courses'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted hover:text-heading'
            }`}
          >
            Course Catalog ({courses.filter(c => c.is_active).length})
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            type="search"
            placeholder={activeTab === 'assignments' 
              ? "Search by employee or course name..." 
              : "Search courses..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TrainingType | 'all')}
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Types</option>
            {Object.entries(TRAINING_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {activeTab === 'assignments' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TrainingStatus | 'all')}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              {Object.entries(TRAINING_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'assignments' ? (
        // Assignments Table
        filteredTrainings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-background-subtle">
              <FolderOpenIcon className="h-8 w-8 text-muted" />
            </div>
            <h3 className="text-lg font-medium text-heading">No training assignments found</h3>
            <p className="mt-1 text-sm text-muted">
              {search || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Assign training to employees to get started'
              }
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="employee" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Employee</SortableTableHead>
                <SortableTableHead sortKey="course" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Course</SortableTableHead>
                <SortableTableHead sortKey="type" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Type</SortableTableHead>
                <SortableTableHead sortKey="status" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Status</SortableTableHead>
                <SortableTableHead sortKey="due_date" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Due Date</SortableTableHead>
                <SortableTableHead sortKey="completed_at" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Completed</SortableTableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrainings.map((training) => {
                const isOverdue = training.due_date && 
                  new Date(training.due_date) < new Date() && 
                  training.status !== 'completed';
                
                return (
                  <TableRow key={training.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-heading">
                          {training.employee?.full_name}
                        </div>
                        {training.employee?.employee_id && (
                          <div className="text-xs text-muted">{training.employee.employee_id}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-heading">{training.course?.name}</div>
                      {training.course?.provider && (
                        <div className="text-xs text-muted">{training.course.provider}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {training.course && (
                        <Badge className={TRAINING_TYPE_COLORS[training.course.type]}>
                          {TRAINING_TYPE_LABELS[training.course.type]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={TRAINING_STATUS_COLORS[training.status]}>
                        {TRAINING_STATUS_LABELS[training.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {training.due_date ? (
                        <span className={isOverdue ? 'text-red-600 font-medium' : 'text-heading'}>
                          {new Date(training.due_date).toLocaleDateString()}
                          {isOverdue && ' (Overdue)'}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {training.completed_at ? (
                        <div className="flex items-center gap-2">
                          <CheckIcon className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-heading">
                            {new Date(training.completed_at).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/training/assignments/${training.id}/edit`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-heading transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )
      ) : (
        // Courses Table
        filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-background-subtle">
              <FolderOpenIcon className="h-8 w-8 text-muted" />
            </div>
            <h3 className="text-lg font-medium text-heading">No courses found</h3>
            <p className="mt-1 text-sm text-muted">
              {search || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create training courses to get started'
              }
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="name" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Course Name</SortableTableHead>
                <SortableTableHead sortKey="type" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Type</SortableTableHead>
                <SortableTableHead sortKey="delivery_method" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Delivery</SortableTableHead>
                <SortableTableHead sortKey="duration_hours" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Duration</SortableTableHead>
                <SortableTableHead sortKey="provider" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Provider</SortableTableHead>
                <SortableTableHead sortKey="is_active" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort}>Status</SortableTableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-heading">{course.name}</span>
                        {course.is_mandatory && (
                          <Badge className="bg-red-100 text-red-800 text-xs">Mandatory</Badge>
                        )}
                      </div>
                      {course.description && (
                        <div className="text-xs text-muted truncate max-w-xs">{course.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={TRAINING_TYPE_COLORS[course.type]}>
                      {TRAINING_TYPE_LABELS[course.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-heading">
                      {TRAINING_DELIVERY_LABELS[course.delivery]}
                    </span>
                  </TableCell>
                  <TableCell>
                    {course.duration_hours ? (
                      <span className="text-sm text-heading">{course.duration_hours}h</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {course.provider ? (
                      <span className="text-sm text-heading">{course.provider}</span>
                    ) : (
                      <span className="text-muted">Internal</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={course.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                    }>
                      {course.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/training/courses/${course.id}/edit`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-heading transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      )}

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <p className="text-sm text-muted">
          Showing {activeTab === 'assignments' 
            ? `${filteredTrainings.length} of ${trainings.length} assignments` 
            : `${filteredCourses.length} of ${courses.length} courses`
          }
        </p>
      </div>
    </div>
  );
}
