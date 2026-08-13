import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { AttendanceEntity, type AttendanceStatus } from './attendance.entity';

describe('AttendanceEntity Domain Entity Invariants', () => {
  const validProps = {
    id: 'att-123',
    instituteId: 'inst-123',
    sessionId: 'sess-123',
    enrollmentId: 'enr-123',
    status: 'present' as AttendanceStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should create a valid AttendanceEntity instance', () => {
    const attendance = AttendanceEntity.create({
      instituteId: validProps.instituteId,
      sessionId: validProps.sessionId,
      enrollmentId: validProps.enrollmentId,
      status: 'present',
    });

    expect(attendance.id).toBeDefined();
    expect(attendance.instituteId).toBe(validProps.instituteId);
    expect(attendance.sessionId).toBe(validProps.sessionId);
    expect(attendance.enrollmentId).toBe(validProps.enrollmentId);
    expect(attendance.status).toBe('present');
  });

  it('should reject invalid status during creation', () => {
    expect(() =>
      AttendanceEntity.create({
        instituteId: validProps.instituteId,
        sessionId: validProps.sessionId,
        enrollmentId: validProps.enrollmentId,
        status: 'excused' as any,
      }),
    ).toThrow(ValidationError);
  });

  it('should reject empty required fields', () => {
    expect(() =>
      AttendanceEntity.from({ ...validProps, id: '' }),
    ).toThrow(ValidationError);

    expect(() =>
      AttendanceEntity.from({ ...validProps, instituteId: '   ' }),
    ).toThrow(ValidationError);

    expect(() =>
      AttendanceEntity.from({ ...validProps, sessionId: '' }),
    ).toThrow(ValidationError);

    expect(() =>
      AttendanceEntity.from({ ...validProps, enrollmentId: '' }),
    ).toThrow(ValidationError);
  });

  it('should update status to a valid new status and refresh updatedAt timestamp', () => {
    const attendance = AttendanceEntity.from(validProps);
    const oldUpdatedAt = attendance.updatedAt;

    attendance.updateStatus('late');

    expect(attendance.status).toBe('late');
    expect(attendance.updatedAt.getTime()).toBeGreaterThanOrEqual(oldUpdatedAt.getTime());
  });

  it('should serialize correctly to AttendanceDTO', () => {
    const attendance = AttendanceEntity.from(validProps);
    const dto = attendance.toDTO();

    expect(dto.id).toBe(validProps.id);
    expect(dto.instituteId).toBe(validProps.instituteId);
    expect(dto.sessionId).toBe(validProps.sessionId);
    expect(dto.enrollmentId).toBe(validProps.enrollmentId);
    expect(dto.status).toBe('present');
    expect(dto.createdAt).toBe(validProps.createdAt.toISOString());
    expect(dto.updatedAt).toBe(validProps.updatedAt.toISOString());
  });
});
