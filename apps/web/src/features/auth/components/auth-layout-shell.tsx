import * as React from 'react';
import { AuthBranding } from './auth-branding';
import { AuthCard } from './auth-card';

export interface AuthLayoutShellProps {
  children: React.ReactNode;
}

export function AuthLayoutShell({ children }: AuthLayoutShellProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[hsl(var(--background))] px-4 py-12 text-[hsl(var(--foreground))] sm:px-6 lg:px-8">
      <main className="w-full max-w-md space-y-6">
        <AuthBranding />
        <AuthCard>{children}</AuthCard>

        {/* Footer System Micro-copy */}
        <div className="text-center text-[11px] text-[hsl(var(--muted-foreground))] space-y-1">
          <p>© {currentYear} CoachingOS. All rights reserved.</p>
          <p>Multi-Tenant Operational Security Enforced</p>
        </div>
      </main>
    </div>
  );
}
