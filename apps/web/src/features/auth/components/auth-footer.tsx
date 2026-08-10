import * as React from 'react';
import Link from 'next/link';

export interface AuthFooterProps {
  prompt: string;
  linkLabel: string;
  href: string;
  className?: string;
}

export function AuthFooter({ prompt, linkLabel, href, className = '' }: AuthFooterProps) {
  return (
    <div className={`mt-6 border-t border-[hsl(var(--border))] pt-4 text-center text-xs text-[hsl(var(--muted-foreground))] ${className}`}>
      <span>{prompt}</span>{' '}
      <Link
        href={href}
        className="font-semibold text-[hsl(var(--primary))] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] rounded"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
