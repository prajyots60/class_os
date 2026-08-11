import type { Metadata } from 'next';
import { PageHeader } from '../../../../features/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@coaching-os/ui';

export const metadata: Metadata = {
  title: 'Dashboard — CoachingOS',
  description: 'Overview of your coaching institute operations.',
};

/**
 * /dashboard — Authenticated Workspace Dashboard Page.
 *
 * ARCHITECTURE:
 * Thin Server Component composition page (< 30 lines).
 * Rendered inside the AppShell provided by (workspace)/layout.tsx.
 * Authentication, tenant resolution, and shell navigation are handled by parent layouts.
 */
export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your institute operations."
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-xl font-bold">Workspace Overview</CardTitle>
              <CardDescription>
                Welcome to your CoachingOS institute administration portal.
              </CardDescription>
            </div>
            <Badge variant="default">Active Tenant</Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-4">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                🎉 Institute Workspace Active
              </p>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Your institute workspace shell is ready. Academic, billing, and communication modules will activate here in upcoming phases.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Quick Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <span className="font-semibold text-[hsl(var(--muted-foreground))]">System Status:</span>
              <p className="font-medium text-emerald-600">Operational</p>
            </div>
            <div>
              <span className="font-semibold text-[hsl(var(--muted-foreground))]">Security Boundary:</span>
              <p className="font-medium text-emerald-600">Row-Level Tenant Isolation Active</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
