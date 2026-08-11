'use client';

import * as React from 'react';
import { User as UserIcon, ChevronDown } from 'lucide-react';
import { Badge } from '@coaching-os/ui';
import type { UserDisplay, TenantDisplay } from '../types/app-shell-types';
import { SignOutButton } from './sign-out-button';

export interface UserMenuProps {
  user: UserDisplay;
  tenant: TenantDisplay;
}

/**
 * UserMenu — Client Component rendering user identity dropdown / menu.
 * Displays user presentation info (name, email, role) and functional Sign Out action.
 */
export function UserMenu({ user, tenant }: UserMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu on click outside or Escape key
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const initials = user.name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'US';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`User menu for ${user.name}`}
        className="flex items-center space-x-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-[hsl(var(--muted)/0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-xs font-bold text-[hsl(var(--foreground))] border border-[hsl(var(--border))]">
          {initials}
        </div>
        <div className="hidden min-w-0 text-left sm:block">
          <p className="truncate text-xs font-semibold text-[hsl(var(--foreground))]">{user.name}</p>
          <p className="truncate text-[10px] text-[hsl(var(--muted-foreground))] capitalize">{tenant.role}</p>
        </div>
        <ChevronDown className="hidden h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] sm:block" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-label="User actions"
          className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-lg ring-1 ring-black/5 focus:outline-none z-50 animate-in fade-in-50 zoom-in-95"
        >
          <div className="border-b border-[hsl(var(--border))] pb-2.5 mb-2">
            <p className="truncate text-xs font-bold text-[hsl(var(--foreground))]">{user.name}</p>
            <p className="truncate text-[11px] text-[hsl(var(--muted-foreground))]">{user.email}</p>
            <div className="mt-1.5">
              <Badge variant="outline" className="text-[10px] capitalize">
                Role: {tenant.role}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <div
              className="flex items-center space-x-2 rounded-md px-2 py-1.5 text-xs text-[hsl(var(--muted-foreground))] opacity-50 cursor-not-allowed"
              title="Profile settings coming soon"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>Profile (Coming Soon)</span>
            </div>
          </div>

          <div className="border-t border-[hsl(var(--border))] pt-2 mt-2">
            <SignOutButton variant="ghost" className="w-full justify-start text-xs font-normal" />
          </div>
        </div>
      )}
    </div>
  );
}
