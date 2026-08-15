import * as React from 'react';
import { requireAuthSession, resolveServerTenantContext } from '../../../../../lib/auth-guards';
import { getCapabilitiesForRole } from '@coaching-os/identity/client';
import { AnnouncementList } from '../../../../../features/communication';

export const metadata = {
  title: 'Announcements | CoachingOS',
  description: 'Manage staff and batch announcements for your institute.',
};

export default async function AnnouncementsPage() {
  const session = await requireAuthSession('/communication/announcements');
  const tenantState = await resolveServerTenantContext(session.user.id);

  if (!tenantState.hasTenant || !tenantState.institute) {
    return null;
  }

  const capabilities = Array.from(getCapabilitiesForRole(tenantState.tenantContext.role));

  return <AnnouncementList userCapabilities={capabilities} />;
}
