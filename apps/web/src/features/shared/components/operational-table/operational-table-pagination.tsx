'use client';

import * as React from 'react';
import { Button } from '@coaching-os/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface OperationalTablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  disabled?: boolean;
}

export function OperationalTablePagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: OperationalTablePaginationProps) {
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(total, page * pageSize);

  return (
    <div
      className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs text-[hsl(var(--muted-foreground))]"
      data-testid="operational-table-pagination"
    >
      {/* Count Range Summary */}
      <div className="flex items-center space-x-2">
        <span>
          Showing <strong className="font-semibold text-[hsl(var(--foreground))]">{startItem}</strong> to{' '}
          <strong className="font-semibold text-[hsl(var(--foreground))]">{endItem}</strong> of{' '}
          <strong className="font-semibold text-[hsl(var(--foreground))]">{total}</strong> results
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
            aria-label="Select page size"
            className="ml-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        )}
      </div>

      {/* Page Navigation Buttons */}
      <div className="flex items-center space-x-2">
        <span className="mr-2">
          Page <strong className="font-semibold text-[hsl(var(--foreground))]">{page}</strong> of{' '}
          <strong className="font-semibold text-[hsl(var(--foreground))]">{Math.max(1, totalPages)}</strong>
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Previous Page"
          className="min-h-[44px] min-w-[44px] px-3"
          data-testid="pagination-previous"
        >
          <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          <span>Prev</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages || totalPages === 0}
          aria-label="Next Page"
          className="min-h-[44px] min-w-[44px] px-3"
          data-testid="pagination-next"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
