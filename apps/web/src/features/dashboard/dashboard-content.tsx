'use client';

/**
 * dashboard-content.tsx
 *
 * Client Component — interactive dashboard UI.
 *
 * ARCHITECTURE:
 * - Receives only the minimum presentation data from the Server Component parent.
 * - The full session and TenantContext are NOT passed here; only safe display fields.
 * - Server-side auth and tenant validation have already occurred in dashboard/page.tsx.
 * - All interactive elements (Sign Out, navigation) remain client-side here.
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@coaching-os/auth/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
} from '@coaching-os/ui';

export interface DashboardUser {
  name: string;
  email: string;
}

export interface DashboardTenant {
  role: string;
  status: string;
}

export interface DashboardInstitute {
  name: string;
  slug: string;
  status: string;
}

export interface DashboardContentProps {
  user: DashboardUser;
  tenant: DashboardTenant;
  institute: DashboardInstitute;
}

/**
 * DashboardContent — renders the authenticated dashboard UI.
 *
 * All data passed as props has been server-verified before reaching this component.
 * This component handles only presentation and interactive client actions.
 */
export function DashboardContent({ user, tenant, institute }: DashboardContentProps) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

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
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{user.email}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              aria-label="Sign out of CoachingOS"
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
                  Your institute infrastructure and owner tenant context have been successfully
                  provisioned.
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
                <span className="font-semibold text-[hsl(var(--muted-foreground))]">
                  Institute:
                </span>
                <p className="font-medium">{institute.name}</p>
              </div>
              <div>
                <span className="font-semibold text-[hsl(var(--muted-foreground))]">Slug:</span>
                <p className="font-mono">{institute.slug}</p>
              </div>
              <div>
                <span className="font-semibold text-[hsl(var(--muted-foreground))]">Role:</span>
                <p className="font-medium capitalize text-emerald-600">{tenant.role}</p>
              </div>
              <div>
                <span className="font-semibold text-[hsl(var(--muted-foreground))]">Status:</span>
                <p className="font-medium capitalize">{tenant.status}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
