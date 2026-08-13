import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { BatchSessionEntity } from './batch-session.entity';

describe('BatchSessionEntity Domain Entity', () => {
  it('should create valid BatchSessionEntity with default scheduled status', () => {
    const session = BatchSessionEntity.create({
      instituteId: 'inst-1',
      batchId: 'batch-1',
      date: '2026-08-17',
      startTime: '17:00',
      endTime: '18:30',
    });

    expect(session.instituteId).toBe('inst-1');
    expect(session.batchId).toBe('batch-1');
    expect(session.status).toBe('scheduled');
    expect(session.attendanceTaken).toBe(false);
    expect(session.startTime?.value).toBe('17:00');
    expect(session.endTime?.value).toBe('18:30');
  });

  it('should complete a scheduled session', () => {
    const session = BatchSessionEntity.create({
      instituteId: 'inst-1',
      batchId: 'batch-1',
      date: '2026-08-17',
    });

    session.complete();
    expect(session.status).toBe('completed');
  });

  it('should cancel a scheduled session', () => {
    const session = BatchSessionEntity.create({
      instituteId: 'inst-1',
      batchId: 'batch-1',
      date: '2026-08-17',
    });

    session.cancel();
    expect(session.status).toBe('cancelled');
  });

  it('should throw ValidationError when attempting to complete a cancelled session', () => {
    const session = BatchSessionEntity.create({
      instituteId: 'inst-1',
      batchId: 'batch-1',
      date: '2026-08-17',
    });

    session.cancel();
    expect(() => session.complete()).toThrow(ValidationError);
  });

  it('should throw ValidationError when attempting to cancel an already completed session', () => {
    const session = BatchSessionEntity.create({
      instituteId: 'inst-1',
      batchId: 'batch-1',
      date: '2026-08-17',
    });

    session.complete();
    expect(() => session.cancel()).toThrow(ValidationError);
  });

  it('should throw ValidationError when recording attendance on a cancelled session', () => {
    const session = BatchSessionEntity.create({
      instituteId: 'inst-1',
      batchId: 'batch-1',
      date: '2026-08-17',
    });

    session.cancel();
    expect(() => session.markAttendanceTaken()).toThrow(ValidationError);
  });
});
