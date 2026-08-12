import { describe, expect, it } from 'vitest';
import { SubjectEntity } from './subject.entity';

describe('SubjectEntity Domain Entity', () => {
  const validProps = {
    instituteId: 'inst-123',
    name: 'Physics',
    code: 'PHY-101',
    description: 'Foundational Physics',
  };

  it('creates a valid SubjectEntity with default draft status', () => {
    const subject = SubjectEntity.create(validProps);
    expect(subject.id).toBeDefined();
    expect(subject.instituteId).toBe('inst-123');
    expect(subject.name).toBe('Physics');
    expect(subject.code.value).toBe('PHY-101');
    expect(subject.status).toBe('draft');
    expect(subject.deletedAt).toBeNull();
  });

  it('verifies Subject is NOT owned by Program (no programId on Subject)', () => {
    const subject = SubjectEntity.create(validProps);
    expect((subject as unknown as Record<string, unknown>).programId).toBeUndefined();
  });

  it('transitions state from draft to active and active to archived', () => {
    const subject = SubjectEntity.create(validProps);
    expect(subject.status).toBe('draft');

    subject.activate();
    expect(subject.status).toBe('active');

    subject.archive();
    expect(subject.status).toBe('archived');
    expect(subject.deletedAt).toBeInstanceOf(Date);
  });

  it('rejects activating an archived subject', () => {
    const subject = SubjectEntity.create({ ...validProps, status: 'archived' });
    expect(() => subject.activate()).toThrow('Cannot activate an archived subject');
  });

  it('converts to DTO representation', () => {
    const subject = SubjectEntity.create(validProps);
    const dto = subject.toDTO();
    expect(dto.id).toBe(subject.id);
    expect(dto.code).toBe('PHY-101');
    expect(dto.status).toBe('draft');
  });
});
