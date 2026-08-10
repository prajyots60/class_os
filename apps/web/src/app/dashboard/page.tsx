'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from '@coaching-os/auth/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
} from '@coaching-os/ui';

interface DashboardTenantContext {
  userId: string;
  instituteId: string;
  membershipId: string;
  role: string;
  status: string;
}

interface DashboardInstitute {
  name: string;
  slug: string;
  status: string;
}

type TenantState =
  | { phase: 'loading' }
  | { phase: 'no_session' }
  | { phase: 'no_tenant' }
  | { phase: 'error'; message: string }
  | { phase: 'resolved'; tenantContext: DashboardTenantContext; institute: DashboardInstitute };

/**
 * DashboardPage — resolves TenantContext server-side via GET /api/dashboard/context.
 *
 * Security invariants:
 * - instituteId, role, and status come from the server-resolved TenantContext, never from client state.
 * - If no active tenant membership exists, the user is redirected to /onboarding before institute content is rendered.
 * - The tenant resolution chain: session → GetUserMembershipsUseCase → ResolveInstituteMembershipUseCase → TenantContext
 */
export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const [tenantState, setTenantState] = useState<TenantState>({ phase: 'loading' });

  useEffect(() => {
    if (isSessionPending || !session) return;

    // Session confirmed — resolve tenant context from server
    let cancelled = false;

    async function resolveTenantContext() {
      try {
        const response = await fetch('/api/dashboard/context', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          // Ensure no cached stale response is used for auth-sensitive data
          cache: 'no-store',
        });

        if (cancelled) return;

        if (response.status === 401) {
          setTenantState({ phase: 'no_session' });
          router.push('/sign-in');
          return;
        }

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          setTenantState({
            phase: 'error',
            message: body?.error?.message ?? 'Failed to load tenant context.',
          });
          return;
        }

        const body = await response.json();

        if (!body.hasTenant) {
          // No active institute membership — redirect to onboarding before rendering any protected content
          setTenantState({ phase: 'no_tenant' });
          router.push('/onboarding');
          return;
        }

        setTenantState({
          phase: 'resolved',
          tenantContext: body.tenantContext,
          institute: body.institute,
        });
      } catch {
        if (!cancelled) {
          setTenantState({
            phase: 'error',
            message: 'Network error. Please check your connection.',
          });
        }
      }
    }

    resolveTenantContext();

    return () => {
      cancelled = true;
    };
  }, [isSessionPending, session, router]);

  // ── Session Loading State ──────────────────────────────────────────────────
  if (isSessionPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-4">
        <div className="flex items-center space-x-3 text-sm font-medium text-[hsl(var(--muted-foreground))]">
          <svg className="h-5 w-5 animate-spin text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Resolving institute context...</span>
        </div>
      </div>
    );
  }

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (!session || tenantState.phase === 'no_session') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to access your institute dashboard.</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => router.push('/sign-in')}>Go to Sign In</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ── Context Loading State ──────────────────────────────────────────────────
  if (tenantState.phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-4">
        <div className="flex items-center space-x-3 text-sm font-medium text-[hsl(var(--muted-foreground))]">
          <svg className="h-5 w-5 animate-spin text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Resolving institute context...</span>
        </div>
      </div>
    );
  }

  // ── No Tenant (redirect is already triggered) ──────────────────────────────
  if (tenantState.phase === 'no_tenant') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-4">
        <div className="text-sm text-[hsl(var(--muted-foreground))]">
          Redirecting to onboarding...
        </div>
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────────
  if (tenantState.phase === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Dashboard Error</CardTitle>
            <CardDescription>{tenantState.message}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center gap-3">
            <Button variant="outline" onClick={() => setTenantState({ phase: 'loading' })}>
              Retry
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await signOut();
                router.push('/');
              }}
            >
              Sign Out
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ── Resolved — render dashboard with server-verified TenantContext ──────────
  const { tenantContext, institute } = tenantState;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary))] font-bold text-white shadow-sm">
              C
            </div>
            <div>
              <h1 className="text-lg font-bold">CoachingOS Dashboard</h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{institute.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-semibold">{session?.user?.name ?? ''}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{session?.user?.email ?? ''}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                router.push('/');
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-2xl font-bold">{institute.name}</CardTitle>
                <CardDescription>
                  Welcome to your active institute administration portal.
                </CardDescription>
              </div>
              <Badge variant="default">Active Tenant</Badge>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-4">
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  🎉 Institute Onboarding Completed
                </p>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  Your institute infrastructure and owner tenant context have been successfully provisioned.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Tenant Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-[hsl(var(--muted-foreground))]">Institute:</span>
                <p className="font-medium">{institute.name}</p>
              </div>
              <div>
                <span className="font-semibold text-[hsl(var(--muted-foreground))]">Slug:</span>
                <p className="font-mono">{institute.slug}</p>
              </div>
              <div>
                <span className="font-semibold text-[hsl(var(--muted-foreground))]">Role:</span>
                <p className="font-medium text-emerald-600 capitalize">{tenantContext.role}</p>
              </div>
              <div>
                <span className="font-semibold text-[hsl(var(--muted-foreground))]">Status:</span>
                <p className="font-medium capitalize">{tenantContext.status}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
