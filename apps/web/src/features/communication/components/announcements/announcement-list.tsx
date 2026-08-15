'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Button, Input, Skeleton, Alert, AlertTitle, AlertDescription } from '@coaching-os/ui';
import {
  Megaphone,
  Plus,
  Search,
  Edit3,
  Trash2,
  Send,
  Archive,
  AlertCircle,
  Users,
  Building2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import type {
  AnnouncementDTO,
  AnnouncementStatus,
  CreateAnnouncementInput,
} from '../../types/communication-ui.types';
import { v1CommunicationClient } from '../../api/v1-communication-client';
import { AnnouncementEditorSheet } from './announcement-editor-sheet';
import { PublishConfirmationDialog } from './publish-confirmation-dialog';
import { ArchiveConfirmationDialog } from './archive-confirmation-dialog';

export interface AnnouncementListProps {
  userCapabilities?: string[];
}

export function AnnouncementList({ userCapabilities = [] }: AnnouncementListProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<AnnouncementStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editor Sheet State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<AnnouncementDTO | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Publish Dialog State
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [selectedForPublish, setSelectedForPublish] = useState<AnnouncementDTO | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Archive Dialog State
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [selectedForArchive, setSelectedForArchive] = useState<AnnouncementDTO | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Capabilities
  const hasRead = userCapabilities.includes('announcement:read');
  const hasCreate = userCapabilities.includes('announcement:create');
  const hasUpdate = userCapabilities.includes('announcement:update');
  const hasPublish = userCapabilities.includes('announcement:publish');
  const hasDelete = userCapabilities.includes('announcement:delete');

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await v1CommunicationClient.listAnnouncements({
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setAnnouncements(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load announcements';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    let isMounted = true;
    if (hasRead) {
      v1CommunicationClient
        .listAnnouncements({
          status: statusFilter === 'all' ? undefined : statusFilter,
        })
        .then((data) => {
          if (isMounted) {
            setAnnouncements(data);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (isMounted) {
            const message = err instanceof Error ? err.message : 'Failed to load announcements';
            setError(message);
            setLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [hasRead, statusFilter]);

  // Create / Edit Save
  const handleSave = async (input: CreateAnnouncementInput) => {
    setIsSaving(true);
    try {
      if (selectedForEdit) {
        await v1CommunicationClient.updateAnnouncement(selectedForEdit.id, input);
      } else {
        await v1CommunicationClient.createAnnouncement(input);
      }
      setIsEditorOpen(false);
      setSelectedForEdit(null);
      await fetchAnnouncements();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save announcement draft';
      alert(`Error: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Draft
  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft announcement?')) return;
    try {
      await v1CommunicationClient.deleteAnnouncement(id);
      await fetchAnnouncements();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete announcement draft';
      alert(`Error: ${message}`);
    }
  };

  // Publish Confirm
  const handlePublishConfirm = async () => {
    if (!selectedForPublish) return;
    setIsPublishing(true);
    try {
      await v1CommunicationClient.publishAnnouncement(selectedForPublish.id);
      setIsPublishDialogOpen(false);
      setSelectedForPublish(null);
      await fetchAnnouncements();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to publish announcement';
      alert(`Error: ${message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // Archive Confirm
  const handleArchiveConfirm = async () => {
    if (!selectedForArchive) return;
    setIsArchiving(true);
    try {
      await v1CommunicationClient.archiveAnnouncement(selectedForArchive.id);
      setIsArchiveDialogOpen(false);
      setSelectedForArchive(null);
      await fetchAnnouncements();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to archive announcement';
      alert(`Error: ${message}`);
    } finally {
      setIsArchiving(false);
    }
  };

  if (!hasRead) {
    return (
      <Alert variant="destructive" className="my-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Permission Denied</AlertTitle>
        <AlertDescription>
          You do not have permission to view announcements. Contact your institute administrator.
        </AlertDescription>
      </Alert>
    );
  }

  // Filtered by Search
  const filteredAnnouncements = announcements.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Announcements
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Broadcast official notices, schedule changes, and updates to staff, students, and parents.
          </p>
        </div>
        {hasCreate && (
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setSelectedForEdit(null);
              setIsEditorOpen(true);
            }}
            className="flex items-center gap-1.5"
            data-testid="create-announcement-btn"
          >
            <Plus className="h-4 w-4" />
            <span>New Announcement</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-[hsl(var(--muted)/0.3)] p-1 rounded-lg border border-[hsl(var(--border))]">
          {(['all', 'draft', 'published', 'archived'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${
                statusFilter === status
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
              data-testid={`filter-${status}`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <Input
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Announcements</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchAnnouncements} className="h-7 text-xs">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading Skeletons */}
      {loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-16 w-full" />
              <div className="flex justify-end gap-2 pt-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredAnnouncements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] text-center p-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Megaphone className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[hsl(var(--foreground))]">No Announcements Found</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mt-1 mb-4">
            {statusFilter === 'all'
              ? 'No announcements have been created yet.'
              : `There are no ${statusFilter} announcements matching your filter.`}
          </p>
          {hasCreate && statusFilter === 'all' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setSelectedForEdit(null);
                setIsEditorOpen(true);
              }}
            >
              Create First Announcement
            </Button>
          )}
        </div>
      )}

      {/* Announcement Cards List */}
      {!loading && !error && filteredAnnouncements.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              className="group border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] p-5 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-shadow"
              data-testid={`announcement-card-${announcement.id}`}
            >
              {/* Header Badge & Target */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  {/* Status Badge */}
                  {announcement.status === 'draft' && (
                    <Badge variant="warning" className="text-[10px] uppercase font-bold tracking-wide">
                      Draft
                    </Badge>
                  )}
                  {announcement.status === 'published' && (
                    <Badge variant="success" className="text-[10px] uppercase font-bold tracking-wide flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Published
                    </Badge>
                  )}
                  {announcement.status === 'archived' && (
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wide">
                      Archived
                    </Badge>
                  )}

                  {/* Target Scope Badge */}
                  <div className="flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.4)] px-2 py-0.5 rounded-md">
                    {announcement.targetType === 'institute' ? (
                      <>
                        <Building2 className="h-3 w-3" />
                        <span>Institute-Wide</span>
                      </>
                    ) : (
                      <>
                        <Users className="h-3 w-3" />
                        <span>Batch: {announcement.targetBatchId}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-[hsl(var(--foreground))] group-hover:text-primary transition-colors">
                  {announcement.title}
                </h3>

                {/* Body Snippet */}
                <p className="text-xs text-[hsl(var(--muted-foreground))] whitespace-pre-wrap line-clamp-3 leading-relaxed">
                  {announcement.body}
                </p>
              </div>

              {/* Footer Timestamps & Actions */}
              <div className="pt-3 border-t border-[hsl(var(--border))] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {announcement.status === 'published' && announcement.publishedAt
                      ? `Published ${new Date(announcement.publishedAt).toLocaleDateString()}`
                      : `Created ${new Date(announcement.createdAt).toLocaleDateString()}`}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5">
                  {/* Draft State Actions */}
                  {announcement.status === 'draft' && (
                    <>
                      {hasUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedForEdit(announcement);
                            setIsEditorOpen(true);
                          }}
                          className="h-8 px-2 text-xs flex items-center gap-1"
                          title="Edit Draft"
                          data-testid={`edit-btn-${announcement.id}`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </Button>
                      )}

                      {hasDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDraft(announcement.id)}
                          className="h-8 px-2 text-xs text-destructive hover:text-destructive flex items-center gap-1"
                          title="Delete Draft"
                          data-testid={`delete-btn-${announcement.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </Button>
                      )}

                      {hasPublish && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedForPublish(announcement);
                            setIsPublishDialogOpen(true);
                          }}
                          className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                          data-testid={`publish-btn-${announcement.id}`}
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Publish</span>
                        </Button>
                      )}
                    </>
                  )}

                  {/* Published State Actions */}
                  {announcement.status === 'published' && (
                    <>
                      {hasPublish && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedForArchive(announcement);
                            setIsArchiveDialogOpen(true);
                          }}
                          className="h-8 px-2.5 text-xs flex items-center gap-1"
                          data-testid={`archive-btn-${announcement.id}`}
                        >
                          <Archive className="h-3.5 w-3.5" />
                          <span>Archive</span>
                        </Button>
                      )}
                    </>
                  )}

                  {/* Archived State: Read-Only (No Buttons) */}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Sheet Modal */}
      <AnnouncementEditorSheet
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedForEdit(null);
        }}
        onSave={handleSave}
        initialData={selectedForEdit}
        isSaving={isSaving}
      />

      {/* Publish Confirmation Dialog */}
      <PublishConfirmationDialog
        isOpen={isPublishDialogOpen}
        onClose={() => {
          setIsPublishDialogOpen(false);
          setSelectedForPublish(null);
        }}
        onConfirm={handlePublishConfirm}
        announcement={selectedForPublish}
        isPublishing={isPublishing}
      />

      {/* Archive Confirmation Dialog */}
      <ArchiveConfirmationDialog
        isOpen={isArchiveDialogOpen}
        onClose={() => {
          setIsArchiveDialogOpen(false);
          setSelectedForArchive(null);
        }}
        onConfirm={handleArchiveConfirm}
        announcement={selectedForArchive}
        isArchiving={isArchiving}
      />
    </div>
  );
}
