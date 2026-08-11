import { ValidationError } from '@coaching-os/shared';
import { describe, expect, it } from 'vitest';
import { DateOfBirth } from '../value-objects/date-of-birth.vo';
import { PhoneNumber } from '../value-objects/phone-number.vo';
import { StudentEntity } from './student.entity';

describe('StudentEntity Domain Entity', () => {
  const validProps = {
    instituteId: '11111111-1111-4111-a111-111111111111',
    admissionNumber: 'STU-2026-0001',
    firstName: 'Aarav',
    lastName: 'Sharma',
    dateOfBirth: '2010-04-12',
    gender: 'male' as const,
    phone: '+919876543210',
    email: 'aarav.sharma@example.com',
  };

  describe('Construction & Invariants', () => {
    it('should construct a valid Student entity with auto-generated ID and default statuses', () => {
      const student = StudentEntity.create(validProps);

      expect(student.id).toBeDefined();
      expect(student.instituteId).toBe(validProps.instituteId);
      expect(student.admissionNumber).toBe('STU-2026-0001');
      expect(student.firstName).toBe('Aarav');
      expect(student.lastName).toBe('Sharma');
      expect(student.displayName).toBe('Aarav Sharma');
      expect(student.dateOfBirth?.value).toBe('2010-04-12');
      expect(student.gender).toBe('male');
      expect(student.phone?.value).toBe('+919876543210');
      expect(student.email).toBe('aarav.sharma@example.com');
      expect(student.admissionStatus).toBe('admitted');
      expect(student.status).toBe('active');
    });

    it('should compute displayName correctly when middleName is provided', () => {
      const student = StudentEntity.create({
        ...validProps,
        middleName: 'Kumar',
      });
      expect(student.displayName).toBe('Aarav Kumar Sharma');
    });

    it('should throw ValidationError if instituteId is empty', () => {
      expect(() =>
        StudentEntity.create({
          ...validProps,
          instituteId: '',
        }),
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError if admissionNumber is empty', () => {
      expect(() =>
        StudentEntity.create({
          ...validProps,
          admissionNumber: '   ',
        }),
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError if firstName or lastName is empty', () => {
      expect(() =>
        StudentEntity.create({
          ...validProps,
          firstName: '',
        }),
      ).toThrow(ValidationError);

      expect(() =>
        StudentEntity.create({
          ...validProps,
          lastName: '  ',
        }),
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError if email format is invalid', () => {
      expect(() =>
        StudentEntity.create({
          ...validProps,
          email: 'invalid-email',
        }),
      ).toThrow(/Invalid email/);
    });

    it('should throw ValidationError if gender is invalid', () => {
      expect(() =>
        StudentEntity.create({
          ...validProps,
          gender: 'unknown' as any,
        }),
      ).toThrow(/Invalid gender/);
    });

    it('should reject active status when admissionStatus is pending', () => {
      expect(() =>
        StudentEntity.create({
          ...validProps,
          admissionStatus: 'pending',
          status: 'active',
        }),
      ).toThrow(/Cannot set student status to "active"/);
    });
  });

  describe('State Machine & Transitions', () => {
    it('should support updating profile details', () => {
      const student = StudentEntity.create(validProps);
      student.updateProfile({
        firstName: 'Rohan',
        lastName: 'Verma',
        dateOfBirth: '2009-08-22',
        gender: 'male',
      });

      expect(student.firstName).toBe('Rohan');
      expect(student.lastName).toBe('Verma');
      expect(student.displayName).toBe('Rohan Verma');
      expect(student.dateOfBirth?.value).toBe('2009-08-22');
    });

    it('should support updating contact and address details', () => {
      const student = StudentEntity.create(validProps);
      student.updateContactAndAddress({
        phone: '+919999988888',
        email: 'rohan.new@example.com',
        city: 'Delhi',
        state: 'Delhi',
      });

      expect(student.phone?.value).toBe('+919999988888');
      expect(student.email).toBe('rohan.new@example.com');
      expect(student.city).toBe('Delhi');
      expect(student.state).toBe('Delhi');
    });

    it('should support admitting a pending student', () => {
      const student = StudentEntity.create({
        ...validProps,
        admissionStatus: 'pending',
        status: 'inactive',
      });

      expect(student.admissionStatus).toBe('pending');
      expect(student.status).toBe('inactive');

      student.admit('2026-08-11');
      expect(student.admissionStatus).toBe('admitted');
      expect(student.status).toBe('active');
      expect(student.admissionDate).toEqual(new Date('2026-08-11T00:00:00.000Z'));
    });

    it('should support rejecting or cancelling admission', () => {
      const student = StudentEntity.create({
        ...validProps,
        admissionStatus: 'pending',
        status: 'inactive',
      });

      student.reject();
      expect(student.admissionStatus).toBe('rejected');
      expect(student.status).toBe('inactive');

      const student2 = StudentEntity.create({
        ...validProps,
        admissionStatus: 'pending',
        status: 'inactive',
      });
      student2.cancel();
      expect(student2.admissionStatus).toBe('cancelled');
      expect(student2.status).toBe('inactive');
    });

    it('should prevent activating a rejected or non-admitted student', () => {
      const student = StudentEntity.create({
        ...validProps,
        admissionStatus: 'rejected',
        status: 'inactive',
      });

      expect(() => student.activate()).toThrow(/Cannot activate student standing/);
    });

    it('should support deactivating and soft archiving a student', () => {
      const student = StudentEntity.create(validProps);
      expect(student.status).toBe('active');

      student.deactivate();
      expect(student.status).toBe('inactive');

      student.archive();
      expect(student.status).toBe('archived');
      expect(student.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('DTO Serialization', () => {
    it('should serialize entity to clean DTO representation', () => {
      const student = StudentEntity.create(validProps);
      const dto = student.toDTO();

      expect(dto.id).toBe(student.id);
      expect(dto.instituteId).toBe(validProps.instituteId);
      expect(dto.admissionNumber).toBe('STU-2026-0001');
      expect(dto.firstName).toBe('Aarav');
      expect(dto.lastName).toBe('Sharma');
      expect(dto.displayName).toBe('Aarav Sharma');
      expect(dto.dateOfBirth).toBe('2010-04-12');
      expect(dto.gender).toBe('male');
      expect(dto.phone).toBe('+919876543210');
      expect(dto.email).toBe('aarav.sharma@example.com');
      expect(dto.admissionStatus).toBe('admitted');
      expect(dto.status).toBe('active');
    });
  });
});
