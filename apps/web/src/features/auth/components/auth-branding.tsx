import * as React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '@coaching-os/ui';
import { CoachingOSLogo } from '../../../components/brand/logo';

export function AuthBranding() {
  return (
    <div className="flex flex-col items-center text-center mb-8">
      <Link href="/" className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]">
        <CoachingOSLogo size="lg" showText={true} />
      </Link>
      <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))] font-medium max-w-sm">
        Operations software for coaching institutes.
      </p>
      <Badge
        variant="secondary"
        className="mt-3 inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 px-2.5 py-0.5"
      >
        <ShieldCheck className="h-3 w-3 text-emerald-500" />
        Multi-Tenant Isolated
      </Badge>
    </div>
  );
}
