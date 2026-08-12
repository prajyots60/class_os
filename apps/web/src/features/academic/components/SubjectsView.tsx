'use client';

import React, { useState } from 'react';
import { Button, Input, Badge } from '@coaching-os/ui';
import { Plus, Search, Eye, Edit, Archive, Book, RefreshCw } from 'lucide-react';
import type { SubjectDTO } from '@coaching-os/identity/client';

export interface SubjectsViewProps {
  subjects: SubjectDTO[];
  isLoading: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canArchive: boolean;
  onAddSubject: () => void;
  onViewSubject: (subject: SubjectDTO) => void;
  onEditSubject: (subject: SubjectDTO) => void;
  onArchiveSubject: (subject: SubjectDTO) => void;
}

export function SubjectsView({
  subjects,
  isLoading,
  canCreate,
  canUpdate,
  canArchive,
  onAddSubject,
  onViewSubject,
  onEditSubject,
  onArchiveSubject,
}: SubjectsViewProps) {
  const [search, setSearch] = useState('');

  const filteredSubjects = subjects.filter(
    (s) =>
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-4" data-testid="subjects-view">
      {/* Top Banner: Visual Reusability Indicator */}
      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 shrink-0" />
          <span>
            <strong>Reusable Aggregates:</strong> Subjects belong to the institute and can be mapped into multiple Programs.
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[hsl(var(--card))] p-4 rounded-xl border border-[hsl(var(--border))]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <Input
            type="text"
            placeholder="Search subjects by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
            data-testid="subject-search-input"
          />
        </div>

        {canCreate && (
          <Button
            size="sm"
            onClick={onAddSubject}
            data-testid="add-subject-button"
            className="gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" /> Create Subject
          </Button>
        )}
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))]" data-testid="subject-loading-skeleton">
          Loading subjects...
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div
          className="p-12 border border-dashed border-[hsl(var(--border))] rounded-xl text-center bg-[hsl(var(--card))]"
          data-testid={search ? 'subject-empty-search' : 'subject-empty-state'}
        >
          <Book className="h-10 w-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-medium text-[hsl(var(--foreground))] mb-1">
            {search ? 'No matching subjects found' : 'No subjects yet.'}
          </h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto mb-4">
            {search
              ? 'No subjects match your search query.'
              : 'Create reusable subjects such as Physics, Mathematics, or Chemistry.'}
          </p>
          {!search && canCreate && (
            <Button size="sm" onClick={onAddSubject} className="gap-1.5">
              <Plus className="h-4 w-4" /> Create First Subject
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))]" data-testid="subject-table">
            <table className="w-full text-left text-xs">
              <thead className="bg-[hsl(var(--muted)/0.4)] border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Subject Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))] text-[hsl(var(--foreground))]">
                {filteredSubjects.map((s) => (
                  <tr key={s.id} className="hover:bg-[hsl(var(--muted)/0.2)] transition-colors" data-testid={`subject-row-${s.id}`}>
                    <td className="py-3 px-4 font-mono font-bold">{s.code}</td>
                    <td className="py-3 px-4 font-medium">
                      <div>{s.name}</div>
                      {s.description && (
                        <div className="text-[11px] text-[hsl(var(--muted-foreground))] line-clamp-1">
                          {s.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={s.status === 'active' ? 'default' : s.status === 'archived' ? 'destructive' : 'secondary'}
                        className="capitalize text-[11px]"
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewSubject(s)}
                          title="View Details"
                          className="h-8 px-2"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {canUpdate && s.status !== 'archived' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditSubject(s)}
                            title="Edit Subject"
                            className="h-8 px-2"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canArchive && s.status !== 'archived' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onArchiveSubject(s)}
                            title="Archive Subject"
                            className="h-8 px-2 text-destructive hover:text-destructive"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredSubjects.map((s) => (
              <div
                key={s.id}
                className="p-4 border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] space-y-3"
                data-testid={`subject-card-${s.id}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-[hsl(var(--primary))] block">{s.code}</span>
                    <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">{s.name}</h4>
                  </div>
                  <Badge
                    variant={s.status === 'active' ? 'default' : s.status === 'archived' ? 'destructive' : 'secondary'}
                    className="capitalize text-[11px]"
                  >
                    {s.status}
                  </Badge>
                </div>

                {s.description && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">{s.description}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
                  <Button variant="outline" size="sm" onClick={() => onViewSubject(s)} className="h-8 text-xs">
                    View
                  </Button>
                  {canUpdate && s.status !== 'archived' && (
                    <Button variant="outline" size="sm" onClick={() => onEditSubject(s)} className="h-8 text-xs">
                      Edit
                    </Button>
                  )}
                  {canArchive && s.status !== 'archived' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onArchiveSubject(s)}
                      className="h-8 text-xs text-destructive"
                    >
                      Archive
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
