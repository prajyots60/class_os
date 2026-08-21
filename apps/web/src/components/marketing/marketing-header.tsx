import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Container } from '../layout/container';
import { MobileNav } from './mobile-nav';

const NAV_LINKS = [
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Workspaces', href: '/#workflows' },
  { label: 'For parents', href: '/#for-families' },
  { label: 'Capabilities', href: '/#pillars' },
  { label: 'FAQ', href: '/#faq' },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-canvas/90 backdrop-blur-md transition-all">
      <Container size="lg" className="flex h-18 items-center justify-between px-4 sm:px-6 lg:px-12">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md group"
        >
          <Image
            src="/logo.png"
            alt="CoachingOS Logo"
            width={32}
            height={32}
            className="h-8 w-8 object-contain transition-transform duration-200 group-hover:scale-105"
            priority
          />
          <span className="text-[20px] font-extrabold font-ui tracking-tight text-ink">
            Coaching<span className="text-primary">OS</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="hidden md:flex items-center space-x-7"
          aria-label="Main navigation"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[14px] font-semibold text-text-secondary transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth CTAs */}
        <div className="hidden md:flex items-center space-x-5">
          <Link 
            href="/#how-it-works"
            className="group inline-flex items-center gap-1.5 text-[14px] font-bold text-ink hover:text-primary transition-colors"
          >
            <span>Explore the product</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </Link>

          <Link href="/sign-up">
            <button
              className="h-10 rounded-lg text-[14px] font-bold bg-primary text-white px-5 shadow-[0_3px_0_#3e32b7] hover:bg-primary-hover hover:shadow-[0_4px_12px_rgba(83,70,217,0.3)] active:translate-y-0.5 active:shadow-none transition-all"
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
