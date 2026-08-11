import { describe, it, expect } from 'vitest';
import { instituteSettingsFormSchema } from './institute-settings-form-schema';

describe('instituteSettingsFormSchema Unit Tests', () => {
  it('validates a correct full settings payload', () => {
    const result = instituteSettingsFormSchema.safeParse({
      name: 'Vanguard Classes',
      phone: '+919876543210',
      email: 'admin@vanguard.com',
      timezone: 'Asia/Kolkata',
      logoUrl: 'https://cdn.example.com/logo.png',
      primaryColor: '#0F172A',
    });

    expect(result.success).toBe(true);
  });

  it('validates null/empty optional branding values', () => {
    const result = instituteSettingsFormSchema.safeParse({
      name: 'Vanguard Classes',
      phone: '+919876543210',
      email: 'admin@vanguard.com',
      timezone: 'Asia/Kolkata',
      logoUrl: '',
      primaryColor: null,
    });

    expect(result.success).toBe(true);
  });

  it('rejects name shorter than 2 characters', () => {
    const result = instituteSettingsFormSchema.safeParse({
      name: 'A',
      phone: '+919876543210',
      email: 'admin@vanguard.com',
      timezone: 'Asia/Kolkata',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at least 2 characters');
    }
  });

  it('rejects invalid email formats', () => {
    const result = instituteSettingsFormSchema.safeParse({
      name: 'Vanguard Classes',
      phone: '+919876543210',
      email: 'not-an-email',
      timezone: 'Asia/Kolkata',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('valid email address');
    }
  });

  it('rejects non-HTTPS logo URLs (HTTP, file:, javascript:)', () => {
    const invalidUrls = [
      'http://cdn.example.com/logo.png',
      'javascript:alert(1)',
      'file:///etc/passwd',
      'ftp://example.com/logo.png',
    ];

    invalidUrls.forEach((url) => {
      const result = instituteSettingsFormSchema.safeParse({
        name: 'Vanguard Classes',
        phone: '+919876543210',
        email: 'admin@vanguard.com',
        timezone: 'Asia/Kolkata',
        logoUrl: url,
      });

      expect(result.success).toBe(false);
    });
  });

  it('rejects non-HEX primary color values (RGB, HSL, raw text)', () => {
    const invalidColors = [
      'rgb(255,0,0)',
      'hsl(0,100%,50%)',
      'red',
      '#12345',
      '#GGGGGG',
      'var(--primary)',
    ];

    invalidColors.forEach((color) => {
      const result = instituteSettingsFormSchema.safeParse({
        name: 'Vanguard Classes',
        phone: '+919876543210',
        email: 'admin@vanguard.com',
        timezone: 'Asia/Kolkata',
        primaryColor: color,
      });

      expect(result.success).toBe(false);
    });
  });

  it('accepts valid 3-digit and 6-digit HEX colors', () => {
    const validColors = ['#FFF', '#000', '#0F172A', '#2563EB', '#ff0000'];

    validColors.forEach((color) => {
      const result = instituteSettingsFormSchema.safeParse({
        name: 'Vanguard Classes',
        phone: '+919876543210',
        email: 'admin@vanguard.com',
        timezone: 'Asia/Kolkata',
        primaryColor: color,
      });

      expect(result.success).toBe(true);
    });
  });
});
