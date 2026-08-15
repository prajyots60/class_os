import * as React from 'react';
import { requireAuthSession, resolveServerTenantContext } from '../../../../../lib/auth-guards';
import { getCapabilitiesForRole } from '@coaching-os/identity/client';
import { NotificationList } from '../../../../../features/communication';

export const metadata = {
  title: 'Notifications | CoachingOS',
  description: 'View in-app alerts and notifications for your staff profile.',
};

export default async function NotificationsPage() {
  const session = await requireAuthSession('/communication/notifications');
  const tenantState = await resolveServerTenantContext(session.user.id);

  if (!tenantState.hasTenant || !tenantState.institute) {
    return null;
  }

  const capabilities = Array.from(getCapabilitiesForRole(tenantState.tenantContext.role));

  return <NotificationList userCapabilities={capabilities} />;
}
