export interface ThemeConfig {
  id: string;
  name: string;
  tagline: string;
  logoUrl?: string;
  primaryHsl: string;
  primaryForegroundHsl: string;
  secondaryHsl: string;
  secondaryForegroundHsl: string;
  accentHsl: string;
  accentForegroundHsl: string;
  backgroundHsl: string;
  foregroundHsl: string;
  mutedHsl: string;
  mutedForegroundHsl: string;
  borderHsl: string;
  fontFamily: 'poppins' | 'manrope' | 'inter' | 'nunito';
  radiusCard: string;
  radiusMd: string;
}
