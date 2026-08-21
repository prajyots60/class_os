import { describe, it, expect } from 'vitest';
import MarketingHomePage from './page';
import MarketingLayout, { metadata } from './layout';
import { HeroSection } from '../../components/marketing/hero-section';
import { HowItWorksSection } from '../../components/marketing/how-it-works-section';
import { WorkflowsSection } from '../../components/marketing/workflows-section';
import { OperationalPillarsSection } from '../../components/marketing/operational-pillars-section';
import { InstituteIdentitySection } from '../../components/marketing/institute-identity-section';
import { FamilyExperienceSection } from '../../components/marketing/family-experience-section';
import { FaqSection } from '../../components/marketing/faq-section';
import { CTASection } from '../../components/marketing/cta-section';

describe('Landing Page Acceptance Gate', () => {
  it('MarketingHomePage and MarketingLayout export valid component functions', () => {
    expect(typeof MarketingHomePage).toBe('function');
    expect(typeof MarketingLayout).toBe('function');
  });

  it('All marketing section components are defined and export functions', () => {
    expect(typeof HeroSection).toBe('function');
    expect(typeof HowItWorksSection).toBe('function');
    expect(typeof WorkflowsSection).toBe('function');
    expect(typeof OperationalPillarsSection).toBe('function');
    expect(typeof InstituteIdentitySection).toBe('function');
    expect(typeof FamilyExperienceSection).toBe('function');
    expect(typeof FaqSection).toBe('function');
    expect(typeof CTASection).toBe('function');
  });

  it('MarketingHomePage composes all sections in sequence without errors', () => {
    const pageElement = MarketingHomePage();
    expect(pageElement).toBeDefined();
    expect(pageElement.props.children.length).toBe(8);
  });

  it('MarketingLayout contains valid metadata object with title and description', () => {
    expect(metadata).toBeDefined();
    expect(metadata.title).toContain('CoachingOS');
    expect(metadata.description).toBeDefined();
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.twitter).toBeDefined();
  });
});
