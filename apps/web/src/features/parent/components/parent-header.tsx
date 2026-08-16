'use client';

import * as React from 'react';
import { Button } from '@coaching-os/ui';
import { LogOut, ShieldCheck } from 'lucide-react';
import { NotificationBell } from './notifications/notification-bell';
import type { ParentHubIdentityDTO } from '../types/parent-ui.types';

interface ParentHeaderProps {
  parent: ParentHubIdentityDTO;
  onLogout?: () => void;
  onOpenNotifications?: () => void;
}

export function ParentHeader({ parent, onLogout, onOpenNotifications }: ParentHeaderProps) {
  const displayName = parent.name || parent.phone || 'Parent User';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.95)] backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--background)/0.6)]">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand & Greeting */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-[hsl(var(--foreground))]">
                Parent Hub
              </h1>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Welcome back, <span className="font-medium text-[hsl(var(--foreground))]">{displayName}</span>
            </p>
          </div>
        </div>

        {/* Actions Toolbar */}
        <div className="flex items-center gap-1">
          <NotificationBell onClick={onOpenNotifications} />

          {onLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="min-h-[44px] min-w-[44px] gap-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
              aria-label="Log out of parent PWA"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
