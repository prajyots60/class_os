import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button, Badge } from '@coaching-os/ui';
import { Container, Section } from '../layout/container';

export function CTASection() {
  return (
    <Section padding="lg" id="get-started" className="scroll-mt-16 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
      <Container size="lg">
        <div className="relative overflow-hidden rounded-3xl border border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/5 px-6 py-12 text-center sm:px-12 sm:py-16">
          {/* Subtle Background Lighting Accent */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-64 w-96 -translate-x-1/2 rounded-full bg-[hsl(var(--primary))]/10 blur-3xl"
          />

          {/* Section Eyebrow */}
          <Badge
            variant="secondary"
            className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider"
          >
            <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
            Ready to Organize Your Institute?
          </Badge>

          {/* Headline H2 */}
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))] sm:text-4xl sm:leading-tight">
            Bring your institute&apos;s operations into one connected workspace.
          </h2>

          {/* Supporting Copy */}
          <p className="mx-auto mt-4 max-w-xl text-base text-[hsl(var(--muted-foreground))] sm:text-lg">
            Set up your CoachingOS workspace and start organizing the students, academics, attendance, tests, fees, staff, and daily operations that keep your institute running.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto gap-2 px-8 font-semibold shadow-md">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 font-semibold">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Trust Micro-copy */}
          <p className="mt-6 text-xs text-[hsl(var(--muted-foreground))]">
            Multi-tenant isolation &bull; Role-based security &bull; Zero credit card required
          </p>
        </div>
      </Container>
    </Section>
  );
}
