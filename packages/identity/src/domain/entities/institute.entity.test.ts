import { describe, expect, it } from 'vitest';
import { ValidationError } from '@coaching-os/shared';
import { InstituteEntity } from './institute.entity';

describe('InstituteEntity', () => {
  describe('create()', () => {
    it('creates a valid active InstituteEntity with derived normalized slug', () => {
      const institute = InstituteEntity.create({
        name: 'Sharma Physics Classes',
        phone: '+919876543210',
        email: 'info@sharmaphysics.com',
      });

      expect(institute.id).toBeDefined();
      expect(institute.name).toBe('Sharma Physics Classes');
      expect(institute.slug).toBe('sharma-physics-classes');
      expect(institute.phone).toBe('+919876543210');
      expect(institute.email).toBe('info@sharmaphysics.com');
      expect(institute.timezone).toBe('Asia/Kolkata');
      expect(institute.status).toBe('active');
      expect(institute.createdAt).toBeInstanceOf(Date);
      expect(institute.updatedAt).toBeInstanceOf(Date);
    });

    it('accepts a custom URL-safe slug', () => {
      const institute = InstituteEntity.create({
        name: 'Apex Academy',
        slug: 'apex-delhi-north',
        phone: '+919876543211',
        email: 'contact@apex.com',
        timezone: 'Asia/Kolkata',
      });

      expect(institute.slug).toBe('apex-delhi-north');
    });

    it('throws ValidationError if institute name is empty', () => {
      expect(() =>
        InstituteEntity.create({
          name: '   ',
          phone: '+919876543210',
          email: 'test@example.com',
        }),
      ).toThrow(ValidationError);
    });

    it('throws ValidationError if explicit slug is invalid', () => {
      expect(() =>
        InstituteEntity.create({
          name: 'Valid Name',
          slug: 'INVALID SLUG WITH SPACES',
          phone: '+919876543210',
          email: 'test@example.com',
        }),
      ).toThrow(ValidationError);
    });
  });

  describe('normalizeSlug()', () => {
    it('lowercases, strips special chars, and replaces spaces with hyphens', () => {
      expect(InstituteEntity.normalizeSlug('  Aravind & Sons Coaching!!!  ')).toBe(
        'aravind-sons-coaching',
      );
      expect(InstituteEntity.normalizeSlug('Pinnacle__Classes  2026')).toBe(
        'pinnacle-classes-2026',
      );
    });
  });

  describe('updateDetails()', () => {
    it('updates mutable properties and refreshes updatedAt timestamp', () => {
      const institute = InstituteEntity.create({
        name: 'Initial Name',
        phone: '+919800000000',
        email: 'initial@example.com',
      });

      const initialUpdatedAt = institute.updatedAt;

      institute.updateDetails({
        name: 'Updated Name',
        phone: '+919999999999',
        timezone: 'Asia/Kolkata',
      });

      expect(institute.name).toBe('Updated Name');
      expect(institute.phone).toBe('+919999999999');
      expect(institute.updatedAt.getTime()).toBeGreaterThanOrEqual(
        initialUpdatedAt.getTime(),
      );
    });

    it('throws ValidationError when updating name to empty string', () => {
      const institute = InstituteEntity.create({
        name: 'Valid Name',
        phone: '+919800000000',
        email: 'initial@example.com',
      });

      expect(() => institute.updateDetails({ name: '   ' })).toThrow(
        ValidationError,
      );
    });
  });

  describe('Status Transitions (archive, suspend, activate)', () => {
    it('allows archiving an active institute', () => {
      const institute = InstituteEntity.create({
        name: 'Test Institute',
        phone: '+919800000000',
        email: 'test@example.com',
      });

      institute.archive();
      expect(institute.status).toBe('archived');
    });

    it('allows suspending an active institute', () => {
      const institute = InstituteEntity.create({
        name: 'Test Institute',
        phone: '+919800000000',
        email: 'test@example.com',
      });

      institute.suspend();
      expect(institute.status).toBe('suspended');

      institute.activate();
      expect(institute.status).toBe('active');
    });

    it('rejects suspending an archived institute', () => {
      const institute = InstituteEntity.create({
        name: 'Test Institute',
        phone: '+919800000000',
        email: 'test@example.com',
      });

      institute.archive();
      expect(() => institute.suspend()).toThrow(ValidationError);
    });
  });
});
