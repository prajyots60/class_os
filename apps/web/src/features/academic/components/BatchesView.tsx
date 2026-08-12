'use client';

import React, { useState } from 'react';
import { Button, Input, Badge } from '@coaching-os/ui';
import { Plus, Search, Eye, Edit, UserCheck, ArrowRightLeft, Archive, Users } from 'lucide-react';
import type { BatchDTO, ProgramDTO, SubjectDTO } from '@coaching-os/identity/client';
import type { StaffMemberDTO } from '../types/academic-ui.types';

export interface BatchesViewProps {
  batches: BatchDTO[];
  programs: ProgramDTO[];
  subjects: SubjectDTO[];
  staff: StaffMemberDTO[];
  isLoading: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canTeacher: boolean;
  canStatus: boolean;
  canArchive: boolean;
  onAddBatch: () => void;
  onViewBatch: (batch: BatchDTO) => void;
  onEditBatch: (batch: BatchDTO) => void;
  onAssignTeacher: (batch: BatchDTO) => void;
  onChangeStatus: (batch: BatchDTO) => void;
  onArchiveBatch: (batch: BatchDTO) => void;
}

export function BatchesView({
  batches,
  programs,
  subjects,
  isLoading,
  canCreate,
  canUpdate,
  canTeacher,
  canStatus,
  canArchive,
  onAddBatch,
  onViewBatch,
  onEditBatch,
  onAssignTeacher,
  onChangeStatus,
  onArchiveBatch,
}: BatchesViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const programMap = new Map(programs.map((p) => [p.id, p]));

  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.code.toLowerCase().includes(search.toLowerCase()) ||
      b.name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4" data-testid="batches-view">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[hsl(var(--card))] p-4 rounded-xl border border-[hsl(var(--border))]">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <Input
              type="text"
              placeholder="Search batches by code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
              data-testid="batch-search-input"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            data-testid="batch-status-filter"
            aria-label="Filter by Batch Status"
            className="h-9 px-3 text-xs rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shrink-0"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {canCreate && (
          <Button
            size="sm"
            onClick={onAddBatch}
            data-testid="add-batch-button"
            className="gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" /> Create Batch
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))]" data-testid="batch-loading-skeleton">
          Loading batches...
        </div>
      ) : filteredBatches.length === 0 ? (
        <div
          className="p-12 border border-dashed border-[hsl(var(--border))] rounded-xl text-center bg-[hsl(var(--card))]"
          data-testid={search || statusFilter !== 'all' ? 'batch-empty-search' : 'batch-empty-state'}
        >
          <Users className="h-10 w-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-medium text-[hsl(var(--foreground))] mb-1">
            {search || statusFilter !== 'all' ? 'No matching batches found' : 'No batches yet.'}
          </h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto mb-4">
            {search || statusFilter !== 'all'
              ? 'No batches match your filter criteria.'
              : 'Create academic batches to organize learning cohorts by subject and program.'}
          </p>
          {!search && statusFilter === 'all' && canCreate && (
            <Button size="sm" onClick={onAddBatch} className="gap-1.5">
              <Plus className="h-4 w-4" /> Create First Batch
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))]" data-testid="batch-table">
            <table className="w-full text-left text-xs">
              <thead className="bg-[hsl(var(--muted)/0.4)] border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Batch Name</th>
                  <th className="py-3 px-4">Subject & Program</th>
                  <th className="py-3 px-4">Teacher</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))] text-[hsl(var(--foreground))]">
                {filteredBatches.map((b) => {
                  const subject = subjectMap.get(b.subjectId);
                  const program = b.programId ? programMap.get(b.programId) : null;

                  return (
                    <tr key={b.id} className="hover:bg-[hsl(var(--muted)/0.2)] transition-colors" data-testid={`batch-row-${b.id}`}>
                      <td className="py-3 px-4 font-mono font-bold">{b.code}</td>
                      <td className="py-3 px-4 font-medium">{b.name}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[hsl(var(--foreground))]">
                          {subject ? subject.code : b.subjectId}
                        </div>
                        {program && (
                          <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                            {program.code}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {b.teacherId ? (
                          <span className="text-[11px] font-medium text-emerald-500 flex items-center gap-1">
                            <UserCheck className="h-3 w-3" /> Assigned
                          </span>
                        ) : (
                          <span className="text-[11px] text-[hsl(var(--muted-foreground))] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {b.capacity ? `${b.capacity} seats` : 'Uncapped'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={b.status === 'running' || b.status === 'open' ? 'default' : b.status === 'archived' ? 'destructive' : 'secondary'}
                          className="capitalize text-[11px]"
                        >
                          {b.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewBatch(b)}
                            title="View Details"
                            className="h-8 px-2"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {canUpdate && b.status !== 'archived' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditBatch(b)}
                              title="Edit Batch"
                              className="h-8 px-2"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canTeacher && b.status !== 'archived' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onAssignTeacher(b)}
                              title="Assign Teacher"
                              data-testid={`batch-teacher-action-${b.id}`}
                              className="h-8 px-2"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canStatus && b.status !== 'archived' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onChangeStatus(b)}
                              title="Change Status"
                              data-testid={`batch-status-action-${b.id}`}
                              className="h-8 px-2"
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canArchive && b.status !== 'archived' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onArchiveBatch(b)}
                              title="Archive Batch"
                              data-testid={`batch-archive-action-${b.id}`}
                              className="h-8 px-2 text-destructive hover:text-destructive"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredBatches.map((b) => {
              const subject = subjectMap.get(b.subjectId);
              const program = b.programId ? programMap.get(b.programId) : null;

              return (
                <div
                  key={b.id}
                  className="p-4 border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] space-y-3"
                  data-testid={`batch-card-${b.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-[hsl(var(--primary))] block">{b.code}</span>
                      <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">{b.name}</h4>
                    </div>
                    <Badge
                      variant={b.status === 'running' || b.status === 'open' ? 'default' : b.status === 'archived' ? 'destructive' : 'secondary'}
                      className="capitalize text-[11px]"
                    >
                      {b.status}
                    </Badge>
                  </div>

                  <div className="text-xs space-y-1 text-[hsl(var(--muted-foreground))]">
                    <div>Subject: <strong className="text-[hsl(var(--foreground))]">{subject ? subject.name : b.subjectId}</strong></div>
                    {program && <div>Program: <strong className="text-[hsl(var(--foreground))]">{program.name}</strong></div>}
                    <div>Teacher: {b.teacherId ? <span className="text-emerald-500 font-semibold">Assigned</span> : 'Unassigned'}</div>
                    <div>Capacity: {b.capacity ? `${b.capacity} seats` : 'Uncapped'}</div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-[hsl(var(--border))]">
                    <Button variant="outline" size="sm" onClick={() => onViewBatch(b)} className="h-7 text-xs">
                      View
                    </Button>
                    {canUpdate && b.status !== 'archived' && (
                      <Button variant="outline" size="sm" onClick={() => onEditBatch(b)} className="h-7 text-xs">
                        Edit
                      </Button>
                    )}
                    {canTeacher && b.status !== 'archived' && (
                      <Button variant="outline" size="sm" onClick={() => onAssignTeacher(b)} className="h-7 text-xs">
                        Teacher
                      </Button>
                    )}
                    {canStatus && b.status !== 'archived' && (
                      <Button variant="outline" size="sm" onClick={() => onChangeStatus(b)} className="h-7 text-xs">
                        Status
                      </Button>
                    )}
                    {canArchive && b.status !== 'archived' && (
                      <Button variant="outline" size="sm" onClick={() => onArchiveBatch(b)} className="h-7 text-xs text-destructive">
                        Archive
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
