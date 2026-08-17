'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@coaching-os/ui';
import { UserPlus, CreditCard, ClipboardCheck, FilePlus } from 'lucide-react';
import type { OwnerQuickActionDTO } from '@coaching-os/administration';

export interface OwnerQuickActionsProps {
  actions: OwnerQuickActionDTO[];
}

export function OwnerQuickActions({ actions }: OwnerQuickActionsProps) {
  const getIcon = (actionId: string) => {
    switch (actionId) {
      case 'add-student':
        return <UserPlus className="h-5 w-5 text-blue-600" aria-hidden="true" />;
      case 'record-fee':
        return <CreditCard className="h-5 w-5 text-emerald-600" aria-hidden="true" />;
      case 'take-attendance':
        return <ClipboardCheck className="h-5 w-5 text-amber-600" aria-hidden="true" />;
      case 'create-test':
        return <FilePlus className="h-5 w-5 text-purple-600" aria-hidden="true" />;
      default:
        return <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />;
    }
  };

  return (
    <Card className="shadow-sm border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-[hsl(var(--foreground))]">
          Quick Actions
        </CardTitle>
        <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
          Direct navigation to core institute operations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((act) => (
            <Link
              key={act.id}
              href={act.targetPath}
              className="flex flex-col items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3.5 text-center transition-colors hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] min-h-[72px]"
              aria-label={`Navigate to ${act.label}`}
            >
              <div className="mb-2 rounded-full bg-[hsl(var(--muted)/0.5)] p-2">
                {getIcon(act.id)}
              </div>
              <span className="text-xs font-semibold text-[hsl(var(--foreground))]">
                {act.label}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
