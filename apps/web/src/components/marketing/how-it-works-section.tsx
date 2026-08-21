'use client';

import * as React from 'react';
import Image from 'next/image';
import { Container, Section } from '../layout/container';

const STEPS = [
  {
    number: '01',
    title: 'Plan the batch',
    description: 'Schedules and sessions are ready before class begins.',
  },
  {
    number: '02',
    title: 'Run the session',
    description: 'Teachers see what they need and record attendance.',
  },
  {
    number: '03',
    title: 'Keep the day\'s work connected',
    description: 'Homework, assessments and fees stay connected to the right students and batches.',
  },
  {
    number: '04',
    title: 'Follow up',
    description: 'Staff can see what needs attention.',
  },
  {
    number: '05',
    title: 'Keep families informed',
    description: 'Parents receive relevant updates afterward.',
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
    <Section padding="none" id="how-it-works" className="bg-canvas border-t border-border/50 py-20 lg:py-32">
      <Container size="lg" className="max-w-[1200px]">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 relative">
          
          {/* Left Column (Sticky Header) */}
          <div className="w-full lg:w-[45%] flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="lg:sticky lg:top-40">
              <span className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary block">
                HOW IT WORKS
              </span>
              <h2 className="font-display text-[2.5rem] md:text-[3rem] lg:text-[3.25rem] leading-[1.1] text-ink lg:max-w-[420px]">
                The institute day has a rhythm.
              </h2>
            </div>
          </div>

          {/* Right Column (Timeline) */}
          <div className="w-full lg:w-[55%] flex justify-center lg:justify-start px-4 sm:px-0">
            <div className="relative w-full max-w-2xl">
              {/* Vertical Line */}
              <div className="absolute left-[7px] sm:left-[88px] top-4 bottom-8 w-[1px] bg-[#9FC5C2]" />
               
              <div className="flex flex-col gap-12 sm:gap-16">
                {STEPS.map((step, index) => {
                  const isActive = index <= activeStep;
                  const isCurrent = index === activeStep;

                  return (
                    <div 
                      key={step.number} 
                      data-index={index}
                      ref={(el) => { stepRefs.current[index] = el; }}
                      className={`relative pl-10 sm:pl-[140px] transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-40'}`}
                    >
                      {/* Dot */}
                      <div className={`absolute left-[3.5px] sm:left-[84.5px] top-[10px] w-2 h-2 rounded-full transition-colors duration-500 z-10 ring-4 ring-canvas ${isActive ? 'bg-primary' : 'bg-canvas border-2 border-[#9FC5C2]'}`} />
                       
                      {/* Step Number (Desktop) */}
                      <div className={`absolute left-0 top-[7px] hidden sm:block font-mono text-[12px] font-semibold tracking-[0.08em] uppercase w-16 text-right transition-colors duration-500 ${isActive ? 'text-primary' : 'text-text-secondary/50'}`}>
                        STEP {step.number}
                      </div>
                       
                      {/* Mobile Step Number */}
                      <div className={`sm:hidden mb-2 font-mono text-[11px] tracking-[0.08em] uppercase transition-colors duration-500 ${isActive ? 'text-primary' : 'text-text-secondary/50'}`}>
                        STEP {step.number}
                      </div>

                      {/* Content */}
                      <div>
                        <h3 className={`font-ui font-bold text-[20px] lg:text-[22px] mb-2 transition-colors duration-500 ${isCurrent ? 'text-ink' : 'text-ink/80'}`}>
                          {step.title}
                        </h3>
                        <p className="text-[16px] lg:text-[18px] leading-[1.6] text-text-secondary max-w-[420px]">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </Container>
    </Section>
  );
}
