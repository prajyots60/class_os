'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@coaching-os/ui';
import { Paperclip, Calendar, BookOpen, ExternalLink } from 'lucide-react';
import type { ParentHomeworkItemDTO } from '../../types/parent-ui.types';

interface HomeworkCardProps {
  homework: ParentHomeworkItemDTO;
  onSelect: (item: ParentHomeworkItemDTO) => void;
}

export function HomeworkCard({ homework, onSelect }: HomeworkCardProps) {
  const publishedDateFormatted = homework.publishedAt
    ? new Date(homework.publishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Draft';

  return (
    <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm hover:border-[hsl(var(--primary)/0.5)] transition-all">
      <CardHeader className="pb-2 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px]">
              {homework.batchName}
            </Badge>
            {homework.subject && (
              <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                <BookOpen className="h-3 w-3" aria-hidden="true" />
                {homework.subject}
              </span>
            )}
          </div>
          <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {publishedDateFormatted}
          </span>
        </div>

        <CardTitle className="text-base font-bold text-[hsl(var(--foreground))] line-clamp-1 pt-1">
          {homework.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-1 space-y-3">
        {homework.description && (
          <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">
            {homework.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-[hsl(var(--border)/0.5)]">
          {homework.attachmentUrl ? (
            <div className="flex items-center gap-1 text-xs text-[hsl(var(--primary))] font-medium">
              <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Attachment included</span>
            </div>
          ) : (
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              No attachments
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelect(homework)}
            className="min-h-[44px] min-w-[44px] gap-1 text-xs text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]"
            aria-label={`View details for homework: ${homework.title}`}
          >
            <span>View Details</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
