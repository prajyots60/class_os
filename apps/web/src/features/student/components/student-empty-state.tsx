import * as React from 'react';
import { Button } from '@coaching-os/ui';
import { UserPlus, SearchX } from 'lucide-react';

export interface StudentEmptyStateProps {
  isSearchOrFilterActive: boolean;
  canCreate: boolean;
  onAddStudentClick?: () => void;
  onResetFiltersClick?: () => void;
}

export function StudentEmptyState({
  isSearchOrFilterActive,
  canCreate,
  onAddStudentClick,
  onResetFiltersClick,
}: StudentEmptyStateProps) {
  if (isSearchOrFilterActive) {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))]"
        data-testid="student-empty-search"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--muted))] mb-4 text-[hsl(var(--muted-foreground))]">
          <SearchX className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">No students match your criteria</h3>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))] max-w-md">
          We couldn&apos;t find any student records matching your search or status filter parameters.
        </p>
        {onResetFiltersClick && (
          <Button variant="outline" size="sm" onClick={onResetFiltersClick} className="mt-4">
            Reset Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))]"
      data-testid="student-empty-state"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4 text-primary">
        <UserPlus className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">No students enrolled yet</h3>
      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))] max-w-md">
        Start managing your institute&apos;s learners by admitting your first student record into the system.
      </p>
      {canCreate && onAddStudentClick && (
        <Button onClick={onAddStudentClick} className="mt-6 gap-2">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Add Student
        </Button>
      )}
    </div>
  );
}
