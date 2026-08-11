import * as React from 'react';
import { InstituteSettingsContent } from '../../../../features/institute-settings';

export const metadata = {
  title: 'Institute Settings | CoachingOS',
  description: 'Manage your institute profile details, regional timezone, and white-label visual branding.',
};

/**
 * /settings — Institute Settings & White-Label Branding Page
 *
 * ARCHITECTURAL CONTRACT:
 * - Server Component composition boundary (< 30 lines).
 * - Protected by parent (workspace)/layout.tsx (session verification & tenant context).
 * - Delegates all interactive UI rendering & API interaction to InstituteSettingsContent.
 */
export default function SettingsPage() {
  return <InstituteSettingsContent />;
}
