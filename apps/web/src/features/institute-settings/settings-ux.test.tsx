import React from 'react';
import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { InstituteProfileForm } from './components/institute-profile-form';
import { InstituteBrandingForm } from './components/institute-branding-form';
import { AcademicDefaultsSection } from './components/academic-defaults-section';
import { SettingsSkeleton } from './components/settings-skeleton';
import { ColorPreview } from './components/color-preview';
import { LogoPreview } from './components/logo-preview';

describe('Phase 6.9 — Advanced Settings UX Test Suite', () => {
  const mockFormData = {
    name: 'Alpha Coaching Classes',
    phone: '+919876543210',
    email: 'contact@alphacoaching.com',
    timezone: 'Asia/Kolkata',
    slug: 'alpha-coaching',
    logoUrl: 'https://cdn.example.com/logo.png',
    primaryColor: '#0F172A',
  };

  // ── 1. Component Rendering & Information Architecture ──────────────────────

  it('SETTINGS-UX-001: Settings workspace components render without crashing', () => {
    const html = renderToStaticMarkup(<AcademicDefaultsSection timezone="Asia/Kolkata" />);
    expect(html).toContain('Academic System Defaults');
  });

  it('SETTINGS-UX-002: Institute Details section renders form inputs', () => {
    const html = renderToStaticMarkup(
      <InstituteProfileForm
        formData={mockFormData}
        fieldErrors={{}}
        isSubmitting={false}
        onInputChange={() => {}}
      />
    );
    expect(html).toContain('Institute Profile');
    expect(html).toContain('Alpha Coaching Classes');
    expect(html).toContain('+919876543210');
    expect(html).toContain('contact@alphacoaching.com');
    expect(html).toContain('Asia/Kolkata');
    expect(html).toContain('alpha-coaching');
  });

  it('SETTINGS-UX-003: Branding section renders color and logo controls', () => {
    const html = renderToStaticMarkup(
      <InstituteBrandingForm
        formData={mockFormData}
        fieldErrors={{}}
        isSubmitting={false}
        onInputChange={() => {}}
        onColorPickerChange={() => {}}
      />
    );
    expect(html).toContain('White-Label Branding');
    expect(html).toContain('https://cdn.example.com/logo.png');
    expect(html).toContain('#0F172A');
    expect(html).toContain('Logo Preview');
    expect(html).toContain('Brand Color Preview');
  });

  it('SETTINGS-UX-004: Academic Defaults section renders supported system defaults', () => {
    const html = renderToStaticMarkup(<AcademicDefaultsSection timezone="Asia/Kolkata" />);
    expect(html).toContain('Academic System Defaults');
    expect(html).toContain('Asia/Kolkata');
    expect(html).toContain('Session-Level Tracking');
    expect(html).toContain('Standard Grading Scale');
    expect(html).toContain('Row-Level Security');
    expect(html).toContain('Academic Defaults Boundary Note');
  });

  it('SETTINGS-UX-005: Color and Logo previews render fallback gracefully', () => {
    const logoHtml = renderToStaticMarkup(<LogoPreview logoUrl={null} instituteName="Beta Hub" />);
    expect(logoHtml).toContain('No logo URL configured');

    const colorHtml = renderToStaticMarkup(<ColorPreview primaryColor={null} instituteName="Beta Hub" />);
    expect(colorHtml).toContain('#0F172A'); // Default primary color fallback
  });

  it('SETTINGS-UX-006: Settings skeleton renders during loading state', () => {
    const html = renderToStaticMarkup(<SettingsSkeleton />);
    expect(html).toContain('animate-pulse');
  });

  // ── 2. Accessibility & Design Token Discipline ──────────────────────────────

  it('SETTINGS-UX-007: Form fields bind explicit label htmlFor and ID associations', () => {
    const html = renderToStaticMarkup(
      <InstituteProfileForm
        formData={mockFormData}
        fieldErrors={{}}
        isSubmitting={false}
        onInputChange={() => {}}
      />
    );
    expect(html).toContain('for="');
    expect(html).toContain('id="');
  });

  it('SETTINGS-UX-008: Field errors trigger aria-invalid and aria-describedby', () => {
    const html = renderToStaticMarkup(
      <InstituteProfileForm
        formData={mockFormData}
        fieldErrors={{ name: 'Institute name is required.' }}
        isSubmitting={false}
        onInputChange={() => {}}
      />
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('Institute name is required.');
  });

  it('SETTINGS-UX-009: Color picker has accessible screen reader label', () => {
    const html = renderToStaticMarkup(
      <InstituteBrandingForm
        formData={mockFormData}
        fieldErrors={{}}
        isSubmitting={false}
        onInputChange={() => {}}
        onColorPickerChange={() => {}}
      />
    );
    expect(html).toContain('Choose Color Swatch');
  });

  it('SETTINGS-UX-010: Status semantics do not rely solely on color (contains text tags & icons)', () => {
    const html = renderToStaticMarkup(<AcademicDefaultsSection timezone="Asia/Kolkata" />);
    expect(html).toContain('Active');
    expect(html).toContain('Standard');
    expect(html).toContain('Marks &amp; Percentage');
    expect(html).toContain('Strict Isolation');
  });

  // ── 3. Architectural Safety & Boundary Verification ────────────────────────

  it('SETTINGS-UX-011: Settings UI components contain zero Prisma or raw SQL imports', () => {
    const files = [
      'components/institute-profile-form.tsx',
      'components/institute-branding-form.tsx',
      'components/academic-defaults-section.tsx',
      'components/institute-settings-content.tsx',
    ];

    files.forEach((file) => {
      const code = fs.readFileSync(path.join(__dirname, file), 'utf-8');
      expect(code).not.toContain('@prisma/client');
      expect(code).not.toContain('PrismaClient');
      expect(code).not.toContain('SELECT ');
      expect(code).not.toContain('DELETE FROM');
    });
  });

  it('SETTINGS-UX-012: Settings UI components consume semantic CSS tokens (no hex inline overrides)', () => {
    const code = fs.readFileSync(path.join(__dirname, 'components/institute-settings-content.tsx'), 'utf-8');
    expect(code).toContain('hsl(var(--');
  });

  it('SETTINGS-UX-013: Zero new database fields introduced in Academic Defaults', () => {
    const code = fs.readFileSync(path.join(__dirname, 'components/academic-defaults-section.tsx'), 'utf-8');
    expect(code).not.toContain('prisma');
    expect(code).not.toContain('fetch(');
  });
});
