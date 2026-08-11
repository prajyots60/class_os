'use client';

import React from 'react';

export interface ColorPreviewProps {
  primaryColor: string | null | undefined;
  instituteName: string;
}

const HEX_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function ColorPreview({ primaryColor, instituteName }: ColorPreviewProps) {
  const cleanColor = primaryColor?.trim();
  const isValidHex = cleanColor ? HEX_REGEX.test(cleanColor) : false;
  const activeColor = isValidHex ? cleanColor : '#0F172A';

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-3">
        <div
          className="h-8 w-8 rounded-md border border-[hsl(var(--border))] shadow-sm transition-colors"
          style={{ backgroundColor: activeColor }}
          aria-label={`Selected primary color: ${activeColor}`}
        />
        <div className="text-xs">
          <span className="font-mono font-medium text-[hsl(var(--foreground))]">
            {isValidHex ? activeColor : 'Default (#0F172A)'}
          </span>
          {!isValidHex && cleanColor && (
            <p className="text-[11px] text-red-500">Invalid HEX format (use e.g. #0F172A)</p>
          )}
        </div>
      </div>

      {/* Mini Brand Preview Card */}
      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-xs">
        <p className="mb-2 text-[10px] font-semibold tracking-wider text-[hsl(var(--muted-foreground))] uppercase">
          Brand UI Accent Preview
        </p>

        <div className="space-y-2 rounded-md border border-[hsl(var(--border))] bg-white p-2.5 dark:bg-slate-900">
          <div
            className="flex h-7 items-center justify-between rounded-xs px-2 text-xs font-semibold text-white shadow-xs"
            style={{ backgroundColor: activeColor }}
          >
            <span className="truncate text-[11px] font-bold">
              {instituteName || 'Sharma Physics Classes'}
            </span>
            <span className="text-[9px] opacity-80">Workspace</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-medium text-[hsl(var(--foreground))]">
              Active Module Highlight
            </span>
            <button
              type="button"
              tabIndex={-1}
              className="rounded-xs px-2 py-0.5 text-[10px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: activeColor }}
            >
              Action Button
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
