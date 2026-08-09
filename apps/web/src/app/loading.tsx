import * as React from 'react';

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-6">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" />
        <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
          Loading CoachingOS Foundation...
        </p>
      </div>
    </div>
  );
}
