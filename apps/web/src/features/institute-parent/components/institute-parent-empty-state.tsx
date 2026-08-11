import * as React from 'react';
import { Card, Button } from '@coaching-os/ui';
import { Users, UserPlus } from 'lucide-react';

export interface InstituteParentEmptyStateProps {
  hasFilters: boolean;
  canCreate: boolean;
  onAddParent?: () => void;
  onClearFilters?: () => void;
}

/**
 * InstituteParentEmptyState — renders accessible empty state when no parent CRM records exist.
 */
export function InstituteParentEmptyState({
  hasFilters,
  canCreate,
  onAddParent,
  onClearFilters,
}: InstituteParentEmptyStateProps) {
  return (
    <Card className="p-8 text-center border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm" data-testid="parent-empty-state">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--muted)/0.5)] mb-4">
        <Users className="h-6 w-6 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
      </div>

      <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">
        {hasFilters ? 'No matching parents found' : 'No parent relationships yet'}
      </h3>

      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
        {hasFilters
          ? 'Try adjusting your search query or filter options to find the parent record.'
          : 'Add your first parent record to manage relationships, contact details, and internal notes for this institute.'}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {hasFilters && onClearFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="border-[hsl(var(--border))]"
          >
            Clear Filters
          </Button>
        )}

        {!hasFilters && canCreate && onAddParent && (
          <Button
            variant="default"
            size="sm"
            onClick={onAddParent}
            className="bg-[hsl(var(--primary))] text-white hover:opacity-90"
            data-testid="empty-add-parent-btn"
          >
            <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" />
            Add First Parent
          </Button>
        )}
      </div>
    </Card>
  );
}
