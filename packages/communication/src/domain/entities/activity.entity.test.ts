import { describe, it, expect } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { ActivityEntity } from './activity.entity';

describe('ActivityEntity Unit Tests', () => {
  const validProps = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    instituteId: '123e4567-e89b-12d3-a456-426614174001',
    studentId: '123e4567-e89b-12d3-a456-426614174002',
    eventType: 'attendance_absent' as const,
    title: 'Absent from Mathematics Session',
    description: 'Student was marked absent by Teacher Sharma',
    occurredAt: new Date('2026-08-14T10:00:00Z'),
    actorName: 'Teacher Sharma',
    metadata: { sessionCode: 'MATH-101', period: 2 },
    idempotencyKey: 'att_20260814_001',
    createdAt: new Date('2026-08-14T10:05:00Z'),
  };

  it('1. Successfully constructs a valid ActivityEntity', () => {
    const activity = ActivityEntity.create(validProps);
    expect(activity.id).toBe(validProps.id);
    expect(activity.instituteId).toBe(validProps.instituteId);
    expect(activity.studentId).toBe(validProps.studentId);
    expect(activity.eventType).toBe('attendance_absent');
    expect(activity.title).toBe('Absent from Mathematics Session');
    expect(activity.description).toBe('Student was marked absent by Teacher Sharma');
    expect(activity.occurredAt.toISOString()).toBe('2026-08-14T10:00:00.000Z');
    expect(activity.actorName).toBe('Teacher Sharma');
    expect(activity.metadata).toEqual({ sessionCode: 'MATH-101', period: 2 });
    expect(activity.idempotencyKey).toBe('att_20260814_001');
    expect(activity.createdAt.toISOString()).toBe('2026-08-14T10:05:00.000Z');
  });

  it('2. Enforces defensive copy on Dates (getters return fresh instances)', () => {
    const activity = ActivityEntity.create(validProps);
    const date1 = activity.occurredAt;
    date1.setFullYear(2099);
    expect(activity.occurredAt.getFullYear()).toBe(2026);
  });

  it('3. Enforces defensive copy on metadata (getters return fresh copies)', () => {
    const activity = ActivityEntity.create(validProps);
    const meta = activity.metadata;
    if (meta) {
      meta.sessionCode = 'HACKED';
    }
    expect(activity.metadata?.sessionCode).toBe('MATH-101');
  });

  it('4. Rejects invalid or empty ID / instituteId / studentId', () => {
    expect(() => ActivityEntity.create({ ...validProps, id: '' })).toThrow(ValidationError);
    expect(() => ActivityEntity.create({ ...validProps, instituteId: '   ' })).toThrow(ValidationError);
    expect(() => ActivityEntity.create({ ...validProps, studentId: '' })).toThrow(ValidationError);
  });

  it('5. Rejects invalid eventType', () => {
    // @ts-expect-error Testing invalid runtime event type
    expect(() => ActivityEntity.create({ ...validProps, eventType: 'invalid_type' })).toThrow(ValidationError);
  });

  it('6. Rejects title exceeding 255 characters', () => {
    const longTitle = 'A'.repeat(256);
    expect(() => ActivityEntity.create({ ...validProps, title: longTitle })).toThrow(ValidationError);
  });

  it('7. Rejects invalid Dates', () => {
    expect(() => ActivityEntity.create({ ...validProps, occurredAt: new Date('invalid') })).toThrow(ValidationError);
    expect(() => ActivityEntity.create({ ...validProps, createdAt: new Date('invalid') })).toThrow(ValidationError);
  });
});
