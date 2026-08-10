import { describe, it, expect } from 'vitest';
import { HeroSection } from './hero-section';
import { HeroProductPreview } from './hero-product-preview';

describe('Hero Section Component & Composition Verification', () => {
  it('HeroSection exports a valid component function', () => {
    expect(typeof HeroSection).toBe('function');
  });

  it('HeroProductPreview exports a valid component function', () => {
    expect(typeof HeroProductPreview).toBe('function');
  });
});
