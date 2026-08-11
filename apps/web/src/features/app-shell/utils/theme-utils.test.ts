import { describe, it, expect } from 'vitest';
import { hexToHsl } from './theme-utils';

describe('hexToHsl theme utility suite', () => {
  it('converts 6-digit hex string #2563EB to HSL space-separated string', () => {
    const result = hexToHsl('#2563EB');
    expect(result).toBe('221 83% 53%');
  });

  it('converts 3-digit hex string #FFF to 0 0% 100%', () => {
    const result = hexToHsl('#FFF');
    expect(result).toBe('0 0% 100%');
  });

  it('converts custom brand hex #575775', () => {
    const result = hexToHsl('#575775');
    expect(result).toBe('240 15% 40%');
  });

  it('returns null for empty, null, or invalid hex formats', () => {
    expect(hexToHsl(null)).toBeNull();
    expect(hexToHsl('')).toBeNull();
    expect(hexToHsl('invalid')).toBeNull();
    expect(hexToHsl('#GGGGGG')).toBeNull();
  });
});
