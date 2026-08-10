import * as React from 'react';
import {
  Users,
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
  CreditCard,
  UserCheck,
  Bell,
} from 'lucide-react';
import { Card, Badge } from '@coaching-os/ui';
import { Container, Section } from '../layout/container';

const CAPABILITIES = [
  {
    title: 'Student Management',
    description:
      'Student profiles, enrollment records, batch associations, and guardian contact details in one directory.',
    icon: Users,
    tag: 'Core Domain',
  },
  {
    title: 'Academic Operations',
    description:
      'Class schedules, subject structures, session planning, and syllabus coverage tracking across batches.',
    icon: BookOpen,
    tag: 'Academics',
  },
  {
    title: 'Attendance Tracking',
    description:
      'Daily class session attendance logging, student arrival records, and absent report tracking.',
    icon: CheckCircle2,
    tag: 'Daily Ops',
  },
  {
    title: 'Homework & Tasks',
    description:
      'Homework assignment distribution, submission deadline tracking, and student task submission logs.',
    icon: FileText,
    tag: 'Academics',
  },
  {
    title: 'Tests & Marks',
    description:
      'Test creation, batch mark entry, score analytics, and student performance progress tracking.',
    icon: GraduationCap,
    tag: 'Evaluations',
  },
  {
    title: 'Fees & Billing',
    description:
      'Fee structure configuration, invoice generation, payment tracking, and digital receipt issuing.',
    icon: CreditCard,
    tag: 'Finance',
  },
  {
    title: 'Staff & Role Control',
    description:
      'Staff management, teacher class assignments, and fine-grained capability-based role permissions.',
    icon: UserCheck,
    tag: 'Administration',
  },
  {
    title: 'Institute Announcements',
    description:
      'Broadcast announcements, urgent schedule alerts, and event notifications to students and parents.',
    icon: Bell,
    tag: 'Communication',
  },
];

export function CapabilitiesSection() {
  return (
    <Section padding="lg" id="features" className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]">
      <Container size="lg">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider"
          >
            Core Platform Capabilities
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))] sm:text-4xl">
            Everything needed to manage your coaching class.
          </h2>
          <p className="mt-4 text-base text-[hsl(var(--muted-foreground))] sm:text-lg">
            Domain-driven tools designed specifically for the operational workflows of coaching institutes.
          </p>
        </div>

        {/* Capabilities Grid */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;

            return (
              <Card
                key={cap.title}
                className="group relative flex flex-col justify-between p-6 transition-all hover:border-[hsl(var(--primary))]/50 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] transition-colors group-hover:bg-[hsl(var(--primary))] group-hover:text-[hsl(var(--primary-foreground))]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {cap.tag}
                    </Badge>
                  </div>

                  <h3 className="mt-5 text-base font-bold text-[hsl(var(--foreground))]">
                    {cap.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                    {cap.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
