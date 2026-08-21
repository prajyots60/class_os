import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { Container, Section } from '../layout/container';

export function CTASection() {
  return (
    <Section
      padding="none"
      id="beta-intake"
      className="bg-night py-16 sm:py-24 lg:py-32 border-t border-border/20 text-white w-full overflow-hidden"
    >
      <Container size="lg" className="max-w-[1200px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-16 items-center">
          
          {/* Left Column (Copy & Founder Positioning) */}
          <div className="lg:col-span-6 flex flex-col items-start">
            <span className="mb-3 sm:mb-4 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-[#a7a0ff] block">
              EARLY INSTITUTE BETA
            </span>

            <h2 className="font-ui font-extrabold text-[clamp(2.15rem,4.5vw,4rem)] leading-[1.05] tracking-tight text-white mb-4 sm:mb-6">
              Build the better way to run your institute <span className="text-[#a7a0ff] block sm:inline lg:block">with us.</span>
            </h2>

            <p className="font-ui text-[15px] sm:text-[17px] lg:text-[18px] text-[#babac5] leading-[1.65] mb-6 sm:mb-8 max-w-[500px]">
              We are onboarding a select group of founder-led coaching institutes for the initial CoachingOS beta. In return for honest operational feedback, selected institutes receive focused engineering onboarding and full beta access at zero charge.
            </p>

            {/* Value Trust Pills */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#202027] border border-[#393943] text-[11px] sm:text-[12px] font-semibold text-[#c4c4cd]">
                <Check className="w-3.5 h-3.5 text-[#9e98f7] shrink-0" />
                <span>No credit card</span>
              </div>
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#202027] border border-[#393943] text-[11px] sm:text-[12px] font-semibold text-[#c4c4cd]">
                <Check className="w-3.5 h-3.5 text-[#9e98f7] shrink-0" />
                <span>Direct founder onboarding</span>
              </div>
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#202027] border border-[#393943] text-[11px] sm:text-[12px] font-semibold text-[#c4c4cd]">
                <Check className="w-3.5 h-3.5 text-[#9e98f7] shrink-0" />
                <span>50–500 students</span>
              </div>
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#202027] border border-[#393943] text-[11px] sm:text-[12px] font-semibold text-[#c4c4cd]">
                <Check className="w-3.5 h-3.5 text-[#9e98f7] shrink-0" />
                <span>Spreadsheet migration</span>
              </div>
            </div>
          </div>

          {/* Right Column: Floating Qualification Beta Card */}
          <div className="lg:col-span-6 w-full mt-4 lg:mt-0">
            <div className="bg-surface text-ink border border-[#4c4b57] rounded-2xl shadow-2xl overflow-hidden w-full">
              {/* Top Card Bar */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 bg-[#fbfbfa] border-b border-border text-[10px] sm:text-[11px] font-mono text-text-secondary">
                <span className="font-bold tracking-wider">COACHINGOS / BETA 01</span>
                <span className="inline-flex items-center gap-1.5 font-bold text-primary">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  Limited Intake
                </span>
              </div>

              {/* Card Body */}
              <div className="p-5 sm:p-8 lg:p-10">
                <h3 className="font-ui font-extrabold text-[20px] sm:text-[24px] lg:text-[26px] text-ink leading-tight mb-4 sm:mb-6">
                  Does this sound like your institute?
                </h3>

                <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 text-[13px] sm:text-[14px] text-text-secondary">
                  <li className="flex items-start gap-2.5 sm:gap-3">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>You manage batches, teachers, parents, and fees daily</span>
                  </li>
                  <li className="flex items-start gap-2.5 sm:gap-3">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>WhatsApp groups and spreadsheets have become the operating system</span>
                  </li>
                  <li className="flex items-start gap-2.5 sm:gap-3">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>You want clean, practical software — not an enterprise ERP</span>
                  </li>
                  <li className="flex items-start gap-2.5 sm:gap-3">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>You want your institute’s brand and logo to lead the experience</span>
                  </li>
                </ul>

                <Link href="/sign-up" className="block w-full">
                  <button className="w-full h-12 sm:h-13 rounded-xl bg-primary text-white font-bold text-[15px] sm:text-[16px] hover:bg-primary-hover shadow-[0_3px_0_#3e32b7] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2">
                    <span>Request beta access</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>

                <p className="text-[11px] sm:text-[12px] text-center text-text-secondary/70 mt-3.5 sm:mt-4 font-ui">
                  We will speak with you personally before confirming a beta slot.
                </p>
              </div>
            </div>
          </div>

        </div>
      </Container>
    </Section>
  );
}
