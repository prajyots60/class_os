'use client';

import * as React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  KeyRound, 
  Shield, 
  FileText, 
  AlertCircle,
  EyeOff,
  UserX,
  Sparkles
} from 'lucide-react';
import { Container, Section } from '../layout/container';

type RoleType = 'faculty' | 'assistant' | 'parent';

export function BuiltForControlSection() {
  const [selectedRole, setSelectedRole] = React.useState<RoleType>('faculty');

  const rolePermissions: Record<RoleType, { name: string; title: string; permissions: { label: string; allowed: boolean }[] }> = {
    faculty: {
      name: 'Faculty Member',
      title: 'Prof. R. Rao (Physics)',
      permissions: [
        { label: 'Batch Schedules & Sessions', allowed: true },
        { label: 'Daily Attendance & Homework', allowed: true },
        { label: 'Assessment Scores & Reports', allowed: true },
        { label: 'Fee Collections & Revenue', allowed: false },
        { label: 'Institute Owner Settings', allowed: false },
      ],
    },
    assistant: {
      name: 'Front Desk Assistant',
      title: 'Operations Desk',
      permissions: [
        { label: 'Student Inquiries & Directory', allowed: true },
        { label: 'Mark Attendance & Absences', allowed: true },
        { label: 'Record Counter Fee Payments', allowed: true },
        { label: 'Overall Institute Profit Ledgers', allowed: false },
        { label: 'Academic Curriculum Config', allowed: false },
      ],
    },
    parent: {
      name: 'Enrolled Guardian',
      title: 'Priya Sharma (Parent)',
      permissions: [
        { label: 'Enrolled Child Academic Record', allowed: true },
        { label: 'Personal Fee Due & Receipts', allowed: true },
        { label: 'Institute Announcements', allowed: true },
        { label: 'Other Students’ Grades & Contact', allowed: false },
        { label: 'Internal Staff Discussions', allowed: false },
      ],
    },
  };

  const activeRoleData = rolePermissions[selectedRole];

  return (
    <Section
      padding="none"
      id="security"
      className="bg-canvas py-20 sm:py-24 lg:py-32 border-t border-border/60"
    >
      <Container size="lg" className="max-w-[1200px]">
        {/* Editorial Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 sm:mb-16 lg:mb-20">
          <div className="max-w-[620px]">
            <span className="block mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
              BUILT FOR CONTROL
            </span>
            <h2 className="font-display text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] lg:text-[3.5rem] leading-[1.1] text-ink">
              Built for institutes that need control.
            </h2>
          </div>
          <p className="font-ui text-[15px] sm:text-[16px] text-text-secondary max-w-[440px] leading-[1.6]">
            Your student records, fee ledgers, and staff permissions are protected by strict institutional boundaries. Total privacy with zero ambiguity.
          </p>
        </div>

        {/* Asymmetrical Bento Grid: 7/5 on top row, 5/7 on bottom row */}
        <div className="space-y-6 sm:space-y-8">
          
          {/* Row 1: Data Perimeter (7 cols) + Granular Role Permissions (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            
            {/* Bento Card 1: Data Perimeter (7 cols) */}
            <div className="lg:col-span-7 bg-surface border border-border rounded-2xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between shadow-[0_4px_24px_rgba(16,36,38,0.03)] hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(16,36,38,0.06)] transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-soft-brand/30 flex items-center justify-center text-primary">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
                      DATA ISOLATION
                    </span>
                  </div>
                  <span className="font-mono text-[12px] font-semibold text-text-secondary/60">
                    01
                  </span>
                </div>

                <h3 className="font-ui font-bold text-[20px] sm:text-[22px] lg:text-[24px] text-ink mb-2.5 leading-[1.25]">
                  Your data stays strictly inside your institute.
                </h3>
                <p className="font-ui text-[14px] sm:text-[15px] text-text-secondary leading-[1.6] mb-8">
                  Student phone numbers, fee collections, and academic histories are ring-fenced to your workspace. No external institute on CoachingOS can ever view or query your records.
                </p>
              </div>

              {/* Sleek Visual: Multi-Tenant Isolation Perimeter */}
              <div className="w-full bg-canvas rounded-xl border border-border/80 p-4 sm:p-5 font-ui">
                <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-border/60">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#237A5B] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#237A5B]" />
                    </span>
                    <span className="font-bold text-ink text-[13px] tracking-tight">
                      BrightPath Academy Workspace
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-semibold tracking-wider text-[#237A5B] bg-[#237A5B]/10 px-2.5 py-1 rounded-full uppercase">
                    100% Isolated
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                  <div className="p-3 rounded-lg bg-surface border border-border/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-text-secondary uppercase">Your Records</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#237A5B]" />
                    </div>
                    <span className="font-bold text-ink text-[14px] block">2,845 Students</span>
                    <span className="text-[11px] text-text-secondary font-mono block">Enrolled • Fee Records Active</span>
                  </div>

                  <div className="p-3 rounded-lg bg-surface border border-border/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-text-secondary uppercase">Outside Visibility</span>
                      <Lock className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="font-bold text-ink text-[14px] block">Strictly Blocked</span>
                    <span className="text-[11px] text-text-secondary font-mono block">Zero Cross-Tenant Leaks</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Interactive Role Boundaries (5 cols) */}
            <div className="lg:col-span-5 bg-surface border border-border rounded-2xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between shadow-[0_4px_24px_rgba(16,36,38,0.03)] hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(16,36,38,0.06)] transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-soft-brand/30 flex items-center justify-center text-primary">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
                      ROLE BOUNDARIES
                    </span>
                  </div>
                  <span className="font-mono text-[12px] font-semibold text-text-secondary/60">
                    02
                  </span>
                </div>

                <h3 className="font-ui font-bold text-[20px] sm:text-[22px] lg:text-[24px] text-ink mb-2.5 leading-[1.25]">
                  Staff only see what their role allows.
                </h3>
                <p className="font-ui text-[14px] sm:text-[15px] text-text-secondary leading-[1.6] mb-6">
                  Front-desk staff manage registrations without seeing overall institute revenue. Teachers grade assessments without accessing owner finances.
                </p>
              </div>

              {/* Interactive Role Inspector */}
              <div className="w-full bg-canvas rounded-xl border border-border/80 p-4 sm:p-5 font-ui">
                {/* Role Switcher Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-surface border border-border/60 rounded-lg mb-3.5">
                  {(['faculty', 'assistant', 'parent'] as RoleType[]).map((role) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`flex-1 py-1 px-2 text-[11px] font-mono font-semibold rounded transition-colors uppercase tracking-wider ${
                        selectedRole === role
                          ? 'bg-primary text-canvas shadow-sm'
                          : 'text-text-secondary hover:text-ink'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>

                {/* Permissions List */}
                <div className="space-y-2">
                  {activeRoleData.permissions.map((perm) => (
                    <div
                      key={perm.label}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border/40 text-[12px]"
                    >
                      <span className="text-ink font-medium text-[12px] truncate pr-2">
                        {perm.label}
                      </span>
                      {perm.allowed ? (
                        <span className="shrink-0 inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-[#237A5B] bg-[#237A5B]/10 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" /> ALLOWED
                        </span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-text-secondary/70 bg-ink/5 px-2 py-0.5 rounded">
                          <EyeOff className="w-3 h-3" /> HIDDEN
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Row 2: Instant Access Management (5 cols) + Activity Audit Stream (7 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            
            {/* Bento Card 3: Instant Access Management (5 cols) */}
            <div className="lg:col-span-5 bg-surface border border-border rounded-2xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between shadow-[0_4px_24px_rgba(16,36,38,0.03)] hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(16,36,38,0.06)] transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-soft-brand/30 flex items-center justify-center text-primary">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
                      ACCESS OVERSIGHT
                    </span>
                  </div>
                  <span className="font-mono text-[12px] font-semibold text-text-secondary/60">
                    03
                  </span>
                </div>

                <h3 className="font-ui font-bold text-[20px] sm:text-[22px] lg:text-[24px] text-ink mb-2.5 leading-[1.25]">
                  Instant access control in your hands.
                </h3>
                <p className="font-ui text-[14px] sm:text-[15px] text-text-secondary leading-[1.6] mb-6">
                  Add new faculty in seconds. When a team member or assistant leaves your institute, revoke their workspace access instantly with a single click.
                </p>
              </div>

              {/* Sleek Staff Security Switcher */}
              <div className="w-full bg-canvas rounded-xl border border-border/80 p-4 sm:p-5 font-ui space-y-2.5">
                <div className="p-3 rounded-lg bg-surface border border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[12px]">
                      DR
                    </div>
                    <div>
                      <span className="font-bold text-ink text-[13px] block">Dr. Sharma</span>
                      <span className="text-[11px] text-text-secondary font-mono">Physics Lead</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[#237A5B] bg-[#237A5B]/10 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#237A5B]" /> Active
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-surface border border-border/60 flex items-center justify-between opacity-75">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-ink/5 text-text-secondary flex items-center justify-center font-bold text-[12px]">
                      EX
                    </div>
                    <div>
                      <span className="font-bold text-ink text-[13px] block">Former Staff Member</span>
                      <span className="text-[11px] text-text-secondary font-mono">Access Disabled</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-text-secondary bg-ink/5 px-2.5 py-1 rounded-full">
                    <Lock className="w-3 h-3" /> Revoked
                  </span>
                </div>
              </div>
            </div>

            {/* Bento Card 4: Activity Audit Stream (7 cols) */}
            <div className="lg:col-span-7 bg-surface border border-border rounded-2xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between shadow-[0_4px_24px_rgba(16,36,38,0.03)] hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(16,36,38,0.06)] transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-soft-brand/30 flex items-center justify-center text-primary">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
                      ACTIVITY HISTORY
                    </span>
                  </div>
                  <span className="font-mono text-[12px] font-semibold text-text-secondary/60">
                    04
                  </span>
                </div>

                <h3 className="font-ui font-bold text-[20px] sm:text-[22px] lg:text-[24px] text-ink mb-2.5 leading-[1.25]">
                  Every operational move is accountable.
                </h3>
                <p className="font-ui text-[14px] sm:text-[15px] text-text-secondary leading-[1.6] mb-8">
                  Fee payments recorded, timetable adjustments, and attendance entries are logged with staff identity and precise timestamps for complete transparency.
                </p>
              </div>

              {/* Sleek Activity Log Timeline */}
              <div className="w-full bg-canvas rounded-xl border border-border/80 p-4 sm:p-5 font-ui space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    INSTITUTE ACTIVITY STREAM
                  </span>
                  <span className="font-mono text-[11px] text-[#237A5B] font-semibold">
                    REAL-TIME LOG
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-surface border border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#237A5B]" />
                      <div>
                        <span className="font-bold text-ink text-[13px] block">
                          Fee Receipt Issued (₹25,000)
                        </span>
                        <span className="text-[11px] text-text-secondary font-mono">
                          Aarav Patel • Handled by Front Desk
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-text-secondary/80 bg-canvas px-2 py-1 rounded border border-border/40">
                      Today, 02:15 PM
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-surface border border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div>
                        <span className="font-bold text-ink text-[13px] block">
                          Attendance Submitted (28/30)
                        </span>
                        <span className="text-[11px] text-text-secondary font-mono">
                          JEE Advanced A1 • Marked by Prof. R. Rao
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-text-secondary/80 bg-canvas px-2 py-1 rounded border border-border/40">
                      Today, 09:05 AM
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Bottom Trust Invariant Strip */}
        <div className="mt-10 sm:mt-12 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] font-mono text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#237A5B]" />
            <span className="text-ink font-medium">Enterprise privacy &amp; access control guaranteed</span>
          </div>
          <span className="text-text-secondary/80">
            Dedicated Workspaces • Role Scoping • Transparent Activity Stream
          </span>
        </div>
      </Container>
    </Section>
  );
}
