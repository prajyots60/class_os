import * as React from 'react';
import Link from 'next/link';
import { requireAuthSession, resolveServerTenantContext } from '../../../../lib/auth-guards';
import { UnreadCountBadge } from '../../../../features/communication';

export const metadata = {
  title: 'Communication Workspace | CoachingOS',
  description: 'Broadcast announcements, view notifications, and track student activity timelines.',
};

export default async function CommunicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuthSession('/communication');
  const tenantState = await resolveServerTenantContext(session.user.id);

  if (!tenantState.hasTenant || !tenantState.institute) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Communication Workspace Header Bar & Tabs */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
        <div className="flex items-center gap-6">
          <Link
            href="/communication/announcements"
            className="text-sm font-semibold text-[hsl(var(--foreground))] hover:text-primary transition-colors"
          >
            Announcements
          </Link>
          <Link
            href="/communication/notifications"
            className="text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:text-primary transition-colors flex items-center gap-2"
          >
            <span>Notifications</span>
            <UnreadCountBadge />
          </Link>
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
}
