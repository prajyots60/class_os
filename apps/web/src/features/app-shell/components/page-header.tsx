import * as React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader — standard page-level title and description header.
 */
export function PageHeader({ title, description, actions, className = '' }: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[hsl(var(--border))] pb-4 mb-6 ${className}`}
    >
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[hsl(var(--foreground))] sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] sm:text-sm">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center space-x-3 shrink-0">{actions}</div>}
    </div>
  );
}
