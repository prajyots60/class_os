import * as React from 'react';
import Link from 'next/link';
import { Container } from '../layout/container';
import { MobileNav } from './mobile-nav';

const NAV_LINKS = [
  { label: 'Product', href: '/#product' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'For families', href: '/#for-families' },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-canvas/85 backdrop-blur-md transition-all">
      <Container size="lg" className="flex h-16 items-center justify-between px-6 lg:px-12">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-canvas">
            <span className="text-[11px] font-bold font-mono tracking-tighter">C/O</span>
          </div>
          <span className="text-[18px] font-bold text-ink">
            CoachingOS
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="hidden md:flex items-center space-x-8"
          aria-label="Main navigation"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[14px] font-medium text-text-secondary transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth CTAs */}
        <div className="hidden md:flex items-center space-x-4">
          <Link 
            href="/sign-in"
            className="text-[14px] font-medium text-ink hover:text-ink/80 transition-colors"
          >
            Sign in
          </Link>
          <Link href="/sign-up">
            <button
              className="h-10 rounded text-[16px] font-semibold bg-primary text-canvas px-4 hover:bg-primary-hover transition-colors"
            >
              Request beta access
            </button>
          </Link>
        </div>

        {/* Mobile Navigation Toggle */}
        <MobileNav navLinks={NAV_LINKS} />
      </Container>
    </header>
  );
}
