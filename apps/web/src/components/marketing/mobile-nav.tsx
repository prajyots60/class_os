'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@coaching-os/ui';

export interface MobileNavProps {
  navLinks: Array<{ label: string; href: string }>;
}

export function MobileNav({ navLinks }: MobileNavProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Close menu on ESC key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        className="text-ink hover:bg-muted"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          {/* Menu */}
          <div className="fixed inset-x-0 top-18 z-50 border-b border-border bg-surface p-6 shadow-xl">
            <nav className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-base font-semibold text-ink transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="border-border" />
              <div className="flex flex-col space-y-2.5 pt-2">
                <Link href="/sign-in" onClick={() => setIsOpen(false)}>
                  <Button
                    variant="outline"
                    className="w-full border-border bg-transparent text-ink hover:bg-muted font-bold"
                  >
                    Staff Sign In
                  </Button>
                </Link>
                <Link href="/sign-up" onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-primary text-white hover:bg-primary-hover font-bold shadow-[0_3px_0_#3e32b7]">
                    Request beta access
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
