'use client';

import * as React from 'react';
import { Button, Badge } from '@coaching-os/ui';
import { X, Calendar, BookOpen } from 'lucide-react';
import type { ParentAssessmentItemDTO } from '../../types/parent-ui.types';

interface AssessmentDetailModalProps {
  assessment: ParentAssessmentItemDTO | null;
  onClose: () => void;
}

export function AssessmentDetailModal({ assessment, onClose }: AssessmentDetailModalProps) {
  if (!assessment) return null;

  const scheduledDateFormatted = assessment.scheduledDate
    ? new Date(assessment.scheduledDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date Not Specified';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assessment-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[hsl(var(--border))] pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
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
            <h2 id="assessment-modal-title" className="text-lg font-bold text-[hsl(var(--foreground))]">
              {assessment.title}
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1 mt-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              Scheduled on {scheduledDateFormatted}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-full p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            aria-label="Close assessment result modal"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 py-2">
          {/* Marks Breakdown Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] p-3 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Obtained
              </div>
              <div className="text-xl font-bold text-[hsl(var(--foreground))] mt-1">
                {assessment.marksObtained !== null ? assessment.marksObtained : '—'}
              </div>
            </div>

            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] p-3 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Maximum
              </div>
              <div className="text-xl font-bold text-[hsl(var(--foreground))] mt-1">
                {assessment.maximumMarks}
              </div>
            </div>

            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] p-3 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Score
              </div>
              <div className="text-xl font-extrabold text-[hsl(var(--primary))] mt-1">
                {assessment.percentage !== null ? `${assessment.percentage}%` : '—'}
              </div>
            </div>
          </div>

          {/* Subject Performance Breakdown */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
              Subject Score Breakdown
            </h3>
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
                <span className="font-semibold text-xs text-[hsl(var(--foreground))]">
                  {assessment.subject || assessment.batchName}
                </span>
              </div>

              <div className="font-bold text-xs text-[hsl(var(--foreground))]">
                {assessment.marksObtained !== null
                  ? `${assessment.marksObtained} / ${assessment.maximumMarks} (${assessment.percentage}%)`
                  : 'Pending'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-[hsl(var(--border))]">
          <Button
            variant="outline"
            onClick={onClose}
            className="min-h-[44px] px-5"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
