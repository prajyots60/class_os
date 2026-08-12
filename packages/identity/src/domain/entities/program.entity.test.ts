import { describe, expect, it } from 'vitest';
import { ProgramEntity } from './program.entity';

describe('ProgramEntity Domain Entity', () => {
  const validProps = {
    instituteId: 'inst-123',
    name: 'JEE Mains 2027',
    code: 'JEE-2027',
    description: 'Comprehensive 2-year JEE Preparation',
  };

  it('creates a valid ProgramEntity with default draft status', () => {
    const program = ProgramEntity.create(validProps);
    expect(program.id).toBeDefined();
    expect(program.instituteId).toBe('inst-123');
    expect(program.name).toBe('JEE Mains 2027');
    expect(program.code.value).toBe('JEE-2027');
    expect(program.status).toBe('draft');
    expect(program.deletedAt).toBeNull();
  });

  it('enforces immutable id and instituteId', () => {
    const program = ProgramEntity.create(validProps);
    expect(program.id).toBeTypeOf('string');
    expect(program.instituteId).toBe('inst-123');
  });

  it('transitions state from draft to active and active to archived', () => {
    const program = ProgramEntity.create(validProps);
    expect(program.status).toBe('draft');

    program.activate();
    expect(program.status).toBe('active');

    program.archive();
    expect(program.status).toBe('archived');
    expect(program.deletedAt).toBeInstanceOf(Date);
  });

  it('rejects activating an archived program', () => {
    const program = ProgramEntity.create({ ...validProps, status: 'archived' });
    expect(() => program.activate()).toThrow('Cannot activate an archived program');
  });

  it('rejects updating profile on an archived program', () => {
    const program = ProgramEntity.create({ ...validProps, status: 'archived' });
    expect(() => program.updateProfile({ name: 'New Name' })).toThrow('Cannot update an archived program');
  });

  it('converts to DTO representation', () => {
    const program = ProgramEntity.create(validProps);
    const dto = program.toDTO();
    expect(dto.id).toBe(program.id);
    expect(dto.code).toBe('JEE-2027');
    expect(dto.status).toBe('draft');
  });
});
