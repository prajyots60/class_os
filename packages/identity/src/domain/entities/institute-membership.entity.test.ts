import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { InstituteMembershipEntity } from './institute-membership.entity';

describe('InstituteMembershipEntity', () => {
  describe('create()', () => {
    it('creates a valid active InstituteMembershipEntity', () => {
      const membership = InstituteMembershipEntity.create({
        userId: 'usr-123',
        instituteId: 'inst-456',
        role: 'owner',
      });

      expect(membership.id).toBeDefined();
      expect(membership.userId).toBe('usr-123');
      expect(membership.instituteId).toBe('inst-456');
      expect(membership.role).toBe('owner');
      expect(membership.status).toBe('active');
      expect(membership.isActive).toBe(true);
      expect(membership.createdAt).toBeInstanceOf(Date);
      expect(membership.updatedAt).toBeInstanceOf(Date);
    });

    it('throws ValidationError if userId is empty', () => {
      expect(() =>
        InstituteMembershipEntity.create({
          userId: '   ',
          instituteId: 'inst-456',
          role: 'teacher',
        }),
      ).toThrow(ValidationError);
    });

    it('throws ValidationError if instituteId is empty', () => {
      expect(() =>
        InstituteMembershipEntity.create({
          userId: 'usr-123',
          instituteId: '',
          role: 'assistant',
        }),
      ).toThrow(ValidationError);
    });

    it('throws ValidationError if role is invalid', () => {
      expect(() =>
        InstituteMembershipEntity.create({
          userId: 'usr-123',
          instituteId: 'inst-456',
          role: 'superadmin' as any,
        }),
      ).toThrow(ValidationError);
    });
  });

  describe('Status Transitions (suspend, activate, remove)', () => {
    it('allows suspending and re-activating an active membership', () => {
      const membership = InstituteMembershipEntity.create({
        userId: 'usr-123',
        instituteId: 'inst-456',
        role: 'teacher',
      });

      membership.suspend();
      expect(membership.status).toBe('suspended');
      expect(membership.isActive).toBe(false);

      membership.activate();
      expect(membership.status).toBe('active');
      expect(membership.isActive).toBe(true);
    });

    it('allows removing a membership', () => {
      const membership = InstituteMembershipEntity.create({
        userId: 'usr-123',
        instituteId: 'inst-456',
        role: 'assistant',
      });

      membership.remove();
      expect(membership.status).toBe('removed');
      expect(membership.isActive).toBe(false);
    });

    it('rejects activating or suspending a removed membership', () => {
      const membership = InstituteMembershipEntity.create({
        userId: 'usr-123',
        instituteId: 'inst-456',
        role: 'parent',
      });

      membership.remove();
      expect(() => membership.activate()).toThrow(ValidationError);
      expect(() => membership.suspend()).toThrow(ValidationError);
    });

    it('rejects role update on a removed membership', () => {
      const membership = InstituteMembershipEntity.create({
        userId: 'usr-123',
        instituteId: 'inst-456',
        role: 'teacher',
      });

      membership.remove();
      expect(() => membership.updateRole('owner')).toThrow(ValidationError);
    });
  });
});
