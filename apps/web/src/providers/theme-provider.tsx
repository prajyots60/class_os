'use client';

import * as React from 'react';
import { useUIStore } from '../stores/use-ui-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const currentTheme = useUIStore((state) => state.currentTheme);

  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', currentTheme.primaryHsl);
    root.style.setProperty('--primary-foreground', currentTheme.primaryForegroundHsl);
    root.style.setProperty('--secondary', currentTheme.secondaryHsl);
    root.style.setProperty('--secondary-foreground', currentTheme.secondaryForegroundHsl);
    root.style.setProperty('--accent', currentTheme.accentHsl);
    root.style.setProperty('--accent-foreground', currentTheme.accentForegroundHsl);
    root.style.setProperty('--background', currentTheme.backgroundHsl);
    root.style.setProperty('--foreground', currentTheme.foregroundHsl);
    root.style.setProperty('--muted', currentTheme.mutedHsl);
    root.style.setProperty('--muted-foreground', currentTheme.mutedForegroundHsl);
    root.style.setProperty('--border', currentTheme.borderHsl);
    root.style.setProperty('--radius-card', currentTheme.radiusCard);
    root.style.setProperty('--radius-md', currentTheme.radiusMd);

    // Apply font variables based on theme font choice
    if (currentTheme.fontFamily === 'poppins') {
      root.style.setProperty('--font-heading', 'var(--font-poppins), sans-serif');
      root.style.setProperty('--font-sans', 'var(--font-inter), sans-serif');
    } else if (currentTheme.fontFamily === 'manrope') {
      root.style.setProperty('--font-heading', 'var(--font-manrope), sans-serif');
      root.style.setProperty('--font-sans', 'var(--font-manrope), sans-serif');
    } else {
      root.style.setProperty('--font-heading', 'var(--font-inter), sans-serif');
      root.style.setProperty('--font-sans', 'var(--font-inter), sans-serif');
    }
  }, [currentTheme]);

  return <>{children}</>;
}
