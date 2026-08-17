'use client';

import * as React from 'react';
import { MoreVertical } from 'lucide-react';

export interface RowActionItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export interface OperationalTableRowActionsProps {
  actions: RowActionItem[];
  rowId: string;
  resourceName?: string;
}

export function OperationalTableRowActions({
  actions,
  rowId,
  resourceName = 'item',
}: OperationalTableRowActionsProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const toggleOpen = React.useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleClose = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  // Close menu on click outside or Escape key
  React.useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!actions || actions.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={containerRef} data-testid={`row-actions-${rowId}`}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={`Actions for ${resourceName} ${rowId}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        data-testid={`row-actions-trigger-${rowId}`}
        className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          data-testid={`row-actions-menu-${rowId}`}
          className="absolute right-0 z-50 mt-1 min-w-[180px] origin-top-right rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-lg focus:outline-none animate-in fade-in slide-in-from-top-1"
        >
          {actions.map((action) => {
            const Icon = action.icon;
            const isDanger = action.variant === 'danger';
            return (
              <button
                key={action.id}
                type="button"
                role="menuitem"
                disabled={action.disabled}
                onClick={() => {
                  handleClose();
                  if (!action.disabled) {
                    action.onClick();
                  }
                }}
                data-testid={`row-action-${action.id}-${rowId}`}
                className={`flex w-full items-center space-x-2 rounded-md px-3 py-2.5 text-xs font-medium min-h-[44px] transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] ${
                  action.disabled
                    ? 'opacity-50 cursor-not-allowed text-[hsl(var(--muted-foreground))]'
                    : isDanger
                    ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                    : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.6)]'
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0" />}
                <span className="truncate">{action.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
