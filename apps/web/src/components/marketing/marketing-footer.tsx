import * as React from 'react';
import Link from 'next/link';
import { Container } from '../layout/container';

export function MarketingFooter() {
  return (
    <footer className="bg-[#121218] pt-14 pb-10 sm:pt-18 sm:pb-12 text-[#d8d8df] font-ui text-[14px] border-t border-[#2d2d35] w-full overflow-hidden">
      <Container size="lg" className="max-w-[1200px]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-10 lg:gap-16 pb-12 sm:pb-16">
          
          {/* Brand Column (5 cols) */}
          <div className="md:col-span-5 flex flex-col items-start pr-0 md:pr-4">
            <Link href="/" className="flex items-center gap-2.5 mb-3.5 sm:mb-4 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white text-[11px] font-bold font-mono">
                C/O
              </div>
              <span className="text-[19px] sm:text-[20px] font-extrabold tracking-tight text-white">
                Coaching<span className="text-[#a7a0ff]">OS</span>
              </span>
            </Link>

            <p className="text-[13px] sm:text-[14px] text-[#9d9da9] leading-[1.6] max-w-[320px] mb-5 sm:mb-6">
              Practical operating software for founder-led coaching institutes.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b1b22] border border-[#2e2e38] text-[10px] sm:text-[11px] font-mono text-[#b7b7c1]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#19714b] animate-pulse" />
              <span>Beta intake is open</span>
            </div>
          </div>

          {/* Links Grid (7 cols) - 2 cols on mobile, 3 cols on sm+ */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            {/* Column 1: Product */}
            <div>
              <h3 className="font-ui font-bold text-[12px] sm:text-[13px] text-white uppercase tracking-wider mb-3 sm:mb-4">
                Product
              </h3>
              <ul className="space-y-2.5 sm:space-y-3 text-[13px]">
                <li>
                  <Link href="/#how-it-works" className="text-[#a7a7b2] hover:text-[#b1aaff] transition-colors">
                    How it works
                  </Link>
                </li>
                <li>
                  <Link href="/#workflows" className="text-[#a7a7b2] hover:text-[#b1aaff] transition-colors">
                    Workspaces
                  </Link>
                </li>
                <li>
                  <Link href="/#for-families" className="text-[#a7a7b2] hover:text-[#b1aaff] transition-colors">
                    Parent portal
                  </Link>
                </li>
                <li>
                  <Link href="/#pillars" className="text-[#a7a7b2] hover:text-[#b1aaff] transition-colors">
                    Capabilities
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: Company */}
            <div>
              <h3 className="font-ui font-bold text-[12px] sm:text-[13px] text-white uppercase tracking-wider mb-3 sm:mb-4">
                Company
              </h3>
              <ul className="space-y-2.5 sm:space-y-3 text-[13px]">
                <li>
                  <Link href="/sign-up" className="text-[#a7a7b2] hover:text-[#b1aaff] transition-colors">
                    Beta access
                  </Link>
                </li>
                <li>
                  <Link href="/#faq" className="text-[#a7a7b2] hover:text-[#b1aaff] transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/sign-in" className="text-[#a7a7b2] hover:text-[#b1aaff] transition-colors">
                    Staff Login
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Principles */}
            <div className="col-span-2 sm:col-span-1">
              <h3 className="font-ui font-bold text-[12px] sm:text-[13px] text-white uppercase tracking-wider mb-3 sm:mb-4">
                Principles
              </h3>
              <ul className="space-y-2.5 sm:space-y-3 text-[13px]">
                <li>
                  <Link href="/privacy" className="text-[#a7a7b2] hover:text-[#b1aaff] transition-colors">
                    Privacy &amp; security
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-[#a7a7b2] hover:text-[#b1aaff] transition-colors">
                    Workflow first
                  </Link>
                </li>
                <li>
                  <a href="#hero" className="text-[#a7a7b2] hover:text-[#b1aaff] transition-colors">
                    Back to top ↑
                  </a>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Bottom Strip */}
        <div className="border-t border-[#23232b] pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#777782] text-center sm:text-left">
          <div>
            &copy; {new Date().getFullYear()} CoachingOS. All rights reserved.
          </div>
          <div>
            Designed around the work between classes.
          </div>
        </div>
      </Container>
    </footer>
  );
}
