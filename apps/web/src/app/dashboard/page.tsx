'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from '@coaching-os/auth/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Badge } from '@coaching-os/ui';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-4">
        <div className="flex items-center space-x-3 text-sm font-medium text-[hsl(var(--muted-foreground))]">
          <svg className="h-5 w-5 animate-spin text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  if (!session) {
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
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Institute Operating System</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-semibold">{session.user.name}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{session.user.email}</p>
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
                <CardTitle className="text-2xl font-bold">Institute Workspace</CardTitle>
                <CardDescription>Welcome to your active institute administration portal.</CardDescription>
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
              <CardTitle className="text-base font-semibold">Account Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-[hsl(var(--muted-foreground))]">User ID:</span>
                <p className="truncate font-mono">{session.user.id}</p>
              </div>
              <div>
                <span className="font-semibold text-[hsl(var(--muted-foreground))]">Role:</span>
                <p className="font-medium text-emerald-600">Institute Owner</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
