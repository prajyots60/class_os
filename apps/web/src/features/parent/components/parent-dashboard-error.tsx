'use client';

import * as React from 'react';
import { Card, CardContent } from '@coaching-os/ui';
import { Button } from '@coaching-os/ui';
import { AlertCircle, RefreshCw, LogIn } from 'lucide-react';
import { ParentApiError } from '../api/v1-parent-client';

interface ParentDashboardErrorProps {
  error: Error | null;
  onRetry?: () => void;
}

export function ParentDashboardError({ error, onRetry }: ParentDashboardErrorProps) {
  const is401 = error instanceof ParentApiError && error.statusCode === 401;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--card))] shadow-sm">
        <CardContent className="space-y-4 text-center pt-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">
              {is401 ? 'Session Expired' : 'Unable to Load Parent Dashboard'}
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              {is401
                ? 'Your parent session has expired or is invalid. Please log in again to access your child dashboard.'
                : 'A network or server error occurred while retrieving your dashboard details. Please try again.'}
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            {is401 ? (
              <a
                href="/sign-in"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] px-4 py-2 gap-2 min-h-[44px]"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign In Again
              </a>
            ) : (
              onRetry && (
                <Button
                  onClick={onRetry}
                  variant="outline"
                  className="gap-2 min-h-[44px]"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Retry Loading
                </Button>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
