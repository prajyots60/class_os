import * as React from 'react';
import Link from 'next/link';
import { Button } from '@coaching-os/ui';
import { CoachingOSLogo } from '../brand/logo';
import { Container } from '../layout/container';
import { MobileNav } from './mobile-nav';

const NAV_LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'Workflow', href: '/#workflow' },
  { label: 'Roles', href: '/#roles' },
  { label: 'Security', href: '/#security' },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/95 backdrop-blur-md transition-all">
      <Container size="lg" className="flex h-16 items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] rounded-md">
          <CoachingOSLogo size="md" showText={true} />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth CTAs */}
        <div className="hidden md:flex items-center space-x-3">
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button variant="default" size="sm">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Mobile Navigation Toggle */}
        <MobileNav navLinks={NAV_LINKS} />
      </Container>
    </header>
  );
}
