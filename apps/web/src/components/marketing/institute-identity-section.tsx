import * as React from 'react';
import Image from 'next/image';
import { Container, Section } from '../layout/container';

export function InstituteIdentitySection() {
  return (
    <Section
      padding="none"
      id="identity"
      className="bg-canvas py-20 sm:py-24 lg:py-32 border-t border-border/60"
    >
      <Container size="lg" className="max-w-[1200px]">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 xl:gap-20">
          {/* Left Column: Text & Editorial Invariants */}
          <div className="w-full lg:w-[42%] flex flex-col items-center text-center lg:items-start lg:text-left shrink-0">
            <span className="block mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
              INSTITUTE IDENTITY
            </span>
            <h2 className="font-display text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] lg:text-[3.5rem] leading-[1.1] text-ink mb-6 max-w-[500px]">
              Your institute stays at the center.
            </h2>
            <p className="font-ui text-[16px] sm:text-[17px] text-text-secondary leading-[1.6] mb-8 max-w-[480px]">
              Your institute&apos;s name, logo, and identity stay visible throughout the experience
              — while CoachingOS stays quietly behind the scenes.
            </p>

            {/* 3 Identity Pillars */}
            <div className="w-full space-y-4 pt-2 text-left">
              <div className="border-t border-border/60 pt-4 flex items-start gap-4">
                <span className="font-mono text-[11px] font-bold text-primary shrink-0 mt-0.5">
                  01
                </span>
                <div>
                  <h3 className="font-ui font-bold text-[15px] text-ink">
                    Your institute, clearly represented
                  </h3>
                  <p className="text-[14px] text-text-secondary">
                    Your institute name and logo remain part of the experience your staff and
                    families use.
                  </p>
                </div>
              </div>
              <div className="border-t border-border/60 pt-4 flex items-start gap-4">
                <span className="font-mono text-[11px] font-bold text-primary shrink-0 mt-0.5">
                  02
                </span>
                <div>
                  <h3 className="font-ui font-bold text-[15px] text-ink">
                    Your primary colour, carried through
                  </h3>
                  <p className="text-[14px] text-text-secondary">
                    Use your institute&apos;s primary colour across supported areas of the product.
                  </p>
                </div>
              </div>
              <div className="border-t border-border/60 pt-4 flex items-start gap-4">
                <span className="font-mono text-[11px] font-bold text-primary shrink-0 mt-0.5">
                  03
                </span>
                <div>
                  <h3 className="font-ui font-bold text-[15px] text-ink">
                    CoachingOS stays in the background
                  </h3>
                  <p className="text-[14px] text-text-secondary">
                    The system powers daily operations without putting another brand between your
                    institute and its families.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: High-Fidelity Realistic Image */}
          <div className="w-full lg:w-[58%] relative flex justify-center lg:justify-end mt-12 lg:mt-0">
            <div
              className="relative w-full max-w-[800px] lg:w-[115%] lg:max-w-none lg:-mr-[15%] xl:-mr-[10%] rounded-xl border border-border/60 overflow-hidden"
              style={{ boxShadow: '0 8px 32px rgba(16,36,38,0.06)' }}
            >
              <Image
                src="/Customization_Branding.png"
                alt="CoachingOS Dashboard with Custom Institute Branding"
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
