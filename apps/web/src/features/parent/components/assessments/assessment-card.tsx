'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@coaching-os/ui';
import { Calendar, BookOpen, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ParentAssessmentItemDTO } from '../../types/parent-ui.types';

interface AssessmentCardProps {
  assessment: ParentAssessmentItemDTO;
  onSelect: (item: ParentAssessmentItemDTO) => void;
}

export function AssessmentCard({ assessment, onSelect }: AssessmentCardProps) {
  const scheduledDateFormatted = assessment.scheduledDate
    ? new Date(assessment.scheduledDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date N/A';

  const ariaText =
    assessment.marksObtained !== null && assessment.percentage !== null
      ? `${assessment.title} result: ${assessment.marksObtained} out of ${assessment.maximumMarks}, ${assessment.percentage} percent`
      : `${assessment.title}: Marks pending publication`;

  return (
    <Card
      className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm hover:border-[hsl(var(--primary)/0.5)] transition-all"
      aria-label={ariaText}
    >
      <CardHeader className="pb-2 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px]">
              {assessment.batchName}
            </Badge>
            {assessment.subject && (
              <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1 font-medium">
                <BookOpen className="h-3 w-3" aria-hidden="true" />
                {assessment.subject}
              </span>
            )}
          </div>
          <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {scheduledDateFormatted}
          </span>
        </div>

        <CardTitle className="text-base font-bold text-[hsl(var(--foreground))] line-clamp-1 pt-1">
          {assessment.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-1 space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] p-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Marks Obtained
            </div>
            <div className="text-lg font-extrabold text-[hsl(var(--foreground))] mt-0.5">
              {assessment.marksObtained !== null ? (
                <>
                  {assessment.marksObtained}{' '}
                  <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">
                    / {assessment.maximumMarks}
                  </span>
                </>
              ) : (
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  Marks Pending
                </span>
              )}
            </div>
          </div>

          {assessment.percentage !== null && (
            <div className="text-right">
              <Badge
                variant="secondary"
                className={`text-sm font-black px-3 py-1 ${
                  assessment.percentage >= 75
                    ? 'bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                }`}
              >
                {assessment.percentage >= 75 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-600 inline" aria-hidden="true" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 mr-1 text-amber-600 inline" aria-hidden="true" />
                )}
                {assessment.percentage}%
              </Badge>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[hsl(var(--border)/0.5)]">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            Published Result
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelect(assessment)}
            className="min-h-[44px] min-w-[44px] gap-1 text-xs text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]"
            aria-label={`View result details for test: ${assessment.title}`}
          >
            <span>View Result</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
