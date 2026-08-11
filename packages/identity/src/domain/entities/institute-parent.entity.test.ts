import { describe, it, expect } from 'vitest';
import { InstituteParentEntity } from './institute-parent.entity';
import { ValidationError } from '@coaching-os/shared';

describe('InstituteParentEntity Domain Entity Unit Suite', () => {
  const validInstituteId = '11111111-1111-4111-a111-111111111111';
  const validParentIdentityId = '22222222-2222-4222-a222-222222222222';

  it('constructs a valid active InstituteParent entity via factory create()', () => {
    const parent = InstituteParentEntity.create({
      instituteId: validInstituteId,
      parentIdentityId: validParentIdentityId,
      notes: 'Initial enrollment notes',
    });

    expect(parent.id).toBeDefined();
    expect(parent.instituteId).toBe(validInstituteId);
    expect(parent.parentIdentityId).toBe(validParentIdentityId);
    expect(parent.notes).toBe('Initial enrollment notes');
    expect(parent.status).toBe('active');
    expect(parent.createdAt).toBeInstanceOf(Date);
    expect(parent.updatedAt).toBeInstanceOf(Date);
  });

  it('reconstitutes an existing entity via from()', () => {
    const pastDate = new Date('2026-01-01T00:00:00.000Z');
    const parent = InstituteParentEntity.from({
      id: '33333333-3333-4333-a333-333333333333',
      instituteId: validInstituteId,
      parentIdentityId: validParentIdentityId,
      notes: 'Reconstituted CRM notes',
      status: 'inactive',
      createdAt: pastDate,
      updatedAt: pastDate,
    });

    expect(parent.id).toBe('33333333-3333-4333-a333-333333333333');
    expect(parent.status).toBe('inactive');
    expect(parent.createdAt.toISOString()).toBe(pastDate.toISOString());
  });

  it('throws ValidationError when required identifiers are missing or blank', () => {
    expect(() =>
      InstituteParentEntity.create({
        instituteId: '',
        parentIdentityId: validParentIdentityId,
      }),
    ).toThrow(ValidationError);

    expect(() =>
      InstituteParentEntity.create({
        instituteId: validInstituteId,
        parentIdentityId: '   ',
      }),
    ).toThrow(ValidationError);

    expect(() =>
      InstituteParentEntity.from({
        id: '',
        instituteId: validInstituteId,
        parentIdentityId: validParentIdentityId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).toThrow(ValidationError);
  });

  it('throws ValidationError when constructed with an invalid status', () => {
    expect(() =>
      InstituteParentEntity.from({
        id: '33333333-3333-4333-a333-333333333333',
        instituteId: validInstituteId,
        parentIdentityId: validParentIdentityId,
        status: 'suspended' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).toThrow(ValidationError);
  });

  it('updates staff CRM notes and updates updatedAt timestamp', () => {
    const parent = InstituteParentEntity.create({
      instituteId: validInstituteId,
      parentIdentityId: validParentIdentityId,
      notes: 'Old notes',
    });

    const initialUpdatedAt = parent.updatedAt;

    // Small delay to ensure timestamp progression
    parent.updateNotes(' Updated CRM notes ');

    expect(parent.notes).toBe('Updated CRM notes');
    expect(parent.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
  });

  it('does not mutate updatedAt if notes remain unchanged', () => {
    const parent = InstituteParentEntity.create({
      instituteId: validInstituteId,
      parentIdentityId: validParentIdentityId,
      notes: 'Same notes',
    });

    const initialUpdatedAt = parent.updatedAt;
    parent.updateNotes('Same notes');

    expect(parent.updatedAt.getTime()).toBe(initialUpdatedAt.getTime());
  });

  it('transitions lifecycle status between active and inactive', () => {
    const parent = InstituteParentEntity.create({
      instituteId: validInstituteId,
      parentIdentityId: validParentIdentityId,
    });

    expect(parent.status).toBe('active');

    parent.changeStatus('inactive');
    expect(parent.status).toBe('inactive');

    parent.changeStatus('active');
    expect(parent.status).toBe('active');
  });

  it('throws ValidationError for invalid status transitions', () => {
    const parent = InstituteParentEntity.create({
      instituteId: validInstituteId,
      parentIdentityId: validParentIdentityId,
    });

    expect(() => parent.changeStatus('banned' as any)).toThrow(ValidationError);
  });

  it('serializes cleanly to DTO without leaking global identity properties', () => {
    const parent = InstituteParentEntity.create({
      instituteId: validInstituteId,
      parentIdentityId: validParentIdentityId,
      notes: 'Clean DTO test',
    });

    const dto = parent.toDTO();

    expect(dto).toHaveProperty('id');
    expect(dto).toHaveProperty('instituteId', validInstituteId);
    expect(dto).toHaveProperty('parentIdentityId', validParentIdentityId);
    expect(dto).toHaveProperty('notes', 'Clean DTO test');
    expect(dto).toHaveProperty('status', 'active');
    expect((dto as any).phone).toBeUndefined();
    expect((dto as any).avatar).toBeUndefined();
  });
});
