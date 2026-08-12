import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { EnrollmentEntity } from './enrollment.entity';

describe('EnrollmentEntity Domain Aggregate', () => {
  const mockTenantId = '11111111-1111-4111-a111-111111111111';
  const mockStudentId = '22222222-2222-4222-a222-222222222222';
  const mockBatchId = '33333333-3333-4333-a333-333333333333';

  it('creates a valid enrollment aggregate with default pending status', () => {
    const enrollment = EnrollmentEntity.create({
      instituteId: mockTenantId,
      studentId: mockStudentId,
      batchId: mockBatchId,
    });

    expect(enrollment.id).toBeDefined();
    expect(typeof enrollment.id).toBe('string');
    expect(enrollment.instituteId).toBe(mockTenantId);
    expect(enrollment.studentId).toBe(mockStudentId);
    expect(enrollment.batchId).toBe(mockBatchId);
    expect(enrollment.status).toBe('pending');
    expect(enrollment.enrolledAt).toBeInstanceOf(Date);
    expect(enrollment.completedAt).toBeNull();
    expect(enrollment.withdrawnAt).toBeNull();
    expect(enrollment.transferredAt).toBeNull();
    expect(enrollment.transferredToBatchId).toBeNull();
    expect(enrollment.transferredToEnrollmentId).toBeNull();
    expect(enrollment.deletedAt).toBeNull();
  });

  it('rejects construction with missing or empty mandatory fields', () => {
    expect(() =>
      EnrollmentEntity.create({
        instituteId: '',
        studentId: mockStudentId,
        batchId: mockBatchId,
      }),
    ).toThrow(ValidationError);

    expect(() =>
      EnrollmentEntity.create({
        instituteId: mockTenantId,
        studentId: '  ',
        batchId: mockBatchId,
      }),
    ).toThrow(ValidationError);

    expect(() =>
      EnrollmentEntity.create({
        instituteId: mockTenantId,
        studentId: mockStudentId,
        batchId: '',
      }),
    ).toThrow(ValidationError);
  });

  it('enforces immutability of identity fields', () => {
    const enrollment = EnrollmentEntity.create({
      instituteId: mockTenantId,
      studentId: mockStudentId,
      batchId: mockBatchId,
    });

    const originalBatchId = enrollment.batchId;
    const originalStudentId = enrollment.studentId;
    const originalInstituteId = enrollment.instituteId;

    // Activate enrollment
    enrollment.activate();

    // Verify identity fields did not mutate
    expect(enrollment.batchId).toBe(originalBatchId);
    expect(enrollment.studentId).toBe(originalStudentId);
    expect(enrollment.instituteId).toBe(originalInstituteId);
  });

  describe('Lifecycle State Machine Transitions', () => {
    it('transitions pending -> active', () => {
      const enrollment = EnrollmentEntity.create({
        instituteId: mockTenantId,
        studentId: mockStudentId,
        batchId: mockBatchId,
        status: 'pending',
      });

      enrollment.activate();
      expect(enrollment.status).toBe('active');
    });

    it('transitions pending -> cancelled', () => {
      const enrollment = EnrollmentEntity.create({
        instituteId: mockTenantId,
        studentId: mockStudentId,
        batchId: mockBatchId,
        status: 'pending',
      });

      enrollment.cancel();
      expect(enrollment.status).toBe('cancelled');
    });

    it('transitions active -> completed', () => {
      const enrollment = EnrollmentEntity.create({
        instituteId: mockTenantId,
        studentId: mockStudentId,
        batchId: mockBatchId,
        status: 'active',
      });

      enrollment.complete();
      expect(enrollment.status).toBe('completed');
      expect(enrollment.completedAt).toBeInstanceOf(Date);
    });

    it('transitions active -> withdrawn', () => {
      const enrollment = EnrollmentEntity.create({
        instituteId: mockTenantId,
        studentId: mockStudentId,
        batchId: mockBatchId,
        status: 'active',
      });

      enrollment.withdraw();
      expect(enrollment.status).toBe('withdrawn');
      expect(enrollment.withdrawnAt).toBeInstanceOf(Date);
    });

    it('transitions active -> transferred (Option B Historical Preservation)', () => {
      const enrollment = EnrollmentEntity.create({
        instituteId: mockTenantId,
        studentId: mockStudentId,
        batchId: mockBatchId,
        status: 'active',
      });

      const targetBatchId = '44444444-4444-4444-a444-444444444444';
      const targetEnrollmentId = '55555555-5555-4555-a555-555555555555';

      enrollment.markTransferred(targetBatchId, targetEnrollmentId);

      expect(enrollment.status).toBe('transferred');
      expect(enrollment.batchId).toBe(mockBatchId); // Source batchId preserved!
      expect(enrollment.transferredToBatchId).toBe(targetBatchId);
      expect(enrollment.transferredToEnrollmentId).toBe(targetEnrollmentId);
      expect(enrollment.transferredAt).toBeInstanceOf(Date);
    });

    it('rejects illegal transitions from terminal states', () => {
      const completedEnrollment = EnrollmentEntity.create({
        instituteId: mockTenantId,
        studentId: mockStudentId,
        batchId: mockBatchId,
        status: 'active',
      });
      completedEnrollment.complete();

      expect(() => completedEnrollment.activate()).toThrow(ValidationError);
      expect(() => completedEnrollment.cancel()).toThrow(ValidationError);
      expect(() => completedEnrollment.withdraw()).toThrow(ValidationError);
      expect(() => completedEnrollment.markTransferred('target-b', 'target-e')).toThrow(ValidationError);

      const cancelledEnrollment = EnrollmentEntity.create({
        instituteId: mockTenantId,
        studentId: mockStudentId,
        batchId: mockBatchId,
        status: 'pending',
      });
      cancelledEnrollment.cancel();

      expect(() => cancelledEnrollment.activate()).toThrow(ValidationError);
      expect(() => cancelledEnrollment.complete()).toThrow(ValidationError);

      const transferredEnrollment = EnrollmentEntity.create({
        instituteId: mockTenantId,
        studentId: mockStudentId,
        batchId: mockBatchId,
        status: 'active',
      });
      transferredEnrollment.markTransferred('target-b', 'target-e');

      expect(() => transferredEnrollment.activate()).toThrow(ValidationError);
    });

    it('soft archives enrollment entity', () => {
      const enrollment = EnrollmentEntity.create({
        instituteId: mockTenantId,
        studentId: mockStudentId,
        batchId: mockBatchId,
      });

      enrollment.archive();
      expect(enrollment.deletedAt).toBeInstanceOf(Date);
    });
  });

  it('serializes entity to plain DTO representation via toDTO()', () => {
    const enrollment = EnrollmentEntity.create({
      id: 'enr-12345',
      instituteId: mockTenantId,
      studentId: mockStudentId,
      batchId: mockBatchId,
      status: 'active',
    });

    const dto = enrollment.toDTO();
    expect(dto).toEqual({
      id: 'enr-12345',
      instituteId: mockTenantId,
      studentId: mockStudentId,
      batchId: mockBatchId,
      status: 'active',
      enrolledAt: expect.any(String),
      completedAt: null,
      withdrawnAt: null,
      transferredAt: null,
      transferredToBatchId: null,
      transferredToEnrollmentId: null,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      deletedAt: null,
    });
  });
});
