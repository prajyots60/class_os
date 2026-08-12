'use client';

import * as React from 'react';
import { Button, Input, Badge } from '@coaching-os/ui';
import { UserPlus, Search, Filter } from 'lucide-react';
import type { EnrollmentStatus } from '../types/enrollment-ui.types';

export interface EnrollmentHeaderProps {
  totalCount: number;
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: 'all' | EnrollmentStatus;
  onStatusFilterChange: (val: 'all' | EnrollmentStatus) => void;
  canCreate: boolean;
  onAddEnrollmentClick: () => void;
}

export function EnrollmentHeader({
  totalCount,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  canCreate,
  onAddEnrollmentClick,
}: EnrollmentHeaderProps) {
  return (
    <div className="space-y-4" data-testid="enrollment-header">
      {/* Title & Primary Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]" data-testid="enrollments-page-title">
              Enrollments
            </h1>
            <Badge variant="secondary" className="px-2.5 py-0.5 font-semibold text-xs">
              {totalCount} {totalCount === 1 ? 'Enrollment' : 'Enrollments'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Manage student batch enrollments, lifecycle transitions, and atomic transfers across operational teaching groups.
          </p>
        </div>

        {canCreate && (
          <Button
            onClick={onAddEnrollmentClick}
            data-testid="add-enrollment-button"
            className="gap-2 shrink-0 self-start sm:self-auto"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Add Enrollment
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
            placeholder="Search by student, admission no, or batch..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-4 h-9 text-sm"
            aria-label="Search enrollment records"
            data-testid="enrollment-search-input"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-medium hidden sm:inline">Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as 'all' | EnrollmentStatus)}
            className="h-9 px-3 text-xs rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            aria-label="Filter by Enrollment Status"
            data-testid="enrollment-status-filter"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="transferred">Transferred</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
    </div>
  );
}
