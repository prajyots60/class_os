import * as React from 'react';
import { Building2, Users, CalendarCheck, Activity, ArrowRight } from 'lucide-react';
import { Card, Badge } from '@coaching-os/ui';
import { Container, Section } from '../layout/container';

const WORKFLOW_STEPS = [
  {
    stepNumber: '01',
    title: 'Set Up Your Institute',
    description:
      'Bootstrap your institute tenant workspace, configure academic sessions, courses, and branch details in minutes.',
    icon: Building2,
  },
  {
    stepNumber: '02',
    title: 'Add Team & Students',
    description:
      'Assign staff roles to teachers and assistants, structure academic batches, and enroll student profiles.',
    icon: Users,
  },
  {
    stepNumber: '03',
    title: 'Run Daily Operations',
    description:
      'Track session attendance, assign homework, schedule tests, record student marks, and manage fee billing.',
    icon: CalendarCheck,
  },
  {
    stepNumber: '04',
    title: 'Stay in Total Control',
    description:
      'Monitor institute health, review operational activity logs, and manage tenant data safely in one connected platform.',
    icon: Activity,
  },
];

export function WorkflowSection() {
  return (
    <Section padding="lg" id="workflow" className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
      <Container size="lg">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider"
          >
            Operational Workflow
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))] sm:text-4xl">
            How CoachingOS works for your institute.
          </h2>
          <p className="mt-4 text-base text-[hsl(var(--muted-foreground))] sm:text-lg">
            A structured 4-step progression to bring complete operational clarity to your daily coaching operations.
          </p>
        </div>

        {/* Workflow Steps Grid */}
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === WORKFLOW_STEPS.length - 1;

            return (
              <div key={step.stepNumber} className="relative flex flex-col">
                <Card className="relative flex flex-1 flex-col justify-between p-6 transition-all hover:border-[hsl(var(--primary))]/50 hover:shadow-md">
                  <div>
                    {/* Top Step Header */}
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-xs font-mono font-bold tracking-widest text-[hsl(var(--muted-foreground))]">
                        STEP {step.stepNumber}
                      </span>
                    </div>

                    {/* Step Content */}
                    <h3 className="mt-5 text-lg font-bold text-[hsl(var(--foreground))]">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                      {step.description}
                    </p>
                  </div>

                  {/* Desktop Step Flow Indicator */}
                  {!isLast && (
                    <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-[hsl(var(--muted-foreground))]/40">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
