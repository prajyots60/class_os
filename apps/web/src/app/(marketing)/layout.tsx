import * as React from 'react';
import type { Metadata } from 'next';
import { MarketingHeader } from '../../components/marketing/marketing-header';
import { MarketingFooter } from '../../components/marketing/marketing-footer';

export const metadata: Metadata = {
  title: 'CoachingOS — Run Your Coaching Institute in One Place',
  description:
    'CoachingOS helps coaching institutes manage students, academics, attendance, tests, fees, staff, and daily operations from one connected workspace.',
  openGraph: {
    title: 'CoachingOS — Run Your Coaching Institute in One Place',
    description:
      'CoachingOS helps coaching institutes manage students, academics, attendance, tests, fees, staff, and daily operations from one connected workspace.',
    type: 'website',
    siteName: 'CoachingOS',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CoachingOS — Run Your Coaching Institute in One Place',
    description:
      'CoachingOS helps coaching institutes manage students, academics, attendance, tests, fees, staff, and daily operations from one connected workspace.',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
