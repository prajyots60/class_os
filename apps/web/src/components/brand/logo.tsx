import * as React from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@coaching-os/ui';

export interface CoachingOSLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizeMap = {
  sm: {
    container: 'h-8 w-8 rounded-[var(--radius-sm,0.375rem)]',
    icon: 'h-4 w-4',
    text: 'text-base',
  },
  md: {
    container: 'h-10 w-10 rounded-[var(--radius-md,0.5rem)]',
    icon: 'h-5 w-5',
    text: 'text-lg',
  },
  lg: {
    container: 'h-12 w-12 rounded-[var(--radius-lg,0.75rem)]',
    icon: 'h-6 w-6',
    text: 'text-xl',
  },
};

export function CoachingOSLogo({
  size = 'md',
  showText = true,
  className,
  ...props
}: CoachingOSLogoProps) {
  const config = sizeMap[size];

  return (
    <div className={cn('inline-flex items-center gap-3', className)} {...props}>
      <div
        className={cn(
          'flex items-center justify-center bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm transition-transform hover:scale-105',
          config.container,
        )}
      >
        <Building2 className={config.icon} />
      </div>
      {showText && (
        <span className={cn('font-bold tracking-tight text-[hsl(var(--foreground))]', config.text)}>
          Coaching<span className="text-[hsl(var(--primary))]">OS</span>
        </span>
      )}
    </div>
  );
}
