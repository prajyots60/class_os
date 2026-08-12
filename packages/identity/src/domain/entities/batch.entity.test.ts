import { describe, expect, it } from 'vitest';
import { BatchEntity } from './batch.entity';

describe('BatchEntity Domain Entity', () => {
  const validProps = {
    instituteId: 'inst-123',
    subjectId: 'subj-101',
    programId: 'prog-201',
    teacherId: 'member-301',
    name: 'Morning Batch A',
    code: 'BATCH-A1',
    capacity: 30,
    startDate: new Date('2026-09-01'),
    endDate: new Date('2027-05-31'),
  };

  it('creates a valid BatchEntity with default draft status', () => {
    const batch = BatchEntity.create(validProps);
    expect(batch.id).toBeDefined();
    expect(batch.instituteId).toBe('inst-123');
    expect(batch.subjectId).toBe('subj-101');
    expect(batch.programId).toBe('prog-201');
    expect(batch.teacherId).toBe('member-301');
    expect(batch.name).toBe('Morning Batch A');
    expect(batch.code.value).toBe('BATCH-A1');
    expect(batch.capacity).toBe(30);
    expect(batch.status).toBe('draft');
    expect(batch.deletedAt).toBeNull();
  });

  it('STRICT BOUNDARY CHECK: preserves Phase 1.11 boundary (no student/enrollment properties)', () => {
    const batch = BatchEntity.create(validProps);
    const obj = batch as unknown as Record<string, unknown>;
    expect(obj.studentId).toBeUndefined();
    expect(obj.studentIds).toBeUndefined();
    expect(obj.enrollmentId).toBeUndefined();
    expect(obj.enrollments).toBeUndefined();

    const dto = batch.toDTO() as unknown as Record<string, unknown>;
    expect(dto.studentId).toBeUndefined();
    expect(dto.studentIds).toBeUndefined();
    expect(dto.enrollments).toBeUndefined();
  });

  it('validates state transitions: draft -> open -> running -> completed -> archived', () => {
    const batch = BatchEntity.create(validProps);
    expect(batch.status).toBe('draft');

    batch.open();
    expect(batch.status).toBe('open');

    batch.start();
    expect(batch.status).toBe('running');

    batch.complete();
    expect(batch.status).toBe('completed');

    batch.archive();
    expect(batch.status).toBe('archived');
    expect(batch.deletedAt).toBeInstanceOf(Date);
  });

  it('rejects illegal state transitions', () => {
    // Cannot start draft directly
    const draftBatch = BatchEntity.create(validProps);
    expect(() => draftBatch.start()).toThrow('Open the batch first');

    // Cannot start completed batch
    const runningBatch = BatchEntity.create({ ...validProps, status: 'open' });
    runningBatch.start();
    runningBatch.complete();
    expect(() => runningBatch.start()).toThrow('Cannot start a completed batch');

    // Cannot activate archived batch
    const archivedBatch = BatchEntity.create({ ...validProps, status: 'archived' });
    expect(() => archivedBatch.open()).toThrow('Cannot open an archived batch');
    expect(() => archivedBatch.start()).toThrow('Cannot start an archived batch');
    expect(() => archivedBatch.complete()).toThrow('Cannot complete an archived batch');
  });

  it('validates date ranges (endDate must be after startDate)', () => {
    expect(() =>
      BatchEntity.create({
        ...validProps,
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-09-01'),
      }),
    ).toThrow('Batch end date must be strictly after start date');
  });

  it('validates capacity (must be positive integer)', () => {
    expect(() =>
      BatchEntity.create({
        ...validProps,
        capacity: -5,
      }),
    ).toThrow('Capacity must be a positive integer');

    expect(() =>
      BatchEntity.create({
        ...validProps,
        capacity: 3.5,
      }),
    ).toThrow('Capacity must be a positive integer');
  });
});
