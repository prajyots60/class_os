import * as React from 'react';
import Link from 'next/link';
import { Container } from '../layout/container';

export function MarketingFooter() {
  return (
    <footer className="bg-ink pt-16 pb-12 text-surface/60 font-ui text-[14px] border-t border-surface/10">
      <Container size="lg" className="max-w-[1200px]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12 mb-16">
          
          {/* Brand Column (4 cols) */}
          <div className="md:col-span-4 lg:col-span-5 flex flex-col items-start pr-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono font-bold text-[11px] bg-surface/15 text-surface px-1.5 py-0.5 rounded tracking-tight">
                c/0
              </span>
              <span className="font-bold text-[18px] text-surface tracking-tight">
                CoachingOS
              </span>
            </div>
            <p className="text-[14px] text-surface/60 leading-[1.6] max-w-[320px] mb-4">
              The operating system for founder-led coaching institutes.
            </p>
            <span className="font-mono text-[11px] text-surface/40 uppercase tracking-wider">
              Calm • Disciplined • Connected
            </span>
          </div>

          {/* Product Links (2-3 cols) */}
          <div className="md:col-span-2 lg:col-span-2">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-surface/40 mb-4">
              Product
            </h3>
            <ul className="space-y-3 text-[14px]">
              <li>
                <Link href="/#how-it-works" className="text-surface/75 hover:text-surface transition-colors">
                  Operating Rhythm
                </Link>
              </li>
              <li>
                <Link href="/#workflows" className="text-surface/75 hover:text-surface transition-colors">
                  One System
                </Link>
              </li>
              <li>
                <Link href="/#pillars" className="text-surface/75 hover:text-surface transition-colors">
                  Capabilities
                </Link>
              </li>
              <li>
                <Link href="/#for-families" className="text-surface/75 hover:text-surface transition-colors">
                  Family Experience
                </Link>
              </li>
            </ul>
          </div>

          {/* Account Links (2-3 cols) */}
          <div className="md:col-span-3 lg:col-span-2">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-surface/40 mb-4">
              Access
            </h3>
            <ul className="space-y-3 text-[14px]">
              <li>
                <Link href="/sign-in" className="text-surface/75 hover:text-surface transition-colors">
                  Staff &amp; Parent Sign In
                </Link>
              </li>
              <li>
                <Link href="/sign-up" className="text-surface/75 hover:text-surface transition-colors">
                  Request Beta Onboarding
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="text-surface/75 hover:text-surface transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links (2-3 cols) */}
          <div className="md:col-span-3 lg:col-span-3">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-surface/40 mb-4">
              Trust &amp; Privacy
            </h3>
            <ul className="space-y-3 text-[14px]">
              <li>
                <Link href="/privacy" className="text-surface/75 hover:text-surface transition-colors">
                  Institutional Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-surface/75 hover:text-surface transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <span className="text-[12px] font-mono text-surface/40 block pt-1">
                  Tenant Isolation Verified
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-surface/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] font-mono text-surface/40">
          <div>
            &copy; {new Date().getFullYear()} CoachingOS. All rights reserved.
          </div>
          <div className="flex items-center gap-2 text-surface/50">
            <span className="w-1.5 h-1.5 rounded-full bg-[#237A5B]" />
            <span>Private Beta Release</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
