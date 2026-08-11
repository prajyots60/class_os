import { describe, it, expect } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { ParentIdentityEntity } from './parent-identity.entity';
import { PhoneNumber } from '../value-objects/phone-number.vo';

describe('ParentIdentityEntity Domain Entity', () => {
  it('creates an active ParentIdentity with normalized E.164 phone', () => {
    const parent = ParentIdentityEntity.create({
      phone: '9876543210',
      name: 'Rajesh Gupta',
    });

    expect(parent.id).toBeDefined();
    expect(parent.phoneValue).toBe('+919876543210');
    expect(parent.phone).toBeInstanceOf(PhoneNumber);
    expect(parent.name).toBe('Rajesh Gupta');
    expect(parent.avatar).toBeNull();
    expect(parent.status).toBe('active');
    expect(parent.createdAt).toBeInstanceOf(Date);
    expect(parent.updatedAt).toBeInstanceOf(Date);
  });

  it('reconstitutes entity from existing persistence props', () => {
    const now = new Date();
    const parent = ParentIdentityEntity.from({
      id: 'pid-123',
      phone: '+919876543210',
      name: 'Sunita Sharma',
      avatar: 'https://example.com/avatar.png',
      status: 'suspended',
      createdAt: now,
      updatedAt: now,
    });

    expect(parent.id).toBe('pid-123');
    expect(parent.phoneValue).toBe('+919876543210');
    expect(parent.name).toBe('Sunita Sharma');
    expect(parent.avatar).toBe('https://example.com/avatar.png');
    expect(parent.status).toBe('suspended');
  });

  it('updates profile name and avatar and updates updatedAt timestamp', () => {
    const parent = ParentIdentityEntity.create({
      phone: '+919876543210',
      name: 'Original Name',
    });

    const initialUpdatedAt = parent.updatedAt;

    // Small delay to ensure timestamp comparison
    parent.updateProfile({
      name: 'Updated Name',
      avatar: 'https://example.com/new-avatar.png',
    });

    expect(parent.name).toBe('Updated Name');
    expect(parent.avatar).toBe('https://example.com/new-avatar.png');
    expect(parent.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
  });

  it('handles lifecycle status transitions (active <-> suspended -> deactivated)', () => {
    const parent = ParentIdentityEntity.create({
      phone: '+919876543210',
    });

    expect(parent.status).toBe('active');

    // active -> suspended
    parent.changeStatus('suspended');
    expect(parent.status).toBe('suspended');

    // suspended -> active
    parent.changeStatus('active');
    expect(parent.status).toBe('active');

    // active -> deactivated (terminal)
    parent.changeStatus('deactivated');
    expect(parent.status).toBe('deactivated');
  });

  it('blocks status transition from deactivated (terminal state)', () => {
    const parent = ParentIdentityEntity.create({
      phone: '+919876543210',
    });

    parent.changeStatus('deactivated');

    expect(() => parent.changeStatus('active')).toThrow(ValidationError);
    expect(() => parent.changeStatus('suspended')).toThrow(ValidationError);
  });

  it('blocks profile updates when deactivated', () => {
    const parent = ParentIdentityEntity.create({
      phone: '+919876543210',
      name: 'Before Deactivation',
    });

    parent.changeStatus('deactivated');

    expect(() => parent.updateProfile({ name: 'New Name' })).toThrow(ValidationError);
  });

  it('throws ValidationError for empty or invalid ID', () => {
    expect(() =>
      ParentIdentityEntity.from({
        id: '',
        phone: '+919876543210',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).toThrow(ValidationError);
  });

  it('exports DTO cleanly', () => {
    const parent = ParentIdentityEntity.create({
      phone: '+919876543210',
      name: 'Test DTO Parent',
    });

    const dto = parent.toDTO();
    expect(dto.id).toBe(parent.id);
    expect(dto.phone).toBe('+919876543210');
    expect(dto.name).toBe('Test DTO Parent');
    expect(dto.status).toBe('active');
  });
});
