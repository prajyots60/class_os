'use client';

import * as React from 'react';
import type { AppShellProps } from '../types/app-shell-types';
import { APP_NAVIGATION_CONFIG } from '../navigation/navigation-config';
import { AppSidebar } from './app-sidebar';
import { MobileSidebar } from './mobile-sidebar';
import { AppHeader } from './app-header';
import { hexToHsl } from '../utils/theme-utils';

/**
 * AppShell — Root layout container for the authenticated workspace.
 *
 * ARCHITECTURAL CONTRACT:
 * - Pure presentation container receiving safe, server-resolved presentation DTOs
 *   (`user`, `tenant`, `institute`, `navigationSections`).
 * - Manages mobile drawer toggle state (< 768px viewports).
 * - Enforces responsive workspace container layout without horizontal scroll/overflow.
 */
export function AppShell({
  user,
  tenant,
  institute,
  navigationSections = APP_NAVIGATION_CONFIG,
  children,
}: AppShellProps) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const handleOpenMobile = React.useCallback(() => {
    setIsMobileOpen(true);
  }, []);

  const handleCloseMobile = React.useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const primaryHsl = hexToHsl(institute.primaryColor);
  const styleObj = primaryHsl
    ? ({ '--primary': primaryHsl } as React.CSSProperties)
    : undefined;

  return (
    <div
      style={styleObj}
      className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex flex-col"
    >
      {/* Desktop Sidebar (Fixed left 250px on md+) */}
      <AppSidebar
        institute={institute}
        tenant={tenant}
        navigationSections={navigationSections}
      />

      {/* Mobile Drawer Navigation (< 768px) */}
      <MobileSidebar
        isOpen={isMobileOpen}
        onClose={handleCloseMobile}
        institute={institute}
        tenant={tenant}
        navigationSections={navigationSections}
      />

      {/* Main Workspace Area (Shifted right by 250px on md+) */}
      <div className="flex flex-1 flex-col md:pl-64 min-h-screen">
        {/* Sticky App Header */}
        <AppHeader
          user={user}
          tenant={tenant}
          onOpenMobileMenu={handleOpenMobile}
        />

        {/* Semantic Main Content Container */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
