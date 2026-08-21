'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight, MessageSquareCheck } from 'lucide-react';
import { Container, Section } from '../layout/container';

interface FaqItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

const FAQS: FaqItem[] = [
  {
    id: 'who-is-it-for',
    question: 'Who is CoachingOS built for?',
    answer: (
      <>
        CoachingOS is crafted specifically for founder-led and independent coaching institutes—including JEE/NEET test prep, regional board tuition centers, and foundational academies with 50 to 2,500+ students. If you are tired of juggling spreadsheets, chaotic WhatsApp groups, and generic software that doesn&apos;t match how an institute actually runs, CoachingOS is built for you.
      </>
    ),
  },
  {
    id: 'onboarding-migration',
    question: 'How do we migrate our existing students and batches?',
    answer: (
      <>
        During the private beta, our team handles your data onboarding directly. We help import your existing student rosters, faculty assignments, batch schedules, and fee structures from your current spreadsheets or legacy systems so you can transition seamlessly without interrupting ongoing academic sessions.
      </>
    ),
  },
  {
    id: 'family-experience',
    question: 'How do parents and students access their updates?',
    answer: (
      <>
        Parents and students access a fast, lightweight mobile web application that requires zero app-store downloads. They can view real-time session attendance, test scorecards, homework assignments, and fee receipts directly from any phone browser. Parents with children in multiple classes can switch contexts effortlessly while each institute remains completely isolated.
      </>
    ),
  },
  {
    id: 'branding-customization',
    question: 'How does our institute branding appear to families?',
    answer: (
      <>
        Your institute name, official logo/crest, and primary brand colors are prominently featured across every student portal, staff interface, and generated receipt. CoachingOS acts as the quiet operating engine in the background, keeping your institution&apos;s prestige and identity front and center.
      </>
    ),
  },
  {
    id: 'staff-privacy-permissions',
    question: 'Can staff members see confidential financial ledgers?',
    answer: (
      <>
        No. Access is strictly governed by role boundaries. Faculty members can mark session attendance and grade tests without ever seeing student fee balances or institute revenues. Front-desk assistants handle day-to-day registrations without access to overall institute profitability or owner settings.
      </>
    ),
  },
  {
    id: 'beta-program',
    question: 'What is included in the private beta access?',
    answer: (
      <>
        Private beta partners receive hands-on setup support from our founding engineering team, personalized staff training, prioritized feature requests, and early access to our complete operating suite (Batches, Academics, Fee Ledgers, and Family Hub).
      </>
    ),
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0); // First open by default

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <Section
      padding="none"
      id="faq"
      className="bg-canvas py-16 sm:py-20 lg:py-28 border-t border-border/80 w-full overflow-hidden"
    >
      <Container size="lg" className="max-w-[1200px]">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 xl:gap-20 items-start">
          
          {/* Left Column: Editorial Header & Support Touchpoint */}
          <div className="w-full lg:w-[40%] flex flex-col items-start self-start shrink-0">
            <span className="block mb-2.5 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="font-ui font-extrabold text-[clamp(2.15rem,4.5vw,3.75rem)] leading-[1.05] tracking-tight text-ink mb-4 sm:mb-6">
              Clear answers. <span className="text-primary block sm:inline lg:block">Before you begin.</span>
            </h2>
            <p className="font-ui text-[15px] sm:text-[17px] text-text-secondary leading-[1.6] mb-6 sm:mb-8 max-w-[460px]">
              Everything you need to know about our operating system, onboarding workflow, and parent experience.
            </p>

            {/* Direct Founder Contact Box */}
            <div className="w-full p-4 sm:p-6 rounded-xl bg-surface border border-border/80 shadow-[0_4px_20px_rgba(16,36,38,0.03)] space-y-2.5 sm:space-y-3 transition-all hover:border-primary/40 hover:shadow-[0_8px_24px_rgba(83,70,217,0.06)]">
              <div className="flex items-center gap-2 text-primary">
                <MessageSquareCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-bold text-[13px] sm:text-[14px] text-ink">Have a specific question?</span>
              </div>
              <p className="text-[12px] sm:text-[13px] text-text-secondary leading-[1.5]">
                We work directly with founders to ensure CoachingOS fits the unique rhythms of your institute.
              </p>
              <div className="pt-1">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold text-primary hover:text-primary-hover transition-colors group"
                >
                  <span>Request beta consultation</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 duration-200" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: High-Craft Editorial Accordion */}
          <div className="w-full lg:w-[60%] shrink-0 mt-4 lg:mt-0">
            <div className="border-t border-border/80 divide-y divide-border/80">
              {FAQS.map((faq, index) => {
                const isOpen = openIndex === index;
                return (
                  <div
                    key={faq.id}
                    className={`transition-colors duration-200 ${
                      isOpen ? 'bg-surface/60' : 'hover:bg-surface/30'
                    }`}
                  >
                    <button
                      onClick={() => toggle(index)}
                      className="w-full py-4 sm:py-5 px-2 sm:px-4 flex items-start justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-colors gap-3 sm:gap-4 cursor-pointer"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-start gap-2.5 sm:gap-4 pr-2">
                        <span className="font-mono text-[11px] sm:text-[12px] font-bold text-primary shrink-0 mt-0.5">
                          0{index + 1}
                        </span>
                        <span className="font-ui font-bold text-[15px] sm:text-[17px] text-ink leading-snug">
                          {faq.question}
                        </span>
                      </div>
                      <div
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ease-out ${
                          isOpen
                            ? 'bg-primary text-white border-primary rotate-180 shadow-xs'
                            : 'bg-surface border-border text-text-secondary hover:border-text-secondary'
                        }`}
                      >
                        <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </button>

                    {/* Smooth Grid-Height Expansion */}
                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="px-2 sm:px-4 pb-5 pt-1 ml-5 sm:ml-8 pr-4 sm:pr-8">
                          <p className="font-ui text-[13px] sm:text-[15px] text-text-secondary leading-[1.65]">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </Container>
    </Section>
  );
}
