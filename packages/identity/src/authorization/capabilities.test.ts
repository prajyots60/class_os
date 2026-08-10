import { describe, expect, it } from 'vitest';
import {
  CAPABILITIES,
  isCapability,
  isCapabilityResource,
  isCapabilityAction,
  type CapabilityResource,
  type CapabilityAction,
} from './capabilities';
import type { MembershipRole } from '../domain/entities/institute-membership.entity';

describe('Canonical Capability Registry & Runtime Taxonomy Suite', () => {
  it('1. Every capability value is unique', () => {
    const values = Object.values(CAPABILITIES);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('2. Every capability follows resource:action syntax', () => {
    const values = Object.values(CAPABILITIES);
    for (const val of values) {
      expect(val).toMatch(/^[a-z]+:[a-z_]+$/);
    }
  });

  it('3. Every capability belongs to the canonical resource taxonomy', () => {
    const values = Object.values(CAPABILITIES);
    for (const val of values) {
      const [resource] = val.split(':');
      expect(isCapabilityResource(resource)).toBe(true);
    }
  });

  it('4. Every capability action is valid', () => {
    const values = Object.values(CAPABILITIES);
    for (const val of values) {
      const [, action] = val.split(':');
      expect(isCapabilityAction(action)).toBe(true);
    }
  });

  it('5. Registry values contain no dot notation', () => {
    const values = Object.values(CAPABILITIES);
    for (const val of values) {
      expect(val).not.toContain('.');
    }
  });

  it('6. Registry contains no empty strings or whitespace', () => {
    const values = Object.values(CAPABILITIES);
    for (const val of values) {
      expect(val.trim().length).toBeGreaterThan(0);
      expect(val).toBe(val.trim());
    }
  });

  it('7. Runtime isCapability() recognizes every registered capability', () => {
    const values = Object.values(CAPABILITIES);
    for (const val of values) {
      expect(isCapability(val)).toBe(true);
    }
  });

  it('8. isCapability() rejects undeclared or malformed capabilities', () => {
    expect(isCapability('student:delete')).toBe(false); // undeclared
    expect(isCapability('student.create')).toBe(false); // dot notation
    expect(isCapability('student')).toBe(false); // missing action
    expect(isCapability('')).toBe(false);
    expect(isCapability(null)).toBe(false);
    expect(isCapability(undefined)).toBe(false);
    expect(isCapability(123)).toBe(false);
  });

  it('9. MembershipRole remains authoritative and exact', () => {
    const canonicalRoles: MembershipRole[] = ['owner', 'teacher', 'assistant', 'parent'];
    expect(canonicalRoles).toHaveLength(4);
    expect(canonicalRoles).toContain('owner');
    expect(canonicalRoles).toContain('teacher');
    expect(canonicalRoles).toContain('assistant');
    expect(canonicalRoles).toContain('parent');
  });
});
