import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Container, Section } from '../layout/container';

export function HeroSection() {
  return (
    <Section
      padding="none"
      id="hero"
      // Pulled upward: reduced pt-20 to pt-12, lg:pt-28 to lg:pt-20
      className="relative bg-canvas pt-12 pb-16 lg:pt-20 lg:pb-24 overflow-hidden"
    >
      <Container size="lg" className="relative">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8 xl:gap-12 w-full">
          
          {/* Left Column (Text) */}
          {/* Ratio: w-[42%] */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left w-full lg:w-[42%] z-10 shrink-0">
            {/* Tighter gap */}
            <span className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
              Coaching Institute Operating System
            </span>

            {/* Smaller headline, 3 lines via max-w */}
            <h1 className="font-display text-[clamp(2.5rem,4.5vw,4.75rem)] leading-[1.1] text-ink max-w-[420px] lg:max-w-[480px]">
              Run the institute day from one clear workspace.
            </h1>

            {/* Slightly darker, heavier body copy */}
            <p className="mt-5 lg:mt-6 text-[16px] lg:text-[18px] font-medium leading-[1.6] text-ink/80 max-w-[480px]">
              Batches, attendance, fees, staff follow-up, and parent updates stay connected to the same operating rhythm.
            </p>

            <div className="mt-8 lg:mt-10 flex flex-col sm:flex-row items-center gap-4 lg:gap-6 w-full sm:w-auto">
              <Link href="/sign-up" className="w-full sm:w-auto">
                <button
                  className="w-full sm:w-auto h-12 rounded bg-primary text-canvas px-8 text-[16px] font-semibold hover:bg-primary-hover transition-colors"
                >
                  Request beta access
                </button>
              </Link>
              {/* Anchor CTA with short arrow */}
              <Link href="/#architecture-trust" className="group flex items-center gap-2 text-[16px] font-semibold text-ink hover:text-primary transition-colors">
                See how it works
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            
            {/* Quieter "Designed for..." line */}
            <div className="mt-12 lg:mt-14 w-full flex flex-col items-center lg:items-start border-t border-border/50 pt-5">
               <p className="text-[12px] font-medium text-text-secondary/70 uppercase tracking-widest">
                 Designed for founder-led coaching institutes.
               </p>
            </div>
          </div>

          {/* Right Column (Visual) */}
          {/* Ratio: w-[58%] */}
          <div className="w-full lg:w-[58%] relative mt-8 lg:mt-0 flex justify-center lg:justify-end">
             {/* Version A: just image with specific shadow: 0 8px 24px rgba(16,36,38,0.08) */}
             <div 
               className="relative w-full max-w-[800px] lg:w-[115%] lg:max-w-none lg:-mr-[15%] xl:-mr-[10%] rounded-xl border border-border/60 overflow-hidden"
               style={{ boxShadow: '0 8px 24px rgba(16,36,38,0.08)' }}
             >
               <Image 
                 src="/Hero_Desktop.png" 
                 alt="CoachingOS Owner Dashboard" 
                 width={1440}
                 height={900}
                 className="w-full h-auto object-cover"
                 priority
               />
             </div>
          </div>

        </div>
      </Container>
    </Section>
  );
}
