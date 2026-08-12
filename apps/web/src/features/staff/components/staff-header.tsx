'use client';

import React from 'react';
import { Button, Input } from '@coaching-os/ui';
import { Search, UserPlus, RefreshCw, Users } from 'lucide-react';
import type { StaffFilterState } from '../types/staff-ui.types';

interface StaffHeaderProps {
  filters: StaffFilterState;
  onFilterChange: (updated: Partial<StaffFilterState>) => void;
  onRefresh: () => void;
  onOpenInviteModal: () => void;
  canInviteStaff: boolean;
  isLoading: boolean;
}

export function StaffHeader({
  filters,
  onFilterChange,
  onRefresh,
  onOpenInviteModal,
  canInviteStaff,
  isLoading,
}: StaffHeaderProps) {
  return (
    <div className="space-y-4 pb-4 border-b border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Staff & Team Management</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage institute staff members, assign roles, and administer team permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh staff list"
            data-testid="staff-refresh-button"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </Button>

          {canInviteStaff && (
            <Button
              onClick={onOpenInviteModal}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="staff-invite-button"
            >
              <UserPlus className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Invite Staff
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search by name, email, or ID..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="pl-9 h-9"
            aria-label="Search staff members"
            data-testid="staff-search-input"
          />
        </div>

        <div>
          <select
            value={filters.role}
            onChange={(e) => onFilterChange({ role: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
            aria-label="Filter by role"
            data-testid="staff-role-filter"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="teacher">Teacher</option>
            <option value="assistant">Assistant</option>
          </select>
        </div>

        <div>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
            aria-label="Filter by status"
            data-testid="staff-status-filter"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="removed">Removed</option>
          </select>
        </div>
      </div>
    </div>
  );
}
