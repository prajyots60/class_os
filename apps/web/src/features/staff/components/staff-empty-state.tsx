'use client';

import React from 'react';
import { Button, Card, CardContent } from '@coaching-os/ui';
import { Users, UserPlus, SearchX } from 'lucide-react';

interface StaffEmptyStateProps {
  isSearch: boolean;
  onClearFilters?: () => void;
  onOpenInviteModal?: () => void;
  canInviteStaff?: boolean;
}

export function StaffEmptyState({
  isSearch,
  onClearFilters,
  onOpenInviteModal,
  canInviteStaff,
}: StaffEmptyStateProps) {
  if (isSearch) {
    return (
      <Card className="border-border border-dashed p-8 text-center" data-testid="staff-empty-state">
        <CardContent className="p-0 space-y-3 flex flex-col items-center">
          <div className="rounded-full bg-muted p-3">
            <SearchX className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-medium text-foreground">No matching staff members found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            No staff records match your current search query or filter criteria.
          </p>
          {onClearFilters && (
            <Button variant="outline" size="sm" onClick={onClearFilters} className="mt-2">
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border border-dashed p-8 text-center" data-testid="staff-empty-state">
      <CardContent className="p-0 space-y-3 flex flex-col items-center">
        <div className="rounded-full bg-primary/10 p-3">
          <Users className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-medium text-foreground">No staff members in team</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Get started by inviting your institute teachers and staff members.
        </p>
        {canInviteStaff && onOpenInviteModal && (
          <Button onClick={onOpenInviteModal} size="sm" className="mt-2">
            <UserPlus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Invite Staff Member
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
