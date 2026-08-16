'use client';

import * as React from 'react';
import { Card, CardContent, Input } from '@coaching-os/ui';
import { Award, Search } from 'lucide-react';
import { AssessmentCard } from './assessment-card';
import { AssessmentDetailModal } from './assessment-detail-modal';
import { MarksSummary } from './marks-summary';
import { PerformanceTrend } from './performance-trend';
import type {
  ParentAssessmentItemDTO,
  ParentAssessmentSummaryDTO,
} from '../../types/parent-ui.types';

interface AssessmentListProps {
  summary: ParentAssessmentSummaryDTO;
  assessments: ParentAssessmentItemDTO[];
}

export function AssessmentList({ summary, assessments }: AssessmentListProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedAssessment, setSelectedAssessment] = React.useState<ParentAssessmentItemDTO | null>(null);

  const filteredAssessments = assessments.filter((item) => {
    const matchTitle = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBatch = item.batchName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSubject = item.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    return matchTitle || matchBatch || matchSubject;
  });

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <MarksSummary summary={summary} />

      {/* Performance Trend Chart */}
      <PerformanceTrend assessments={assessments} />

      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
          <Input
            type="text"
            placeholder="Search test by title, subject, or batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 min-h-[44px]"
            aria-label="Search test by title or subject"
          />
        </div>
        <span className="text-xs text-[hsl(var(--muted-foreground))] self-end sm:self-center">
          {filteredAssessments.length} Published Test Result{filteredAssessments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List / Empty State */}
      {filteredAssessments.length === 0 ? (
        <Card className="border border-dashed border-[hsl(var(--border))] text-center p-6 sm:p-8">
          <CardContent className="space-y-2 pt-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))]">
              <Award className="h-5 w-5" aria-hidden="true" />
            </div>
            <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              {searchTerm ? 'No Matching Test Results Found' : 'No Assessment Results Yet'}
            </h4>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
              {searchTerm
                ? 'Try adjusting your search keywords.'
                : 'Published test results will appear here when available.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredAssessments.map((item) => (
            <AssessmentCard
              key={item.id}
              assessment={item}
              onSelect={(selected) => setSelectedAssessment(selected)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <AssessmentDetailModal
        assessment={selectedAssessment}
        onClose={() => setSelectedAssessment(null)}
      />
    </div>
  );
}
