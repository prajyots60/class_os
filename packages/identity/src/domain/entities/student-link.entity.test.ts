import { describe, it, expect } from 'vitest';
import { StudentLinkEntity } from './student-link.entity';
import { ValidationError } from '@coaching-os/shared';

describe('StudentLinkEntity Invariants', () => {
  it('creates a valid StudentLinkEntity instance', () => {
    const link = StudentLinkEntity.create({
      childProfileId: crypto.randomUUID(),
      studentId: crypto.randomUUID(),
      instituteId: crypto.randomUUID(),
    });

    expect(link.id).toBeDefined();
    expect(link.toDTO().childProfileId).toBeDefined();
  });

  it('throws ValidationError if any required ID is missing', () => {
    expect(() =>
      StudentLinkEntity.create({
        childProfileId: '',
        studentId: crypto.randomUUID(),
        instituteId: crypto.randomUUID(),
      }),
    ).toThrow(ValidationError);
  });
});
