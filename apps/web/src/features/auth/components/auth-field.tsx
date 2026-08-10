import * as React from 'react';
import { Label, cn } from '@coaching-os/ui';

export interface AuthFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function AuthField({
  label,
  htmlFor,
  error,
  description,
  required = false,
  children,
  className,
}: AuthFieldProps) {
  const errorId = `${htmlFor}-error`;
  const descId = `${htmlFor}-desc`;

  return (
    <div className={cn('space-y-1.5 text-left', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor} className="text-xs font-semibold text-[hsl(var(--foreground))]">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      </div>

      {/* Input Element */}
      <div className="relative">{children}</div>

      {/* Description text */}
      {description && !error && (
        <p id={descId} className="text-[11px] text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      )}

      {/* Field Validation Error */}
      {error && (
        <p id={errorId} className="text-xs font-medium text-destructive animate-in fade-in-0 duration-150">
          {error}
        </p>
      )}
    </div>
  );
}
