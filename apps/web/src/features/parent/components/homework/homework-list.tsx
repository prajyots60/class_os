'use client';

import * as React from 'react';
import { Card, CardContent, Input } from '@coaching-os/ui';
import { FileText, Search } from 'lucide-react';
import { HomeworkCard } from './homework-card';
import { HomeworkDetailModal } from './homework-detail-modal';
import type { ParentHomeworkItemDTO } from '../../types/parent-ui.types';

interface HomeworkListProps {
  homework: ParentHomeworkItemDTO[];
}

export function HomeworkList({ homework }: HomeworkListProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedHomework, setSelectedHomework] = React.useState<ParentHomeworkItemDTO | null>(null);

  const filteredHomework = homework.filter((item) => {
    const matchTitle = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBatch = item.batchName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSubject = item.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    return matchTitle || matchBatch || matchSubject;
  });

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
          <Input
            type="text"
            placeholder="Search homework by title, subject, or batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 min-h-[44px]"
            aria-label="Search homework by title or subject"
          />
        </div>
        <span className="text-xs text-[hsl(var(--muted-foreground))] self-end sm:self-center">
          {filteredHomework.length} Published Homework Assignment{filteredHomework.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List / Empty State */}
      {filteredHomework.length === 0 ? (
        <Card className="border border-dashed border-[hsl(var(--border))] text-center p-6 sm:p-8">
          <CardContent className="space-y-2 pt-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))]">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              {searchTerm ? 'No Matching Homework Found' : 'No Published Homework Assignments'}
            </h4>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
              {searchTerm
                ? 'Try adjusting your search keywords.'
                : 'Homework assignments published by your teachers will appear here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredHomework.map((item) => (
            <HomeworkCard
              key={item.id}
              homework={item}
              onSelect={(selected) => setSelectedHomework(selected)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <HomeworkDetailModal
        homework={selectedHomework}
        onClose={() => setSelectedHomework(null)}
      />
    </div>
  );
}
