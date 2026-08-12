import * as React from 'react';
import { Button } from '@coaching-os/ui';
import { UserCheck, Plus } from 'lucide-react';

export interface EnrollmentEmptyStateProps {
  canCreate: boolean;
  onAddClick: () => void;
  hasFilters: boolean;
  onClearFilters?: () => void;
}

export function EnrollmentEmptyState({
  canCreate,
  onAddClick,
  hasFilters,
  onClearFilters,
}: EnrollmentEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))]"
      data-testid="enrollment-empty-state"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] mb-4">
        <UserCheck className="h-6 w-6" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-1">
        {hasFilters ? 'No matching enrollments found' : 'No enrollments yet'}
      </h3>

      <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm mb-6">
        {hasFilters
          ? 'Try adjusting your search query or filter criteria to find the record you are looking for.'
          : 'Get started by enrolling admitted students into operational teaching batches.'}
      </p>

      <div className="flex items-center gap-3">
        {hasFilters && onClearFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}

        {canCreate && (
          <Button size="sm" onClick={onAddClick} data-testid="empty-add-enrollment-button" className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Enrollment
          </Button>
        )}
      </div>
    </div>
  );
}
