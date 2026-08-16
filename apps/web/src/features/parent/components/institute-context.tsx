'use client';

import * as React from 'react';
import { Card, CardContent } from '@coaching-os/ui';
import { Building2 } from 'lucide-react';
import type { ParentHubInstituteSummaryDTO } from '../types/parent-ui.types';

interface InstituteContextProps {
  institutes: ParentHubInstituteSummaryDTO[];
}

export function InstituteContext({ institutes }: InstituteContextProps) {
  if (institutes.length === 0) {
    return null;
  }

  return (
    <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] shadow-none">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Connected Coaching Institutes ({institutes.length})
          </h3>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {institutes.map((inst) => (
            <div
              key={inst.id}
              className="flex items-center justify-between rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs"
            >
              <div>
                <p className="font-semibold text-[hsl(var(--foreground))]">{inst.name}</p>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Code: {inst.slug}</p>
              </div>
              <span className="rounded-full bg-[hsl(var(--primary)/0.1)] px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--primary))]">
                {inst.studentCount} student{inst.studentCount > 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
