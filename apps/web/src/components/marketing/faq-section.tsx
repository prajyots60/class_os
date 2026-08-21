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
  const [openIndex, setOpenIndex] = React.useState<number | null>(0); // First open by default for rich visual balance

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <Section
      padding="none"
      id="faq"
      className="bg-canvas py-20 sm:py-24 lg:py-32 border-t border-border/60"
    >
      <Container size="lg" className="max-w-[1200px]">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 xl:gap-20 items-start">
          
          {/* Left Column: Editorial Header & Support Touchpoint */}
          <div className="w-full lg:w-[40%] flex flex-col items-start lg:sticky lg:top-28">
            <span className="block mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="font-display text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] lg:text-[3.5rem] leading-[1.1] text-ink mb-6">
              Clear answers before you begin.
            </h2>
            <p className="font-ui text-[16px] sm:text-[17px] text-text-secondary leading-[1.6] mb-8 max-w-[460px]">
              Everything you need to know about our operating system, onboarding workflow, and parent experience.
            </p>

            {/* Direct Founder Contact Box */}
            <div className="w-full p-5 sm:p-6 rounded-xl bg-surface border border-border/80 shadow-[0_4px_20px_rgba(16,36,38,0.03)] space-y-3">
              <div className="flex items-center gap-2.5 text-primary">
                <MessageSquareCheck className="w-5 h-5" />
                <span className="font-bold text-[14px] text-ink">Have a specific question?</span>
              </div>
              <p className="text-[13px] text-text-secondary leading-[1.5]">
                We work directly with founders to ensure CoachingOS fits the unique rhythms of your institute.
              </p>
              <div className="pt-1">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:text-primary-hover transition-colors group"
                >
                  <span>Request beta consultation</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: High-Craft Editorial Accordion */}
          <div className="w-full lg:w-[60%]">
            <div className="border-t border-border/80 divide-y divide-border/80">
              {FAQS.map((faq, index) => {
                const isOpen = openIndex === index;
                return (
                  <div
                    key={faq.id}
                    className={`transition-colors duration-200 ${
                      isOpen ? 'bg-surface/50' : 'hover:bg-surface/30'
                    }`}
                  >
                    <button
                      onClick={() => toggle(index)}
                      className="w-full py-5 sm:py-6 px-3 sm:px-4 flex items-start justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-colors gap-4"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <span className="font-mono text-[12px] font-bold text-primary shrink-0 mt-0.5">
                          0{index + 1}
                        </span>
                        <span className="font-ui font-bold text-[16px] sm:text-[17px] text-ink leading-snug">
                          {faq.question}
                        </span>
                      </div>
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-all duration-200 ${
                          isOpen
                            ? 'bg-primary text-canvas border-primary rotate-180'
                            : 'bg-surface border-border text-text-secondary hover:border-text-secondary'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-3 sm:px-4 pb-6 pt-1 ml-7 sm:ml-8 pr-6 sm:pr-8">
                        <p className="font-ui text-[14px] sm:text-[15px] text-text-secondary leading-[1.65]">
                          {faq.answer}
                        </p>
                      </div>
                    )}
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
