'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@coaching-os/ui';
import { TrendingUp } from 'lucide-react';
import type { ParentAssessmentItemDTO } from '../../types/parent-ui.types';

interface PerformanceTrendProps {
  assessments: ParentAssessmentItemDTO[];
}

export function PerformanceTrend({ assessments }: PerformanceTrendProps) {
  // Chronological sorting for trend visualization
  const chronologicalAssessments = React.useMemo(() => {
    return [...assessments]
      .filter((a) => a.percentage !== null && a.scheduledDate !== null)
      .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());
  }, [assessments]);

  if (chronologicalAssessments.length === 0) {
    return null;
  }

  return (
    <Card className="border border-[hsl(var(--border))] shadow-sm">
      <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
          <CardTitle className="text-base font-bold text-[hsl(var(--foreground))]">
            Performance Trend Over Time
          </CardTitle>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {chronologicalAssessments.length} Test{chronologicalAssessments.length > 1 ? 's' : ''}
        </Badge>
      </CardHeader>

      <CardContent className="pt-2 space-y-3">
        {/* Visual Bar Graph Presentation */}
        <div
          className="flex items-end justify-between gap-2 h-28 pt-4 pb-2 border-b border-[hsl(var(--border))] px-2"
          role="img"
          aria-label="Performance trend bar chart"
        >
          {chronologicalAssessments.map((item) => {
            const pct = item.percentage ?? 0;
            const formattedDate = item.scheduledDate
              ? new Date(item.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : 'N/A';

            return (
              <div
                key={item.id}
                className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
              >
                <span className="text-[10px] font-bold text-[hsl(var(--foreground))]">
                  {pct}%
                </span>
                <div
                  className="w-full max-w-[32px] rounded-t-md bg-[hsl(var(--primary))] transition-all group-hover:bg-[hsl(var(--primary)/0.8)]"
                  style={{ height: `${Math.max(pct, 10)}%` }}
                />
                <span className="text-[9px] text-[hsl(var(--muted-foreground))] truncate max-w-[48px]">
                  {formattedDate}
                </span>
              </div>
            );
          })}
        </div>

        {/* Accessible Screen-Reader Textual Equivalent */}
        <div className="space-y-1" aria-label="Textual performance trend list">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Historical Scores Sequence
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {chronologicalAssessments.map((item, idx) => (
              <div
                key={item.id}
                className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] p-2 text-center"
              >
                <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  Test #{idx + 1} ({item.subject || item.batchName})
                </div>
                <div className="font-bold text-[hsl(var(--foreground))] mt-0.5">
                  {item.percentage}% ({item.marksObtained}/{item.maximumMarks})
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
