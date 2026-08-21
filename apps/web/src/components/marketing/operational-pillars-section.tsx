import * as React from 'react';
import { Calendar, Users, Receipt, MessageSquare } from 'lucide-react';
import { Container, Section } from '../layout/container';

export function OperationalPillarsSection() {
  return (
    <Section padding="none" id="pillars" className="bg-canvas py-16 sm:py-20 lg:py-28 border-t border-border/80 w-full overflow-hidden">
      <Container size="lg" className="max-w-[1200px]">
        {/* Header with Dual-Tone Typography */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-10 sm:mb-14">
          <div className="max-w-[620px]">
            <span className="block mb-2.5 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
              WHAT STAYS CONNECTED
            </span>
            <h2 className="font-ui font-extrabold text-[clamp(2.15rem,4.5vw,3.75rem)] leading-[1.05] tracking-tight text-ink">
              Everything that matters. <span className="text-primary block sm:inline lg:block">In one place.</span>
            </h2>
          </div>
          <p className="font-ui text-[15px] sm:text-[17px] text-text-secondary leading-[1.6] max-w-[440px]">
            Schedules, attendance, fees, and family updates stay connected to the same operating rhythm without spreadsheet chaos.
          </p>
        </div>

        {/* Asymmetrical Bento Grid */}
        <div className="space-y-5 sm:space-y-6 lg:space-y-8">
          
          {/* Row 1: Batches & Schedules (7 cols) + Attendance & Academics (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8">
            
            {/* Pillar 1: Batches & schedules (7 cols) */}
            <div className="lg:col-span-7 bg-surface border border-border rounded-2xl p-5 sm:p-7 lg:p-10 flex flex-col justify-between shadow-[0_4px_24px_rgba(20,21,26,0.03)] hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(20,21,26,0.06)] transition-all duration-300">
              <div className="mb-5 sm:mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-primary">
                    <div className="w-7 h-7 rounded-lg bg-soft-brand flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
                      BATCHES &amp; SCHEDULES
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-text-secondary/60">
                    01
                  </span>
                </div>

                <h3 className="font-ui font-extrabold text-[19px] sm:text-[22px] lg:text-[24px] text-ink mb-1.5 sm:mb-2">
                  Know what is happening, when, and for whom.
                </h3>
                <p className="font-ui text-[14px] sm:text-[15px] text-text-secondary leading-[1.6]">
                  Schedules, sessions, and batch enrollment stay organized before the first student walks in.
                </p>
              </div>

              {/* Micro UI Preview: Schedule table */}
              <div className="w-full bg-canvas rounded-xl border border-border p-3.5 sm:p-5 font-ui text-[13px]">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 sm:pb-3 sm:mb-3 border-b border-border/70 text-[10px] sm:text-[11px] font-mono">
                  <span className="font-bold text-ink/80 truncate pr-2">
                    BrightPath Academy • Batches
                  </span>
                  <span className="font-semibold px-2 py-0.5 rounded bg-soft-brand text-primary shrink-0">
                    4 ON SCHEDULE
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg bg-surface border border-border/60">
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-ink block text-[12px] sm:text-[13px] truncate">JEE Advanced A1</span>
                      <span className="text-[10px] sm:text-[11px] text-text-secondary font-mono truncate block">07:00 - 09:00 AM • Prof. Rao</span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-[#19714b]/10 text-[#19714b] flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#19714b]" /> In Progress
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg bg-surface border border-border/60">
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-ink block text-[12px] sm:text-[13px] truncate">NEET UG Foundation</span>
                      <span className="text-[10px] sm:text-[11px] text-text-secondary font-mono truncate block">09:15 - 11:15 AM • Dr. Sharma</span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-mono font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-canvas border border-border/60 text-text-secondary shrink-0">
                      Up Next
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pillar 2: Attendance & academics (5 cols) */}
            <div className="lg:col-span-5 bg-surface border border-border rounded-2xl p-5 sm:p-7 lg:p-10 flex flex-col justify-between shadow-[0_4px_24px_rgba(20,21,26,0.03)] hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(20,21,26,0.06)] transition-all duration-300">
              <div className="mb-5 sm:mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-primary">
                    <div className="w-7 h-7 rounded-lg bg-soft-brand flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
                      ATTENDANCE &amp; ACADEMICS
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-text-secondary/60">
                    02
                  </span>
                </div>

                <h3 className="font-ui font-extrabold text-[19px] sm:text-[22px] lg:text-[24px] text-ink mb-1.5 sm:mb-2">
                  Sessions, homework, and marks unified.
                </h3>
                <p className="font-ui text-[14px] sm:text-[15px] text-text-secondary leading-[1.6]">
                  Attendance, homework assignments, and scorecards attach to the student&apos;s record.
                </p>
              </div>

              {/* Micro UI Preview: Roll call & stats */}
              <div className="w-full bg-canvas rounded-xl border border-border p-3.5 sm:p-5 font-ui text-[13px]">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 sm:pb-3 sm:mb-3 border-b border-border/70">
                  <span className="font-bold text-ink text-[12px] sm:text-[13px]">Physics Mechanics</span>
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#19714b]/10 text-[#19714b]">
                    94% Attendance
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-[11px] sm:text-[12px] font-mono">
                  <div className="p-2 sm:p-2.5 rounded-lg bg-surface border border-border/60">
                    <span className="text-text-secondary block text-[9px] sm:text-[10px]">HOMEWORK</span>
                    <span className="font-bold text-ink">30/32 Done</span>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-lg bg-surface border border-border/60">
                    <span className="text-text-secondary block text-[9px] sm:text-[10px]">AVG SCORE</span>
                    <span className="font-bold text-primary">82 / 100</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Row 2: Fees & Receipts (5 cols) + Family Updates (7 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8">
            
            {/* Pillar 3: Fees & receipts (5 cols) */}
            <div className="lg:col-span-5 bg-surface border border-border rounded-2xl p-5 sm:p-7 lg:p-10 flex flex-col justify-between shadow-[0_4px_24px_rgba(20,21,26,0.03)] hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(20,21,26,0.06)] transition-all duration-300">
              <div className="mb-5 sm:mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-primary">
                    <div className="w-7 h-7 rounded-lg bg-soft-brand flex items-center justify-center">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
                      FEES &amp; RECEIPTS
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-text-secondary/60">
                    03
                  </span>
                </div>

                <h3 className="font-ui font-extrabold text-[19px] sm:text-[22px] lg:text-[24px] text-ink mb-1.5 sm:mb-2">
                  Track what is due and paid.
                </h3>
                <p className="font-ui text-[14px] sm:text-[15px] text-text-secondary leading-[1.6]">
                  Record counter payments and generate receipts without chasing WhatsApp screenshots.
                </p>
              </div>

              {/* Micro UI Preview: Fee Ledger */}
              <div className="w-full bg-canvas rounded-xl border border-border p-3.5 sm:p-5 font-ui text-[13px]">
                <div className="flex justify-between items-baseline mb-2.5 sm:mb-3">
                  <span className="text-[11px] sm:text-[12px] text-text-secondary font-mono">August Collections</span>
                  <span className="font-mono font-bold text-[16px] sm:text-[18px] text-primary">₹ 4,82,000</span>
                </div>
                <div className="p-2.5 sm:p-3 rounded-lg bg-surface border border-border/60 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] sm:text-[12px]">
                    <span className="font-bold text-ink truncate pr-2">Aarav Patel</span>
                    <span className="font-mono font-bold text-[#19714b] shrink-0">₹ 25,000 Paid</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] sm:text-[11px] text-text-secondary font-mono">
                    <span>Receipt #089</span>
                    <span className="text-primary font-semibold">UPI Verified ✓</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pillar 4: Family updates (7 cols) */}
            <div className="lg:col-span-7 bg-surface border border-border rounded-2xl p-5 sm:p-7 lg:p-10 flex flex-col justify-between shadow-[0_4px_24px_rgba(20,21,26,0.03)] hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(20,21,26,0.06)] transition-all duration-300">
              <div className="mb-5 sm:mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-primary">
                    <div className="w-7 h-7 rounded-lg bg-soft-brand flex items-center justify-center">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
                      FAMILY NOTIFICATIONS
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-text-secondary/60">
                    04
                  </span>
                </div>

                <h3 className="font-ui font-extrabold text-[19px] sm:text-[22px] lg:text-[24px] text-ink mb-1.5 sm:mb-2">
                  Keep parents informed automatically.
                </h3>
                <p className="font-ui text-[14px] sm:text-[15px] text-text-secondary leading-[1.6]">
                  Batch notices, exam scores, and attendance alerts delivered directly without repetitive calls.
                </p>
              </div>

              {/* Micro UI Preview: Direct parent update dispatch */}
              <div className="w-full bg-canvas rounded-xl border border-border p-3.5 sm:p-5 font-ui text-[13px] space-y-2">
                <div className="p-2.5 sm:p-3 rounded-lg bg-surface border border-border/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[11px] sm:text-[12px] text-ink truncate pr-2">📢 Mock Test 04 Result</span>
                    <span className="text-[10px] sm:text-[11px] font-mono text-text-secondary shrink-0">Just now</span>
                  </div>
                  <p className="text-[11px] sm:text-[12px] text-text-secondary leading-snug truncate">
                    Scorecard shared with guardian of Rohan Mehta • Rank #3
                  </p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-lg bg-soft-brand/50 border border-primary/20 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-primary font-bold">
                  <span className="truncate pr-2">Parent Hub &amp; WhatsApp Notification</span>
                  <span className="text-[#19714b] shrink-0">Delivered ✓</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </Container>
    </Section>
  );
}
