import * as React from 'react';
import type { Metadata } from 'next';
import { MarketingHeader } from '../../components/marketing/marketing-header';
import { MarketingFooter } from '../../components/marketing/marketing-footer';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://coachingos.com'),
  title: 'CoachingOS — The Operating System for Coaching Institutes',
  description:
    'Practical operating software for founder-led coaching institutes. Keep batches, attendance, fee ledgers, staff follow-up, and parent updates connected in one calm rhythm.',
  keywords: [
    'coaching institute software',
    'coaching management system',
    'coaching institute operating system',
    'institute attendance software',
    'coaching fee ledger',
    'parent portal coaching institute',
    'JEE NEET coaching management',
  ],
  authors: [{ name: 'CoachingOS Team' }],
  creator: 'CoachingOS',
  publisher: 'CoachingOS',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'CoachingOS — The Operating System for Coaching Institutes',
    description:
      'Keep batches, attendance, fee ledgers, staff follow-up, and parent updates connected in one calm rhythm under your institute identity.',
    type: 'website',
    siteName: 'CoachingOS',
    locale: 'en_IN',
    url: 'https://coachingos.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CoachingOS — The Operating System for Coaching Institutes',
    description:
      'Keep batches, attendance, fee ledgers, staff follow-up, and parent updates connected in one calm rhythm under your institute identity.',
    creator: '@coachingos',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'CoachingOS',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, Mobile PWA',
  description:
    'Operating system for founder-led coaching institutes to manage batches, attendance, fee ledgers, and family communication.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
    availability: 'https://schema.org/LimitedAvailability',
    category: 'Private Beta',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col w-full max-w-full overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingHeader />
      <main id="main-content" className="flex-1 w-full max-w-full overflow-x-clip">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
