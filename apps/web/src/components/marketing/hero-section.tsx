import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, Bell } from 'lucide-react';
import { Container, Section } from '../layout/container';

export function HeroSection() {
  return (
    <Section
      padding="none"
      id="hero"
      className="relative bg-canvas pt-8 pb-14 sm:pt-12 sm:pb-18 lg:pt-20 lg:pb-28 overflow-hidden w-full"
    >
      {/* Background Subtle Grid Texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'linear-gradient(#deded7 1px, transparent 1px), linear-gradient(90deg, #deded7 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(180deg, black 40%, transparent 95%)',
        }}
      />

      <Container size="lg" className="relative">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-8 xl:gap-14 w-full">
          
          {/* Left Column (Text) */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left w-full lg:w-[48%] xl:w-[45%] z-10 shrink-0">
            {/* Live Eyebrow Pill */}
            <div className="mb-4 sm:mb-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-soft-brand border border-primary/20 shadow-xs transition-transform hover:scale-[1.02]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
                A NEW OPERATING RHYTHM
              </span>
            </div>

            {/* Dual-Tone Responsive Headline */}
            <h1 className="font-ui font-extrabold text-[clamp(2.15rem,5.5vw,4.25rem)] leading-[1.04] tracking-tight text-ink max-w-[560px]">
              Run the institute day. <span className="text-primary block sm:inline lg:block">From one workspace.</span>
            </h1>

            {/* Body Copy */}
            <p className="mt-4 sm:mt-5 lg:mt-6 text-[15px] sm:text-[17px] lg:text-[18px] font-medium leading-[1.6] text-text-secondary max-w-[480px]">
              Batches, attendance, fee ledgers, staff follow-up, and parent updates stay connected to the same operating rhythm.
            </p>

            {/* CTAs */}
            <div className="mt-6 sm:mt-8 lg:mt-10 flex flex-col sm:flex-row items-center gap-3.5 sm:gap-5 w-full sm:w-auto">
              <Link href="/sign-up" className="w-full sm:w-auto">
                <button
                  className="w-full sm:w-auto h-12 rounded-lg bg-primary text-white px-8 text-[15px] font-bold hover:bg-primary-hover shadow-[0_3px_0_#3e32b7] hover:shadow-[0_6px_20px_rgba(83,70,217,0.35)] active:translate-y-0.5 active:shadow-none transition-all duration-150 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Request beta access
                </button>
              </Link>
              
              <Link href="/#how-it-works" className="group flex items-center justify-center gap-2 text-[14px] sm:text-[15px] font-bold text-ink hover:text-primary transition-colors py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md px-2">
                <span>See how it works</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 duration-200" />
              </Link>
            </div>
            
            {/* Value Guarantees Strip */}
            <div className="mt-10 sm:mt-12 lg:mt-14 w-full flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-5 border-t border-border/70 pt-4 sm:pt-5 text-[11px] sm:text-[12px] font-semibold text-text-secondary">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#19714b] shrink-0" />
                <span>Zero complex setup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#19714b] shrink-0" />
                <span>Built for 50–500 students</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#19714b] shrink-0" />
                <span>Your institute branding</span>
              </div>
            </div>
          </div>

          {/* Right Column (Product Composite Visual) */}
          <div className="w-full lg:w-[52%] xl:w-[55%] relative mt-4 lg:mt-0 flex justify-center lg:justify-end">
            <div 
              className="relative w-full max-w-[650px] lg:max-w-none rounded-xl border border-border overflow-hidden bg-surface shadow-[0_12px_36px_rgba(20,21,26,0.08)] sm:shadow-[0_24px_48px_rgba(20,21,26,0.12)] transition-transform duration-300 hover:shadow-[0_28px_56px_rgba(20,21,26,0.14)]"
            >
              {/* Top Floating Badge Pill with Smooth Float Animation */}
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5 sm:gap-2 bg-surface/95 backdrop-blur-md border border-border px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md shadow-md text-[10px] sm:text-[11px] font-mono font-bold text-ink animate-float-slow">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#19714b] animate-pulse-live" />
                <span className="text-[#19714b]">LIVE</span>
                <span className="text-text-secondary hidden sm:inline">12 of 14 sessions marked</span>
              </div>

              {/* Main Screenshot Asset with Responsive sizes and Priority for Fast LCP */}
              <Image 
                src="/Hero_Desktop.png" 
                alt="CoachingOS Owner Dashboard workspace view" 
                width={1440}
                height={900}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 55vw, 650px"
                className="w-full h-auto object-cover"
                priority
                loading="eager"
              />

              {/* Bottom Floating Callout Pill with Subtle Float Animation */}
              <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 hidden xs:flex sm:flex items-center gap-2 sm:gap-2.5 bg-surface/95 backdrop-blur-md border border-border px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg shadow-lg text-[11px] sm:text-[12px] font-ui animate-float-reverse">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-soft-brand flex items-center justify-center text-primary shrink-0">
                  <Bell className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-ink block text-[10px] sm:text-[11px] leading-tight">Parent Update Sent</span>
                  <span className="text-[9px] sm:text-[10px] text-text-secondary font-mono">18 reminders delivered</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </Container>
    </Section>
  );
}
