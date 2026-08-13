import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { MarksEntity } from './marks.entity';

describe('MarksEntity Domain Invariants', () => {
  const validProps = {
    instituteId: 'inst-123',
    testId: 'test-123',
    enrollmentId: 'enr-123',
    maximumMarks: 100,
  };

  it('should create valid MarksEntity with integer and decimal marksObtained', () => {
    const mark1 = MarksEntity.create({
      ...validProps,
      marksObtained: 85,
    });
    expect(mark1.marksObtained).toBe(85);

    const mark2 = MarksEntity.create({
      ...validProps,
      marksObtained: 85.75,
    });
    expect(mark2.marksObtained).toBe(85.75);
  });

  it('ACADEMIC-010: should reject negative marksObtained', () => {
    expect(() =>
      MarksEntity.create({
        ...validProps,
        marksObtained: -1,
      }),
    ).toThrow(ValidationError);
  });

  it('ACADEMIC-010: should reject marksObtained > maximumMarks', () => {
    expect(() =>
      MarksEntity.create({
        ...validProps,
        marksObtained: 100.01,
      }),
    ).toThrow(ValidationError);

    expect(() =>
      MarksEntity.create({
        ...validProps,
        marksObtained: 120,
      }),
    ).toThrow(ValidationError);
  });

  it('should reject marksObtained exceeding 2 decimal places precision', () => {
    expect(() =>
      MarksEntity.create({
        ...validProps,
        marksObtained: 85.755,
      }),
    ).toThrow(ValidationError);
  });

  it('should serialize correctly to MarksDTO', () => {
    const mark = MarksEntity.create({
      ...validProps,
      marksObtained: 92.5,
    });
    const dto = mark.toDTO();

    expect(dto.instituteId).toBe(validProps.instituteId);
    expect(dto.testId).toBe(validProps.testId);
    expect(dto.enrollmentId).toBe(validProps.enrollmentId);
    expect(dto.marksObtained).toBe(92.5);
  });
});
