'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import type { InstituteDisplay, TenantDisplay } from '../types/app-shell-types';
import type { NavigationSection as NavigationSectionType } from '../navigation/navigation-types';
import { InstituteIdentity } from './institute-identity';
import { NavigationSection } from './navigation-section';

export interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  institute: InstituteDisplay;
  tenant: TenantDisplay;
  navigationSections: readonly NavigationSectionType[];
}


/**
 * MobileSidebar — accessible slide-over navigation drawer for mobile viewports (< 768px).
 *
 * ACCESSIBILITY & INVARIANTS:
 * - Listens for Escape key to close.
 * - Restricts background interaction via fixed backdrop overlay.
 * - Automatically closes when user navigates to a new page (pathname change).
 * - Full ARIA accessibility (role="dialog", aria-modal="true", aria-label="Navigation Menu").
 */
export function MobileSidebar({
  isOpen,
  onClose,
  institute,
  tenant,
  navigationSections,
}: MobileSidebarProps) {
  const pathname = usePathname();
  const drawerRef = React.useRef<HTMLDivElement>(null);

  // Auto-close on route change
  React.useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Keyboard accessibility: Escape key to close
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
        className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] p-4 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-200"
      >
        <div>
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4 mb-4">
            <InstituteIdentity institute={institute} role={tenant.role} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation menu"
              className="rounded-lg p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-3 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navigationSections.map((section) => (
              <NavigationSection key={section.id} section={section} onItemClick={onClose} />
            ))}
          </nav>
        </div>

        <div className="border-t border-[hsl(var(--border))] pt-3 text-[11px] text-[hsl(var(--muted-foreground))]">
          CoachingOS &copy; {new Date().getFullYear()} Workspace
        </div>
      </div>
    </div>
  );
}
