'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, Layers, BookOpen, UserCog, HeartHandshake } from 'lucide-react';
import { Container, Section } from '../layout/container';

type RoleKey = 'owner' | 'teacher' | 'assistant' | 'parent';

interface RoleContent {
  label: string;
  badge: string;
  title: string;
  description: string;
  points: string[];
  linkText: string;
  floatingBadge: string;
  previewImage: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ROLES_DATA: Record<RoleKey, RoleContent> = {
  owner: {
    label: 'Owner',
    badge: 'FOR THE OWNER',
    title: 'See the institute, not a pile of updates.',
    description: 'Attendance completion, collections, scheduled batches, and operational issues surface in one place — before they turn into late-night calls.',
    points: [
      'Today’s attendance at a glance',
      'Pending fee visibility & collections',
      'Your institute, under full control',
    ],
    linkText: 'View owner workspace',
    floatingBadge: '12 / 14 sessions complete',
    previewImage: '/Hero_Desktop.png',
    icon: Layers,
  },
  teacher: {
    label: 'Teacher',
    badge: 'FOR THE FACULTY',
    title: 'Run the session without administrative drag.',
    description: 'Faculty open their batch, take roll call in 30 seconds, attach homework assignments, and log test scores directly on mobile or laptop.',
    points: [
      '30-second one-tap session roll call',
      'Attach homework and chapter notes',
      'Log assessment marks without spreadsheets',
    ],
    linkText: 'View faculty workflow',
    floatingBadge: 'Physics JEE A1 marked',
    previewImage: '/Customization_Branding.png',
    icon: BookOpen,
  },
  assistant: {
    label: 'Assistant',
    badge: 'FOR FRONT DESK & OPS',
    title: 'Keep registrations and fees moving calmly.',
    description: 'Front-desk staff manage new inquiries, record counter fee payments, print receipts, and issue parent reminders without seeing sensitive owner financials.',
    points: [
      'Record counter cash/UPI fee payments',
      'Student inquiries & enrollment directory',
      'Automated parent reminder delivery',
    ],
    linkText: 'View assistant workspace',
    floatingBadge: '₹25,000 fee receipt issued',
    previewImage: '/Customization_Branding.png',
    icon: UserCog,
  },
  parent: {
    label: 'Parent',
    badge: 'FOR FAMILIES',
    title: 'Stay informed without repetitive calling.',
    description: 'Parents have a clean, dedicated mobile experience to track their children’s attendance, homework, test scorecards, and fee dues in real-time.',
    points: [
      'Real-time session attendance alerts',
      'Test scorecards & academic progress',
      'Clear fee breakdown and receipts',
    ],
    linkText: 'View parent experience',
    floatingBadge: 'Delivered to parent phone',
    previewImage: '/family-identity.png',
    icon: HeartHandshake,
  },
};

export function WorkflowsSection() {
  const [selectedRole, setSelectedRole] = React.useState<RoleKey>('owner');
  const activeData = ROLES_DATA[selectedRole];
  const Icon = activeData.icon;

  return (
    <Section padding="none" id="workflows" className="bg-canvas py-16 sm:py-20 lg:py-28 border-t border-border/80 w-full overflow-hidden">
      <Container size="lg" className="max-w-[1200px]">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8 sm:mb-12">
          <div className="max-w-[620px]">
            <span className="mb-2.5 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-primary block">
              BUILT FOR THE WHOLE INSTITUTE
            </span>
            <h2 className="font-ui font-extrabold text-[clamp(2.15rem,4.5vw,3.75rem)] leading-[1.05] tracking-tight text-ink">
              One platform. <span className="text-primary block sm:inline lg:block">Four clear points of view.</span>
            </h2>
          </div>
          <p className="font-ui text-[15px] sm:text-[17px] text-text-secondary leading-[1.6] max-w-[440px]">
            Every role sees the next useful thing — without being overloaded by what belongs to someone else.
          </p>
        </div>

        {/* Minimal Responsive Segmented Tab Bar */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-1.5 p-1 bg-[#efefeb] border border-border rounded-xl w-full max-w-xl mb-6 sm:mb-8">
          {(['owner', 'teacher', 'assistant', 'parent'] as RoleKey[]).map((key) => {
            const role = ROLES_DATA[key];
            const isSelected = selectedRole === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedRole(key)}
                className={`w-full sm:flex-1 py-2 px-3 rounded-lg text-[13px] font-bold transition-all duration-150 text-center ${
                  isSelected
                    ? 'bg-surface text-primary shadow-sm'
                    : 'text-text-secondary hover:text-ink'
                }`}
              >
                {role.label}
              </button>
            );
          })}
        </div>

        {/* Sleek Minimal Workspace Showcase */}
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-8 lg:p-12 shadow-[0_4px_24px_rgba(20,21,26,0.03)] w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-14 items-center">
            
            {/* Left Column: Role Details */}
            <div className="lg:col-span-5 flex flex-col items-start">
              <div className="w-9 h-9 rounded-lg bg-soft-brand flex items-center justify-center text-primary mb-4 sm:mb-5">
                <Icon className="w-4 h-4" />
              </div>
              
              <span className="font-mono text-[10px] sm:text-[11px] font-bold text-primary uppercase tracking-widest block mb-1.5 sm:mb-2">
                {activeData.badge}
              </span>
              
              <h3 className="font-ui font-extrabold text-[22px] sm:text-[26px] lg:text-[28px] text-ink leading-[1.18] mb-3">
                {activeData.title}
              </h3>
              
              <p className="font-ui text-[14px] sm:text-[15px] text-text-secondary leading-[1.6] mb-5 sm:mb-6">
                {activeData.description}
              </p>

              {/* Minimal Checkmark Points */}
              <ul className="space-y-2.5 mb-6 sm:mb-7 w-full">
                {activeData.points.map((point) => (
                  <li key={point} className="flex items-center gap-2.5 text-[13px] font-semibold text-ink">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-soft-brand text-primary">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-up"
                className="group inline-flex items-center gap-1.5 text-[14px] font-bold text-primary hover:text-primary-hover transition-colors"
              >
                <span>{activeData.linkText}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Right Column: Sleek Product Frame */}
            <div className="lg:col-span-7 relative w-full mt-2 lg:mt-0">
              <div className="relative rounded-xl border border-border overflow-hidden bg-canvas shadow-sm w-full">
                {/* Minimal Browser Top Bar */}
                <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-surface border-b border-border/80 text-[10px] font-mono text-text-secondary">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#19714b]" />
                    <span className="font-bold text-ink uppercase tracking-wider">{activeData.label} WORKSPACE</span>
                  </div>
                  <span>CoachingOS</span>
                </div>

                <div className="p-2.5 sm:p-4">
                  <Image 
                    src={activeData.previewImage}
                    alt={activeData.title}
                    width={1200}
                    height={800}
                    className="w-full h-auto object-cover rounded-lg border border-border/80"
                  />
                </div>
              </div>

              {/* Floating Status Pill */}
              <div className="hidden sm:flex absolute -bottom-3 right-4 z-20 items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-lg shadow-lg text-[11px] font-ui">
                <span className="w-1.5 h-1.5 rounded-full bg-[#19714b] animate-pulse" />
                <span className="font-bold text-ink">{activeData.floatingBadge}</span>
              </div>
            </div>

          </div>
        </div>
      </Container>
    </Section>
  );
}
