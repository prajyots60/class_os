'use client';

import * as React from 'react';
import { Button, Badge } from '@coaching-os/ui';
import { Search, X, FilterX } from 'lucide-react';

export interface OperationalTableToolbarProps {
  searchQuery: string;
  onSearchChange: (newSearch: string) => void;
  searchPlaceholder?: string;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  totalCount?: number;
  resourceName?: string;
  children?: React.ReactNode; // Extra filter selects/dropdowns
}

export function OperationalTableToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  hasActiveFilters,
  onClearFilters,
  totalCount,
  resourceName = 'records',
  children,
}: OperationalTableToolbarProps) {
  return (
    <div
      className="flex flex-col gap-3 p-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]"
      data-testid="operational-table-toolbar"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input Box */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))] pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={`Search ${resourceName}`}
            data-testid="table-search-input"
            className="w-full min-h-[44px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-9 pr-9 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls Slot */}
        {children && (
          <div className="flex flex-wrap items-center gap-2" data-testid="table-filter-controls">
            {children}
          </div>
        )}

        {/* Total Count Badge & Clear Filters */}
        <div className="flex items-center space-x-2 ml-auto">
          {totalCount !== undefined && (
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1">
              {totalCount} {resourceName}
            </Badge>
          )}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              aria-label="Clear all filters"
              data-testid="clear-filters-button"
              className="min-h-[44px] text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              <FilterX className="h-3.5 w-3.5 mr-1" />
              <span>Clear filters</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
