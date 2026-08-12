import { describe, expect, it } from 'vitest';
import { ProgramSubjectEntity } from './program-subject.entity';

describe('ProgramSubjectEntity Domain Entity', () => {
  it('creates a valid ProgramSubjectEntity', () => {
    const ps = ProgramSubjectEntity.create({
      instituteId: 'inst-1',
      programId: 'prog-1',
      subjectId: 'subj-1',
    });

    expect(ps.id).toBeDefined();
    expect(ps.instituteId).toBe('inst-1');
    expect(ps.programId).toBe('prog-1');
    expect(ps.subjectId).toBe('subj-1');
  });

  it('rejects cross-tenant mapping during verified creation', () => {
    expect(() =>
      ProgramSubjectEntity.createVerified({
        instituteId: 'inst-1',
        programId: 'prog-1',
        programInstituteId: 'inst-2', // Cross-tenant!
        subjectId: 'subj-1',
        subjectInstituteId: 'inst-1',
      }),
    ).toThrow('Cross-tenant mapping prohibited');

    expect(() =>
      ProgramSubjectEntity.createVerified({
        instituteId: 'inst-1',
        programId: 'prog-1',
        programInstituteId: 'inst-1',
        subjectId: 'subj-1',
        subjectInstituteId: 'inst-2', // Cross-tenant!
      }),
    ).toThrow('Cross-tenant mapping prohibited');
  });

  it('converts to DTO representation', () => {
    const ps = ProgramSubjectEntity.create({
      instituteId: 'inst-1',
      programId: 'prog-1',
      subjectId: 'subj-1',
    });

    const dto = ps.toDTO();
    expect(dto.id).toBe(ps.id);
    expect(dto.instituteId).toBe('inst-1');
    expect(dto.programId).toBe('prog-1');
    expect(dto.subjectId).toBe('subj-1');
  });
});
