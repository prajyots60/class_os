import * as React from 'react';
import { Card, cn } from '@coaching-os/ui';

export interface AuthCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function AuthCard({ children, className, ...props }: AuthCardProps) {
  return (
    <Card
      className={cn(
        'w-full max-w-md mx-auto p-6 sm:p-8 bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xl rounded-2xl transition-all',
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}
