import * as React from 'react';
import { Badge } from '@coaching-os/ui';

export interface AuthHeaderProps {
  title: string;
  description: string;
  eyebrow?: string;
  className?: string;
}

export function AuthHeader({ title, description, eyebrow, className = '' }: AuthHeaderProps) {
  return (
    <div className={`text-center space-y-2 mb-6 ${className}`}>
      {eyebrow && (
        <Badge variant="secondary" className="mb-2 inline-flex text-[10px] uppercase font-mono tracking-wider">
          {eyebrow}
        </Badge>
      )}
      <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--foreground))] sm:text-3xl">
        {title}
      </h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
        {description}
      </p>
    </div>
  );
}
