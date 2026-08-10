import * as React from 'react';
import { HeroSection } from '../../components/marketing/hero-section';
import { WorkflowSection } from '../../components/marketing/workflow-section';
import { CapabilitiesSection } from '../../components/marketing/capabilities-section';

export default function MarketingHomePage() {
  return (
    <>
      <HeroSection />
      <WorkflowSection />
      <CapabilitiesSection />
    </>
  );
}
