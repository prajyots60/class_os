import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Smartphone, Bell } from 'lucide-react';
import { Container, Section } from '../layout/container';

export function FamilyExperienceSection() {
  return (
    <Section
      padding="none"
      id="for-families"
      className="relative bg-surface py-20 sm:py-24 lg:py-32 border-t border-border/80 overflow-hidden w-full"
    >
      {/* Background Subtle Grid Texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-35"
        style={{
          backgroundImage: 'linear-gradient(#deded7 1px, transparent 1px), linear-gradient(90deg, #deded7 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      <Container size="lg" className="relative max-w-[1240px] z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 xl:gap-16 items-center">
          
          {/* Left Column: Prominent Large Visual with Scaled Circular Orbit Rings */}
          <div className="lg:col-span-6 xl:col-span-7 relative flex items-center justify-center min-h-[400px] sm:min-h-[520px] lg:min-h-[600px] order-2 lg:order-1">
            {/* Outer Orbit Circle */}
            <div className="absolute w-[340px] sm:w-[480px] lg:w-[580px] h-[340px] sm:h-[480px] lg:h-[580px] rounded-full border border-primary/20 pointer-events-none" />
            
            {/* Inner Dashed Orbit Circle */}
            <div className="absolute w-[250px] sm:w-[360px] lg:w-[440px] h-[250px] sm:h-[360px] lg:h-[440px] rounded-full border border-dashed border-primary/30 pointer-events-none" />

            {/* Large Mobile Showcase Asset */}
            <div className="relative z-10 w-full max-w-[320px] sm:max-w-[460px] lg:max-w-[520px] xl:max-w-[560px] transition-transform duration-300 hover:scale-[1.02]">
              <Image 
                src="/family-identity.png" 
                alt="CoachingOS Parent Portal Mobile Application" 
                width={1200}
                height={1350}
                className="w-full h-auto object-contain drop-shadow-[0_24px_48px_rgba(20,21,26,0.16)] sm:drop-shadow-[0_32px_64px_rgba(20,21,26,0.2)]"
                priority
              />
            </div>
          </div>

          {/* Right Column: Copy & Actions */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-start order-1 lg:order-2">
            <span className="mb-3 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-primary block">
              YOUR INSTITUTE ON THEIR PHONE
            </span>

            <h2 className="font-ui font-extrabold text-[clamp(2.15rem,4.5vw,3.75rem)] leading-[1.05] tracking-tight text-ink mb-5 sm:mb-6">
              A professional parent portal. <span className="text-primary block sm:inline lg:block">Not another group chat.</span>
            </h2>

            <p className="font-ui text-[15px] sm:text-[17px] text-text-secondary leading-[1.6] mb-6 sm:mb-8 max-w-[480px]">
              Give every parent a clear place to check their child’s attendance, homework, test results, fees, and announcements — without asking your staff to repeat the same answer all day.
            </p>

            {/* Feature Points */}
            <div className="space-y-4 sm:space-y-5 mb-8 sm:mb-10 w-full">
              <div className="flex items-start gap-3.5 sm:gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-soft-brand text-primary mt-0.5 shadow-sm">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-ui font-bold text-[15px] sm:text-[16px] text-ink mb-0.5">
                    Made for real phones
                  </h3>
                  <p className="text-[13px] sm:text-[14px] text-text-secondary leading-[1.5]">
                    Readable, touch-friendly, and calm on mobile without app store downloads.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 sm:gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-soft-brand text-primary mt-0.5 shadow-sm">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-ui font-bold text-[15px] sm:text-[16px] text-ink mb-0.5">
                    Updates that matter
                  </h3>
                  <p className="text-[13px] sm:text-[14px] text-text-secondary leading-[1.5]">
                    Attendance, marks, fees, and announcements in one organized activity view.
                  </p>
                </div>
              </div>
            </div>

            {/* Indigo Action CTA */}
            <Link href="/sign-up" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto h-12 sm:h-13 rounded-xl bg-primary text-white px-8 text-[15px] font-bold hover:bg-primary-hover shadow-[0_3px_0_#3e32b7] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2">
                <span>Bring parents into the loop</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

        </div>
      </Container>
    </Section>
  );
}
