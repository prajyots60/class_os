import * as React from 'react';
import { cn } from '../lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--foreground))]',
        className,
      )}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  ),
);
Label.displayName = 'Label';
