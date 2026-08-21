import * as React from 'react';
import Image from 'next/image';
import { Shield, Lock } from 'lucide-react';
import { Container, Section } from '../layout/container';

export function FamilyExperienceSection() {
  return (
    <Section
      padding="none"
      id="for-families"
      className="bg-surface py-20 sm:py-24 lg:py-32 border-t border-border/60"
    >
      <Container size="lg" className="max-w-[1200px]">
        <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-16 xl:gap-20">
          {/* Left Column: Text */}
          <div className="w-full lg:w-[42%] flex flex-col items-center text-center lg:items-start lg:text-left shrink-0">
            <span className="block mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
              ONE FAMILY HUB
            </span>
            <h2 className="font-display text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] lg:text-[3.5rem] leading-[1.1] text-ink mb-6 max-w-[500px]">
              Their institute.
              <br />
              Their identity.
              <br />
              One calm family view.
            </h2>
            <p className="font-ui text-[16px] sm:text-[17px] text-text-secondary leading-[1.6] mb-8 max-w-[480px]">
              Each institute can lead with its own name, logo, and colour. Parents still move
              cleanly between every child and every institute they follow.
            </p>

            {/* Points */}
            <div className="w-full space-y-4 pt-2 text-left">
              <div className="border-t border-border/60 pt-4 flex items-center gap-4">
                <Shield className="w-5 h-5 text-primary shrink-0" />
                <h3 className="font-ui font-bold text-[15px] text-ink">
                  Institute branding stays consistent
                </h3>
              </div>
              <div className="border-t border-border/60 pt-4 flex items-center gap-4">
                <Lock className="w-5 h-5 text-primary shrink-0" />
                <h3 className="font-ui font-bold text-[15px] text-ink">
                  Family access stays private by context
                </h3>
              </div>
            </div>
          </div>

          {/* Right Column: Image (Rendered on Left via row-reverse) */}
          <div className="w-full lg:w-[58%] relative flex justify-center lg:justify-start mt-12 lg:mt-0">
            <div className="relative w-full max-w-[800px] lg:w-[115%] lg:max-w-none lg:-ml-[15%] xl:-ml-[10%]">
              <Image
                src="/family-identity.png"
                alt="CoachingOS Family Hub Mobile Views"
                width={1440}
                height={1080}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
