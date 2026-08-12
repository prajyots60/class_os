import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { EnrollmentStatusVO, VALID_ENROLLMENT_STATUSES } from './enrollment-status.vo';

describe('EnrollmentStatusVO', () => {
  it('creates valid enrollment status value objects', () => {
    for (const status of VALID_ENROLLMENT_STATUSES) {
      const vo = EnrollmentStatusVO.create(status);
      expect(vo.value).toBe(status);
      expect(vo.toString()).toBe(status);
    }
  });

  it('normalizes status casing and whitespace', () => {
    const vo = EnrollmentStatusVO.create('  ACTIVE  ');
    expect(vo.value).toBe('active');
  });

  it('correctly identifies terminal statuses', () => {
    expect(EnrollmentStatusVO.create('completed').isTerminal).toBe(true);
    expect(EnrollmentStatusVO.create('withdrawn').isTerminal).toBe(true);
    expect(EnrollmentStatusVO.create('transferred').isTerminal).toBe(true);
    expect(EnrollmentStatusVO.create('cancelled').isTerminal).toBe(true);

    expect(EnrollmentStatusVO.create('pending').isTerminal).toBe(false);
    expect(EnrollmentStatusVO.create('active').isTerminal).toBe(false);
  });

  it('correctly identifies active or pending statuses for capacity count', () => {
    expect(EnrollmentStatusVO.create('pending').isActiveOrPending).toBe(true);
    expect(EnrollmentStatusVO.create('active').isActiveOrPending).toBe(true);

    expect(EnrollmentStatusVO.create('completed').isActiveOrPending).toBe(false);
    expect(EnrollmentStatusVO.create('withdrawn').isActiveOrPending).toBe(false);
    expect(EnrollmentStatusVO.create('transferred').isActiveOrPending).toBe(false);
    expect(EnrollmentStatusVO.create('cancelled').isActiveOrPending).toBe(false);
  });

  it('rejects invalid statuses', () => {
    expect(() => EnrollmentStatusVO.create('invalid_status')).toThrow(ValidationError);
    expect(() => EnrollmentStatusVO.create('')).toThrow(ValidationError);
  });

  it('supports value equality check', () => {
    const vo1 = EnrollmentStatusVO.create('active');
    const vo2 = EnrollmentStatusVO.create('active');
    const vo3 = EnrollmentStatusVO.create('completed');

    expect(vo1.equals(vo2)).toBe(true);
    expect(vo1.equals('active')).toBe(true);
    expect(vo1.equals(vo3)).toBe(false);
    expect(vo1.equals('completed')).toBe(false);
  });
});
