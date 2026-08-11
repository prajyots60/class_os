import * as React from 'react';
import type { NavigationSection as NavigationSectionType } from '../navigation/navigation-types';
import { NavigationItem } from './navigation-item';

export interface NavigationSectionProps {
  section: NavigationSectionType;
  onItemClick?: () => void;
}

/**
 * NavigationSection — renders a section header label and its nav items list.
 */
export function NavigationSection({ section, onItemClick }: NavigationSectionProps) {
  if (section.items.length === 0) return null;

  return (
    <div className="space-y-1 py-1">
      <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
        {section.label}
      </h3>
      <div className="space-y-0.5">
        {section.items.map((item) => (
          <NavigationItem key={item.id} item={item} onItemClick={onItemClick} />
        ))}
      </div>
    </div>
  );
}
