'use client';

import * as React from 'react';
import { Button } from '@coaching-os/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log unexpected frontend boundary exception
    if (process.env.NODE_ENV !== 'test') {
      // Client-side unexpected rendering boundary error
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-6">
      <div className="max-w-md space-y-4 rounded-[var(--radius-card)] border border-[hsl(var(--border))] p-8 text-center shadow-lg">
        <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">Application Error</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          An unexpected error occurred in the CoachingOS foundation boundary.
        </p>
        <Button onClick={() => reset()} variant="default" className="w-full">
          Try Again
        </Button>
      </div>
    </div>
  );
}
