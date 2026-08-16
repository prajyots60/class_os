'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useParentHub } from './hooks/use-parent-hub';
import { ParentHeader } from './components/parent-header';
import { ChildSwitcher } from './components/child-switcher';
import { ChildSummaryCard } from './components/child-summary-card';
import { InstituteContext } from './components/institute-context';
import { TodayOverview } from './components/today-overview';
import { TodayActivity } from './components/today-activity';
import { ParentDashboardSkeleton } from './components/parent-dashboard-skeleton';
import { ParentDashboardEmpty } from './components/parent-dashboard-empty';
import { ParentDashboardError } from './components/parent-dashboard-error';

export function ParentDashboardContent() {
  const router = useRouter();
  const { data: hub, isLoading, isError, error, refetch } = useParentHub();
  const [selectedProfileId, setSelectedProfileId] = React.useState<string | null>(null);

  if (isLoading) {
    return <ParentDashboardSkeleton />;
  }

  if (isError || !hub) {
    return <ParentDashboardError error={error} onRetry={refetch} />;
  }

  const handleLogout = () => {
    router.push('/sign-in');
  };

  const activeProfileId = selectedProfileId || hub.profiles[0]?.id || null;
  const selectedProfile =
    hub.profiles.find((p) => p.id === activeProfileId) || hub.profiles[0] || null;

  const selectedStudent =
    selectedProfile?.linkedStudents && selectedProfile.linkedStudents.length > 0
      ? selectedProfile.linkedStudents[0]
      : null;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* Header */}
      <ParentHeader parent={hub.parent} onLogout={handleLogout} />

      {/* Main Container */}
      <main className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
        {hub.profiles.length === 0 ? (
          <ParentDashboardEmpty type="no-profiles" />
        ) : (
          <>
            {/* Child Switcher for multi-child parents */}
            <ChildSwitcher
              profiles={hub.profiles}
              selectedProfileId={selectedProfile?.id || null}
              onSelectProfile={(id) => setSelectedProfileId(id)}
            />

            {/* Selected Child Summary */}
            {selectedProfile && <ChildSummaryCard profile={selectedProfile} />}

            {/* Connected Institutes Summary */}
            {hub.institutes.length > 0 && (
              <InstituteContext institutes={hub.institutes} />
            )}

            {/* Today's Status & Overview */}
            <TodayOverview student={selectedStudent} />

            {/* Today's Activity Feed */}
            <TodayActivity student={selectedStudent} activities={[]} />
          </>
        )}
      </main>
    </div>
  );
}
