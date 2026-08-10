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
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {isOpen && (
        <div className="absolute left-0 top-full w-full border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] p-6 shadow-lg animate-in fade-in-0 slide-in-from-top-2">
          <nav className="flex flex-col space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-base font-medium text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-[hsl(var(--border))]" />
            <div className="flex flex-col space-y-2 pt-2">
              <Link href="/sign-in" onClick={() => setIsOpen(false)}>
                <Button variant="outline" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up" onClick={() => setIsOpen(false)}>
                <Button variant="default" className="w-full">
                  Get Started
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
