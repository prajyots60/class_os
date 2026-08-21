import * as React from 'react';
import type { Metadata } from 'next';
import { MarketingHeader } from '../../components/marketing/marketing-header';
import { MarketingFooter } from '../../components/marketing/marketing-footer';

export const metadata: Metadata = {
  title: 'CoachingOS — Your Institute. Your Brand. One Platform.',
  description:
    'Give your coaching institute its own branded app. Manage students, academics, attendance, fees, and parent communication — all under your identity.',
  openGraph: {
    title: 'CoachingOS — Your Institute. Your Brand. One Platform.',
    description:
      'Give your coaching institute its own branded app. Manage students, academics, attendance, fees, and parent communication — all under your identity.',
    type: 'website',
    siteName: 'CoachingOS',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CoachingOS — Your Institute. Your Brand. One Platform.',
    description:
      'Give your coaching institute its own branded app. Manage students, academics, attendance, fees, and parent communication — all under your identity.',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
