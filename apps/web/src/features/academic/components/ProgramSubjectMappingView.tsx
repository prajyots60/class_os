'use client';

import React, { useState } from 'react';
import { Button, Badge } from '@coaching-os/ui';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import type { ProgramDTO, SubjectDTO, ProgramSubjectDTO } from '@coaching-os/identity/client';

export interface ProgramSubjectMappingViewProps {
  programs: ProgramDTO[];
  subjects: SubjectDTO[];
  mappings: ProgramSubjectDTO[];
  isLoading: boolean;
  canCreate: boolean;
  canArchive: boolean;
  onOpenMapModal: (programId?: string) => void;
  onUnmapSubject: (programId: string, subjectId: string) => void;
}

export function ProgramSubjectMappingView({
  programs,
  subjects,
  mappings,
  isLoading,
  canCreate,
  canArchive,
  onOpenMapModal,
  onUnmapSubject,
}: ProgramSubjectMappingViewProps) {
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');

  const filteredPrograms = selectedProgramId === 'all'
    ? programs
    : programs.filter((p) => p.id === selectedProgramId);

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  return (
    <div className="space-y-4" data-testid="program-subject-mapping-view">
      {/* Filter / Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[hsl(var(--card))] p-4 rounded-xl border border-[hsl(var(--border))]">
        <div className="flex items-center gap-3 flex-1">
          <label className="text-xs font-medium text-[hsl(var(--foreground))] whitespace-nowrap">
            Filter by Program:
          </label>
          <select
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className="h-9 px-3 text-xs rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex-1 max-w-xs"
            data-testid="program-filter-dropdown"
          >
            <option value="all">All Programs ({programs.length})</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </div>

        {canCreate && (
          <Button
            size="sm"
            onClick={() => onOpenMapModal(selectedProgramId !== 'all' ? selectedProgramId : undefined)}
            data-testid="map-subject-button"
            className="gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" /> Map Subject to Program
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))]" data-testid="mapping-loading-skeleton">
          Loading Program ↔ Subject mappings...
        </div>
      ) : programs.length === 0 ? (
        <div className="p-12 border border-dashed border-[hsl(var(--border))] rounded-xl text-center bg-[hsl(var(--card))]">
          <AlertCircle className="h-10 w-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-medium text-[hsl(var(--foreground))] mb-1">No Programs Available</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Create a program first before mapping subjects to it.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPrograms.map((program) => {
            const programMappings = mappings.filter((m) => m.programId === program.id);
            const mappedSubjectIds = programMappings.map((m) => m.subjectId);

            return (
              <div
                key={program.id}
                className="p-5 border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] space-y-4"
                data-testid={`program-mapping-card-${program.id}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[hsl(var(--border))] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[hsl(var(--primary))]">{program.code}</span>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {program.status}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">{program.name}</h3>
                  </div>

                  {canCreate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenMapModal(program.id)}
                      className="h-8 text-xs gap-1 shrink-0 self-start sm:self-auto"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Subject
                    </Button>
                  )}
                </div>

                {programMappings.length === 0 ? (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] italic py-2">
                    No subjects are mapped to this program yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {mappedSubjectIds.map((subId) => {
                      const subject = subjectMap.get(subId);
                      return (
                        <div
                          key={subId}
                          className="flex items-center justify-between p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)]"
                          data-testid={`mapped-subject-${program.id}-${subId}`}
                        >
                          <div className="space-y-0.5 min-w-0 pr-2">
                            <span className="font-mono text-xs font-bold text-[hsl(var(--foreground))] block">
                              {subject ? subject.code : subId}
                            </span>
                            <span className="text-xs text-[hsl(var(--muted-foreground))] truncate block">
                              {subject ? subject.name : 'Mapped Subject'}
                            </span>
                          </div>

                          {canArchive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onUnmapSubject(program.id, subId)}
                              title="Remove Mapping"
                              data-testid={`unmap-button-${program.id}-${subId}`}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
