import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { InstituteParentStudentEntity } from './institute-parent-student.entity';
import { GuardianRelationshipTypeVO } from '../value-objects/guardian-relationship-type.vo';

describe('InstituteParentStudentEntity', () => {
  const validProps = {
    id: '11111111-1111-4111-a111-111111111111',
    instituteId: '22222222-2222-4222-a222-222222222222',
    instituteParentId: '33333333-3333-4333-a333-333333333333',
    studentId: '44444444-4444-4444-a444-444444444444',
    relationshipType: 'father' as const,
    isPrimary: false,
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  it('should instantiate successfully with valid props via from() and create()', () => {
    const entity = InstituteParentStudentEntity.from(validProps);

    expect(entity.id).toBe(validProps.id);
    expect(entity.instituteId).toBe(validProps.instituteId);
    expect(entity.instituteParentId).toBe(validProps.instituteParentId);
    expect(entity.studentId).toBe(validProps.studentId);
    expect(entity.relationshipType).toBe('father');
    expect(entity.isPrimary).toBe(false);
    expect(entity.status).toBe('active');
    expect(entity.deletedAt).toBeNull();
  });

  it('should generate UUID and timestamps when using create() factory', () => {
    const created = InstituteParentStudentEntity.create({
      instituteId: validProps.instituteId,
      instituteParentId: validProps.instituteParentId,
      studentId: validProps.studentId,
      relationshipType: 'mother',
      isPrimary: true,
    });

    expect(created.id).toBeDefined();
    expect(created.relationshipType).toBe('mother');
    expect(created.isPrimary).toBe(true);
    expect(created.status).toBe('active');
    expect(created.createdAt).toBeInstanceOf(Date);
  });

  it('should throw ValidationError on missing or empty IDs', () => {
    expect(() =>
      InstituteParentStudentEntity.from({ ...validProps, id: '' }),
    ).toThrow(ValidationError);
    expect(() =>
      InstituteParentStudentEntity.from({ ...validProps, instituteId: '  ' }),
    ).toThrow(ValidationError);
    expect(() =>
      InstituteParentStudentEntity.from({ ...validProps, instituteParentId: '' }),
    ).toThrow(ValidationError);
    expect(() =>
      InstituteParentStudentEntity.from({ ...validProps, studentId: '' }),
    ).toThrow(ValidationError);
  });

  it('should throw ValidationError if status is archived and isPrimary is true upon construction', () => {
    expect(() =>
      InstituteParentStudentEntity.from({
        ...validProps,
        status: 'archived',
        isPrimary: true,
      }),
    ).toThrow(ValidationError);
  });

  it('should update relationship type using string or VO', () => {
    const entity = InstituteParentStudentEntity.from(validProps);
    entity.updateRelationshipType('guardian');
    expect(entity.relationshipType).toBe('guardian');

    const motherVO = GuardianRelationshipTypeVO.create('mother');
    entity.updateRelationshipType(motherVO);
    expect(entity.relationshipType).toBe('mother');
  });

  it('should toggle primary guardian status via setPrimary and unsetPrimary', () => {
    const entity = InstituteParentStudentEntity.from(validProps);
    expect(entity.isPrimary).toBe(false);

    entity.setPrimary();
    expect(entity.isPrimary).toBe(true);

    entity.unsetPrimary();
    expect(entity.isPrimary).toBe(false);
  });

  it('should archive relationship and clear primary status', () => {
    const entity = InstituteParentStudentEntity.from({
      ...validProps,
      isPrimary: true,
    });

    entity.archive();
    expect(entity.status).toBe('archived');
    expect(entity.isPrimary).toBe(false);
    expect(entity.deletedAt).toBeInstanceOf(Date);
  });

  it('should reject mutating an archived relationship', () => {
    const entity = InstituteParentStudentEntity.from(validProps);
    entity.archive();

    expect(() => entity.setPrimary()).toThrow(ValidationError);
    expect(() => entity.updateRelationshipType('mother')).toThrow(ValidationError);
  });

  it('should produce a clean DTO without recursive parent or student embeddings', () => {
    const entity = InstituteParentStudentEntity.from(validProps);
    const dto = entity.toDTO();

    expect(dto).toEqual({
      id: validProps.id,
      instituteId: validProps.instituteId,
      instituteParentId: validProps.instituteParentId,
      studentId: validProps.studentId,
      relationshipType: 'father',
      isPrimary: false,
      status: 'active',
      createdAt: validProps.createdAt.toISOString(),
      updatedAt: validProps.updatedAt.toISOString(),
      deletedAt: null,
    });
    expect((dto as any).parent).toBeUndefined();
    expect((dto as any).student).toBeUndefined();
  });
});
