import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AnnouncementList,
  PublishConfirmationDialog,
  ArchiveConfirmationDialog,
  AnnouncementEditorSheet,
  NotificationList,
  UnreadCountBadge,
  StudentActivityTimeline,
  v1CommunicationClient,
  type AnnouncementDTO,
} from './index';

const mockAnnouncement: AnnouncementDTO = {
  id: 'ann-1',
  instituteId: 'inst-1',
  authorUserId: 'user-1',
  targetType: 'institute',
  targetBatchId: null,
  title: 'Annual Sports Meet 2026 Schedule',
  body: 'The annual sports meet will be held on December 20, 2026 at the Main Stadium.',
  status: 'draft',
  publishedAt: null,
  archivedAt: null,
  createdAt: '2026-08-15T00:00:00.000Z',
  updatedAt: '2026-08-15T00:00:00.000Z',
};

describe('Communication UI Component Suite', () => {
  describe('Announcement Workspace Components', () => {
    it('renders Permission Denied alert when announcement:read capability is missing', () => {
      const html = renderToStaticMarkup(<AnnouncementList userCapabilities={[]} />);
      expect(html).toContain('Permission Denied');
      expect(html).toContain('do not have permission to view announcements');
    });

    it('renders Create Announcement button when announcement:create capability is present', () => {
      const html = renderToStaticMarkup(
        <AnnouncementList userCapabilities={['announcement:read', 'announcement:create']} />,
      );
      expect(html).toContain('New Announcement');
    });

    it('hides Create Announcement button when announcement:create capability is missing', () => {
      const html = renderToStaticMarkup(
        <AnnouncementList userCapabilities={['announcement:read']} />,
      );
      expect(html).not.toContain('New Announcement');
    });

    it('renders PublishConfirmationDialog with irreversible immutability warning', () => {
      const html = renderToStaticMarkup(
        <PublishConfirmationDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          announcement={mockAnnouncement}
          isPublishing={false}
        />,
      );
      expect(html).toContain('Publish Announcement?');
      expect(html).toContain('Publishing makes this announcement immediately visible to all targeted recipients and <strong>immutable</strong>');
      expect(html).toContain('Publish Now');
    });

    it('renders ArchiveConfirmationDialog with confirmation text', () => {
      const html = renderToStaticMarkup(
        <ArchiveConfirmationDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          announcement={{ ...mockAnnouncement, status: 'published' }}
          isArchiving={false}
        />,
      );
      expect(html).toContain('Archive Announcement?');
      expect(html).toContain('Archiving moves this published announcement to historical archives');
      expect(html).toContain('Archive Announcement');
    });

    it('renders AnnouncementEditorSheet for draft creation', () => {
      const html = renderToStaticMarkup(
        <AnnouncementEditorSheet
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          initialData={null}
          isSaving={false}
        />,
      );
      expect(html).toContain('Create Draft Announcement');
      expect(html).toContain('Institute-Wide');
      expect(html).toContain('Batch Targeted');
      expect(html).toContain('Save Draft');
    });
  });

  describe('Notification Workspace Components', () => {
    it('renders Permission Denied alert when notification:read capability is missing', () => {
      const html = renderToStaticMarkup(<NotificationList userCapabilities={[]} />);
      expect(html).toContain('Permission Denied');
      expect(html).toContain('do not have permission to view notifications');
    });

    it('renders Notification List header when capability is present', () => {
      const html = renderToStaticMarkup(
        <NotificationList userCapabilities={['notification:read']} />,
      );
      expect(html).toContain('Notifications');
      expect(html).toContain('All Alerts');
      expect(html).toContain('Unread Only');
    });

    it('renders UnreadCountBadge structure', () => {
      const html = renderToStaticMarkup(<UnreadCountBadge />);
      expect(html).toContain('relative inline-flex items-center');
    });
  });

  describe('Student Activity Timeline Components (Read-Only)', () => {
    it('renders Permission Denied alert when activity:read capability is missing', () => {
      const html = renderToStaticMarkup(<StudentActivityTimeline studentId="std-1" userCapabilities={[]} />);
      expect(html).toContain('Permission Denied');
      expect(html).toContain('do not have permission to view student activity timelines');
    });

    it('renders Student Activity Timeline header and event filter dropdown when capability is present', () => {
      const html = renderToStaticMarkup(
        <StudentActivityTimeline studentId="std-1" userCapabilities={['activity:read']} />,
      );
      expect(html).toContain('Activity Timeline');
      expect(html).toContain('All Events');
      expect(html).toContain('Attendance: Absent');
      expect(html).toContain('Test Result');
    });

    it('guarantees 0 mutation controls (no create, edit, or delete buttons) in Activity Timeline', () => {
      const html = renderToStaticMarkup(
        <StudentActivityTimeline studentId="std-1" userCapabilities={['activity:read']} />,
      );
      expect(html).not.toContain('Create Activity');
      expect(html).not.toContain('Edit Activity');
      expect(html).not.toContain('Delete Activity');
    });
  });

  describe('v1CommunicationClient Wrapper Surface', () => {
    it('exposes all required API methods for Phase 4.6.1 REST endpoints', () => {
      expect(typeof v1CommunicationClient.listAnnouncements).toBe('function');
      expect(typeof v1CommunicationClient.getAnnouncement).toBe('function');
      expect(typeof v1CommunicationClient.createAnnouncement).toBe('function');
      expect(typeof v1CommunicationClient.updateAnnouncement).toBe('function');
      expect(typeof v1CommunicationClient.deleteAnnouncement).toBe('function');
      expect(typeof v1CommunicationClient.publishAnnouncement).toBe('function');
      expect(typeof v1CommunicationClient.archiveAnnouncement).toBe('function');
      expect(typeof v1CommunicationClient.listNotifications).toBe('function');
      expect(typeof v1CommunicationClient.getUnreadNotificationCount).toBe('function');
      expect(typeof v1CommunicationClient.getNotification).toBe('function');
      expect(typeof v1CommunicationClient.markNotificationAsRead).toBe('function');
      expect(typeof v1CommunicationClient.listStudentActivities).toBe('function');
      expect(typeof v1CommunicationClient.getStudentActivity).toBe('function');
    });
  });
});
