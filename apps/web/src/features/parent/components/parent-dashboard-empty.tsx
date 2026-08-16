'use client';

import * as React from 'react';
import { Card, CardContent } from '@coaching-os/ui';
import { Users, UserPlus, Info } from 'lucide-react';

interface ParentDashboardEmptyProps {
  type: 'no-profiles' | 'unlinked-profile' | 'no-activity';
  childName?: string;
}

export function ParentDashboardEmpty({ type, childName }: ParentDashboardEmptyProps) {
  if (type === 'no-profiles') {
    return (
      <Card className="border border-dashed border-[hsl(var(--border))] text-center p-6 sm:p-8">
        <CardContent className="space-y-3 pt-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
            <Users className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
              No Child Profiles Configured
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto mt-1">
              Your parent account currently has no child profiles associated with it. Contact your coaching institute administrator to link your student to your account.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === 'unlinked-profile') {
    return (
      <Card className="border border-dashed border-[hsl(var(--border))] text-center p-6">
        <CardContent className="space-y-2 pt-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))]">
            <UserPlus className="h-5 w-5" aria-hidden="true" />
          </div>
          <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            Child Profile &quot;{childName || 'Profile'}&quot; Unlinked
          </h4>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
            This profile exists in your parent hub but has no active student link attached.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-dashed border-[hsl(var(--border))] text-center p-6">
      <CardContent className="space-y-2 pt-2">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))]">
          <Info className="h-5 w-5" aria-hidden="true" />
        </div>
        <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
          No Activity Today
        </h4>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          No current-day notices or activities recorded for this student.
        </p>
      </CardContent>
    </Card>
  );
}
