'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  CalendarCheck,
  FileText,
  CreditCard,
  Megaphone,
  HelpCircle,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@coaching-os/ui';
import type { NavigationItem as NavigationItemType } from '../navigation/navigation-types';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  CalendarCheck,
  FileText,
  CreditCard,
  Megaphone,
  Settings,
};

export interface NavigationItemProps {
  item: NavigationItemType;
  onItemClick?: () => void;
}

/**
 * NavigationItem — individual navigation item rendering active state and accessible attributes.
 */
export function NavigationItem({ item, onItemClick }: NavigationItemProps) {
  const pathname = usePathname();
  const IconComponent = ICON_MAP[item.iconName] || HelpCircle;

  const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

  if (!item.isImplemented) {
    return (
      <div
        className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-[hsl(var(--muted-foreground))] opacity-75 cursor-not-allowed select-none bg-transparent"
        title={`${item.label} module coming soon`}
        aria-disabled="true"
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <IconComponent className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
          <span className="truncate">{item.label}</span>
        </div>
        {item.badgeText && (
          <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal border-[hsl(var(--border))]">
            {item.badgeText}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onItemClick}
      aria-current={isActive ? 'page' : undefined}
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
        isActive
          ? 'bg-[hsl(var(--primary))] text-white font-semibold shadow-sm'
          : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)] hover:text-[hsl(var(--foreground))]'
      }`}
    >
      <div className="flex items-center space-x-2.5 min-w-0">
        <IconComponent className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : ''}`} aria-hidden="true" />
        <span className="truncate">{item.label}</span>
      </div>
    </Link>
  );
}
