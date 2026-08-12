'use client';

import React, { useState } from 'react';
import { Button, Input, Badge } from '@coaching-os/ui';
import { Plus, Search, Eye, Edit, Archive, BookOpen } from 'lucide-react';
import type { ProgramDTO } from '@coaching-os/identity/client';

export interface ProgramsViewProps {
  programs: ProgramDTO[];
  isLoading: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canArchive: boolean;
  onAddProgram: () => void;
  onViewProgram: (program: ProgramDTO) => void;
  onEditProgram: (program: ProgramDTO) => void;
  onArchiveProgram: (program: ProgramDTO) => void;
}

export function ProgramsView({
  programs,
  isLoading,
  canCreate,
  canUpdate,
  canArchive,
  onAddProgram,
  onViewProgram,
  onEditProgram,
  onArchiveProgram,
}: ProgramsViewProps) {
  const [search, setSearch] = useState('');

  const filteredPrograms = programs.filter(
    (p) =>
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-4" data-testid="programs-view">
      {/* Top Header & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[hsl(var(--card))] p-4 rounded-xl border border-[hsl(var(--border))]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <Input
            type="text"
            placeholder="Search programs by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
            data-testid="program-search-input"
          />
        </div>

        {canCreate && (
          <Button
            size="sm"
            onClick={onAddProgram}
            data-testid="add-program-button"
            className="gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" /> Create Program
          </Button>
        )}
      </div>

      {/* Main Content State */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))]" data-testid="program-loading-skeleton">
          Loading programs...
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div
          className="p-12 border border-dashed border-[hsl(var(--border))] rounded-xl text-center bg-[hsl(var(--card))]"
          data-testid={search ? 'program-empty-search' : 'program-empty-state'}
        >
          <BookOpen className="h-10 w-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-medium text-[hsl(var(--foreground))] mb-1">
            {search ? 'No matching programs found' : 'No programs yet.'}
          </h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto mb-4">
            {search
              ? 'No programs match your search query.'
              : 'Create academic programs to define structured learning pathways.'}
          </p>
          {!search && canCreate && (
            <Button size="sm" onClick={onAddProgram} className="gap-1.5">
              <Plus className="h-4 w-4" /> Create First Program
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))]" data-testid="program-table">
            <table className="w-full text-left text-xs">
              <thead className="bg-[hsl(var(--muted)/0.4)] border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Program Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))] text-[hsl(var(--foreground))]">
                {filteredPrograms.map((p) => (
                  <tr key={p.id} className="hover:bg-[hsl(var(--muted)/0.2)] transition-colors" data-testid={`program-row-${p.id}`}>
                    <td className="py-3 px-4 font-mono font-bold">{p.code}</td>
                    <td className="py-3 px-4 font-medium">
                      <div>{p.name}</div>
                      {p.description && (
                        <div className="text-[11px] text-[hsl(var(--muted-foreground))] line-clamp-1">
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={p.status === 'active' ? 'default' : p.status === 'archived' ? 'destructive' : 'secondary'}
                        className="capitalize text-[11px]"
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewProgram(p)}
                          title="View Details"
                          className="h-8 px-2"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {canUpdate && p.status !== 'archived' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditProgram(p)}
                            title="Edit Program"
                            className="h-8 px-2"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canArchive && p.status !== 'archived' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onArchiveProgram(p)}
                            title="Archive Program"
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
            {filteredPrograms.map((p) => (
              <div
                key={p.id}
                className="p-4 border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] space-y-3"
                data-testid={`program-card-${p.id}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-[hsl(var(--primary))] block">{p.code}</span>
                    <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">{p.name}</h4>
                  </div>
                  <Badge
                    variant={p.status === 'active' ? 'default' : p.status === 'archived' ? 'destructive' : 'secondary'}
                    className="capitalize text-[11px]"
                  >
                    {p.status}
                  </Badge>
                </div>

                {p.description && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">{p.description}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
                  <Button variant="outline" size="sm" onClick={() => onViewProgram(p)} className="h-8 text-xs">
                    View
                  </Button>
                  {canUpdate && p.status !== 'archived' && (
                    <Button variant="outline" size="sm" onClick={() => onEditProgram(p)} className="h-8 text-xs">
                      Edit
                    </Button>
                  )}
                  {canArchive && p.status !== 'archived' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onArchiveProgram(p)}
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
