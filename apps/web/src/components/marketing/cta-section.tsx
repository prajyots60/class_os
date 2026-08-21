import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Container, Section } from '../layout/container';

export function CTASection() {
  return (
    <Section
      padding="none"
      id="beta-cta"
      className="relative bg-ink py-24 sm:py-32 lg:py-36 overflow-hidden border-t border-border/40"
    >
      {/* Subtle Ambient Radial Highlight */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[400px] sm:h-[500px] bg-primary/25 rounded-full blur-[120px] pointer-events-none" 
      />

      <Container size="lg" className="relative max-w-[720px] text-center z-10">
        {/* Eyebrow */}
        <span className="inline-flex items-center gap-2 mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-soft-brand bg-soft-brand/10 border border-soft-brand/20 px-3 py-1 rounded-full">
          <Sparkles className="w-3 h-3" />
          PRIVATE BETA PROGRAM
        </span>

        {/* Headline */}
        <h2 className="font-display text-[2.5rem] sm:text-[3.25rem] md:text-[3.75rem] lg:text-[4.25rem] leading-[1.1] text-surface mb-6">
          Give your institute one clear operating rhythm.
        </h2>

        {/* Subtitle */}
        <p className="font-ui text-[17px] sm:text-[19px] text-surface/75 leading-[1.6] mb-10 max-w-[540px] mx-auto">
          We&apos;re partnering with founder-led coaching institutes to shape CoachingOS around the daily realities of running your institute.
        </p>

        {/* CTA Button & Trust Note */}
        <div className="flex flex-col items-center gap-4">
          <Link href="/sign-up" className="w-full sm:w-auto">
            <button className="group w-full sm:w-auto h-13 rounded-lg bg-soft-brand text-ink px-9 text-[16px] font-bold hover:bg-[#d0e5e3] shadow-[0_4px_24px_rgba(189,217,215,0.18)] hover:shadow-[0_6px_30px_rgba(189,217,215,0.28)] transition-all duration-200 flex items-center justify-center gap-2">
              <span>Request beta access</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </Link>

          <span className="font-mono text-[12px] text-surface/50 tracking-tight pt-1">
            Zero setup fees · Direct founder onboarding &amp; data migration support
          </span>
        </div>
      </Container>
    </Section>
  );
}
