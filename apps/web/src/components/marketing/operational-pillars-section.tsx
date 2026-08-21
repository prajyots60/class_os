import * as React from 'react';
import { Container, Section } from '../layout/container';

export function OperationalPillarsSection() {
  return (
    <Section padding="none" id="pillars" className="bg-canvas py-20 sm:py-24 lg:py-32 border-t border-border/60">
      <Container size="lg" className="max-w-[1200px]">
        {/* Header */}
        <div className="mb-12 sm:mb-16 lg:mb-20">
          <span className="block mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
            WHAT STAYS CONNECTED
          </span>
          <h2 className="font-display text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] lg:text-[3.5rem] leading-[1.1] text-ink max-w-[620px]">
            Everything that matters, in one place.
          </h2>
        </div>

        {/* Asymmetrical 2x2 Grid with Narrative Order: Batches -> Academics -> Fees -> Family */}
        <div className="space-y-6 sm:space-y-8">
          
          {/* Row 1: Batches (7 cols) + Academics (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            
            {/* Pillar 1: Batches & schedules (7 cols on lg) */}
            <div className="lg:col-span-7 bg-surface border border-border rounded-xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between shadow-[0_4px_20px_rgba(16,36,38,0.03)]">
              <div className="mb-6">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-primary block mb-2">
                  BATCHES & SCHEDULES
                </span>
                <h3 className="font-ui font-bold text-[20px] sm:text-[22px] lg:text-[24px] text-ink mb-2">
                  Know what is happening, when, and for whom.
                </h3>
                <p className="font-ui text-[15px] sm:text-[16px] text-text-secondary leading-[1.6]">
                  Schedules, sessions, and batch enrollment stay organized without spreadsheet chaos.
                </p>
              </div>

              {/* Micro UI Preview: Schedule table */}
              <div className="w-full bg-canvas rounded-lg border border-border/80 p-4 sm:p-5 font-ui text-[13px]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink/70">
                    BrightPath Academy • Active Batches
                  </span>
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-soft-brand/40 text-primary">
                    4 ON SCHEDULE
                  </span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded bg-surface border border-border/50">
                    <div>
                      <span className="font-bold text-ink block">JEE Advanced A1</span>
                      <span className="text-[12px] text-text-secondary font-mono">07:00 - 09:00 AM • Prof. R. Rao</span>
                    </div>
                    <span className="text-[11px] font-mono font-semibold px-2 py-1 rounded bg-[#237A5B]/10 text-[#237A5B]">
                      ● In Progress
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-surface border border-border/50">
                    <div>
                      <span className="font-bold text-ink block">NEET UG Foundation</span>
                      <span className="text-[12px] text-text-secondary font-mono">09:15 - 11:15 AM • Dr. Sharma</span>
                    </div>
                    <span className="text-[11px] font-mono font-semibold px-2 py-1 rounded bg-ink/5 text-text-secondary">
                      Up Next
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pillar 2: Attendance & academics (5 cols on lg) */}
            <div className="lg:col-span-5 bg-surface border border-border rounded-xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between shadow-[0_4px_20px_rgba(16,36,38,0.03)]">
              <div className="mb-6">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-primary block mb-2">
                  ATTENDANCE & ACADEMICS
                </span>
                <h3 className="font-ui font-bold text-[20px] sm:text-[22px] lg:text-[24px] text-ink mb-2">
                  Sessions, homework, and assessments unified.
                </h3>
                <p className="font-ui text-[15px] sm:text-[16px] text-text-secondary leading-[1.6]">
                  Sessions, homework and assessments stay with the student&apos;s academic record.
                </p>
              </div>

              {/* Micro UI Preview: Roll call & stats */}
              <div className="w-full bg-canvas rounded-lg border border-border/80 p-4 sm:p-5 font-ui text-[13px]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                  <span className="font-bold text-ink">Physics Mechanics 101</span>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[#237A5B]/10 text-[#237A5B]">
                    94% Attendance
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-[12px] font-mono">
                  <div className="p-2.5 rounded bg-surface border border-border/50">
                    <span className="text-text-secondary block text-[10px]">HOMEWORK</span>
                    <span className="font-bold text-ink">30/32 Submitted</span>
                  </div>
                  <div className="p-2.5 rounded bg-surface border border-border/50">
                    <span className="text-text-secondary block text-[10px]">AVG SCORE</span>
                    <span className="font-bold text-ink">82 / 100</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Row 2: Fees (5 cols) + Family updates (7 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            
            {/* Pillar 3: Fees & receipts (5 cols on lg) */}
            <div className="lg:col-span-5 bg-surface border border-border rounded-xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between shadow-[0_4px_20px_rgba(16,36,38,0.03)]">
              <div className="mb-6">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-primary block mb-2">
                  FEES & RECEIPTS
                </span>
                <h3 className="font-ui font-bold text-[20px] sm:text-[22px] lg:text-[24px] text-ink mb-2">
                  Track what is due and paid.
                </h3>
                <p className="font-ui text-[15px] sm:text-[16px] text-text-secondary leading-[1.6]">
                  Record payments and issue receipts without chasing WhatsApp screenshots.
                </p>
              </div>

              {/* Micro UI Preview: Fee Ledger */}
              <div className="w-full bg-canvas rounded-lg border border-border/80 p-4 sm:p-5 font-ui text-[13px]">
                <div className="flex justify-between items-baseline mb-3">
                  <span className="text-[12px] text-text-secondary">August Collections</span>
                  <span className="font-mono font-bold text-[18px] text-ink">₹ 4,82,000</span>
                </div>
                <div className="p-3 rounded bg-surface border border-border/60 space-y-1.5">
                  <div className="flex justify-between items-center text-[12px]">
                    <span className="font-semibold text-ink">Aarav Patel</span>
                    <span className="font-mono font-bold text-[#237A5B]">₹ 25,000 Paid</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-text-secondary font-mono">
                    <span>Receipt #RCP-2026-089</span>
                    <span>UPI Verified ✓</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pillar 4: Family updates (7 cols on lg) */}
            <div className="lg:col-span-7 bg-surface border border-border rounded-xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between shadow-[0_4px_20px_rgba(16,36,38,0.03)]">
              <div className="mb-6">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-primary block mb-2">
                  FAMILY UPDATES
                </span>
                <h3 className="font-ui font-bold text-[20px] sm:text-[22px] lg:text-[24px] text-ink mb-2">
                  Keep parents informed.
                </h3>
                <p className="font-ui text-[15px] sm:text-[16px] text-text-secondary leading-[1.6]">
                  Targeted batch notices, exam marks, and attendance alerts delivered directly.
                </p>
              </div>

              {/* Micro UI Preview: Direct parent update dispatch */}
              <div className="w-full bg-canvas rounded-lg border border-border/80 p-4 sm:p-5 font-ui text-[13px] space-y-2.5">
                <div className="p-3 rounded bg-surface border border-border/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[12px] text-ink">📢 Mock Test 04 Result Published</span>
                    <span className="text-[11px] font-mono text-text-secondary">Just now</span>
                  </div>
                  <p className="text-[12px] text-text-secondary leading-snug">
                    Scorecard shared with guardian of Rohan Mehta • Rank #3 in JEE Adv Batch
                  </p>
                </div>
                <div className="p-2.5 rounded bg-soft-brand/25 border border-soft-brand-dark/40 flex items-center justify-between text-[11px] font-mono text-primary">
                  <span>Parent Hub Notification & WhatsApp Confirmation</span>
                  <span className="font-bold">Delivered ✓</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </Container>
    </Section>
  );
}
