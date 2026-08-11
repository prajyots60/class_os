'use client';

import React, { useState } from 'react';
import { Badge } from '@coaching-os/ui';

export interface LogoPreviewProps {
  logoUrl: string | null | undefined;
  instituteName: string;
}

export function LogoPreview({ logoUrl, instituteName }: LogoPreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [prevLogoUrl, setPrevLogoUrl] = useState(logoUrl);

  if (logoUrl !== prevLogoUrl) {
    setPrevLogoUrl(logoUrl);
    setImageError(false);
  }

  const cleanUrl = logoUrl?.trim();
  const isValidHttps = cleanUrl && cleanUrl.startsWith('https://');

  if (!cleanUrl) {
    return (
      <div className="flex h-20 w-full items-center justify-center rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-3 text-xs text-[hsl(var(--muted-foreground))]">
        No logo URL configured
      </div>
    );
  }

  if (!isValidHttps) {
    return (
      <div className="flex h-20 w-full flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50/50 p-3 text-center text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        <span>Logo URL must start with https://</span>
      </div>
    );
  }

  if (imageError) {
    return (
      <div className="flex h-20 w-full flex-col items-center justify-center space-y-1 rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-center text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
        <Badge variant="outline" className="border-amber-300 bg-amber-100 text-[10px] text-amber-800 dark:border-amber-800 dark:bg-amber-900 dark:text-amber-200">
          Unable to load logo preview
        </Badge>
        <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
          Verify that the URL points to a valid public image asset.
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-20 w-full items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-white p-2 shadow-sm dark:bg-slate-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cleanUrl}
        alt={`${instituteName || 'Institute'} Logo Preview`}
        onError={() => setImageError(true)}
        className="max-h-16 max-w-full object-contain"
      />
    </div>
  );
}
