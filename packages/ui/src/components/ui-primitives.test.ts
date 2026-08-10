import { describe, it, expect } from 'vitest';
import { buttonVariants } from './button';
import { badgeVariants } from './badge';
import { alertVariants } from './alert';
import { cn } from '../lib/utils';
import { THEME_PRESETS } from '../theme/presets';

describe('CoachingOS UI Primitives Suite', () => {
  it('buttonVariants generates correct default and variant classes', () => {
    const defaultClasses = buttonVariants();
    expect(defaultClasses).toContain('inline-flex');
    expect(defaultClasses).toContain('bg-[hsl(var(--primary))]');

    const secondaryClasses = buttonVariants({ variant: 'secondary', size: 'sm' });
    expect(secondaryClasses).toContain('bg-[hsl(var(--secondary))]');
    expect(secondaryClasses).toContain('h-8');
  });

  it('badgeVariants generates correct badge variant classes', () => {
    const defaultBadge = badgeVariants();
    expect(defaultBadge).toContain('inline-flex');
    expect(defaultBadge).toContain('rounded-full');

    const successBadge = badgeVariants({ variant: 'success' });
    expect(successBadge).toContain('border-emerald-500/30');

    const warningBadge = badgeVariants({ variant: 'warning' });
    expect(warningBadge).toContain('border-amber-500/30');
  });

  it('alertVariants generates correct status alert classes', () => {
    const defaultAlert = alertVariants();
    expect(defaultAlert).toContain('relative');
    expect(defaultAlert).toContain('rounded-');

    const destructiveAlert = alertVariants({ variant: 'destructive' });
    expect(destructiveAlert).toContain('border-red-500/30');
  });

  it('cn merges Tailwind and conditional class strings correctly', () => {
    const result = cn('px-4 py-2', false && 'hidden', 'px-6');
    expect(result).toBe('py-2 px-6');
  });

  it('THEME_PRESETS defines required theme tokens', () => {
    expect(THEME_PRESETS.sharma_classes).toBeDefined();
    expect(THEME_PRESETS.sharma_classes.primaryHsl).toBe('221.2 83.2% 53.3%');
    expect(THEME_PRESETS.apex_academy).toBeDefined();
  });
});
