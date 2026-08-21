import * as React from 'react';
import { Container, Section } from '../layout/container';

const ROLES = [
  {
    role: 'Owner',
    title: 'See the institute clearly.',
    description: 'Overview, people, academics and fees.',
  },
  {
    role: 'Teacher',
    title: 'Run the session.',
    description: 'Sessions, attendance, homework and assessments.',
  },
  {
    role: 'Assistant',
    title: 'Keep operations moving.',
    description: 'Students, guardians, fees and daily tasks.',
  },
  {
    role: 'Parent',
    title: 'Know what happened.',
    description: 'Attendance, homework, results and fees.',
  },
];

export function WorkflowsSection() {
  return (
    <Section padding="none" id="workflows" className="bg-soft-brand py-16 sm:py-20 lg:py-24">
      <Container size="lg" className="max-w-[1200px]">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-10 sm:mb-12 lg:mb-14">
          <span className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-primary/80">
            ONE SYSTEM
          </span>
          <h2 className="font-display text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] lg:text-[3.5rem] leading-[1.1] text-ink max-w-[620px]">
            One system. Everyone knows what to do next.
          </h2>
        </div>

        {/* Roles Editorial Grid: 1 col on mobile, 2 col on tablet, 4 col on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-8 xl:gap-10">
          {ROLES.map((item, index) => (
            <div 
              key={item.role} 
              className="flex flex-col border-t border-ink/20 pt-6 lg:pt-8"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.08em] text-primary">
                  {item.role}
                </span>
                <span className="font-mono text-[11px] font-medium text-ink/40">
                  0{index + 1}
                </span>
              </div>
              <h3 className="font-ui font-bold text-[19px] sm:text-[20px] lg:text-[21px] text-ink leading-[1.3] mb-2.5">
                {item.title}
              </h3>
              <p className="font-ui text-[14px] sm:text-[15px] text-ink/75 leading-[1.6]">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
