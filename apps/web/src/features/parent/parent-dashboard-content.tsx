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
import { ParentAcademicViews } from './components/parent-academic-views';
import { ParentDashboardSkeleton } from './components/parent-dashboard-skeleton';
import { ParentDashboardEmpty } from './components/parent-dashboard-empty';
import { ParentDashboardError } from './components/parent-dashboard-error';
import { Calendar, FileText, Home } from 'lucide-react';

interface ParentDashboardContentProps {
  initialTab?: 'overview' | 'attendance' | 'homework';
}

export function ParentDashboardContent({ initialTab = 'overview' }: ParentDashboardContentProps) {
  const router = useRouter();
  const { data: hub, isLoading, isError, error, refetch } = useParentHub();
  const [selectedProfileId, setSelectedProfileId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'attendance' | 'homework'>(initialTab);

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

            {/* View Switcher Tabs */}
            <div
              role="tablist"
              aria-label="Parent Hub Views"
              className="flex space-x-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-1"
            >
              <button
                role="tab"
                aria-selected={activeTab === 'overview'}
                id="tab-overview"
                onClick={() => setActiveTab('overview')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 px-3 text-xs font-semibold min-h-[44px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
                  activeTab === 'overview'
                    ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs border border-[hsl(var(--border))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                <span>Overview</span>
              </button>

              <button
                role="tab"
                aria-selected={activeTab === 'attendance'}
                id="tab-attendance"
                onClick={() => setActiveTab('attendance')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 px-3 text-xs font-semibold min-h-[44px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
                  activeTab === 'attendance'
                    ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs border border-[hsl(var(--border))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <span>Attendance</span>
              </button>

              <button
                role="tab"
                aria-selected={activeTab === 'homework'}
                id="tab-homework"
                onClick={() => setActiveTab('homework')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 px-3 text-xs font-semibold min-h-[44px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
                  activeTab === 'homework'
                    ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs border border-[hsl(var(--border))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                <span>Homework</span>
              </button>
            </div>

            {/* View Panels */}
            {activeTab === 'overview' && (
              <>
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

            {activeTab !== 'overview' && (
              <ParentAcademicViews
                studentId={selectedStudent?.studentId || null}
                studentName={selectedStudent?.fullName}
                activeView={activeTab}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
