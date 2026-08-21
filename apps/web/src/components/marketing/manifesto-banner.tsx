import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '../layout/container';

export function ManifestoBanner() {
  return (
    <section className="relative bg-primary py-16 sm:py-20 lg:py-28 text-white overflow-hidden border-y border-white/10 w-full">
      {/* Subtle Ambient Depth Glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[300px] sm:h-[350px] bg-[#6e61f2]/30 rounded-full blur-[90px] sm:blur-[100px] pointer-events-none" 
      />

      <Container size="lg" className="relative max-w-[1200px] z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-10 lg:gap-16 text-center lg:text-left">
          
          {/* Left: Manifesto Statement */}
          <div className="max-w-[680px]">
            <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-[#d9d6ff] block mb-2 sm:mb-3">
              THE NEXT WORKING DAY CAN FEEL DIFFERENT
            </span>
            
            <h2 className="font-ui font-extrabold text-[clamp(2.1rem,4.8vw,3.75rem)] leading-[1.05] tracking-tight text-white mb-3 sm:mb-4">
              Put your institute on an operating system.
            </h2>

            <p className="font-ui text-[15px] sm:text-[17px] lg:text-[18px] text-[#e0ddff] leading-[1.6] max-w-[560px]">
              Replace disconnected spreadsheets, paper registers, and manual follow-up with one calm, connected daily rhythm.
            </p>

            {/* Quick Guarantees Strip */}
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-5 text-[11px] sm:text-[12px] font-semibold text-[#d9d6ff]/90">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                <span>Zero complex training</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                <span>Your branding stays front-and-center</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                <span>Spreadsheet migration included</span>
              </div>
            </div>
          </div>

          {/* Right: High-Contrast Action Button with 3D Shadow & Glow */}
          <div className="shrink-0 flex flex-col items-center lg:items-end gap-2.5 sm:gap-3 w-full sm:w-auto">
            <Link href="/sign-up" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto h-13 sm:h-14 rounded-xl bg-white text-primary px-8 sm:px-9 text-[15px] sm:text-[16px] font-extrabold hover:bg-[#f0edff] shadow-[0_4px_0_#3e32b7] hover:shadow-[0_8px_28px_rgba(255,255,255,0.25)] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2.5 group cursor-pointer">
                <span>Request beta access</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 duration-200" />
              </button>
            </Link>
            <span className="font-mono text-[10px] sm:text-[11px] text-[#d9d6ff]/75 tracking-tight">
              Beta intake is open for 50–500 student academies
            </span>
          </div>

        </div>
      </Container>
    </section>
  );
}
