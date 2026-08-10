import * as React from 'react';
import { HeroSection } from '../../components/marketing/hero-section';
import { WorkflowSection } from '../../components/marketing/workflow-section';
import { CapabilitiesSection } from '../../components/marketing/capabilities-section';
import { RolesSection } from '../../components/marketing/roles-section';
import { TrustSection } from '../../components/marketing/trust-section';

export default function MarketingHomePage() {
  return (
    <>
      <HeroSection />
      <WorkflowSection />
      <CapabilitiesSection />
      <RolesSection />
      <TrustSection />
    </>
  );
}
