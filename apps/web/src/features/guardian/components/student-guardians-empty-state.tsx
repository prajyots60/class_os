'use client';

import React from 'react';
import { Button } from '@coaching-os/ui';
import { Users, Plus } from 'lucide-react';

export interface StudentGuardiansEmptyStateProps {
  onAddGuardian?: () => void;
  canCreate?: boolean;
}

export function StudentGuardiansEmptyState({
  onAddGuardian,
  canCreate = false,
}: StudentGuardiansEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--muted)/0.15)] my-2"
      data-testid="student-guardians-empty-state"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
        <Users className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-bold text-[hsl(var(--foreground))] mb-1">
        No guardians linked yet
      </h3>
      <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mb-4">
        Add a parent or guardian to this student to keep emergency and family contact information organized.
      </p>

      {canCreate && onAddGuardian && (
        <Button
          variant="default"
          size="sm"
          onClick={onAddGuardian}
          className="gap-1.5 bg-primary text-primary-foreground hover:opacity-90"
          data-testid="empty-add-guardian-btn"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add Guardian</span>
        </Button>
      )}
    </div>
  );
}
