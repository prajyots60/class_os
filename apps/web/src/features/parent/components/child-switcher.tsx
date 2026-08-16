'use client';

import * as React from 'react';
import { User, Users } from 'lucide-react';
import type { ParentHubProfileSummaryDTO } from '../types/parent-ui.types';

interface ChildSwitcherProps {
  profiles: ParentHubProfileSummaryDTO[];
  selectedProfileId: string | null;
  onSelectProfile: (profileId: string) => void;
}

export function ChildSwitcher({
  profiles,
  selectedProfileId,
  onSelectProfile,
}: ChildSwitcherProps) {
  if (profiles.length <= 1) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between pb-2">
        <label
          id="child-select-label"
          className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]"
        >
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          Select Child Profile
        </label>
      </div>

      <div
        role="tablist"
        aria-labelledby="child-select-label"
        className="flex space-x-2 overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-1 scrollbar-none"
      >
        {profiles.map((profile) => {
          const isSelected = profile.id === selectedProfileId;
          const studentCount = profile.linkedStudents.length;

          return (
            <button
              key={profile.id}
              role="tab"
              aria-selected={isSelected}
              aria-controls={`child-panel-${profile.id}`}
              id={`child-tab-${profile.id}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelectProfile(profile.id)}
              className={`flex min-h-[44px] min-w-[120px] flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
                isSelected
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm border border-[hsl(var(--border))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--background)/0.5)] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                  isSelected
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                }`}
              >
                <User className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <span className="truncate">{profile.name}</span>
              <span className="ml-0.5 rounded-full bg-[hsl(var(--muted)/0.6)] px-1.5 py-0.5 text-[10px] font-semibold">
                {studentCount}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
