import * as React from 'react';
import { Container, Section } from '../../components/layout/container';

export default function LandingPage() {
  return (
    <Section padding="lg">
      <Container size="md" className="py-20 text-center">
        <span className="inline-block rounded-full bg-[hsl(var(--secondary))] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--secondary-foreground))] mb-4">
          Phase 0.12.2 Marketing Shell
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Run your coaching institute from one place.
        </h1>
        <p className="mt-4 text-lg text-[hsl(var(--muted-foreground))]">
          CoachingOS Public Marketing Shell established cleanly under app/(marketing).
        </p>
      </Container>
    </Section>
  );
}
