'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container, Section } from '../layout/container';

const STEPS = [
  {
    number: '01',
    time: '08:00 AM',
    title: 'Today’s batches are already in order.',
    description: 'Sessions, teachers, and room schedules come together before the first student walks in.',
    action: 'Explore batch management',
    visual: (
      <div className="w-full bg-surface border border-border rounded-xl p-3.5 sm:p-5 shadow-sm font-ui text-[13px] space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-border/70 text-[10px] sm:text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-bold text-primary">ACTIVE WORKFLOW</span>
          </div>
          <span className="text-text-secondary">TODAY • MONDAY</span>
        </div>
        <div className="space-y-2 font-mono text-[11px] sm:text-[12px]">
          <div className="p-2 sm:p-2.5 rounded-lg bg-soft-brand/40 border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 truncate pr-2">
              <span className="font-bold text-primary shrink-0">09:00</span>
              <span className="font-bold text-ink truncate">Physics • NEET 2027</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-primary font-semibold shrink-0">Hall A • Prof. Rao</span>
          </div>
          <div className="p-2 sm:p-2.5 rounded-lg bg-canvas border border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 truncate pr-2">
              <span className="text-text-secondary shrink-0">11:30</span>
              <span className="text-ink font-medium truncate">Mathematics • JEE A1</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-secondary shrink-0">Room 2 • Dr. Sharma</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: '02',
    time: '09:15 AM',
    title: 'Attendance is done in 30 seconds.',
    description: 'One session, one clear roster. Present, absent, late — nothing to reconcile or calculate later.',
    action: 'View attendance workflow',
    visual: (
      <div className="w-full bg-surface border border-border rounded-xl p-3.5 sm:p-5 shadow-sm font-ui text-[13px] space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-border/70 text-[10px] sm:text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#19714b]" />
            <span className="font-bold text-ink">ROLL CALL LIVE</span>
          </div>
          <span className="text-[#19714b] font-bold">28 / 30 PRESENT</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-[11px] font-mono">
          <div className="p-2 sm:p-2.5 rounded bg-canvas border border-border/60 flex items-center justify-between">
            <span className="text-ink font-semibold truncate pr-1">Aarav Patel</span>
            <span className="text-[#19714b] font-bold bg-[#19714b]/10 px-1 py-0.5 rounded shrink-0">Present</span>
          </div>
          <div className="p-2 sm:p-2.5 rounded bg-canvas border border-border/60 flex items-center justify-between">
            <span className="text-ink font-semibold truncate pr-1">Rohan Mehta</span>
            <span className="text-[#19714b] font-bold bg-[#19714b]/10 px-1 py-0.5 rounded shrink-0">Present</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: '03',
    time: '01:30 PM',
    title: 'Keep the day’s work connected.',
    description: 'Homework assignments, test scorecards, and counter fee payments attach directly to student records.',
    action: 'See academic continuity',
    visual: (
      <div className="w-full bg-surface border border-border rounded-xl p-3.5 sm:p-5 shadow-sm font-ui text-[13px] space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-border/70 text-[10px] sm:text-[11px] font-mono">
          <span className="font-bold text-primary">DAILY LEDGER</span>
          <span className="text-text-secondary">INSTITUTE RECEIPTS</span>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg bg-soft-brand/30 border border-primary/20 flex items-center justify-between text-[11px] sm:text-[12px] font-mono">
          <div className="truncate pr-2">
            <span className="font-bold text-ink block truncate">Term 1 Installment</span>
            <span className="text-text-secondary text-[10px] sm:text-[11px]">RCP-2026-089 • UPI</span>
          </div>
          <span className="font-bold text-primary text-[13px] sm:text-[14px] shrink-0">₹25,000</span>
        </div>
      </div>
    ),
  },
  {
    number: '04',
    time: '04:00 PM',
    title: 'Follow up without digging.',
    description: 'Absence alerts, unpaid invoices, and pending teacher submissions bubble up automatically.',
    action: 'Review operational queues',
    visual: (
      <div className="w-full bg-surface border border-border rounded-xl p-3.5 sm:p-5 shadow-sm font-ui text-[13px] space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-border/70 text-[10px] sm:text-[11px] font-mono">
          <span className="font-bold text-[#a45d0b]">ACTION QUEUE</span>
          <span className="text-[#a45d0b] font-bold bg-[#a45d0b]/10 px-1.5 py-0.5 rounded">3 PENDING</span>
        </div>
        <div className="text-[10px] sm:text-[11px] font-mono text-text-secondary p-2 sm:p-2.5 rounded bg-canvas border border-border/60 flex items-center justify-between">
          <span className="truncate pr-2">Unmarked Session: Batch B</span>
          <span className="font-bold text-ink shrink-0">Notify Faculty</span>
        </div>
      </div>
    ),
  },
  {
    number: '05',
    time: '06:00 PM',
    title: 'Keep families informed.',
    description: 'Parents receive clean updates on attendance, marks, and announcements without staff repeating answers.',
    action: 'Preview parent portal',
    visual: (
      <div className="w-full bg-surface border border-border rounded-xl p-3.5 sm:p-5 shadow-sm font-ui text-[13px] space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-border/70 text-[10px] sm:text-[11px] font-mono">
          <span className="font-bold text-primary">PARENT DELIVERY</span>
          <span className="text-[#19714b] font-bold">SENT VIA PWA</span>
        </div>
        <div className="p-2 sm:p-2.5 rounded bg-canvas border border-border/60 text-[10px] sm:text-[11px] font-mono flex items-center justify-between">
          <span className="truncate pr-2">Today’s Attendance &amp; Physics HW</span>
          <span className="text-[#19714b] font-bold shrink-0">Delivered ✓</span>
        </div>
      </div>
    ),
  },
];

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = React.useState<number>(0);
  const stepRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            setActiveStep(index);
          }
        });
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      }
    );

    stepRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <Section padding="none" id="how-it-works" className="bg-canvas border-t border-border/80 py-16 sm:py-20 lg:py-28 w-full overflow-hidden">
      <Container size="lg" className="max-w-[1200px]">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-12 sm:mb-16 lg:mb-20">
          <div className="max-w-[620px]">
            <span className="mb-2.5 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-primary block">
              A DAY AT YOUR INSTITUTE
            </span>
            <h2 className="font-ui font-extrabold text-[clamp(2.15rem,4.5vw,3.75rem)] leading-[1.05] tracking-tight text-ink">
              The things that happen. <span className="text-primary block sm:inline lg:block">Finally, connected.</span>
            </h2>
          </div>
          <p className="font-ui text-[15px] sm:text-[17px] text-text-secondary leading-[1.6] max-w-[440px]">
            CoachingOS follows your institute’s actual rhythm. No generic ERP maze — just the workflows your team already needs to finish today.
          </p>
        </div>

        {/* Timeline Flow */}
        <div className="relative">
          {/* Vertical Progress Line */}
          <div className="absolute left-[11px] sm:left-[21px] top-4 bottom-10 w-[2px] bg-border" />

          <div className="space-y-12 sm:space-y-16 lg:space-y-20">
            {STEPS.map((step, index) => {
              const isActive = index <= activeStep;
              const isCurrent = index === activeStep;

              return (
                <div
                  key={step.number}
                  data-index={index}
                  ref={(el) => { stepRefs.current[index] = el; }}
                  className={`relative pl-8 sm:pl-16 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-14 items-center transition-opacity duration-300 ${
                    isActive ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  {/* Timeline Node Badge */}
                  <div
                    className={`absolute left-0 top-1 w-6 sm:w-11 h-6 sm:h-11 rounded-full flex items-center justify-center font-mono font-bold text-[10px] sm:text-[12px] z-10 transition-all duration-300 ring-4 ring-canvas ${
                      isCurrent
                        ? 'bg-primary text-white shadow-md scale-110'
                        : isActive
                        ? 'bg-primary text-white'
                        : 'bg-canvas border-2 border-border text-text-secondary'
                    }`}
                  >
                    {step.number}
                  </div>

                  {/* Text Column */}
                  <div className="lg:col-span-5">
                    <span className="font-mono text-[10px] sm:text-[11px] font-bold text-primary/80 uppercase tracking-widest block mb-1.5">
                      {step.time}
                    </span>
                    <h3 className="font-ui font-extrabold text-[20px] sm:text-[24px] text-ink leading-snug mb-2 sm:mb-2.5">
                      {step.title}
                    </h3>
                    <p className="font-ui text-[14px] sm:text-[15px] text-text-secondary leading-[1.6] mb-3 sm:mb-4">
                      {step.description}
                    </p>
                    <Link
                      href="/#workflows"
                      className="group inline-flex items-center gap-1.5 text-[13px] sm:text-[14px] font-bold text-primary hover:text-primary-hover transition-colors"
                    >
                      <span>{step.action}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>

                  {/* Visual Column */}
                  <div className="lg:col-span-7 w-full">
                    {step.visual}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </Section>
  );
}
