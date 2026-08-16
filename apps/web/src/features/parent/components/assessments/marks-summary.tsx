'use client';

import * as React from 'react';
import { Card, CardContent } from '@coaching-os/ui';
import { Trophy, TrendingUp, Award } from 'lucide-react';
import type { ParentAssessmentSummaryDTO } from '../../types/parent-ui.types';

interface MarksSummaryProps {
  summary: ParentAssessmentSummaryDTO;
}

export function MarksSummary({ summary }: MarksSummaryProps) {
  const getAverageBadgeStyle = (avg: number | null) => {
    if (avg === null) return 'text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.3)] border-[hsl(var(--border))]';
    if (avg >= 80) return 'text-green-600 bg-green-500/10 border-green-500/20';
    if (avg >= 60) return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-600 bg-rose-500/10 border-rose-500/20';
  };

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
      {/* Average Score Percentage */}
      <Card className={`border p-3 ${getAverageBadgeStyle(summary.averagePercentage)}`}>
        <CardContent className="p-0 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Average Score
            </span>
            <TrendingUp className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold tracking-tight">
              {summary.averagePercentage !== null ? `${summary.averagePercentage}%` : 'N/A'}
            </div>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
              across all published tests
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Highest Score Percentage */}
      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
        <CardContent className="p-0 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Highest Score
            </span>
            <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {summary.highestPercentage !== null ? `${summary.highestPercentage}%` : 'N/A'}
            </div>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
              personal best score
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Total Assessments */}
      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
        <CardContent className="p-0 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Total Tests
            </span>
            <Award className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {summary.totalAssessments}
            </div>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
              tests conducted & published
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
