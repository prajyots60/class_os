import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { AnnouncementEntity } from './announcement.entity';

describe('AnnouncementEntity Domain Suite', () => {
  const validId = '00000000-0000-4000-a000-000000000001';
  const validInstituteId = '00000000-0000-4000-a000-000000000002';
  const validBatchId = '00000000-0000-4000-a000-000000000003';

  it('creates a valid institute-wide draft announcement', () => {
    const announcement = AnnouncementEntity.create({
      id: validId,
      instituteId: validInstituteId,
      targetType: 'institute',
      title: 'Welcome to New Term',
      content: 'Classes start next Monday.',
    });

    expect(announcement.id).toBe(validId);
    expect(announcement.instituteId).toBe(validInstituteId);
    expect(announcement.targetType).toBe('institute');
    expect(announcement.targetBatchId).toBeNull();
    expect(announcement.title).toBe('Welcome to New Term');
    expect(announcement.content).toBe('Classes start next Monday.');
    expect(announcement.status).toBe('draft');
    expect(announcement.isDraft).toBe(true);
    expect(announcement.isPublished).toBe(false);
    expect(announcement.publishedAt).toBeNull();
  });

  it('creates a valid batch-targeted draft announcement', () => {
    const announcement = AnnouncementEntity.create({
      id: validId,
      instituteId: validInstituteId,
      targetType: 'batch',
      targetBatchId: validBatchId,
      title: 'Batch Physics Exam Schedule',
      content: 'Physics test on Friday 5 PM.',
    });

    expect(announcement.targetType).toBe('batch');
    expect(announcement.targetBatchId).toBe(validBatchId);
    expect(announcement.status).toBe('draft');
  });

  it('rejects empty title or title exceeding 200 characters', () => {
    expect(() =>
      AnnouncementEntity.create({
        id: validId,
        instituteId: validInstituteId,
        targetType: 'institute',
        title: '   ',
        content: 'Valid content',
      }),
    ).toThrow(ValidationError);

    const longTitle = 'a'.repeat(201);
    expect(() =>
      AnnouncementEntity.create({
        id: validId,
        instituteId: validInstituteId,
        targetType: 'institute',
        title: longTitle,
        content: 'Valid content',
      }),
    ).toThrow(ValidationError);
  });

  it('rejects empty content or content exceeding 5000 characters', () => {
    expect(() =>
      AnnouncementEntity.create({
        id: validId,
        instituteId: validInstituteId,
        targetType: 'institute',
        title: 'Valid Title',
        content: '',
      }),
    ).toThrow(ValidationError);

    const longContent = 'b'.repeat(5001);
    expect(() =>
      AnnouncementEntity.create({
        id: validId,
        instituteId: validInstituteId,
        targetType: 'institute',
        title: 'Valid Title',
        content: longContent,
      }),
    ).toThrow(ValidationError);
  });

  it('rejects institute-wide target with batchId set', () => {
    expect(() =>
      AnnouncementEntity.create({
        id: validId,
        instituteId: validInstituteId,
        targetType: 'institute',
        targetBatchId: validBatchId,
        title: 'Title',
        content: 'Content',
      }),
    ).toThrow(ValidationError);
  });

  it('rejects batch target without batchId', () => {
    expect(() =>
      AnnouncementEntity.create({
        id: validId,
        instituteId: validInstituteId,
        targetType: 'batch',
        targetBatchId: null,
        title: 'Title',
        content: 'Content',
      }),
    ).toThrow(ValidationError);
  });

  describe('Lifecycle State Machine Transitions', () => {
    it('successfully publishes a draft announcement (draft -> published)', () => {
      const announcement = AnnouncementEntity.create({
        id: validId,
        instituteId: validInstituteId,
        targetType: 'institute',
        title: 'Title',
        content: 'Content',
      });

      const publishTime = new Date('2026-08-14T12:00:00Z');
      announcement.publish(publishTime);

      expect(announcement.status).toBe('published');
      expect(announcement.isPublished).toBe(true);
      expect(announcement.publishedAt).toEqual(publishTime);
    });

    it('prevents double publishing (published -> published)', () => {
      const announcement = AnnouncementEntity.create({
        id: validId,
        instituteId: validInstituteId,
        targetType: 'institute',
        title: 'Title',
        content: 'Content',
        publishedAt: new Date(),
      });

      expect(() => announcement.publish()).toThrow(ValidationError);
    });

    it('successfully archives a published announcement (published -> archived)', () => {
      const announcement = AnnouncementEntity.create({
        id: validId,
        instituteId: validInstituteId,
        targetType: 'institute',
        title: 'Title',
        content: 'Content',
        publishedAt: new Date(),
      });

      announcement.archive();
      expect(announcement.status).toBe('archived');
      expect(announcement.isArchived).toBe(true);
    });

    it('prevents archiving a draft announcement (draft -> archived)', () => {
      const announcement = AnnouncementEntity.create({
        id: validId,
        instituteId: validInstituteId,
        targetType: 'institute',
        title: 'Title',
        content: 'Content',
      });

      expect(() => announcement.archive()).toThrow(ValidationError);
    });

    it('prevents publishing an archived announcement (archived -> published)', () => {
      const announcement = AnnouncementEntity.create({
        id: validId,
        instituteId: validInstituteId,
        targetType: 'institute',
        title: 'Title',
        content: 'Content',
        publishedAt: new Date(),
        isArchived: true,
      });

      expect(() => announcement.publish()).toThrow(ValidationError);
    });

    it('prevents archiving an already archived announcement (archived -> archived)', () => {
      const announcement = AnnouncementEntity.create({
        id: validId,
        instituteId: validInstituteId,
        targetType: 'institute',
        title: 'Title',
        content: 'Content',
        publishedAt: new Date(),
        isArchived: true,
      });

      expect(() => announcement.archive()).toThrow(ValidationError);
    });
  });

  describe('Immutability Invariants', () => {
    it('allows updating a draft announcement', () => {
      const announcement = AnnouncementEntity.create({
        id: validId,
        instituteId: validInstituteId,
        targetType: 'institute',
        title: 'Old Title',
        content: 'Old Content',
      });

      announcement.updateDraft({
        title: 'New Title',
        content: 'New Content',
      });

      expect(announcement.title).toBe('New Title');
      expect(announcement.content).toBe('New Content');
    });

    it('prevents updating a published announcement', () => {
      const announcement = AnnouncementEntity.create({
        id: validId,
        instituteId: validInstituteId,
        targetType: 'institute',
        title: 'Published Title',
        content: 'Published Content',
        publishedAt: new Date(),
      });

      expect(() =>
        announcement.updateDraft({
          title: 'Modified Title',
        }),
      ).toThrow(ValidationError);
    });

    it('prevents updating an archived announcement', () => {
      const announcement = AnnouncementEntity.create({
        id: validId,
        instituteId: validInstituteId,
        targetType: 'institute',
        title: 'Archived Title',
        content: 'Archived Content',
        publishedAt: new Date(),
        isArchived: true,
      });

      expect(() =>
        announcement.updateDraft({
          title: 'Modified Title',
        }),
      ).toThrow(ValidationError);
    });
  });
});
