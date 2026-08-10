import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

export const alertVariants = cva(
  'relative w-full rounded-[var(--radius-md,0.5rem)] border p-4 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-[hsl(var(--foreground))] [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default: 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] border-[hsl(var(--border))]',
        info: 'border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-200 [&>svg]:text-sky-600',
        success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 [&>svg]:text-emerald-600',
        warning: 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 [&>svg]:text-amber-600',
        destructive: 'border-red-500/30 bg-red-500/10 text-red-900 dark:text-red-200 [&>svg]:text-red-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
  ),
);
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-xs opacity-90 [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';
