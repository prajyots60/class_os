'use client';

import * as React from 'react';
import { Button, Input, Badge } from '@coaching-os/ui';
import { UserPlus, Search, Filter } from 'lucide-react';
import type { StudentAdmissionStatus, StudentStatus } from '../types/student-ui.types';

export interface StudentHeaderProps {
  totalCount: number;
  search: string;
  onSearchChange: (val: string) => void;
  admissionStatusFilter: 'all' | StudentAdmissionStatus;
  onAdmissionStatusFilterChange: (val: 'all' | StudentAdmissionStatus) => void;
  statusFilter: 'all' | StudentStatus;
  onStatusFilterChange: (val: 'all' | StudentStatus) => void;
  canCreate: boolean;
  onAddStudentClick: () => void;
}

export function StudentHeader({
  totalCount,
  search,
  onSearchChange,
  admissionStatusFilter,
  onAdmissionStatusFilterChange,
  statusFilter,
  onStatusFilterChange,
  canCreate,
  onAddStudentClick,
}: StudentHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Title & Primary Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">Students</h1>
            <Badge variant="secondary" className="px-2.5 py-0.5 font-semibold text-xs">
              {totalCount} {totalCount === 1 ? 'Student' : 'Students'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Manage student profiles, admission lifecycles, and standing statuses for your coaching institute.
          </p>
        </div>

        {canCreate && (
          <Button onClick={onAddStudentClick} data-testid="add-student-button" className="gap-2 shrink-0 self-start sm:self-auto">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Add Student
          </Button>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-[hsl(var(--card))] p-3.5 rounded-xl border border-[hsl(var(--border))]">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]"
            aria-hidden="true"
          />
          <Input
            type="text"
            placeholder="Search by name, admission no, email, or phone..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-4 h-9 text-sm"
            aria-label="Search student records"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-medium hidden sm:inline">Filters:</span>
          </div>

          {/* Admission Status Filter */}
          <select
            value={admissionStatusFilter}
            onChange={(e) => onAdmissionStatusFilterChange(e.target.value as 'all' | StudentAdmissionStatus)}
            className="h-9 px-3 text-xs rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            aria-label="Filter by Admission Status"
          >
            <option value="all">All Admission States</option>
            <option value="pending">Pending</option>
            <option value="admitted">Admitted</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Standing Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as 'all' | StudentStatus)}
            className="h-9 px-3 text-xs rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            aria-label="Filter by Standing Status"
          >
            <option value="all">All Standing States</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
    </div>
  );
}
