import { describe, it, expect } from 'vitest';
import { ChildProfileEntity } from './child-profile.entity';
import { ValidationError } from '@coaching-os/shared';

describe('ChildProfileEntity Invariants', () => {
  it('creates a valid ChildProfileEntity instance', () => {
    const profile = ChildProfileEntity.create({
      parentIdentityId: crypto.randomUUID(),
      name: '  Rahul  ',
      avatar: 'https://example.com/avatar.png',
    });

    expect(profile.id).toBeDefined();
    expect(profile.name).toBe('Rahul');
    expect(profile.avatar).toBe('https://example.com/avatar.png');
    expect(profile.createdAt).toBeInstanceOf(Date);
  });

  it('throws ValidationError if name is empty', () => {
    expect(() =>
      ChildProfileEntity.create({
        parentIdentityId: crypto.randomUUID(),
        name: '   ',
      }),
    ).toThrow(ValidationError);
  });

  it('throws ValidationError if name exceeds 100 characters', () => {
    expect(() =>
      ChildProfileEntity.create({
        parentIdentityId: crypto.randomUUID(),
        name: 'A'.repeat(101),
      }),
    ).toThrow(ValidationError);
  });

  it('throws ValidationError if avatar exceeds 255 characters', () => {
    expect(() =>
      ChildProfileEntity.create({
        parentIdentityId: crypto.randomUUID(),
        name: 'Rahul',
        avatar: 'http://example.com/' + 'a'.repeat(250),
      }),
    ).toThrow(ValidationError);
  });

  it('updates profile details correctly', () => {
    const profile = ChildProfileEntity.create({
      parentIdentityId: crypto.randomUUID(),
      name: 'Rahul',
    });

    profile.updateDetails('  Rahul Sharma  ', 'https://example.com/new.png');
    expect(profile.name).toBe('Rahul Sharma');
    expect(profile.avatar).toBe('https://example.com/new.png');
  });

  it('reconstructs from existing persistence props', () => {
    const now = new Date();
    const id = crypto.randomUUID();
    const parentIdentityId = crypto.randomUUID();
    const profile = ChildProfileEntity.reconstruct({
      id,
      parentIdentityId,
      name: 'Priya',
      avatar: null,
      createdAt: now,
      updatedAt: now,
    });

    expect(profile.id).toBe(id);
    expect(profile.parentIdentityId).toBe(parentIdentityId);
    expect(profile.toDTO().name).toBe('Priya');
  });
});
