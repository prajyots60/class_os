import * as React from 'react';
import { Button, Input } from '@coaching-os/ui';
import { UserPlus, Search, Filter } from 'lucide-react';

export interface InstituteParentHeaderProps {
  search: string;
  statusFilter: 'all' | 'active' | 'inactive';
  canCreate: boolean;
  totalParents: number;
  onSearchChange: (search: string) => void;
  onStatusFilterChange: (status: 'all' | 'active' | 'inactive') => void;
  onAddParent: () => void;
}

/**
 * InstituteParentHeader — header controls rendering title, search, filter, and primary CTA.
 */
export function InstituteParentHeader({
  search,
  statusFilter,
  canCreate,
  totalParents,
  onSearchChange,
  onStatusFilterChange,
  onAddParent,
}: InstituteParentHeaderProps) {
  return (
    <div className="space-y-4 pb-2">
      {/* Top Title & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-[hsl(var(--foreground))]">
              Parents
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
              {totalParents}
            </span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Manage parent relationships, contact phone numbers, and staff operational notes for this institute.
          </p>
        </div>

        {canCreate && (
          <Button
            variant="default"
            size="sm"
            onClick={onAddParent}
            className="bg-[hsl(var(--primary))] text-white hover:opacity-90 self-start sm:self-auto shrink-0 shadow-sm"
            data-testid="add-parent-header-btn"
          >
            <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" />
            Add Parent
          </Button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by parent name, phone, or notes..."
            className="pl-9 h-9 text-xs"
            data-testid="parent-search-input"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0" aria-hidden="true" />
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as 'all' | 'active' | 'inactive')}
            className="h-9 px-3 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
            data-testid="parent-filter-select"
            aria-label="Filter parents by institute standing"
          >
            <option value="all">All Standing</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>
    </div>
  );
}
