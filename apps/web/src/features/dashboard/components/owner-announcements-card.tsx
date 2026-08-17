'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@coaching-os/ui';
import { Megaphone, Calendar } from 'lucide-react';
import type { OwnerAnnouncementDTO } from '@coaching-os/administration';

export interface OwnerAnnouncementsCardProps {
  announcements: OwnerAnnouncementDTO[];
}

export function OwnerAnnouncementsCard({ announcements }: OwnerAnnouncementsCardProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Draft';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Card className="shadow-sm border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-md bg-purple-500/10 text-purple-600">
              <Megaphone className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-[hsl(var(--foreground))]">
                Recent Announcements
              </CardTitle>
              <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
                Latest broadcasts published to parents & students
              </CardDescription>
            </div>
          </div>
          <Link
            href="/communication"
            className="text-xs font-semibold text-primary hover:underline min-h-[44px] flex items-center px-2"
          >
            Manage All
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-6 text-center">
            <Megaphone className="mx-auto h-8 w-8 text-[hsl(var(--muted-foreground))] opacity-50" aria-hidden="true" />
            <p className="mt-2 text-xs font-medium text-[hsl(var(--muted-foreground))]">
              No recent announcements published
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="flex items-start justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] p-3 transition-colors hover:bg-[hsl(var(--muted)/0.3)]"
              >
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[hsl(var(--foreground))] line-clamp-1">
                    {ann.title}
                  </p>
                  <div className="flex items-center space-x-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                    <Calendar className="h-3 w-3" aria-hidden="true" />
                    <span>{formatDate(ann.publishedAt)}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {ann.targetScope}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
