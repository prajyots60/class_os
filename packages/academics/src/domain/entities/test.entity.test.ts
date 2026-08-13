import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { TestEntity } from './test.entity';

describe('TestEntity Domain Invariants', () => {
  const validProps = {
    instituteId: 'inst-123',
    batchId: 'batch-123',
    title: 'Midterm Physics Assessment',
    maximumMarks: 100,
  };

  it('should create a valid TestEntity in draft status', () => {
    const test = TestEntity.create(validProps);

    expect(test.id).toBeDefined();
    expect(test.instituteId).toBe(validProps.instituteId);
    expect(test.batchId).toBe(validProps.batchId);
    expect(test.title).toBe(validProps.title);
    expect(test.maximumMarks).toBe(100);
    expect(test.status).toBe('draft');
    expect(test.isPublished).toBe(false);
  });

  it('should reject non-integer or <= 0 maximumMarks', () => {
    expect(() =>
      TestEntity.create({ ...validProps, maximumMarks: 0 }),
    ).toThrow(ValidationError);

    expect(() =>
      TestEntity.create({ ...validProps, maximumMarks: -10 }),
    ).toThrow(ValidationError);

    expect(() =>
      TestEntity.create({ ...validProps, maximumMarks: 50.5 }),
    ).toThrow(ValidationError);
  });

  it('should reject empty or whitespace title', () => {
    expect(() =>
      TestEntity.create({ ...validProps, title: '   ' }),
    ).toThrow(ValidationError);
  });

  it('should transition lifecycle state: draft -> scheduled -> marks_entered -> published', () => {
    const test = TestEntity.create(validProps);
    expect(test.status).toBe('draft');

    test.schedule('2026-08-20');
    expect(test.status).toBe('scheduled');

    test.markMarksEntered();
    expect(test.status).toBe('marks_entered');

    test.publishResults();
    expect(test.status).toBe('published');
    expect(test.isPublished).toBe(true);
  });

  it('should REJECT publishing directly from draft state without entering marks', () => {
    const test = TestEntity.create(validProps);

    expect(() => test.publishResults()).toThrow(ValidationError);
  });

  it('should REJECT updating details once published (Publication Immutability)', () => {
    const test = TestEntity.create(validProps);
    test.markMarksEntered();
    test.publishResults();

    expect(() =>
      test.updateDetails({ title: 'New Title' }),
    ).toThrow(ValidationError);

    expect(() => test.schedule('2026-08-25')).toThrow(ValidationError);
  });
});
