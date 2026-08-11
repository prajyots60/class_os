import * as React from 'react';
import type { InstituteDisplay, TenantDisplay } from '../types/app-shell-types';
import type { NavigationSection as NavigationSectionType } from '../navigation/navigation-types';
import { InstituteIdentity } from './institute-identity';
import { NavigationSection } from './navigation-section';

export interface AppSidebarProps {
  institute: InstituteDisplay;
  tenant: TenantDisplay;
  navigationSections: readonly NavigationSectionType[];
  className?: string;
}


/**
 * AppSidebar — fixed desktop sidebar layout (250px width).
 *
 * Safe presentation component rendered server-side or inside AppShell.
 */
export function AppSidebar({
  institute,
  tenant,
  navigationSections,
  className = '',
}: AppSidebarProps) {
  return (
    <aside
      className={`hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] z-30 ${className}`}
    >
      {/* Top Header Branding */}
      <div className="flex h-16 items-center px-4 border-b border-[hsl(var(--border))]">
        <InstituteIdentity institute={institute} role={tenant.role} />
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {navigationSections.map((section) => (
          <NavigationSection key={section.id} section={section} />
        ))}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-[hsl(var(--border))] text-[11px] text-[hsl(var(--muted-foreground))]">
        <p className="font-semibold text-[hsl(var(--foreground))]">CoachingOS</p>
        <p>Institute Operating System</p>
      </div>
    </aside>
  );
}
