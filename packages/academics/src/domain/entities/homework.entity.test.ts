import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { HomeworkEntity } from './homework.entity';

describe('HomeworkEntity Domain Invariants', () => {
  const validProps = {
    id: 'hw-123',
    instituteId: 'inst-123',
    batchId: 'batch-123',
    title: 'Physics Chapter 3 Exercises',
    description: 'Solve questions 1 through 10',
    attachmentUrl: 'https://cdn.coachingos.test/homework/ch3.pdf',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should create a new HomeworkEntity in DRAFT state (publishedAt === null)', () => {
    const homework = HomeworkEntity.create({
      instituteId: validProps.instituteId,
      batchId: validProps.batchId,
      title: validProps.title,
      description: validProps.description,
      attachmentUrl: validProps.attachmentUrl,
    });

    expect(homework.id).toBeDefined();
    expect(homework.instituteId).toBe(validProps.instituteId);
    expect(homework.batchId).toBe(validProps.batchId);
    expect(homework.title).toBe(validProps.title);
    expect(homework.description).toBe(validProps.description);
    expect(homework.attachmentUrl).toBe(validProps.attachmentUrl);
    expect(homework.isDraft).toBe(true);
    expect(homework.isPublished).toBe(false);
    expect(homework.publishedAt).toBeNull();
  });

  it('should reject empty or invalid title', () => {
    expect(() =>
      HomeworkEntity.create({
        instituteId: validProps.instituteId,
        batchId: validProps.batchId,
        title: '   ',
      }),
    ).toThrow(ValidationError);

    expect(() =>
      HomeworkEntity.create({
        instituteId: validProps.instituteId,
        batchId: validProps.batchId,
        title: 'a'.repeat(256), // Exceeds 255 chars
      }),
    ).toThrow(ValidationError);
  });

  it('should update details while in DRAFT state', () => {
    const homework = HomeworkEntity.create({
      instituteId: validProps.instituteId,
      batchId: validProps.batchId,
      title: 'Old Title',
    });

    homework.updateDetails({
      title: 'New Title',
      description: 'Updated Description',
    });

    expect(homework.title).toBe('New Title');
    expect(homework.description).toBe('Updated Description');
  });

  it('should publish draft homework and set publishedAt timestamp', () => {
    const homework = HomeworkEntity.create({
      instituteId: validProps.instituteId,
      batchId: validProps.batchId,
      title: validProps.title,
    });

    expect(homework.isDraft).toBe(true);

    const publishDate = new Date('2026-08-17T12:00:00Z');
    homework.publish(publishDate);

    expect(homework.isPublished).toBe(true);
    expect(homework.isDraft).toBe(false);
    expect(homework.publishedAt?.toISOString()).toBe(publishDate.toISOString());
  });

  it('should be IDEMPOTENT when calling publish repeatedly on an already published homework', () => {
    const homework = HomeworkEntity.create({
      instituteId: validProps.instituteId,
      batchId: validProps.batchId,
      title: validProps.title,
    });

    const firstPublish = new Date('2026-08-17T12:00:00Z');
    homework.publish(firstPublish);

    const secondPublish = new Date('2026-08-18T12:00:00Z');
    homework.publish(secondPublish);

    expect(homework.publishedAt?.toISOString()).toBe(firstPublish.toISOString());
  });

  it('should REJECT updating details once published (Publication Immutability)', () => {
    const homework = HomeworkEntity.create({
      instituteId: validProps.instituteId,
      batchId: validProps.batchId,
      title: validProps.title,
    });

    homework.publish();

    expect(() =>
      homework.updateDetails({
        title: 'Sneaky Update',
      }),
    ).toThrow(ValidationError);
  });

  it('should serialize correctly to HomeworkDTO', () => {
    const homework = HomeworkEntity.from(validProps);
    const dto = homework.toDTO();

    expect(dto.id).toBe(validProps.id);
    expect(dto.instituteId).toBe(validProps.instituteId);
    expect(dto.batchId).toBe(validProps.batchId);
    expect(dto.title).toBe(validProps.title);
    expect(dto.isPublished).toBe(false);
    expect(dto.publishedAt).toBeNull();
  });
});
