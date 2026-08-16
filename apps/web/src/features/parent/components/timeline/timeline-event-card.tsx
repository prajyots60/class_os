'use client';

import * as React from 'react';
import { Card, CardContent, Badge, Button } from '@coaching-os/ui';
import {
  CalendarCheck,
  BookOpen,
  Award,
  CreditCard,
  Megaphone,
  Building2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import type { ParentTimelineEventDTO } from '../../types/parent-ui.types';

interface TimelineEventCardProps {
  event: ParentTimelineEventDTO;
  onNavigate?: (targetRoute: string) => void;
}

export function TimelineEventCard({ event, onNavigate }: TimelineEventCardProps) {
  const getCategoryConfig = (eventType: string) => {
    if (eventType.startsWith('attendance.')) {
      return {
        label: 'Attendance',
        icon: CalendarCheck,
        badgeClass: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
        route: '/parent/attendance',
      };
    }
    if (eventType.startsWith('homework.')) {
      return {
        label: 'Homework',
        icon: BookOpen,
        badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
        route: '/parent/homework',
      };
    }
    if (eventType.startsWith('test.') || eventType.startsWith('marks.') || eventType.startsWith('assessment.')) {
      return {
        label: 'Assessment',
        icon: Award,
        badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
        route: '/parent/assessments',
      };
    }
    if (eventType.startsWith('billing.') || eventType.startsWith('payment.')) {
      return {
        label: 'Fee Payment',
        icon: CreditCard,
        badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
        route: '/parent/fees',
      };
    }
    return {
      label: 'Announcement',
      icon: Megaphone,
      badgeClass: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/30',
      route: undefined,
    };
  };

  const config = getCategoryConfig(event.eventType);
  const IconComponent = config.icon;

  const eventTimeFormatted = event.occurredAt
    ? new Date(event.occurredAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : 'Time N/A';

  const ariaText = `${event.studentName} at ${event.instituteName}: ${config.label} event "${event.title}" at ${eventTimeFormatted}`;

  return (
    <Card
      className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xs hover:border-[hsl(var(--primary)/0.4)] transition-all"
      aria-label={ariaText}
    >
      <CardContent className="p-3.5 space-y-2">
        {/* Header: Category Badge + Student Badge + Timestamp */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className={`text-[10px] font-bold border ${config.badgeClass}`}>
              <IconComponent className="h-3 w-3 mr-1 inline" aria-hidden="true" />
              {config.label}
            </Badge>

            <Badge variant="outline" className="text-[10px] font-semibold">
              {event.studentName}
            </Badge>
          </div>

          <span className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {eventTimeFormatted}
          </span>
        </div>

        {/* Title & Description */}
        <div>
          <h4 className="text-sm font-bold text-[hsl(var(--foreground))]">
            {event.title}
          </h4>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 line-clamp-2">
            {event.description}
          </p>
        </div>

        {/* Footer: Institute Context + Optional Action */}
        <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--border)/0.5)]">
          <span className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1">
            <Building2 className="h-3 w-3 text-[hsl(var(--primary))]" aria-hidden="true" />
            {event.instituteName}
          </span>

          {config.route && onNavigate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate(config.route!)}
              className="min-h-[44px] min-w-[44px] gap-1 text-[11px] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] py-1 h-auto"
              aria-label={`View details for ${event.title}`}
            >
              <span>View {config.label}</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
