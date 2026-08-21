import * as React from 'react';
import { HeroSection } from '../../components/marketing/hero-section';
import { HowItWorksSection } from '../../components/marketing/how-it-works-section';
import { WorkflowsSection } from '../../components/marketing/workflows-section';
import { OperationalPillarsSection } from '../../components/marketing/operational-pillars-section';
import { InstituteIdentitySection } from '../../components/marketing/institute-identity-section';
import { FamilyExperienceSection } from '../../components/marketing/family-experience-section';
import { FaqSection } from '../../components/marketing/faq-section';
import { CTASection } from '../../components/marketing/cta-section';

export default function MarketingHomePage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <WorkflowsSection />
      <OperationalPillarsSection />
      <InstituteIdentitySection />
      <FamilyExperienceSection />
      <FaqSection />
      <CTASection />
    </>
  );
}
