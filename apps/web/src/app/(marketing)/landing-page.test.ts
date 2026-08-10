import { describe, it, expect } from 'vitest';
import MarketingHomePage from './page';
import MarketingLayout, { metadata } from './layout';
import { HeroSection } from '../../components/marketing/hero-section';
import { WorkflowSection } from '../../components/marketing/workflow-section';
import { CapabilitiesSection } from '../../components/marketing/capabilities-section';
import { RolesSection } from '../../components/marketing/roles-section';
import { TrustSection } from '../../components/marketing/trust-section';
import { CTASection } from '../../components/marketing/cta-section';

describe('Phase 0.12.2 Landing Page Acceptance Gate', () => {
  it('MarketingHomePage and MarketingLayout export valid component functions', () => {
    expect(typeof MarketingHomePage).toBe('function');
    expect(typeof MarketingLayout).toBe('function');
  });

  it('All 6 marketing section components are defined and export functions', () => {
    expect(typeof HeroSection).toBe('function');
    expect(typeof WorkflowSection).toBe('function');
    expect(typeof CapabilitiesSection).toBe('function');
    expect(typeof RolesSection).toBe('function');
    expect(typeof TrustSection).toBe('function');
    expect(typeof CTASection).toBe('function');
  });

  it('MarketingHomePage composes all six sections in sequence without errors', () => {
    const pageElement = MarketingHomePage();
    expect(pageElement).toBeDefined();
    expect(pageElement.props.children.length).toBe(6);
  });

  it('MarketingLayout contains valid metadata object with title and description', () => {
    expect(metadata).toBeDefined();
    expect(metadata.title).toContain('CoachingOS');
    expect(metadata.description).toContain('coaching institutes');
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.twitter).toBeDefined();
  });
});
