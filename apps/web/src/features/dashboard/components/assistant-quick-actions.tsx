'use client';

import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  buttonVariants,
} from '@coaching-os/ui';
import { Zap, ArrowRight } from 'lucide-react';
import type { AssistantQuickActionDTO } from '@coaching-os/administration';

export interface AssistantQuickActionsProps {
  quickActions: AssistantQuickActionDTO[];
}

export function AssistantQuickActions({ quickActions }: AssistantQuickActionsProps) {
  return (
    <Card className="shadow-sm border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-md bg-primary/10 text-primary">
            <Zap className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-[hsl(var(--foreground))]">
              Quick Actions
            </CardTitle>
            <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
              Common front-desk operational tasks
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pt-1">
        {quickActions.map((action) => (
          <Link
            key={action.id}
            href={action.targetPath}
            className={
              buttonVariants({ variant: action.id === 'record-payment' ? 'default' : 'outline', size: 'default' }) +
              ' w-full justify-between min-h-[44px]'
            }
            aria-label={`${action.label}: navigate to ${action.targetPath}`}
            data-testid={`quick-action-${action.id}`}
          >
            <span className="font-semibold text-sm">{action.label}</span>
            <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
