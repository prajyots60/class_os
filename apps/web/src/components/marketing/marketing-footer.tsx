import * as React from 'react';
import Link from 'next/link';
import { Badge } from '@coaching-os/ui';
import { CoachingOSLogo } from '../brand/logo';
import { Container, Section } from '../layout/container';

export function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <Section padding="lg">
        <Container size="lg">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
            {/* Brand Column */}
            <div className="space-y-4 md:col-span-2">
              <CoachingOSLogo size="md" showText={true} />
              <p className="max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
                The operating system for founder-led coaching institutes. Streamline academics, students, attendance, staff, and fee billing in one unified platform.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <Badge variant="success" className="gap-1.5 py-1">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  System Operational
                </Badge>
              </div>
            </div>

            {/* Product Column */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--foreground))]">
                Product
              </h4>
              <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                <li>
                  <Link href="/#features" className="transition-colors hover:text-[hsl(var(--foreground))]">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/#workflow" className="transition-colors hover:text-[hsl(var(--foreground))]">
                    Workflow
                  </Link>
                </li>
                <li>
                  <Link href="/#roles" className="transition-colors hover:text-[hsl(var(--foreground))]">
                    Roles & Value
                  </Link>
                </li>
                <li>
                  <Link href="/#security" className="transition-colors hover:text-[hsl(var(--foreground))]">
                    Security & Trust
                  </Link>
                </li>
              </ul>
            </div>

            {/* Account Column */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--foreground))]">
                Account
              </h4>
              <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                <li>
                  <Link href="/sign-in" className="transition-colors hover:text-[hsl(var(--foreground))]">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/sign-up" className="transition-colors hover:text-[hsl(var(--foreground))]">
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between border-t border-[hsl(var(--border))] pt-8 text-xs text-[hsl(var(--muted-foreground))] sm:flex-row">
            <p>© {currentYear} CoachingOS. All rights reserved.</p>
            <p className="mt-2 sm:mt-0">Built for coaching institutes.</p>
          </div>
        </Container>
      </Section>
    </footer>
  );
}
