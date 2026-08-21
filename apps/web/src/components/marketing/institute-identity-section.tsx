import * as React from 'react';
import Image from 'next/image';
import { Container, Section } from '../layout/container';

export function InstituteIdentitySection() {
  return (
    <Section
      padding="none"
      id="identity"
      className="bg-canvas py-16 sm:py-20 lg:py-28 border-t border-border/80 w-full overflow-hidden"
    >
      <Container size="lg" className="max-w-[1200px]">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14 xl:gap-18">
          
          {/* Left Column: Text & Editorial Invariants */}
          <div className="w-full lg:w-[46%] xl:w-[45%] flex flex-col items-center text-center lg:items-start lg:text-left shrink-0">
            <span className="block mb-2.5 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
              INSTITUTE IDENTITY
            </span>
            
            <h2 className="font-ui font-extrabold text-[clamp(2.15rem,4.5vw,3.75rem)] leading-[1.05] tracking-tight text-ink mb-4 sm:mb-5 max-w-[500px]">
              Your institute stays. <span className="text-primary block sm:inline lg:block">At the center.</span>
            </h2>

            <p className="font-ui text-[15px] sm:text-[17px] text-text-secondary leading-[1.6] mb-6 sm:mb-8 max-w-[480px]">
              Your institute&apos;s name, logo, and identity stay visible throughout the experience
              — while CoachingOS stays quietly behind the scenes.
            </p>

            {/* 3 Identity Pillars */}
            <div className="w-full space-y-3.5 sm:space-y-4 pt-1 text-left">
              <div className="border-t border-border/80 pt-3.5 sm:pt-4 flex items-start gap-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-soft-brand text-primary font-mono text-[11px] font-bold mt-0.5">
                  01
                </span>
                <div>
                  <h3 className="font-ui font-bold text-[15px] sm:text-[16px] text-ink">
                    Your institute, clearly represented
                  </h3>
                  <p className="text-[13px] sm:text-[14px] text-text-secondary leading-[1.5] mt-0.5">
                    Your institute name and logo remain part of the experience your staff and families use daily.
                  </p>
                </div>
              </div>

              <div className="border-t border-border/80 pt-3.5 sm:pt-4 flex items-start gap-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-soft-brand text-primary font-mono text-[11px] font-bold mt-0.5">
                  02
                </span>
                <div>
                  <h3 className="font-ui font-bold text-[15px] sm:text-[16px] text-ink">
                    Your primary colour, carried through
                  </h3>
                  <p className="text-[13px] sm:text-[14px] text-text-secondary leading-[1.5] mt-0.5">
                    Use your institute&apos;s signature brand colour across all supported areas of the product.
                  </p>
                </div>
              </div>

              <div className="border-t border-border/80 pt-3.5 sm:pt-4 flex items-start gap-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-soft-brand text-primary font-mono text-[11px] font-bold mt-0.5">
                  03
                </span>
                <div>
                  <h3 className="font-ui font-bold text-[15px] sm:text-[16px] text-ink">
                    CoachingOS stays in the background
                  </h3>
                  <p className="text-[13px] sm:text-[14px] text-text-secondary leading-[1.5] mt-0.5">
                    The platform powers operations without putting another software brand between your institute and families.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: High-Fidelity Realistic Image */}
          <div className="w-full lg:w-[54%] xl:w-[55%] relative flex justify-center lg:justify-end mt-6 lg:mt-0">
            <div
              className="relative w-full max-w-[650px] lg:max-w-none rounded-xl border border-border overflow-hidden bg-surface shadow-[0_12px_36px_rgba(20,21,26,0.06)] sm:shadow-[0_24px_48px_rgba(20,21,26,0.08)]"
            >
              <Image
                src="/Customization_Branding.png"
                alt="CoachingOS Dashboard showing custom institute branding and identity settings"
                width={1440}
                height={1080}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 55vw, 650px"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

        </div>
      </Container>
    </Section>
  );
}
