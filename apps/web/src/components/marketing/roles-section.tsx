import * as React from 'react';
import { Building, GraduationCap, UserCheck, Users, CheckCircle2 } from 'lucide-react';
import { Card, Badge } from '@coaching-os/ui';
import { Container, Section } from '../layout/container';

const ROLES = [
  {
    role: 'Institute Owner',
    tag: 'Founders & Admin',
    headline: 'Complete operational visibility and control.',
    description:
      'Manage staff permissions, oversee academic schedules, track attendance trends, monitor fee billing, and keep your institute secure.',
    valuePoints: [
      'Operational oversight',
      'Staff & role management',
      'Fee billing visibility',
      'Multi-tenant data isolation',
    ],
    icon: Building,
  },
  {
    role: 'Teacher',
    tag: 'Educators',
    headline: 'Focus on teaching instead of paperwork.',
    description:
      'View assigned class schedules, record daily batch attendance, assign homework tasks, and enter test marks effortlessly.',
    valuePoints: [
      'Class schedule access',
      'Batch attendance logging',
      'Homework distribution',
      'Test & marks entry',
    ],
    icon: GraduationCap,
  },
  {
    role: 'Assistant',
    tag: 'Operations Staff',
    headline: 'Streamlined administrative workflow assistance.',
    description:
      'Manage student enrollment records, log daily attendance, issue fee receipts, and execute tasks with capability-scoped access.',
    valuePoints: [
      'Student enrollment records',
      'Fee receipt generation',
      'Attendance management',
      'Capability-scoped permissions',
    ],
    icon: UserCheck,
  },
  {
    role: 'Parent & Student',
    tag: 'Stakeholders',
    headline: 'Transparent academic progress & updates.',
    description:
      'Stay connected with class schedules, track student attendance records, review test performance scores, and receive official alerts.',
    valuePoints: [
      'Academic score visibility',
      'Attendance logs',
      'Class schedule updates',
      'Official announcements',
    ],
    icon: Users,
  },
];

export function RolesSection() {
  return (
    <Section padding="lg" id="roles" className="scroll-mt-16 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
      <Container size="lg">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider"
          >
            Role-Based Value
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))] sm:text-4xl">
            Built for every stakeholder in your institute.
          </h2>
          <p className="mt-4 text-base text-[hsl(var(--muted-foreground))] sm:text-lg">
            Tailored experiences and capability-based permissions for institute owners, teachers, staff, and parents.
          </p>
        </div>

        {/* Roles Grid */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((item) => {
            const Icon = item.icon;

            return (
              <Card
                key={item.role}
                className="flex flex-col justify-between p-6 transition-all hover:border-[hsl(var(--primary))]/50 hover:shadow-md"
              >
                <div>
                  {/* Card Top */}
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {item.tag}
                    </Badge>
                  </div>

                  {/* Role Title & Headline */}
                  <h3 className="mt-5 text-xl font-bold text-[hsl(var(--foreground))]">
                    {item.role}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[hsl(var(--primary))]">
                    {item.headline}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                    {item.description}
                  </p>
                </div>

                {/* Value Points */}
                <ul className="mt-6 space-y-2 border-t border-[hsl(var(--border))] pt-4">
                  {item.valuePoints.map((point) => (
                    <li key={point} className="flex items-center gap-2 text-xs text-[hsl(var(--foreground))]">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
