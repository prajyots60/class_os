'use client';

import * as React from 'react';
import { Menu } from 'lucide-react';
import type { UserDisplay, TenantDisplay } from '../types/app-shell-types';
import { Breadcrumbs } from './breadcrumbs';
import { UserMenu } from './user-menu';

import { GlobalSearchBar } from '../../search';

export interface AppHeaderProps {
  user: UserDisplay;
  tenant: TenantDisplay;
  onOpenMobileMenu: () => void;
}

/**
 * AppHeader — sticky top navigation bar for the workspace shell.
 *
 * Renders mobile drawer toggle on small viewports, breadcrumbs, global search bar, and user menu dropdown.
 */
export function AppHeader({ user, tenant, onOpenMobileMenu }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 shadow-xs md:px-6 gap-2">
      <div className="flex items-center space-x-3 shrink-0">
        {/* Mobile menu toggle button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb Navigation */}
        <Breadcrumbs />
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-md mx-2">
        <GlobalSearchBar />
      </div>

      {/* Right User Menu */}
      <div className="flex items-center space-x-3 shrink-0">
        <UserMenu user={user} tenant={tenant} />
      </div>
    </header>
  );
}

