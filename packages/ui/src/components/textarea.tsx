import * as React from 'react';
import { cn } from '../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--foreground))]"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            'flex min-h-[80px] w-full rounded-[var(--radius-md,0.5rem)] border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus-visible:ring-red-500',
            className,
          )}
          ref={ref}
          {...props}
        />
        {helperText && !error && (
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{helperText}</p>
        )}
        {error && <p className="text-xs font-medium text-red-500">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
